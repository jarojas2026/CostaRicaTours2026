/** Shared transport for the desk. Never retries potentially stateful requests. */
export async function deskRequest(url: string, init: RequestInit = {}, language = 'es'): Promise<any> {
  const es = language === 'es';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const abort = () => controller.abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  if (init.signal?.aborted) abort();
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (response.status === 401) throw new Error(es ? 'Inicia sesión para consultar operaciones.' : 'Sign in to view operations.');
    if (response.status === 403) throw new Error(es ? 'Tu cuenta no tiene permiso para este centro administrativo.' : 'Your account cannot access this administrative center.');
    if (!response.ok) throw new Error(es ? 'El servicio no pudo completar la consulta. El resultado no está verificado.' : 'The service could not complete the request. The result is unverified.');
    const data = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.success === false) {
      throw new Error(es ? 'Respuesta no válida del servicio.' : 'Invalid service response.');
    }
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error(es ? 'La consulta se interrumpió o agotó su tiempo. Comprueba el estado antes de repetir una operación.' : 'The request was interrupted or timed out. Check its status before repeating an operation.');
    if (error instanceof SyntaxError) throw new Error(es ? 'El servicio devolvió una respuesta ilegible. El resultado no está verificado.' : 'The service returned an unreadable response. The result is unverified.');
    throw error;
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener('abort', abort);
  }
}

export function hasDeskSnapshot(data: any): boolean {
  return !!data?.snapshot && typeof data.snapshot.counters === 'object'
    && data.snapshot.counters !== null && !Array.isArray(data.snapshot.counters)
    && Array.isArray(data.snapshot.upcoming) && Array.isArray(data.snapshot.alerts);
}

export function deskCounterValue(data: any, key: string): number | '—' {
  if (!hasDeskSnapshot(data)) return '—';
  if (key === 'activeProviders' && data.snapshot.providerTruth?.sourceOfTruth === 'unavailable') return '—';
  const value = data.snapshot.counters[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : '—';
}
