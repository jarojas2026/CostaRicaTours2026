/**
 * #347 — Decisión del dueño (2026-10-20): el proveedor NO debe poder deducir el
 * precio al cliente. Con PROVIDER_PORTAL_SHOW_GROSS=false y
 * PROVIDER_PORTAL_SHOW_COMMISSION=false las respuestas del portal (ventas y
 * liquidaciones) solo llevan el neto a recibir: nada de bruto, % ni monto de
 * comisión de la plataforma.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { ProviderContext } from '../backend/providerAuth';
import {
  loadProviderSaleLines,
  providerPortalShowsCommission,
  providerPortalShowsGross,
  summarizeSales,
  summarizeSettlements,
} from '../backend/providerSalesService';
import { toProviderPortalOrder } from '../backend/providerPortalView';
import { createFakeFirestore } from './helpers/fakeFirestore';

const A: ProviderContext = { uid: 'uid_a_owner', providerId: 'prov_a', providerRole: 'owner' };
const TODAY = '2026-10-20';
const base = { providerId: 'prov_a', paymentStatus: 'completed', status: 'confirmada', providerStatus: 'confirmed', tourId: 't1', tourName: 'Tour 1' };
const seed = () => createFakeFirestore({
  operators: { prov_a: { commissionRate: 0.2 } },
  bookings: {
    bk_paid: { ...base, totalUSD: 237, date: '2026-09-10', payoutStatus: 'paid', payoutAmountUSD: 189.6 },
    bk_est: { ...base, totalUSD: 413, date: '2026-10-05', commissionRate: 0.17 },
    bk_future: { ...base, totalUSD: 91, date: '2026-11-15' },
  },
});

// Cualquier campo que permita calcular el bruto.
const FORBIDDEN = /"(gross\w*|commissionRates?|commissionAmount\w*|commissionUSD|profileCommissionRate|platformFee\w*|totalUSD|totalCRC|price\w*)"\s*:/i;
const GROSS_VALUES = /\b(237|413|91|0\.2|0\.17|47\.4|70\.21|18\.2)\b/;

const OFF = { PROVIDER_PORTAL_SHOW_GROSS: 'false', PROVIDER_PORTAL_SHOW_COMMISSION: 'false' } as NodeJS.ProcessEnv;

/** Reproduce exactamente el cuerpo de GET /api/provider/v2/sales y /settlements. */
async function responses(env: NodeJS.ProcessEnv) {
  const { db } = seed();
  const { lines, meta } = await loadProviderSaleLines(db, A, {
    todayCR: TODAY, months: 12,
    showGross: providerPortalShowsGross(env), showCommission: providerPortalShowsCommission(env),
  });
  return {
    sales: { success: true, meta, ...summarizeSales(lines, meta.showGross, meta.showCommission) },
    settlements: { success: true, meta, periods: summarizeSettlements(lines) },
  };
}

test('banderas: ambas false por defecto', () => {
  assert.equal(providerPortalShowsCommission({}), false);
  assert.equal(providerPortalShowsCommission(OFF), false);
  assert.equal(providerPortalShowsCommission({ PROVIDER_PORTAL_SHOW_COMMISSION: 'true' }), true);
  assert.equal(providerPortalShowsGross({}), false);
});

test('con banderas en false la respuesta no lleva gross / commissionRate / commissionAmount', async () => {
  const { sales, settlements } = await responses(OFF);
  for (const body of [sales, settlements]) {
    const json = JSON.stringify(body);
    assert.doesNotMatch(json, FORBIDDEN, json);
    assert.doesNotMatch(json, GROSS_VALUES, json);
  }
  // Sí lleva el neto a recibir.
  assert.equal(sales.totals.netUSD, 605.19);
  assert.equal(sales.meta.showGross, false);
  assert.equal(sales.meta.showCommission, false);
});

test('con banderas en true los campos aparecen (la bandera es la única puerta)', async () => {
  const { sales } = await responses({ PROVIDER_PORTAL_SHOW_GROSS: 'true', PROVIDER_PORTAL_SHOW_COMMISSION: 'true' } as NodeJS.ProcessEnv);
  const json = JSON.stringify(sales);
  assert.match(json, /"grossUSD"/);
  assert.match(json, /"commissionRates"/);
  assert.match(json, /"commissionUSD"/);
});

test('la orden del portal tampoco expone precio, comisión ni fee de plataforma', () => {
  const out = JSON.stringify(toProviderPortalOrder({
    id: 'ord_1', bookingId: 'bk_1', providerId: 'prov_a', status: 'dispatched',
    totalUSD: 413, commissionRate: 0.17, platformFeeUSD: 70.21, payoutAmountUSD: 342.79, customer: { name: 'Ana' },
  }));
  assert.doesNotMatch(out, FORBIDDEN, out);
  assert.doesNotMatch(out, /413|0\.17|70\.21/);
});

test('la ruta de ventas pasa ambas banderas y la UI condiciona la ficha de comisión', () => {
  const routes = fs.readFileSync(path.join(process.cwd(), 'backend/routes/provider.ts'), 'utf8');
  assert.match(routes, /summarizeSales\(lines, meta\.showGross, meta\.showCommission\)/);
  const ui = fs.readFileSync(path.join(process.cwd(), 'src/pages/ProviderPortalV2.tsx'), 'utf8');
  assert.match(ui, /rates !== null && <Tile label="Comisión pactada"/);
  const env = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
  assert.match(env, /PROVIDER_PORTAL_SHOW_COMMISSION="false"/);
  assert.match(env, /PROVIDER_PORTAL_SHOW_GROSS="false"/);
});
