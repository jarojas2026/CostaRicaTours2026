import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { availableCurrencies, formatAmount, moneyView, rateFor, type RatesSnapshot } from '../src/utils/money';

const rates: RatesSnapshot = {
  rates: { USD: 1, CRC: 457.54, EUR: 0.89015, JPY: 157.88, XXX: 0 },
  sources: {
    CRC: { provider: 'BCCR', rateDate: '2026-10-21' },
    EUR: { provider: 'BCE', rateDate: '2026-10-21' },
    // JPY sin fuente declarada → no se considera tasa real.
  },
};

test('CRC: ₡ con formato es-CR, "≈" y nota BCCR con fecha', () => {
  const v = moneyView(125, 'CRC', 'en', rates);
  assert.equal(v.converted, true);
  assert.equal(v.displayCurrency, 'CRC');
  assert.equal(v.usd, 'US$125');
  assert.ok(v.primary.startsWith('≈ ₡'), v.primary);
  // 125 × 457.54 = 57 192.5 → 57 193; es-CR agrupa con espacio (no separable).
  assert.equal(v.primary.replace(/\s|\u00a0|\u202f/g, ' '), '≈ ₡57 193');
  assert.equal(formatAmount(57193, 'CRC', 'en'), formatAmount(57193, 'CRC', 'es'), 'CRC siempre es-CR');
  const es = moneyView(125, 'CRC', 'es', rates);
  assert.match(es.note || '', /^Referencia en USD; tasa BCCR del 21 oct\.? 2026$/);
});

test('EUR: conversión aproximada con nota BCE', () => {
  const v = moneyView(125, 'EUR', 'es', rates);
  assert.equal(v.converted, true);
  assert.match(v.primary, /^≈ (€\s?111|111\s?€)$/u);
  assert.match(v.note || '', /tasa BCE del/);
  const en = moneyView(125, 'EUR', 'en', rates);
  assert.equal(en.primary, '≈ €111');
  assert.match(en.note || '', /ECB rate of Oct 21, 2026/);
});

test('sin tasa: se muestra USD con aviso, nunca el número con otro símbolo', () => {
  for (const currency of ['GBP', 'JPY', 'XXX']) {
    const v = moneyView(125, currency, 'es', rates);
    assert.equal(v.converted, false);
    assert.equal(v.primary, 'US$125');
    assert.equal(v.displayCurrency, 'USD');
    assert.equal(v.note, undefined);
    assert.match(v.notice || '', new RegExp(`Sin tipo de cambio disponible para ${currency}`));
    assert.doesNotMatch(v.primary, /£|¥|€|₡/);
  }
  assert.equal(rateFor('JPY', rates), undefined, 'tasa sin fuente no cuenta');
});

test('USD: sin conversión ni nota', () => {
  const v = moneyView(125, 'USD', 'es', rates);
  assert.deepEqual([v.primary, v.converted, v.note, v.notice], ['US$125', false, undefined, undefined]);
});

test('selector: solo monedas con tasa real, USD primero', () => {
  assert.deepEqual(availableCurrencies(rates), ['USD', 'CRC', 'EUR']);
  assert.deepEqual(availableCurrencies({ rates: { USD: 1 }, sources: {} }), ['USD']);
});

test('el frontend no embebe tasas fijas ni consulta APIs de tasas de terceros', () => {
  const root = process.cwd();
  for (const file of ['src/utils/i18n.ts', 'src/utils/currencies.ts', 'src/utils/money.ts', 'src/utils/exchangeRates.ts']) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(src, /open\.er-api\.com|frankfurter|EUR:\s*0\.\d+|GBP:\s*0\.\d+/, file);
  }
  const trip = fs.readFileSync(path.join(root, 'src/pages/TravelerOSPage.tsx'), 'utf8');
  assert.doesNotMatch(trip, /style:'currency',currency:'USD'/, '/trip no muestra $ como resultado de la conversión');
});
