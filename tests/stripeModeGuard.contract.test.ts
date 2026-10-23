import assert from 'node:assert/strict';
import test from 'node:test';
import { checkStripeMode, assertStripeTestMode } from '../backend/stripeModeGuard';

// P1: bloqueo de clave Stripe en vivo para forzar TEST hasta lanzamiento.
test('clave sk_test pasa en modo test', () => {
  const c = checkStripeMode('sk_test_abc123');
  assert.equal(c.mode, 'test');
  assert.equal(c.blocked, false);
});

test('clave sk_live_ sin ALLOW_STRIPE_LIVE se bloquea', () => {
  const c = checkStripeMode('sk_live_xyz789');
  assert.equal(c.mode, 'live');
  assert.equal(c.blocked, true);
  assert.throws(() => assertStripeTestMode('sk_live_xyz789'));
});

test('sin clave no bloquea', () => {
  assert.equal(checkStripeMode('').mode, 'none');
  assert.doesNotThrow(() => assertStripeTestMode(''));
});

test('ALLOW_STRIPE_LIVE=true desbloquea solo con consentimiento explícito', () => {
  const previous = process.env.ALLOW_STRIPE_LIVE;
  process.env.ALLOW_STRIPE_LIVE = 'true';
  try {
    const c = checkStripeMode('sk_live_xyz789');
    assert.equal(c.blocked, false);
  } finally {
    if (previous === undefined) delete process.env.ALLOW_STRIPE_LIVE;
    else process.env.ALLOW_STRIPE_LIVE = previous;
  }
});
