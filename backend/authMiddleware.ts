import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware para requerir clave de operador en headers (X-Operator-Key)
 * Implementa fail-closed en NODE_ENV=production si OPERATOR_API_KEY no está configurada.
 */
export function requireOperator(req: Request, res: Response, next: NextFunction) {
  const operatorKey = process.env.OPERATOR_API_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!operatorKey) {
    if (isProduction) {
      console.error('❌ [SEGURIDAD] OPERATOR_API_KEY no está configurada en producción. Rechazando acceso.');
      return res.status(401).json({ error: 'No autorizado - Configuración de operador faltante' });
    } else {
      console.warn('⚠️ [SEGURIDAD ADVERTENCIA] OPERATOR_API_KEY no configurada. Permitido solo en entorno de desarrollo.');
      return next();
    }
  }

  const providedKey = req.headers['x-operator-key'];

  if (!providedKey || typeof providedKey !== 'string') {
    return res.status(401).json({ error: 'No autorizado - Falta cabecera X-Operator-Key' });
  }

  try {
    const keyBuffer = Buffer.from(operatorKey);
    const providedBuffer = Buffer.from(providedKey);

    if (keyBuffer.length !== providedBuffer.length) {
      return res.status(401).json({ error: 'No autorizado - Clave de operador inválida' });
    }

    const isValid = crypto.timingSafeEqual(keyBuffer, providedBuffer);
    if (!isValid) {
      return res.status(401).json({ error: 'No autorizado - Clave de operador inválida' });
    }

    return next();
  } catch (err) {
    console.error('Error en validación de timing-safe para operador:', err);
    return res.status(401).json({ error: 'No autorizado' });
  }
}
