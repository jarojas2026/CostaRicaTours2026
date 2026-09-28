/**
 * 🇨🇷 SERVICIO NATIVO DE VERIFICACIÓN DE PAGOS SINPE MÓVIL
 * =========================================================================
 * Procesa, valida y concilia transferencias y comprobantes de SINPE Móvil.
 *
 * Reglas operativas:
 * - Un comprobante no se considera pago verificado si el webhook no está autenticado.
 * - Nunca se fabrica un número de comprobante ni se acepta un monto ausente como pago válido.
 * - Pago verificado significa `paid`; la confirmación final pertenece al proveedor.
 * - El despacho al proveedor continúa mediante reservationLifecycleOrchestrator.
 * - La notificación/voucher final al cliente solo ocurre después de confirmación del proveedor.
 * =========================================================================
 */

import crypto from 'crypto';
import {
  updateBookingStatus,
  getAllBookings,
  getUsdToCrcRate
} from './bookingService';
import { advanceReservationLifecycle } from './reservationLifecycleOrchestrator';
import { logAutomationExecution } from './nativeAutomationEngine';

export interface SinpeVerificationPayload {
  bookingId?: string;
  idReserva?: string;
  referenceNumber?: string;
  numeroComprobante?: string;
  senderPhone?: string;
  telefonoEmisor?: string;
  senderName?: string;
  nombreEmisor?: string;
  amountCRC?: number;
  montoCRC?: number;
  amountUSD?: number;
  bankEntity?: string;
  banco?: string;
  rawSmsText?: string;
  comprobanteUrl?: string;
  authHeader?: string;
}

export interface SinpeVerificationResult {
  success: boolean;
  bookingId: string;
  status: 'paid' | 'rechazada_sinpe' | 'en_revision_manual';
  paymentStatus: 'completed' | 'failed' | 'pending';
  comprobante: string;
  montoVerificadoCRC: number;
  montoEsperadoUSD: number;
  tipoCambioAplicado: number;
  bancoDetectado: string;
  providerDispatched: boolean;
  customerNotified: boolean;
  message: string;
  timestamp: string;
  auditHash: string;
}

// Defensa rápida dentro de una instancia. La validación persistente también
// compara el comprobante con reservas almacenadas para sobrevivir reinicios.
const verifiedComprobantesSet = new Set<string>();

function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hasTrustedWebhookAuthentication(sharedSecret?: string): boolean {
  const expected = String(process.env.WEBHOOK_SECRET || '').trim();
  if (!expected || !sharedSecret) return false;
  return secureEqual(String(sharedSecret).trim(), expected);
}

function auditHashFor(parts: Array<string | number>): string {
  return crypto.createHash('sha256').update(parts.join(':')).digest('hex');
}

function manualReviewResult(params: {
  bookingId: string;
  comprobante: string;
  amountCRC: number;
  expectedUSD: number;
  rate: number;
  bank: string;
  reason: string;
}): SinpeVerificationResult {
  const timestamp = new Date().toISOString();
  return {
    success: false,
    bookingId: params.bookingId,
    status: 'en_revision_manual',
    paymentStatus: 'pending',
    comprobante: params.comprobante,
    montoVerificadoCRC: params.amountCRC,
    montoEsperadoUSD: params.expectedUSD,
    tipoCambioAplicado: params.rate,
    bancoDetectado: params.bank,
    providerDispatched: false,
    customerNotified: false,
    message: params.reason,
    timestamp,
    auditHash: auditHashFor([params.bookingId, params.comprobante || 'NO_REFERENCE', 'MANUAL_REVIEW', timestamp])
  };
}

/**
 * Normaliza y extrae datos clave de un mensaje SMS o texto plano de SINPE Móvil.
 * El parser solamente extrae datos; por sí solo nunca prueba que el banco haya
 * liquidado una transferencia.
 */
export function parseSinpeSmsText(text: string): {
  referenceNumber: string | null;
  amountCRC: number | null;
  senderPhone: string | null;
  bankEntity: string;
} {
  if (!text) {
    return { referenceNumber: null, amountCRC: null, senderPhone: null, bankEntity: 'Desconocido' };
  }

  let bankEntity = 'SINPE Móvil General';
  const lower = text.toLowerCase();
  if (lower.includes('bac') || lower.includes('credomatic')) bankEntity = 'BAC Credomatic';
  else if (lower.includes('bncr') || lower.includes('banco nacional') || lower.includes('bn móvil')) bankEntity = 'Banco Nacional (BNCR)';
  else if (lower.includes('bcr') || lower.includes('banco de costa rica')) bankEntity = 'Banco de Costa Rica (BCR)';
  else if (lower.includes('popular')) bankEntity = 'Banco Popular';
  else if (lower.includes('davivienda')) bankEntity = 'Davivienda';
  else if (lower.includes('promerica')) bankEntity = 'Banco Promerica';

  const refMatch = text.match(/(?:comprobante|referencia|ref|transacci[oó]n|num|no\.?)\s*[:#]?\s*([A-Za-z0-9-]{6,32})/i);
  const referenceNumber = refMatch ? refMatch[1] : null;

  const amountMatch = text.match(/(?:¢|crc|colones?|monto\s*[:=]?\s*¢?)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/i);
  let amountCRC: number | null = null;
  if (amountMatch) {
    const rawNum = amountMatch[1].replace(/,/g, '').replace(/\.(?=[0-9]{3})/g, '');
    const parsed = Number.parseFloat(rawNum);
    amountCRC = Number.isFinite(parsed) ? parsed : null;
  }

  const phoneMatch = text.match(/(?:de|del|tel[eé]fono|celular|emisor)\s*[:=]?\s*(?:\+?506)?\s*([2-8][0-9]{3}[-\s]?[0-9]{4})/i);
  const senderPhone = phoneMatch ? phoneMatch[1].replace(/[-\s]/g, '') : null;

  return { referenceNumber, amountCRC, senderPhone, bankEntity };
}

/**
 * Ejecuta la conciliación de un pago SINPE Móvil.
 *
 * Solo un webhook autenticado con WEBHOOK_SECRET puede promover la reserva a
 * `paid`. Las invocaciones sin credencial válida quedan en revisión manual y
 * nunca disparan proveedor ni voucher.
 */
export async function executeSinpeVerification(
  payload: SinpeVerificationPayload,
  sharedSecret?: string
): Promise<SinpeVerificationResult> {
  const start = Date.now();
  const rawBookingId = String(payload.bookingId || payload.idReserva || '').trim();
  let comprobante = String(payload.referenceNumber || payload.numeroComprobante || '').trim();
  let amountCRC = Number(payload.amountCRC || payload.montoCRC || 0);
  let bank = String(payload.bankEntity || payload.banco || 'SINPE Móvil').trim();
  let phone = String(payload.senderPhone || payload.telefonoEmisor || '').trim();

  if (payload.rawSmsText) {
    const parsed = parseSinpeSmsText(payload.rawSmsText);
    if (!comprobante && parsed.referenceNumber) comprobante = parsed.referenceNumber;
    if ((!Number.isFinite(amountCRC) || amountCRC <= 0) && parsed.amountCRC) amountCRC = parsed.amountCRC;
    if (parsed.bankEntity !== 'Desconocido') bank = parsed.bankEntity;
    if (!phone && parsed.senderPhone) phone = parsed.senderPhone;
  }

  if (!rawBookingId) {
    throw new Error('ID de reserva es requerido para conciliar el pago SINPE Móvil.');
  }

  const allBookings = await getAllBookings();
  const booking = allBookings.find(
    (b: any) =>
      b.bookingId === rawBookingId ||
      b.id === rawBookingId ||
      String(b.customerEmail || '').toLowerCase() === rawBookingId.toLowerCase()
  );

  if (!booking) {
    throw new Error(`Reserva no encontrada con el identificador: ${rawBookingId}`);
  }

  const bookingId = String(booking.bookingId || booking.id);
  const expectedUSD = Number(booking.totalUSD || 0);
  const usdToCrcRate = getUsdToCrcRate();
  const expectedCRC = Math.round(expectedUSD * usdToCrcRate);

  if (!hasTrustedWebhookAuthentication(sharedSecret)) {
    logAutomationExecution(
      'SINPE_UNTRUSTED_SOURCE',
      Date.now() - start,
      'warning',
      `Comprobante SINPE para ${bookingId} recibido sin autenticación válida; no se modifica el estado del pago.`
    );
    return manualReviewResult({
      bookingId,
      comprobante,
      amountCRC: Number.isFinite(amountCRC) ? amountCRC : 0,
      expectedUSD,
      rate: usdToCrcRate,
      bank,
      reason: 'El comprobante fue recibido, pero la fuente no pudo autenticarse. El pago permanece pendiente hasta verificación por una fuente autorizada.'
    });
  }

  if (!comprobante) {
    return manualReviewResult({
      bookingId,
      comprobante: '',
      amountCRC: Number.isFinite(amountCRC) ? amountCRC : 0,
      expectedUSD,
      rate: usdToCrcRate,
      bank,
      reason: 'No se recibió un número de comprobante verificable. El pago permanece pendiente para revisión manual.'
    });
  }

  if (!Number.isFinite(amountCRC) || amountCRC <= 0) {
    return manualReviewResult({
      bookingId,
      comprobante,
      amountCRC: 0,
      expectedUSD,
      rate: usdToCrcRate,
      bank,
      reason: 'No se recibió un monto CRC verificable. El pago permanece pendiente para revisión manual.'
    });
  }

  const persistentDuplicate = allBookings.some((candidate: any) => {
    const candidateId = String(candidate.bookingId || candidate.id || '');
    return candidateId !== bookingId &&
      String(candidate.sinpeComprobante || candidate.sinpeReference || '').trim() === comprobante &&
      String(candidate.paymentStatus || '').toLowerCase() === 'completed';
  });

  if (verifiedComprobantesSet.has(comprobante) || persistentDuplicate) {
    const timestamp = new Date().toISOString();
    logAutomationExecution(
      'SINPE_DUPLICATE_ALERT',
      Date.now() - start,
      'error',
      `Alerta de comprobante SINPE duplicado/reutilizado: ${comprobante} para reserva ${bookingId}`
    );

    return {
      success: false,
      bookingId,
      status: 'rechazada_sinpe',
      paymentStatus: 'failed',
      comprobante,
      montoVerificadoCRC: amountCRC,
      montoEsperadoUSD: expectedUSD,
      tipoCambioAplicado: usdToCrcRate,
      bancoDetectado: bank,
      providerDispatched: false,
      customerNotified: false,
      message: `El comprobante SINPE #${comprobante} ya fue utilizado anteriormente. El pago no fue aplicado y requiere revisión.`,
      timestamp,
      auditHash: auditHashFor([bookingId, comprobante, 'REUSED', timestamp])
    };
  }

  // Conservamos el margen existente para diferencias de redondeo bancario, pero
  // nunca sustituye la autenticación del webhook ni la referencia de pago.
  const isAmountValid = amountCRC >= expectedCRC * 0.98;
  if (!isAmountValid) {
    logAutomationExecution(
      'SINPE_UNDERPAID_WARNING',
      Date.now() - start,
      'warning',
      `Pago SINPE incompleto para ${bookingId}: Recibido ₡${amountCRC}, Esperado ₡${expectedCRC}`
    );

    return manualReviewResult({
      bookingId,
      comprobante,
      amountCRC,
      expectedUSD,
      rate: usdToCrcRate,
      bank,
      reason: `Monto recibido (₡${amountCRC.toLocaleString()}) es inferior al total requerido (₡${expectedCRC.toLocaleString()}). La reserva requiere revisión manual.`
    });
  }

  verifiedComprobantesSet.add(comprobante);
  const verifiedAt = new Date().toISOString();
  const updateResult = await updateBookingStatus(bookingId, {
    status: 'paid',
    lifecycle: 'paid',
    paymentStatus: 'completed',
    paymentMethod: 'sinpe_movil',
    sinpeComprobante: comprobante,
    sinpeBank: bank,
    sinpeSenderPhone: phone || undefined,
    sinpeAmountCRC: amountCRC,
    sinpeVerifiedAt: verifiedAt,
    paymentVerifiedAt: verifiedAt,
    verificationMethod: 'sinpe_authenticated_webhook'
  });

  if (!updateResult.success) {
    verifiedComprobantesSet.delete(comprobante);
    throw new Error(updateResult.error || 'No se pudo registrar el pago SINPE verificado.');
  }

  const auditHash = auditHashFor([bookingId, comprobante, amountCRC, verifiedAt]);
  let providerDispatched = false;

  try {
    const lifecycleResult = await advanceReservationLifecycle(bookingId);
    providerDispatched = lifecycleResult.action === 'provider_dispatched' || lifecycleResult.to === 'provider_pending';
  } catch (err: any) {
    // El pago sigue correctamente verificado como `paid`. El barrido idempotente
    // del lifecycle reintentará el despacho sin duplicar efectos.
    console.warn(`Pago SINPE ${bookingId} verificado; despacho pendiente de reintento:`, err?.message || err);
  }

  const duration = Date.now() - start;
  logAutomationExecution(
    'SINPE_PAYMENT_VERIFIED',
    duration,
    'success',
    `Pago SINPE verificado para ${bookingId}; estado financiero paid, confirmación operativa pendiente del proveedor.`,
    { bookingId, comprobante, bank, auditHash, providerDispatched }
  );

  return {
    success: true,
    bookingId,
    status: 'paid',
    paymentStatus: 'completed',
    comprobante,
    montoVerificadoCRC: amountCRC,
    montoEsperadoUSD: expectedUSD,
    tipoCambioAplicado: usdToCrcRate,
    bancoDetectado: bank,
    providerDispatched,
    customerNotified: false,
    message: `Pago SINPE Móvil validado para la reserva #${bookingId}. La confirmación final y el voucher quedan pendientes de la confirmación operativa del proveedor.`,
    timestamp: verifiedAt,
    auditHash
  };
}
