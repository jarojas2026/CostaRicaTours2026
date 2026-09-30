import test from 'node:test';
import assert from 'node:assert/strict';
import { getOperationalProviderOverview, listVerifiedOperationalProviders } from '../backend/operationalProviderRegistryService';

test('operational provider registry never falls back to historical static providers without Firestore evidence', async () => {
  const providers = await listVerifiedOperationalProviders();
  assert.ok(Array.isArray(providers));
  for (const provider of providers) {
    assert.equal(provider.verified, true);
    assert.equal(provider.active, true);
    assert.ok(['operators', 'proveedores'].includes(provider.sourceCollection));
  }
});

test('operational provider overview uses verified providers plus durable Firestore service orders and excludes legacy directory', async () => {
  const overview = await getOperationalProviderOverview();
  assert.equal(overview.sourceOfTruth, 'firestore_verified_providers_and_service_orders');
  assert.equal(overview.legacyDirectoryExcluded, true);
  assert.equal(overview.totalProviders, overview.providers.length);
  assert.equal(overview.activeProviders, overview.providers.length);
  assert.ok(Array.isArray(overview.recentServiceOrders));
  assert.ok(Number(overview.readWindow?.providersPerCollection || 0) > 0);
  assert.ok(Number(overview.readWindow?.serviceOrders || 0) > 0);
  for (const provider of overview.providers) {
    assert.equal(provider.verified, true);
    assert.equal(provider.active, true);
    assert.ok(['operators', 'proveedores'].includes(provider.sourceCollection));
  }
});
