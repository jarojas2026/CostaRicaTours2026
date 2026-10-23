import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
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

test('clave restringida rk_live_ se bloquea igual que sk_live_', () => {
  const previous = process.env.ALLOW_STRIPE_LIVE;
  delete process.env.ALLOW_STRIPE_LIVE;
  try {
    assert.equal(checkStripeMode('rk_live_xyz789').blocked, true);
    assert.throws(() => assertStripeTestMode('rk_live_xyz789'), /STRIPE_LIVE_BLOCKED/);
    assert.equal(checkStripeMode('rk_test_xyz789').blocked, false);
  } finally {
    if (previous !== undefined) process.env.ALLOW_STRIPE_LIVE = previous;
  }
});

test('cableado: getStripe() llama assertStripeTestMode antes de new Stripe', () => {
  const src = readFileSync('backend/bookingService.ts', 'utf8');
  const body = src.slice(src.indexOf('export function getStripe()'));
  const guard = body.indexOf('assertStripeTestMode(process.env.STRIPE_SECRET_KEY)');
  const create = body.indexOf('new Stripe(');
  assert.ok(guard > -1 && create > guard, 'el guard debe ir antes de new Stripe');
  // routes/payments.ts no crea clientes propios: usa getStripe().
  assert.doesNotMatch(readFileSync('backend/routes/payments.ts', 'utf8'), /new Stripe\(/);
});

test('getStripe() con clave en vivo y sin ALLOW_STRIPE_LIVE lanza (no crea cliente)', async () => {
  const prevKey = process.env.STRIPE_SECRET_KEY;
  const prevAllow = process.env.ALLOW_STRIPE_LIVE;
  process.env.STRIPE_SECRET_KEY = 'sk_live_contract_test_never_real';
  delete process.env.ALLOW_STRIPE_LIVE;
  try {
    const { getStripe } = await import('../backend/bookingService');
    assert.throws(() => getStripe(), /STRIPE_LIVE_BLOCKED/);
  } finally {
    if (prevKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = prevKey;
    if (prevAllow !== undefined) process.env.ALLOW_STRIPE_LIVE = prevAllow;
  }
});
