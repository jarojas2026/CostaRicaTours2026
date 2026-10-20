/**
 * Middlewares y utilidades compartidas por los routers de dominio.
 *
 * Los limitadores son singletons de módulo: todas las rutas comparten el mismo
 * presupuesto por IP, igual que cuando vivían en server.ts.
 */

import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireOperator, requireAdmin as requireAdminRole } from '../authMiddleware';
import { installAsyncRouteSafety } from '../asyncRoutes';
import { hasInternalJobToken } from '../internalJobAuth';
import { createInFlightLimiter } from '../admissionControl';

/**
 * Crea un Router de Express con la misma protección async que la app:
 * los rechazos de handlers async llegan a next(err) en lugar de tumbar el proceso.
 */
export function createRouter(): Router {
  const router = Router();
  installAsyncRouteSafety(router);
  return router;
}

// Admin gate is defined before any route registration that uses it.
// owner/admin only; operator role and OPERATOR_API_KEY use requireOperator.
export const requireAdmin = requireAdminRole;

/**
 * Batch/cron style admin routes also accept the internal job token used by
 * Cloud Scheduler (X-CRT-Internal-Token = AGENT_INTERNAL_TOKEN).
 */
export function requireAdminOrInternalJob(req: express.Request, res: express.Response, next: express.NextFunction) {
  const configured = process.env.AGENT_INTERNAL_TOKEN;
  if (configured && typeof req.headers['x-crt-internal-token'] === 'string'
    && hasInternalJobToken(req.headers as Record<string, string | string[] | undefined>, configured)) {
    return next();
  }
  return requireAdmin(req, res, next);
}

export function adminAccessPayload(req: express.Request) {
  const access = (req as any).adminAccess || {};
  return {
    uid: access.uid || (req as any).user?.uid || (req as any).user?.sub || null,
    role: access.role || (req as any).user?.role || null,
    email: access.email || (req as any).user?.email || null,
    scope: access.scope || 'operations'
  };
}

/**
 * Autenticación para herramientas internas de agentes. Estas rutas pueden crear
 * efectos persistentes, por lo que nunca deben quedar expuestas sin una credencial.
 */
export function requireAgentTool(req: express.Request, res: express.Response, next: express.NextFunction) {
  const configured = process.env.AGENT_INTERNAL_TOKEN;
  if (!configured) {
    return res.status(503).json({ error: 'Herramientas internas de agentes no configuradas.' });
  }
  if (!hasInternalJobToken(req.headers as Record<string, string | string[] | undefined>, configured)) {
    return res.status(401).json({ error: 'No autorizado.' });
  }
  next();
}

// ==========================================
// 🛡️ RATE LIMITING MIDDLEWARES
// ==========================================
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de pago desde esta IP. Por favor intente más tarde.' }
});

export const counterLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite del Counter Digital excedido. Por favor espere un momento.' }
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite de solicitudes de chat excedido. Por favor espere un momento.' }
});

/** IP real del cliente: Vercel fija x-vercel-forwarded-for / x-real-ip (Cloud Run solo es accesible vía Vercel por IAM). */
export function clientIpKey(req: { headers: Record<string, any>; ip?: string }): string {
  const first = (v: unknown) => String(Array.isArray(v) ? v[0] : v || '').split(',')[0].trim();
  return first(req.headers['x-vercel-forwarded-for']) || first(req.headers['x-real-ip']) || req.ip || 'unknown';
}

/** Solicitudes de cotización públicas: 5 cada 15 min y 20 por día por IP. */
const quoteLimitMessage = { success: false, error: 'rate_limited', message: 'Demasiadas solicitudes desde esta conexión. Intente más tarde o escríbanos por WhatsApp.' };
export const quoteBurstLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.QUOTE_RATE_LIMIT_15MIN || 5),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => clientIpKey(req),
  validate: false,
  message: quoteLimitMessage,
});
export const quoteDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: Number(process.env.QUOTE_RATE_LIMIT_DAY || 20),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => clientIpKey(req),
  validate: false,
  message: quoteLimitMessage,
});

export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Por favor intente más tarde.' }
});

export const apiAdmission = createInFlightLimiter(150, 2);
export const intakeAdmission = createInFlightLimiter(40, 2);
export const aiAdmission = createInFlightLimiter(20, 3);
export const bookingAdmission = createInFlightLimiter(30, 2);

// Stricter per-IP budget for routes that spend LLM / model tokens.
export const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.LLM_RATE_LIMIT_PER_MINUTE || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite de solicitudes de IA excedido. Por favor espere un momento.' }
});

// Conversational memory is only reachable with a server-minted session id plus
// its HMAC token (x-chat-session-token). Unknown or guessed ids are rejected.
export function chatSessionTokenFrom(req: express.Request): string {
  const header = req.headers['x-chat-session-token'];
  return typeof header === 'string' ? header : '';
}
