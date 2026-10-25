import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { accountMenuSections, adminMenuLinks, checkAdminAccessPolicy, createAdminAccessCache, hasProviderClaims, PROVIDER_PORTAL_PATH } from '../src/utils/accountRoles';
import { resolveProviderClaims } from '../backend/providerAuth';

test('visitante sin sesión no ve accesos de rol', () => {
  assert.deepEqual(accountMenuSections({ signedIn: false, adminStatus: 'allowed', providerClaims: true }), { admin: false, provider: false });
});

test('cliente con sesión ve solo su perfil normal', () => {
  for (const adminStatus of ['checking', 'denied', 'error'] as const) {
    assert.deepEqual(accountMenuSections({ signedIn: true, adminStatus, providerClaims: false }), { admin: false, provider: false }, adminStatus);
  }
});

test('admin ve el panel solo con access-policy allowed', () => {
  assert.deepEqual(accountMenuSections({ signedIn: true, adminStatus: 'allowed', providerClaims: false }), { admin: true, provider: false });
});

test('proveedor ve el portal de proveedores', () => {
  assert.deepEqual(accountMenuSections({ signedIn: true, adminStatus: 'denied', providerClaims: true }), { admin: false, provider: true });
  assert.equal(PROVIDER_PORTAL_PATH, '/provider/portal');
});

test('enlaces admin apuntan a rutas protegidas existentes, en ES y EN', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const es = adminMenuLinks(true);
  const en = adminMenuLinks(false);
  assert.deepEqual(es.map(l => l.to), ['/admin', '/admin/leads', '/admin/ai-command', '/admin/email-operations', '/admin/financial-legal']);
  assert.deepEqual(es.map(l => l.label), ['Centro de control', 'Leads', 'Sala de mando IA', 'Correo', 'Finanzas y legal']);
  assert.deepEqual(en.map(l => l.label), ['Control center', 'Leads', 'AI command room', 'Email', 'Finance & legal']);
  for (const { to } of es) {
    assert.match(app, new RegExp(`<Route path="${to}" element=\\{<AdminRouteGuard`), to);
  }
});

test('claims de proveedor: el cliente coincide con el backend', () => {
  const cases: Array<Record<string, unknown>> = [
    { uid: 'u1', role: 'provider', providerId: 'op_1', providerRole: 'owner' },
    { uid: 'u1', role: 'provider', providerId: 'op_1', providerRole: 'staff' },
    { uid: 'u1', role: 'provider', providerId: 'op 1', providerRole: 'owner' },
    { uid: 'u1', role: 'provider', providerId: 'op_1', providerRole: 'boss' },
    { uid: 'u1', role: 'customer', providerId: 'op_1', providerRole: 'owner' },
    { uid: 'u1', role: 'provider', providerId: 'op_1', providerRole: 'owner', admin: true },
    { uid: 'u1', role: 'provider', providerId: 'op_1', providerRole: 'owner', adminRole: 'operator' },
    { uid: 'u1' },
  ];
  for (const claims of cases) {
    assert.equal(hasProviderClaims(claims), resolveProviderClaims(claims as any) !== null, JSON.stringify(claims));
  }
  assert.equal(hasProviderClaims(null), false);
});

const response = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('checkAdminAccessPolicy envía el ID token y solo acepta {allowed:true}', async () => {
  let seen: any;
  const ok = await checkAdminAccessPolicy('tok', async (url, init) => { seen = { url, init }; return response(200, { allowed: true }); });
  assert.equal(ok, 'allowed');
  assert.equal(seen.url, '/api/admin/access-policy');
  assert.equal(seen.init.headers.Authorization, 'Bearer tok');
  assert.equal(await checkAdminAccessPolicy('tok', async () => response(200, { allowed: 'yes' })), 'denied');
  assert.equal(await checkAdminAccessPolicy('tok', async () => response(403, {})), 'denied');
  assert.equal(await checkAdminAccessPolicy('tok', async () => response(401, {})), 'denied');
  await assert.rejects(checkAdminAccessPolicy('tok', async () => response(503, {})));
});

test('caché admin: en memoria por uid, deduplica y no guarda errores', async () => {
  const cache = createAdminAccessCache();
  let calls = 0;
  const load = async () => { calls++; return 'allowed' as const; };
  const [a, b] = await Promise.all([cache.resolve('u1', load), cache.resolve('u1', load)]);
  assert.deepEqual([a, b, calls], ['allowed', 'allowed', 1]);
  await cache.resolve('u1', load);
  assert.equal(calls, 1, 'resultado reutilizado para el mismo uid');
  assert.equal(cache.peek('u2'), undefined, 'otro uid no hereda el resultado');

  let failures = 0;
  await assert.rejects(cache.resolve('u3', async () => { failures++; throw new Error('down'); }));
  assert.equal(cache.peek('u3'), undefined);
  await cache.resolve('u3', async () => { failures++; return 'denied'; });
  assert.equal(failures, 2, 'un error se reintenta');

  cache.clear();
  assert.equal(cache.peek('u1'), undefined);
});

test('Header y BottomNav muestran el acceso admin solo según el rol verificado', () => {
  const header = fs.readFileSync('src/components/Header.tsx', 'utf8');
  assert.match(header, /useAdminAccess\(\)/);
  assert.match(header, /\{roleSections\.admin && \(/);
  assert.match(header, /'Panel de administración' : 'Admin panel'/);
  assert.match(header, /\{roleSections\.provider && \(/);
  assert.match(header, /'Portal de proveedores' : 'Provider portal'/);
  const bottom = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');
  assert.match(bottom, /\.\.\.\(isAdmin \? \[\{ id: 'admin'/);
  const guard = fs.readFileSync('src/components/AdminRouteGuard.tsx', 'utf8');
  assert.match(guard, /checkAdminAccessPolicy\(token, fetch, request\.signal\)/);
  const hook = fs.readFileSync('src/hooks/useAdminAccess.ts', 'utf8');
  assert.doesNotMatch(hook, /localStorage|sessionStorage/, 'la caché admin es solo en memoria');
});
