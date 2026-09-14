// Clean tsx injected relative __dirname which breaks module resolution in vite plugins
if (typeof (globalThis as any).__dirname !== 'undefined' && (globalThis as any).__dirname === '.') {
  delete (globalThis as any).__dirname;
}
if (typeof (global as any).__dirname !== 'undefined' && (global as any).__dirname === '.') {
  delete (global as any).__dirname;
}

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { initializeAutomationEngine, cleanupExpiredSoftHolds } from './backend/cronEngine';
import { google } from 'googleapis';
import { dispatchToN8N, getN8NConfig, verifyN8NRequest } from './backend/n8nService';
import { requireOperator } from './backend/authMiddleware';
import { TOURS } from './src/data/toursData';
import {
  getStripe,
  createBooking,
  getAllBookings,
  updateBookingStatus,
  checkTourAvailability,
  getWeeklyConversionMetrics
} from './backend/bookingService';
import {
  processChatInquiry,
  runTriage,
  runProcessor,
  runContingency,
  runSupervisor,
  logException
} from './backend/aiAssistantService';
import {
  generateClaudeChatResponse,
  generateClaudeItinerary,
  analyzeOperationalRiskWithClaude,
  getClaudeStatus
} from './backend/claudeService';
import {
  executeChatInquiry,
  executeInicioReserva,
  executeSolicitudPago,
  executeConfirmacionReserva,
  executeSolicitudItinerario,
  executeSolicitudSoporte,
  executeNotificarProveedor,
  executeEvaluarAntifraude,
  executeTelegramOpsAction,
  executeSyncCalendar,
  executePostTourNPS,
  executeReporteSemanalConversion,
  executeParquesSinac,
  executeAlertaVuelo,
  executeCancelacionReembolso,
  executeContingencyNative,
  executeSupervisorNative,
  executeGenericAutomation,
  executeAutonomousMultiDayPlanner,
  executeDynamicPricingYieldOptimizer,
  executeEmergencyContingencyRerouting,
  executeDGTElectronicInvoicingSettlement,
  executeAutonomousFlightGuardDispatch,
  executeAutonomousCrisisSentimentEscalation,
  executeAutonomousFullBookingLifecycle,
  getNativeEngineStatus,
  getNativeAutomationLogs,
  logAutomationExecution
} from './backend/nativeAutomationEngine';
import {
  executeProviderRealtimeCoordination,
  executeCustomerBookingConfirmation,
  executeAutomatedProviderPayouts,
  executeSurveillanceAndEscalation,
  executeDailyOperationReport,
  executePostTourReviewRequests,
  executeTour24hReminders
} from './backend/nativeWorkflows';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);
app.use(express.json());

// ==========================================
// 🛡️ RATE LIMITING MIDDLEWARES
// ==========================================
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de pago desde esta IP. Por favor intente más tarde.' }
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite de solicitudes de chat excedido. Por favor espere un momento.' }
});

const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Por favor intente más tarde.' }
});

app.use('/api/', generalApiLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: 'Costa Rica Tours Native Automation Server',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 💳 PASARELAS DE PAGO (STRIPE & PAYPAL)
// ==========================================

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { tourName, totalUSD, customerEmail } = req.body;
    const stripe = getStripe();
    if (!stripe) {
      if (process.env.NODE_ENV === 'production') {
        console.error('🔴 STRIPE_SECRET_KEY no configurada en PRODUCCIÓN. Se rechaza el pago.');
        return res.status(503).json({ error: 'Pagos no disponibles temporalmente. Contacta a soporte.' });
      }
      console.warn('⚠️ STRIPE_SECRET_KEY no configurada (modo desarrollo). Simulando enlace de pago.');
      return res.json({ url: `${req.protocol}://${req.get('host')}?booking=success` });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: tourName || 'Tour Costa Rica Tours' },
            unit_amount: Math.round(Number(totalUSD || 0) * 100)
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}?booking=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}?booking=canceled`,
      customer_email: customerEmail
    });
    res.json({ url: session.url, id: session.id });
  } catch (err: any) {
    console.error('Error en Stripe:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { totalUSD, tourName } = req.body;
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = process.env.PAYPAL_SECRET;
    const paypalMode = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl =
      paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    if (!paypalClientId || !paypalSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('🔴 PAYPAL_CLIENT_ID/SECRET no configurados en PRODUCCIÓN. Se rechaza el pago.');
        return res.status(503).json({ error: 'Pagos no disponibles temporalmente. Contacta a soporte.' });
      }
      console.warn('⚠️ PAYPAL_CLIENT_ID o PAYPAL_SECRET no configurados (modo desarrollo). Simulando pago.');
      return res.json({
        url: `${req.protocol}://${req.get('host')}?booking=success`,
        id: 'mock_paypal_id'
      });
    }

    const authStr = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');
    const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${authStr}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const authData = await authRes.json();

    if (authData.access_token) {
      const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: { currency_code: 'USD', value: (totalUSD || 0).toString() },
              description: tourName || 'Tour Costa Rica Tours'
            }
          ],
          application_context: {
            return_url: `${req.protocol}://${req.get('host')}?booking=success`,
            cancel_url: `${req.protocol}://${req.get('host')}?booking=canceled`
          }
        })
      });
      const orderData = await orderRes.json();
      const approveLink = orderData.links?.find((link: any) => link.rel === 'approve')?.href;
      res.json({
        url: approveLink || `${req.protocol}://${req.get('host')}?booking=success`,
        id: orderData.id
      });
    } else {
      res.status(401).json({ error: 'Fallo al autenticar con PayPal' });
    }
  } catch (err: any) {
    console.error('Error en PayPal:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 📅 INTEGRACIÓN GOOGLE CALENDAR
// ==========================================

app.post('/api/calendar/sync', async (req, res) => {
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

// ==========================================
// 📦 SISTEMA DE RESERVAS Y DISPONIBILIDAD (FIRESTORE)
// ==========================================

// Consulta de disponibilidad de cupos por tour
app.get('/api/tours/:id/availability', async (req, res) => {
  try {
    const { date, time, seats } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'El parámetro "date" es requerido.' });
    }

    const result = await checkTourAvailability(
      req.params.id,
      String(date),
      time ? String(time) : undefined,
      seats ? Number(seats) : 1
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Tipo de cambio oficial Costa Rica (BCCR / Fallback)
app.get('/api/currency/exchange-rate', (req, res) => {
  res.json({
    usdToCrc: 515.0,
    crcToUsd: 1 / 515.0,
    currency: 'CRC',
    updatedAt: new Date().toISOString()
  });
});

// Verificación y conciliación de comprobantes SINPE Móvil
app.post('/api/sinpe/verify', requireOperator, async (req, res) => {
  try {
    const { bookingId, sinpeReference, customerPhone, amount } = req.body;
    if (!bookingId || !sinpeReference) {
      return res.status(400).json({ error: 'bookingId y sinpeReference son requeridos' });
    }

    // Actualizar estado en Firestore / memoria con estado pendiente de aprobación humana
    const updateResult = await updateBookingStatus(bookingId, {
      sinpeReference,
      status: 'pendiente_pago',
      paymentStatus: 'pending',
      paymentVerifiedAt: new Date().toISOString(),
      verificationMethod: 'sinpe_movil_manual'
    });

    if (!updateResult.success) {
      return res.status(404).json(updateResult);
    }

    // Responder inmediatamente con status 200
    res.json({
      success: true,
      message: 'Comprobante SINPE Móvil registrado. En espera de verificación final por operador.',
      bookingId,
      booking: updateResult.booking
    });

    // Notificar al webhook de n8n en segundo plano
    const n8nSinpeUrl =
      process.env.N8N_SINPE_WEBHOOK_URL ||
      `${getN8NConfig().baseUrl}/webhook/cr-tours-sinpe-verify`;

    dispatchToN8N(n8nSinpeUrl, {
      trigger: 'VERIFICACION_SINPE',
      event: 'sinpe.pending_verification',
      bookingId,
      sinpeReference,
      customerPhone:
        customerPhone ||
        updateResult.booking?.customerPhone ||
        updateResult.booking?.customer?.phone,
      amount,
      timestamp: new Date().toISOString()
    }).catch((err) => {
      console.warn('Fallo silencioso al notificar n8n (sinpe verify):', err);
    });
  } catch (err: any) {
    console.error('Error al verificar SINPE:', err);
    res.status(500).json({ error: err.message || 'Error al verificar comprobante' });
  }
});

// Crear reserva (con verificación server-side de pago, cupos en Firestore y notificación a n8n)
app.post('/api/bookings', async (req, res) => {
  try {
    const result = await createBooking(req.body);

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
app.get('/api/bookings', requireOperator, async (req, res) => {
  try {
    const bookings = await getAllBookings();
    res.json({ success: true, bookings, data: bookings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar una reserva - Protegido con requireOperator
app.patch('/api/bookings/:id', requireOperator, async (req, res) => {
  try {
    const result = await updateBookingStatus(req.params.id, req.body);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ⚡ MOTOR DE AUTOMATIZACIÓN 100% EN CÓDIGO NATIVO
// ==========================================
// Ejecución directa en Node.js/Express y Firestore con 0ms de latencia externa,
// eliminando por completo la dependencia de servidores intermediarios como n8n.

// Estado y monitoreo del motor nativo
app.get(['/api/native-engine/status', '/api/native/status'], (req, res) => {
  res.json(getNativeEngineStatus());
});

app.get(['/api/native-engine/logs', '/api/native/logs'], (req, res) => {
  const limit = Number(req.query.limit) || 50;
  res.json(getNativeAutomationLogs(limit));
});

// Despachadores manuales / UI de los 7 Workflows Nativos
app.post('/api/native/workflows/payouts', async (req, res) => {
  try {
    const result = await executeAutomatedProviderPayouts();
    logAutomationExecution('WF_PAGOS_PROVEEDORES', 3, 'success', `Manual: ${result.totalProcessed} procesadas, $${result.totalPaidUSD} USD.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_PAGOS_PROVEEDORES', 3, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/reminders', async (req, res) => {
  try {
    const result = await executeTour24hReminders();
    logAutomationExecution('WF_RECORDATORIOS_24H', 7, 'success', `Manual: ${result.totalRemindersSent} recordatorios.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_RECORDATORIOS_24H', 7, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/surveillance', async (req, res) => {
  try {
    const result = await executeSurveillanceAndEscalation();
    logAutomationExecution('WF_VIGILANCIA_2H', 4, 'success', `Manual: ${result.checkedBookings} auditadas, ${result.alertsSent} alertas.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_VIGILANCIA_2H', 4, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/reviews', async (req, res) => {
  try {
    const result = await executePostTourReviewRequests();
    logAutomationExecution('WF_RESENAS_POST_TOUR', 6, 'success', `Manual: ${result.emailsSent} encuestas enviadas.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_RESENAS_POST_TOUR', 6, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/daily-report', async (req, res) => {
  try {
    const result = await executeDailyOperationReport();
    logAutomationExecution('WF_REPORTE_DIARIO', 5, 'success', `Manual: ${result.totalBookingsToday} reservas, $${result.revenueUSD} USD.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_REPORTE_DIARIO', 5, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/cleanup-holds', async (req, res) => {
  try {
    const result = await cleanupExpiredSoftHolds();
    logAutomationExecution('AUTO_RELEASE_HOLD', 5, 'success', `Manual: ${result.releasedCount} cupos liberados.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('AUTO_RELEASE_HOLD', 5, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/conversion-report', async (req, res) => {
  try {
    const metrics = await getWeeklyConversionMetrics();
    logAutomationExecution('CRON_SEMANAL_CONVERSION', 5, 'success', `Manual: Tasa conv: ${metrics.conversionRate}%, Ventas: $${metrics.totalRevenueUSD}.`);
    res.json({ success: true, metrics });
  } catch (err: any) {
    logAutomationExecution('CRON_SEMANAL_CONVERSION', 5, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🚀 PIPELINE 100% AUTÓNOMO (Sin intervención manual humana)
// Procesa la consulta -> Bloquea cupo -> Crea reserva -> Notifica al proveedor -> Envía voucher digital QR al cliente
app.post(['/api/native/autonomous-booking-flow', '/api/native/flujo-autonomo'], async (req, res) => {
  try {
    const result = await executeAutonomousFullBookingLifecycle(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Asistente Inteligente & Chat Oficial (Gemini 2.5 Flash + Base Oficial)
app.post(['/webhook/chat-consulta', '/api/chat', '/api/chat-consulta'], async (req, res) => {
  try {
    const result = await executeChatInquiry(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 2. Inicio de Reserva & Soft-Hold en Firestore (15 minutos)
app.post(['/webhook/inicio-reserva', '/api/reservas/inicio'], async (req, res) => {
  try {
    const result = await executeInicioReserva(req.body);
    if (!result.exito && !result.disponible) {
      return res.status(409).json(result);
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 3. Solicitud de Pago & Conciliación Criptográfica HMAC
app.post(['/webhook/solicitud-pago', '/api/pagos/solicitud'], async (req, res) => {
  try {
    const result = await executeSolicitudPago(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 4. Confirmación de Reserva, Voucher Digital QR & Notificaciones Multicanal
app.post(['/webhook/confirmacion-reserva', '/webhook/reserva-confirmada', '/api/reservas/confirmar'], async (req, res) => {
  try {
    const result = await executeConfirmacionReserva(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 5. Planificador de Rutas & Itinerarios IA Personalizados
app.post(['/webhook/solicitud-itinerario', '/api/itinerario'], async (req, res) => {
  try {
    const result = await executeSolicitudItinerario(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 6. Analítica en Tiempo Real
app.post('/webhook/evento-analitica', async (req, res) => {
  res.json({ exito: true, timestamp: new Date().toISOString() });
});

// 7. Soporte al Cliente, Escalación Multicanal & Concierge Urgente
app.post(['/webhook/solicitud-soporte', '/api/soporte/crear-ticket'], async (req, res) => {
  try {
    const result = await executeSolicitudSoporte(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 8. Coordinación y Notificación en Tiempo Real a Proveedores y Operadores Locales
app.post(['/webhook/notificar-proveedor', '/api/operadores/notificar'], async (req, res) => {
  try {
    const result = await executeNotificarProveedor(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 9. Motor Antifraude y Matriz de Riesgo Criptográfica
app.post(['/webhook/evaluar-antifraude', '/webhook/antifraude-evaluacion', '/api/seguridad/antifraude'], async (req, res) => {
  try {
    const result = await executeEvaluarAntifraude(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 10. Operaciones de Terreno, Telegram Ops & Despacho a Guías
app.post(['/webhook/panel-control-telegram', '/webhook/telegram-ops-action', '/api/ops/telegram-action'], async (req, res) => {
  try {
    const result = await executeTelegramOpsAction(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 11. Despacho Multicanal (WhatsApp + Email + Telegram)
app.post('/webhook/reserva-multicanal', async (req, res) => {
  try {
    const result = await executeConfirmacionReserva(req.body);
    res.json({ exito: true, mensaje: 'Despacho multicanal ejecutado en código nativo', ...result });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 12. Sincronización Automática con Google Calendar
app.post(['/webhook/sync-calendar', '/api/calendario/sincronizar'], async (req, res) => {
  try {
    const result = await executeSyncCalendar(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 13. Encuesta de Satisfacción Post-Tour & Recolección NPS WhatsApp
app.post(['/webhook/post-tour-nps', '/api/nps/despachar'], async (req, res) => {
  try {
    const result = await executePostTourNPS(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 14. Reporte Semanal de Rendimiento, Conversión y Volumen
app.post(['/webhook/reporte-semanal-conversion', '/api/reportes/semanal'], async (req, res) => {
  try {
    const result = await executeReporteSemanalConversion();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// ==========================================
// 🚀 WORKFLOWS COMPLEJOS Y SÚPER AVANZADOS (WF-COMPLEX-01 a 06 EN CÓDIGO NATIVO)
// ==========================================

// WF-COMPLEX-01: Orquestador Autónomo de Itinerarios Multidía (SINAC/IMN/Alsama)
app.post(['/webhook/autonomous-multi-day-planner', '/api/automations/multi-day-planner'], async (req, res) => {
  try {
    const result = await executeAutonomousMultiDayPlanner(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// WF-COMPLEX-02: Motor Predictivo de Dynamic Pricing & Yield Management
app.post(['/webhook/predictive-dynamic-pricing', '/api/automations/dynamic-pricing'], async (req, res) => {
  try {
    const result = await executeDynamicPricingYieldOptimizer(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// WF-COMPLEX-03: Matriz Predictiva de Contingencias Climáticas & Re-enrutamiento
app.post(['/webhook/weather-contingency-rerouting', '/api/automations/weather-contingency'], async (req, res) => {
  try {
    const result = await executeEmergencyContingencyRerouting(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// WF-COMPLEX-04: Facturación Electrónica DGT Hacienda v4.3 & Liquidación Operadores
app.post(['/webhook/dgt-electronic-invoicing-settlement', '/api/automations/dgt-invoicing'], async (req, res) => {
  try {
    const result = await executeDGTElectronicInvoicingSettlement(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// WF-COMPLEX-05: Flight Guard Predictivo en Tiempo Real & Despacho Alsama
app.post(['/webhook/flight-guard-autonomous-dispatch', '/api/automations/flight-guard'], async (req, res) => {
  try {
    const result = await executeAutonomousFlightGuardDispatch(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// WF-COMPLEX-06: Asistente Autónomo con Análisis de Sentimiento & Escalamiento
app.post(['/webhook/crisis-sentiment-escalation', '/api/automations/crisis-sentiment'], async (req, res) => {
  try {
    const result = await executeAutonomousCrisisSentimentEscalation(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// ==========================================
// 🚀 RUTAS ADICIONALES (WF-14 a WF-24 EJECUTADAS EN CÓDIGO NATIVO)
// ==========================================
const additionalWebhooks = [
  '/webhook/reserva-parques-sinac',
  '/webhook/alerta-vuelo-retrasado',
  '/webhook/reporte-objeto-olvidado',
  '/webhook/whatsapp-traductor-soporte',
  '/webhook/recepcion-vip-aeropuerto',
  '/webhook/alerta-requerimientos-especiales',
  '/webhook/cancelacion-reembolso-inteligente',
  '/webhook/entrega-fotos-recuerdos',
  '/webhook/sincronizacion-operadores-locales',
  '/webhook/alerta-emergencia-sos',
  '/webhook/booster-reseñas-incentivos',
  '/webhook/contingency',
  '/webhook/supervisor'
];

app.post(additionalWebhooks, async (req, res) => {
  try {
    const endpoint = req.path;
    const triggerName = endpoint.replace('/webhook/', '').toUpperCase().replace(/-/g, '_');
    const result = await executeGenericAutomation(triggerName, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// ==========================================
// 🌿 LOS 7 WORKFLOWS NATIVOS DE NEGOCIO MIGRADOS
// ==========================================

// 1. Coordinación en Tiempo Real con Proveedores (Webhook)
app.post(['/webhook/proveedores-coordinacion', '/webhook/coordinacion-proveedores', '/api/webhooks/provider-coordination'], async (req, res) => {
  try {
    const authHeader = req.headers['x-webhook-secret'] as string;
    const result = await executeProviderRealtimeCoordination(req.body, authHeader);
    res.json(result);
  } catch (error: any) {
    const status = error.message.includes('No autorizado') ? 401 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// 2. Confirmación de Reserva al Cliente (Webhook)
app.post(['/webhook/cliente-confirmacion', '/webhook/confirmacion-cliente', '/api/webhooks/customer-confirmation'], async (req, res) => {
  try {
    const authHeader = req.headers['x-webhook-secret'] as string;
    const result = await executeCustomerBookingConfirmation(req.body, authHeader);
    res.json(result);
  } catch (error: any) {
    const status = error.message.includes('No autorizado') ? 401 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// 3. Pagos Automáticos a Proveedores (Batch / Cron Trigger)
app.post(['/api/payouts/run-batch', '/webhook/pagos-proveedores-batch'], async (req, res) => {
  try {
    const result = await executeAutomatedProviderPayouts();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Vigilancia y Escalamiento de Reservas Pendientes (Cron Trigger)
app.post(['/api/surveillance/run-check', '/webhook/vigilancia-reservas'], async (req, res) => {
  try {
    const result = await executeSurveillanceAndEscalation();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Reporte Diario de Operación (Cron Trigger)
app.post(['/api/reports/run-daily-ops', '/webhook/reporte-diario-operacion'], async (req, res) => {
  try {
    const result = await executeDailyOperationReport();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Solicitud de Reseña Post-Tour (Cron Trigger)
app.post(['/api/reviews/run-request-batch', '/webhook/solicitud-resenas'], async (req, res) => {
  try {
    const result = await executePostTourReviewRequests();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Recordatorio 24h Antes del Tour (Cron Trigger)
app.post(['/api/reminders/run-24h', '/webhook/recordatorio-24h'], async (req, res) => {
  try {
    const result = await executeTour24hReminders();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check para compatibilidad
app.all('/webhook/health-check', (req, res) => {
  res.json({ status: 'ok', service: 'costa-rica-tours-native-engine', timestamp: new Date().toISOString() });
});

// ==========================================
// 📥 WEBHOOKS ENTRANTES DESDE N8N (CALLBACKS)
// ==========================================

// Endpoint para que n8n actualice una reserva en Firestore
app.post('/api/webhooks/n8n/update-booking', async (req, res) => {
  if (!verifyN8NRequest(req.headers)) {
    return res.status(401).json({ error: 'Credenciales de n8n inválidas' });
  }

  const { bookingId, status, paymentStatus, notes, voucherUrl, operatorAssigned } = req.body;
  if (!bookingId) {
    return res.status(400).json({ error: 'Se requiere "bookingId"' });
  }

  const result = await updateBookingStatus(bookingId, {
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(notes ? { notes } : {}),
    ...(voucherUrl ? { voucherUrl } : {}),
    ...(operatorAssigned ? { operatorAssigned } : {}),
    n8nLastUpdated: new Date().toISOString()
  });

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json({ success: true, message: 'Reserva actualizada desde n8n', booking: result.booking });
});

// Callback de verificación de pago de reserva
// ⚠️ Este endpoint marca una reserva como PAGADA en Firestore. Sin esta
// verificación, cualquiera en internet podría marcar cualquier reserva
// como pagada sin pagar un centavo. Se exige el mismo secreto compartido
// que ya se usa en /api/webhooks/n8n/booking-action.
app.post('/webhook/verificar-pago-reserva', async (req, res) => {
  if (!verifyN8NRequest(req.headers)) {
    return res.status(401).json({ error: 'Credenciales de n8n inválidas' });
  }
  const { bookingId, paymentStatus, status } = req.body;
  if (bookingId) {
    await updateBookingStatus(bookingId, {
      paymentStatus: paymentStatus || 'completed',
      status: status || 'confirmada',
      verifiedByWebhook: true
    });
  }
  res.json({ success: true, message: 'Pago verificado correctamente' });
});

// Acciones ejecutivas disparadas por n8n (cancelar, re-agendar, emitir voucher)
app.post('/api/webhooks/n8n/booking-action', async (req, res) => {
  if (!verifyN8NRequest(req.headers)) {
    return res.status(401).json({ error: 'Credenciales de n8n inválidas' });
  }

  const { bookingId, action, payload } = req.body;
  if (!bookingId || !action) {
    return res.status(400).json({ error: 'Faltan bookingId y action' });
  }

  let updates: any = {};
  if (action === 'confirm') {
    updates = { status: 'confirmada', paymentStatus: 'completed' };
  } else if (action === 'cancel') {
    updates = { status: 'cancelada', cancellationReason: payload?.reason || 'Cancelado por n8n' };
  } else if (action === 'reschedule') {
    updates = { date: payload?.date, time: payload?.time || '08:00 AM' };
  } else if (action === 'add_voucher') {
    updates = { voucherUrl: payload?.voucherUrl, voucherCode: payload?.voucherCode };
  }

  const result = await updateBookingStatus(bookingId, updates);
  res.json({ success: result.success, action, booking: result.booking });
});

// Endpoint para que n8n extraiga el reporte consolidado de conversión semanal de Firestore
app.get('/api/analytics/conversion-report', async (req, res) => {
  try {
    const metrics = await getWeeklyConversionMetrics();
    res.json({
      success: true,
      data: metrics,
      source: 'firestore-database'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para disparar el flujo semanal de n8n manualmente o vía cron
app.post('/api/n8n/dispatch-weekly-report', async (req, res) => {
  try {
    const metrics = await getWeeklyConversionMetrics();
    const config = getN8NConfig();
    const targetUrl = `${config.baseUrl}/webhook/reporte-semanal-conversion`;

    const dispatchResult = await dispatchToN8N(targetUrl, {
      trigger: 'CRON_SEMANAL_CONVERSION',
      periodo: metrics.period,
      tasaConversion: `${metrics.conversionRate}%`,
      volumenReservas: metrics.totalBookings,
      reservasConfirmadas: metrics.confirmedBookings,
      reservasPendientes: metrics.pendingBookings,
      ingresosTotalesUSD: `$${metrics.totalRevenueUSD.toLocaleString()} USD`,
      ticketPromedioUSD: `$${metrics.averageTicketUSD} USD`,
      topTours: metrics.topTours,
      desglosePagos: metrics.paymentBreakdown,
      generadoEl: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Reporte de conversión y volumen extraído de Firestore y enviado al webhook de n8n',
      metrics,
      n8nDispatch: dispatchResult
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 🔍 ESTADO Y DIAGNÓSTICO DE N8N
// ==========================================

app.get('/api/n8n/status', (req, res) => {
  const config = getN8NConfig();
  const isCustomConfigured = !config.baseUrl.includes('tu-instancia-n8n');

  res.json({
    status: 'ok',
    configured: isCustomConfigured,
    baseUrl: isCustomConfigured ? config.baseUrl : 'Sin configurar (Modo Simulación / Fallback IA Activo)',
    endpoints: {
      outboundTriggers: [
        '/webhook/chat-consulta',
        '/webhook/inicio-reserva',
        '/webhook/solicitud-pago',
        '/webhook/confirmacion-reserva',
        '/webhook/reserva-confirmada',
        '/webhook/notificar-proveedor',
        '/webhook/evaluar-antifraude',
        '/webhook/antifraude-evaluacion',
        '/webhook/panel-control-telegram',
        '/webhook/telegram-ops-action',
        '/webhook/reserva-multicanal',
        '/webhook/sync-calendar',
        '/webhook/solicitud-itinerario',
        '/webhook/evento-analitica',
        '/webhook/solicitud-soporte',
        '/webhook/reporte-semanal-conversion',
        '/webhook/reserva-parques-sinac',
        '/webhook/alerta-vuelo-retrasado',
        '/webhook/reporte-objeto-olvidado',
        '/webhook/whatsapp-traductor-soporte',
        '/webhook/recepcion-vip-aeropuerto',
        '/webhook/alerta-requerimientos-especiales',
        '/webhook/cancelacion-reembolso-inteligente',
        '/webhook/entrega-fotos-recuerdos',
        '/webhook/sincronizacion-operadores-locales',
        '/webhook/alerta-emergencia-sos',
        '/webhook/booster-reseñas-incentivos'
      ],
      inboundWebhooks: [
        '/api/webhooks/n8n/update-booking',
        '/webhook/verificar-pago-reserva',
        '/api/webhooks/n8n/booking-action',
        '/api/analytics/conversion-report'
      ]
    },
    authSecurity: {
      secretConfigured: Boolean(process.env.N8N_WEBHOOK_SECRET),
      apiKeyConfigured: Boolean(process.env.N8N_API_KEY)
    }
  });
});

app.post('/api/n8n/test-connection', async (req, res) => {
  const testResult = await dispatchToN8N('/webhook/health-check', {
    ping: 'costa-rica-tours-test',
    timestamp: new Date().toISOString()
  });

  res.json({
    connected: testResult.success,
    status: testResult.status || null,
    details: testResult.data || testResult.error
  });
});

// ==========================================
// 🤖 AGENTES DEL ENJAMBRE (TRIAGE, PROCESADOR, SUPERVISOR)
// ==========================================

app.post('/api/agents/triage', async (req, res) => {
  const result = await runTriage(req.body.rawMessage || '');
  res.json(result);
});

app.post('/api/agents/processor', async (req, res) => {
  const { rawMessage, intent, extractedData } = req.body;
  const result = await runProcessor(rawMessage || '', intent || '', extractedData || {});
  res.json(result);
});

app.post('/api/agents/contingency', async (req, res) => {
  const result = await runContingency(req.body);
  res.json(result);
});

app.post('/api/agents/supervisor', async (req, res) => {
  const result = await runSupervisor();
  res.json(result);
});

app.post('/api/agents/log_exception', (req, res) => {
  const { agentName, errorContext, rawData } = req.body;
  logException(agentName || 'UnknownAgent', errorContext || 'Error', rawData);
  res.json({ success: true });
});

app.post('/api/gemini/concierge', async (req, res) => {
  try {
    const { message, language, history, agentId, context, engine } = req.body;
    const userMsg = message || '';
    const lang = (language || 'es') as 'es' | 'en';
    
    // Si se especifica o prefiere motor Claude 3.5 Sonnet
    if (engine === 'claude') {
      try {
        const claudeResult = await generateClaudeChatResponse(userMsg, lang, history || []);
        return res.json({
          reply: claudeResult.reply,
          quickActions: claudeResult.quickActions || [],
          success: true,
          source: 'claude_vertex',
          modelUsed: claudeResult.modelUsed
        });
      } catch (claudeErr: any) {
        console.warn('Fallback de Claude a n8n / Gemini:', claudeErr.message);
      }
    }

    // Intento de despacho prioritario a n8n
    const n8nResult = await dispatchToN8N('/webhook/chat-consulta', {
      trigger: 'CONSULTA_CHAT_IA',
      mensaje: userMsg,
      idioma: lang,
      agenteSeleccionado: agentId || 'concierge',
      historial: history || [],
      contexto: context || {}
    });

    if (n8nResult.success && n8nResult.data) {
      const reply = n8nResult.data.reply || n8nResult.data.mensaje || n8nResult.data.output;
      if (reply) {
        return res.json({
          reply,
          quickActions: n8nResult.data.quickActions || [],
          success: true,
          source: 'n8n'
        });
      }
    }

    const assistantResult = await processChatInquiry(userMsg, lang, history || [], engine || 'auto');
    res.json({
      reply: assistantResult.reply,
      quickActions: assistantResult.quickActions,
      success: true,
      source: assistantResult.modelUsed || 'gemini_fallback'
    });
  } catch (err: any) {
    res.json({
      reply: '¡Pura Vida! Ocurrió un inconveniente temporal al conectar con el motor de IA. Por favor intenta de nuevo o escríbenos a nuestro WhatsApp oficial.',
      success: false,
      error: err.message
    });
  }
});

app.post('/api/gemini/booking/urgent', async (req, res) => {
  try {
    const { message, language, history, agentId } = req.body;
    const lang = (language || 'es') as 'es' | 'en';
    const assistantResult = await processChatInquiry(message || '', lang, history || []);
    
    // Despacho a n8n trigger de soporte/urgencia
    dispatchToN8N('/webhook/solicitud-soporte', {
      trigger: 'SOLICITUD_SOPORTE',
      tipo: 'urgencia_reserva',
      mensaje: message,
      idioma: lang,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    res.json({
      reply: `🚨 **[ATENCIÓN PRIORITARIA COSTA RICA TOURS]**\n\n${assistantResult.reply}`,
      quickActions: [
        { label: lang === 'es' ? '💬 WhatsApp Directo Urgente' : '💬 Urgent Direct WhatsApp', action: 'direct_whatsapp' },
        ...(assistantResult.quickActions || [])
      ],
      success: true,
      urgent: true
    });
  } catch (err: any) {
    res.json({
      reply: 'Atención prioritaria registrada. Por favor comunícate a nuestro WhatsApp de soporte: +506 8888-7777.',
      success: false
    });
  }
});

// ==========================================
// 🧠 RUTAS OFICIALES CLAUDE (VERTEX AI)
// ==========================================

// 1. Estado y configuración de Claude en Google Cloud Vertex AI
app.get('/api/claude/status', (req, res) => {
  const status = getClaudeStatus();
  res.json({
    engine: 'Anthropic Claude on Google Cloud Vertex AI',
    sdk: '@anthropic-ai/vertex-sdk',
    ...status
  });
});

// 2. Chat conversacional con Claude 3.5 Sonnet
app.post('/api/claude/chat', async (req, res) => {
  try {
    const { message, language, history, temperature } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'El parámetro "message" es requerido' });
    }

    const lang = (language || 'es') as 'es' | 'en';
    const result = await generateClaudeChatResponse(message, lang, history || [], { temperature });

    res.json(result);
  } catch (err: any) {
    console.error('Error procesando chat con Claude:', err);
    // Fallback elegante a Gemini / Asistente local
    try {
      const fallback = await processChatInquiry(req.body.message, req.body.language || 'es', req.body.history || []);
      res.json({
        reply: fallback.reply,
        quickActions: fallback.quickActions,
        success: true,
        modelUsed: 'Fallback Asistente Oficial (Gemini/KB)',
        warning: 'Claude Vertex AI no disponible temporalmente en esta instancia.'
      });
    } catch (fbErr: any) {
      res.status(500).json({ error: err.message || 'Error con Claude Vertex AI' });
    }
  }
});

// 3. Generador experto de itinerarios personalizados con Claude
app.post('/api/claude/itinerary', async (req, res) => {
  try {
    const { days, travelers, style, regions, budget, language, specialRequests } = req.body;
    const itinerary = await generateClaudeItinerary({
      days: Number(days) || 5,
      travelers: Number(travelers) || 2,
      style: style || 'eco_relax',
      regions: regions || ['Arenal', 'Monteverde', 'Manuel Antonio'],
      budget: budget || 'premium',
      language: (language || 'es') as 'es' | 'en',
      specialRequests
    });

    res.json({ success: true, ...itinerary });
  } catch (err: any) {
    console.error('Error generando itinerario con Claude:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      fallbackMessage: 'No se pudo generar el itinerario con Claude Vertex AI en este momento.'
    });
  }
});

// 4. Auditoría operativa y antifraude de reserva con Claude
app.post('/api/claude/audit-booking', async (req, res) => {
  try {
    const booking = req.body.booking || req.body;
    const auditResult = await analyzeOperationalRiskWithClaude(booking);
    res.json({ success: true, audit: auditResult });
  } catch (err: any) {
    console.error('Error auditando reserva con Claude:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Compatibilidad de rutas generales
app.post('/api/workflows/:action', (req, res) => {
  res.json({ success: true, message: `Workflow ${req.params.action} procesado con éxito` });
});

app.post('/api/gemini/:action', (req, res) => {
  res.json({ success: true, text: `Respuesta de Gemini para ${req.params.action}` });
});

app.get('/api/chat/history', (req, res) => {
  res.json({ history: [] });
});

app.delete('/api/chat/history', (req, res) => {
  res.json({ success: true });
});

// ==========================================
// 🚀 MIDDLEWARE VITE (FULL-STACK SPA + BACKEND)
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Full-Stack corriendo en http://0.0.0.0:${PORT}`);
    console.log(`⚡ Backend n8n listo con triggers salientes y webhooks entrantes.`);
    initializeAutomationEngine();
  });
}

startServer();
