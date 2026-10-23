/**
 * Privacidad de proveedores en TODO texto saliente hacia el cliente (correo, WhatsApp,
 * respuestas de IA fuera de las rutas HTTP con `redactAssistantReplyMiddleware`).
 *
 * Decisión del negocio (AGENTS.md §12): el cliente no ve nombre, correo, teléfono,
 * WhatsApp, web ni dominio del proveedor antes de la confirmación de la reserva. Solo
 * la confirmación (reserva `confirmada` o pago `completed`) puede nombrar al operador.
 *
 * Fuentes de nombres:
 *  - denylist interno vía backend/internalDataStore.ts (Firestore privado en producción;
 *    data/internal/operatorDenylist.json como respaldo local fuera de producción);
 *  - nombres que pasa el llamador (p. ej. `order.providerName` del registro operativo).
 * Los contactos de negocio (teléfonos, correos, webs, wa.me) se quitan con
 * `redactBusinessContactsText`, que conserva emergencias y entes oficiales.
 */
import { peekInternalData, type InternalDataSnapshot } from './internalDataStore';
import { redactBusinessContactsText } from './assistantContactRedaction';

export const PROVIDER_PLACEHOLDER = { es: 'nuestro operador local', en: 'our local operator' } as const;

type Lang = 'es' | 'en';
type Denylist = { names: string[]; domains: string[]; publicPlaceNames?: string[] };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ACCENTS: Record<string, string> = { a: '[aáàä]', e: '[eéèë]', i: '[iíìï]', o: '[oóòö]', u: '[uúùü]', n: '[nñ]' };

/** Mismo criterio que scripts/lib/operatorPrivacyScan.mjs: nombre propio, tolerante a tildes. */
function accentPattern(name: string): string {
  const base = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  if (base.length !== name.length) return esc(name);
  return [...base].map((ch) => {
    const low = ch.toLowerCase();
    if (!ACCENTS[low]) return esc(ch);
    return ch === low ? ACCENTS[low] : ACCENTS[low].toUpperCase();
  }).join('');
}

const nameRegex = (name: string, flags = 'gu') => new RegExp(`(?<![\\p{L}\\p{N}_])${accentPattern(name)}(?![\\p{L}\\p{N}_])`, flags);

let compiled: { snap: InternalDataSnapshot; names: RegExp[]; domains: RegExp[] } | null = null;

/** Compila los patrones del denylist vigente; se recompila solo si cambia la instantánea. */
function denyMatchers() {
  const snap = peekInternalData();
  if (compiled && compiled.snap === snap) return compiled;
  const DENY: Denylist = snap.denylist;
  const PUBLIC_PLACES = new Set((DENY.publicPlaceNames || []).map((n) => n.toLowerCase()));
  // Nombres más largos primero para que "Aggressor Adventures" se sustituya antes que "Aggressor".
  const DENY_NAMES = [...new Set(DENY.names)].filter((n) => n && !PUBLIC_PLACES.has(n.toLowerCase())).sort((a, b) => b.length - a.length);
  compiled = {
    snap,
    names: DENY_NAMES.map((n) => nameRegex(n)),
    domains: [...new Set(DENY.domains)].filter(Boolean).map((d) => new RegExp(`(?<![a-z0-9-])(?:[a-z0-9-]+\\.)*${esc(d)}\\b`, 'gi')),
  };
  return compiled;
}

export interface CustomerOutboundOptions {
  language?: unknown;
  /** Nombres adicionales del proveedor (registro operativo en Firestore, orden, reserva). */
  providerNames?: Array<string | null | undefined>;
}

const langOf = (language: unknown): Lang => (typeof language === 'string' && /^en(?:[-_]|$)/i.test(language) ? 'en' : 'es');

/**
 * Quita del texto la identidad y los contactos del proveedor. Idempotente.
 * Úsese en cualquier texto que vaya al cliente antes de la confirmación de la reserva.
 */
export function redactProviderIdentityForCustomer(text: unknown, options: CustomerOutboundOptions = {}): string {
  const lang = langOf(options.language);
  const ph = PROVIDER_PLACEHOLDER[lang];
  let out = String(text ?? '');
  if (!out) return out;
  // 1. Contactos de negocio (teléfono, WhatsApp, correo, web); conserva emergencias/oficiales.
  out = redactBusinessContactsText(out, lang);
  // 2. Dominios de operadores que no tengan esquema ni www (p. ej. "ejemplo.cr").
  const { names: NAME_RES, domains: DOMAIN_RES } = denyMatchers();
  for (const re of DOMAIN_RES) out = out.replace(re, ph);
  // 3. Nombres del llamador (registro operativo) y del denylist interno.
  const extra = (options.providerNames || [])
    .map((n) => String(n ?? '').trim())
    .filter((n) => n.length >= 3)
    .sort((a, b) => b.length - a.length);
  for (const name of extra) out = out.replace(nameRegex(name, 'giu'), ph);
  for (const re of NAME_RES) out = out.replace(re, ph);
  // Evitar "nuestro operador local nuestro operador local".
  return out.replace(new RegExp(`(${esc(ph)})(?:[\\s,;/·&-]*${esc(ph)})+`, 'g'), '$1');
}

/** Solo una reserva confirmada (o pagada) puede revelar al operador en la comunicación. */
export function bookingAllowsProviderReveal(booking: { status?: unknown; paymentStatus?: unknown } | null | undefined): boolean {
  if (!booking) return false;
  return booking.status === 'confirmada' || booking.paymentStatus === 'completed';
}
