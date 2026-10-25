import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { beforeEach } from 'node:test';
import {
  PERSONAL_STORAGE_KEYS,
  clearUserPersonalStorage,
  configureStorageBackends,
  getPersonalItem,
  getStorageScopeKey,
  isPersonalStorageKey,
  purgeLegacyPersonalLocalStorage,
  removePersonalItem,
  resetStorageIdentityForTests,
  setPersonalItem,
  setSessionPersonalItem,
  setStorageIdentity,
  subscribeStorageScope,
  userScopedKey,
  type KeyValueStorage,
} from '../src/utils/privateStorage';

class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  key(index: number) { return [...this.map.keys()][index] ?? null; }
  getItem(key: string) { return this.map.has(key) ? this.map.get(key)! : null; }
  setItem(key: string, value: string) { this.map.set(key, String(value)); }
  removeItem(key: string) { this.map.delete(key); }
  keys() { return [...this.map.keys()]; }
}

let local: MemoryStorage;
let session: MemoryStorage;

beforeEach(() => {
  local = new MemoryStorage();
  session = new MemoryStorage();
  configureStorageBackends({ local, session });
  resetStorageIdentityForTests();
});

test('visitante sin sesión: lo personal va a sessionStorage, nunca a localStorage', () => {
  setStorageIdentity(null);
  setPersonalItem('chat_history_concierge', '[{"text":"hola"}]');
  setPersonalItem('crt_chat_session_v2', '{"sessionId":"s1","sessionToken":"t1"}');
  assert.equal(local.length, 0);
  assert.equal(session.getItem('chat_history_concierge'), '[{"text":"hola"}]');
  assert.equal(getPersonalItem('crt_chat_session_v2'), '{"sessionId":"s1","sessionToken":"t1"}');
});

test('Auth pendiente se trata como visitante (no escribe en localStorage)', () => {
  assert.equal(getStorageScopeKey(), 'anon');
  setPersonalItem('costa_rica_custom_funnel_draft', '{"customerEmail":"a@b.c"}');
  assert.equal(local.length, 0);
});

test('usuario con sesión: clave con uid en localStorage y aislada de otros usuarios', () => {
  setStorageIdentity('uid-ana');
  setPersonalItem('costa_rica_tours_favorites', '["t1"]');
  assert.equal(local.getItem(userScopedKey('uid-ana', 'costa_rica_tours_favorites')), '["t1"]');
  assert.equal(local.getItem('costa_rica_tours_favorites'), null);
  assert.equal(getStorageScopeKey(), 'u:uid-ana');

  setStorageIdentity('uid-beto');
  assert.equal(getPersonalItem('costa_rica_tours_favorites'), null, 'Beto no ve favoritos de Ana');
  assert.equal(local.getItem(userScopedKey('uid-ana', 'costa_rica_tours_favorites')), null, 'lo de Ana se borra al cambiar de usuario');
});

test('al iniciar sesión se descarta lo que dejó el visitante en la pestaña', () => {
  setStorageIdentity(null);
  setPersonalItem('crt_chat_session_v2', '{"sessionId":"anon","sessionToken":"x"}');
  setPersonalItem('chat_history_concierge', '[1]');
  setStorageIdentity('uid-ana');
  assert.equal(session.getItem('crt_chat_session_v2'), null);
  assert.equal(session.getItem('chat_history_concierge'), null);
  assert.equal(getPersonalItem('crt_chat_session_v2'), null, 'el chat no reutiliza el id del visitante');
});

test('cerrar sesión borra todo lo personal del usuario y conserva preferencias no personales', () => {
  local.setItem('crt_language', 'es');
  local.setItem('cookie-consent', 'all');
  setStorageIdentity('uid-ana');
  setPersonalItem('chat_history_concierge', '[1]');
  setPersonalItem('crt_traveler_os_v1', '{}');
  setSessionPersonalItem('crt_last_booking_id', 'b1');
  clearUserPersonalStorage('uid-ana');
  setStorageIdentity(null);
  assert.deepEqual(local.keys().sort(), ['cookie-consent', 'crt_language']);
  assert.equal(session.length, 0);
});

test('recarga sin sesión (pendiente → visitante) conserva la sesión de la pestaña', () => {
  session.setItem('chat_history_concierge', '[1]');
  setStorageIdentity(null);
  assert.equal(getPersonalItem('chat_history_concierge'), '[1]');
});

test('datos personales heredados sin uid en localStorage se eliminan; caché no personal se conserva', () => {
  for (const key of PERSONAL_STORAGE_KEYS) local.setItem(key, 'old');
  local.setItem('chat_history_concierge', 'old');
  local.setItem('pura_vida_offline_map_tours_v3', '[]');
  local.setItem('cookie-consent', 'essential');
  local.setItem(userScopedKey('uid-ana', 'costa_rica_tours_favorites'), '["t1"]');
  purgeLegacyPersonalLocalStorage();
  assert.deepEqual(local.keys().sort(), ['cookie-consent', 'crt_u:uid-ana:costa_rica_tours_favorites', 'pura_vida_offline_map_tours_v3'].sort());
});

test('los listeners se notifican solo cuando cambia la identidad', () => {
  let calls = 0;
  subscribeStorageScope(() => { calls++; });
  setStorageIdentity(null);
  setStorageIdentity(null);
  setStorageIdentity('uid-ana');
  setStorageIdentity('uid-ana');
  setStorageIdentity(null);
  assert.equal(calls, 2);
});

test('removePersonalItem actúa solo en el ámbito activo', () => {
  setStorageIdentity('uid-ana');
  setPersonalItem('crt_active_journey', 'j1');
  removePersonalItem('crt_active_journey');
  assert.equal(getPersonalItem('crt_active_journey'), null);
});

test('almacenamiento no disponible (modo privado) no rompe la app', () => {
  const broken: KeyValueStorage = {
    get length(): number { throw new Error('blocked'); },
    key() { throw new Error('blocked'); },
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  configureStorageBackends({ local: broken, session: broken });
  setStorageIdentity('uid-ana');
  assert.doesNotThrow(() => setPersonalItem('crt_active_journey', 'j1'));
  assert.equal(getPersonalItem('crt_active_journey'), null);
  assert.doesNotThrow(() => clearUserPersonalStorage('uid-ana'));
  assert.doesNotThrow(() => purgeLegacyPersonalLocalStorage());
});

test('clasificación de claves: personales vs preferencias', () => {
  for (const key of ['chat_history_guide', 'crt_chat_session_v2', 'costa_rica_map_itinerary_v1']) assert.ok(isPersonalStorageKey(key), key);
  for (const key of ['cookie-consent', 'crt_language', 'pura_vida_offline_map_tours_v3']) assert.equal(isPersonalStorageKey(key), false, key);
});

test('el frontend no lee ni escribe claves personales directamente en localStorage/sessionStorage', () => {
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : /\.(tsx?)$/.test(entry.name) ? [full] : [];
  });
  const offenders: string[] = [];
  for (const file of walk(path.join(process.cwd(), 'src'))) {
    if (file.endsWith(path.join('utils', 'privateStorage.ts'))) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*([^,)]+)/g)) {
      const arg = match[1].trim();
      const literal = arg.match(/^['"`]([^'"`$]+)/)?.[1];
      if (literal && isPersonalStorageKey(literal)) offenders.push(`${path.relative(process.cwd(), file)}: ${arg}`);
      if (/chat_history_|STORAGE_KEY\b|DRAFT_KEY|journeyStorageKey/.test(arg)) offenders.push(`${path.relative(process.cwd(), file)}: ${arg}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('el chat IA guarda su sesión con el helper y descarta sesiones de otra identidad', () => {
  const chat = fs.readFileSync(path.join(process.cwd(), 'src', 'utils', 'chatSession.ts'), 'utf8');
  assert.doesNotMatch(chat, /localStorage/);
  assert.match(chat, /getStorageScopeKey\(\) !== scopeAtRequest/);
  const firebase = fs.readFileSync(path.join(process.cwd(), 'src', 'firebase.ts'), 'utf8');
  assert.match(firebase, /onAuthStateChanged\(auth, \(user\) => setStorageIdentity\(user\?\.uid \?\? null\)\)/);
  assert.match(firebase, /clearUserPersonalStorage\(auth\.currentUser\?\.uid \?\? null\);\s*\n\s*await firebaseSignOut\(auth\)/);
  const assistant = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'AIAssistant.tsx'), 'utf8');
  assert.match(assistant, /export const AIAssistant = withStorageScope\(AIAssistantComponent\)/);
});
