import crypto from 'crypto';
import { runTriage, processChatInquiry } from './aiAssistantService';
import { sendEmail, sendWhatsAppMessage } from './notificationService';
import { rememberTurn } from './memoryService';
import { getFirestoreDb } from './bookingService';
import { resolveTravelerIdentity } from './travelerIdentityService';

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
  const complex = /grupo grande|evento|corporativo|boda|luna de miel|multi.?destino|personalizado|problema|reclamo|queja|emergencia|urgente|refund|reembolso/i.test(lower);
  const missingBookingIdentity = sensitive && !extractedData?.bookingId && !extractedData?.email;
  if (explicitHuman) return { escalated: true, reason: 'El cliente solicitó atención humana.' };
  if (confidence < 0.72) return { escalated: true, reason: 'La intención no alcanzó el umbral de confianza autónoma.' };
  if (sensitive || missingBookingIdentity) return { escalated: true, reason: 'La solicitud requiere validación humana antes de ejecutar cambios sensibles.' };
  if (complex) return { escalated: true, reason: 'La solicitud supera el perímetro de resolución autónoma estándar.' };
  return { escalated: false, reason: 'Solicitud dentro del perímetro autónomo.' };
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
  const escalation = identity.identityConflict
    ? { escalated: true, reason: 'La identidad del viajero presenta señales conflictivas; requiere verificación antes de acciones sensibles.' }
    : needsHumanEscalation(intent, confidence, message, extractedData);

  const assistant = extractedData.mediaType
    ? { reply: language === 'en' ? 'We received your media message. A human agent has been notified and will review it. You can also send the request as text for immediate AI assistance.' : 'Recibimos tu mensaje multimedia. Un agente humano ha sido notificado y lo revisará. También puedes enviar la solicitud por texto para recibir asistencia inmediata de la IA.', agentId: 'customer_intake_gateway' }
    : await processChatInquiry(message, language, [], 'auto', sessionId, { allowMutations: !escalation.escalated });
  const intakeId = `INT-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
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
  const jobId = `CIJ-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
