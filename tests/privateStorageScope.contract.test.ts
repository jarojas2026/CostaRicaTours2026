import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { beforeEach } from 'node:test';
import {
  captureStorageScope,
  configureStorageBackends,
  getPersonalItem,
  isStorageScopeCurrent,
  resetStorageIdentityForTests,
  setPersonalItemInScope,
  setStorageIdentity,
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

/** Simula una petición pendiente (como /api/journey/build) que guarda el journey al llegar la respuesta. */
function pendingJourneyRequest() {
  const scope = captureStorageScope();
  let resolve!: (journeyId: string) => void;
  const done = new Promise<boolean>((ok) => {
    resolve = (journeyId) => ok(setPersonalItemInScope(scope, 'crt_journey_id', journeyId));
  });
  return { scope, respond: resolve, done };
}

test('misma identidad: la respuesta se guarda en el ámbito original', async () => {
  setStorageIdentity('uid-ana');
  const req = pendingJourneyRequest();
  req.respond('j-ana');
  assert.equal(await req.done, true);
  assert.equal(local.getItem(userScopedKey('uid-ana', 'crt_journey_id')), 'j-ana');
  assert.equal(isStorageScopeCurrent(req.scope), true);
});

test('cambio de cuenta con la petición pendiente: no se escribe bajo la cuenta nueva', async () => {
  setStorageIdentity('uid-ana');
  const req = pendingJourneyRequest();
  setStorageIdentity('uid-beto');
  req.respond('j-ana');
  assert.equal(await req.done, false);
  assert.equal(getPersonalItem('crt_journey_id'), null, 'Beto no recibe el journey de Ana');
  assert.equal(local.getItem(userScopedKey('uid-beto', 'crt_journey_id')), null);
  assert.equal(local.getItem(userScopedKey('uid-ana', 'crt_journey_id')), null, 'tampoco reaparece lo de Ana tras la limpieza');
  assert.equal(session.length, 0);
});

test('cierre de sesión con la petición pendiente: no se escribe en el almacenamiento anónimo', async () => {
  setStorageIdentity('uid-ana');
  const req = pendingJourneyRequest();
  setStorageIdentity(null);
  req.respond('j-ana');
  assert.equal(await req.done, false);
  assert.equal(session.getItem('crt_journey_id'), null);
  assert.equal(getPersonalItem('crt_journey_id'), null);
  assert.equal(local.length, 0);
});

test('visitante que inicia sesión con la petición pendiente: no se escribe bajo el usuario', async () => {
  setStorageIdentity(null);
  const req = pendingJourneyRequest();
  setStorageIdentity('uid-ana');
  req.respond('j-anon');
  assert.equal(await req.done, false);
  assert.equal(getPersonalItem('crt_journey_id'), null);
  assert.equal(local.length, 0);
});

test('ida y vuelta (visitante → usuario → visitante): la respuesta vieja igual se descarta', async () => {
  setStorageIdentity(null);
  const req = pendingJourneyRequest();
  setStorageIdentity('uid-ana');
  setStorageIdentity(null);
  assert.equal(captureStorageScope().key, req.scope.key, 'mismo nombre de ámbito');
  req.respond('j-anon');
  assert.equal(await req.done, false, 'pero otra época de identidad: puede ser otra persona');
  assert.equal(session.getItem('crt_journey_id'), null);
});

test('el ámbito capturado es inmutable', () => {
  setStorageIdentity('uid-ana');
  const scope = captureStorageScope();
  assert.ok(Object.isFrozen(scope));
  assert.equal(scope.key, 'u:uid-ana');
  assert.equal(scope.uid, 'uid-ana');
});

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');

test('FullTripJourneyBuilder: build() y adapt() capturan el ámbito, abortan al desmontar y descartan respuestas obsoletas', () => {
  const source = read('src', 'components', 'FullTripJourneyBuilder.tsx');
  assert.doesNotMatch(source, /\bsetPersonalItem\(/, 'nada de escrituras sin ámbito tras un await');
  assert.match(source, /setPersonalItemInScope\(scope, journeyStorageKey/);
  assert.match(source, /controller\.signal\.aborted \|\| !isStorageScopeCurrent\(scope\)/);
  assert.match(source, /signal: controller\.signal/);
  assert.match(source, /inflight\.forEach\(controller => controller\.abort\(\)\)/);
  for (const fn of ['build', 'adapt']) {
    const body = source.slice(source.indexOf(`async function ${fn}()`));
    const capture = body.indexOf('captureStorageScope()');
    const fetchAt = body.indexOf('await fetch(');
    const staleCheck = body.indexOf('if (isStale(controller, scope)) return;');
    const write = body.indexOf('setPersonalItemInScope(scope, journeyStorageKey');
    assert.ok(capture > -1 && capture < fetchAt, `${fn}: captura el ámbito antes del fetch`);
    assert.ok(staleCheck > fetchAt && staleCheck < write, `${fn}: descarta la respuesta obsoleta antes de guardar`);
  }
  assert.match(source, /export const FullTripJourneyBuilder = withStorageScope\(FullTripJourneyBuilderComponent\)/);
});

test('App: la respuesta de customer-intake se descarta si cambió la identidad', () => {
  const source = read('src', 'App.tsx');
  const start = source.indexOf('const handleCustomerIntake');
  const handler = source.slice(start, source.indexOf("window.addEventListener('customer-intake-request'", start));
  assert.doesNotMatch(handler, /\bsetPersonalItem\(/);
  const capture = handler.indexOf('const scopeAtRequest = captureStorageScope()');
  const fetchAt = handler.indexOf("await fetch('/api/customer-intake'");
  const staleCheck = handler.indexOf('if (!isStorageScopeCurrent(scopeAtRequest)) { discardStaleIntake(); return; }');
  const reply = handler.indexOf('setIntakeReply(data.customer');
  assert.ok(capture > -1 && capture < fetchAt, 'captura el ámbito antes del fetch');
  assert.ok(staleCheck > fetchAt && staleCheck < reply, 'descarta antes de mostrar o guardar');
  assert.match(handler, /setPersonalItemInScope\(scopeAtRequest, 'crt_active_journey'/);
  assert.match(handler, /discarded: true/);
});
