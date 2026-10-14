import type { Express, NextFunction, Request, Response, Router } from 'express';

const ROUTE_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'] as const;

/**
 * Express 4 does not forward rejected promises from async handlers to the error
 * pipeline; an unhandled rejection can terminate the Node process. This wraps
 * every route handler registered on the app so rejections become next(err).
 * Error handlers (4 arguments) and `app.get('setting')` lookups are untouched.
 */
export function wrapAsyncHandler<T extends (...args: any[]) => any>(handler: T): T {
  if (typeof handler !== 'function' || handler.length >= 4) return handler;
  if ((handler as any).__crtAsyncWrapped) return handler;
  // Routers / sub-apps expose `.handle` and manage their own errors.
  if (typeof (handler as any).handle === 'function' || typeof (handler as any).stack === 'object') return handler;
  const wrapped = function (this: unknown, req: Request, res: Response, next: NextFunction) {
    try {
      const result = handler.call(this, req, res, next);
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch(next);
      }
      return result;
    } catch (error) {
      return next(error);
    }
  } as unknown as T;
  (wrapped as any).__crtAsyncWrapped = true;
  return wrapped;
}

function wrapArgs(args: any[]): any[] {
  return args.map((arg) => Array.isArray(arg)
    ? arg.map((item) => typeof item === 'function' ? wrapAsyncHandler(item) : item)
    : typeof arg === 'function' ? wrapAsyncHandler(arg) : arg);
}

export function installAsyncRouteSafety(app: Express | Router): void {
  for (const method of ROUTE_METHODS) {
    const original = (app as any)[method].bind(app);
    (app as any)[method] = (...args: any[]) => {
      // app.get('trust proxy') is a settings lookup, not a route registration.
      if (method === 'get' && args.length === 1 && typeof args[0] === 'string') return original(...args);
      return original(...wrapArgs(args));
    };
  }
}

export function apiErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);
  console.error(`[api-error] ${req.method} ${req.path}:`, err?.message || err);
  const status = Number(err?.status || err?.statusCode);
  return res.status(status >= 400 && status < 600 ? status : 500).json({
    success: false,
    error: 'internal_error',
    message: 'No se pudo completar la solicitud.',
  });
}
