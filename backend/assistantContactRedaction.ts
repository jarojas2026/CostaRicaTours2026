/**
 * Redacción en servidor de contactos de negocios/proveedores en el asistente.
 *
 * Política pública (src/data/publicContactPolicy.ts): al cliente nunca se le da teléfono,
 * WhatsApp, correo, web ni dirección exacta de negocios o proveedores; la plataforma
 * gestiona la solicitud. Excepción: servicios públicos de emergencia y entes oficiales
 * (911, CCSS/hospitales, policía, bomberos, Cruz Roja, SINAC/gobierno .go.cr).
 *
 * Se aplica en dos capas:
 *  1. Resultados de herramientas de conocimiento (nearest_services, search_operator_tours,
 *     park_info, find_guides, search_tours…) antes de que el modelo los vea.
 *  2. El texto de la respuesta (`reply`) antes de enviarlo al cliente.
 */
import type { NextFunction, Request, Response } from 'express';
import { isPublicEmergencyPoi } from '../src/data/publicContactPolicy';

/** Herramientas de solo lectura cuyo resultado llega (vía el modelo) al cliente. */
export const CLIENT_FACING_TOOLS = new Set([
  'nearest_services', 'search_operator_tours', 'park_info', 'find_guides', 'search_tours',
  'destination_intelligence', 'season_advice', 'check_availability', 'quote_price', 'cancellation_policy',
]);

/** Dominios oficiales (gobierno / emergencias / la propia plataforma) que sí se pueden mostrar. */
const OFFICIAL_HOST = /(^|\.)(go\.cr|sa\.cr|cruzroja\.or\.cr|ac\.cr|costaricatours2026\.vercel\.app)$/i;
/** Palabras que identifican un servicio oficial/emergencia en la misma línea que un teléfono. */
const OFFICIAL_CONTEXT = /\b(911|ccss|ebais|hospital|cl[ií]nica\s+ccss|polic[ií]a|fuerza\s+p[uú]blica|bomberos|cruz\s+roja|sinac|oij|tr[aá]nsito|emergencia|emergency|police|fire\s+department|red\s+cross)\b/i;

const CONTACT_KEY = /^(phone|phones|telefono|tel[eé]fono|whatsapp|phoneWhatsapp|email|correo|website|web|sitioWeb|url|sourceUrl|inquirySourceUrl|address|direccion|direcci[oó]n|contact|contacts|operatorPhone|operatorEmail|operatorWhatsapp|operatorWebsite|providerContact)$/i;

const EMAIL_RE = /[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>()"']+/gi;
const WHATSAPP_RE = /\b(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/[^\s<>()"']*/gi;
// +506 8888-8888, (506) 2222 3333, 8888-8888, 2222 3333… (≥ 8 dígitos). 911 y similares no coinciden.
const PHONE_RE = /(?<![\w/.-])\+?\(?\d{1,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?(?![\w/-])/g;
const DATE_LIKE = /^\d{4}-\d{2}-\d{2}$|^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/;

const PLACEHOLDER = { es: '[contacto gestionado por Costa Rica Tours]', en: '[contact handled by Costa Rica Tours]' } as const;

function hostOf(raw: string): string {
  try { return new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname; } catch { return ''; }
}

/** Quita teléfonos, WhatsApp, correos y webs de negocios de un texto; conserva los oficiales. */
export function redactBusinessContactsText(text: string, language: 'es' | 'en' = 'es'): string {
  const ph = PLACEHOLDER[language];
  return String(text ?? '')
    .split('\n')
    .map((line) => {
      let out = line
        .replace(WHATSAPP_RE, ph)
        .replace(URL_RE, (m) => (OFFICIAL_HOST.test(hostOf(m.replace(/[.,;:!?)\]]+$/, ''))) ? m : ph))
        .replace(EMAIL_RE, (m, host) => (OFFICIAL_HOST.test(host) ? m : ph));
      out = out.replace(PHONE_RE, (m, offset: number, whole: string) => {
        const digits = m.replace(/\D/g, '');
        if (digits.length < 8 || DATE_LIKE.test(m.trim())) return m;
        // Oficial solo si el ente oficial se nombra en la misma frase, justo antes del número.
        const before = whole.slice(Math.max(0, offset - 80), offset);
        const clause = before.split(/[.;•|]|\s[-–—]\s/).pop() || '';
        return OFFICIAL_CONTEXT.test(clause) ? m : ph;
      });
      return out.replace(new RegExp(`(${ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s,;/·-]*){2,}`, 'g'), `${ph} `);
    })
    .join('\n');
}

const round2 = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 100) / 100 : n);

function stripContactKeys(value: unknown, depth = 0): unknown {
  if (depth > 8) return value;
  if (typeof value === 'string') return redactBusinessContactsText(value);
  if (Array.isArray(value)) return value.map((v) => stripContactKeys(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (CONTACT_KEY.test(k)) continue;
      out[k] = stripContactKeys(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Resultado de nearest_services: emergencias oficiales conservan dirección; negocios no. */
function redactNearestServices(result: any): any {
  if (!result || typeof result !== 'object' || !Array.isArray(result.results)) return stripContactKeys(result);
  const group = String(result.group || '');
  return {
    ...result,
    results: result.results.map((r: any) => {
      if (isPublicEmergencyPoi(group, r?.type)) return r;
      const { address: _a, phone: _p, telefono: _t, website: _w, email: _e, ...rest } = r || {};
      return {
        ...(stripContactKeys(rest) as object),
        // Ubicación aproximada (~1 km), nunca la exacta del negocio.
        location: r?.location ? { lat: round2(r.location.lat), lng: round2(r.location.lng), approximate: true } : null,
      };
    }),
    contactPolicy: 'Negocios: sin teléfono, WhatsApp, correo, web ni dirección exacta; Costa Rica Tours gestiona la solicitud. Emergencias: 911.',
  };
}

/** Resultado de park_info: SINAC es oficial (horario, tarifa, enlace oficial); se filtran enlaces no oficiales. */
function redactParkInfo(result: any): any {
  if (!result || typeof result !== 'object' || !Array.isArray(result.results)) return result;
  const officialUrl = (u: unknown) => (typeof u === 'string' && OFFICIAL_HOST.test(hostOf(u)) ? u : null);
  return {
    ...result,
    results: result.results.map((r: any) => ({ ...r, booking: officialUrl(r?.booking), source: officialUrl(r?.source) ?? 'https://www.sinac.go.cr' })),
  };
}

/** Redacta el resultado de una herramienta antes de entregarlo al modelo (y de ahí al cliente). */
export function redactToolResultForClient(toolName: string, result: unknown): unknown {
  if (!CLIENT_FACING_TOOLS.has(toolName)) return result;
  if (toolName === 'nearest_services') return redactNearestServices(result);
  if (toolName === 'park_info') return redactParkInfo(result);
  return stripContactKeys(result);
}

/** Middleware: redacta `reply` de las respuestas JSON del asistente público. */
export function redactAssistantReplyMiddleware(req: Request, res: Response, next: NextFunction) {
  const language = String((req.body as any)?.language || '').toLowerCase() === 'en' ? 'en' : 'es';
  const original = res.json.bind(res);
  (res as any).json = (body: any) => {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const out = { ...body };
      if (typeof out.reply === 'string') out.reply = redactBusinessContactsText(out.reply, language);
      return original(out);
    }
    return original(body);
  };
  next();
}
