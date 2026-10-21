import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { computeLeadMetrics, crDay, firstResponseHours, getLeadsEvidence } from '../backend/adminControlCenterService';
import type { LeadRecord } from '../backend/leadPipeline';

const now = new Date('2026-10-19T18:00:00.000Z'); // 12:00 CR

function lead(id: string, createdAt: string, extra: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id, dedupeKey: id, status: 'nuevo', statusHistory: [{ from: null, to: 'nuevo', at: createdAt, by: 'system:tour_page' }],
    sources: ['tour_page'], firstSource: 'tour_page', createdAt, updatedAt: createdAt, lastInquiryAt: createdAt, lastActivityAt: createdAt,
    inquiryCount: 1, language: 'es', request: { tourId: 'pacuare', tourTitle: 'Rafting Pacuare', region: 'caribe' } as any,
    consent: { dataProcessing: true, law: 'Ley 8968', source: 'tour_page' }, contact: { name: 'Ana', email: 'ana@example.com', phone: '+50688887777' },
    contactRedacted: false, operatorCandidates: [], quoteRequestDrafts: [],
    triage: { state: 'activo', priority: 'media', reasons: [], auto: true, at: createdAt, history: [] } as any,
    ...extra,
  };
}

test('sin leads: vacíos honestos (null), nunca cifras inventadas', () => {
  const m = computeLeadMetrics([], now);
  assert.equal(m.totals.all, 0);
  assert.equal(m.conversion.rate, null);
  assert.equal(m.firstResponse.medianHours, null);
  assert.equal(m.firstResponse.p90Hours, null);
  assert.equal(m.heatmap, null);
  assert.equal(m.byCountry, null);
  assert.equal(m.consent.rate, null);
  assert.equal(m.perDay.length, 30);
  assert.ok(m.perDay.every(d => d.count === 0));
});

test('agregados: KPIs, embudo alcanzado, conversión, primera respuesta, >24 h y triaje', () => {
  const confirmed = lead('lead_a1b2c3d4e5', '2026-10-19T15:00:00.000Z', {
    status: 'confirmado_por_escrito',
    statusHistory: [
      { from: null, to: 'nuevo', at: '2026-10-19T15:00:00.000Z', by: 'system:tour_page' },
      { from: 'nuevo', to: 'cotizando', at: '2026-10-19T17:00:00.000Z', by: 'admin-uid' },
      { from: 'cotizando', to: 'esperando_operador', at: '2026-10-19T17:10:00.000Z', by: 'admin-uid' },
      { from: 'esperando_operador', to: 'confirmado_por_escrito', at: '2026-10-19T17:30:00.000Z', by: 'admin-uid', evidence: 'mail' },
    ],
  });
  const stale = lead('lead_f6g7h8i9j0', '2026-10-15T15:00:00.000Z', { language: 'en', request: { region: 'guanacaste' } as any });
  const spam = lead('lead_k1l2m3n4o5', '2026-10-18T15:00:00.000Z', { triage: { state: 'spam', priority: 'baja', reasons: [], auto: true, at: '', history: [] } as any });
  const old = lead('lead_p6q7r8s9t0', '2026-09-01T15:00:00.000Z', { status: 'cotizando', statusHistory: [
    { from: null, to: 'nuevo', at: '2026-09-01T15:00:00.000Z', by: 'system:sofia' },
    { from: 'nuevo', to: 'cotizando', at: '2026-09-01T19:00:00.000Z', by: 'admin-uid' },
  ] });
  const m = computeLeadMetrics([confirmed, stale, spam, old], now);
  assert.deepEqual(m.totals, { all: 4, actionable: 3 });
  assert.equal(m.triage.spam, 1);
  assert.deepEqual(m.kpis, { today: 1, last7d: 2, last30d: 2 });
  assert.deepEqual([m.conversion.quoted, m.conversion.confirmed, m.conversion.rate], [2, 1, 50]);
  assert.equal(m.funnel.find(f => f.status === 'cotizando')!.reached, 2);
  assert.equal(m.firstResponse.responded, 2);
  assert.equal(m.firstResponse.medianHours, 2);
  assert.equal(m.firstResponse.openWithoutResponse, 1);
  assert.equal(m.unanswered24h, 2);
  assert.equal(m.byTour[0].key, 'pacuare');
  assert.equal(m.perDay.at(-1)!.date, crDay(now.getTime()));
  assert.equal(m.heatmap!.values[0][9], 1, 'lunes 09:00 CR');
});

test('sin PII en los agregados ni en el sobre de evidencia', async () => {
  const m = computeLeadMetrics([lead('lead_a1b2c3d4e5', '2026-10-19T15:00:00.000Z')], now);
  assert.doesNotMatch(JSON.stringify(m), /ana@example\.com|88887777|"Ana"/);
  const env = await getLeadsEvidence(now);
  assert.ok(['measured', 'partial', 'unavailable'].includes(env.state));
  assert.equal(typeof env.source, 'string');
  assert.equal(env.observedAt, now.toISOString());
  if (env.state === 'unavailable') assert.equal(env.value, null);
  assert.doesNotMatch(JSON.stringify(env), /@[a-z0-9-]+\.[a-z]{2,}/i);
});

test('primera respuesta ignora transiciones del sistema', () => {
  const l = lead('lead_x1234567', '2026-10-19T15:00:00.000Z', { statusHistory: [
    { from: null, to: 'nuevo', at: '2026-10-19T15:00:00.000Z', by: 'system:sofia' },
    { from: 'nuevo', to: 'cotizando', at: '2026-10-19T15:30:00.000Z', by: 'system:auto' },
  ] });
  assert.equal(firstResponseHours(l), null);
});

test('HTTP: /api/admin/control-center exige admin (401 sin auth / token inválido, 403 operador)', async () => {
  const saved = process.env.OPERATOR_API_KEY;
  process.env.OPERATOR_API_KEY = 'test-operator-key';
  const { createApp } = await import('../backend/app');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await fetch(`${base}/api/admin/control-center`)).status, 401);
    assert.equal((await fetch(`${base}/api/admin/control-center`, { headers: { authorization: 'Bearer not-a-token' } })).status, 401);
    assert.equal((await fetch(`${base}/api/admin/control-center`, { headers: { 'x-operator-key': 'test-operator-key' } })).status, 403);
  } finally {
    server.close();
    if (saved === undefined) delete process.env.OPERATOR_API_KEY; else process.env.OPERATOR_API_KEY = saved;
  }
});
