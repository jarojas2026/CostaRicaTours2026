/**
 * #319 — Rol `provider` y aislamiento por tenant.
 * Prueba que el proveedor A nunca ve datos del proveedor B (servidor y reglas).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  __setProviderAuthDepsForTests,
  buildProviderClaims,
  buildProviderMemberRecord,
  providerRoleAllows,
  requireProvider,
  resolveProviderAccess,
  resolveProviderClaims,
  type ProviderAuthDeps,
  type ProviderContext,
} from '../backend/providerAuth';
import { listTenantServiceOrders, loadTenantServiceOrder, scopeToTenant } from '../backend/providerTenantScope';
import { createFakeFirestore } from './helpers/fakeFirestore';

const A: ProviderContext = { uid: 'uid_a_owner', providerId: 'prov_a', providerRole: 'owner' };
const B: ProviderContext = { uid: 'uid_b_owner', providerId: 'prov_b', providerRole: 'owner' };

const tokens: Record<string, Record<string, any>> = {
  'tok-a': { uid: A.uid, role: 'provider', providerId: 'prov_a', providerRole: 'owner' },
  'tok-b': { uid: B.uid, role: 'provider', providerId: 'prov_b', providerRole: 'owner' },
  'tok-a-staff': { uid: 'uid_a_staff', role: 'provider', providerId: 'prov_a', providerRole: 'staff' },
  'tok-customer': { uid: 'uid_customer' },
  'tok-admin': { uid: 'uid_admin', role: 'admin' },
  'tok-mixed': { uid: 'uid_mixed', role: 'provider', providerId: 'prov_a', providerRole: 'owner', owner: true },
};
const members: Record<string, Record<string, any>> = {
  [A.uid]: { providerId: 'prov_a', providerRole: 'owner', status: 'active' },
  [B.uid]: { providerId: 'prov_b', providerRole: 'owner', status: 'active' },
  uid_a_staff: { providerId: 'prov_a', providerRole: 'staff', status: 'active' },
};
const deps = (overrides: Partial<ProviderAuthDeps> = {}): ProviderAuthDeps => ({
  verifyIdToken: async (token) => {
    if (!tokens[token]) throw new Error('invalid');
    return tokens[token];
  },
  loadMember: async (uid) => members[uid] || null,
  ...overrides,
});

const orders = {
  so_a1: { providerId: 'prov_a', bookingId: 'bk_a1', status: 'dispatched', tourName: 'Tour A1', date: '2026-11-01', customer: { name: 'Ana Prueba Uno', email: 'ana@example.invalid', phone: '+000 1111' } },
  so_a2: { providerId: 'prov_a', bookingId: 'bk_a2', status: 'confirmed', tourName: 'Tour A2', date: '2026-11-02', assignedStaffUid: 'uid_a_staff', customer: { name: 'Beto Prueba', email: 'beto@example.invalid', phone: '+000 2222' } },
  so_b1: { providerId: 'prov_b', bookingId: 'bk_b1', status: 'dispatched', tourName: 'Tour B1', date: '2026-11-03', customer: { name: 'Carla Prueba', email: 'carla@example.invalid', phone: '+000 3333' } },
};

test('claims: solo role=provider con providerId y providerRole válidos', () => {
  assert.deepEqual(resolveProviderClaims(tokens['tok-a']), A);
  assert.equal(resolveProviderClaims(tokens['tok-customer']), null);
  assert.equal(resolveProviderClaims(tokens['tok-admin']), null);
  assert.equal(resolveProviderClaims(tokens['tok-mixed']), null, 'no mezclar owner CRT con proveedor');
  assert.equal(resolveProviderClaims({ uid: 'x', role: 'provider', providerId: '../prov_b', providerRole: 'owner' }), null);
  assert.equal(resolveProviderClaims({ uid: 'x', role: 'provider', providerId: 'prov_a', providerRole: 'superuser' }), null);
  assert.ok(providerRoleAllows('owner', 'manager'));
  assert.ok(!providerRoleAllows('staff', 'manager'));
  assert.ok(!providerRoleAllows('manager', 'owner'));
});

test('acceso: token inválido 401, no proveedor 403, membresía revocada/ajena 403, sin Firestore 503', async () => {
  assert.equal((await resolveProviderAccess(undefined, deps())).ok, false);
  assert.deepEqual(await resolveProviderAccess('Bearer nope', deps()), { ok: false, status: 401, error: 'Token de autenticación inválido, vencido o revocado.' });
  const customer = await resolveProviderAccess('Bearer tok-customer', deps());
  assert.equal(!customer.ok && customer.status, 403);
  const revoked = await resolveProviderAccess('Bearer tok-a', deps({ loadMember: async () => ({ ...members[A.uid], status: 'revoked' }) }));
  assert.equal(!revoked.ok && revoked.status, 403);
  const forged = await resolveProviderAccess('Bearer tok-a', deps({ loadMember: async () => ({ ...members[A.uid], providerId: 'prov_b' }) }));
  assert.equal(!forged.ok && forged.status, 403, 'claim A con membresía B se rechaza');
  const noDb = await resolveProviderAccess('Bearer tok-a', deps({ loadMember: async () => { throw new Error('down'); } }));
  assert.equal(!noDb.ok && noDb.status, 503);
  const staffForManager = await resolveProviderAccess('Bearer tok-a-staff', deps(), 'manager');
  assert.equal(!staffForManager.ok && staffForManager.status, 403);
  const ok = await resolveProviderAccess('Bearer tok-a', deps(), 'owner');
  assert.ok(ok.ok && ok.provider.providerId === 'prov_a');
});

test('middleware: el providerId del body/query/params se ignora; manda el token', async () => {
  __setProviderAuthDepsForTests(deps());
  try {
    const req: any = { headers: { authorization: 'Bearer tok-a' }, body: { providerId: 'prov_b' }, query: { providerId: 'prov_b' }, params: { providerId: 'prov_b' } };
    let status = 200;
    const res: any = { status: (s: number) => { status = s; return res; }, json: () => res };
    let nextCalled = false;
    await requireProvider('staff')(req, res, () => { nextCalled = true; });
    assert.ok(nextCalled);
    assert.equal(status, 200);
    assert.equal(req.provider.providerId, 'prov_a');
    const denied: any = { headers: {}, body: { providerId: 'prov_a' } };
    await requireProvider('staff')(denied, res, () => assert.fail('no debe pasar sin token'));
    assert.equal(status, 401);
  } finally {
    __setProviderAuthDepsForTests(null);
  }
});

test('servidor: proveedor A solo lista sus órdenes y nunca ve las de B', async () => {
  const { db } = createFakeFirestore({ service_orders: orders });
  const listA = await listTenantServiceOrders(db, A);
  assert.deepEqual(listA.map((o: any) => o.id).sort(), ['so_a1', 'so_a2']);
  assert.ok(listA.every((o: any) => o.providerId === 'prov_a'));
  const listB = await listTenantServiceOrders(db, B);
  assert.deepEqual(listB.map((o: any) => o.id), ['so_b1']);
  const serialized = JSON.stringify(listA);
  assert.doesNotMatch(serialized, /prov_b|Carla|example\.invalid|\+000/);
});

test('servidor: lectura por id de una orden de B desde A responde "no encontrado"', async () => {
  const { db } = createFakeFirestore({ service_orders: orders });
  assert.equal(await loadTenantServiceOrder(db, A, 'so_b1'), null);
  assert.equal(await loadTenantServiceOrder(db, B, 'so_a1'), null);
  assert.equal(await loadTenantServiceOrder(db, A, '../so_b1'), null);
  const own: any = await loadTenantServiceOrder(db, A, 'so_a1');
  assert.equal(own.id, 'so_a1');
  assert.equal(own.customer.displayName, 'Ana U.');
  assert.equal(own.customer.email, undefined);
  assert.equal(own.customer.phone, undefined);
});

test('servidor: staff solo ve órdenes asignadas a su uid', async () => {
  const { db } = createFakeFirestore({ service_orders: orders });
  const staff: ProviderContext = { uid: 'uid_a_staff', providerId: 'prov_a', providerRole: 'staff' };
  assert.deepEqual((await listTenantServiceOrders(db, staff)).map((o: any) => o.id), ['so_a2']);
  assert.equal(await loadTenantServiceOrder(db, staff, 'so_a1'), null);
  assert.deepEqual(scopeToTenant([{ providerId: 'prov_b', assignedStaffUid: 'uid_a_staff' }], staff), []);
});

test('alta de miembro: no mezcla identidades ni proveedores', () => {
  assert.deepEqual(buildProviderClaims({}, 'prov_a', 'manager'), { role: 'provider', providerId: 'prov_a', providerRole: 'manager' });
  assert.throws(() => buildProviderClaims({ role: 'admin' }, 'prov_a', 'owner'));
  assert.throws(() => buildProviderClaims({ owner: true }, 'prov_a', 'owner'));
  assert.throws(() => buildProviderClaims({ role: 'provider', providerId: 'prov_b' }, 'prov_a', 'owner'));
  assert.throws(() => buildProviderMemberRecord({ uid: 'u1', providerId: 'prov/../b', providerRole: 'owner', invitedBy: null }));
  assert.equal(buildProviderMemberRecord({ uid: 'u1', providerId: 'prov_a', providerRole: 'staff', invitedBy: 'adm' }).status, 'active');
});

const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
const block = (header: string) => {
  const start = rules.indexOf(header);
  assert.ok(start >= 0, `falta ${header}`);
  const end = rules.indexOf('\n    }', start);
  return rules.slice(start, end);
};

test('reglas: cada colección provider_* exige providerId == token y es solo-lectura', () => {
  assert.match(rules, /request\.auth\.token\.role == 'provider'/);
  assert.match(rules, /function myProvider\(\) \{ return request\.auth\.token\.providerId; \}/);
  for (const header of [
    'match /provider_orders/{orderId}',
    'match /provider_settlements/{settlementId}',
    'match /provider_metrics_monthly/{metricId}',
    'match /provider_reviews/{reviewId}',
  ]) {
    const b = block(header);
    assert.match(b, /resource\.data\.providerId == myProvider\(\)/, `${header} sin filtro de tenant`);
    assert.match(b, /allow create, update, delete: if false;/, `${header} debe ser server-owned`);
  }
  assert.match(block('match /provider_profiles/{providerId}'), /providerId == myProvider\(\)/);
  assert.match(block('match /provider_settlements/{settlementId}'), /providerRole\(\) == 'owner'/);
  assert.match(block('match /provider_orders/{orderId}'), /assignedStaffUid == request\.auth\.uid/);
  assert.match(block('match /provider_members/{memberUid}'), /allow create, update, delete: if false;/);
});

test('reglas: el proveedor no tiene acceso a bookings, leads ni service_orders crudos', () => {
  for (const header of ['match /bookings/{bookingId}', 'match /leads/{leadId}', 'match /escalations/{escalationId}']) {
    assert.doesNotMatch(block(header), /isProvider|myProvider/);
  }
  assert.doesNotMatch(rules, /match \/service_orders\//, 'service_orders queda en Default Deny');
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
});

test('el rol provider no otorga acceso de operación/admin', () => {
  const auth = fs.readFileSync(path.join(process.cwd(), 'backend/authMiddleware.ts'), 'utf8');
  assert.match(auth, /claimedRole === 'admin' \|\| claimedRole === 'operator'/);
  assert.doesNotMatch(auth, /'provider'/);
  const routes = fs.readFileSync(path.join(process.cwd(), 'backend/routes/provider.ts'), 'utf8');
  assert.match(routes, /'\/api\/provider\/v2\/me', requireProvider\('staff'\)/);
  assert.match(routes, /'\/api\/admin\/providers\/:providerId\/members', requireAdmin/);
  assert.doesNotMatch(routes, /req\.(body|query)\??\.providerId/);
});
