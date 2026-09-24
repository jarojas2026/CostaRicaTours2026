import { runTriage, processChatInquiry } from './aiAssistantService';
import { sendEmail, sendWhatsAppMessage } from './notificationService';

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
  const sessionId = clean(payload.sessionId, 120) || `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (!message) throw new Error('La solicitud del cliente no puede estar vacía.');

  const triage = await runTriage(message);
  const intent = clean(triage?.intent || 'general_inquiry', 80);
  const confidence = Number.isFinite(Number(triage?.confidence)) ? Number(triage.confidence) : 0.5;
  const extractedData = { ...(triage?.extractedData || {}), customer: payload.customer || undefined };
  const escalation = needsHumanEscalation(intent, confidence, message, extractedData);

  const assistant = await processChatInquiry(message, language, [], 'auto', sessionId);
  const intakeId = `INT-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const reply = clean(assistant?.reply || 'Recibimos tu solicitud y estamos procesándola.', 8000);

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

  const emailResult = await sendEmail({
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
