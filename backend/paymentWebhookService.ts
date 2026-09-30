import crypto from 'crypto';
import type Stripe from 'stripe';
import { getBookingById, getFirestoreDb, getStripe, updateBookingStatus } from './bookingService';

export type PaymentWebhookResult = {
  accepted: boolean;
  duplicate?: boolean;
  bookingId?: string;
  eventId?: string;
  reason?: string;
};

function safeEventDocId(provider: string, eventId: string): string {
  return `${provider}_${eventId}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 240);
}

/**
 * Claims a provider event exactly once while still allowing a failed or stale
 * processing attempt to be retried. This is important because Stripe and PayPal
 * deliberately redeliver webhooks when our endpoint returns a non-2xx response.
 */
async function claimEvent(provider: 'stripe' | 'paypal', eventId: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) {
    if (process.env.NODE_ENV === 'production') throw new Error('Firestore no disponible para idempotencia de pagos.');
    return true;
  }

  const ref = db.collection('payment_webhook_events').doc(safeEventDocId(provider, eventId));
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const now = new Date();

    if (snap.exists) {
      const data = snap.data() || {};
      const status = String(data.status || '');
      const claimedAt = Date.parse(String(data.claimedAt || data.receivedAt || ''));
      const staleProcessing = status === 'processing' && Number.isFinite(claimedAt) && now.getTime() - claimedAt > 10 * 60 * 1000;
      const retryable = status === 'failed' || staleProcessing;
      if (!retryable) return false;

      tx.set(ref, {
        provider,
        eventId,
        status: 'processing',
        claimedAt: now.toISOString(),
        retryCount: Number(data.retryCount || 0) + 1,
        lastError: data.error || null
      }, { merge: true });
      return true;
    }

    tx.create(ref, {
      provider,
      eventId,
      status: 'processing',
      receivedAt: now.toISOString(),
      claimedAt: now.toISOString(),
      retryCount: 0
    });
    return true;
  });
}

async function finishEvent(provider: 'stripe' | 'paypal', eventId: string, data: Record<string, unknown>): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  await db.collection('payment_webhook_events').doc(safeEventDocId(provider, eventId)).set({
    ...data,
    processedAt: new Date().toISOString()
  }, { merge: true });
}

async function releaseFailedEvent(provider: 'stripe' | 'paypal', eventId: string, error: unknown): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  await db.collection('payment_webhook_events').doc(safeEventDocId(provider, eventId)).set({
    status: 'failed',
    error: error instanceof Error ? error.message.slice(0, 500) : 'unknown',
    failedAt: new Date().toISOString()
  }, { merge: true });
}

function bookingAmountCents(booking: any): number {
  return Math.round(Number(booking?.totalUSD || 0) * 100);
}

export async function processStripeWebhook(rawBody: Buffer, signature: string | undefined): Promise<PaymentWebhookResult> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();
  if (!secret || !stripe) throw new Error('Stripe webhook no configurado.');
  if (!signature) throw new Error('Firma Stripe ausente.');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new Error('Firma Stripe no válida.');
  }

  const claimed = await claimEvent('stripe', event.id);
  if (!claimed) return { accepted: true, duplicate: true, eventId: event.id };

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = String(session.metadata?.bookingId || session.client_reference_id || '').trim();
      if (!bookingId) throw new Error('Evento Stripe sin referencia de reserva.');
      const booking = await getBookingById(bookingId);
      if (!booking) throw new Error('Reserva Stripe no encontrada.');
      if (session.payment_status !== 'paid' || session.currency !== 'usd' || session.amount_total !== bookingAmountCents(booking)) {
        throw new Error('Evento Stripe no coincide con importe/moneda/estado de la reserva.');
      }
      if (booking.paymentStatus !== 'completed') {
        const updated = await updateBookingStatus(bookingId, {
          status: 'paid',
          paymentStatus: 'completed',
          paymentVerifiedAt: new Date().toISOString(),
          paymentEvidence: {
            provider: 'stripe',
            webhookEventId: event.id,
            sessionId: session.id,
            paymentIntent: session.payment_intent
          }
        });
        if (!updated.success) throw new Error(updated.message || 'No se pudo reconciliar Stripe.');
      }
      await finishEvent('stripe', event.id, { status: 'processed', bookingId, type: event.type });
      return { accepted: true, eventId: event.id, bookingId };
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      await finishEvent('stripe', event.id, {
        status: 'review_required',
        type: event.type,
        paymentIntent: typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
      });
      return { accepted: true, eventId: event.id, reason: 'refund_requires_booking_reconciliation' };
    }

    await finishEvent('stripe', event.id, { status: 'ignored', type: event.type });
    return { accepted: true, eventId: event.id, reason: 'event_not_actionable' };
  } catch (error) {
    await releaseFailedEvent('stripe', event.id, error);
    throw error;
  }
}

async function paypalAccessToken(): Promise<{ token: string; baseUrl: string }> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  const baseUrl = process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  if (!clientId || !secret) throw new Error('PayPal no configurado.');
  const basic = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!response.ok) throw new Error('PayPal no autorizó verificación de webhook.');
  const data: any = await response.json();
  if (!data.access_token) throw new Error('PayPal no devolvió access token.');
  return { token: data.access_token, baseUrl };
}

export async function processPayPalWebhook(headers: Record<string, string | string[] | undefined>, event: any): Promise<PaymentWebhookResult> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new Error('PAYPAL_WEBHOOK_ID no configurado.');
  const eventId = String(event?.id || '').trim();
  if (!eventId) throw new Error('Evento PayPal sin ID.');

  const transmissionId = String(headers['paypal-transmission-id'] || '');
  const transmissionTime = String(headers['paypal-transmission-time'] || '');
  const transmissionSig = String(headers['paypal-transmission-sig'] || '');
  const certUrl = String(headers['paypal-cert-url'] || '');
  const authAlgo = String(headers['paypal-auth-algo'] || '');
  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) throw new Error('Cabeceras de firma PayPal incompletas.');

  const { token, baseUrl } = await paypalAccessToken();
  const verification = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: event
    })
  });
  const verificationBody: any = await verification.json();
  if (!verification.ok || verificationBody.verification_status !== 'SUCCESS') throw new Error('Firma PayPal no válida.');

  const claimed = await claimEvent('paypal', eventId);
  if (!claimed) return { accepted: true, duplicate: true, eventId };

  try {
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = event.resource || {};
      // custom_id is the booking correlation key established when the order/capture is created.
      // Never infer a booking from PayPal's order ID: that would couple two unrelated identifiers.
      const bookingId = String(resource.custom_id || '').trim();
      if (!bookingId) {
        await finishEvent('paypal', eventId, { status: 'review_required', type: event.event_type, captureId: resource.id });
        return { accepted: true, eventId, reason: 'booking_reference_missing' };
      }
      const booking = await getBookingById(bookingId);
      const value = Number(resource.amount?.value);
      if (!booking || resource.status !== 'COMPLETED' || resource.amount?.currency_code !== 'USD' || !Number.isFinite(value) || Math.abs(value - Number(booking.totalUSD)) > 0.01) {
        throw new Error('Evento PayPal no coincide con importe/moneda/estado de la reserva.');
      }
      if (booking.paymentStatus !== 'completed') {
        const updated = await updateBookingStatus(bookingId, {
          status: 'paid',
          paymentStatus: 'completed',
          paymentVerifiedAt: new Date().toISOString(),
          paymentEvidence: { provider: 'paypal', webhookEventId: eventId, captureId: resource.id }
        });
        if (!updated.success) throw new Error(updated.message || 'No se pudo reconciliar PayPal.');
      }
      await finishEvent('paypal', eventId, { status: 'processed', bookingId, type: event.event_type });
      return { accepted: true, eventId, bookingId };
    }

    if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED' || event.event_type === 'CUSTOMER.DISPUTE.CREATED') {
      await finishEvent('paypal', eventId, { status: 'review_required', type: event.event_type, resourceId: event.resource?.id });
      return { accepted: true, eventId, reason: 'financial_review_required' };
    }

    await finishEvent('paypal', eventId, { status: 'ignored', type: event.event_type });
    return { accepted: true, eventId, reason: 'event_not_actionable' };
  } catch (error) {
    await releaseFailedEvent('paypal', eventId, error);
    throw error;
  }
}

export function webhookCorrelationId(provider: string, eventId?: string): string {
  return crypto.createHash('sha256').update(`${provider}:${eventId || 'unknown'}`).digest('hex').slice(0, 20);
}
