/**
 * Identidad y aislamiento por tenant del portal de proveedores (issue #319).
 *
 * Diseño: docs/diseno/portal-proveedores.md §3 y §9.
 *
 * - El proveedor se autentica con Firebase Auth. La autorización viene de
 *   custom claims firmados por el backend:
 *     { role: 'provider', providerId: 'prov_x', providerRole: 'owner'|'manager'|'staff' }
 * - El `providerId` SIEMPRE sale del token verificado (y se contrasta con
 *   `provider_members/{uid}`), nunca del body, query ni params.
 * - Un proveedor nunca obtiene rol de operación/admin: `resolveOperatorAccess`
 *   no reconoce `role: 'provider'`, y aquí se rechaza un token que además
 *   tenga privilegios de owner/admin (las identidades no se mezclan).
 * - La revocación es inmediata: se verifica el token con checkRevoked=true y
 *   la membresía debe seguir `active` en Firestore.
 */

import type { NextFunction, Request, Response } from 'express';

export const PROVIDER_ROLES = ['owner', 'manager', 'staff'] as const;
export type ProviderRole = (typeof PROVIDER_ROLES)[number];

export const PROVIDER_MEMBERS_COLLECTION = 'provider_members';

export interface ProviderContext {
  uid: string;
  providerId: string;
  providerRole: ProviderRole;
}

const ROLE_RANK: Record<ProviderRole, number> = { staff: 1, manager: 2, owner: 3 };

const PROVIDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function isValidProviderId(value: unknown): value is string {
  return typeof value === 'string' && PROVIDER_ID_PATTERN.test(value);
}

export function isProviderRole(value: unknown): value is ProviderRole {
  return typeof value === 'string' && (PROVIDER_ROLES as readonly string[]).includes(value);
}

/** owner ≥ manager ≥ staff. */
export function providerRoleAllows(role: ProviderRole, minimum: ProviderRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

function hasStaffPrivileges(decoded: Record<string, any>): boolean {
  const role = String(decoded?.adminRole || '').trim().toLowerCase();
  return decoded?.owner === true || decoded?.admin === true || ['owner', 'admin', 'operator'].includes(role);
}

/**
 * Lee los claims de un token ya verificado. Devuelve null si no es una
 * identidad de proveedor válida. Función pura (testeable sin Firebase).
 */
export function resolveProviderClaims(decoded: Record<string, any> | null | undefined): ProviderContext | null {
  if (!decoded) return null;
  const uid = String(decoded.uid || decoded.sub || '').trim();
  if (!uid) return null;
  if (String(decoded.role || '').trim() !== 'provider') return null;
  if (hasStaffPrivileges(decoded)) return null;
  if (!isValidProviderId(decoded.providerId)) return null;
  if (!isProviderRole(decoded.providerRole)) return null;
  return { uid, providerId: decoded.providerId, providerRole: decoded.providerRole };
}

export interface ProviderAuthDeps {
  /** verifyIdToken(token, checkRevoked=true) */
  verifyIdToken: (token: string) => Promise<Record<string, any>>;
  /** provider_members/{uid}; null si no existe; lanza si no hay almacenamiento. */
  loadMember: (uid: string) => Promise<Record<string, any> | null>;
}

export type ProviderAuthResult =
  | { ok: true; provider: ProviderContext }
  | { ok: false; status: number; error: string };

export async function resolveProviderAccess(
  authorization: string | undefined,
  deps: ProviderAuthDeps,
  minimumRole: ProviderRole = 'staff',
): Promise<ProviderAuthResult> {
  if (!authorization?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Se requiere una sesión de proveedor.' };
  }
  let decoded: Record<string, any>;
  try {
    decoded = await deps.verifyIdToken(authorization.slice('Bearer '.length).trim());
  } catch {
    return { ok: false, status: 401, error: 'Token de autenticación inválido, vencido o revocado.' };
  }
  const claims = resolveProviderClaims(decoded);
  if (!claims) return { ok: false, status: 403, error: 'Esta cuenta no es un miembro de proveedor.' };

  let member: Record<string, any> | null;
  try {
    member = await deps.loadMember(claims.uid);
  } catch {
    return { ok: false, status: 503, error: 'Portal de proveedores no disponible sin Firestore.' };
  }
  if (!member || member.status !== 'active' || member.providerId !== claims.providerId
    || member.providerRole !== claims.providerRole) {
    return { ok: false, status: 403, error: 'Membresía de proveedor inactiva o no coincide.' };
  }
  if (!providerRoleAllows(claims.providerRole, minimumRole)) {
    return { ok: false, status: 403, error: 'Su rol en el proveedor no permite esta acción.' };
  }
  return { ok: true, provider: claims };
}

async function defaultDeps(): Promise<ProviderAuthDeps> {
  const [{ getFirebaseAdminAuth }, { getFirestoreDb }] = await Promise.all([
    import('./firebaseAdminRuntime'),
    import('./bookingService'),
  ]);
  return {
    verifyIdToken: (token) => getFirebaseAdminAuth().verifyIdToken(token, true) as Promise<Record<string, any>>,
    loadMember: async (uid) => {
      const db = getFirestoreDb();
      if (!db) throw new Error('firestore_unavailable');
      const snap = await db.collection(PROVIDER_MEMBERS_COLLECTION).doc(uid).get();
      return snap.exists ? (snap.data() || null) : null;
    },
  };
}

let depsOverride: ProviderAuthDeps | null = null;
/** Solo para tests de contrato. */
export function __setProviderAuthDepsForTests(deps: ProviderAuthDeps | null) {
  depsOverride = deps;
}

/**
 * Middleware: exige identidad de proveedor y rol mínimo. Inyecta
 * `req.provider = { uid, providerId, providerRole }`.
 */
export function requireProvider(minimumRole: ProviderRole = 'staff') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const deps = depsOverride || await defaultDeps();
    const result = await resolveProviderAccess(req.headers.authorization, deps, minimumRole);
    if (!result.ok) return res.status(result.status).json({ success: false, error: result.error });
    (req as any).provider = result.provider;
    return next();
  };
}

export function providerContextOf(req: Request): ProviderContext {
  const ctx = (req as any).provider as ProviderContext | undefined;
  if (!ctx) throw new Error('requireProvider no se ejecutó antes de este handler.');
  return ctx;
}

/** Registro de membresía que escribe el backend (admin) en provider_members/{uid}. */
export function buildProviderMemberRecord(input: {
  uid: string;
  providerId: string;
  providerRole: ProviderRole;
  invitedBy: string | null;
  now?: string;
}) {
  if (!input.uid || !/^[A-Za-z0-9_-]{1,128}$/.test(input.uid)) throw new Error('uid inválido.');
  if (!isValidProviderId(input.providerId)) throw new Error('providerId inválido.');
  if (!isProviderRole(input.providerRole)) throw new Error('providerRole inválido.');
  const now = input.now || new Date().toISOString();
  return {
    uid: input.uid,
    providerId: input.providerId,
    providerRole: input.providerRole,
    status: 'active' as const,
    invitedBy: input.invitedBy,
    createdAt: now,
    updatedAt: now,
  };
}

/** Claims de proveedor; rechaza mezclar con identidades de owner/admin/operador. */
export function buildProviderClaims(existing: Record<string, any> | undefined | null, providerId: string, providerRole: ProviderRole) {
  const current = existing || {};
  const role = String(current.role || '').trim().toLowerCase();
  if (hasStaffPrivileges(current) || ['owner', 'admin', 'operator'].includes(role)) {
    throw new Error('Una cuenta de owner/admin/operador no puede ser miembro de proveedor.');
  }
  if (current.providerId && current.providerId !== providerId) {
    throw new Error('La cuenta ya pertenece a otro proveedor (MVP: un proveedor por usuario).');
  }
  return { role: 'provider', providerId, providerRole };
}
