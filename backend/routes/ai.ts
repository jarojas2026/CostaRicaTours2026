/**
 * Inteligencia de viaje, operaciones de IA y gateway de modelos.
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import { TOURS } from '../../src/data/toursData';
import { createAlert } from '../alertService';
import { isJunkLeadText } from '../leadTriage';
import { processChatInquiry } from '../aiAssistantService';
import { generateClaudeChatResponse, generateClaudeItinerary, analyzeOperationalRiskWithClaude, getClaudeStatus } from '../claudeService';
import { generateGeminiItinerary } from '../itineraryService';
import { getSelfDevelopmentOverview, runSelfHealingCycle } from '../selfDevelopmentEngine';
import { runEvaluationSuite } from '../agentEvaluationService';
import { buildLearningDataset } from '../learningPipelineService';
import { autonomyPolicy, parseAutonomyLevel } from '../autonomyPolicy';
import { listSkillVersions, selectSkills, registerSkillVersion, recordSkillEvaluation, promoteSkillVersion, rollbackSkillVersion } from '../skillGenome';
import { assessTripFit, buildPackingList, buildRouteStrategy, getDestinationIntelligence, screenActivitySuitability } from '../tourismIntelligenceEngine';
import { performGroundedSearch } from '../groundedSearchService';
import { getPhotoRecommendations } from '../photoRecommendationService';
import { getDemandForecast } from '../demandForecastService';
import { checkFraudRisk } from '../fraudCheckService';
import { createRouter, requireAdmin } from './shared';

/** Inteligencia de viaje de solo lectura. */
export const aiIntelligenceRouter = createRouter();

aiIntelligenceRouter.post('/api/ai/intelligence', (req, res) => {
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

/** Evaluación, aprendizaje, skills y self-dev. */
export const aiOpsRouter = createRouter();

aiOpsRouter.get('/api/ai/evaluation/suite', requireAdmin, async (_req, res) => {
  try { res.json(await runEvaluationSuite()); }
  catch (err: any) { res.status(500).json({ success: false, error: err.message || 'Evaluation error' }); }
});

aiOpsRouter.get('/api/ai/learning/dataset', requireAdmin, async (req, res) => {
  try {
    const dataset = await buildLearningDataset(Number(req.query.limit) || 500);
    res.json(dataset);
  } catch (err: any) { res.status(500).json({ success: false, error: err.message || 'Dataset error' }); }
});

aiOpsRouter.get('/api/ai/autonomy/policy', requireAdmin, (req, res) => {
  const level = parseAutonomyLevel(req.query.level);
  const action = String(req.query.action || 'observe') as any;
  res.json({ success: true, policy: autonomyPolicy(level, action) });
});

aiOpsRouter.get('/api/ai/skills', requireAdmin, (_req, res) => {
  res.json({ success: true, skills: listSkillVersions() });
});

aiOpsRouter.get('/api/ai/skills/select', requireAdmin, (req, res) => {
  const agentId = String(req.query.agentId || 'concierge');
  const task = String(req.query.task || '');
  const level = parseAutonomyLevel(req.query.level);
  res.json({ success: true, skills: selectSkills(agentId, task, level) });
});

aiOpsRouter.get('/api/ai/skills/governance', requireAdmin, (_req, res) => {
  res.json({ success: true, skills: listSkillVersions() });
});

aiOpsRouter.post('/api/ai/skills/register', requireAdmin, async (req, res) => {
  try {
    const skill = await registerSkillVersion(req.body);
    res.status(201).json({ success: true, skill });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'No se pudo registrar la skill' });
  }
});

aiOpsRouter.post('/api/ai/skills/evaluate', requireAdmin, async (req, res) => {
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

aiOpsRouter.post('/api/ai/skills/promote', requireAdmin, async (req, res) => {
  try {
    const result = await promoteSkillVersion(String(req.body?.id || ''), String(req.body?.version || ''), req.body?.target === 'canary' ? 'canary' : 'active');
    res.status(result.success ? 200 : 409).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'No se pudo promover la skill' });
  }
});

aiOpsRouter.post('/api/ai/skills/rollback', requireAdmin, async (req, res) => {
  try {
    const result = await rollbackSkillVersion(String(req.body?.id || ''), String(req.body?.version || ''), String(req.body?.reason || 'manual_rollback'));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'No se pudo revertir la skill' });
  }
});

aiOpsRouter.get('/api/ai/learning/examples', requireAdmin, async (req, res) => {
  try {
    const { buildTrainingExamples } = await import('../learningEngine');
    res.json({ success: true, examples: await buildTrainingExamples(Number(req.query.limit) || 100) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

aiOpsRouter.post('/api/ai/learning/reflect', requireAdmin, async (_req, res) => {
  try {
    const { runLearningReflection } = await import('../learningEngine');
    res.json({ success: true, result: await runLearningReflection(60) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

aiOpsRouter.get('/api/ai/mesh/inbox/:agentId', requireAdmin, async (req, res) => {
  try {
    const { getAgentInbox } = await import('../agentMeshService');
    res.json({ success: true, messages: await getAgentInbox(String(req.params.agentId), Number(req.query.limit) || 20) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

aiOpsRouter.get('/api/self-dev/status', async (req, res) => {
  res.json(await getSelfDevelopmentOverview());
});

aiOpsRouter.post('/api/self-dev/run-healing', requireAdmin, async (req, res) => {
  try {
    const result = await runSelfHealingCycle();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

aiOpsRouter.post('/api/ai/photo-recommendations', async (req, res) => {
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
aiOpsRouter.get('/api/ai/demand-forecast', requireAdmin, async (req, res) => {
  try {
    const result = await getDemandForecast();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

aiOpsRouter.post('/api/ai/fraud-check', requireAdmin, async (req, res) => {
  try {
    const result = await checkFraudRisk(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** ML, Claude y Gemini. */
export const modelGatewayRouter = createRouter();

// Endpoints de Machine Learning y Recomendación Inteligente (motor nativo)
modelGatewayRouter.post('/api/ml/recommend', async (req, res) => {
  try {
    const { mlRecommendTours } = await import('../nativeMlEngine');
    const profile = req.body || {};
    const recommendations = await mlRecommendTours(profile);
    res.json({ success: true, engine: 'native-ml-collab-v3', recommendations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

modelGatewayRouter.post('/api/ml/predict-price', async (req, res) => {
  try {
    const { mlPredictDynamicPrice } = await import('../nativeMlEngine');
    const { basePrice, dateString, seats } = req.body;
    const prediction = mlPredictDynamicPrice(Number(basePrice) || 100, dateString, Number(seats) || 2);
    res.json({ success: true, prediction });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

modelGatewayRouter.post('/api/ml/itinerary', async (req, res) => {
  try {
    const { mlGenerateItinerary } = await import('../nativeMlEngine');
    const { days, style, region } = req.body;
    const itinerary = mlGenerateItinerary(Number(days) || 5, style || 'Aventura y Naturaleza', region || 'Costa Rica');
    res.json({ success: true, itinerary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

modelGatewayRouter.post('/api/gemini/booking/urgent', async (req, res) => {
  try {
    const { message, language, history, agentId } = req.body;
    const lang = (language || 'es') as 'es' | 'en';
    const assistantResult = await processChatInquiry(message || '', lang, history || []);
    
    // Escalación y seguimiento se registran en el motor nativo de alertas.
    // Texto basura ("hola urgente", "test") no cuenta como riesgo crítico.
    const junk = isJunkLeadText(message);
    await createAlert({ source: 'AI Support', severity: junk ? 'info' : 'critical', title: junk ? 'Solicitud urgente sin contenido (triaje: spam)' : 'Solicitud urgente', message: message || 'Solicitud urgente recibida', ...(junk ? { metadata: { triage: 'spam' } } : {}) });

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
modelGatewayRouter.get('/api/claude/status', (req, res) => {
  const status = getClaudeStatus();
  res.json({
    engine: 'Anthropic Claude on Google Cloud Vertex AI',
    sdk: '@anthropic-ai/vertex-sdk',
    ...status
  });
});

// 2. Chat conversacional con Claude 3.5 Sonnet
modelGatewayRouter.post('/api/claude/chat', async (req, res) => {
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
modelGatewayRouter.post('/api/claude/itinerary', async (req, res) => {
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
modelGatewayRouter.post('/api/gemini/itinerary', async (req, res) => {
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

// Compatibilidad: los itinerarios generados son propuestas y nunca se convierten
// directamente en una reserva o un cobro. El flujo canónico es
// planificación -> verificación -> cotización -> aceptación -> reserva/pago.
modelGatewayRouter.post('/api/itinerary/book', async (_req, res) => {
  return res.status(409).json({
    success: false,
    error: 'custom_itinerary_requires_quote',
    message: 'El itinerario generado es una propuesta. Antes de reservar debemos verificar precios, cupos y logística de cada servicio, además de proveedor y condiciones operativas, y preparar una cotización.',
    nextAction: 'request_quote',
    canonicalFlow: ['planning', 'verification', 'quote', 'customer_acceptance', 'booking_payment']
  });
});

// 4. Auditoría operativa y antifraude de reserva con Claude
modelGatewayRouter.post('/api/claude/audit-booking', requireAdmin, async (req, res) => {
  try {
    const booking = req.body.booking || req.body;
    const auditResult = await analyzeOperationalRiskWithClaude(booking);
    res.json({ success: true, audit: auditResult });
  } catch (err: any) {
    console.error('Error auditando reserva con Claude:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Búsqueda e Inteligencia Turística en Vivo con Google Search Grounding (modelo de aiConfig)
modelGatewayRouter.post('/api/gemini/grounded-search', async (req, res) => {
  try {
    const { query, language } = req.body || {};
    const result = await performGroundedSearch(query, language === 'en' ? 'en' : 'es');
    res.json(result);
  } catch (error: any) {
    console.error('Error en /api/gemini/grounded-search:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Error ejecutando búsqueda en vivo.',
      sources: []
    });
  }
});

// Compatibilidad de rutas generales
// Legacy catch-alls used to answer success for anything. They now say plainly
// that the action is not implemented, so no client shows invented results.
modelGatewayRouter.post('/api/workflows/:action', (req, res) => {
  res.status(501).json({ success: false, status: 'not_implemented', error: 'workflow_not_implemented', action: req.params.action });
});

modelGatewayRouter.post('/api/gemini/:action', (req, res) => {
  res.status(501).json({ success: false, status: 'not_implemented', error: 'gemini_action_not_implemented', action: req.params.action });
});
