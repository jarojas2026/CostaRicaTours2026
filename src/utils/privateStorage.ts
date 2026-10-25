/**
 * Almacenamiento personal del navegador con aislamiento por visitante/usuario.
 *
 * Regla de privacidad:
 * - Visitante sin sesión: los datos personales (historial e id de chat IA,
 *   borradores, itinerarios, favoritos, ids de viaje/reserva) viven solo en
 *   sessionStorage. Nunca en localStorage, así no pasan a la siguiente visita
 *   ni a otra persona que use el mismo navegador.
 * - Usuario con sesión: se guardan en localStorage con una clave que incluye
 *   su uid (`crt_u:<uid>:<clave>`) y se borran al cerrar sesión.
 * - Preferencias no personales (idioma, moneda, consentimiento de cookies,
 *   caché de chunks/catálogo offline) no pasan por este módulo.
 *
 * La identidad se fija con setStorageIdentity() desde el listener de Firebase
 * Auth. Mientras Auth no responde ("pending") se trata como visitante.
 */

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

/** Claves personales exactas usadas por la app (nombre base, sin uid). */
export const PERSONAL_STORAGE_KEYS = [
  'crt_chat_session_v2',
  'crt_customer_session',
  'crt_active_journey',
  'crt_journey_id',
  'crt_journey_session',
  'crt-counter-session',
  'crt-counter-widget-session',
  'costa_rica_custom_funnel_draft',
  'costa_rica_map_itinerary_v1',
  'costa_rica_tours_favorites',
  'cr_tours_my_bookings',
  'crt_last_booking_id',
  'crt_traveler_os_v1',
] as const;

/** Prefijos de claves personales (p. ej. historial de chat por agente). */
export const PERSONAL_STORAGE_PREFIXES = ['chat_history_'] as const;

export const USER_KEY_PREFIX = 'crt_u:';

export type PersonalStorageKey = (typeof PERSONAL_STORAGE_KEYS)[number] | `${(typeof PERSONAL_STORAGE_PREFIXES)[number]}${string}`;

export function isPersonalStorageKey(key: string): boolean {
  return (PERSONAL_STORAGE_KEYS as readonly string[]).includes(key)
    || PERSONAL_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix));
}

export function userScopedKey(uid: string, key: string): string {
  return `${USER_KEY_PREFIX}${uid}:${key}`;
}

/** 'anon' para visitantes (o Auth pendiente); `u:<uid>` para usuarios. */
export type StorageScopeKey = 'anon' | `u:${string}`;

type Backends = { local: KeyValueStorage | null; session: KeyValueStorage | null };

function defaultBackends(): Backends {
  const pick = (name: 'localStorage' | 'sessionStorage'): KeyValueStorage | null => {
    try {
      const store = (globalThis as any)[name] as KeyValueStorage | undefined;
      return store ?? null;
    } catch {
      return null; // modo privado / cookies bloqueadas
    }
  };
  return { local: pick('localStorage'), session: pick('sessionStorage') };
}

let backendsOverride: Backends | null = null;
const backends = (): Backends => backendsOverride ?? defaultBackends();

/** Solo para tests: inyecta almacenamientos falsos. `null` vuelve a los reales. */
export function configureStorageBackends(next: Backends | null): void {
  backendsOverride = next;
}

let currentUid: string | null = null;
let resolved = false;
/** Sube con cada cambio de identidad; distingue anon→usuario→anon de "siempre anon". */
let scopeEpoch = 0;
const listeners = new Set<() => void>();

export function getStorageScopeKey(): StorageScopeKey {
  return currentUid ? `u:${currentUid}` : 'anon';
}

export function getStorageUid(): string | null {
  return currentUid;
}

export function subscribeStorageScope(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

function keysOf(store: KeyValueStorage | null): string[] {
  if (!store) return [];
  return safe(() => {
    const out: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key !== null) out.push(key);
    }
    return out;
  }, []);
}

/** Borra los datos personales del visitante de esta pestaña (sessionStorage). */
export function clearAnonymousPersonalStorage(): void {
  const { session } = backends();
  for (const key of keysOf(session)) {
    if (isPersonalStorageKey(key)) safe(() => session!.removeItem(key), undefined);
  }
}

/** Borra todos los datos personales guardados para `uid` (localStorage) y la sesión de la pestaña. */
export function clearUserPersonalStorage(uid: string | null): void {
  const { local, session } = backends();
  if (uid) {
    const prefix = userScopedKey(uid, '');
    for (const key of keysOf(local)) {
      if (key.startsWith(prefix)) safe(() => local!.removeItem(key), undefined);
    }
    for (const key of keysOf(session)) {
      if (key.startsWith(prefix)) safe(() => session!.removeItem(key), undefined);
    }
  }
  clearAnonymousPersonalStorage();
}

/**
 * Elimina datos personales heredados guardados en localStorage sin uid
 * (versiones anteriores los compartían entre visitas y personas).
 */
export function purgeLegacyPersonalLocalStorage(): void {
  const { local } = backends();
  for (const key of keysOf(local)) {
    if (isPersonalStorageKey(key)) safe(() => local!.removeItem(key), undefined);
  }
}

/**
 * Fija la identidad activa. Llamar con el uid de Firebase (o null) cada vez
 * que cambia el estado de Auth.
 * - visitante → usuario: se descarta lo que el visitante dejó en la pestaña.
 * - usuario → otro usuario o → visitante: se borra lo del usuario anterior.
 * - pendiente → visitante (recarga sin sesión): se conserva la sesión de la pestaña.
 */
export function setStorageIdentity(uid: string | null): void {
  const nextUid = uid && uid.trim() ? uid.trim() : null;
  const previousUid = currentUid;
  const wasResolved = resolved;
  resolved = true;
  if (wasResolved && previousUid === nextUid) return;
  if (previousUid && previousUid !== nextUid) clearUserPersonalStorage(previousUid);
  if (nextUid && nextUid !== previousUid) clearAnonymousPersonalStorage();
  currentUid = nextUid;
  if (previousUid !== nextUid) scopeEpoch++;
  if (previousUid !== nextUid) listeners.forEach(listener => safe(listener, undefined));
}

/** Solo para tests. */
export function resetStorageIdentityForTests(): void {
  scopeEpoch++;
  currentUid = null;
  resolved = false;
  listeners.clear();
}

function target(key: string): { store: KeyValueStorage | null; storageKey: string } {
  const { local, session } = backends();
  return currentUid
    ? { store: local, storageKey: userScopedKey(currentUid, key) }
    : { store: session, storageKey: key };
}

export function getPersonalItem(key: PersonalStorageKey): string | null {
  const { store, storageKey } = target(key);
  return store ? safe(() => store.getItem(storageKey), null) : null;
}

export function setPersonalItem(key: PersonalStorageKey, value: string): void {
  const { store, storageKey } = target(key);
  if (store) safe(() => store.setItem(storageKey, value), undefined);
}

export function removePersonalItem(key: PersonalStorageKey): void {
  const { store, storageKey } = target(key);
  if (store) safe(() => store.removeItem(storageKey), undefined);
}

/** Dato personal efímero: siempre sessionStorage (con uid si hay sesión); se borra al cambiar de identidad. */
export function setSessionPersonalItem(key: PersonalStorageKey, value: string): void {
  const { session } = backends();
  if (!session) return;
  const storageKey = currentUid ? userScopedKey(currentUid, key) : key;
  safe(() => session.setItem(storageKey, value), undefined);
}

/**
 * Ámbito capturado al iniciar una operación asíncrona (fetch). Si el viajero
 * cierra sesión o cambia de cuenta antes de que llegue la respuesta, el
 * resultado viejo no debe escribirse bajo la identidad nueva ni en el
 * almacenamiento anónimo: comprobar con isStorageScopeCurrent() o escribir
 * con setPersonalItemInScope(), que descarta la escritura si el ámbito cambió.
 */
export interface StorageScopeSnapshot {
  readonly key: StorageScopeKey;
  readonly uid: string | null;
  readonly epoch: number;
}

export function captureStorageScope(): StorageScopeSnapshot {
  return Object.freeze({ key: getStorageScopeKey(), uid: currentUid, epoch: scopeEpoch });
}

/** true solo si la identidad no cambió desde captureStorageScope() (ni siquiera ida y vuelta). */
export function isStorageScopeCurrent(scope: StorageScopeSnapshot): boolean {
  return scope.epoch === scopeEpoch && scope.uid === currentUid;
}

/** Escribe solo si `scope` sigue activo; devuelve false (sin escribir) si la identidad cambió. */
export function setPersonalItemInScope(scope: StorageScopeSnapshot, key: PersonalStorageKey, value: string): boolean {
  if (!isStorageScopeCurrent(scope)) return false;
  setPersonalItem(key, value);
  return true;
}

export function getPersonalJSON<T>(key: PersonalStorageKey, fallback: T): T {
  const raw = getPersonalItem(key);
  if (!raw) return fallback;
  return safe(() => JSON.parse(raw) as T, fallback);
}

export function setPersonalJSON(key: PersonalStorageKey, value: unknown): void {
  setPersonalItem(key, JSON.stringify(value));
}
