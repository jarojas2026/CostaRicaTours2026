import crypto from 'crypto';
import { askCounterDesk } from './counterDeskService';
import { rememberTurn } from './memoryService';

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
  return `<Gather input="speech dtmf" language="${lang}" speechTimeout="auto" timeout="5" action="${esc(action)}" method="POST" actionOnEmptyResult="true" numDigits="1"></Gather>`;
}

function humanNumbers() {
  return (process.env.VOICE_HUMAN_NUMBERS || process.env.VOICE_HUMAN_NUMBER || '')
    .split(',').map(value => value.trim()).filter(Boolean).slice(0, 8);
}

export function voiceAgentDeskConfig() {
  return {
    enabled: Boolean(process.env.VOICE_AGENT_DESK_ENABLED === 'true'),
    provider: 'twilio-compatible',
    publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.APP_URL || '',
    inboundPath: '/api/voice/incoming',
    responsePath: '/api/voice/respond',
    statusPath: '/api/voice/status',
    humanTransferConfigured: humanNumbers().length > 0,
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
  if (!authToken) return true;
  if (!signature) return false;
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
  const greeting = language === 'en'
    ? `Welcome to the Costa Rica Tours Agent Desk${input.hotelName ? ` at ${input.hotelName}` : ''}. I can help with tours, availability, routes, reservations and local information. Speak after the tone, or press 0 to reach a human agent.`
    : `Bienvenido al Agent Desk de Costa Rica Tours${input.hotelName ? ` en ${input.hotelName}` : ''}. Puedo ayudarle con tours, disponibilidad, rutas, reservas e información local. Hable después del tono, o marque 0 para comunicarse con un agente.`;
  const parts = [
    say(greeting, language),
    gather(input.responseUrl, language)
  ];
  if (input.humanTransferAvailable) {
    parts.push(say(language === 'en' ? 'Press 0 at any time for a human agent.' : 'Marque 0 en cualquier momento para hablar con un agente humano.', language));
  }
  parts.push(`<Redirect method="POST">${esc(input.responseUrl)}</Redirect>`);
  return xml(parts);
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
}) {
  configuredOrThrow();
  const language = input.language === 'en' ? 'en' : 'es';
  const textInput = String(input.speech || '').trim();
  const digits = String(input.digits || '').trim();

  const operators = humanNumbers();
  if (digits === '0' && input.humanTransferUrl && operators.length > 0) {
    const targets = operators.map(number => `<Number>${esc(number)}</Number>`).join('');
    return xml([
      say(language === 'en' ? 'Connecting you with our Agent Desk team.' : 'Le conecto con nuestro equipo del Agent Desk.', language),
      `<Dial action="${esc(input.humanTransferUrl)}" method="POST">${targets}</Dial>`
    ]);
  }

  if (!textInput && !digits) {
    return xml([
      say(language === 'en' ? 'I did not hear you. Please tell me what you need.' : 'No pude escucharle. Dígame qué necesita.', language),
      gather(input.responseUrl, language)
    ]);
  }

  const sessionId = `voice_${input.callId}`;
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
      callId: input.callId,
      hotelId: input.hotelId,
      hotelName: input.hotelName,
      room: input.room
    }
  });

  const spoken = result.reply || (language === 'en'
    ? 'I can continue helping you. Please tell me what you would like to arrange.'
    : 'Puedo seguir ayudándole. Dígame qué desea organizar.');

  return xml([
    say(spoken.slice(0, 4000), language),
    gather(input.responseUrl, language),
    `<Redirect method="POST">${esc(input.responseUrl)}</Redirect>`
  ]);
}

export async function rememberVoiceCallStart(context: VoiceCallContext) {
  await rememberTurn(`voice_${context.callId}`, {
    role: 'system',
    text: [
      'Inicio de llamada Agent Desk',
      context.hotelName ? `Hotel: ${context.hotelName}` : '',
      context.room ? `Habitación: ${context.room}` : '',
      context.from ? `Origen: ${context.from}` : ''
    ].filter(Boolean).join(' | ')
  }, { agentId: 'voice_agent_desk' });
}

export async function rememberVoiceCallEnd(callId: string, status: string) {
  await rememberTurn(`voice_${callId}`, {
    role: 'system',
    text: `Fin de llamada Agent Desk. Estado: ${status}`
  }, { agentId: 'voice_agent_desk' });
}
