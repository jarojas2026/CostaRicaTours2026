import crypto from 'crypto';
import { runTriage, processChatInquiry } from './aiAssistantService';
import { sendEmail, sendWhatsAppMessage } from './notificationService';
import { rememberTurn } from './memoryService';
import { getFirestoreDb } from './bookingService';
import { resolveTravelerIdentity } from './travelerIdentityService';
import { adaptTravelerJourney, buildTripJourney } from './travelJourneyOrchestrator';
import { executeBusinessGoal } from './businessGoalOrchestrator';

export interface CustomerIntakePayload {
  message?: string;
  language?: 'es' | 'en';
  sessionId?: string;
  source?: string;
  context?: Record<string, any>;
  customer?: { name?: string; email?: string; phone?: string };
}

function clean(value: unknown, max = 4000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function needsHumanEscalation(intent: string, confidence: number, message: string, extractedData: any) {
  const lower = message.toLowerCase();
  if (extractedData?.mediaType) return { escalated: true, reason: 'El canal recibió contenido multimedia que requiere revisión humana.' };
  const explicitHuman = /humano|asesor|persona|agente|ll[aá]mame|llamada|quiero hablar|quiero que me llamen|human|agent|call me/i.test(lower);
  const sensitive = ['cancellation', 'modification'].includes(intent);
  const complex = /grupo grande|evento|corporativo|boda|problema|reclamo|queja|emergencia|urgente|refund|reembolso/i.test(lower);
  const missingBookingIdentity = sensitive && !extractedData?.bookingId && !extractedData?.email;
  if (explicitHuman) return { escalated: true, reason: 'El cliente solicitó atención humana.' };
  if (confidence < 0.72) return { escalated: true, reason: 'La intención no alcanzó el umbral de confianza autónoma.' };
  if (sensitive || missingBookingIdentity) return { escalated: true, reason: 'La solicitud requiere validación humana antes de ejecutar cambios sensibles.' };
  if (complex) return { escalated: true, reason: 'La solicitud supera el perímetro de resolución autónoma estándar.' };
  return { escalated: false, reason: 'Solicitud dentro del perímetro autónomo.' };
}

function normalizeRequestedRegions(destinations: unknown): string[] {
  if (!Array.isArray(destinations)) return [];
  const normalized = destinations.map(item => clean(item, 120)).filter(Boolean);
  const regions = normalized.map(destination => {
    const value = destination.toLowerCase();
    if (/arenal|fortuna/.test(value)) return 'Arenal';
    if (/monteverde|nuboso/.test(value)) return 'Monteverde';
    if (/manuel antonio|quepos/.test(value)) return 'Manuel Antonio';
    if (/guanacaste|tamarindo|papagayo/.test(value)) return 'Guanacaste';
    if (/pacuare|turrialba/.test(value)) return 'Pacuare';
    if (/tortuguero|caribe|lim[oó]n/.test(value)) return 'Caribe';
    if (/osa|corcovado|uvita|pac[ií]fico sur/.test(value)) return 'Pacífico Sur';
    return destination;
  });
  return Array.from(new Set(regions)).slice(0, 8);
}

function getStructuredJourneyRequest(payload: CustomerIntakePayload) {
  const request = payload.context?.journeyRequest;
  const marked = payload.context?.requestKind === 'custom_multi_day_itinerary' || payload.source === 'custom-trip-funnel';
  if (!marked || !request || typeof request !== 'object') return null;

  const adults = Math.max(0, Math.min(Number(request.adults) || 0, 200));
  const children = Math.max(0, Math.min(Number(request.children) || 0, 200));
  const travelers = Math.max(1, Math.min(Number(request.travelers) || adults + children || 1, 200));
  const days = Math.max(1, Math.min(Number(request.durationDays) || 7, 21));
  const selectedDestinations = Array.isArray(request.selectedDestinations)
    ? request.selectedDestinations.map((item: unknown) => clean(item, 120)).filter(Boolean).slice(0, 8)
    : [];
  const priorities = Array.isArray(request.priorities)
    ? request.priorities.map((item: unknown) => clean(item, 120)).filter(Boolean).slice(0, 12)
    : [];
  const budgetUSD = Number(request.budgetUSD);

  return {
    adults,
    children,
    travelers,
    days,
    startDate: clean(request.startDate, 20),
    arrivalAirport: clean(request.arrivalAirport, 12) || 'SJO',
    departureAirport: clean(request.departureAirport, 12),
    travelMonth: clean(request.travelMonth, 120),
    pace: clean(request.pace, 80) || 'balanced',
    transportType: clean(request.transportType, 80),
    stayStyle: clean(request.stayStyle, 80),
    budgetUSD: Number.isFinite(budgetUSD) && budgetUSD > 0 ? budgetUSD : undefined,
    selectedDestinations,
    regions: normalizeRequestedRegions(selectedDestinations),
    priorities,
    specialRequests: clean(request.specialRequests, 1200),
    requestQuote: request.requestQuote === true,
    addons: request.addons && typeof request.addons === 'object' ? request.addons : {}
  };
}

function missingQuoteInputs(request: ReturnType<typeof getStructuredJourneyRequest>, payload: CustomerIntakePayload) {
  const missing: string[] = [];
  if (!request) return missing;
  if (!request.startDate) missing.push('fecha exacta de inicio');
  if (!clean(payload.customer?.name, 160)) missing.push('nombre del viajero responsable');
  if (!clean(payload.customer?.email, 200)) missing.push('correo electrónico de contacto');
  return missing;
}

function quoteWorkflowStatus(workflow: any, missing: string[], language: 'es' | 'en') {
  if (missing.length) {
    return language === 'en'
      ? `To start operational verification I still need: ${missing.join(', ')}.`
      : `Para iniciar la verificación operativa todavía necesito: ${missing.join(', ')}.`;
  }
  if (!workflow) {
    return language === 'en'
      ? 'You asked for planning only, so no supplier/price verification has been started yet.'
      : 'Elegiste sólo planificación, por lo que todavía no se inició verificación de proveedores/precios.';
  }

  const executionStatus = String(workflow?.verificationExecution?.status || '').toLowerCase();
  if (executionStatus === 'verified') {
    return language === 'en'
      ? 'The configured live verification source returned the required evidence. The next step is an evidence-backed quote before booking or payment.'
      : 'La fuente viva configurada devolvió la evidencia requerida. El siguiente paso es preparar una cotización respaldada por evidencia antes de reservar o cobrar.';
  }
  if (executionStatus === 'human_review' || workflow.customerCommunicationState === 'human_review') {
    return language === 'en'
      ? 'Automated verification reached its safe limit and has been routed for human review. Nothing has been booked or charged.'
      : 'La verificación automática llegó a su límite seguro y quedó encaminada a revisión humana. No se reservó ni cobró nada.';
  }
  return language === 'en'
    ? 'A durable verification task is open for the itinerary components. Availability, provider terms and final prices remain pending until authoritative evidence arrives.'
    : 'Ya quedó abierta una tarea durable de verificación para los componentes del itinerario. Cupos, condiciones del proveedor y precios finales siguen pendientes hasta recibir evidencia autoritativa.';
}

function formatJourneyForCustomer(
  journey: any,
  request: ReturnType<typeof getStructuredJourneyRequest>,
  language: 'es' | 'en',
  workflow?: any,
  missingForQuote: string[] = []
) {
  const days = Array.isArray(journey?.itinerary?.days) ? journey.itinerary.days : [];
  const requested = request?.selectedDestinations?.length
    ? request.selectedDestinations.join(' · ')
    : (language === 'en' ? 'Destinations to be refined' : 'Destinos por definir');
  const priorities = request?.priorities?.length
    ? request.priorities.join(' · ')
    : (language === 'en' ? 'Not specified' : 'No indicadas');

  const dayLines = days.map((day: any) => {
    const title = clean(day?.title, 200) || (language === 'en' ? 'Flexible day' : 'Día flexible');
    const region = clean(day?.region, 120);
    const date = clean(day?.date, 20);
    const morning = clean(day?.morning, 600);
    const afternoon = clean(day?.afternoon, 600);
    const evening = clean(day?.evening, 600);
    const transfer = clean(day?.transfer, 600);
    const stay = clean(day?.stay, 500);
    const status = day?.serviceStatus === 'catalog_option_pending_verification'
      ? (language === 'en' ? 'Catalog option selected; live/provider verification pending.' : 'Opción de catálogo seleccionada; falta verificación viva/con proveedor.')
      : (language === 'en' ? 'Planning block; no supplier or inventory claim.' : 'Bloque de planificación; sin afirmar proveedor ni inventario.');

    if (language === 'en') {
      return [
        `### Day ${day?.day || ''}${date ? ` · ${date}` : ''} — ${title}`,
        region ? `**Area:** ${region}` : '',
        morning ? `- **Morning:** ${morning}` : '',
        afternoon ? `- **Afternoon:** ${afternoon}` : '',
        evening ? `- **Evening:** ${evening}` : '',
        transfer ? `- **Logistics:** ${transfer}` : '',
        stay ? `- **Stay:** ${stay}` : '',
        `- **Status:** ${status}`
      ].filter(Boolean).join('\n');
    }

    return [
      `### Día ${day?.day || ''}${date ? ` · ${date}` : ''} — ${title}`,
      region ? `**Zona:** ${region}` : '',
      morning ? `- **Mañana:** ${morning}` : '',
      afternoon ? `- **Tarde:** ${afternoon}` : '',
      evening ? `- **Noche:** ${evening}` : '',
      transfer ? `- **Logística:** ${transfer}` : '',
      stay ? `- **Alojamiento:** ${stay}` : '',
      `- **Estado:** ${status}`
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  const currentCapacityNote = language === 'en'
    ? 'Any Firestore/catalog capacity signal is internal planning evidence only; it is not treated as provider-confirmed inventory.'
    : 'Cualquier señal de capacidad en Firestore/catálogo se usa sólo como evidencia interna de planificación; no se presenta como inventario confirmado por el proveedor.';
  const workflowNote = quoteWorkflowStatus(workflow, missingForQuote, language);

  if (language === 'en') {
    return [
      `## Your Costa Rica travel plan · ${request?.days || journey?.traveler?.days || ''} days`,
      '### What I understood',
      `- **Travelers:** ${request?.travelers || journey?.traveler?.travelers || ''} (${request?.adults || 0} adults, ${request?.children || 0} children)`,
      `- **Start date:** ${request?.startDate || 'not provided yet'}`,
      `- **Arrival / departure:** ${request?.arrivalAirport || 'SJO'} / ${request?.departureAirport || 'not provided yet'}`,
      `- **Requested places:** ${requested}`,
      `- **Pace:** ${request?.pace || 'balanced'}`,
      `- **Transport preference:** ${request?.transportType || 'not specified'}`,
      `- **Lodging preference:** ${request?.stayStyle || 'not specified'}`,
      `- **Priorities:** ${priorities}`,
      request?.budgetUSD ? `- **Declared trip budget:** $${request.budgetUSD.toLocaleString()} USD (traveler-provided ceiling, not a quote)` : '',
      request?.specialRequests ? `- **Special requests:** ${request.specialRequests}` : '',
      '',
      '### Day-by-day route',
      dayLines || 'The route still needs destination or date details.',
      '',
      '### What this solves now',
      '- The request is treated as one multi-day trip, not as an isolated transport inquiry.',
      '- The route is organized by region and pacing, with one main catalog experience per day when a real match exists.',
      '- Lodging, transfers and secondary activities stay explicitly unconfirmed until their own evidence exists.',
      '',
      '### Reservation / quote status',
      currentCapacityNote,
      workflowNote,
      '**Price:** no final package price has been invented. A final quote requires verified component prices and operating conditions.',
      '',
      `**Journey reference:** ${journey?.journeyId || 'pending'}`,
      `**Next step:** ${workflow?.nextAction || journey?.sales?.nextAction || 'Refine the plan or begin verification.'}`
    ].filter(Boolean).join('\n');
  }

  return [
    `## Tu plan de viaje por Costa Rica · ${request?.days || journey?.traveler?.days || ''} días`,
    '### Lo que entendí de tu solicitud',
    `- **Viajeros:** ${request?.travelers || journey?.traveler?.travelers || ''} (${request?.adults || 0} adultos, ${request?.children || 0} niños)`,
    `- **Fecha de inicio:** ${request?.startDate || 'todavía no indicada'}`,
    `- **Llegada / salida:** ${request?.arrivalAirport || 'SJO'} / ${request?.departureAirport || 'todavía no indicada'}`,
    `- **Lugares solicitados:** ${requested}`,
    `- **Ritmo:** ${request?.pace || 'equilibrado'}`,
    `- **Transporte preferido:** ${request?.transportType || 'no indicado'}`,
    `- **Alojamiento preferido:** ${request?.stayStyle || 'no indicado'}`,
    `- **Prioridades:** ${priorities}`,
    request?.budgetUSD ? `- **Presupuesto declarado:** $${request.budgetUSD.toLocaleString()} USD (tope indicado por el viajero; no es una cotización)` : '',
    request?.specialRequests ? `- **Necesidades/solicitudes especiales:** ${request.specialRequests}` : '',
    '',
    '### Ruta propuesta día por día',
    dayLines || 'La ruta necesita más información de destinos o fechas.',
    '',
    '### Qué resolvimos con esta propuesta',
    '- La solicitud se trata como un solo viaje multidía, no como una consulta aislada de transporte.',
    '- La ruta se organiza por regiones y ritmo, con una experiencia principal del catálogo por día cuando existe una coincidencia real.',
    '- Hospedaje, traslados y actividades secundarias permanecen explícitamente pendientes hasta tener evidencia propia.',
    '',
    '### Estado de cotización / reserva',
    currentCapacityNote,
    workflowNote,
    '**Precio:** no se inventó un total de paquete. La cotización final requiere precios y condiciones verificadas de cada componente.',
    '',
    `**Referencia del viaje:** ${journey?.journeyId || 'pendiente'}`,
    `**Siguiente paso:** ${workflow?.nextAction || journey?.sales?.nextAction || 'Afinar el plan o iniciar verificación.'}`
  ].filter(Boolean).join('\n');
}

async function buildStructuredJourneyAssistant(
  payload: CustomerIntakePayload,
  sessionId: string,
  language: 'es' | 'en',
  intakeId: string
) {
  const request = getStructuredJourneyRequest(payload);
  if (!request) return null;

  const query = [
    request.selectedDestinations.join(', '),
    request.priorities.join(', '),
    request.transportType ? `transport ${request.transportType}` : '',
    request.stayStyle ? `lodging ${request.stayStyle}` : '',
    request.specialRequests
  ].filter(Boolean).join(' · ');

  const journeyInput = {
    sessionId,
    query,
    days: request.days,
    travelers: request.travelers,
    adults: request.adults,
    children: request.children,
    profile: request.stayStyle || undefined,
    pace: request.pace,
    budgetUSD: request.budgetUSD,
    regions: request.regions,
    arrivalAirport: request.arrivalAirport,
    departureAirport: request.departureAirport || undefined,
    date: request.startDate || undefined,
    activities: request.selectedDestinations,
    priorities: request.priorities,
    transportPreference: request.transportType || undefined,
    lodgingPreference: request.stayStyle || undefined,
    specialRequests: request.specialRequests || undefined,
    language
  };
  const existingJourneyId = clean(payload.context?.existingJourneyId, 120);
  let journey: any;
  if (existingJourneyId) {
    const adapted = await adaptTravelerJourney(existingJourneyId, journeyInput);
    journey = adapted?.status === 'not_found'
      ? await buildTripJourney(journeyInput)
      : adapted;
  } else {
    journey = await buildTripJourney(journeyInput);
  }

  const missingForQuote = request.requestQuote ? missingQuoteInputs(request, payload) : [];
  let workflow: any = null;

  if (request.requestQuote && missingForQuote.length === 0) {
    const plannedTourIds = Array.from(new Set(
      (journey?.itinerary?.days || []).map((day: any) => clean(day?.tourId, 160)).filter(Boolean)
    ));

    workflow = await executeBusinessGoal({
      channel: clean(payload.source || 'web', 80) || 'web',
      messageId: intakeId,
      sessionId,
      journeyId: journey.journeyId,
      actor: 'customer',
      intent: 'itinerary_quote',
      message: payload.message,
      requestedGoal: 'itinerary_quote',
      requirements: {
        startDate: request.startDate,
        days: request.days,
        adults: request.adults,
        children: request.children,
        travelers: request.travelers,
        arrivalAirport: request.arrivalAirport,
        departureAirport: request.departureAirport || null,
        regions: request.regions,
        requestedDestinations: request.selectedDestinations,
        catalogTourIds: plannedTourIds,
        pace: request.pace,
        budgetUSD: request.budgetUSD || null,
        transportPreference: request.transportType || null,
        lodgingPreference: request.stayStyle || null,
        priorities: request.priorities,
        specialRequests: request.specialRequests || null,
        customerName: payload.customer?.name || null,
        customerEmail: payload.customer?.email || null,
        customerPhone: payload.customer?.phone || null
      }
    });
  }

  return {
    reply: formatJourneyForCustomer(journey, request, language, workflow, missingForQuote),
    agentId: 'journey_orchestrator',
    journeyId: journey.journeyId,
    workflow
  };
}

function ownerPhone(): string {
  return clean(process.env.OWNER_WHATSAPP_NUMBER || process.env.ADMIN_WHATSAPP_NUMBER || '50687959148', 30).replace(/[^0-9]/g, '');
}

function ownerEmail(): string {
  return clean(process.env.ADMIN_ALERT_EMAIL || process.env.SUPPORT_EMAIL || 'jarojas800@gmail.com', 200);
}

export async function processCustomerIntake(payload: CustomerIntakePayload) {
  const startedAt = Date.now();
  const message = clean(payload.message, 4000);
  const language = payload.language === 'en' ? 'en' : 'es';
  const source = clean(payload.source || 'web', 80) || 'web';
  const requestedSessionId = clean(payload.sessionId, 120) || `web_${crypto.randomUUID()}`;
  const intakeId = `INT-${crypto.randomUUID()}`;
  if (!message) throw new Error('La solicitud del cliente no puede estar vacía.');

  const identity = await resolveTravelerIdentity({
    phone: payload.customer?.phone,
    email: payload.customer?.email,
    sessionId: requestedSessionId,
    channel: source,
    name: payload.customer?.name
  });
  const sessionId = identity.sessionId;
  const triage = await runTriage(message);
  const intent = clean(triage?.intent || 'general_inquiry', 80);
  const confidence = Number.isFinite(Number(triage?.confidence)) ? Number(triage.confidence) : 0.5;
  const extractedData = { ...(triage?.extractedData || {}), customer: payload.customer || undefined, mediaType: payload.context?.mediaType || undefined };
  const structuredJourneyRequest = getStructuredJourneyRequest(payload);
  const escalation = identity.identityConflict
    ? { escalated: true, reason: 'La identidad del viajero presenta señales conflictivas; requiere verificación antes de acciones sensibles.' }
    : structuredJourneyRequest
      ? { escalated: false, reason: 'Planificación multidía estructurada dentro del perímetro autónomo; precio y disponibilidad permanecen sujetos a verificación.' }
      : needsHumanEscalation(intent, confidence, message, extractedData);

  const journeyAssistant = !extractedData.mediaType
    ? await buildStructuredJourneyAssistant(payload, sessionId, language, intakeId)
    : null;
  const assistant = extractedData.mediaType
    ? { reply: language === 'en' ? 'We received your media message. A human agent has been notified and will review it. You can also send the request as text for immediate AI assistance.' : 'Recibimos tu mensaje multimedia. Un agente humano ha sido notificado y lo revisará. También puedes enviar la solicitud por texto para recibir asistencia inmediata de la IA.', agentId: 'customer_intake_gateway' }
    : journeyAssistant || await processChatInquiry(message, language, [], 'auto', sessionId, { allowMutations: !escalation.escalated });
  const reply = clean(assistant?.reply || 'Recibimos tu solicitud y estamos procesándola.', 8000);

  // Persistencia omnicanal: web, WhatsApp y voz pueden continuar el mismo contexto.
  try {
    await rememberTurn(sessionId, { role: 'user', text: message, agentId: 'customer_intake_gateway' }, {
      agentId: 'customer_intake_gateway',
      activeGoal: intent
    });
    await rememberTurn(sessionId, { role: 'assistant', text: reply, agentId: assistant?.agentId || 'concierge' }, {
      agentId: assistant?.agentId || 'concierge',
      decision: escalation.escalated ? `Escalación humana: ${escalation.reason}` : 'Solicitud procesada por IA'
    });
  } catch (memoryError) {
    console.warn('No se pudo persistir la memoria de Customer Intake:', memoryError);
  }

  const ownerSummary = [
    '🧠 NUEVA SOLICITUD PROCESADA POR IA — Costa Rica Tours',
    `ID: ${intakeId}`,
    `Canal: ${source}`,
    `Intención: ${intent} (${Math.round(confidence * 100)}%)`,
    `Estado: ${escalation.escalated ? 'ESCALADA A HUMANO' : 'RESUELTA/EN PROCESO POR IA'}`,
    `Cliente: ${payload.customer?.name || extractedData?.contact?.name || 'No indicado'}`,
    `Email: ${payload.customer?.email || extractedData?.contact?.email || 'No indicado'}`,
    `Teléfono: ${payload.customer?.phone || extractedData?.contact?.phone || 'No indicado'}`,
    `Solicitud: ${message}`,
    `Respuesta IA: ${reply.slice(0, 2500)}`,
    `Motivo: ${escalation.reason}`
  ].join('\n');

  let alertPersisted = false;
  try {
    const { createAlert } = await import('./alertService');
    await createAlert({
      source: 'Customer Intake AI Gateway',
      severity: escalation.escalated ? 'warning' : 'info',
      title: escalation.escalated ? 'Solicitud escalada por IA' : 'Solicitud atendida por IA',
      message: ownerSummary,
      metadata: { intakeId, sessionId, source, intent, confidence, extractedData, escalated: escalation.escalated }
    });
    alertPersisted = true;
  } catch (error) {
    console.warn('No se pudo persistir la alerta de Customer Intake:', error);
  }

  // createAlert ya despacha correo a ADMIN_ALERT_EMAIL. Solo usamos el
  // correo configurado de soporte como fallback para evitar duplicados.
  const emailResult = process.env.ADMIN_ALERT_EMAIL
    ? { success: true }
    : await sendEmail({
        to: ownerEmail(),
        subject: `${escalation.escalated ? '🚨 Escalación' : '🧠 IA atendió'} — ${intent} — ${intakeId}`,
        text: ownerSummary,
        html: `<h2>${escalation.escalated ? '🚨 Solicitud escalada' : '🧠 Solicitud procesada por IA'}</h2><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${ownerSummary.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>`
      }).catch(error => ({ success: false, error: error?.message || 'email error' }));

  const whatsappResult = await sendWhatsAppMessage({
    toPhone: ownerPhone(),
    customerName: 'Operador Costa Rica Tours',
    message: ownerSummary.slice(0, 3500)
  }).catch(error => ({ success: false, directDispatched: false, url: '', error: error?.message || 'whatsapp error' }));

  const handoffUrl = escalation.escalated && !whatsappResult.directDispatched ? whatsappResult.url : undefined;

  return {
    success: true,
    intakeId,
    sessionId,
    source,
    identity: { canonicalId: identity.canonicalId, matchedBy: identity.matchedBy },
    triage: { intent, confidence, extractedData },
    decision: { autonomous: !escalation.escalated, escalated: escalation.escalated, reason: escalation.reason },
    customer: {
      reply,
      canContinueWithAI: !escalation.escalated,
      humanHandoffAvailable: escalation.escalated,
      handoffUrl
    },
    journey: journeyAssistant?.journeyId ? {
      journeyId: journeyAssistant.journeyId,
      workflow: journeyAssistant.workflow || null
    } : undefined,
    operatorNotification: {
      email: emailResult.success,
      whatsapp: Boolean(whatsappResult.directDispatched),
      alertPersisted
    },
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString()
  };
}


export async function enqueueCustomerIntakeJob(
  payload: CustomerIntakePayload,
  options: { replyToWhatsApp?: string; messageId?: string } = {}
): Promise<{ jobId: string }> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no está disponible para persistir la cola de Customer Intake.');
  const jobId = `CIJ-${crypto.randomUUID()}`;
  await db.collection('customer_intake_jobs').doc(jobId).set({
    jobId,
    payload,
    replyToWhatsApp: clean(options.replyToWhatsApp, 40).replace(/[^0-9]/g, '') || null,
    messageId: clean(options.messageId, 180) || null,
    status: 'queued',
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return { jobId };
}

export async function processCustomerIntakeJob(jobId: string): Promise<any> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no está disponible para procesar Customer Intake.');
  const ref = db.collection('customer_intake_jobs').doc(String(jobId || '').trim());
  const claim = await db.runTransaction(async (tx: any) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return null;
    const job = snapshot.data() || {};
    const now = Date.now();
    const processingAt = job.processingAt ? Date.parse(String(job.processingAt)) : 0;
    const stale = job.status === 'processing' && processingAt > 0 && now - processingAt > 5 * 60 * 1000;
    if (job.status === 'completed' || job.status === 'failed' || (job.status === 'processing' && !stale)) return null;
    const attempts = Number(job.attempts || 0) + 1;
    if (attempts > 3) {
      tx.update(ref, { status: 'failed', attempts, error: 'Máximo de reintentos alcanzado.', updatedAt: new Date().toISOString() });
      return null;
    }
    tx.update(ref, {
      status: 'processing',
      attempts,
      processingAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return { ...job, attempts };
  });

  if (!claim) return { success: true, skipped: true, jobId };

  try {
    let result: any;
    if (claim.result?.customerReply) {
      result = {
        success: true,
        intakeId: claim.result.intakeId,
        sessionId: claim.result.sessionId,
        decision: claim.result.decision,
        customer: { reply: claim.result.customerReply },
        operatorNotification: claim.result.operatorNotification
      };
    } else {
      result = await processCustomerIntake(claim.payload || {});
      await ref.set({
        result: {
          intakeId: result.intakeId,
          sessionId: result.sessionId,
          decision: result.decision,
          operatorNotification: result.operatorNotification,
          customerReply: result.customer.reply
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    if (claim.replyToWhatsApp) {
      await sendWhatsAppMessage({
        toPhone: claim.replyToWhatsApp,
        customerName: claim.payload?.customer?.name || 'Viajero',
        message: result.customer.reply
      });
    }
    await ref.set({
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return result;
  } catch (error: any) {
    const message = error?.message || 'Error procesando Customer Intake.';
    await ref.set({
      status: Number(claim.attempts || 1) >= 3 ? 'failed' : 'queued',
      error: message,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    throw error;
  }
}

export async function processPendingCustomerIntakeJobs(limit = 10): Promise<{ processed: number; failed: number }> {
  const db = getFirestoreDb();
  if (!db) return { processed: 0, failed: 0 };
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 25));
  const queued = await db.collection('customer_intake_jobs')
    .where('status', '==', 'queued')
    .limit(safeLimit)
    .get();
  let processed = 0;
  let failed = 0;
  for (const doc of queued.docs) {
    try {
      const result = await processCustomerIntakeJob(doc.id);
      if (!result?.skipped) processed++;
    } catch {
      failed++;
    }
  }
  return { processed, failed };
}
