import crypto from 'crypto';
import { askCounterDesk } from './counterDeskService';
import { rememberTurn } from './memoryService';
import { getFirestoreDb } from './bookingService';
import { resolveTravelerIdentity } from './travelerIdentityService';

export type VoiceCallContext = {
  callId: string;
  from?: string;
  to?: string;
  hotelId?: string;
  hotelName?: string;
  room?: string;
  language?: 'es' | 'en';
  startedAt: string;
};

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xml(parts: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${parts.join('')}</Response>`;
}

function say(text: string, language: 'es' | 'en' = 'es') {
  const voice = language === 'en' ? 'Polly.Joanna' : 'Polly.Mia';
  const lang = language === 'en' ? 'en-US' : 'es-MX';
  return `<Say language="${lang}" voice="${voice}">${esc(text)}</Say>`;
}

function gather(action: string, language: 'es' | 'en') {
  const lang = language === 'en' ? 'en-US' : 'es-MX';
  return `<Gather input="speech dtmf" language="${lang}" speechTimeout="auto" timeout="5" action="${esc(action)}" method="POST" actionOnEmptyResult="true" numDigits="1" bargeIn="true"></Gather>`;
}

function humanNumbers() {
  return (process.env.VOICE_HUMAN_NUMBERS || process.env.VOICE_HUMAN_NUMBER || '')
    .split(',').map(value => value.trim()).filter(value => /^\+[1-9]\d{7,14}$/.test(value)).slice(0, 8);
}

export function voiceHumanTransferAvailable() {
  return humanNumbers().length > 0;
}

function gatherWithSilenceCount(action: string, language: 'es' | 'en', silenceCount: number) {
  const url = new URL(action);
  url.searchParams.set('silenceCount', String(silenceCount));
  return gather(url.toString(), language);
}

const TERMINAL_CALL_STATUSES = new Set(['completed', 'busy', 'failed', 'no-answer', 'canceled', 'cancelled']);

export function buildVoiceCallStatusUpdate(status: string, now = new Date().toISOString()) {
  const normalized = String(status || 'unknown').trim().toLowerCase().slice(0, 40) || 'unknown';
  return {
    status: normalized,
    updatedAt: now,
    ...(TERMINAL_CALL_STATUSES.has(normalized) ? { endedAt: now } : {})
  };
}

export function buildVoiceTransferStatusUpdate(status: string, now = new Date().toISOString()) {
  const normalized = String(status || 'unknown').trim().toLowerCase().slice(0, 40) || 'unknown';
  return {
    humanTransferStatus: normalized,
    humanTransferUpdatedAt: now,
    ...(normalized === 'completed' ? { humanTransferredAt: now } : {})
  };
}

export function voiceAgentDeskConfig() {
  return {
    enabled: Boolean(process.env.VOICE_AGENT_DESK_ENABLED === 'true'),
    provider: 'twilio-compatible',
    publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.APP_URL || '',
    inboundPath: '/api/voice/incoming',
    responsePath: '/api/voice/respond',
    statusPath: '/api/voice/status',
    humanTransferConfigured: voiceHumanTransferAvailable(),
    humanTransferLabel: process.env.VOICE_HUMAN_LABEL || 'Agent Desk humano',
    hotelIntegrationMode: 'DID/SIP/PBX-forwarding',
    contextFields: ['hotelId', 'hotelName', 'room', 'language'],
    capabilities: [
      'recepción de llamadas',
      'atención turística por voz',
      'memoria por llamada',
      'contexto de hotel/habitación',
      'transferencia a agente humano',
      'continuidad con Counter Desk y agentes IA',
      'integración portable por internet'
    ]
  };
}

function configuredOrThrow() {
  if (process.env.VOICE_AGENT_DESK_ENABLED !== 'true') {
    throw new Error('Voice Agent Desk no está habilitado.');
  }
}

export function verifyVoiceSignature(url: string, params: Record<string, string>, signature?: string) {
  const authToken = process.env.VOICE_PROVIDER_AUTH_TOKEN;
  if (!authToken || !signature) return false;
  const sorted = Object.keys(params).sort();
  const payload = url + sorted.map(key => key + params[key]).join('');
  const expected = crypto.createHmac('sha1', authToken).update(payload).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createInboundVoiceResponse(input: {
  callId: string;
  language?: 'es' | 'en';
  hotelName?: string;
  room?: string;
  responseUrl: string;
  humanTransferAvailable?: boolean;
}) {
  configuredOrThrow();
  const language = input.language === 'en' ? 'en' : 'es';
  const transferPrompt = input.humanTransferAvailable
    ? (language === 'en' ? ' Speak after the tone, or press 0 to reach a human agent.' : ' Hable después del tono, o marque 0 para comunicarse con un agente.')
    : (language === 'en' ? ' Speak after the tone and tell me how I can help.' : ' Hable después del tono y dígame cómo puedo ayudarle.');
  const greeting = language === 'en'
    ? `Welcome to the Costa Rica Tours Agent Desk${input.hotelName ? ` at ${input.hotelName}` : ''}. I can help with tours, availability, routes, reservations and local information.${transferPrompt}`
    : `Bienvenido al Agent Desk de Costa Rica Tours${input.hotelName ? ` en ${input.hotelName}` : ''}. Puedo ayudarle con tours, disponibilidad, rutas, reservas e información local.${transferPrompt}`;
  const parts = [
    say(greeting, language),
    gather(input.responseUrl, language)
  ];
  return xml(parts);
}

export function createHumanTransferResult(input: {
  status: string;
  responseUrl: string;
  language?: 'es' | 'en';
}) {
  if (String(input.status || '').toLowerCase() === 'completed') return xml([]);
  const language = input.language === 'en' ? 'en' : 'es';
  const message = language === 'en'
    ? 'No human agent answered. I can keep helping you; please tell me what you need or press 0 to try the Agent Desk again.'
    : 'No contestó un agente humano. Puedo seguir ayudándole; dígame qué necesita o marque 0 para volver a intentar con el Agent Desk.';
  return xml([say(message, language), gatherWithSilenceCount(input.responseUrl, language, 0)]);
}

export async function handleVoiceTurn(input: {
  callId: string;
  speech?: string;
  digits?: string;
  language?: 'es' | 'en';
  hotelId?: string;
  hotelName?: string;
  room?: string;
  responseUrl: string;
  humanTransferUrl?: string;
  from?: string;
  silenceCount?: number;
}) {
  configuredOrThrow();
  const language = input.language === 'en' ? 'en' : 'es';
  const textInput = String(input.speech || '').trim();
  const digits = String(input.digits || '').trim();

  if (digits === '0' && input.humanTransferUrl && humanNumbers().length > 0) {
    return xml([
      say(language === 'en' ? 'Connecting you with our Agent Desk team.' : 'Le conecto con nuestro equipo del Agent Desk.', language),
      `<Dial timeout="30" answerOnBridge="true" action="${esc(input.humanTransferUrl)}" method="POST">${humanNumbers().map(number => `<Number>${esc(number)}</Number>`).join('')}</Dial>`
    ]);
  }

  if (!textInput && !digits) {
    const nextSilenceCount = Math.max(0, Math.min(3, Number(input.silenceCount) || 0)) + 1;
    if (nextSilenceCount >= 3) {
      const transferAvailable = Boolean(input.humanTransferUrl && voiceHumanTransferAvailable());
      if (transferAvailable) {
        return xml([
          say(language === 'en' ? 'I have not heard a response. I will try to connect you with a human agent.' : 'No he recibido respuesta. Intentaré comunicarle con un agente humano.', language),
          `<Dial timeout="30" answerOnBridge="true" action="${esc(input.humanTransferUrl!)}" method="POST">${humanNumbers().map(number => `<Number>${esc(number)}</Number>`).join('')}</Dial>`
        ]);
      }
      return xml([
        say(language === 'en' ? 'I still cannot hear you. Please call again when convenient. Goodbye.' : 'Todavía no puedo escucharle. Puede llamar de nuevo cuando guste. Hasta luego.', language),
        '<Hangup/>'
      ]);
    }
    return xml([
      say(language === 'en' ? 'I did not hear you. Please tell me what you need.' : 'No pude escucharle. Dígame qué necesita.', language),
      gatherWithSilenceCount(input.responseUrl, language, nextSilenceCount)
    ]);
  }

  if (digits && digits !== '0') {
    return xml([
      say(language === 'en' ? 'Please speak your request, or press 0 for a human agent.' : 'Diga lo que necesita o marque 0 para hablar con un agente humano.', language),
      gatherWithSilenceCount(input.responseUrl, language, 0)
    ]);
  }

  if (digits === '0') {
    return xml([
      say(language === 'en' ? 'A human agent is not available right now. Please tell me what you need.' : 'No hay un agente humano disponible en este momento. Dígame qué necesita.', language),
      gatherWithSilenceCount(input.responseUrl, language, 0)
    ]);
  }

  const identity = await resolveTravelerIdentity({
    phone: input.from,
    sessionId: `voice_${input.callId}`,
    channel: 'voice',
    name: input.hotelName ? `Viajero en ${input.hotelName}` : undefined
  });
  const sessionId = identity.sessionId;

  // Conflicting traveler identities are never auto-merged during a voice interaction.
  if (identity.identityConflict) {
    const transferAvailable = Boolean(input.humanTransferUrl && humanNumbers().length > 0);
    const message = language === 'en'
      ? 'For your security, I need a human agent to verify your traveler information before continuing.'
      : 'Por seguridad, necesito que un agente humano verifique sus datos de viajero antes de continuar.';
    return xml([
      say(message, language),
      ...(transferAvailable
        ? [
            say(language === 'en' ? 'Please hold while I connect you.' : 'Espere un momento mientras le conecto.', language),
            `<Dial timeout="30" answerOnBridge="true" action="${esc(input.humanTransferUrl!)}" method="POST">${humanNumbers().map(number => `<Number>${esc(number)}</Number>`).join('')}</Dial>`
          ]
        : [gather(input.responseUrl, language)])
    ]);
  }

  const contextualMessage = [
    textInput || `DTMF request: ${digits}`,
    input.hotelName ? `Hotel: ${input.hotelName}` : '',
    input.room ? `Habitación: ${input.room}` : ''
  ].filter(Boolean).join(' | ');

  const result = await askCounterDesk({
    message: contextualMessage,
    sessionId,
    language,
    context: {
      channel: 'voice',
      travelerIdentityId: identity.canonicalId,
      callId: input.callId,
      hotelId: input.hotelId,
      hotelName: input.hotelName,
      room: input.room
    }
  });

  const spoken = result.reply || (language === 'en'
    ? 'I can continue helping you. Please tell me what you would like to arrange.'
    : 'Puedo seguir ayudándole. Dígame qué desea organizar.');

  await rememberTurn(sessionId, { role: 'user', text: contextualMessage }, { agentId: 'voice_agent_desk' });
  await rememberTurn(sessionId, { role: 'assistant', text: spoken }, { agentId: 'voice_agent_desk' });

  return xml([
    say(spoken.slice(0, 4000), language),
    gatherWithSilenceCount(input.responseUrl, language, 0)
  ]);
}

export async function rememberVoiceCallStart(context: VoiceCallContext) {
  const db = getFirestoreDb();
  if (db) {
    await db.collection('voice_call_sessions').doc(context.callId).set({
      ...context,
      channel: 'voice',
      status: 'in_progress',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }
  const identity = await resolveTravelerIdentity({ phone: context.from, sessionId: `voice_${context.callId}`, channel: 'voice' });
  await rememberTurn(identity.sessionId, {
    role: 'assistant',
    text: [
      'Inicio de llamada Agent Desk',
      context.hotelName ? `Hotel: ${context.hotelName}` : '',
      context.room ? `Habitación: ${context.room}` : '',
      context.from ? `Origen: ${context.from}` : ''
    ].filter(Boolean).join(' | ')
  }, { agentId: 'voice_agent_desk' });
}

export async function rememberVoiceCallEnd(callId: string, status: string) {
  const db = getFirestoreDb();
  const update = buildVoiceCallStatusUpdate(status);
  if (db) {
    await db.collection('voice_call_sessions').doc(callId).set({
      ...update
    }, { merge: true });
  }
}

export async function rememberVoiceCallStatus(callId: string, status: string) {
  const db = getFirestoreDb();
  if (!db) return;
  await db.collection('voice_call_sessions').doc(callId).set({
    ...buildVoiceCallStatusUpdate(status)
  }, { merge: true });
}

export async function rememberVoiceHumanTransferStatus(callId: string, status: string) {
  const db = getFirestoreDb();
  if (db) {
    await db.collection('voice_call_sessions').doc(callId).set({
      ...buildVoiceTransferStatusUpdate(status)
    }, { merge: true });
  }
}


export async function getVoiceCallSession(callId: string) {
  const db = getFirestoreDb();
  if (!db) return null;
  const doc = await db.collection('voice_call_sessions').doc(callId).get();
  return doc.exists ? { callId: doc.id, ...doc.data() } : null;
}
