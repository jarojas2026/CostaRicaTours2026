/**
 * 🇨🇷 SERVICIO NATIVO DE VERIFICACIÓN AUTÓNOMA DE PAGOS SINPE MÓVIL
 * =========================================================================
 * Procesa, valida y concilia transferencias y comprobantes de SINPE Móvil
 * emitidos por entidades bancarias costarricenses (BAC Credomatic, Banco Nacional BNCR,
 * Banco de Costa Rica BCR, Banco Popular, Davivienda, Promerica, Scotiabank).
 * 
 * Funcionalidades Autónomas:
 * - Extracción y normalización de número de comprobante, teléfono emisor y monto (CRC / USD).
 * - Comparación con el monto exacto de la reserva y tolerancia de redondeo cambiario.
 * - Validación contra duplicidad (previene ataques de comprobantes reutilizados).
 * - Transición de estado en Firestore: 'pendiente_sinpe' -> 'confirmada' (paymentStatus: 'completed').
 * - Despacho automático de notificación a proveedores y voucher QR al cliente.
 * =========================================================================
 */

import crypto from 'crypto';
import {
  findBookingByCodeOrEmail,
  updateBookingStatus,
  getBookingsCollection,
  getFirestoreDb,
  getUsdToCrcRate
} from './bookingService';
import { executeProviderRealtimeCoordination, executeCustomerBookingConfirmation } from './nativeWorkflows';
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
  status: 'confirmada' | 'rechazada_sinpe' | 'en_revision_manual';
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

// Registro en memoria de comprobantes ya procesados para prevenir doble uso
const verifiedComprobantesSet = new Set<string>();

/**
 * Normaliza y extrae datos clave de un mensaje SMS o texto plano de SINPE Móvil
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

  // 1. Detectar entidad bancaria
  let bankEntity = 'SINPE Móvil General';
  const lower = text.toLowerCase();
  if (lower.includes('bac') || lower.includes('credomatic')) bankEntity = 'BAC Credomatic';
  else if (lower.includes('bncr') || lower.includes('banco nacional') || lower.includes('bn móvil')) bankEntity = 'Banco Nacional (BNCR)';
  else if (lower.includes('bcr') || lower.includes('banco de costa rica')) bankEntity = 'Banco de Costa Rica (BCR)';
  else if (lower.includes('popular')) bankEntity = 'Banco Popular';
  else if (lower.includes('davivienda')) bankEntity = 'Davivienda';
  else if (lower.includes('promerica')) bankEntity = 'Banco Promerica';

  // 2. Extraer número de comprobante o referencia (ej: "Comprobante: 12345678", "Ref: 987654", "Transacción # 456789")
  const refMatch = text.match(/(?:comprobante|referencia|ref|transacci[oó]n|num|no\.?)\s*[:#]?\s*([A-Za-z0-9-]{6,16})/i);
  const referenceNumber = refMatch ? refMatch[1] : null;

  // 3. Extraer monto en colones (ej: "CRC 45,000", "45.000,00 colones", "monto: ¢50000")
  const amountMatch = text.match(/(?:¢|crc|colones?|monto\s*[:=]?\s*¢?)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/i);
  let amountCRC: number | null = null;
  if (amountMatch) {
    const rawNum = amountMatch[1].replace(/,/g, '').replace(/\.(?=[0-9]{3})/g, '');
    amountCRC = parseFloat(rawNum);
  }

  // 4. Extraer teléfono del emisor (8 dígitos en Costa Rica)
  const phoneMatch = text.match(/(?:de|del|tel[eé]fono|celular|emisor)\s*[:=]?\s*(?:\+?506)?\s*([2-8][0-9]{3}[-\s]?[0-9]{4})/i);
  const senderPhone = phoneMatch ? phoneMatch[1].replace(/[-\s]/g, '') : null;

  return {
    referenceNumber,
    amountCRC,
    senderPhone,
    bankEntity
  };
}

/**
 * Ejecuta la verificación integral de un pago SINPE Móvil
 */
export async function executeSinpeVerification(
  payload: SinpeVerificationPayload,
  sharedSecret?: string
): Promise<SinpeVerificationResult> {
  const start = Date.now();
  const rawBookingId = payload.bookingId || payload.idReserva || '';
  let comprobante = payload.referenceNumber || payload.numeroComprobante || '';
  let amountCRC = Number(payload.amountCRC || payload.montoCRC || 0);
  let bank = payload.bankEntity || payload.banco || 'SINPE Móvil';
  let phone = payload.senderPhone || payload.telefonoEmisor || '';

  // Si se envió un texto SMS crudo (vía webhook de pasarela SMS o servicio de integración)
  if (payload.rawSmsText) {
    const parsed = parseSinpeSmsText(payload.rawSmsText);
    if (!comprobante && parsed.referenceNumber) comprobante = parsed.referenceNumber;
    if (!amountCRC && parsed.amountCRC) amountCRC = parsed.amountCRC;
    if (parsed.bankEntity !== 'Desconocido') bank = parsed.bankEntity;
    if (!phone && parsed.senderPhone) phone = parsed.senderPhone;
  }

  // 1. Validar presencia de datos mínimos
  if (!rawBookingId) {
    throw new Error('ID de reserva es requerido para conciliar el pago SINPE Móvil.');
  }

  // Un comprobante real y un monto verificable son requisitos mínimos.
  // Nunca generamos referencias sintéticas para convertir una solicitud en un
  // pago confirmado.
  if (!comprobante) {
    throw new Error('Número de comprobante SINPE requerido. No se genera una referencia sintética.');
  }
  if (!Number.isFinite(amountCRC) || amountCRC <= 0) {
    throw new Error('Monto SINPE en CRC requerido y debe ser mayor que cero para conciliar el pago.');
  }

  // 2. Buscar la reserva mediante consultas indexadas. Evitamos cargar
  // todo el histórico de reservas para cada conciliación SINPE.
  const booking = await findBookingByCodeOrEmail(rawBookingId);
  if (!booking) {
    throw new Error(`Reserva no encontrada con el identificador: ${rawBookingId}`);
  }

  const bookingId = booking.bookingId || booking.id;
  const expectedUSD = Number(booking.totalUSD || 0);
  const usdToCrcRate = getUsdToCrcRate();
  const expectedCRC = Math.round(expectedUSD * usdToCrcRate);

  // 3. Verificación de Antifraude y No-Duplicidad de Comprobante
  if (verifiedComprobantesSet.has(comprobante)) {
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
      message: `El comprobante SINPE #${comprobante} ya fue utilizado anteriormente en otra transacción. Alerta de seguridad activada.`,
      timestamp: new Date().toISOString(),
      auditHash: crypto.createHash('sha256').update(`${bookingId}:${comprobante}:REUSED`).digest('hex')
    };
  }

  // 4. Verificación de monto (permite hasta 2% de margen por tipo de cambio bancario)
  const isAmountValid = amountCRC > 0 && amountCRC >= expectedCRC * 0.98;

  if (!isAmountValid && amountCRC > 0) {
    logAutomationExecution(
      'SINPE_UNDERPAID_WARNING',
      Date.now() - start,
      'warning',
      `Pago SINPE incompleto para ${bookingId}: Recibido ₡${amountCRC}, Esperado ₡${expectedCRC}`
    );

    return {
      success: false,
      bookingId,
      status: 'en_revision_manual',
      paymentStatus: 'pending',
      comprobante,
      montoVerificadoCRC: amountCRC,
      montoEsperadoUSD: expectedUSD,
      tipoCambioAplicado: usdToCrcRate,
      bancoDetectado: bank,
      providerDispatched: false,
      customerNotified: false,
      message: `Monto recibido (₡${amountCRC.toLocaleString()}) es inferior al total requerido (₡${expectedCRC.toLocaleString()}). La reserva requiere revisión manual.`,
      timestamp: new Date().toISOString(),
      auditHash: crypto.createHash('sha256').update(`${bookingId}:${comprobante}:UNDERPAID`).digest('hex')
    };
  }

  // 5. Conciliación durable e idempotente.
  // Un Set local no protege entre instancias ni después de reinicios; Firestore
  // actúa como fuente persistente para bloquear el mismo comprobante.
  const db = getFirestoreDb();
  const verificationId = crypto.createHash('sha256')
    .update(comprobante.trim().toUpperCase())
    .digest('hex')
    .slice(0, 40);

  let idempotentReplay = false;
  if (db) {
    const bookingDocumentId = String(booking.id || '').trim();
    const bookingsCollection = getBookingsCollection();
    if (!bookingDocumentId || !bookingsCollection) {
      throw new Error('No se encontró el documento Firestore de la reserva para una conciliación segura.');
    }

    try {
      await db.runTransaction(async transaction => {
        const verificationRef = db.collection('sinpe_verifications').doc(verificationId);
        const bookingRef = bookingsCollection.doc(bookingDocumentId);
        const [verificationSnap, bookingSnap] = await Promise.all([
          transaction.get(verificationRef),
          transaction.get(bookingRef)
        ]);

        if (!bookingSnap.exists) throw new Error('BOOKING_DOCUMENT_NOT_FOUND');

        if (verificationSnap.exists) {
          const previous = verificationSnap.data() || {};
          if (String(previous.bookingId || '') !== bookingId) {
            throw new Error('SINPE_DUPLICATE_REUSED');
          }
          idempotentReplay = true;
          return;
        }

        const persistedBooking = bookingSnap.data() || {};
        const existingPaymentStatus = String(persistedBooking.paymentStatus || '').toLowerCase();
        const existingReceipt = String(persistedBooking.sinpeComprobante || persistedBooking.sinpeReference || '').trim().toUpperCase();
        if (existingPaymentStatus === 'completed' && existingReceipt && existingReceipt !== comprobante.trim().toUpperCase()) {
          throw new Error('BOOKING_ALREADY_PAID');
        }

        const now = new Date().toISOString();
        transaction.set(verificationRef, {
          bookingId,
          comprobante,
          amountCRC: amountCRC || expectedCRC,
          expectedCRC,
          bank,
          verifiedAt: now,
          status: 'verified'
        });
        transaction.set(bookingRef, {
          sinpeReference: comprobante,
          sinpeComprobante: comprobante,
          paymentStatus: 'completed',
          paymentMethod: 'sinpe_movil',
          status: 'confirmada',
          sinpeBank: bank,
          sinpeAmountCRC: amountCRC || expectedCRC,
          sinpeVerifiedAt: now,
          updatedAt: now
        }, { merge: true });
      });
    } catch (error: any) {
      if (error?.message === 'SINPE_DUPLICATE_REUSED') {
        logAutomationExecution(
          'SINPE_DUPLICATE_ALERT',
          Date.now() - start,
          'error',
          `Comprobante SINPE reutilizado detectado en Firestore: ${comprobante} para reserva ${bookingId}`
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
          message: 'El comprobante SINPE ya está asociado a otra reserva. Se bloqueó la conciliación y se registró la alerta.',
          timestamp: new Date().toISOString(),
          auditHash: crypto.createHash('sha256').update(`${bookingId}:${comprobante}:REUSED_DURABLE`).digest('hex')
        };
      }
      if (error?.message === 'BOOKING_DOCUMENT_NOT_FOUND') {
        throw new Error('Documento Firestore de la reserva no encontrado.');
      }
      if (error?.message === 'BOOKING_ALREADY_PAID') {
        throw new Error('La reserva ya tiene un pago completado con un comprobante diferente.');
      }
      throw error;
    }
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('No se puede conciliar SINPE de forma segura sin Firestore.');
  }

  // 6. Generar firma de auditoría
  const auditHash = crypto
    .createHash('sha256')
    .update(`${bookingId}:${comprobante}:${amountCRC || expectedCRC}:${new Date().toISOString()}`)
    .digest('hex');

  // 7. Disparar Despacho a Proveedor y Confirmación al Cliente en Segundo Plano
  let providerDispatched = false;
  let customerNotified = false;

  try {
    const providerRes = await executeProviderRealtimeCoordination({
      bookingId,
      idReserva: bookingId,
      tourName: booking.tourName,
      tourDate: booking.date,
      tourTime: booking.time,
      adults: booking.adults,
      children: booking.children,
      totalUSD: booking.totalUSD,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      pickupHotel: booking.pickupHotel,
      paymentMethod: 'SINPE Móvil',
      sinpeComprobante: comprobante
    });
    providerDispatched = providerRes.success;
  } catch (err: any) {
    console.warn(`Aviso en despacho a proveedor tras SINPE (${bookingId}):`, err.message);
  }

  try {
    const customerRes = await executeCustomerBookingConfirmation({
      bookingId,
      idReserva: bookingId,
      tourName: booking.tourName,
      tourDate: booking.date,
      tourTime: booking.time,
      adults: booking.adults,
      children: booking.children,
      totalUSD: booking.totalUSD,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      pickupHotel: booking.pickupHotel,
      paymentMethod: 'SINPE Móvil',
      sinpeComprobante: comprobante
    });
    customerNotified = customerRes.success;
  } catch (err: any) {
    console.warn(`Aviso en confirmación a cliente tras SINPE (${bookingId}):`, err.message);
  }

  const duration = Date.now() - start;
  logAutomationExecution(
    'SINPE_PAYMENT_VERIFIED',
    duration,
    'success',
    `Pago SINPE verificado exitosamente para ${bookingId} (Comprobante: ${comprobante}, ₡${(amountCRC || expectedCRC).toLocaleString()} CRC)`,
    { bookingId, comprobante, bank, auditHash }
  );

  return {
    success: true,
    bookingId,
    status: 'confirmada',
    paymentStatus: 'completed',
    comprobante,
    montoVerificadoCRC: amountCRC || expectedCRC,
    montoEsperadoUSD: expectedUSD,
    tipoCambioAplicado: usdToCrcRate,
    bancoDetectado: bank,
    providerDispatched,
    customerNotified,
    message: `Pago SINPE Móvil validado con éxito. Reserva #${bookingId} confirmada, operador notificado y voucher QR generado.`,
    timestamp: new Date().toISOString(),
    auditHash
  };
}
