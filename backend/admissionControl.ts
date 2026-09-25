/**
 * Admission control ligero por instancia.
 *
 * Protege CPU/memoria durante picos masivos. No sustituye el rate limiting
 * perimetral; es una segunda barrera para trabajo costoso.
 */
import type { NextFunction, Request, Response } from 'express';

export function createInFlightLimiter(maxConcurrent: number, retryAfterSeconds = 2) {
  let inFlight = 0;

  const middleware = function inFlightLimiter(_req: Request, res: Response, next: NextFunction) {
    if (inFlight >= maxConcurrent) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(503).json({
        error: 'Servicio temporalmente ocupado. Intente nuevamente en unos segundos.',
        code: 'ADMISSION_CONTROL_BUSY',
        retryAfterSeconds
      });
    }

    inFlight += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      inFlight = Math.max(0, inFlight - 1);
    };

    res.once('finish', release);
    res.once('close', release);
    next();
  };

  return {
    middleware,
    getInFlightCount: () => inFlight,
    maxConcurrent
  };
}
