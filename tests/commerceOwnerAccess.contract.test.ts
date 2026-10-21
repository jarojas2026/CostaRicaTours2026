import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('store administration accepts owner and admin but never operator-key access', () => {
  const commerce = readFileSync('backend/commerceAdminRouter.ts', 'utf8');
  const auth = readFileSync('backend/authMiddleware.ts', 'utf8');
  assert.match(commerce, /commerceAdminRouter\.use\(requireOperator\)/);
  assert.match(commerce, /role !== 'owner' && role !== 'admin'/);
  assert.doesNotMatch(commerce, /adminAccess\?\.role !== 'admin'/);
  assert.match(auth, /role === 'owner' \? 'owner' : role === 'admin'/);
  assert.match(auth, /role: 'operator'/);
});

test('commerce writes still require evidence and explicit attestation', () => {
  const commerce = readFileSync('backend/commerceAdminRouter.ts', 'utf8');
  assert.match(commerce, /body\.attested !== true/);
  assert.match(commerce, /evidence\.length < 10/);
  assert.match(commerce, /tx\.create\(auditRef/);
});
