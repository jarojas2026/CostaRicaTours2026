/**
 * Visibilidad de accesos por rol en el menú de cuenta (solo visual).
 * La autorización real sigue en el backend: /api/admin/access-policy
 * (requireAdmin) y /api/provider/v2/* (requireProvider).
 */

export type AdminAccessStatus = 'signed-out' | 'checking' | 'allowed' | 'denied' | 'error';

export interface MenuLink {
  id: string;
  to: string;
  label: string;
}

export interface AccountMenuSections {
  admin: boolean;
  provider: boolean;
}

const PROVIDER_ROLES = ['owner', 'manager', 'staff'];
const PROVIDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Espejo cliente de backend/providerAuth.resolveProviderClaims: el token
 * debe traer role=provider, providerId y providerRole válidos y no ser staff
 * interno. El backend además exige provider_members/{uid} activo.
 */
export function hasProviderClaims(claims: Record<string, unknown> | null | undefined): boolean {
  if (!claims) return false;
  if (String(claims.role ?? '').trim() !== 'provider') return false;
  const adminRole = String(claims.adminRole ?? '').trim().toLowerCase();
  if (claims.owner === true || claims.admin === true || ['owner', 'admin', 'operator'].includes(adminRole)) return false;
  if (typeof claims.providerId !== 'string' || !PROVIDER_ID_PATTERN.test(claims.providerId)) return false;
  return typeof claims.providerRole === 'string' && PROVIDER_ROLES.includes(claims.providerRole);
}

/** Qué secciones de rol muestra el menú. Un visitante sin sesión no ve ninguna. */
export function accountMenuSections(input: { signedIn: boolean; adminStatus: AdminAccessStatus; providerClaims: boolean }): AccountMenuSections {
  if (!input.signedIn) return { admin: false, provider: false };
  return { admin: input.adminStatus === 'allowed', provider: input.providerClaims };
}

export function adminMenuLinks(es: boolean): MenuLink[] {
  return [
    { id: 'control', to: '/admin', label: es ? 'Centro de control' : 'Control center' },
    { id: 'leads', to: '/admin/leads', label: 'Leads' },
    { id: 'ai-command', to: '/admin/ai-command', label: es ? 'Sala de mando IA' : 'AI command room' },
    { id: 'email', to: '/admin/email-operations', label: es ? 'Correo' : 'Email' },
    { id: 'financial-legal', to: '/admin/financial-legal', label: es ? 'Finanzas y legal' : 'Finance & legal' },
  ];
}

export const PROVIDER_PORTAL_PATH = '/provider/portal';

type FetchLike = (input: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

/**
 * Consulta GET /api/admin/access-policy con el ID token.
 * 'allowed' solo con {allowed:true}; 401/403 o {allowed:false} = 'denied';
 * cualquier otro fallo lanza (no se puede decidir).
 */
export async function checkAdminAccessPolicy(token: string, fetchImpl: FetchLike, signal?: AbortSignal): Promise<'allowed' | 'denied'> {
  const response = await fetchImpl('/api/admin/access-policy', { headers: { Authorization: 'Bearer ' + token }, signal });
  if (response.status === 401 || response.status === 403) return 'denied';
  if (!response.ok) throw new Error('Access check unavailable');
  const policy = await response.json();
  return policy?.allowed === true ? 'allowed' : 'denied';
}

/**
 * Caché solo en memoria, por uid: evita repetir la consulta en cada render
 * del encabezado y de la barra móvil. Solo guarda respuestas definitivas
 * (allowed/denied); un error se vuelve a intentar. Nunca toca el almacenamiento del navegador.
 */
export function createAdminAccessCache() {
  const results = new Map<string, 'allowed' | 'denied'>();
  const inflight = new Map<string, Promise<'allowed' | 'denied'>>();
  return {
    peek(uid: string): 'allowed' | 'denied' | undefined {
      return results.get(uid);
    },
    resolve(uid: string, load: () => Promise<'allowed' | 'denied'>): Promise<'allowed' | 'denied'> {
      const cached = results.get(uid);
      if (cached) return Promise.resolve(cached);
      const pending = inflight.get(uid);
      if (pending) return pending;
      const request = load()
        .then((result) => { if (inflight.get(uid) === request) results.set(uid, result); return result; })
        .finally(() => { if (inflight.get(uid) === request) inflight.delete(uid); });
      inflight.set(uid, request);
      return request;
    },
    clear(): void {
      results.clear();
      inflight.clear();
    },
  };
}
