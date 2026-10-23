/**
 * Reservas, documentos, SLA y calendario.
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import express from 'express';
import crypto from 'crypto';
import { google } from 'googleapis';
import { requireOperator, resolveOperatorAccess, verifyFirebaseUser } from '../authMiddleware';
import { verifyBookingDocumentToken } from '../signedAccessTokens';
import { createBooking, getBookingById, getAllBookings, updateBookingStatus } from '../bookingService';
import { generateBookingPrintableHTML } from '../pdfService';
import { buildVoucherContent, generateVoucherPdf, voucherEligibility } from '../bookingVoucherService';
import { massiveEngine } from '../massiveProcessingEngine';
import { createAlert } from '../alertService';
import { executeCustomerProformaConfirmation } from '../nativeWorkflows';
import { emitOperationalEvent } from '../operationalEventBus';
import { createRouter, requireAdmin, bookingAdmission } from './shared';
import { captureLeadInBackground } from '../leadPipeline';
import { TOURS } from '../../src/data/toursData';

/** Solicitud de reserva (creada pendiente o rechazada por falta de operador verificado) → lead. */
function captureBookingLead(body: any, result: any) {
  const tourId = String(body?.tourId || '').slice(0, 120);
  const tour = TOURS.find(t => t.id === tourId);
  const adults = Number(body?.adults) || 0;
  const children = Number(body?.children) || 0;
  const people = adults + children;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.date || '')) ? String(body.date) : undefined;
  const customer = body?.customer && typeof body.customer === 'object' ? body.customer : {};
  captureLeadInBackground({
    source: 'booking_request',
    language: body?.language,
    request: {
      tourId: tour?.id || (tourId || undefined),
      tourTitle: tour ? tour.title.es : (typeof body?.tourName === 'string' ? body.tourName.slice(0, 160) : undefined),
      region: tour?.region,
      people: people > 0 ? people : undefined,
      adults: adults || undefined,
      children: children || undefined,
      date,
      month: date ? Number(date.slice(5, 7)) : undefined,
    },
    referenceQuote: tour && tour.priceUSD > 0 && people > 0
      ? { unitPriceUSD: tour.priceUSD, totalUSD: tour.priceUSD * people, line: `US$${tour.priceUSD} × ${people} = US$${tour.priceUSD * people} (referencia, sujeto a confirmación)`, subjectToConfirmation: true }
      : undefined,
    bookingId: result?.booking?.bookingId,
    bookingOutcome: result?.conflict ? String(result?.error || 'conflict') : String(result?.booking?.status || 'created'),
    consent: body?.consent === true || body?.privacyConsent === true,
    contact: {
      name: customer.fullName || customer.name || body?.customerName,
      email: customer.email || body?.customerEmail,
      phone: customer.phone || body?.customerPhone,
    },
    message: typeof body?.specialRequests === 'string' ? body.specialRequests : undefined,
  });
}

/** SLA interno y sincronización de calendario. */
export const slaCalendarRouter = createRouter();

// ==========================================
// ⚡ ENDPOINT INTERNO: BARRIDO SLA AUTÓNOMO
// ==========================================
/**
 * Endpoint para disparar el barrido de SLAs pendientes.
 * NOTA: Este endpoint debe ser invocado periódicamente por un job externo
 * como Google Cloud Scheduler cada 5-15 minutos.
 *
 * Configuración en Cloud Scheduler:
 * 1. Frecuencia: * /10 * * * *
 * 2. URL: https://[tu-dominio]/api/internal/sweep-sla
 * 3. Método: POST
 * 4. Auth: Headers: { "X-Operator-Key": "[TuClaveSecreta]" }
 */
slaCalendarRouter.post('/api/internal/sweep-sla', async (req, res) => {
  const operatorKey = req.headers['x-operator-key'];
  const secret = process.env.OPERATOR_API_KEY;

  if (!secret || !operatorKey) return res.status(401).json({ error: 'No autorizado' });
  const provided = Buffer.from(String(operatorKey));
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return res.status(401).json({ error: 'No autorizado' });

  try {
    const escalatedCount = await massiveEngine.providerLifecycle.sweepPendingSlas();
    res.json({ success: true, escalatedCount });
  } catch (err: any) {
    console.error('Error en barrido de SLA manual:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 📅 INTEGRACIÓN GOOGLE CALENDAR
// ==========================================

slaCalendarRouter.post('/api/calendar/sync', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token Bearer requerido' });
    }
    const token = authHeader.split(' ')[1];
    const { booking } = req.body;
    if (!booking) {
      return res.status(400).json({ error: 'Datos de reserva requeridos' });
    }

    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const startDate = new Date(`${booking.date}T08:00:00Z`);
    if (isNaN(startDate.getTime())) {
      startDate.setTime(Date.now() + 86400000);
    }
    const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000);

    const event = {
      summary: `Reserva Confirmada: ${booking.tourName}`,
      location: booking.pickupHotel || 'Costa Rica',
      description: `
        ID Reserva: ${booking.bookingId}
        Cliente: ${booking.customer?.name || booking.customerName || 'No especificado'}
        Email: ${booking.customer?.email || booking.customerEmail || 'No especificado'}
        Pasajeros: ${(booking.adults || 0) + (booking.children || 0)}
        Método de Pago: ${booking.paymentMethod}
      `,
      start: { dateTime: startDate.toISOString(), timeZone: 'America/Costa_Rica' },
      end: { dateTime: endDate.toISOString(), timeZone: 'America/Costa_Rica' }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    });
    res.json({ success: true, eventLink: response.data.htmlLink });
  } catch (error: any) {
    console.error('Error sincronizando calendario:', error);
    res.status(500).json({ error: error.message || 'Fallo al sincronizar con Google Calendar' });
  }
});

/** Reservas, PDFs, proformas y alertas. */
export const bookingsRouter = createRouter();

// Crear reserva (con verificación server-side de pago, cupos en Firestore y automatización nativa)
bookingsRouter.post('/api/bookings', bookingAdmission.middleware, async (req, res) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'];
    const result = await createBooking({ ...req.body, idempotencyKey });
    // Toda solicitud (pendiente de pago o pendiente de operador) entra al pipeline de leads.
    if (!(result as any)?.booking || (result as any).booking.status !== 'paid') captureBookingLead(req.body, result);
    if (!result.conflict) {
      void emitOperationalEvent({
        type: 'booking.created',
        source: 'booking_api',
        conversationId: result.booking?.bookingId || idempotencyKey || 'booking',
        payload: {
          bookingId: result.booking?.bookingId,
          tourId: result.booking?.tourId,
          date: result.booking?.date,
          status: result.booking?.status,
          paymentStatus: result.booking?.paymentStatus
        }
      }).catch(err => console.error('Event bus booking.created:', err));
    }

    if (result.conflict) {
      return res.status(409).json(result);
    }

    res.status(201).json({ success: true, booking: result.booking });
  } catch (err: any) {
    console.error('Error al procesar reserva:', err);
    res.status(500).json({ error: err.message || 'Error interno al crear la reserva' });
  }
});

// Listar todas las reservas (desde Firestore) - Protegido con requireOperator
bookingsRouter.get('/api/bookings', requireOperator, async (req, res) => {
  try {
    const bookings = await getAllBookings();
    res.json({ success: true, bookings, data: bookings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar una reserva - Protegido con requireOperator
// Only operational fields are editable here. Price, payment state, customer
// identity and provider evidence (providerStatus/providerConfirmedAt gate
// payment creation) change only through their verified workflows.
const BOOKING_PATCH_ALLOWED_FIELDS = new Set([
  'status', 'date', 'time', 'pickupHotel', 'specialRequests', 'cancellationReason',
  'assignedGuide', 'assignedVehicle', 'voucherUrl', 'voucherCode', 'adminNotes',
  'notasOperador', 'estadoOperativo', 'operadorAsignado', 'horaRecogidaEstimada'
]);

bookingsRouter.patch('/api/bookings/:id', requireOperator, async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const rejected = Object.keys(body).filter(key => !BOOKING_PATCH_ALLOWED_FIELDS.has(key));
    if (rejected.length) {
      return res.status(400).json({ success: false, error: 'fields_not_editable', fields: rejected });
    }
    const updates = Object.fromEntries(Object.entries(body).filter(([key]) => BOOKING_PATCH_ALLOWED_FIELDS.has(key)));
    if (!Object.keys(updates).length) return res.status(400).json({ success: false, error: 'no_editable_fields' });
    const result = await updateBookingStatus(req.params.id, updates);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Booking documents are private: the caller must be operations/admin, the
 * signed-in traveler whose verified e-mail matches the booking, or hold the
 * signed link (?token=) that was e-mailed for exactly this booking.
 */
async function loadAuthorizedBookingDocument(req: express.Request, res: express.Response): Promise<any | null> {
  const bookingId = String(req.params.id || '').trim();
  if (!bookingId || bookingId.length > 120) {
    res.status(400).json({ error: 'ID de reserva inválido' });
    return null;
  }
  const signedLink = verifyBookingDocumentToken(bookingId, req.query.token);
  let authorized = signedLink;
  let travelerEmail = '';
  if (!authorized) {
    const operator = await resolveOperatorAccess(req);
    authorized = operator.ok;
    if (!authorized) {
      const user = await verifyFirebaseUser(req);
      if (user?.email && user.email_verified === true) travelerEmail = String(user.email).trim().toLowerCase();
    }
  }
  if (!authorized && !travelerEmail) {
    res.status(401).json({ error: 'No autorizado' });
    return null;
  }
  const booking = await getBookingById(bookingId);
  if (!booking) {
    res.status(404).json({ error: 'Reserva no encontrada' });
    return null;
  }
  if (!authorized) {
    const bookingEmail = String(booking.customer?.email || booking.customerEmail || '').trim().toLowerCase();
    if (!bookingEmail || bookingEmail !== travelerEmail) {
      // Same answer as a missing booking: never confirm that an id exists.
      res.status(404).json({ error: 'Reserva no encontrada' });
      return null;
    }
  }
  return booking;
}

// Generar e imprimir Vale / Itinerario Web de Reserva
bookingsRouter.get('/api/bookings/:id/pdf', async (req, res) => {
  try {
    const booking = await loadAuthorizedBookingDocument(req, res);
    if (!booking) return;
    const html = generateBookingPrintableHTML(booking as any);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(html);
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudo generar el documento' });
  }
});

// Descarga directa binaria del Vale e Itinerario en PDF
bookingsRouter.get('/api/bookings/:id/download-pdf', async (req, res) => {
  try {
    const booking = await loadAuthorizedBookingDocument(req, res);
    if (!booking) return;
    const bookingId = String(booking.bookingId || booking.id).replace(/[^A-Za-z0-9_-]/g, '');
    // #391: voucher solo con pago verificado por el servidor.
    const content = buildVoucherContent(booking);
    if (!content) {
      const elig = voucherEligibility(booking);
      res.status(409).json({ error: 'El comprobante está disponible cuando la reserva está pagada y verificada.', code: elig.ok ? 'no_disponible' : elig.reason });
      return;
    }
    const pdfBuffer = await generateVoucherPdf(content);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CostaRicaTours-Voucher-${bookingId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudo generar el documento' });
  }
});

// Despacho de Proforma e Itinerario con Notificación Email (PDF Adjunto) y WhatsApp
bookingsRouter.post(['/api/proformas/send-confirmation', '/api/bookings/send-proforma-confirmation'], requireAdmin, async (req, res) => {
  try {
    const result = await executeCustomerProformaConfirmation(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('Error al despachar proforma de confirmación:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Retired: a GET link is never allowed to change payment, cancellation or
// provider state. Customer decisions now go through the signed workflow.
bookingsRouter.all('/api/bookings/:id/customer-confirm', (_req, res) => {
  res.status(410).json({
    error: 'El enlace legado fue retirado. Abrir un enlace no confirma pagos ni modifica reservas.'
  });
});

// 🚨 SISTEMA PROPIO DE ALERTAS ADMINISTRATIVAS
// ==========================================

bookingsRouter.post('/api/alerts', requireAdmin, async (req, res) => {
  const { source, severity, title, message, bookingId, providerId, metadata } = req.body || {};
  if (!source || !severity || !title || !message) {
    return res.status(400).json({ error: 'source, severity, title y message son requeridos.' });
  }
  try {
    const result = await createAlert({ source, severity, title, message, bookingId, providerId, metadata });
    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
