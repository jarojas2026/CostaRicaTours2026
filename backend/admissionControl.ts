/**
 * Admission control ligero por instancia.
 *
 * Protege la memoria/CPU de cada runtime ante picos masivos. No sustituye el
 * rate limiting de borde: actúa como segunda barrera para trabajo costoso (IA,
 * reservas, integraciones y consultas operativas) y devuelve 503 cuando la
 * instancia alcanza su capacidad segura.
 */
import type { NextFunction, Request, Response } from 'express';

export function createInFlightLimiter(maxConcurrent: number, retryAfterSeconds = 2) {
  let inFlight = 0;

  return function inFlightLimiter(_req: Request, res: Response, next: NextFunction) {
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
}

export function getInFlightCount(): number {
  return inFlightRegistry.reduce((total, counter) => total + counter(), 0);
}

const inFlightRegistry: Array<() => number> = [];
export function registerInFlightCounter(counter: () => number): void {
  inFlightRegistry.push(counter);
}
