import { knowledgeToolReply } from '../knowledgeReplies';
import crypto from 'crypto';
/**
 * Agentes de IA y sus herramientas internas.
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import { verifyChatSessionAccess } from '../signedAccessTokens';
import { TOURS } from '../../src/data/toursData';
import { FLIGHT_ROUTES } from '../../src/data/flightsData';
import { checkTourAvailability } from '../bookingService';
import { processChatInquiry, runCounterAgent, runTriage, runProcessor, runContingency, runSupervisor, logException } from '../aiAssistantService';
import { generateClaudeChatResponse } from '../claudeService';
import { generateGeminiItinerary } from '../itineraryService';
import { executeInicioReserva } from '../nativeAutomationEngine';
import { handleProviderActionResponse } from '../nativeWorkflows';
import { executeSinpeVerification } from '../sinpeService';
import { buildSkillEvolutionReport, selectEvolvedSkill, recordSkillOutcome, proposeSkillUpgrade } from '../skillEvolutionEngine';
import { createRouter, chatSessionTokenFrom, requireAdmin, requireAgentTool } from './shared';
import { captureLeadInBackground } from '../leadPipeline';
import { understandConciergeMessage, deterministicConciergeReply, type ConciergeUnderstanding } from '../conciergeUnderstanding';

/** Structured, deterministic fields attached to every concierge response. */
function conciergeStructuredFields(u: ConciergeUnderstanding | null) {
  if (!u) return {};
  return {
    understood: u.understood,
    isConcreteInquiry: u.isConcreteInquiry,
    ...(u.quote ? { quote: u.quote } : {}),
    ...(u.inquiryHandoff ? { inquiryHandoff: u.inquiryHandoff } : {}),
  };
}

/** Agentes, concierge, counter y skills. */
export const agentsRouter = createRouter();

// ==========================================
// 🤖 AGENTES DEL ENJAMBRE (TRIAGE, PROCESADOR, SUPERVISOR)
// ==========================================

agentsRouter.post('/api/agents/triage', requireAdmin, async (req, res) => {
  const result = await runTriage(req.body.rawMessage || '');
  res.json(result);
});

agentsRouter.post('/api/agents/processor', requireAdmin, async (req, res) => {
  const { rawMessage, intent, extractedData } = req.body;
  const result = await runProcessor(rawMessage || '', intent || '', extractedData || {});
  res.json(result);
});

agentsRouter.post('/api/agents/contingency', requireAdmin, async (req, res) => {
  const result = await runContingency(req.body);
  res.json(result);
});

agentsRouter.post('/api/agents/supervisor', requireAdmin, async (req, res) => {
  const result = await runSupervisor();
  res.json(result);
});

agentsRouter.post('/api/agents/log_exception', requireAdmin, (req, res) => {
  const { agentName, errorContext, rawData } = req.body;
  logException(agentName || 'UnknownAgent', errorContext || 'Error', rawData);
  res.json({ success: true });
});

agentsRouter.post('/api/gemini/concierge', async (req, res) => {
  // Deterministic understanding runs first and never depends on the AI model.
  let understanding: ConciergeUnderstanding | null = null;
  try {
    understanding = understandConciergeMessage(String(req.body?.message || ''), TOURS, { requestedLanguage: req.body?.language });
  } catch (extractErr: any) {
    console.warn('Concierge understanding failed:', extractErr?.message);
  }
  const structured = conciergeStructuredFields(understanding);
  const deterministicReply = understanding ? deterministicConciergeReply(understanding) : undefined;
  try {
    const { message, language, history, agentId, context, engine, sessionId } = req.body;
    const userMsg = message || '';
    const requestedMemorySession = String(sessionId || context?.sessionId || '');
    // Memory is only read/written for a session the caller proves it owns.
    const memorySessionId = verifyChatSessionAccess(requestedMemorySession, chatSessionTokenFrom(req)) ? requestedMemorySession : '';
    const lang = (language || 'es') as 'es' | 'en';

    // Pipeline de leads: una consulta concreta crea/actualiza un lead sin datos
    // personales (el chat no recoge consentimiento). Nunca bloquea la respuesta.
    if (understanding?.isConcreteInquiry) {
      captureLeadInBackground({
        source: 'sofia',
        understanding,
        message: userMsg,
        sessionId: requestedMemorySession ? crypto.createHash('sha256').update(requestedMemorySession).digest('hex').slice(0, 32) : undefined,
        consent: false,
      });
    }
    
    // Si se especifica o prefiere motor Claude 3.5 Sonnet
    if (engine === 'claude') {
      try {
        const claudeResult = await generateClaudeChatResponse(userMsg, lang, history || []);
        return res.json({
          reply: claudeResult.reply,
          quickActions: claudeResult.quickActions || [],
          success: true,
          source: 'claude_vertex',
          modelUsed: claudeResult.modelUsed,
          ...structured
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
        source: counterResult.modelUsed || 'counter_agent',
        ...structured
      });
    }

    // El flujo de IA es 100% nativo: Claude/Vertex o Gemini, con fallback interno.
    const assistantResult = await processChatInquiry(userMsg, lang, history || [], engine || 'auto', memorySessionId || undefined);
    if (memorySessionId) {
      const { rememberTurn } = await import('../memoryService');
      await rememberTurn(memorySessionId, { role: 'user', text: userMsg }, { agentId: assistantResult.agentId || agentId });
      await rememberTurn(memorySessionId, { role: 'assistant', text: assistantResult.reply }, { agentId: assistantResult.agentId || agentId });
    }
    // No model answered (no AI key / knowledge-base fallback): a concrete
    // inquiry gets the deterministic summary instead of a generic text.
    const modelAnswered = Boolean(assistantResult.modelUsed);
    // Sin modelo: primero las herramientas verificables (emergencias, guías ICT, parques SINAC, tours por presupuesto).
    const toolReply = modelAnswered ? undefined : knowledgeToolReply(userMsg, lang);
    res.json({
      reply: toolReply ?? (!modelAnswered && deterministicReply ? deterministicReply : assistantResult.reply),
      quickActions: assistantResult.quickActions,
      success: true,
      source: assistantResult.modelUsed || (toolReply ? 'knowledge_tools' : deterministicReply ? 'deterministic_extraction' : 'gemini_fallback'),
      modelUsed: assistantResult.modelUsed,
      sources: assistantResult.sources || [],
      ...structured
    });
  } catch (err: any) {
    const toolReply = knowledgeToolReply(String(req.body?.message || ''), req.body?.language === 'en' ? 'en' : 'es');
    if (toolReply) {
      return res.json({ reply: toolReply, success: true, source: 'knowledge_tools', aiAvailable: false, ...structured });
    }
    if (deterministicReply) {
      return res.json({
        reply: deterministicReply,
        success: true,
        source: 'deterministic_extraction',
        aiAvailable: false,
        ...structured
      });
    }
    res.json({
      reply: '¡Pura Vida! Ocurrió un inconveniente temporal al conectar con el motor de IA. Por favor intenta de nuevo o escríbenos a nuestro WhatsApp oficial.',
      success: false,
      error: err.message,
      ...structured
    });
  }
});

// Endpoint exclusivo del Counter Agent (Agente de Mostrador y Reservas)
agentsRouter.post('/api/agent/counter', async (req, res) => {
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
agentsRouter.get('/api/ai/skills/evolution', requireAdmin, async (_req, res) => {
  res.json({ success: true, ...buildSkillEvolutionReport() });
});

agentsRouter.post('/api/ai/skills/select', requireAdmin, async (req, res) => {
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

agentsRouter.post('/api/ai/skills/outcome', requireAdmin, async (req, res) => {
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

agentsRouter.post('/api/ai/skills/propose-upgrade', requireAdmin, async (req, res) => {
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

agentsRouter.get('/api/ai/tools', (req, res) => {
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

agentsRouter.get('/api/agent/tools/functions', async (req, res) => {
  try {
    const { GEMINI_FUNCTION_DECLARATIONS } = await import('../agentTools');
    res.json({
      success: true,
      format: 'gemini_function_calling_v2',
      tools: GEMINI_FUNCTION_DECLARATIONS
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Herramientas internas de agentes. */
export const agentToolsRouter = createRouter();

// ==========================================
// 🤖 2026 AUTONOMOUS AGENT FUNCTION CALLING TOOLS
// Arquitectura ReAct & Tools para Google AI Studio (.agents)
// ==========================================

// Tool 1: check_calendar_availability
agentToolsRouter.post(['/api/agent/tools/check_calendar_availability', '/api/agent/check-availability'], requireAgentTool, async (req, res) => {
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

    // Only report what the inventory actually returned. Time slots are not
    // invented: the departure time is confirmed by the provider afterwards.
    res.json({
      success: true,
      available: availabilityResult.available,
      target_date,
      service_duration_minutes: Number(service_duration_minutes) || null,
      total_seats_remaining: availabilityResult.available ? availabilityResult.remainingSeats ?? null : 0,
      max_capacity: availabilityResult.maxCapacity ?? null,
      available_slots: [],
      slots_status: 'pending_provider_confirmation',
      reason: availabilityResult.available ? undefined : (availabilityResult.reason || 'sin_disponibilidad_verificada'),
      message: availabilityResult.available
        ? `Hay cupo registrado para el ${target_date}${availabilityResult.remainingSeats != null ? ` (${availabilityResult.remainingSeats} cupos)` : ''}. El horario exacto se confirma con el proveedor.`
        : `No hay disponibilidad verificada para el ${target_date} (${availabilityResult.reason || 'sin confirmar'}). No se sugieren horarios inventados.`
    });
  } catch (err: any) {
    console.error('Error en tool check_calendar_availability:', err);
    res.status(500).json({ available: false, error: err.message });
  }
});

// Tool 2: create_booking_and_notify
agentToolsRouter.post(['/api/agent/tools/create_booking_and_notify', '/api/agent/create-booking'], requireAgentTool, async (req, res) => {
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
    const [bookingDate, rawTime] = String(appointment_datetime).split('T');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate || '')) {
      return res.status(400).json({ success: false, error: 'appointment_datetime debe incluir fecha YYYY-MM-DD.' });
    }
    const requestedHHMM = /^\d{2}:\d{2}/.test(rawTime || '') ? String(rawTime).slice(0, 5) : '';
    // Map the requested HH:MM to a real catalog departure (e.g. "08:00 AM").
    const catalogTour: any = TOURS.find((item: any) => item.id === tour_id);
    const bookingTime = (catalogTour?.departureTimes || []).find((departure: string) => {
      const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(String(departure).trim());
      if (!match) return false;
      let hours = Number(match[1]) % 12;
      if ((match[3] || '').toUpperCase() === 'PM') hours += 12;
      if (!match[3]) hours = Number(match[1]);
      return `${String(hours).padStart(2, '0')}:${match[2]}` === requestedHHMM;
    }) as string | undefined;
    if (!bookingTime) {
      return res.status(409).json({
        success: false,
        error: 'departure_time_not_in_catalog',
        available_departures: catalogTour?.departureTimes || [],
        message: 'appointment_datetime debe incluir una hora (HH:MM) que coincida con una salida del catálogo del tour.'
      });
    }

    // Invocar el ciclo de vida de reserva nativa
    const initialHold: any = await executeInicioReserva({
      tourId: tour_id || 'tour-autonomo-2026',
      tourName: service_type || 'Experiencia Costa Rica Tours',
      date: bookingDate,
      time: bookingTime,
      adults: Number(party_size) || 1,
      children: 0,
      totalUSD: calculatedUSD,
      customerName: customer_name,
      customerEmail: customer_email,
      customerPhone: customer_phone || ''
    });

    if (!initialHold.exito) {
      return res.status(409).json({ success: false, error: initialHold.motivo || 'No fue posible bloquear el cupo.' });
    }
    const bookingId = initialHold.idReserva || initialHold.bookingId;
    res.json({
      success: true,
      booking_id: bookingId,
      customer_name,
      tour_name: service_type || 'Experiencia Costa Rica Tours',
      time: bookingTime,
      voucher_issued: false,
      notifications_sent: [],
      appointment_datetime,
      status: 'pending_payment',
      party_size: Number(party_size),
      total_usd: calculatedUSD,
      calendar_synced: false,
      payment_required: true,
      message: 'Reserva creada y cupo retenido temporalmente. La confirmación y el voucher requieren verificación real del pago.'
    });
  } catch (err: any) {
    console.error('Error en tool create_booking_and_notify:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tool 3: Generador Autónomo de Itinerarios Multidía y Logística
agentToolsRouter.post('/api/agent/tools/generate_custom_itinerary', async (req, res) => {
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
agentToolsRouter.post(['/api/agent/tools/coordinate_provider_status', '/api/agent/coordinate-provider'], requireAgentTool, async (req, res) => {
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
agentToolsRouter.post(['/api/agent/tools/verify_sinpe_payment', '/api/agent/verify-sinpe'], requireAgentTool, async (req, res) => {
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
agentToolsRouter.get('/api/agent/tools/manifest', requireAgentTool, (req, res) => {
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

function calculateAuthoritativeCheckoutTotal(body: any): number | null {
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
