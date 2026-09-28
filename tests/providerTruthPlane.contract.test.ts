import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('provider dispatch fails closed instead of assigning static fallback operators', () => {
  const native = read('backend/nativeWorkflows.ts');
  assert.equal(native.includes("await getProviderFromDb(providerId) || MASTER_OPERATORS_REGISTRY['alsama-tours-cr']"), false);
  assert.equal(native.includes("booking.providerId || booking.providerInfo?.id || 'alsama-tours-cr'"), false);
  assert.equal(native.includes('Reasignando a Alsama Tours CR Operaciones Directas'), false);
  assert.match(native, /PROVIDER_ASSIGNMENT_UNVERIFIED/);
  assert.match(native, /requires_human_assignment/);
  assert.match(native, /ALLOW_LEGACY_PROVIDER_DIRECTORY/);
  assert.equal(native.includes('SUCCESS_SIMULATED'), false);
  assert.equal(native.includes("booking.totalUSD || booking.totalAmount || 100"), false);
});

test('provider coordination receives the booking provider and tour identity', () => {
  const server = read('server.ts');
  assert.match(server, /providerId: booking\.providerId/);
  assert.match(server, /tourId: booking\.tourId/);
  assert.equal(server.includes('Object.values(MASTER_OPERATORS_REGISTRY)'), false);
  assert.match(server, /sourceOfTruth: 'firestore'/);
  assert.match(server, /executeAutomatedProviderPayouts \} from '\.\/backend\/providerPayoutService'/);
  assert.match(server, /app\.post\('\/api\/payouts\/run-batch', requireAdmin/);
  assert.match(server, /app\.post\('\/webhook\/pagos-proveedores-batch'[\s\S]*status\(410\)/);
});

test('provider status only becomes notified after successful delivery', () => {
  const native = read('backend/nativeWorkflows.ts');
  assert.match(native, /providerStatus: 'dispatch_pending'/);
  assert.match(native, /if \(emailResult\.success\)[\s\S]*providerStatus: 'notified'/);
  assert.match(native, /providerStatus: 'notification_failed'/);
});


test('provider public actions require a signed portal capability and do not auto-confirm the booking', () => {
  const native = read('backend/nativeWorkflows.ts');
  const server = read('server.ts');
  const start = native.indexOf('export async function handleProviderActionResponse');
  const end = native.indexOf('export async function executeAutonomousProviderFallback', start);
  assert.ok(start >= 0 && end > start, 'provider handler not found');
  const handler = native.slice(start, end);

  assert.equal(native.includes('/api/provider/respond?action='), false);
  assert.match(native, /PROVIDER_PORTAL_UNCONFIGURED/);
  assert.equal(handler.includes("status: 'confirmada'"), false);
  assert.equal(handler.includes('Unidad Turística Oficial Alsama'), false);
  assert.equal(handler.includes("options?.proposedTime || '09:00 AM'"), false);
  assert.match(handler, /serviceOrderStatus: 'confirmed'/);
  assert.match(handler, /PROVIDER_RESPONSE_IDENTITY_MISMATCH/);
  assert.match(server, /app\.all\(\['\/api\/provider\/respond'[\s\S]*status\(410\)/);
  assert.match(server, /verifyProviderPortalToken/);
});
