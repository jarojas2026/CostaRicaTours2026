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
export type OperatorAccessResult =
  | { ok: true; access: Record<string, any>; user?: any }
  | { ok: false; status: number; error: string };

/**
 * Evaluates operational credentials without writing a response, so routes that
 * accept several kinds of authorization (owner of a booking OR operations) can
 * reuse exactly the same rules as requireOperator.
 */
export async function resolveOperatorAccess(req: Request): Promise<OperatorAccessResult> {
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
        return {
          ok: true,
          user: decoded,
          access: {
            role,
            uid: String(decoded.uid || decoded.sub || '') || null,
            email: email || null,
            scope: role === 'owner' ? 'owner' : role === 'admin' ? 'full' : 'operations',
            authMethod: 'firebase',
          },
        };
      }
      return { ok: false, status: 403, error: 'Permisos insuficientes' };
    } catch {
      return { ok: false, status: 401, error: 'Token de autenticación inválido o expirado' };
    }
  }

  const operatorKey = process.env.OPERATOR_API_KEY;
  if (!operatorKey) {
    return { ok: false, status: 503, error: 'OPERATOR_API_KEY no configurada en el servidor' };
  }

  const providedKey = req.headers['x-operator-key'];
  if (!providedKey || typeof providedKey !== 'string') {
    return { ok: false, status: 401, error: 'No autorizado' };
  }

  try {
    const keyBuffer = Buffer.from(operatorKey);
    const providedBuffer = Buffer.from(providedKey);
    if (keyBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(keyBuffer, providedBuffer)) {
      return { ok: false, status: 401, error: 'No autorizado' };
    }
    return {
      ok: true,
      access: {
        role: 'operator',
        uid: null,
        email: null,
        scope: 'operations',
        authMethod: 'operator_key',
      },
    };
  } catch {
    return { ok: false, status: 401, error: 'No autorizado' };
  }
}

export async function requireOperator(req: Request, res: Response, next: NextFunction) {
  const result = await resolveOperatorAccess(req);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  if (result.user) (req as any).user = result.user;
  (req as any).adminAccess = result.access;
  return next();
}

/**
 * Any signed-in Firebase user (customer). Used for actions that must be bound
 * to the caller's own uid, never to a uid supplied in the request body.
 */
export async function verifyFirebaseUser(req: Request): Promise<any | null> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    return await getFirebaseAdminAuth().verifyIdToken(authorization.slice('Bearer '.length).trim());
  } catch {
    return null;
  }
}

export async function requireFirebaseUser(req: Request, res: Response, next: NextFunction) {
  const decoded = await verifyFirebaseUser(req);
  if (!decoded?.uid) {
    return res.status(401).json({ error: 'Se requiere una sesión autenticada.' });
  }
  (req as any).user = decoded;
  return next();
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
