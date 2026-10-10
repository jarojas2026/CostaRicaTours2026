import assert from 'node:assert/strict';
import test from 'node:test';
import { idempotencyDocId, normalizeIdempotencyKey, requestFingerprint } from '../backend/idempotencyService.ts';

test('request fingerprint ignores object key order at every nesting level', () => {
  const first = { tourId: 'reef', customer: { email: 'a@example.com', name: 'Ana' }, options: [{ adults: 2, children: 1 }] };
  const reordered = { options: [{ children: 1, adults: 2 }], customer: { name: 'Ana', email: 'a@example.com' }, tourId: 'reef' };
  assert.equal(requestFingerprint(first), requestFingerprint(reordered));
});

test('request fingerprint changes when a nested booking input changes', () => {
  const first = { tourId: 'reef', customer: { email: 'a@example.com', name: 'Ana' } };
  const changedEmail = { tourId: 'reef', customer: { email: 'b@example.com', name: 'Ana' } };
  const changedName = { tourId: 'reef', customer: { email: 'a@example.com', name: 'Bea' } };
  assert.notEqual(requestFingerprint(first), requestFingerprint(changedEmail));
  assert.notEqual(requestFingerprint(first), requestFingerprint(changedName));
});

test('array order is preserved in request fingerprints', () => {
  assert.notEqual(requestFingerprint({ passengers: ['adult', 'child'] }), requestFingerprint({ passengers: ['child', 'adult'] }));
});

test('idempotency keys are normalized and hashed consistently', () => {
  assert.equal(normalizeIdempotencyKey('  request-1234  '), 'request-1234');
  assert.equal(normalizeIdempotencyKey(''), null);
  assert.throws(() => normalizeIdempotencyKey('bad key'), /Idempotency-Key inválida/);
  assert.equal(idempotencyDocId('request-1234'), idempotencyDocId('request-1234'));
});
