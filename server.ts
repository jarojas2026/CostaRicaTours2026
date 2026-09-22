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