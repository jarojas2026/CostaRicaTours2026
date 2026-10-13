import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getFirebaseAdminAuth } from './firebaseAdminRuntime';

/**
 * Operational authentication.
 *
 * owner    → final authority over agent governance and approvals
 * admin    → administrative access without owner-only governance powers
 * operator → operational access
 */
export async function requireOperator(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    try {
      const token = authorization.slice('Bearer '.length).trim();
      const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
      const email = String(decoded.email || '').trim().toLowerCase();
      const claimedRole = String(decoded.role || decoded.adminRole || '').trim().toLowerCase();
      const ownerEmail = String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
      const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();

      let role: 'owner' | 'admin' | 'operator' | undefined;
      if (
        decoded.owner === true
        || claimedRole === 'owner'
        || (ownerEmail && email === ownerEmail)
      ) {
        role = 'owner';
      } else if (claimedRole === 'admin' || claimedRole === 'operator') {
        role = claimedRole;
      } else if (adminEmail && email === adminEmail) {
        role = 'admin';
      }

      const allowedEmails = String(process.env.ADMIN_ALLOWED_EMAILS || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      const ownerExplicitlyAuthorized = role === 'owner' && (
        decoded.owner === true
        || claimedRole === 'owner'
        || Boolean(ownerEmail && email === ownerEmail)
      );
      const collaboratorAuthorized = role !== 'owner' && (
        allowedEmails.length === 0 || allowedEmails.includes(email)
      );

      if (role && (ownerExplicitlyAuthorized || collaboratorAuthorized)) {
        (req as any).user = decoded;
        (req as any).adminAccess = {
          role,
          uid: String(decoded.uid || decoded.sub || '') || null,
          email: email || null,
          scope: role === 'owner' ? 'owner' : role === 'admin' ? 'full' : 'operations',
          authMethod: 'firebase',
        };
        return next();
      }
      return res.status(403).json({ error: 'Permisos insuficientes' });
    } catch {
      return res.status(401).json({ error: 'Token de autenticación inválido o expirado' });
    }
  }

  const operatorKey = process.env.OPERATOR_API_KEY;
  if (!operatorKey) {
    return res.status(503).json({ error: 'OPERATOR_API_KEY no configurada en el servidor' });
  }

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
    (req as any).adminAccess = {
      role: 'operator',
      uid: null,
      email: null,
      scope: 'operations',
      authMethod: 'operator_key',
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'No autorizado' });
  }
}

export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  void requireOperator(req, res, () => {
    if ((req as any).adminAccess?.role !== 'owner') {
      res.status(403).json({ error: 'Esta acción requiere autorización del owner.' });
      return;
    }
    next();
  });
}
