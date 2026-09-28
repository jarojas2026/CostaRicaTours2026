import { getFirestoreDb, updateBookingStatus } from './bookingService';
import { logAutomationExecution } from './nativeAutomationEngine';
import { sendOperationalNotification } from './notificationService';
import {
  costaRicaDateString,
  evaluatePayoutEligibility,
  isValidCommissionRate
} from './providerPayoutPolicy';

type ProviderPayoutProfile = {
  id: string;
  name: string;
  paypalEmail: string;
  commissionRate: number;
  verified: boolean;
  active: boolean;
};

export type ProviderPayoutResult = {
  bookingId: string;
  providerId: string;
  amountUSD: number;
  status: 'PAID' | 'PROCESSING' | 'BLOCKED' | 'FAILED' | 'SANDBOX_SUCCESS';
  batchId?: string;
  reason?: string;
};

export type ProviderPayoutRunResult = {
  success: boolean;
  totalScanned: number;
  totalProcessed: number;
  totalPaidUSD: number;
  payouts: ProviderPayoutResult[];
  escalationsCount: number;
  blockedReason?: string;
  timestamp: string;
};

function emptyResult(): ProviderPayoutRunResult {
  return {
    success: true,
    totalScanned: 0,
    totalProcessed: 0,
    totalPaidUSD: 0,
    payouts: [],
    escalationsCount: 0,
    timestamp: new Date().toISOString()
  };
}

async function recordPayoutEscalation(
  db: any,
  bookingId: string,
  providerId: string,
  code: string,
  reason: string,
  details?: Record<string, any>
): Promise<void> {
  const safeId = `payout_${bookingId}_${code}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 180);
  await db.collection('escalations').doc(safeId).set({
    id: safeId,
    type: code,
    bookingId,
    providerId,
    reason,
    details: details || {},
    status: 'pending',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }, { merge: true }).catch((error: any) => {
    console.warn('No se pudo persistir escalación de payout:', error);
  });
}

async function loadVerifiedPayoutProfile(db: any, providerId: string): Promise<ProviderPayoutProfile | null> {
  let source: 'operators' | 'proveedores' | null = null;
  let data: Record<string, any> | null = null;
  let documentId = providerId;

  const operatorDoc = await db.collection('operators').doc(providerId).get();
  if (operatorDoc.exists) {
    source = 'operators';
    data = operatorDoc.data() || {};
    documentId = operatorDoc.id;
  } else {
    const providerDoc = await db.collection('proveedores').doc(providerId).get();
    if (providerDoc.exists) {
      source = 'proveedores';
      data = providerDoc.data() || {};
      documentId = providerDoc.id;
    }
  }

  if (!source || !data) return null;

  const verified = source === 'operators' ? data.verified === true : data.verificado === true;
  const activeFlag = source === 'operators' ? data.active === true : data.activo === true;
  const active = verified && activeFlag && String(data.status || '').toLowerCase() !== 'inactivo';
  const paypalEmail = String(data.paypalEmail || data.payoutPaypalEmail || '').trim();
  const commissionCandidate = source === 'operators' ? data.commissionRate : (data.comision ?? data.commissionRate);

  if (!verified || !active || !paypalEmail.includes('@') || !isValidCommissionRate(commissionCandidate)) {
    return null;
  }

  return {
    id: documentId,
    name: String(data.name || data.nombre || documentId),
    paypalEmail,
    commissionRate: commissionCandidate,
    verified,
    active
  };
}

async function getPaypalAccessToken(baseUrl: string, clientId: string, secret: string): Promise<string> {
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(`paypal_token_error:${response.status}:${payload.error_description || payload.error || 'unknown'}`);
  }
  return String(payload.access_token);
}

async function reconcileProcessingPayout(
  booking: any,
  bookingId: string,
  accessToken: string,
  baseUrl: string,
  isLive: boolean
): Promise<ProviderPayoutResult | null> {
  const paypalBatchId = String(booking.paypalPayoutBatchId || '').trim();
  if (!paypalBatchId) return null;

  const response = await fetch(`${baseUrl}/v1/payments/payouts/${encodeURIComponent(paypalBatchId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) return null;

  const batchStatus = String(payload.batch_header?.batch_status || '').toUpperCase();
  const amountUSD = Number(booking.payoutAmountUSD) || 0;
  const providerId = String(booking.providerId || booking.providerInfo?.id || '');

  if (batchStatus === 'SUCCESS') {
    if (isLive) {
      await updateBookingStatus(bookingId, {
        payoutStatus: 'paid',
        payoutPaidAt: new Date().toISOString(),
        payoutLastVerifiedAt: new Date().toISOString()
      });
      return { bookingId, providerId, amountUSD, status: 'PAID', batchId: paypalBatchId };
    }
    await updateBookingStatus(bookingId, {
      payoutStatus: 'sandbox_success',
      payoutLastVerifiedAt: new Date().toISOString()
    });
    return { bookingId, providerId, amountUSD, status: 'SANDBOX_SUCCESS', batchId: paypalBatchId };
  }

  if (['DENIED', 'CANCELED', 'CANCELLED', 'BLOCKED', 'RETURNED'].includes(batchStatus)) {
    await updateBookingStatus(bookingId, {
      payoutStatus: 'failed',
      payoutFailureStatus: batchStatus,
      payoutLastVerifiedAt: new Date().toISOString()
    });
    return { bookingId, providerId, amountUSD, status: 'FAILED', batchId: paypalBatchId, reason: batchStatus };
  }

  await updateBookingStatus(bookingId, {
    payoutStatus: 'processing',
    payoutLastVerifiedAt: new Date().toISOString(),
    paypalBatchStatus: batchStatus || 'UNKNOWN'
  });
  return { bookingId, providerId, amountUSD, status: 'PROCESSING', batchId: paypalBatchId };
}

/**
 * Production provider settlement runner.
 *
 * This is deliberately fail-closed:
 * - it requires an explicit feature flag;
 * - it requires PayPal credentials;
 * - it never invents provider/payment/commission/amount data;
 * - it never marks a simulated or PENDING payout as paid;
 * - it pays only bookings whose verified payment, provider confirmation and
 *   already-past service date are all present.
 */
export async function executeAutomatedProviderPayouts(): Promise<ProviderPayoutRunResult> {
  const result = emptyResult();
  const db = getFirestoreDb();

  if (!db) {
    return { ...result, success: false, blockedReason: 'firestore_unavailable' };
  }

  if (process.env.ENABLE_PROVIDER_PAYOUTS !== 'true') {
    return { ...result, success: false, blockedReason: 'provider_payouts_disabled' };
  }

  const paypalClientId = String(process.env.PAYPAL_CLIENT_ID || '').trim();
  const paypalSecret = String(process.env.PAYPAL_SECRET || '').trim();
  if (!paypalClientId || !paypalSecret) {
    return { ...result, success: false, blockedReason: 'paypal_credentials_missing' };
  }

  const paypalMode = String(process.env.PAYPAL_MODE || '').trim().toLowerCase();
  const isLive = paypalMode === 'live';
  if (!isLive) {
    return { ...result, success: false, blockedReason: 'paypal_live_mode_required' };
  }

  const baseUrl = 'https://api-m.paypal.com';
  let accessToken: string;
  try {
    accessToken = await getPaypalAccessToken(baseUrl, paypalClientId, paypalSecret);
  } catch (error: any) {
    return { ...result, success: false, blockedReason: error?.message || 'paypal_token_error' };
  }

  const snapshot = await db.collection('bookings').get();
  result.totalScanned = snapshot.size;
  const todayCR = costaRicaDateString();

  for (const doc of snapshot.docs) {
    const booking = { id: doc.id, ...doc.data() } as any;
    const bookingId = String(booking.bookingId || doc.id);

    if (String(booking.payoutStatus || '').toLowerCase() === 'processing' && booking.paypalPayoutBatchId) {
      try {
        const reconciliation = await reconcileProcessingPayout(booking, bookingId, accessToken, baseUrl, isLive);
        if (reconciliation) {
          result.payouts.push(reconciliation);
          if (reconciliation.status === 'PAID') result.totalPaidUSD += reconciliation.amountUSD;
        }
      } catch (error: any) {
        console.warn(`No se pudo reconciliar payout ${bookingId}:`, error);
      }
      continue;
    }

    const eligibility = evaluatePayoutEligibility(booking, todayCR);
    if (!eligibility.eligible) continue;

    result.totalProcessed += 1;
    const { providerId, totalUSD } = eligibility;
    let provider: ProviderPayoutProfile | null = null;
    try {
      provider = await loadVerifiedPayoutProfile(db, providerId);
    } catch (error: any) {
      console.warn(`Error leyendo proveedor ${providerId} para payout:`, error);
    }

    if (!provider) {
      const reason = 'Proveedor no verificado/activo o sin PayPal/comisión contractual válida en Firestore.';
      await updateBookingStatus(bookingId, {
        payoutStatus: 'blocked',
        payoutBlockedReason: 'provider_profile_unverified',
        payoutBlockedAt: new Date().toISOString()
      });
      await recordPayoutEscalation(db, bookingId, providerId, 'PAYOUT_PROVIDER_UNVERIFIED', reason, { totalUSD });
      result.escalationsCount += 1;
      result.payouts.push({ bookingId, providerId, amountUSD: 0, status: 'BLOCKED', reason });
      continue;
    }

    const payoutAmountUSD = Number((totalUSD * (1 - provider.commissionRate)).toFixed(2));
    if (!Number.isFinite(payoutAmountUSD) || payoutAmountUSD <= 0) {
      const reason = 'El cálculo contractual del payout no produjo un importe positivo.';
      await recordPayoutEscalation(db, bookingId, providerId, 'PAYOUT_INVALID_AMOUNT', reason, {
        totalUSD,
        commissionRate: provider.commissionRate
      });
      result.escalationsCount += 1;
      result.payouts.push({ bookingId, providerId, amountUSD: 0, status: 'BLOCKED', reason });
      continue;
    }

    const senderBatchId = `payout-${bookingId}`;

    try {
      const response = await fetch(`${baseUrl}/v1/payments/payouts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender_batch_header: {
            sender_batch_id: senderBatchId,
            email_subject: 'Liquidación de servicio - Costa Rica Tours',
            email_message: `Liquidación neta de la reserva ${bookingId}.`
          },
          items: [{
            recipient_type: 'EMAIL',
            amount: { value: payoutAmountUSD.toFixed(2), currency: 'USD' },
            note: `Liquidación por reserva ${bookingId}`,
            receiver: provider.paypalEmail,
            sender_item_id: `item-${bookingId}`
          }]
        })
      });

      const payload: any = await response.json().catch(() => ({}));
      const batchStatus = String(payload.batch_header?.batch_status || '').toUpperCase();
      const paypalPayoutBatchId = String(payload.batch_header?.payout_batch_id || '').trim();

      if (!response.ok || !paypalPayoutBatchId) {
        const reason = payload.message || payload.name || `PayPal HTTP ${response.status}`;
        await updateBookingStatus(bookingId, {
          payoutStatus: 'failed',
          payoutFailureReason: String(reason),
          payoutFailedAt: new Date().toISOString()
        });
        await recordPayoutEscalation(db, bookingId, providerId, 'PAYOUT_API_ERROR', String(reason), {
          httpStatus: response.status,
          batchStatus
        });
        result.escalationsCount += 1;
        result.payouts.push({ bookingId, providerId, amountUSD: payoutAmountUSD, status: 'FAILED', reason: String(reason) });
        continue;
      }

      if (batchStatus === 'SUCCESS') {
        await updateBookingStatus(bookingId, {
          payoutStatus: 'paid',
          payoutBatchId: senderBatchId,
          paypalPayoutBatchId,
          payoutAmountUSD,
          payoutRecipient: provider.paypalEmail,
          payoutPaidAt: new Date().toISOString(),
          payoutLastVerifiedAt: new Date().toISOString()
        });
        result.totalPaidUSD += payoutAmountUSD;
        result.payouts.push({ bookingId, providerId, amountUSD: payoutAmountUSD, status: 'PAID', batchId: paypalPayoutBatchId });
        continue;
      }

      // PayPal commonly accepts a batch asynchronously. PENDING/PROCESSING is
      // not proof that money arrived, so the accounting state stays processing.
      await updateBookingStatus(bookingId, {
        payoutStatus: 'processing',
        payoutBatchId: senderBatchId,
        paypalPayoutBatchId,
        paypalBatchStatus: batchStatus || 'PENDING',
        payoutAmountUSD,
        payoutRecipient: provider.paypalEmail,
        payoutSubmittedAt: new Date().toISOString()
      });
      result.payouts.push({ bookingId, providerId, amountUSD: payoutAmountUSD, status: 'PROCESSING', batchId: paypalPayoutBatchId });
    } catch (error: any) {
      const reason = error?.message || 'payout_request_exception';
      await updateBookingStatus(bookingId, {
        payoutStatus: 'failed',
        payoutFailureReason: reason,
        payoutFailedAt: new Date().toISOString()
      }).catch(() => undefined);
      await recordPayoutEscalation(db, bookingId, providerId, 'PAYOUT_EXCEPTION', reason, { payoutAmountUSD });
      result.escalationsCount += 1;
      result.payouts.push({ bookingId, providerId, amountUSD: payoutAmountUSD, status: 'FAILED', reason });
    }
  }

  result.success = result.escalationsCount === 0;
  result.timestamp = new Date().toISOString();

  if (result.totalProcessed > 0 || result.payouts.length > 0) {
    await sendOperationalNotification(
      `💰 Payout seguro: ${result.totalProcessed} elegibles, $${result.totalPaidUSD.toFixed(2)} USD confirmados como pagados, ${result.payouts.filter((item) => item.status === 'PROCESSING').length} en procesamiento, ${result.escalationsCount} escalaciones.`,
      { parseMode: 'HTML' }
    ).catch(() => undefined);
  }

  logAutomationExecution(
    'PROVIDER_PAYOUT_SAFE',
    0,
    result.success ? 'success' : 'warning',
    `Scanned=${result.totalScanned}; processed=${result.totalProcessed}; paidUSD=${result.totalPaidUSD}; escalations=${result.escalationsCount}`
  );

  return result;
}
