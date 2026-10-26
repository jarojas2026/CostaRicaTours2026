/**
 * Conserje de voz "JARVIS" (prototipo, costo $0).
 *
 * Lógica pura y sin red: el conserje responde solo con lo que la plataforma ya
 * tiene en el navegador (catálogo de tours, regiones, cómo reservar, contacto)
 * reutilizando el entendimiento determinista del concierge
 * (backend/conciergeUnderstanding.ts, sin modelo de IA ni claves).
 *
 * Reglas (docs/REGLAS_PLATAFORMA.md):
 *  - Nunca confirma reservas, precios finales ni pagos: lo deriva a una
 *    solicitud (lead) que revisa una persona del equipo.
 *  - Los precios del catálogo son referencias "sujeto a confirmación".
 *  - No se guarda audio: el navegador entrega texto (Web Speech API) y solo
 *    texto entra al historial, que vive en privateStorage (visitante =
 *    sessionStorage; usuario = clave por uid, se borra al cerrar sesión).
 *  - Preguntas no cubiertas se marcan como `capabilityGap`. Hoy la plataforma
 *    no tiene un registro de "capability gaps": solo se marca en la respuesta
 *    (sin backend nuevo) para conectarlo cuando exista.
 */

import type { CatalogTourLike } from './tripRequestParser';
import { understandConciergeMessage, deterministicConciergeReply } from '../../backend/conciergeUnderstanding';
import { formatUsdReference } from './referencePrice';
import { whatsappInquiryUrl } from './directWhatsApp';

export type VoiceLanguage = 'es' | 'en';

/** Interruptor del prototipo: VITE_VOICE_CONCIERGE=off lo apaga sin tocar código. */
export function isVoiceConciergeEnabled(flag: string | undefined | null): boolean {
  return String(flag ?? '').trim().toLowerCase() !== 'off';
}

/** Idiomas de voz soportados: todo lo que no es español usa inglés. */
export function voiceLanguageOf(language: string | undefined | null): VoiceLanguage {
  return language === 'es' ? 'es' : 'en';
}

export function voiceLocaleFor(language: string | undefined | null): string {
  return voiceLanguageOf(language) === 'es' ? 'es-CR' : 'en-US';
}

export interface VoiceSupport {
  /** SpeechRecognition / webkitSpeechRecognition (Chrome, Edge; Safari parcial). */
  recognition: boolean;
  /** speechSynthesis + SpeechSynthesisUtterance. */
  synthesis: boolean;
}

/** Detecta soporte sin lanzar errores (SSR, Firefox, navegadores sin API). */
export function detectVoiceSupport(win: unknown = typeof window !== 'undefined' ? window : undefined): VoiceSupport {
  const w = win as any;
  if (!w) return { recognition: false, synthesis: false };
  return {
    recognition: typeof (w.SpeechRecognition || w.webkitSpeechRecognition) === 'function',
    synthesis: Boolean(w.speechSynthesis) && typeof w.SpeechSynthesisUtterance === 'function',
  };
}

// ---------------------------------------------------------------- hotel mode

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Acepta solo slugs simples (a-z, 0-9, guiones, máx. 60). Cualquier otra cosa se ignora. */
export function sanitizeHotelSlug(raw: string | null | undefined): string | undefined {
  const slug = String(raw ?? '').trim().toLowerCase();
  if (!slug || slug.length > 60 || !SLUG_RE.test(slug)) return undefined;
  return slug;
}

/** Lee ?hotel=slug de un query string. */
export function hotelSlugFromSearch(search: string | null | undefined): string | undefined {
  try {
    return sanitizeHotelSlug(new URLSearchParams(search || '').get('hotel'));
  } catch {
    return undefined;
  }
}

export function hotelDisplayName(slug: string): string {
  return slug.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function voiceConciergeGreeting(language: string, hotelSlug?: string): string {
  const es = voiceLanguageOf(language) === 'es';
  const slug = sanitizeHotelSlug(hotelSlug);
  if (slug) {
    const hotel = hotelDisplayName(slug);
    return es
      ? `¡Pura Vida! Bienvenido a ${hotel}. Soy tu conserje de voz: pregúntame por tours, regiones o cómo reservar. Toca el micrófono o escribe.`
      : `Pura Vida! Welcome to ${hotel}. I'm your voice concierge: ask me about tours, regions or how to book. Tap the mic or type.`;
  }
  return es
    ? '¡Pura Vida! Soy tu conserje de voz de Costa Rica Tours: pregúntame por tours, regiones o cómo reservar. Toca el micrófono o escribe.'
    : "Pura Vida! I'm the Costa Rica Tours voice concierge: ask me about tours, regions or how to book. Tap the mic or type.";
}

// ---------------------------------------------------------------- answers

export type VoiceIntent = 'greeting' | 'booking_handoff' | 'how_to_book' | 'contact' | 'regions' | 'tours' | 'capability_gap';

export interface VoiceTourLine {
  tourId: string;
  title: string;
  referenceLine?: string;
}

export interface VoiceConciergeAnswer {
  intent: VoiceIntent;
  language: VoiceLanguage;
  reply: string;
  tours?: VoiceTourLine[];
  /** Ofrecer "Enviar solicitud al equipo" (lead con aprobación humana). */
  offerRequest: boolean;
  /** Borrador de WhatsApp (no envía nada por sí solo). */
  whatsappUrl?: string;
  /** Pregunta que la plataforma no cubre todavía. */
  capabilityGap: boolean;
}

const REGION_LABELS: Record<string, string> = {
  arenal: 'Arenal / La Fortuna', monteverde: 'Monteverde', manuel_antonio: 'Manuel Antonio', guanacaste: 'Guanacaste',
  tortuguero: 'Tortuguero', pacuare: 'Pacuare', san_jose: 'San José', sjo: 'San José', caribe: 'Caribe', caribe_sur: 'Caribe Sur',
  osa: 'Osa', marino_ballena: 'Marino Ballena', perez_zeledon: 'Pérez Zeledón', dominical: 'Dominical', uvita: 'Uvita',
  puerto_viejo: 'Puerto Viejo', cahuita: 'Cahuita', jaco: 'Jacó', cartago: 'Cartago', turrialba: 'Turrialba',
  corcovado: 'Corcovado', golfo_dulce: 'Golfo Dulce', central_pacific: 'Pacífico Central', sarapiqui: 'Sarapiquí',
  los_santos: 'Los Santos', golfito: 'Golfito',
};

export function regionLabel(region: string): string {
  return REGION_LABELS[region] || region.replace(/_/g, ' ');
}

const normalize = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const ES_WORDS = /\b(hola|como|quiero|queremos|que|hay|tienen|cuanto|cuesta|donde|necesito|puedo|para|personas|reserv\w*|el|la|los|las|de|con|por|una?|mi|hablar)\b/g;
const EN_WORDS = /\b(hello|hi|how|what|where|want|need|can|could|do|does|i|is|are|there|book|people|the|my|for|with|please|talk)\b/g;

/**
 * Idioma de la respuesta: el elegido en la página (también es el idioma del
 * reconocimiento de voz). Solo cambia si el texto está claramente en el otro
 * idioma (≥2 palabras de diferencia), para que "¿Cómo reservo un tour?" siga en español.
 */
export function voiceReplyLanguage(text: string, uiLanguage?: string | null): VoiceLanguage {
  const t = normalize(String(text || ''));
  const es = (t.match(ES_WORDS) || []).length;
  const en = (t.match(EN_WORDS) || []).length;
  const ui = voiceLanguageOf(uiLanguage ?? 'es');
  if (ui === 'es' && en - es >= 2) return 'en';
  if (ui === 'en' && es - en >= 2) return 'es';
  return ui;
}

const BOOK_ACTION_RE = /\b(reserv\w*|book(ing|ed)?|confirm\w*|pag(ar|o|ue|a)|pay(ment)?|cobr\w*|charge|checkout|tarjeta|card|sinpe|deposit\w*|precio final|final price|apart\w*)\b/;
const HOW_RE = /\b(como|how( do| can)?|pasos|steps|proceso|process)\b/;
const CONTACT_RE = /\b(contact\w*|whatsapp|telefono|phone|llamar|call|correo|email|hablar con|talk to|humano|human|persona|agente|agent)\b/;
const REGIONS_RE = /\b(regiones|region|zonas|areas|donde|where|destinos|destinations)\b/;
const TOURS_RE = /\b(tours?|actividad\w*|activit\w*|excursion\w*|que hacer|what to do|things to do|recomienda\w*|recommend\w*|sugier\w*|suggest\w*)\b/;
const GREETING_RE = /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hello|hi|hey|good (morning|afternoon|evening)|pura vida|ayuda|help)\b[\s!.?,]*$/;

function titleOf(tour: CatalogTourLike, language: VoiceLanguage): string {
  const title = (tour as any).title;
  if (typeof title === 'string') return title;
  return String(title?.[language] || title?.es || tour.id);
}

function tourLine(tour: CatalogTourLike, language: VoiceLanguage): VoiceTourLine {
  const es = language === 'es';
  return {
    tourId: tour.id,
    title: titleOf(tour, language),
    ...(tour.priceUSD > 0 ? {
      referenceLine: es
        ? `desde ${formatUsdReference(tour.priceUSD)} por persona (referencia, sujeto a confirmación)`
        : `from ${formatUsdReference(tour.priceUSD)} per person (reference, subject to confirmation)`,
    } : {}),
  };
}

const HANDOFF = {
  es: 'No puedo confirmar reservas, precios finales ni pagos. Te preparo una solicitud y una persona del equipo te confirma por escrito operador, precio final y cupo antes de cualquier pago.',
  en: "I can't confirm bookings, final prices or payments. I'll prepare a request and a person from our team will confirm the operator, final price and availability in writing before any payment.",
};

/**
 * Responde una pregunta con datos de la plataforma. Determinista y sin red.
 * `tours` es el catálogo público ya cargado en el navegador.
 */
export function answerVoiceConcierge(
  message: string,
  tours: readonly CatalogTourLike[],
  options: { language?: string; now?: Date } = {},
): VoiceConciergeAnswer {
  const raw = String(message || '').slice(0, 1000).trim();
  const text = normalize(raw);
  const language: VoiceLanguage = voiceReplyLanguage(raw, options.language);
  const u = understandConciergeMessage(raw, tours, { requestedLanguage: language, now: options.now });
  const es = language === 'es';
  const draft = (body: string) => whatsappInquiryUrl(body, language);
  const base = { language, capabilityGap: false } as const;

  if (!raw || GREETING_RE.test(text)) {
    return { ...base, intent: 'greeting', offerRequest: false, reply: voiceConciergeGreeting(language) };
  }

  // 1) Reservar, pagar, confirmar o precio final: nunca se confirma, se deriva a una solicitud.
  if (BOOK_ACTION_RE.test(text) && !HOW_RE.test(text)) {
    const extra = u.quote ? (es ? ` Referencia del catálogo: ${u.quote.line}.` : ` Catalog reference: ${u.quote.line}.`) : '';
    return { ...base, intent: 'booking_handoff', offerRequest: true, whatsappUrl: draft(raw), reply: `${HANDOFF[language]}${extra}` };
  }

  // 2) Cómo reservar.
  if (HOW_RE.test(text) && BOOK_ACTION_RE.test(text)) {
    return {
      ...base, intent: 'how_to_book', offerRequest: true, whatsappUrl: draft(raw),
      reply: es
        ? 'Así funciona: 1) eliges el tour y la fecha; 2) envías una solicitud desde aquí o por WhatsApp; 3) el equipo confirma por escrito operador, precio final y cupo; 4) recién entonces recibes un enlace de pago seguro. Nada se cobra antes de esa confirmación.'
        : 'Here is how it works: 1) pick the tour and date; 2) send a request from here or on WhatsApp; 3) our team confirms the operator, final price and availability in writing; 4) only then you get a secure payment link. Nothing is charged before that confirmation.',
    };
  }

  // 3) Contacto: la plataforma gestiona la solicitud (no se muestran contactos de proveedores).
  if (CONTACT_RE.test(text)) {
    return {
      ...base, intent: 'contact', offerRequest: true, whatsappUrl: draft(raw),
      reply: es
        ? 'Puedes escribirnos por WhatsApp con el botón de abajo o enviar una solicitud desde aquí. Nosotros gestionamos todo con el operador; no necesitas contactar al negocio.'
        : 'You can message us on WhatsApp with the button below or send a request from here. We handle everything with the operator; no need to contact the business.',
    };
  }

  // 4) Consulta concreta (actividad/lugar + detalle): entendimiento determinista del concierge.
  if (u.isConcreteInquiry) {
    // El motor determinista arma sus líneas en el idioma que detecta; se respeta para no mezclar idiomas.
    const lang: VoiceLanguage = u.understood.language;
    const reply = (deterministicConciergeReply(u) || '').split('\n').filter(l => !/WhatsApp/i.test(l)).join('\n');
    const picks = u.understood.tourId
      ? tours.filter(t => t.id === u.understood.tourId)
      : tours.filter(t => u.suggestions?.some(s => s.tourId === t.id));
    return {
      ...base, language: lang, intent: 'tours', offerRequest: true,
      whatsappUrl: u.inquiryHandoff?.whatsappUrl || draft(raw),
      tours: picks.slice(0, 3).map(t => tourLine(t, lang)),
      reply: `${reply}\n${lang === 'es' ? 'Si quieres, envío la solicitud al equipo para confirmarla.' : 'If you like, I can send the request to our team to confirm it.'}`,
    };
  }

  // 5) Actividad o lugar sin detalle: ideas del catálogo.
  const region = u.understood.region;
  const activity = u.understood.activity;
  if (region || activity || u.understood.tourId) {
    const pool = tours.filter(t => (!region || t.region === region)
      && (!activity || normalize(`${t.id} ${titleOf(t, language)} ${(t as any).category || ''}`).includes(normalize(activity.split('_')[0]))));
    const picks = (pool.length ? pool : tours.filter(t => !region || t.region === region)).slice(0, 3);
    if (picks.length) {
      const where = region ? regionLabel(region) : '';
      return {
        ...base, intent: 'tours', offerRequest: true, whatsappUrl: draft(raw),
        tours: picks.map(t => tourLine(t, language)),
        reply: es
          ? `Algunas ideas del catálogo${where ? ` en ${where}` : ''}: ${picks.map(t => titleOf(t, language)).join('; ')}. Los precios son de referencia y se confirman antes de reservar. ¿Para cuántas personas y qué fecha?`
          : `Some catalog ideas${where ? ` in ${where}` : ''}: ${picks.map(t => titleOf(t, language)).join('; ')}. Prices are references and get confirmed before booking. For how many people and what date?`,
      };
    }
  }

  // 6) Regiones disponibles.
  if (REGIONS_RE.test(text) || TOURS_RE.test(text)) {
    const counts = new Map<string, number>();
    for (const t of tours) counts.set(t.region, (counts.get(t.region) || 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([r]) => regionLabel(r));
    return {
      ...base, intent: 'regions', offerRequest: false,
      reply: es
        ? `Tenemos ${tours.length} tours en el catálogo. Las regiones con más opciones son: ${top.join(', ')}. Dime una región o actividad (rafting, volcán, ballenas, canopy…) y te doy ideas.`
        : `We have ${tours.length} tours in the catalog. The regions with the most options are: ${top.join(', ')}. Tell me a region or activity (rafting, volcano, whales, zipline…) and I'll share ideas.`,
    };
  }

  // 7) No cubierto: se marca como capability gap y se ofrece la solicitud humana.
  return {
    ...base, intent: 'capability_gap', capabilityGap: true, offerRequest: true, whatsappUrl: draft(raw),
    reply: es
      ? 'Todavía no tengo esa información en la plataforma. Puedo enviar tu pregunta al equipo para que te responda una persona.'
      : "I don't have that information on the platform yet. I can send your question to our team so a person can answer.",
  };
}

// ---------------------------------------------------------------- speech output

/** Limpia markdown y viñetas para leer en voz alta. */
export function textForSpeech(text: string): string {
  return String(text || '')
    .replace(/\[TOUR:[^\]]+\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_#`>|•]/g, '')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 1200);
}

export interface SynthLike {
  speak(utterance: any): void;
  cancel(): void;
}

/**
 * Lee un texto con speechSynthesis (voz del sistema, sin servicios pagos).
 * Devuelve false si no hay soporte: la UI sigue funcionando solo con texto.
 */
export function speakWithSynthesis(
  synth: SynthLike | null | undefined,
  Utterance: (new (text: string) => any) | null | undefined,
  text: string,
  language: string,
  handlers: { onEnd?: () => void } = {},
): boolean {
  if (!synth || typeof Utterance !== 'function') return false;
  const clean = textForSpeech(text);
  if (!clean) return false;
  synth.cancel();
  const utterance = new Utterance(clean);
  utterance.lang = voiceLocaleFor(language);
  utterance.rate = 1;
  utterance.onend = () => handlers.onEnd?.();
  utterance.onerror = () => handlers.onEnd?.();
  synth.speak(utterance);
  return true;
}

// ---------------------------------------------------------------- transcript (texto, nunca audio)

export interface VoiceTranscriptEntry {
  id: string;
  sender: 'guest' | 'concierge';
  text: string;
  via?: 'voice' | 'text';
  intent?: VoiceIntent;
  capabilityGap?: boolean;
  offerRequest?: boolean;
  whatsappUrl?: string;
  tours?: VoiceTourLine[];
}

/** Clave en privateStorage (prefijo personal `chat_history_`: visitante = sessionStorage). */
export const VOICE_TRANSCRIPT_KEY = 'chat_history_voice_concierge';
export const VOICE_TRANSCRIPT_MAX = 40;

/** Serializa solo campos de texto conocidos: nunca audio, blobs ni data URLs. */
export function serializeTranscript(entries: readonly VoiceTranscriptEntry[]): string {
  const safe = entries.slice(-VOICE_TRANSCRIPT_MAX).map(e => ({
    id: String(e.id).slice(0, 80),
    sender: e.sender === 'guest' ? 'guest' : 'concierge',
    text: String(e.text || '').replace(/data:[^\s]+/g, '').slice(0, 2000),
    ...(e.via ? { via: e.via } : {}),
    ...(e.intent ? { intent: e.intent } : {}),
    ...(e.capabilityGap ? { capabilityGap: true } : {}),
    ...(e.offerRequest ? { offerRequest: true } : {}),
    ...(e.whatsappUrl && /^https:\/\/wa\.me\//.test(e.whatsappUrl) ? { whatsappUrl: e.whatsappUrl } : {}),
    ...(e.tours?.length ? { tours: e.tours.slice(0, 3).map(t => ({ tourId: t.tourId, title: t.title, ...(t.referenceLine ? { referenceLine: t.referenceLine } : {}) })) } : {}),
  }));
  return JSON.stringify(safe);
}

export function parseTranscript(raw: string | null | undefined): VoiceTranscriptEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return JSON.parse(serializeTranscript(parsed.filter(e => e && typeof e.text === 'string')));
  } catch {
    return [];
  }
}
