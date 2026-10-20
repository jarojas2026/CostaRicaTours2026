/**
 * Middleware antiabuso para formularios públicos: límite por IP (en memoria, por
 * instancia de Cloud Run), honeypot y tiempo mínimo de llenado. Sin servicios de pago.
 *
 * IP del cliente detrás del proxy de Vercel:
 *   navegador → Vercel (fija x-forwarded-for / x-real-ip con la IP real y descarta lo
 *   que mande el cliente) → función api/ (copia esas cabeceras y agrega
 *   x-crt-gateway) → Google Front End de Cloud Run (AÑADE la IP de la función al final
 *   de x-forwarded-for).
 * Con `trust proxy 1`, req.ip sería la IP de la función de Vercel: todos los usuarios
 * compartirían el mismo cupo. Por eso, si la petición viene del gateway, se usa
 * x-real-ip, luego x-vercel-forwarded-for y luego el penúltimo salto de
 * x-forwarded-for (el que puso Vercel). Sin gateway (llamada directa) se usa req.ip.
 */

import type { NextFunction, Request, Response } from 'express';
import {
  FORM_GUARD_MESSAGES, FORM_MIN_FILL_MS, FORM_RATE_LIMIT, HONEYPOT_FIELD, STARTED_AT_FIELD,
  type FormGuardCode,
} from '../shared/formAbuse';

const GATEWAY_HEADER_VALUE = 'vercel-oidc-wif';
const MAX_TRACKED_KEYS = 20_000;

function header(req: Request, name: string): string {
  const value = req.headers[name];
  return (Array.isArray(value) ? value.join(',') : String(value ?? '')).trim();
}

const splitList = (value: string) => value.split(',').map(s => s.trim()).filter(Boolean);

/** Quita puerto/prefijo IPv4-mapped y agrupa IPv6 por /64 (evita rotar dentro del mismo bloque). */
export function normalizeIp(raw: string): string {
  let ip = raw.trim().replace(/^\[|\](:\d+)?$/g, '');
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.replace(/:\d+$/, '');
  ip = ip.replace(/^::ffff:(?=\d{1,3}(\.\d{1,3}){3}$)/i, '');
  if (!ip.includes(':')) return ip;
  const [head, tail = ''] = ip.toLowerCase().split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const full = ip.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
  return full.slice(0, 4).map(g => g.replace(/^0+(?=.)/, '')).join(':') + '::/64';
}

export function clientIpFromRequest(req: Request): string {
  if (header(req, 'x-crt-gateway') === GATEWAY_HEADER_VALUE) {
    const realIp = header(req, 'x-real-ip');
    if (realIp) return normalizeIp(realIp);
    const vercelFwd = splitList(header(req, 'x-vercel-forwarded-for'))[0];
    if (vercelFwd) return normalizeIp(vercelFwd);
    const hops = splitList(header(req, 'x-forwarded-for'));
    if (hops.length >= 2) return normalizeIp(hops[hops.length - 2]);
    if (hops.length === 1) return normalizeIp(hops[0]);
  }
  return normalizeIp(req.ip || req.socket?.remoteAddress || 'unknown');
}

function requestLanguage(req: Request): 'es' | 'en' {
  const fromBody = String((req.body as any)?.language || (req.body as any)?.idioma || '').toLowerCase();
  if (fromBody === 'en' || fromBody === 'es') return fromBody;
  return /^en\b/i.test(header(req, 'accept-language')) ? 'en' : 'es';
}

function reject(req: Request, res: Response, status: number, code: FormGuardCode, extra: Record<string, unknown> = {}) {
  const message = FORM_GUARD_MESSAGES[code][requestLanguage(req)];
  return res.status(status).json({ success: false, code, error: message, message, ...extra });
}

export interface FormAbuseGuardOptions {
  /** Prefijo del cupo: cada formulario tiene su propio contador por IP. */
  name: string;
  windowMs?: number;
  max?: number;
  minFillMs?: number;
  /** Si devuelve false la petición pasa sin control (p. ej. /api/customer-intake que no viene del formulario de contacto). */
  appliesTo?: (req: Request) => boolean;
  now?: () => number;
}

export type FormAbuseGuard = ((req: Request, res: Response, next: NextFunction) => unknown) & { reset: () => void };

export function createFormAbuseGuard(options: FormAbuseGuardOptions): FormAbuseGuard {
  const windowMs = options.windowMs ?? FORM_RATE_LIMIT.windowMs;
  const max = options.max ?? FORM_RATE_LIMIT.max;
  const minFillMs = options.minFillMs ?? FORM_MIN_FILL_MS;
  const now = options.now ?? Date.now;
  const hits = new Map<string, { count: number; resetAt: number }>();

  const prune = (t: number) => {
    for (const [key, entry] of hits) if (entry.resetAt <= t) hits.delete(key);
    while (hits.size >= MAX_TRACKED_KEYS) hits.delete(hits.keys().next().value as string);
  };

  const guard = ((req: Request, res: Response, next: NextFunction) => {
    if (options.appliesTo && !options.appliesTo(req)) return next();
    const t = now();
    const key = `${options.name}:${clientIpFromRequest(req)}`;
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      if (hits.size >= MAX_TRACKED_KEYS) prune(t);
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(key, entry);
    }
    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - t) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return reject(req, res, 429, 'rate_limited', { retryAfterSeconds });
    }
    entry.count += 1;

    const body = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const honeypot = body[HONEYPOT_FIELD];
    const startedAt = Number(body[STARTED_AT_FIELD]);
    const hasStartedAt = body[STARTED_AT_FIELD] !== undefined && body[STARTED_AT_FIELD] !== null && body[STARTED_AT_FIELD] !== '';
    delete body[HONEYPOT_FIELD];
    delete body[STARTED_AT_FIELD];

    // Bot: respuesta de éxito genérica para no darle pistas; no se procesa nada.
    if (typeof honeypot === 'string' ? honeypot.trim() !== '' : honeypot !== undefined && honeypot !== null && honeypot !== false) {
      console.warn(`[form-guard] honeypot ${options.name}`);
      return res.status(202).json({ success: true, status: 'received' });
    }
    // Formularios nuevos siempre envían la marca de tiempo; clientes viejos (PWA en caché) sin ella pasan.
    if (hasStartedAt) {
      const elapsed = t - startedAt;
      if (!Number.isFinite(startedAt) || elapsed < minFillMs) return reject(req, res, 400, 'too_fast');
    }
    return next();
  }) as FormAbuseGuard;
  guard.reset = () => hits.clear();
  return guard;
}

/** Instancias compartidas (5 envíos / 10 min por IP y formulario). */
export const quoteRequestGuard = createFormAbuseGuard({ name: 'quote-request' });
/** Tope diario adicional para cotizaciones (rescatado de #286): 20 por día por IP. */
export const QUOTE_DAILY_LIMIT = { windowMs: 24 * 60 * 60_000, max: 20 } as const;
export const quoteRequestDailyGuard = createFormAbuseGuard({ name: 'quote-request-day', ...QUOTE_DAILY_LIMIT });
export const contactFormGuard = createFormAbuseGuard({
  name: 'contact-form',
  appliesTo: req => String((req.body as any)?.source || '') === 'contact-form',
});
export const participateGuard = createFormAbuseGuard({ name: 'participar' });
