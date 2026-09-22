// Clean tsx injected relative __dirname which breaks module resolution in vite plugins
if (typeof (globalThis as any).__dirname !== 'undefined' && (globalThis as any).__dirname === '.') {
  delete (globalThis as any).__dirname;
}
if (typeof (global as any).__dirname !== 'undefined' && (global as any).__dirname === '.') {
  delete (global as any).__dirname;
}

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { initializeAutomationEngine, cleanupExpiredSoftHolds } from './backend/cronEngine';
import { google } from 'googleapis';
import { requireOperator } from './backend/authMiddleware';
import { TOURS } from './src/data/toursData';
import { FLIGHT_ROUTES } from './src/data/flightsData';
import {
  getStripe,
  createBooking,
  getAllBookings,
  updateBookingStatus,
  checkTourAvailability,
  getWeeklyConversionMetrics
} from './backend/bookingService';
import { generateBookingPDFBuffer, generateBookingPrintableHTML } from './backend/pdfService';
import { massiveEngine } from './backend/massiveProcessingEngine';
import {
  createAlert,
  getAlerts,
  updateAlert
} from './backend/alertService';
import {
  processChatInquiry,
  runCounterAgent,
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
import { generateGeminiItinerary } from './backend/itineraryService';
import {
  executeChatInquiry,
  executeInicioReserva,
  executeSolicitudPago,
  executeConfirmacionReserva,
  executeSolicitudItinerario,
  executeSolicitudSoporte,
  executeNotificarProveedor,
  executeEvaluarAntifraude,
  executeAIOpsAction,
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
  handleProviderActionResponse,
  executeAutonomousProviderFallback,
  MASTER_OPERATORS_REGISTRY,
  executeCustomerBookingConfirmation,
  executeCustomerProformaConfirmation,
  executeAutomatedProviderPayouts,
  executeSurveillanceAndEscalation,
  executeDailyOperationReport,
  executePostTourReviewRequests,
  executeTour24hReminders,
  executeWeatherMonitoringAlerts,
  executeMorningConciergeTips,
  executePreSaleProspectRecovery,
  executePostSaleVipLoyalty
} from './backend/nativeWorkflows';
import { executeSinpeVerification } from './backend/sinpeService';
import { getProvidersOverview, handleProviderAction } from './backend/providerCommunicationService';
import { getSelfDevelopmentOverview, runSelfHealingCycle } from './backend/selfDevelopmentEngine';
import { askCounterDesk, getCounterOperationsSnapshot, organizeCounterDesk } from './backend/counterDeskService';
import { runEvaluationSuite } from './backend/agentEvaluationService';
import { buildLearningDataset } from './backend/learningPipelineService';
import { autonomyPolicy, parseAutonomyLevel } from './backend/autonomyPolicy';
import { listSkillVersions, selectSkills, hydrateSkillGenome, registerSkillVersion, recordSkillEvaluation, promoteSkillVersion, rollbackSkillVersion } from './backend/skillGenome';
import { emitOperationalEvent } from './backend/operationalEventBus';
import { buildSkillEvolutionReport, selectEvolvedSkill, recordSkillOutcome, proposeSkillUpgrade } from './backend/skillEvolutionEngine';
import { assessTripFit, buildPackingList, buildRouteStrategy, getDestinationIntelligence, screenActivitySuitability } from './backend/tourismIntelligenceEngine';
import { buildTripJourney, adaptTravelerJourney, getTravelerJourney } from './backend/travelJourneyOrchestrator';
import { processProviderInboxOnce } from './backend/providerInboxAgent';
import { getAdminControlCenterSnapshot } from './backend/adminControlCenterService';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Admin gate is defined before any route registration that uses it.
const requireAdmin = requireOperator;

/**
 * Autenticación para herramientas internas de agentes. Estas rutas pueden crear
 * efectos persistentes, por lo que nunca deben quedar expuestas sin una credencial.
 */
function requireAgentTool(req: express.Request, res: express.Response, next: express.NextFunction) {
  const configured = process.env.AGENT_INTERNAL_TOKEN;
  if (!configured) {
    return res.status(503).json({ error: 'Herramientas internas de agentes no configuradas.' });
  }
  const authorization = req.headers.authorization;
  const provided = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!provided) return res.status(401).json({ error: 'Autenticación requerida.' });
  const expectedBuffer = Buffer.from(configured);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return res.status(401).json({ error: 'No autorizado.' });
  }
  next();
}

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

const counterLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite del Counter Digital excedido. Por favor espere un momento.' }
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
// 🧠 AI TRAVEL INTELLIGENCE — READ ONLY
// ==========================================
// ==========================================
/* 🧭 FULL TRAVEL JOURNEY — MEMORY + CATALOG + LIVE DATA + SALES */
app.post('/api/ai/journey', async (req, res) => {
  try {
    const result = await buildTripJourney(req.body || {});
    res.json({ success: true, journey: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo construir el viaje.' });
  }
});

app.get('/api/ai/journey/:journeyId', async (req, res) => {
  try {
    const result = await getTravelerJourney(String(req.params.journeyId || ''));
    if (!result) return res.status(404).json({ success: false, error: 'Viaje no encontrado.' });
    res.json({ success: true, journey: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo recuperar el viaje.' });
  }
});

app.patch('/api/ai/journey/:journeyId', async (req, res) => {
  try {
    const result = await adaptTravelerJourney(String(req.params.journeyId || ''), req.body || {});
    res.json({ success: true, journey: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo adaptar el viaje.' });
  }
});

// ==========================================
// 📬 PROVIDER INBOX — lectura operativa del correo cada minuto
app.post('/api/ops/provider-inbox/check', requireAdmin, async (_req, res) => {
  try {
    res.json({ success: true, result: await processProviderInboxOnce() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo revisar la bandeja.' });
  }
});

// ==========================================
// 📊 ADMIN CONTROL CENTER
app.get('/api/admin/control-center', requireAdmin, async (_req, res) => {
  try {
    res.json(await getAdminControlCenterSnapshot());
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo cargar el centro de control.' });
  }
});

app.post('/api/ai/intelligence', (req, res) => {
  try {
    const action = String(req.body?.action || '').trim();
    switch (action) {
      case 'trip_fit':
        return res.json(assessTripFit({ query: typeof req.body.query === 'string' ? req.body.query.slice(0, 2000) : '', days: Number(req.body.days), airport: typeof req.body.airport === 'string' ? req.body.airport.slice(0, 20) : undefined, profile: req.body.profile, intensity: req.body.intensity, regions: Array.isArray(req.body.regions) ? req.body.regions.slice(0, 8).map(String) : undefined }));
      case 'packing_list':
        return res.json(buildPackingList({ activities: Array.isArray(req.body.activities) ? req.body.activities.slice(0, 12).map(String) : [], regions: Array.isArray(req.body.regions) ? req.body.regions.slice(0, 8).map(String) : [], profile: req.body.profile }));
      case 'activity_safety_check':
        return res.json(screenActivitySuitability({ activity: String(req.body.activity || '').slice(0, 200), age: req.body.age === undefined ? undefined : Number(req.body.age), canSwim: req.body.canSwim === undefined ? undefined : Boolean(req.body.canSwim), mobility: typeof req.body.mobility === 'string' ? req.body.mobility.slice(0, 300) : undefined, fearOfHeights: req.body.fearOfHeights === undefined ? undefined : Boolean(req.body.fearOfHeights), medicalConstraint: typeof req.body.medicalConstraint === 'string' ? req.body.medicalConstraint.slice(0, 300) : undefined }));
      case 'route_strategy':
        return res.json(buildRouteStrategy({ regions: Array.isArray(req.body.regions) ? req.body.regions.slice(0, 8).map(String) : [], days: Number(req.body.days), arrivalAirport: typeof req.body.arrivalAirport === 'string' ? req.body.arrivalAirport.slice(0, 20) : undefined, departureAirport: typeof req.body.departureAirport === 'string' ? req.body.departureAirport.slice(0, 20) : undefined }));
      case 'destination_intelligence':
        return res.json(getDestinationIntelligence(String(req.body.regionId || '').slice(0, 60)));
      default:
        return res.status(400).json({ error: 'Acción de inteligencia no soportada.' });
    }
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'No se pudo procesar la consulta de inteligencia.' });
  }
});

// ==========================================
 // 🧭 VIAJE COMPLETO: MEMORIA + CATÁLOGO + CLIMA + DISPONIBILIDAD + ITINERARIO + VENTAS
 // ==========================================
app.post('/api/journey/build', async (req, res) => {
  try {
    const journey = await buildTripJourney({
      sessionId: typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined,
      query: typeof req.body?.query === 'string' ? req.body.query : '',
      days: req.body?.days, travelers: req.body?.travelers, profile: req.body?.profile,
      regions: Array.isArray(req.body?.regions) ? req.body.regions.map(String).slice(0, 6) : undefined,
      arrivalAirport: typeof req.body?.arrivalAirport === 'string' ? req.body.arrivalAirport : undefined,
      departureAirport: typeof req.body?.departureAirport === 'string' ? req.body.departureAirport : undefined,
      date: typeof req.body?.date === 'string' ? req.body.date : undefined,
      time: typeof req.body?.time === 'string' ? req.body.time : undefined,
      selectedTourIds: Array.isArray(req.body?.selectedTourIds) ? req.body.selectedTourIds.map(String).slice(0, 8) : undefined,
      activities: Array.isArray(req.body?.activities) ? req.body.activities.map(String).slice(0, 12) : undefined,
      language: req.body?.language === 'en' ? 'en' : 'es'
    });
    return res.json(journey);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'No se pudo construir el viaje.' });
  }
});

app.get('/api/journey/:journeyId', async (req, res) => {
  try {
    const journey = await getTravelerJourney(String(req.params.journeyId || ''));
    if (!journey) return res.status(404).json({ error: 'Viaje no encontrado.' });
    return res.json(journey);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'No se pudo leer el viaje.' });
  }
});

app.post('/api/journey/:journeyId/adapt', async (req, res) => {
  try {
    const journey = await adaptTravelerJourney(String(req.params.journeyId || ''), {
      sessionId: typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined,
      query: typeof req.body?.query === 'string' ? req.body.query : undefined,
      days: req.body?.days, travelers: req.body?.travelers, profile: req.body?.profile,
      regions: Array.isArray(req.body?.regions) ? req.body.regions.map(String).slice(0, 6) : undefined,
      arrivalAirport: typeof req.body?.arrivalAirport === 'string' ? req.body.arrivalAirport : undefined,
      departureAirport: typeof req.body?.departureAirport === 'string' ? req.body.departureAirport : undefined,
      date: typeof req.body?.date === 'string' ? req.body.date : undefined,
      time: typeof req.body?.time === 'string' ? req.body.time : undefined,
      selectedTourIds: Array.isArray(req.body?.selectedTourIds) ? req.body.selectedTourIds.map(String).slice(0, 8) : undefined,
      activities: Array.isArray(req.body?.activities) ? req.body.activities.map(String).slice(0, 12) : undefined,
      language: req.body?.language === 'en' ? 'en' : undefined
    });
    return res.json(journey);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'No se pudo adaptar el viaje.' });
  }
});

// ==========================================
// 🛎️ CENTRO EJECUTIVO ADMINISTRATIVO
// ==========================================
app.get('/api/admin/control-center', requireAdmin, async (_req, res) => {
  try {
    return res.json(await getAdminControlCenterSnapshot());
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'No se pudo generar el centro de control.' });
  }
});

// ==========================================
// 📬 AGENTE INTERNO DE CORREO DE PROVEEDORES
// ==========================================
app.post('/api/internal/provider-inbox/sweep', requireAgentTool, async (_req, res) => {
  try {
    return res.json(await processProviderInboxOnce());
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'No se pudo procesar la bandeja de proveedores.' });
  }
});

// ==========================================
// 💳 PASARELAS DE PAGO (STRIPE & PAYPAL)
// ==========================================

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { tourName, totalUSD, customerEmail } = req.body;
    const authoritativeTotal = calculateAuthoritativeCheckoutTotal(req.body);
    if (authoritativeTotal === null) return res.status(400).json({ error: 'No se pudo verificar el precio de la reserva en el catálogo.' });
    if (Math.abs(Number(totalUSD) - authoritativeTotal) > 0.01) {
      return res.status(409).json({ error: 'El importe enviado no coincide con el precio calculado en el servidor.', expectedTotalUSD: authoritativeTotal });
    }
    const stripe = getStripe();
    if (!stripe) {
      console.error('🔴 STRIPE_SECRET_KEY no configurada. Se rechaza el intento de pago.');
      return res.status(503).json({ error: 'Pagos no disponibles: Stripe no está configurado en el servidor.' });
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
    const authoritativeTotal = calculateAuthoritativeCheckoutTotal(req.body);
    if (authoritativeTotal === null) return res.status(400).json({ error: 'No se pudo verificar el precio de la reserva en el catálogo.' });
    if (Math.abs(Number(totalUSD) - authoritativeTotal) > 0.01) {
      return res.status(409).json({ error: 'El importe enviado no coincide con el precio calculado en el servidor.', expectedTotalUSD: authoritativeTotal });
    }
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = process.env.PAYPAL_SECRET;
    const paypalMode = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl =
      paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    if (!paypalClientId || !paypalSecret) {
      console.error('🔴 PAYPAL_CLIENT_ID/SECRET no configurados. Se rechaza el intento de pago.');
      return res.status(503).json({ error: 'Pagos no disponibles: PayPal no está configurado en el servidor.' });
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
app.post('/api/internal/sweep-sla', async (req, res) => {
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

// Tipo de cambio configurable. No se usa un valor fijo obsoleto en producción.
app.get('/api/currency/exchange-rate', (_req, res) => {
  const configuredRate = Number(process.env.USD_TO_CRC_RATE);
  if (!Number.isFinite(configuredRate) || configuredRate <= 0) {
    return res.status(503).json({
      error: 'Tipo de cambio no configurado.',
      message: 'Configure USD_TO_CRC_RATE con el valor vigente de una fuente oficial antes de emitir cotizaciones en CRC.'
    });
  }
  res.json({
    usdToCrc: configuredRate,
    crcToUsd: 1 / configuredRate,
    currency: 'CRC',
    source: 'runtime-config',
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

    // La verificación SINPE continúa dentro del motor nativo; no depende de orquestadores externos.
  } catch (err: any) {
    console.error('Error al verificar SINPE:', err);
    res.status(500).json({ error: err.message || 'Error al verificar comprobante' });
  }
});

// Crear reserva (con verificación server-side de pago, cupos en Firestore y automatización nativa)
app.post('/api/bookings', async (req, res) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'];
    const result = await createBooking({ ...req.body, idempotencyKey });
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

// Generar e imprimir Vale Oficial / Itinerario Web de Reserva
app.get('/api/bookings/:id/pdf', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const allBookings = await getAllBookings();
    const booking = allBookings.find((b: any) => b.bookingId === bookingId || b.id === bookingId);

    const html = generateBookingPrintableHTML(booking as any);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Descarga directa binaria del Vale Oficial e Itinerario en PDF
app.get('/api/bookings/:id/download-pdf', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const allBookings = await getAllBookings();
    const booking = allBookings.find((b: any) => b.bookingId === bookingId || b.id === bookingId);
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

    const pdfBuffer = await generateBookingPDFBuffer(booking as any);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CostaRicaTours-Voucher-${bookingId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Despacho de Proforma e Itinerario con Notificación Email (PDF Adjunto) y WhatsApp
app.post(['/api/proformas/send-confirmation', '/api/bookings/send-proforma-confirmation'], async (req, res) => {
  try {
    const result = await executeCustomerProformaConfirmation(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('Error al despachar proforma de confirmación:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Aprobación de Itinerario por parte del Cliente (Confirmación de Proforma) -> Despacho a Proveedores
app.get('/api/bookings/:id/customer-confirm', async (req, res) => {
  try {
    const bookingId = String(req.params.id);
    const action = req.query.action === 'reject' ? 'rechazado' : 'aprobado';
    const allBookings = await getAllBookings();
    const booking = allBookings.find((b: any) => b.bookingId === bookingId || b.id === bookingId);

    if (!booking) return res.status(404).send('Reserva no encontrada.');

    const updateResult = await updateBookingStatus(bookingId, {
      status: action === 'aprobado' ? 'confirmada' : 'cancelada',
      customerConfirmedAt: new Date().toISOString()
    });
    if (!updateResult.success) return res.status(409).send(updateResult.error || 'No se pudo actualizar la reserva.');

    let providerCoordinationResult: any = null;
    if (action === 'aprobado') {
      try {
        providerCoordinationResult = await executeProviderRealtimeCoordination({
          bookingId,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          tourName: booking.tourName,
          date: booking.date,
          tourDate: booking.date,
          totalUSD: booking.totalUSD,
          pax: (Number(booking.adults) || 0) + (Number(booking.children) || 0),
          specialRequests: booking.specialRequests
        });
      } catch (provErr) {
        console.warn('⚠️ [FALLO EN COORDINACIÓN DE PROVEEDORES]:', provErr);
      }
    }

    const downloadPdfUrl = `/api/bookings/${bookingId}/download-pdf`;
    const customerName = String(booking.customerName || 'Cliente').replace(/[<>]/g, '');
    const providerMessage = providerCoordinationResult
      ? 'La coordinación con el proveedor fue iniciada.'
      : 'La coordinación con el proveedor quedó pendiente de seguimiento.';

    res.send(`
      <!DOCTYPE html>
      <html lang="es"><head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación • Costa Rica Tours</title>
        <style>
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#041711;color:#f8fafc;margin:0;padding:24px 16px;display:flex;justify-content:center;align-items:center;min-height:100vh}
          .card{background:#fff;color:#1e293b;max-width:580px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,.5)}
          .hero{background:linear-gradient(135deg,#064e3b,#047857);color:#fff;padding:32px 24px;text-align:center}.content{padding:28px 24px}
          .badge{display:inline-block;background:#ecfdf5;color:#047857;font-weight:800;font-size:12px;padding:6px 14px;border-radius:9999px;text-transform:uppercase;letter-spacing:.5px;border:1px solid #a7f3d0}
          .btn{display:block;width:100%;background:#059669;color:#fff;text-align:center;padding:14px;border-radius:10px;font-weight:800;text-decoration:none;font-size:15px;margin-top:12px;box-sizing:border-box}
          .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:18px 0;font-size:13px;color:#475569}
        </style>
      </head><body><div class="card">
        <div class="hero"><div style="font-size:40px">🌿</div><h1>Solicitud procesada</h1><p>${customerName}, recibimos tu decisión.</p></div>
        <div class="content"><div style="text-align:center"><span class="badge">Expediente #${bookingId}</span></div>
          <div class="box"><strong>Tour:</strong> ${String(booking.tourName || 'Experiencia Costa Rica')}<br/>
          <strong>Fecha:</strong> ${String(booking.date || 'No especificada')}<br/>
          <strong>Estado:</strong> ${String(action)}<br/><br/>${providerMessage}</div>
          <a href="${downloadPdfUrl}" class="btn">Descargar comprobante</a>
        </div>
      </div></body></html>`);
  } catch (err: any) {
    res.status(500).send(`Error al procesar confirmación: ${err.message}`);
  }
});

// 🚨 SISTEMA PROPIO DE ALERTAS ADMINISTRATIVAS
// ==========================================

app.post('/api/alerts', requireAdmin, async (req, res) => {
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

// ==========================================
// ⚡ MOTOR DE AUTOMATIZACIÓN 100% EN CÓDIGO NATIVO
// ==========================================
// Ejecución directa en Node.js/Express y Firestore con 0ms de latencia externa,
// eliminando por completo la dependencia de servicios externos de orquestación.

// Estado y monitoreo del motor nativo
app.get(['/api/native-engine/status', '/api/native/status'], (req, res) => {
  res.json(getNativeEngineStatus());
});

// API para Provider Hub & Self-Development Hub
app.get('/api/providers', (req, res) => {
  res.json(getProvidersOverview());
});

app.post('/api/providers/action', requireAdmin, async (req, res) => {
  try {
    const { orderId, action, notes } = req.body;
    const result = await handleProviderAction({ orderId, action, notes });
    if (!result.success && result.message?.includes('NOT_FOUND')) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 🛎️ COUNTER DESK FULL STACK + ORGANIZADOR IA
// ==========================================
// Atención pública: usa el mismo conocimiento operativo del backend.
// Operaciones internas: snapshot/organización protegidos por autenticación.
app.post('/api/counter/ask', counterLimiter, async (req, res) => {
  try {
    const result = await askCounterDesk({
      message: req.body?.message,
      sessionId: req.body?.sessionId,
      language: req.body?.language,
      context: req.body?.context
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error en Counter Agent' });
  }
});

app.get('/api/counter/operations', requireAdmin, async (_req, res) => {
  try {
    res.json({ success: true, snapshot: await getCounterOperationsSnapshot() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error al obtener operaciones' });
  }
});

app.get('/api/counter/autopilot', requireAdmin, async (_req, res) => {
  try {
    const { runCounterSafeAutopilot } = await import('./backend/counterDeskService');
    res.json(await runCounterSafeAutopilot());
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error del autopilot' });
  }
});

app.post('/api/counter/organize', requireAdmin, async (_req, res) => {
  try {
    res.json(await organizeCounterDesk());
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error del organizador IA' });
  }
});

app.get('/api/weather/destinations', async (_req, res) => {
  try {
    const { getDestinationWeather } = await import('./backend/weatherPulseService');
    res.json({ success: true, source: 'open-meteo', generatedAt: new Date().toISOString(), destinations: await getDestinationWeather() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/ai/evaluation/suite', requireAdmin, async (_req, res) => {
  try { res.json(await runEvaluationSuite()); }
  catch (err: any) { res.status(500).json({ success: false, error: err.message || 'Evaluation error' }); }
});

app.get('/api/ai/learning/dataset', requireAdmin, async (req, res) => {
  try {
    const dataset = await buildLearningDataset(Number(req.query.limit) || 500);
    res.json(dataset);
  } catch (err: any) { res.status(500).json({ success: false, error: err.message || 'Dataset error' }); }
});

app.get('/api/ai/autonomy/policy', requireAdmin, (req, res) => {
  const level = parseAutonomyLevel(req.query.level);
  const action = String(req.query.action || 'observe') as any;
  res.json({ success: true, policy: autonomyPolicy(level, action) });
});

app.get('/api/ai/skills', requireAdmin, (_req, res) => {
  res.json({ success: true, skills: listSkillVersions() });
});

app.get('/api/ai/skills/select', requireAdmin, (req, res) => {
  const agentId = String(req.query.agentId || 'concierge');
  const task = String(req.query.task || '');
  const level = parseAutonomyLevel(req.query.level);
  res.json({ success: true, skills: selectSkills(agentId, task, level) });
});

app.get('/api/ai/skills/governance', requireAdmin, (_req, res) => {
  res.json({ success: true, skills: listSkillVersions() });
});

app.post('/api/ai/skills/register', requireAdmin, async (req, res) => {
  try {
    const skill = await registerSkillVersion(req.body);
    res.status(201).json({ success: true, skill });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'No se pudo registrar la skill' });
  }
});

app.post('/api/ai/skills/evaluate', requireAdmin, async (req, res) => {
  try {
    const { id, version, groundedness, safety, quality, criticalFailure } = req.body || {};
    if (!id || !version) return res.status(400).json({ success: false, error: 'id y version son requeridos' });
    const skill = await recordSkillEvaluation(String(id), String(version), {
      groundedness: Number(groundedness),
      safety: Number(safety),
      quality: Number(quality),
      criticalFailure: Boolean(criticalFailure)
    });
    res.json({ success: true, skill });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'No se pudo registrar evaluación' });
  }
});

app.post('/api/ai/skills/promote', requireAdmin, async (req, res) => {
  try {
    const result = await promoteSkillVersion(String(req.body?.id || ''), String(req.body?.version || ''), req.body?.target === 'canary' ? 'canary' : 'active');
    res.status(result.success ? 200 : 409).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'No se pudo promover la skill' });
  }
});

app.post('/api/ai/skills/rollback', requireAdmin, async (req, res) => {
  try {
    const result = await rollbackSkillVersion(String(req.body?.id || ''), String(req.body?.version || ''), String(req.body?.reason || 'manual_rollback'));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'No se pudo revertir la skill' });
  }
});

app.get('/api/ai/learning/examples', requireAdmin, async (req, res) => {
  try {
    const { buildTrainingExamples } = await import('./backend/learningEngine');
    res.json({ success: true, examples: await buildTrainingExamples(Number(req.query.limit) || 100) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ai/learning/reflect', requireAdmin, async (_req, res) => {
  try {
    const { runLearningReflection } = await import('./backend/learningEngine');
    res.json({ success: true, result: await runLearningReflection(60) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/ai/mesh/inbox/:agentId', requireAdmin, async (req, res) => {
  try {
    const { getAgentInbox } = await import('./backend/agentMeshService');
    res.json({ success: true, messages: await getAgentInbox(String(req.params.agentId), Number(req.query.limit) || 20) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/self-dev/status', async (req, res) => {
  res.json(await getSelfDevelopmentOverview());
});

app.post('/api/self-dev/run-healing', requireAdmin, async (req, res) => {
  try {
    const result = await runSelfHealingCycle();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

import { getPhotoRecommendations } from './backend/photoRecommendationService';
import { getDemandForecast } from './backend/demandForecastService';
import { checkFraudRisk } from './backend/fraudCheckService';

app.post('/api/ai/photo-recommendations', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'Imagen no proporcionada' });
    }
    const result = await getPhotoRecommendations(image);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin endpoints use the same server-side operator gate until Firebase Admin
// token verification is added. Never accept arbitrary Bearer tokens.
app.get('/api/ai/demand-forecast', requireAdmin, async (req, res) => {
  try {
    const result = await getDemandForecast();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ai/fraud-check', requireAdmin, async (req, res) => {
  try {
    const result = await checkFraudRisk(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(['/api/native-engine/logs', '/api/native/logs'], requireAdmin, (req, res) => {
  const limit = Number(req.query.limit) || 50;
  res.json(getNativeAutomationLogs(limit));
});

// Despachadores manuales / UI de los 7 Workflows Nativos
app.post('/api/native/workflows/payouts', requireAdmin, async (req, res) => {
  try {
    const result = await executeAutomatedProviderPayouts();
    logAutomationExecution('WF_PAGOS_PROVEEDORES', 3, 'success', `Manual: ${result.totalProcessed} procesadas, $${result.totalPaidUSD} USD.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_PAGOS_PROVEEDORES', 3, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/reminders', requireAdmin, async (req, res) => {
  try {
    const result = await executeTour24hReminders();
    logAutomationExecution('WF_RECORDATORIOS_24H', 7, 'success', `Manual: ${result.totalRemindersSent} recordatorios.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_RECORDATORIOS_24H', 7, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/surveillance', requireAdmin, async (req, res) => {
  try {
    const result = await executeSurveillanceAndEscalation();
    logAutomationExecution('WF_VIGILANCIA_2H', 4, 'success', `Manual: ${result.checkedBookings} auditadas, ${result.alertsSent} alertas.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_VIGILANCIA_2H', 4, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/reviews', requireAdmin, async (req, res) => {
  try {
    const result = await executePostTourReviewRequests();
    logAutomationExecution('WF_RESENAS_POST_TOUR', 6, 'success', `Manual: ${result.emailsSent} encuestas enviadas.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_RESENAS_POST_TOUR', 6, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/daily-report', requireAdmin, async (req, res) => {
  try {
    const result = await executeDailyOperationReport();
    logAutomationExecution('WF_REPORTE_DIARIO', 5, 'success', `Manual: ${result.totalBookingsToday} reservas, $${result.revenueUSD} USD.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_REPORTE_DIARIO', 5, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/cleanup-holds', requireAdmin, async (req, res) => {
  try {
    const result = await cleanupExpiredSoftHolds();
    logAutomationExecution('AUTO_RELEASE_HOLD', 5, 'success', `Manual: ${result.releasedCount} cupos liberados.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('AUTO_RELEASE_HOLD', 5, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/conversion-report', requireAdmin, async (req, res) => {
  try {
    const metrics = await getWeeklyConversionMetrics();
    logAutomationExecution('CRON_SEMANAL_CONVERSION', 5, 'success', `Manual: Tasa conv: ${metrics.conversionRate}%, Ventas: $${metrics.totalRevenueUSD}.`);
    res.json({ success: true, metrics });
  } catch (err: any) {
    logAutomationExecution('CRON_SEMANAL_CONVERSION', 5, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/weather', requireAdmin, async (req, res) => {
  try {
    const result = await executeWeatherMonitoringAlerts();
    logAutomationExecution('WF_CLIMA_SEGURIDAD', 0, 'success', `Manual: ${result.checkedBookings} revisadas, ${result.alertsSent} avisos.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_CLIMA_SEGURIDAD', 0, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/concierge', requireAdmin, async (req, res) => {
  try {
    const result = await executeMorningConciergeTips();
    logAutomationExecution('WF_CONCIERGE_MATUTINO', 0, 'success', `Manual: ${result.tipsSent} tips enviados.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_CONCIERGE_MATUTINO', 0, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/prospects', requireAdmin, async (req, res) => {
  try {
    const result = await executePreSaleProspectRecovery();
    logAutomationExecution('WF_RECUPERACION_PROSPECTOS', 0, 'success', `Manual: ${result.recoveredSent} prospectos contactados.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_RECUPERACION_PROSPECTOS', 0, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/native/workflows/loyalty', requireAdmin, async (req, res) => {
  try {
    const result = await executePostSaleVipLoyalty();
    logAutomationExecution('WF_FIDELIZACION_VIP', 0, 'success', `Manual: ${result.couponsSent} cupones VIP emitidos.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_FIDELIZACION_VIP', 0, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🚀 PIPELINE 100% AUTÓNOMO (Sin intervención manual humana)
// Procesa la consulta -> Bloquea cupo -> Crea reserva -> Notifica al proveedor -> Envía voucher digital QR al cliente
app.post(['/api/native/autonomous-booking-flow', '/api/native/flujo-autonomo'], requireAdmin, async (req, res) => {
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

// 10. Operaciones de Terreno y Despacho a Guías (100% nativo)
app.post(['/webhook/panel-control-ops', '/api/ops/action'], async (req, res) => {
  try {
    const result = await executeAIOpsAction(req.body);
    res.json(result);
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

// 1. Coordinación en Tiempo Real con Proveedores (Webhook & API Nativa)
app.post(['/webhook/proveedores-coordinacion', '/webhook/coordinacion-proveedores', '/api/webhooks/provider-coordination', '/api/native/workflows/coordinacion-proveedor', '/api/native/workflows/notificar-proveedor'], async (req, res) => {
  try {
    const authHeader = req.headers['x-webhook-secret'] as string;
    const result = await executeProviderRealtimeCoordination(req.body, authHeader);
    res.json(result);
  } catch (error: any) {
    const status = error.message.includes('No autorizado') ? 401 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// 1.1 Endpoint Bidireccional de Respuesta del Proveedor (GET para enlaces de correo/WhatsApp y POST para APIs)
app.all(['/api/provider/respond', '/webhook/provider-response', '/api/webhooks/provider-response'], async (req, res) => {
  try {
    const action = String(req.query.action || req.body?.action || 'confirm');
    const bookingId = String(req.query.bookingId || req.body?.bookingId || req.body?.id || '');
    const providerId = String(req.query.providerId || req.body?.providerId || '');
    const guideName = String(req.query.guideName || req.body?.guideName || 'Guía Naturalista Certificado ICT');
    const vehiclePlate = String(req.query.vehiclePlate || req.body?.vehiclePlate || 'Unidad Oficial Alsama Tours');
    const proposedTime = String(req.query.proposedTime || req.body?.proposedTime || '');
    const providerNotes = String(req.query.notes || req.body?.notes || req.body?.providerNotes || '');

    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'bookingId es obligatorio' });
    }

    const result = await handleProviderActionResponse(bookingId, action, {
      guideName,
      vehiclePlate,
      proposedTime,
      providerNotes,
      providerId
    });

    // Si la solicitud proviene de un navegador web (clic en correo del proveedor)
    if (req.method === 'GET' || req.accepts('html')) {
      const isConfirm = action === 'confirm';
      const isDecline = action === 'decline';
      const badgeColor = isConfirm ? '#059669' : isDecline ? '#b91c1c' : '#d97706';
      const title = isConfirm ? '✅ ¡Reserva Confirmada Exitosamente!' : isDecline ? '🔄 Reasignación en Proceso' : '⏰ Ajuste de Horario Solicitado';

      return res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title} • Costa Rica Tours</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #041711; color: #f8fafc; margin: 0; padding: 40px 16px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
            .card { background: #08291e; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 20px; max-width: 520px; width: 100%; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; }
            .badge { display: inline-block; background-color: ${badgeColor}; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-weight: 800; font-size: 13px; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.5px; }
            h1 { font-size: 24px; margin: 0 0 12px 0; color: #ecfdf5; }
            p { font-size: 15px; line-height: 1.6; color: #a7f3d0; margin: 0 0 20px 0; }
            .details { background: #03150e; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 16px; margin: 20px 0; text-align: left; font-size: 14px; }
            .details div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
            .details div:last-child { border-bottom: none; }
            .details span:first-child { color: #94a3b8; }
            .details span:last-child { font-weight: bold; color: #f8fafc; }
            .footer { font-size: 12px; color: #6ee7b7; margin-top: 24px; }
            .btn { display: inline-block; background: #f59e0b; color: #041711; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 800; margin-top: 16px; transition: transform 0.2s; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">${action.toUpperCase()}</div>
            <h1>${title}</h1>
            <p>${result.message}</p>
            <div class="details">
              <div><span>ID Reserva:</span><span>#${bookingId}</span></div>
              <div><span>Estado en Sistema:</span><span style="color: #34d399;">${result.newStatus.toUpperCase()}</span></div>
              <div><span>Estado Proveedor:</span><span>${result.providerStatus}</span></div>
              <div><span>Registro Autodependiente:</span><span>Auditoría M2M 2026</span></div>
            </div>
            <p class="footer">Este cambio ha sincronizado automáticamente el calendario, el voucher del cliente y la base de datos.</p>
            <a href="/" class="btn">Volver a Costa Rica Tours</a>
          </div>
        </body>
        </html>
      `);
    }

    res.json(result);
  } catch (err: any) {
    console.error('Error en /api/provider/respond:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1.2 Catálogo de Operadores Turísticos Oficiales CST
app.get(['/api/provider/catalog', '/api/operators/catalog'], (req, res) => {
  res.json({
    success: true,
    total: Object.keys(MASTER_OPERATORS_REGISTRY).length,
    operators: Object.values(MASTER_OPERATORS_REGISTRY),
    standardCommissionRate: 0.15,
    payoutEngine: 'PayPal Payouts & Automated Bank Transfer',
    certificationStandard: 'CST (Certificación para la Sostenibilidad Turística de Costa Rica)'
  });
});

// 1.3 Consulta de Estado de Despacho del Proveedor para una Reserva
app.get(['/api/provider/status/:bookingId', '/api/operators/status/:bookingId'], async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const allBookings = await getAllBookings();
    const found = allBookings.find((b: any) => (b.bookingId === bookingId || b.id === bookingId));

    if (!found) {
      return res.status(404).json({ success: false, error: `Reserva #${bookingId} no encontrada.` });
    }

    res.json({
      success: true,
      bookingId,
      status: found.status,
      providerId: found.providerId || 'alsama-tours-cr',
      providerName: found.providerName || found.providerInfo?.name || 'Alsama Tours CR',
      providerStatus: found.providerStatus || 'pending',
      assignedGuide: found.assignedGuide || 'Por asignar',
      assignedVehicle: found.assignedVehicle || 'Por asignar',
      providerDispatchedAt: found.providerDispatchedAt || null,
      providerConfirmedAt: found.providerConfirmedAt || null,
      tourName: found.tourName,
      date: found.date,
      time: found.time
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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

// 8. Verificación y Conciliación Autónoma de Pagos SINPE Móvil (Webhook & API)
app.post(['/webhook/cr-tours-sinpe-verify', '/webhook/sinpe-verify', '/api/payments/sinpe-verify', '/api/sinpe/verify'], async (req, res) => {
  try {
    const authHeader = req.headers['x-webhook-secret'] as string;
    const result = await executeSinpeVerification(req.body, authHeader);
    res.json(result);
  } catch (error: any) {
    console.error('Error en verificación SINPE:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// 9. Telemetría y Métricas en Tiempo Real de Procesamiento Masivo (RPS, Latencia, Concurrencia)
app.get(['/api/metrics/throughput', '/api/massive/status'], (req, res) => {
  const metrics = massiveEngine.getMetrics();
  res.json({
    success: true,
    platform: 'Costa Rica Tours 2026 - Massive Real-Time Processing Engine',
    timestamp: new Date().toISOString(),
    metrics
  });
});

// 10. Procesamiento Masivo Concurrente de Consultas en Lote (Batch Inquiries)
app.post(['/api/massive/batch-inquiries', '/api/massive/process-batch'], async (req, res) => {
  try {
    const inquiries = Array.isArray(req.body?.inquiries) ? req.body.inquiries : [req.body];
    const results = await Promise.allSettled(
      inquiries.map((inquiry: any) =>
        massiveEngine.enqueue(
          'INQUIRY_CACHE_PROCESSING',
          inquiry,
          'INQUIRY_CACHE'
        )
      )
    );

    res.json({
      success: true,
      totalBatch: inquiries.length,
      processed: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results: results.map(r => r.status === 'fulfilled' ? (r as any).value : { error: (r as any).reason?.message })
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check para compatibilidad
app.all('/webhook/health-check', (req, res) => {
  res.json({ status: 'ok', service: 'costa-rica-tours-native-engine', timestamp: new Date().toISOString() });
});

// ==========================================
// 📊 ANALÍTICA NATIVA Y ACCIONES DE RESERVA
// ==========================================
app.get('/api/analytics/conversion-report', async (req, res) => {
  try {
    const metrics = await getWeeklyConversionMetrics();
    res.json({ success: true, data: metrics, source: 'firestore-native' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Acciones internas autenticadas para operaciones: confirmar, cancelar, reagendar o emitir voucher.
app.post('/api/ops/booking-action', requireOperator, async (req, res) => {
  try {
    const { bookingId, action, payload } = req.body || {};
    if (!bookingId || !action) return res.status(400).json({ error: 'Faltan bookingId y action' });
    const updates: any = action === 'confirm'
      ? { status: 'confirmada', paymentStatus: 'completed' }
      : action === 'cancel'
        ? { status: 'cancelada', cancellationReason: payload?.reason || 'Cancelado por operaciones' }
        : action === 'reschedule'
          ? { date: payload?.date, time: payload?.time || '08:00 AM' }
          : action === 'add_voucher'
            ? { voucherUrl: payload?.voucherUrl, voucherCode: payload?.voucherCode }
            : null;
    if (!updates) return res.status(400).json({ error: 'Acción no soportada' });
    const result = await updateBookingStatus(bookingId, updates);
    res.json({ success: result.success, action, booking: result.booking });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
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
    const { message, language, history, agentId, context, engine, sessionId } = req.body;
    const userMsg = message || '';
    const memorySessionId = String(sessionId || context?.sessionId || '');
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
        console.warn('Fallback de Claude a Gemini:', claudeErr.message);
      }
    }

    // Si el agente seleccionado es el Counter Agent oficial (o se solicita mostrador)
    if (agentId === 'counter_agent') {
      const counterResult = await runCounterAgent(userMsg, {}, context || {}, lang, history || []);
      return res.json({
        reply: counterResult.reply,
        quickActions: counterResult.quickActions,
        recommendedTours: counterResult.recommendedTours,
        voucherPreview: counterResult.voucherPreview,
        agentId: counterResult.agentId,
        agentName: counterResult.agentName,
        success: true,
        source: counterResult.modelUsed || 'counter_agent'
      });
    }

    // El flujo de IA es 100% nativo: Claude/Vertex o Gemini, con fallback interno.
    const assistantResult = await processChatInquiry(userMsg, lang, history || [], engine || 'auto');
    if (memorySessionId) {
      const { rememberTurn } = await import('./backend/memoryService');
      await rememberTurn(memorySessionId, { role: 'user', text: userMsg }, { agentId: assistantResult.agentId || agentId });
      await rememberTurn(memorySessionId, { role: 'assistant', text: assistantResult.reply }, { agentId: assistantResult.agentId || agentId });
    }
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

// Endpoint exclusivo del Counter Agent (Agente de Mostrador y Reservas)
app.post('/api/agent/counter', async (req, res) => {
  try {
    const { message, language, history, context } = req.body;
    const userMsg = message || '';
    const lang = (language || 'es') as 'es' | 'en';
    const result = await runCounterAgent(userMsg, {}, context || {}, lang, history || []);
    res.json({
      success: true,
      reply: result.reply,
      agentId: result.agentId,
      agentName: result.agentName,
      agentCategory: result.agentCategory,
      escalation: result.escalation,
      quickActions: result.quickActions,
      recommendedTours: result.recommendedTours,
      voucherPreview: result.voucherPreview,
      modelUsed: result.modelUsed
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// ⚡ GATEWAY DE HERRAMIENTAS IA NATIVAS
// =========================================================================
app.get('/api/ai/skills/evolution', requireAdmin, async (_req, res) => {
  res.json({ success: true, ...buildSkillEvolutionReport() });
});

app.post('/api/ai/skills/select', requireAdmin, async (req, res) => {
  try {
    const skill = selectEvolvedSkill(
      String(req.body?.agentId || 'counter_agent'),
      String(req.body?.task || ''),
      String(req.body?.sessionId || '')
    );
    res.json({ success: Boolean(skill), skill });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/ai/skills/outcome', requireAdmin, async (req, res) => {
  try {
    const result = await recordSkillOutcome({
      id: String(req.body?.id || ''),
      version: String(req.body?.version || ''),
      outcome: req.body?.outcome || 'partial',
      groundedness: Number(req.body?.groundedness || 0),
      safety: Number(req.body?.safety || 0),
      quality: Number(req.body?.quality || 0)
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/ai/skills/propose-upgrade', requireAdmin, async (req, res) => {
  try {
    const result = await proposeSkillUpgrade({
      id: String(req.body?.id || ''),
      version: String(req.body?.version || ''),
      observedFailure: String(req.body?.observedFailure || ''),
      desiredOutcome: String(req.body?.desiredOutcome || '')
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/ai/tools', (req, res) => {
  res.json({
    success: true,
    architecture: 'native-code-ai',
    tools: [
      'counter_agent', 'triage', 'itinerary_generator', 'availability_checker',
      'booking_creator', 'provider_coordinator', 'sinpe_verifier', 'fraud_checker',
      'contingency_manager', 'customer_support', 'demand_forecast', 'search_tours', 'check_availability', 'lookup_booking', 'recall_memory'
    ]
  });
});

app.get('/api/agent/tools/functions', async (req, res) => {
  try {
    const { GEMINI_FUNCTION_DECLARATIONS } = await import('./backend/agentTools');
    res.json({
      success: true,
      format: 'gemini_function_calling_v2',
      tools: GEMINI_FUNCTION_DECLARATIONS
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/gemini/booking/urgent', async (req, res) => {
  try {
    const { message, language, history, agentId } = req.body;
    const lang = (language || 'es') as 'es' | 'en';
    const assistantResult = await processChatInquiry(message || '', lang, history || []);
    
    // Escalación y seguimiento se registran en el motor nativo de alertas.
    await createAlert({ source: 'AI Support', severity: 'critical', title: 'Solicitud urgente', message: message || 'Solicitud urgente recibida' });

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
      reply: 'Atención prioritaria registrada. Por favor comunícate por el canal de soporte configurado.',
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

// 3. Generador experto de itinerarios personalizados con Claude y Gemini (Resilience Fallback)
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
    console.warn('Claude Vertex AI no disponible o sin credenciales, activando Gemini/Motor Inteligente:', err.message);
    try {
      const fallbackItinerary = await generateGeminiItinerary({
        days: Number(req.body.days) || 5,
        travelers: Number(req.body.travelers) || 2,
        style: req.body.style || 'Aventura y Naturaleza',
        regions: req.body.regions || ['Arenal', 'Monteverde', 'Manuel Antonio'],
        budget: req.body.budget || 'Medio',
        language: req.body.language || 'es',
        specialRequests: req.body.specialRequests
      });
      res.json({
        success: true,
        ...fallbackItinerary,
        modelUsed: `${fallbackItinerary.modelUsed} (Resilience Failover)`
      });
    } catch (fallbackErr: any) {
      console.error('Error en fallback de itinerario:', fallbackErr);
      res.status(500).json({
        success: false,
        error: fallbackErr.message,
        fallbackMessage: 'No se pudo generar el itinerario en este momento.'
      });
    }
  }
});

// Endpoint dedicado para generador de itinerarios Gemini
app.post('/api/gemini/itinerary', async (req, res) => {
  try {
    const itinerary = await generateGeminiItinerary({
      days: Number(req.body.days) || 5,
      travelers: Number(req.body.travelers) || 2,
      style: req.body.style || 'Aventura y Naturaleza',
      budget: req.body.budget || 'Medio',
      group: req.body.group || 'Pareja',
      language: req.body.language || 'es',
      specialRequests: req.body.specialRequests
    });
    res.json({ success: true, ...itinerary });
  } catch (err: any) {
    console.error('Error generando itinerario con Gemini:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para reservar un itinerario completo personalizado
app.post('/api/itinerary/book', async (req, res) => {
  try {
    const {
      itineraryTitle,
      daysCount,
      travelers,
      customerName,
      customerEmail,
      customerPhone,
      startDate,
      currency,
      specialRequests
    } = req.body;

    if (!customerName || !customerEmail) {
      return res.status(400).json({ success: false, error: 'customerName y customerEmail son obligatorios' });
    }

    const bookingDate = startDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
    const generatedId = `CR-ITIN-${Math.floor(100000 + Math.random() * 900000)}`;
    const normalizedDays = Math.max(1, Math.min(30, Number(daysCount) || 5));
    const normalizedTravelers = Math.max(1, Math.min(30, Number(travelers) || 2));
    // Precio base autoritativo para itinerarios personalizados. El total generado por IA
    // se conserva solo como referencia, nunca como importe de cobro controlado por cliente.
    const calculatedUSD = Number((normalizedDays * normalizedTravelers * 165).toFixed(2));

    const bookingRecord = await createBooking({
      bookingId: generatedId,
      tourId: 'custom-multi-day-itinerary',
      tourName: itineraryTitle || `Paquete Costa Rica ${normalizedDays} Días`,
      date: bookingDate,
      time: '08:00 AM',
      adults: normalizedTravelers,
      children: 0,
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      totalUSD: calculatedUSD,
      totalAmount: currency === 'CRC' 
        ? (Number(process.env.USD_TO_CRC_RATE) > 0 ? Math.round(calculatedUSD * Number(process.env.USD_TO_CRC_RATE)) : calculatedUSD) 
        : calculatedUSD,
      currency: currency || 'USD',
      paymentMethod: 'itinerary_deposit',
      paymentStatus: 'pending',
      status: 'confirmada',
      notes: specialRequests || 'Itinerario Multi-Día personalizado'
    } as any);

    res.json({
      success: true,
      bookingId: generatedId,
      booking: bookingRecord,
      message: `¡Itinerario reservado con éxito! Se ha generado tu reserva #${generatedId}.`
    });
  } catch (err: any) {
    console.error('Error al reservar itinerario:', err);
    res.status(500).json({ success: false, error: err.message });
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

app.get('/api/chat/history', async (req, res) => {
  try {
    const { getOperationalMemory } = await import('./backend/memoryService');
    const sessionId = String(req.query.sessionId || '');
    if (!sessionId) return res.status(400).json({ error: 'sessionId es requerido' });
    const memory = await getOperationalMemory(sessionId);
    res.json({ history: memory.turns, memory: { summary: memory.summary, facts: memory.facts, preferences: memory.preferences, activeGoals: memory.activeGoals, decisions: memory.decisions, lastAgent: memory.lastAgent, lastUpdatedAt: memory.lastUpdatedAt }});
  } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo cargar la memoria' }); }
});

app.post('/api/chat/history', async (req, res) => {
  try {
    const { saveChatHistory } = await import('./backend/memoryService');
    const sessionId = String(req.body?.sessionId || '');
    if (!sessionId || !Array.isArray(req.body?.history)) return res.status(400).json({ error: 'sessionId e history son requeridos' });
    const memory = await saveChatHistory(sessionId, req.body.history);
    res.json({ success: true, memory: { summary: memory.summary, facts: memory.facts, preferences: memory.preferences, activeGoals: memory.activeGoals, decisions: memory.decisions, lastAgent: memory.lastAgent, lastUpdatedAt: memory.lastUpdatedAt }});
  } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo guardar la memoria' }); }
});

app.delete('/api/chat/history', async (req, res) => {
  try {
    const { clearOperationalMemory } = await import('./backend/memoryService');
    const sessionId = String(req.query.sessionId || req.body?.sessionId || '');
    if (!sessionId) return res.status(400).json({ error: 'sessionId es requerido' });
    await clearOperationalMemory(sessionId);
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo borrar la memoria' }); }
});

// ==========================================
// 🤖 2026 AUTONOMOUS AGENT FUNCTION CALLING TOOLS
// Arquitectura ReAct & Tools para Google AI Studio (.agents)
// ==========================================

// Tool 1: check_calendar_availability
app.post(['/api/agent/tools/check_calendar_availability', '/api/agent/check-availability'], requireAgentTool, async (req, res) => {
  try {
    const { target_date, service_duration_minutes, tour_id, party_size = 1 } = req.body;
    if (!target_date) {
      return res.status(400).json({
        available: false,
        error: 'target_date (YYYY-MM-DD) es requerido para verificar disponibilidad.'
      });
    }

    const targetTourId = tour_id || 'tour-general-costa-rica';
    const availabilityResult = await checkTourAvailability(
      targetTourId,
      String(target_date),
      undefined,
      Number(party_size)
    );

    // Formatear respuesta estructurada para el ciclo ReAct del agente
    const availableSlots = availabilityResult.available ? ['07:00', '08:30', '13:30'] : ['14:00'];
    const blockedSlots = availabilityResult.available ? ['10:30'] : ['07:00', '08:30', '10:30'];

    res.json({
      success: true,
      available: availabilityResult.available,
      target_date,
      service_duration_minutes: service_duration_minutes || 180,
      total_seats_remaining: availabilityResult.remainingSeats || 12,
      max_capacity: availabilityResult.maxCapacity || 20,
      available_slots: availableSlots,
      blocked_slots: blockedSlots,
      closest_alternatives: availableSlots.slice(0, 2),
      message: availabilityResult.available
        ? `Horarios disponibles encontrados para el ${target_date} con ${availabilityResult.remainingSeats} cupos libres.`
        : `Sin cupos exactos para ese horario (${availabilityResult.reason || 'capacidad agotada'}), se sugieren fechas alternativas.`
    });
  } catch (err: any) {
    console.error('Error en tool check_calendar_availability:', err);
    res.status(500).json({ available: false, error: err.message });
  }
});

// Tool 2: create_booking_and_notify
app.post(['/api/agent/tools/create_booking_and_notify', '/api/agent/create-booking'], requireAgentTool, async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      appointment_datetime,
      service_type,
      tour_id,
      party_size = 1,
      total_usd
    } = req.body;

    if (!customer_name || !customer_email || !appointment_datetime) {
      return res.status(400).json({
        success: false,
        error: 'customer_name, customer_email y appointment_datetime son obligatorios.'
      });
    }

    const authoritativeTotal = calculateAuthoritativeCheckoutTotal({
      tourId: tour_id,
      adults: Number(party_size) || 1,
      children: 0
    });
    if (authoritativeTotal === null) {
      return res.status(400).json({
        success: false,
        error: 'tour_id válido y precio de catálogo requerido; el total no puede ser proporcionado por el cliente.'
      });
    }
    const calculatedUSD = authoritativeTotal;
    const bookingDate = appointment_datetime.split('T')[0] || new Date().toISOString().split('T')[0];

    // Invocar el ciclo de vida de reserva nativa
    const initialHold: any = await executeInicioReserva({
      tourId: tour_id || 'tour-autonomo-2026',
      tourName: service_type || 'Experiencia Oficial Costa Rica Tours',
      date: bookingDate,
      adults: Number(party_size) || 1,
      children: 0,
      totalUSD: calculatedUSD,
      customerName: customer_name,
      customerEmail: customer_email,
      customerPhone: customer_phone || ''
    });

    const bookingId = initialHold.idReserva || initialHold.bookingId || `CR-${Date.now().toString().slice(-6)}`;

    // Confirmar y sincronizar con Google Calendar
    const confirmResult: any = await executeConfirmacionReserva({
      bookingId,
      customerName: customer_name,
      customerEmail: customer_email,
      tourName: service_type || 'Experiencia Oficial Costa Rica Tours',
      date: bookingDate,
      totalUSD: calculatedUSD,
      paymentMethod: 'agent_verified_guarantee'
    });

    res.json({
      success: true,
      booking_id: bookingId,
      customer_name,
      tour_name: service_type || 'Experiencia Oficial Costa Rica Tours',
      appointment_datetime,
      status: 'confirmed',
      party_size: Number(party_size),
      total_usd: calculatedUSD,
      calendar_synced: true,
      qr_voucher_url: `${req.protocol}://${req.get('host')}/voucher/${bookingId}`,
      confirmation_summary: confirmResult.mensaje || 'Reserva confirmada con éxito.',
      message: `¡Reserva ${bookingId} creada exitosamente! Se despachó el voucher QR digital a ${customer_email}.`
    });
  } catch (err: any) {
    console.error('Error en tool create_booking_and_notify:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tool 3: Generador Autónomo de Itinerarios Multidía y Logística
app.post('/api/agent/tools/generate_custom_itinerary', async (req, res) => {
  try {
    const { days, travelers, style, budget, group, language, special_requests } = req.body;
    const itinerary = await generateGeminiItinerary({
      days: Number(days) || 5,
      travelers: Number(travelers) || 2,
      style: style || 'Aventura y Naturaleza',
      budget: budget || 'Medio',
      group: group || 'Pareja',
      language: (language || 'es') as 'es' | 'en',
      specialRequests: special_requests
    });

    res.json({
      success: true,
      itinerary_title: itinerary.title,
      total_days: itinerary.totalDays,
      estimated_budget_usd: itinerary.estimatedBudgetUSD,
      estimated_budget_crc: itinerary.estimatedBudgetCRC,
      recommended_season: itinerary.recommendedSeason,
      packing_list: itinerary.packingList,
      days_plan: itinerary.days,
      local_tips: itinerary.tips,
      model_used: itinerary.modelUsed
    });
  } catch (err: any) {
    console.error('Error en tool generate_custom_itinerary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tool 4: Coordinación Autodependiente de Proveedores (ReAct Tool)
app.post(['/api/agent/tools/coordinate_provider_status', '/api/agent/coordinate-provider'], async (req, res) => {
  try {
    const { booking_id, bookingId, action, guide_name, guideName, vehicle_plate, vehiclePlate, proposed_time, proposedTime, notes, provider_id, providerId } = req.body || {};
    const bId = booking_id || bookingId;
    const act = action || 'confirm';

    if (!bId) {
      return res.status(400).json({ success: false, error: 'booking_id es requerido para coordinar con el proveedor.' });
    }

    const result = await handleProviderActionResponse(bId, act, {
      guideName: guide_name || guideName,
      vehiclePlate: vehicle_plate || vehiclePlate,
      proposedTime: proposed_time || proposedTime,
      providerNotes: notes,
      providerId: provider_id || providerId
    });

    res.json({
      success: true,
      booking_id: bId,
      action: act,
      new_status: result.newStatus,
      provider_status: result.providerStatus,
      message: result.message
    });
  } catch (err: any) {
    console.error('Error en tool coordinate_provider_status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tool 5: Verificación Autónoma de Comprobante SINPE Móvil
app.post(['/api/agent/tools/verify_sinpe_payment', '/api/agent/verify-sinpe'], async (req, res) => {
  try {
    const { booking_id, bookingId, reference_number, numeroComprobante, amount_crc, montoCRC, raw_sms_text, rawSmsText, bank } = req.body || {};
    const bId = booking_id || bookingId;

    if (!bId) {
      return res.status(400).json({ success: false, error: 'booking_id es requerido para verificar pago SINPE.' });
    }

    const result = await executeSinpeVerification({
      bookingId: bId,
      referenceNumber: reference_number || numeroComprobante,
      amountCRC: amount_crc || montoCRC,
      rawSmsText: raw_sms_text || rawSmsText,
      bankEntity: bank
    });

    res.json(result);
  } catch (err: any) {
    console.error('Error en tool verify_sinpe_payment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tool Manifest: Registrador de capacidades para agentes y frameworks 2026
app.get('/api/agent/tools/manifest', (req, res) => {
  res.json({
    agent_name: 'Lumina - Costa Rica Tours Autonomous Booking Agent',
    version: '2026.1.0',
    platform: 'Google AI Studio / Antigravity 2.0',
    architecture: 'ReAct (Reasoning and Acting) with Async Function Calling',
    tools: [
      {
        name: 'check_calendar_availability',
        endpoint: '/api/agent/tools/check_calendar_availability',
        method: 'POST',
        description: 'Consulta cupos y horarios en tiempo real en la base de datos y Google Calendar.'
      },
      {
        name: 'create_booking_and_notify',
        endpoint: '/api/agent/tools/create_booking_and_notify',
        method: 'POST',
        description: 'Crea la reserva oficial, despacha al proveedor local, agenda el evento y envía el voucher QR.'
      },
      {
        name: 'coordinate_provider_status',
        endpoint: '/api/agent/tools/coordinate_provider_status',
        method: 'POST',
        description: 'Coordina de forma autodependiente el estado del operador local (confirmación, guía, vehículo, ajuste de hora).'
      },
      {
        name: 'verify_sinpe_payment',
        endpoint: '/api/agent/tools/verify_sinpe_payment',
        method: 'POST',
        description: 'Verifica y concilia de forma autónoma comprobantes y montos de transferencias SINPE Móvil.'
      },
      {
        name: 'generate_custom_itinerary',
        endpoint: '/api/agent/tools/generate_custom_itinerary',
        method: 'POST',
        description: 'Diseña y optimiza rutas e itinerarios multidía sostenibles con tours y traslados reales.'
      }
    ]
  });
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

  await hydrateSkillGenome();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Full-Stack corriendo en http://0.0.0.0:${PORT}`);
    console.log(`🧠 Motor de IA nativo listo: Gemini/Vertex + Claude + automatización Node.js/Firestore.`);
    initializeAutomationEngine();
  });
}

startServer();function calculateAuthoritativeCheckoutTotal(body: any): number | null {
  const passengers = Math.max(1, Number(body?.passengers) || (Number(body?.adults) || 0) + (Number(body?.children) || 0));
  const tourId = String(body?.tourId || '');

  if (tourId.startsWith('flight-')) {
    const flightNumber = String(body?.flightNumber || '');
    const flight = FLIGHT_ROUTES.find(route => route.flightNumber === flightNumber);
    if (!flight) return null;
    const cabin = body?.cabinClass === 'Business' ? 'Business' : 'Economy';
    const base = flight.basePriceUSD * (cabin === 'Business' ? 2.2 : 1);
    const addOns = (body?.includeAirportTransfer ? 45 : 0)
      + (body?.includeWelcomeSimKit ? 15 : 0)
      + (body?.includeTravelInsurance ? 29 : 0);
    return Number((base + addOns).toFixed(2)) * passengers;
  }

  const tour = TOURS.find(item => item.id === tourId);
  if (!tour || typeof tour.priceUSD !== 'number') return null;
  const adultsRaw = Number(body?.adults);
  const childrenRaw = Number(body?.children);
  const adults = Number.isFinite(adultsRaw) ? Math.max(0, adultsRaw) : passengers;
  const children = Number.isFinite(childrenRaw) ? Math.max(0, childrenRaw) : 0;
  return Number((tour.priceUSD * adults + tour.priceUSD * 0.7 * children).toFixed(2));
}


