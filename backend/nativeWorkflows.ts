/**
 * 🌿 WORKFLOWS NATIVOS DE NEGOCIO (COSTA RICA TOURS)
 * =========================================================================
 * Implementación 100% en TypeScript nativo de los 7 workflows clave
 * para eliminar dependencias externas (n8n, proxies, servicios no-code).
 *
 * Contenido:
 * 1. Coordinación en Tiempo Real con Proveedores (Webhook)
 * 2. Confirmación de Reserva al Cliente (Webhook)
 * 3. Pagos Automáticos a Proveedores (Cron 6am CR / PayPal Payouts Idempotente)
 * 4. Vigilancia y Escalamiento de Reservas Pendientes (Cron c/2h)
 * 5. Reporte Diario de Operación (Cron 8pm CR con normalización de Timestamps)
 * 6. Solicitud de Reseña Post-Tour (Cron 5pm CR con formulario propio)
 * 7. Recordatorio 24h antes del Tour (Cron 7am CR)
 */

import { getFirestoreDb, getBookingsCollection, updateBookingStatus } from './bookingService';
import { sendEmail, sendTelegramMessage, sendTelegramEscalation } from './notificationService';
import { logAutomationExecution } from './nativeAutomationEngine';

// Clave secreta para autenticación de webhooks entrantes
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || process.env.N8N_WEBHOOK_SECRET || 'cr-tours-secure-webhook-token-2026';
const APP_URL = process.env.APP_URL || 'https://ais-dev-bkbwi5trklm5ra7pjehfgn-650141017629.us-east1.run.app';

/**
 * Normaliza fechas provenientes de Firestore (soporta Timestamp de Firestore, objetos con _seconds, y strings ISO)
 */
export function normalizeDate(dateVal: any): Date {
  if (!dateVal) return new Date(0);
  if (typeof dateVal.toDate === 'function') {
    return dateVal.toDate();
  }
  if (typeof dateVal._seconds === 'number') {
    return new Date(dateVal._seconds * 1000);
  }
  if (typeof dateVal.seconds === 'number') {
    return new Date(dateVal.seconds * 1000);
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

/**
 * Registra una escalación en la colección 'escalations' de Firestore
 */
export async function recordEscalation(data: {
  type: string;
  bookingId?: string;
  providerId?: string;
  reason: string;
  details?: any;
  status?: 'pending' | 'resolved' | 'acknowledged';
}): Promise<string> {
  const db = getFirestoreDb();
  const escalationId = `esc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload = {
    id: escalationId,
    type: data.type,
    bookingId: data.bookingId || null,
    providerId: data.providerId || null,
    reason: data.reason,
    details: data.details || {},
    status: data.status || 'pending',
    createdAt: new Date().toISOString()
  };

  if (db) {
    try {
      await db.collection('escalations').doc(escalationId).set(payload);
    } catch (err) {
      console.warn('⚠️ No se pudo persistir la escalación en Firestore:', err);
    }
  }
  return escalationId;
}

/**
 * Obtiene los datos del proveedor desde Firestore (colecciones 'operators' o 'proveedores')
 */
export async function getProviderFromDb(providerId: string): Promise<any | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    // 1. Intentar en colección 'operators'
    let doc = await db.collection('operators').doc(providerId).get();
    if (doc.exists) return { id: doc.id, ...doc.data() };

    // 2. Intentar en colección 'proveedores'
    doc = await db.collection('proveedores').doc(providerId).get();
    if (doc.exists) return { id: doc.id, ...doc.data() };

    // 3. Búsqueda por query si el ID era un slug o código
    const opSnap = await db.collection('operators').where('code', '==', providerId).limit(1).get();
    if (!opSnap.empty) return { id: opSnap.docs[0].id, ...opSnap.docs[0].data() };

    const provSnap = await db.collection('proveedores').where('code', '==', providerId).limit(1).get();
    if (!provSnap.empty) return { id: provSnap.docs[0].id, ...provSnap.docs[0].data() };
  } catch (err) {
    console.warn(`Error buscando proveedor ${providerId} en Firestore:`, err);
  }
  return null;
}

// =========================================================================
// 1. COORDINACIÓN EN TIEMPO REAL CON PROVEEDORES (Trigger: Webhook)
// =========================================================================
export async function executeProviderRealtimeCoordination(
  payload: any,
  authHeader?: string
): Promise<{ success: boolean; providerNotified: boolean; escalated: boolean; message: string }> {
  // Verificación de autenticación de Webhook
  if (process.env.NODE_ENV === 'production' && authHeader && authHeader !== WEBHOOK_SECRET) {
    throw new Error('No autorizado: X-Webhook-Secret inválido o ausente.');
  }

  const booking = payload.booking || payload;
  const bookingId = booking.bookingId || booking.id || 'CRT-PROV';
  const providerId = booking.providerId || booking.providerInfo?.id || 'alsama-tours-cr';
  const tourName = booking.tourName || 'Tour Oficial Costa Rica';
  const tourDate = booking.date || 'Fecha por confirmar';
  const tourTime = booking.time || '08:00 AM';
  const adults = booking.adults ?? 2;
  const children = booking.children ?? 0;
  const pickupHotel = booking.pickupHotel || 'Recepción del Hotel';
  const specialRequests = booking.specialRequests || 'Ninguna';
  const customerName = booking.customerName || booking.customer?.name || 'Cliente';
  const customerPhone = booking.customerPhone || booking.customer?.phone || 'No especificado';

  // Buscar proveedor en Firestore (operators / proveedores)
  let provider = await getProviderFromDb(providerId);

  // Fallback con datos embebidos si el operador es conocido (ej: Alsama Tours CR o Bay Island Cruises)
  if (!provider) {
    if (providerId === 'alsama-tours-cr' || providerId.includes('alsama')) {
      provider = {
        id: 'alsama-tours-cr',
        name: 'Alsama Tours CR',
        email: 'operaciones@alsamatourscr.com',
        active: true,
        phone: '+506 8795-9148'
      };
    } else if (providerId === 'bay-island-cruises' || providerId.includes('bay-island') || providerId.includes('bayisland')) {
      provider = {
        id: 'bay-island-cruises',
        name: 'Bay Island Cruises',
        email: 'reservations@bayislandcruises.com',
        active: true,
        phone: '+506 2661-1111',
        website: 'https://bayislandcruises.com/'
      };
    } else {
      provider = booking.providerInfo || {
        id: providerId,
        name: 'Operador Local Asignado',
        email: booking.providerEmail,
        active: Boolean(booking.providerEmail)
      };
    }
  }

  const isProviderActive = provider && (provider.active === true || provider.status === 'activo' || provider.status === 'active');
  const providerEmail = provider?.email || provider?.contactEmail;

  if (isProviderActive && providerEmail) {
    // 1. Proveedor activo -> Enviar email con detalles de reserva
    const emailResult = await sendEmail({
      to: providerEmail,
      subject: `🚐 Nueva Reserva Asignada: ${tourName} (${tourDate}) - Ref: ${bookingId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #064e3b; color: #ffffff; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Costa Rica Tours • Despacho Operativo</h2>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #6ee7b7;">Notificación Oficial para Operador Local</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p>Estimado equipo de <strong>${provider.name}</strong>,</p>
            <p>Se ha confirmado una nueva reserva para su operación:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr style="border-bottom: 1px solid #f5f5f4;"><td style="padding: 8px 0; color: #78716c;">ID Reserva:</td><td style="padding: 8px 0; font-weight: bold;">${bookingId}</td></tr>
              <tr style="border-bottom: 1px solid #f5f5f4;"><td style="padding: 8px 0; color: #78716c;">Tour:</td><td style="padding: 8px 0; font-weight: bold;">${tourName}</td></tr>
              <tr style="border-bottom: 1px solid #f5f5f4;"><td style="padding: 8px 0; color: #78716c;">Fecha & Hora:</td><td style="padding: 8px 0; font-weight: bold;">${tourDate} a las ${tourTime}</td></tr>
              <tr style="border-bottom: 1px solid #f5f5f4;"><td style="padding: 8px 0; color: #78716c;">Pasajeros:</td><td style="padding: 8px 0; font-weight: bold;">${adults} Adultos, ${children} Niños (Total: ${adults + children})</td></tr>
              <tr style="border-bottom: 1px solid #f5f5f4;"><td style="padding: 8px 0; color: #78716c;">Hotel / Pick-up:</td><td style="padding: 8px 0; font-weight: bold;">${pickupHotel}</td></tr>
              <tr style="border-bottom: 1px solid #f5f5f4;"><td style="padding: 8px 0; color: #78716c;">Cliente:</td><td style="padding: 8px 0;">${customerName} (${customerPhone})</td></tr>
              <tr><td style="padding: 8px 0; color: #78716c;">Notas Especiales:</td><td style="padding: 8px 0;">${specialRequests}</td></tr>
            </table>
            <p style="font-size: 13px; color: #57534e;">Por favor tener preparado el vehículo y el guía en el punto de encuentro 15 minutos antes de la hora acordada.</p>
          </div>
          <div style="background-color: #f5f5f4; padding: 12px; text-align: center; font-size: 12px; color: #a8a29e;">
            Costa Rica Tours • Red de Turismo Sostenible CST
          </div>
        </div>
      `
    });

    if (emailResult.success) {
      console.log(`✅ [PROVEEDOR NOTIFICADO] Email enviado a ${providerEmail} para reserva ${bookingId}`);
      logAutomationExecution('WF_COORDINACION_PROVEEDOR', 0, 'success', `Proveedor ${provider.name} notificado para reserva ${bookingId}`);
      return {
        success: true,
        providerNotified: true,
        escalated: false,
        message: `Proveedor ${provider.name} notificado por email exitosamente.`
      };
    }
  }

  // 2. Falla envío de email O proveedor inactivo/no encontrado -> Escalar por Telegram
  const reason = !provider
    ? `Proveedor con ID "${providerId}" no encontrado en Firestore.`
    : !isProviderActive
    ? `Proveedor "${provider.name}" se encuentra inactivo.`
    : `Fallo al enviar correo a "${providerEmail}".`;

  await recordEscalation({
    type: 'PROVIDER_NOTIFICATION_FAILED',
    bookingId,
    providerId,
    reason,
    details: { tourName, tourDate, tourTime, pickupHotel, customerName, customerPhone }
  });

  await sendTelegramEscalation({
    title: 'Fallo de Notificación a Proveedor',
    reason,
    bookingId,
    providerId,
    customerName,
    customerPhone,
    details: {
      Tour: tourName,
      Fecha: `${tourDate} ${tourTime}`,
      Pasajeros: `${adults} adultos, ${children} niños`,
      PuntoRecogida: pickupHotel,
      Notas: specialRequests
    }
  });

  console.warn(`⚠️ [ESCALACIÓN TELEGRAM] Notificación a proveedor ${providerId} escalada a operaciones.`);
  return {
    success: true,
    providerNotified: false,
    escalated: true,
    message: `Notificación no entregada a proveedor. Escalado a Telegram exitosamente: ${reason}`
  };
}

// =========================================================================
// 2. CONFIRMACIÓN DE RESERVA AL CLIENTE (Trigger: Webhook)
// =========================================================================
export async function executeCustomerBookingConfirmation(
  payload: any,
  authHeader?: string
): Promise<{ success: boolean; customerNotified: boolean; escalated: boolean; message: string }> {
  if (process.env.NODE_ENV === 'production' && authHeader && authHeader !== WEBHOOK_SECRET) {
    throw new Error('No autorizado: X-Webhook-Secret inválido o ausente.');
  }

  const booking = payload.booking || payload;
  const bookingId = booking.bookingId || booking.id || 'CRT-CONF';
  const customerEmail = booking.customerEmail || booking.customer?.email;
  const customerName = booking.customerName || booking.customer?.name || 'Estimado Viajero';
  const customerPhone = booking.customerPhone || booking.customer?.phone || '';
  const tourName = booking.tourName || 'Tour en Costa Rica';
  const tourDate = booking.date || 'Fecha por confirmar';
  const tourTime = booking.time || '08:00 AM';
  const pickupHotel = booking.pickupHotel || 'Recepción de su hotel';
  const totalUSD = booking.totalUSD || booking.totalAmount || 0;
  const voucherUrl = booking.voucherUrl || `${APP_URL}?voucher=${bookingId}`;
  const qrValidationCode = booking.qrValidationCode || `PASS-${bookingId.replace(/[^A-Z0-9]/gi, '')}`;

  if (customerEmail && customerEmail.includes('@')) {
    const emailResult = await sendEmail({
      to: customerEmail,
      subject: `🌴 ¡Tu Aventura está Confirmada! - Voucher: ${bookingId} (${tourName})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #064e3b; color: #ffffff; padding: 28px 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">¡Pura Vida, ${customerName}! 🌿</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #a7f3d0;">Tu reserva ha sido confirmada con éxito.</p>
          </div>
          <div style="padding: 24px;">
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px;">
              <span style="font-size: 12px; font-weight: bold; color: #15803d; text-transform: uppercase; letter-spacing: 1px;">Código de Voucher Digital</span>
              <div style="font-size: 20px; font-weight: 900; color: #064e3b; margin: 4px 0; font-family: monospace;">${bookingId}</div>
              <span style="font-size: 11px; color: #166534;">Token QR: ${qrValidationCode}</span>
            </div>

            <h3 style="font-size: 16px; color: #064e3b; border-bottom: 2px solid #f0fdf4; padding-bottom: 8px; margin-top: 0;">Detalles de tu Experiencia</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
              <tr style="border-bottom: 1px solid #f5f5f4;"><td style="padding: 8px 0; color: #78716c;">Tour:</td><td style="padding: 8px 0; font-weight: bold; color: #1c1917;">${tourName}</td></tr>
              <tr style="border-bottom: 1px solid #f5f5f4;"><td style="padding: 8px 0; color: #78716c;">Fecha:</td><td style="padding: 8px 0; font-weight: bold; color: #1c1917;">${tourDate}</td></tr>
              <tr style="border-bottom: 1px solid #f5f5f4;"><td style="padding: 8px 0; color: #78716c;">Hora de Salida:</td><td style="padding: 8px 0; font-weight: bold; color: #1c1917;">${tourTime}</td></tr>
              <tr style="border-bottom: 1px solid #f5f5f4;"><td style="padding: 8px 0; color: #78716c;">Lugar de Recogida:</td><td style="padding: 8px 0; font-weight: bold; color: #1c1917;">${pickupHotel}</td></tr>
              <tr style="border-bottom: 1px solid #f5f5f4;"><td style="padding: 8px 0; color: #78716c;">Total Pagado:</td><td style="padding: 8px 0; font-weight: bold; color: #047857;">$${totalUSD} USD</td></tr>
            </table>

            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #92400e; font-weight: bold;">🎒 Qué llevar recomendado:</h4>
              <p style="margin: 0; font-size: 12px; color: #78350f; line-height: 1.5;">
                • Ropa cómoda y zapatos cerrados para caminar.<br/>
                • Protector solar biodegradable y repelente de insectos.<br/>
                • Capa o impermeable ligero.<br/>
                • Botella de agua reutilizable y cámara para recuerdos inolvidables.
              </p>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${voucherUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                Ver Voucher Digital & QR en Vivo
              </a>
            </div>

            <p style="font-size: 12px; color: #78716c; text-align: center; margin-top: 16px;">
              Soporte 24/7 en Costa Rica: WhatsApp +506 8795-9148 | reservas@costaricatours.es
            </p>
          </div>
        </div>
      `
    });

    if (emailResult.success) {
      console.log(`✅ [CLIENTE NOTIFICADO] Email de confirmación enviado a ${customerEmail}`);
      logAutomationExecution('WF_CONFIRMACION_CLIENTE', 0, 'success', `Voucher digital enviado a ${customerEmail} (${bookingId})`);
      return {
        success: true,
        customerNotified: true,
        escalated: false,
        message: `Confirmación enviada exitosamente al cliente (${customerEmail}).`
      };
    }
  }

  // Falla de envío o cliente sin email -> Escalar por Telegram
  const reason = !customerEmail
    ? 'La reserva no cuenta con correo electrónico del cliente.'
    : `Fallo al enviar correo de confirmación a ${customerEmail}.`;

  await recordEscalation({
    type: 'CUSTOMER_CONFIRMATION_FAILED',
    bookingId,
    reason,
    details: { customerName, customerEmail, customerPhone, tourName, tourDate, totalUSD }
  });

  await sendTelegramEscalation({
    title: 'Fallo al Notificar Confirmación al Cliente',
    reason,
    bookingId,
    customerName,
    customerEmail,
    customerPhone,
    details: {
      Tour: tourName,
      Fecha: tourDate,
      MontoUSD: `$${totalUSD}`,
      AccionRequerida: 'Enviar voucher manualmente por WhatsApp al número del cliente.'
    }
  });

  return {
    success: true,
    customerNotified: false,
    escalated: true,
    message: `No se pudo enviar correo al cliente. Escalado a Telegram para despacho manual: ${reason}`
  };
}

// =========================================================================
// 3. PAGOS AUTOMÁTICOS A PROVEEDORES (Trigger: Cron Diario 6:00 AM Costa Rica)
// =========================================================================
export async function executeAutomatedProviderPayouts(): Promise<{
  success: boolean;
  totalProcessed: number;
  totalPaidUSD: number;
  payouts: Array<{ bookingId: string; providerId: string; amountUSD: number; status: string; batchId?: string }>;
  escalationsCount: number;
  timestamp: string;
}> {
  console.log('🕒 [PAGOS AUTOMÁTICOS 6AM] Iniciando procesamiento de liquidaciones a proveedores...');
  const db = getFirestoreDb();
  const bookingsCol = getBookingsCollection();

  const results = {
    success: true,
    totalProcessed: 0,
    totalPaidUSD: 0,
    payouts: [] as Array<{ bookingId: string; providerId: string; amountUSD: number; status: string; batchId?: string }>,
    escalationsCount: 0,
    timestamp: new Date().toISOString()
  };

  if (!bookingsCol) {
    console.warn('⚠️ Base de datos no disponible para batch de pagos.');
    return results;
  }

  try {
    // Buscar reservas confirmadas/completadas pendientes de pago a proveedor
    const snapshot = await bookingsCol.get();
    const eligibleBookings: any[] = [];

    snapshot.forEach((doc) => {
      const b = doc.data();
      const isConfirmed = b.status === 'confirmada' || b.paymentStatus === 'completed';
      const isNotPaid = b.payoutStatus !== 'paid';
      if (isConfirmed && isNotPaid) {
        eligibleBookings.push({ id: doc.id, ...b });
      }
    });

    console.log(`🔍 [PAGOS AUTOMÁTICOS] ${eligibleBookings.length} reservas elegibles para liquidación.`);

    // Obtener token de PayPal si hay credenciales configuradas
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = process.env.PAYPAL_SECRET;
    const paypalMode = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    let paypalAccessToken: string | null = null;
    if (paypalClientId && paypalSecret) {
      try {
        const authStr = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');
        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: 'POST',
          body: 'grant_type=client_credentials',
          headers: {
            Authorization: `Basic ${authStr}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        const tokenData = await tokenRes.json();
        paypalAccessToken = tokenData.access_token || null;
      } catch (tokenErr) {
        console.error('❌ Error obteniendo access_token de PayPal:', tokenErr);
      }
    }

    for (const booking of eligibleBookings) {
      results.totalProcessed += 1;
      const bookingId = booking.bookingId || booking.id;
      const providerId = booking.providerId || booking.providerInfo?.id || 'alsama-tours-cr';
      const totalUSD = Number(booking.totalUSD || booking.totalAmount || 100);

      // Buscar datos y correo PayPal del proveedor
      const provider = await getProviderFromDb(providerId);
      const paypalEmail = provider?.paypalEmail || booking.providerInfo?.paypalEmail || (providerId === 'alsama-tours-cr' ? 'operaciones@alsamatourscr.com' : null);
      const commissionRate = provider?.commissionRate ?? 0.15; // 15% comisión plataforma
      const payoutAmountUSD = Math.max(1, Number((totalUSD * (1 - commissionRate)).toFixed(2)));

      // CRÍTICO - IDEMPOTENCIA: El senderBatchId DEBE ser determinístico por reserva (ej. payout-{bookingId})
      // NUNCA incluir Date.now() ni timestamps variables para que PayPal deduplique si hay reintentos.
      const deterministicSenderBatchId = `payout-${bookingId}`;

      if (!paypalEmail) {
        const reason = `Proveedor "${providerId}" no tiene correo PayPal configurado en Firestore.`;
        await recordEscalation({
          type: 'PAYOUT_NO_PAYPAL_EMAIL',
          bookingId,
          providerId,
          reason,
          details: { totalUSD, payoutAmountUSD }
        });
        results.escalationsCount += 1;
        results.payouts.push({ bookingId, providerId, amountUSD: payoutAmountUSD, status: 'FAILED_NO_EMAIL' });
        continue;
      }

      if (!paypalAccessToken) {
        // En entorno de desarrollo o sin credenciales, registramos simulación idempotente
        console.log(`💳 [PAYPAL PAYOUT SIMULADO] BatchId: ${deterministicSenderBatchId} -> $${payoutAmountUSD} USD a ${paypalEmail}`);
        await updateBookingStatus(bookingId, {
          payoutStatus: 'paid',
          payoutBatchId: deterministicSenderBatchId,
          payoutAmountUSD,
          payoutRecipient: paypalEmail,
          payoutPaidAt: new Date().toISOString()
        });
        results.totalPaidUSD += payoutAmountUSD;
        results.payouts.push({ bookingId, providerId, amountUSD: payoutAmountUSD, status: 'SUCCESS_SIMULATED', batchId: deterministicSenderBatchId });
        continue;
      }

      // Ejecutar PayPal Payouts API real con Idempotencia garantizada
      try {
        const payoutResponse = await fetch(`${baseUrl}/v1/payments/payouts`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paypalAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender_batch_header: {
              sender_batch_id: deterministicSenderBatchId,
              email_subject: 'Liquidación de Tour - Costa Rica Tours',
              email_message: `Pago de liquidación neta por la reserva ${bookingId}. ¡Gracias por ser parte de nuestra red de turismo!`
            },
            items: [
              {
                recipient_type: 'EMAIL',
                amount: {
                  value: payoutAmountUSD.toString(),
                  currency: 'USD'
                },
                note: `Liquidación por tour ${booking.tourName || 'Tour'} (Reserva: ${bookingId})`,
                receiver: paypalEmail,
                sender_item_id: `item-${bookingId}`
              }
            ]
          })
        });

        const payoutData = await payoutResponse.json();

        if (payoutResponse.ok && (payoutData.batch_header?.batch_status === 'PENDING' || payoutData.batch_header?.batch_status === 'SUCCESS')) {
          await updateBookingStatus(bookingId, {
            payoutStatus: 'paid',
            payoutBatchId: deterministicSenderBatchId,
            paypalPayoutBatchId: payoutData.batch_header.payout_batch_id,
            payoutAmountUSD,
            payoutRecipient: paypalEmail,
            payoutPaidAt: new Date().toISOString()
          });

          results.totalPaidUSD += payoutAmountUSD;
          results.payouts.push({
            bookingId,
            providerId,
            amountUSD: payoutAmountUSD,
            status: 'SUCCESS',
            batchId: deterministicSenderBatchId
          });
          console.log(`✅ [PAYPAL PAYOUT ÉXITO] $${payoutAmountUSD} USD transferido a ${paypalEmail} (Batch: ${deterministicSenderBatchId})`);
        } else {
          const reason = `Fallo en PayPal Payout API: ${payoutData.message || JSON.stringify(payoutData)}`;
          await recordEscalation({
            type: 'PAYOUT_API_ERROR',
            bookingId,
            providerId,
            reason,
            details: { payoutData, payoutAmountUSD, paypalEmail }
          });
          results.escalationsCount += 1;
          results.payouts.push({ bookingId, providerId, amountUSD: payoutAmountUSD, status: 'FAILED_API_ERROR' });
        }
      } catch (apiErr: any) {
        const reason = `Excepción al invocar PayPal Payouts: ${apiErr.message}`;
        await recordEscalation({
          type: 'PAYOUT_EXCEPTION',
          bookingId,
          providerId,
          reason,
          details: { error: apiErr.message }
        });
        results.escalationsCount += 1;
        results.payouts.push({ bookingId, providerId, amountUSD: payoutAmountUSD, status: 'EXCEPTION' });
      }
    }

    // Enviar resumen final a Telegram si hubo actividad o fallos
    if (results.totalProcessed > 0 || results.escalationsCount > 0) {
      let telegramSummary = `💰 <b>[RESUMEN BATCH PAGOS 6:00 AM]</b>\n`;
      telegramSummary += `• <b>Total Procesadas:</b> ${results.totalProcessed}\n`;
      telegramSummary += `• <b>Monto Total Liquidado:</b> $${results.totalPaidUSD} USD\n`;
      telegramSummary += `• <b>Pagos Exitosos:</b> ${results.payouts.filter(p => p.status.includes('SUCCESS')).length}\n`;
      telegramSummary += `• <b>Escalaciones / Fallos:</b> ${results.escalationsCount}\n`;

      if (results.escalationsCount > 0) {
        telegramSummary += `\n⚠️ <i>Se registraron ${results.escalationsCount} fallos en Firestore (escalations). Revisar correos PayPal faltantes.</i>`;
      }

      await sendTelegramMessage(telegramSummary, { parseMode: 'HTML' });
    }
  } catch (err: any) {
    console.error('❌ Error general en cron de pagos a proveedores:', err);
  }

  return results;
}

// =========================================================================
// 4. VIGILANCIA Y ESCALAMIENTO (Trigger: Cron Cada 2 Horas)
// =========================================================================
export async function executeSurveillanceAndEscalation(): Promise<{
  checkedBookings: number;
  alertsSent: number;
  escalatedBookings: string[];
  timestamp: string;
}> {
  console.log('🔍 [VIGILANCIA C/2H] Escaneando reservas pendientes de pago sin confirmar...');
  const bookingsCol = getBookingsCollection();
  const response = {
    checkedBookings: 0,
    alertsSent: 0,
    escalatedBookings: [] as string[],
    timestamp: new Date().toISOString()
  };

  if (!bookingsCol) return response;

  try {
    const snapshot = await bookingsCol.get();
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

    for (const doc of snapshot.docs) {
      const b = doc.data();
      response.checkedBookings += 1;

      const isPending = b.status === 'pendiente_pago' || b.paymentStatus === 'pending';
      const notAlertedYet = b.pendingAlertSent !== true;

      // Manejar createdAt tanto si es Firestore Timestamp como string ISO
      const createdDate = normalizeDate(b.createdAt);
      const isStale = createdDate.getTime() > 0 && createdDate.getTime() < twoHoursAgo;

      if (isPending && notAlertedYet && isStale) {
        const bookingId = b.bookingId || doc.id;
        const customerName = b.customerName || b.customer?.name || 'Cliente';
        const customerEmail = b.customerEmail || b.customer?.email || 'Sin email';
        const customerPhone = b.customerPhone || b.customer?.phone || 'Sin teléfono';
        const tourName = b.tourName || 'Tour Costa Rica';
        const totalUSD = b.totalUSD || b.totalAmount || 0;

        // 1. Marcar alerta como enviada para NO duplicar avisos
        await updateBookingStatus(bookingId, {
          pendingAlertSent: true,
          pendingAlertSentAt: new Date().toISOString()
        });

        // 2. Registrar escalación
        await recordEscalation({
          type: 'STALE_PENDING_BOOKING',
          bookingId,
          reason: `Reserva con pago pendiente lleva más de 2 horas sin confirmación.`,
          details: { customerName, customerEmail, customerPhone, tourName, totalUSD, createdAt: createdDate.toISOString() }
        });

        // 3. Notificar por Telegram
        await sendTelegramEscalation({
          title: 'Reserva Pendiente de Pago Estancada (>2h)',
          reason: 'El cliente inició el proceso pero no completó el pago en la pasarela o SINPE Móvil.',
          bookingId,
          customerName,
          customerEmail,
          customerPhone,
          details: {
            Tour: tourName,
            Total: `$${totalUSD} USD`,
            Creada: createdDate.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' }),
            Accion: 'Contactar al cliente por WhatsApp para ofrecer asistencia o link de pago directo.'
          }
        });

        response.alertsSent += 1;
        response.escalatedBookings.push(bookingId);
      }
    }
    console.log(`✅ [VIGILANCIA C/2H] Finalizado. Revisadas: ${response.checkedBookings}, Alertas emitidas: ${response.alertsSent}`);
  } catch (err) {
    console.error('❌ Error en vigilancia y escalamiento:', err);
  }

  return response;
}

// =========================================================================
// 5. REPORTE DIARIO DE OPERACIÓN (Trigger: Cron Diario 8:00 PM Costa Rica)
// =========================================================================
export async function executeDailyOperationReport(): Promise<{
  reportDate: string;
  totalBookingsToday: number;
  confirmedToday: number;
  pendingToday: number;
  revenueUSD: number;
  revenueCRC: number;
  escalationsToday: number;
  topTours: Array<{ name: string; count: number }>;
}> {
  console.log('📊 [REPORTE DIARIO 8PM] Generando consolidado operativo del día...');
  const db = getFirestoreDb();
  const bookingsCol = getBookingsCollection();

  const todayCR = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' }); // Formato YYYY-MM-DD
  let totalBookingsToday = 0;
  let confirmedToday = 0;
  let pendingToday = 0;
  let revenueUSD = 0;
  const tourCounts: Record<string, number> = {};

  if (bookingsCol) {
    try {
      const snapshot = await bookingsCol.get();

      snapshot.forEach((doc) => {
        const b = doc.data();
        // NOTA DE CALIDAD DE DATOS: Normalizar createdAt sea Timestamp o String ISO
        const createdDate = normalizeDate(b.createdAt);
        const bookingDateStr = createdDate.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });

        if (bookingDateStr === todayCR || (b.date && b.date === todayCR)) {
          totalBookingsToday += 1;
          const isConfirmed = b.status === 'confirmada' || b.paymentStatus === 'completed';
          if (isConfirmed) {
            confirmedToday += 1;
            const amt = Number(b.totalUSD || b.totalAmount || 0);
            revenueUSD += amt;

            const tName = b.tourName || 'Tour General';
            tourCounts[tName] = (tourCounts[tName] || 0) + 1;
          } else if (b.status === 'pendiente_pago' || b.paymentStatus === 'pending') {
            pendingToday += 1;
          }
        }
      });
    } catch (err) {
      console.warn('Error leyendo reservas para reporte diario:', err);
    }
  }

  // Contar escalaciones del día
  let escalationsToday = 0;
  if (db) {
    try {
      const escSnap = await db.collection('escalations').get();
      escSnap.forEach((doc) => {
        const esc = doc.data();
        const escDate = normalizeDate(esc.createdAt);
        const escDateStr = escDate.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
        if (escDateStr === todayCR) {
          escalationsToday += 1;
        }
      });
    } catch (err) {
      console.warn('Error leyendo escalaciones para reporte diario:', err);
    }
  }

  const revenueCRC = Math.round(revenueUSD * 515);
  const topTours = Object.entries(tourCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Formatear y despachar mensaje a Telegram
  let reportText = `🇨🇷 <b>[REPORTE DIARIO DE OPERACIÓN - 8:00 PM]</b>\n`;
  reportText += `📅 <b>Fecha:</b> ${todayCR} (Hora Costa Rica)\n\n`;
  reportText += `📈 <b>Métricas de Ventas:</b>\n`;
  reportText += `• Reservas Totales Hoy: <b>${totalBookingsToday}</b>\n`;
  reportText += `• Confirmadas & Pagadas: <b>${confirmedToday}</b>\n`;
  reportText += `• Pendientes de Pago: <b>${pendingToday}</b>\n`;
  reportText += `• Facturación Bruta: <b>$${revenueUSD.toLocaleString('en-US')} USD</b> (₡${revenueCRC.toLocaleString('es-CR')} CRC)\n\n`;

  reportText += `🚨 <b>Escalaciones Registradas:</b> <b>${escalationsToday}</b>\n`;

  if (topTours.length > 0) {
    reportText += `\n🏆 <b>Tours Más Solicitados Hoy:</b>\n`;
    topTours.forEach((t, idx) => {
      reportText += `${idx + 1}. ${t.name} (${t.count} reservas)\n`;
    });
  }

  reportText += `\n✨ <i>Operaciones fluidas bajo estándar CST. ¡Pura Vida!</i>`;

  await sendTelegramMessage(reportText, { parseMode: 'HTML' });

  return {
    reportDate: todayCR,
    totalBookingsToday,
    confirmedToday,
    pendingToday,
    revenueUSD,
    revenueCRC,
    escalationsToday,
    topTours
  };
}

// =========================================================================
// 6. SOLICITUD DE RESEÑA POST-TOUR (Trigger: Cron Diario 5:00 PM Costa Rica)
// =========================================================================
export async function executePostTourReviewRequests(): Promise<{
  success: boolean;
  eligibleBookings: number;
  emailsSent: number;
  escalatedCount: number;
}> {
  console.log('⭐ [RESEÑAS POST-TOUR 5PM] Escaneando tours completados para solicitud de reseña...');
  const bookingsCol = getBookingsCollection();
  const summary = {
    success: true,
    eligibleBookings: 0,
    emailsSent: 0,
    escalatedCount: 0
  };

  if (!bookingsCol) return summary;

  try {
    const snapshot = await bookingsCol.get();
    const todayCR = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    const yesterdayCR = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });

    for (const doc of snapshot.docs) {
      const b = doc.data();
      const bookingId = b.bookingId || doc.id;
      const isConfirmed = b.status === 'confirmada' || b.paymentStatus === 'completed';
      const isCompletedDate = b.date === yesterdayCR || b.date === todayCR;
      const notSentYet = b.reviewRequestSent !== true;

      if (isConfirmed && isCompletedDate && notSentYet) {
        summary.eligibleBookings += 1;
        const customerEmail = b.customerEmail || b.customer?.email;
        const customerName = b.customerName || b.customer?.name || 'Viajero';
        const tourName = b.tourName || 'Tour en Costa Rica';
        const tourId = b.tourId || 'tour-general';

        // Link a formulario PROPIO de reseñas (no de terceros) con bookingId como parámetro
        const internalReviewUrl = `${APP_URL}/resenas?bookingId=${bookingId}&tourId=${tourId}`;

        if (customerEmail && customerEmail.includes('@')) {
          const emailResult = await sendEmail({
            to: customerEmail,
            subject: `🌟 ¿Cómo fue tu experiencia en ${tourName}? - Costa Rica Tours`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #064e3b; color: #ffffff; padding: 24px; text-align: center;">
                  <h2 style="margin: 0; font-size: 20px;">¡Esperamos que hayas vivido momentos mágicos! ✨</h2>
                  <p style="margin: 6px 0 0 0; font-size: 13px; color: #6ee7b7;">Tu opinión impulsa el turismo sostenible en Costa Rica</p>
                </div>
                <div style="padding: 24px;">
                  <p>Hola <strong>${customerName}</strong>,</p>
                  <p>Gracias por confiar en Costa Rica Tours para tu tour <strong>${tourName}</strong>.</p>
                  <p>Queremos asegurarnos de que cada detalle haya sido excepcional. ¿Nos regalarías 1 minuto para calificar a tu guía y compartir tus comentarios?</p>
                  
                  <div style="text-align: center; margin: 28px 0;">
                    <a href="${internalReviewUrl}" style="background-color: #f59e0b; color: #0c0a09; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                      ⭐ Dejar mi Reseña Oficial
                    </a>
                  </div>

                  <p style="font-size: 12px; color: #78716c; text-align: center;">
                    Al calificar recibirás un cupón de <strong>10% de descuento</strong> transferible para tus próximas vacaciones.
                  </p>
                </div>
              </div>
            `
          });

          if (emailResult.success) {
            await updateBookingStatus(bookingId, {
              reviewRequestSent: true,
              reviewRequestSentAt: new Date().toISOString()
            });
            summary.emailsSent += 1;
            console.log(`✅ [SOLICITUD RESEÑA] Email despachado a ${customerEmail} (Reserva: ${bookingId})`);
            continue;
          }
        }

        // Si falló el envío o no tiene correo -> Escalar por Telegram
        summary.escalatedCount += 1;
        await recordEscalation({
          type: 'REVIEW_REQUEST_FAILED',
          bookingId,
          reason: !customerEmail ? 'Cliente no tiene email registrado' : 'Fallo en servicio de correo',
          details: { customerName, customerEmail, tourName, reviewUrl: internalReviewUrl }
        });

        await sendTelegramEscalation({
          title: 'Solicitud de Reseña no Entregada',
          reason: 'No se pudo enviar el correo de reseña post-tour.',
          bookingId,
          customerName,
          customerEmail,
          customerPhone: b.customerPhone || b.customer?.phone,
          details: {
            Tour: tourName,
            LinkReseña: internalReviewUrl,
            Accion: 'Enviar link de reseña por WhatsApp al cliente.'
          }
        });
      }
    }
  } catch (err) {
    console.error('❌ Error en cron de reseñas post-tour:', err);
  }

  return summary;
}

// =========================================================================
// 7. RECORDATORIO 24H ANTES DEL TOUR (Trigger: Cron Diario 7:00 AM Costa Rica)
// =========================================================================
export async function executeTour24hReminders(): Promise<{
  success: boolean;
  tomorrowDate: string;
  totalRemindersSent: number;
  escalationsCount: number;
}> {
  console.log('⏰ [RECORDATORIO 24H - 7AM] Buscando tours programados para el día de mañana...');
  const bookingsCol = getBookingsCollection();

  // Calcular fecha de mañana en Costa Rica
  const tomorrowObj = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrowObj.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });

  const summary = {
    success: true,
    tomorrowDate: tomorrowStr,
    totalRemindersSent: 0,
    escalationsCount: 0
  };

  if (!bookingsCol) return summary;

  try {
    const snapshot = await bookingsCol.where('date', '==', tomorrowStr).get();

    for (const doc of snapshot.docs) {
      const b = doc.data();
      const bookingId = b.bookingId || doc.id;
      const isConfirmed = b.status === 'confirmada' || b.paymentStatus === 'completed';
      const notRemindedYet = b.reminderSent !== true;

      if (isConfirmed && notRemindedYet) {
        const customerEmail = b.customerEmail || b.customer?.email;
        const customerName = b.customerName || b.customer?.name || 'Estimado Viajero';
        const tourName = b.tourName || 'Tour Oficial';
        const tourTime = b.time || '08:00 AM';
        const pickupHotel = b.pickupHotel || 'Recepción de su Hotel';
        const voucherUrl = b.voucherUrl || `${APP_URL}?voucher=${bookingId}`;

        if (customerEmail && customerEmail.includes('@')) {
          const emailResult = await sendEmail({
            to: customerEmail,
            subject: `⏰ Recordatorio 24h: Mañana es tu tour "${tourName}" (${tourTime})`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #064e3b; color: #ffffff; padding: 24px; text-align: center;">
                  <h2 style="margin: 0; font-size: 20px;">¡Tu aventura comienza mañana! 🇨🇷</h2>
                  <p style="margin: 6px 0 0 0; font-size: 13px; color: #6ee7b7;">Recordatorio Importante de Salida</p>
                </div>
                <div style="padding: 24px;">
                  <p>Hola <strong>${customerName}</strong>,</p>
                  <p>Te recordamos los detalles clave de tu tour de mañana <strong>${tomorrowStr}</strong>:</p>
                  
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 4px 0;">📍 <strong>Tour:</strong> ${tourName}</p>
                    <p style="margin: 4px 0;">⏰ <strong>Hora de Salida / Pick-up:</strong> ${tourTime}</p>
                    <p style="margin: 4px 0;">🏨 <strong>Punto de Encuentro:</strong> ${pickupHotel}</p>
                    <p style="margin: 4px 0;">🎫 <strong>Voucher:</strong> <code>${bookingId}</code></p>
                  </div>

                  <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 4px 0; font-size: 13px; color: #065f46;">💡 Recomendación Operativa:</h4>
                    <p style="margin: 0; font-size: 12px; color: #047857;">
                      Por favor estar en el lobby 10 minutos antes de la hora acordada. El transporte oficial porta distintivo de <strong>Costa Rica Tours / Alsama Tours CR</strong>.
                    </p>
                  </div>

                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${voucherUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
                      Ver Voucher Digital Completo
                    </a>
                  </div>

                  <p style="font-size: 12px; color: #64748b; text-align: center;">
                    ¿Algún cambio de última hora? Escríbenos directamente a WhatsApp: +506 8795-9148.
                  </p>
                </div>
              </div>
            `
          });

          if (emailResult.success) {
            await updateBookingStatus(bookingId, {
              reminderSent: true,
              reminderSentAt: new Date().toISOString()
            });
            summary.totalRemindersSent += 1;
            console.log(`✅ [RECORDATORIO 24H] Despachado a ${customerEmail} (Reserva: ${bookingId})`);
            continue;
          }
        }

        // Si falló o no tiene email -> Escalar por Telegram
        summary.escalationsCount += 1;
        await recordEscalation({
          type: 'REMINDER_24H_FAILED',
          bookingId,
          reason: !customerEmail ? 'Cliente no tiene correo registrado' : 'Fallo al enviar correo de recordatorio',
          details: { customerName, customerEmail, tourName, tourTime, pickupHotel, tomorrowStr }
        });

        await sendTelegramEscalation({
          title: 'Fallo al Enviar Recordatorio 24h',
          reason: 'No se pudo contactar al cliente por correo para el recordatorio de mañana.',
          bookingId,
          customerName,
          customerEmail,
          customerPhone: b.customerPhone || b.customer?.phone,
          details: {
            Tour: tourName,
            FechaTour: tomorrowStr,
            Hora: tourTime,
            Lugar: pickupHotel,
            Accion: 'Enviar recordatorio por WhatsApp de inmediato.'
          }
        });
      }
    }
  } catch (err) {
    console.error('❌ Error en cron de recordatorio 24h:', err);
  }

  return summary;
}
