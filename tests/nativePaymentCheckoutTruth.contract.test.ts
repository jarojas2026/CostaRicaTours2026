import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('backend/nativeAutomationEngine.ts', 'utf8');
const start = source.indexOf('export async function executeSolicitudPago(');
const end = source.indexOf('// 4. CONFIRMACIÓN', start);
const payment = source.slice(start, end);

test('legacy native payment adapter never fabricates a checkout session', () => {
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(payment, /Math\.random\(|checkout\.stripe\.com|paypal\.com\/checkoutnow|cs_\$\{|EC-\$\{/);
  assert.match(payment, /checkoutUrl:\s*null/);
  assert.match(payment, /sessionId:\s*null/);
  assert.match(payment, /exito:\s*false/);
  assert.match(payment, /verified_payment_checkout_required/);
});

test('native payment adapter does not claim provider settlement or TTL', () => {
  assert.doesNotMatch(payment, /expiraEn:\s*['"]30 minutos['"]|conciliación criptográfica activa|estado:\s*['"]esperando_pago['"]/);
});
