/** Envía una petición de la oficina (ver agentOfficeRequests.ts) con el token del owner actual. */
import { auth } from '../firebase';
import type { OfficeRequest } from './agentOfficeRequests';

export { officeRequests, type OfficeRequest } from './agentOfficeRequests';

/** Ejecuta una petición de la oficina con el token del usuario actual (owner). */
export async function ownerOfficeFetch<T = any>(request: OfficeRequest, es = true): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error(es ? 'Inicia sesión como propietario.' : 'Sign in as the owner.');
  const headers: Record<string, string> = { Authorization: 'Bearer ' + await user.getIdToken() };
  if (request.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(request.url, { method: request.method, headers, body: request.body ? JSON.stringify(request.body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403) throw new Error(es ? 'Esta acción requiere acceso del propietario.' : 'Owner access required.');
    throw new Error(typeof data?.error === 'string' ? data.error : (es ? 'No fue posible completar la acción.' : 'Unable to complete the action.'));
  }
  return data as T;
}
