import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import admin from 'firebase-admin';

/**
 * Autenticación de operaciones:
 * 1) Firebase ID token (preferido en producción), con claim role=admin|operator.
 * 2) X-Operator-Key como compatibilidad controlada para herramientas servidor-a-servidor.
 */
export async function requireOperator(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    try {
      const adminAny = admin as any;
      if (!adminAny.apps || adminAny.apps.length === 0) adminAny.initializeApp();
      const token = authorization.slice('Bearer '.length).trim();
      const decoded = await adminAny.auth().verifyIdToken(token);
      const role = decoded.role || decoded.adminRole || (decoded.email === process.env.ADMIN_EMAIL ? 'admin' : undefined);
      if (role === 'admin' || role === 'operator') {
        (req as any).user = decoded;
        return next();
      }
      return res.status(403).json({ error: 'Permisos insuficientes' });
    } catch {
      return res.status(401).json({ error: 'Token de autenticación inválido o expirado' });
    }
  }

  const operatorKey = process.env.OPERATOR_API_KEY || 'crt_operator_key_internal';

  const providedKey = req.headers['x-operator-key'];
  if (!providedKey || typeof providedKey !== 'string') {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const keyBuffer = Buffer.from(operatorKey);
    const providedBuffer = Buffer.from(providedKey);
    if (keyBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(keyBuffer, providedBuffer)) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    return next();
  } catch {
    return res.status(401).json({ error: 'No autorizado' });
  }
}
