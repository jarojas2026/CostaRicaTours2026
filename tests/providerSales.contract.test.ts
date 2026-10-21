/**
 * #321 — Ventas, comisiones y liquidaciones del proveedor desde datos reales,
 * sin % por defecto, aisladas por tenant y con el bruto detrás de bandera.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { ProviderContext } from '../backend/providerAuth';
import {
  buildSaleLine,
  loadProviderSaleLines,
  providerPortalShowsGross,
  summarizeSales,
  summarizeSettlements,
} from '../backend/providerSalesService';
import { createFakeFirestore } from './helpers/fakeFirestore';

const A: ProviderContext = { uid: 'uid_a_owner', providerId: 'prov_a', providerRole: 'owner' };
const B: ProviderContext = { uid: 'uid_b_owner', providerId: 'prov_b', providerRole: 'owner' };
const TODAY = '2026-10-20';

const paidPast = { providerId: 'prov_a', paymentStatus: 'completed', status: 'confirmada', providerStatus: 'confirmed', totalUSD: 200, date: '2026-09-10', tourId: 't1', tourName: 'Tour 1' };
const seed = () => createFakeFirestore({
  operators: { prov_a: { commissionRate: 0.2 }, prov_b: { commissionRate: 0.1 } },
  bookings: {
    bk_a_paidout: { ...paidPast, payoutStatus: 'paid', payoutAmountUSD: 160 },
    bk_a_eligible: { ...paidPast, totalUSD: 100, date: '2026-10-05' },
    bk_a_future: { ...paidPast, totalUSD: 50, date: '2026-11-15', tourId: 't2', tourName: 'Tour 2' },
    bk_a_unpaid: { ...paidPast, paymentStatus: 'pending', totalUSD: 999 },
    bk_a_cancel: { ...paidPast, status: 'cancelada', totalUSD: 777 },
    bk_b_1: { providerId: 'prov_b', paymentStatus: 'completed', status: 'confirmada', providerStatus: 'confirmed', totalUSD: 5000, date: '2026-09-11', tourId: 'tb', tourName: 'Tour B' },
  },
});

test('bandera PROVIDER_PORTAL_SHOW_GROSS: por defecto false', () => {
  assert.equal(providerPortalShowsGross({}), false);
  assert.equal(providerPortalShowsGross({ PROVIDER_PORTAL_SHOW_GROSS: 'false' }), false);
  assert.equal(providerPortalShowsGross({ PROVIDER_PORTAL_SHOW_GROSS: 'true' }), true);
});

test('A solo ve sus ventas; las de B (y pendientes/canceladas) no cuentan', async () => {
  const { db } = seed();
  const { lines, meta } = await loadProviderSaleLines(db, A, { todayCR: TODAY, showGross: false, months: 12 });
  assert.deepEqual(lines.map((l) => l.bookingRef).sort(), ['AIDOUT', 'FUTURE', 'IGIBLE'].sort());
  assert.equal(meta.sourceCount, 3);
  assert.equal(meta.profileCommissionRate, 0.2);
  assert.doesNotMatch(JSON.stringify(lines), /5000|Tour B|999|777/);
  const b = await loadProviderSaleLines(db, B, { todayCR: TODAY, showGross: false });
  assert.deepEqual(b.lines.map((l) => l.tourId), ['tb']);
});

test('neto: payout pagado real o estimado con la comisión registrada; bruto oculto por defecto', async () => {
  const { db } = seed();
  const { lines } = await loadProviderSaleLines(db, A, { todayCR: TODAY, showGross: false });
  const byRef = Object.fromEntries(lines.map((l) => [l.bookingRef, l]));
  assert.equal(byRef.AIDOUT.netUSD, 160);
  assert.equal(byRef.AIDOUT.netSource, 'payout_paid');
  assert.equal(byRef.IGIBLE.netUSD, 80);
  assert.equal(byRef.IGIBLE.netSource, 'estimated');
  assert.equal(byRef.IGIBLE.commissionRate, 0.2);
  for (const line of lines) {
    assert.equal('grossUSD' in line, false);
    assert.equal('commissionUSD' in line, false);
  }
  const summary = summarizeSales(lines, false);
  assert.equal(summary.totals.netUSD, 280);
  assert.equal('grossUSD' in summary.totals, false);
  assert.deepEqual(summary.byMonth.map((m) => m.period), ['2026-09', '2026-10', '2026-11']);
  assert.deepEqual(summary.byService.map((s) => s.tourId), ['t1', 't2']);
  assert.doesNotMatch(JSON.stringify(summary), /"grossUSD"|"commissionUSD"/);
});

test('con la bandera en true se expone bruto y comisión en USD', async () => {
  const { db } = seed();
  const { lines } = await loadProviderSaleLines(db, A, { todayCR: TODAY, showGross: true });
  const eligible = lines.find((l) => l.bookingRef === 'IGIBLE')!;
  assert.equal(eligible.grossUSD, 100);
  assert.equal(eligible.commissionUSD, 20);
  assert.equal(summarizeSales(lines, true).totals.grossUSD, 350);
});

test('sin comisión registrada no se inventa %: neto null y liquidación bloqueada', () => {
  const line = buildSaleLine({ id: 'bk_x', ...paidPast }, null, { showGross: false, todayCR: TODAY });
  assert.equal(line.commissionRate, null);
  assert.equal(line.netUSD, null);
  assert.equal(line.netSource, 'unavailable');
  assert.equal(line.settlementStatus, 'blocked');
  assert.equal(line.settlementReason, 'commission_unavailable');
  const summary = summarizeSales([line], false);
  assert.equal(summary.totals.netUSD, null);
  assert.equal(summary.totals.linesWithoutNet, 1);
  const src = fs.readFileSync(path.join(process.cwd(), 'backend/providerSalesService.ts'), 'utf8');
  assert.doesNotMatch(src, /0\.15|\?\? 0\.\d|\|\| 0\.\d/);
});

test('liquidaciones según providerPayoutPolicy (pagado / elegible / pendiente)', async () => {
  const { db } = seed();
  const { lines } = await loadProviderSaleLines(db, A, { todayCR: TODAY, showGross: false });
  const status = Object.fromEntries(lines.map((l) => [l.bookingRef, l.settlementStatus]));
  assert.equal(status.AIDOUT, 'paid');
  assert.equal(status.IGIBLE, 'eligible');
  assert.equal(status.FUTURE, 'pending_eligibility');
  const periods = summarizeSettlements(lines);
  assert.deepEqual(periods.map((p) => p.period), ['2026-11', '2026-10', '2026-09']);
  const sept = periods.find((p) => p.period === '2026-09')!;
  assert.equal(sept.totals.paidUSD, 160);
  assert.equal(periods.find((p) => p.period === '2026-10')!.totals.eligibleUSD, 80);
  assert.doesNotMatch(JSON.stringify(periods), /grossUSD/);
});

test('rutas: ventas manager+, liquidaciones solo owner; sin ejecución de pagos', () => {
  const routes = fs.readFileSync(path.join(process.cwd(), 'backend/routes/provider.ts'), 'utf8');
  assert.match(routes, /'\/api\/provider\/v2\/sales', requireProvider\('manager'\)/);
  assert.match(routes, /'\/api\/provider\/v2\/settlements', requireProvider\('owner'\)/);
  const src = fs.readFileSync(path.join(process.cwd(), 'backend/providerSalesService.ts'), 'utf8');
  assert.doesNotMatch(src, /executeAutomatedProviderPayouts|paypal|stripe/i);
});

test('el portal v2 dibuja gráficos SVG propios sin dependencias nuevas', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  for (const lib of ['recharts', 'chart.js', 'd3', 'victory', 'nivo', '@nivo/core', 'apexcharts']) assert.equal(deps.includes(lib), false);
  const charts = fs.readFileSync(path.join(process.cwd(), 'src/components/provider/ProviderSvgCharts.tsx'), 'utf8');
  assert.match(charts, /<svg/);
  assert.doesNotMatch(charts, /from 'recharts'|from 'd3'/);
});
