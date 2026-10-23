import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  advanceLeadFollowUpSequence, isWithinBusinessHoursCR, nextBusinessSlotCR, pickCatalogAlternative,
  runLeadFollowUpSequence, stepDueAt, type SequenceLeadView,
} from '../backend/leadFollowUpSequence';

// 2026-11-02 10:00 America/Costa_Rica = 16:00Z
const created = '2026-11-02T16:00:00.000Z';
const lead = (over: Partial<SequenceLeadView> = {}): SequenceLeadView => ({
  id: 'lead_034ed090b9b3a10b8d7fa3d8', language: 'es', status: 'nuevo', createdAt: created, lastActivityAt: created,
  consent: { dataProcessing: true }, triage: { state: 'activo' },
  contact: { name: 'Ana Pérez', email: 'ana@correo.cr' },
  request: { tourId: 'arenal-hanging-bridges', tourTitle: 'Puentes colgantes Arenal', region: 'arenal', activity: 'naturaleza', date: '2026-12-10', people: 2 },
  ...over,
});
const catalog = [
  { id: 'arenal-hanging-bridges', title: 'Puentes colgantes Arenal', region: 'arenal', activity: 'naturaleza' },
  { id: 'arenal-volcano-hike', title: 'Caminata Volcán Arenal', region: 'arenal', activity: 'naturaleza' },
];
const at = (iso: string) => new Date(iso);

test('horario 08:00–20:00 Costa Rica', () => {
  assert.equal(isWithinBusinessHoursCR(at('2026-11-02T14:00:00Z')), true);  // 08:00 CR
  assert.equal(isWithinBusinessHoursCR(at('2026-11-03T01:59:00Z')), true);  // 19:59 CR
  assert.equal(isWithinBusinessHoursCR(at('2026-11-03T02:00:00Z')), false); // 20:00 CR
  assert.equal(isWithinBusinessHoursCR(at('2026-11-02T13:59:00Z')), false); // 07:59 CR
  assert.equal(nextBusinessSlotCR(at('2026-11-03T03:30:00Z')).toISOString(), '2026-11-03T14:00:00.000Z'); // 21:30 → 08:00 día siguiente
  assert.equal(nextBusinessSlotCR(at('2026-11-02T10:00:00Z')).toISOString(), '2026-11-02T14:00:00.000Z'); // 04:00 → 08:00 mismo día
});

test('vencimientos T+2h, T+24h, T+72h ajustados al horario', () => {
  assert.equal(stepDueAt(created, 'followup_t2h').toISOString(), '2026-11-02T18:00:00.000Z');
  assert.equal(stepDueAt(created, 'alternative_t24h').toISOString(), '2026-11-03T16:00:00.000Z');
  assert.equal(stepDueAt(created, 'soft_close_t72h').toISOString(), '2026-11-05T16:00:00.000Z');
  // Lead a las 19:00 CR: T+2h (21:00) se corre a 08:00 del día siguiente.
  assert.equal(stepDueAt('2026-11-03T01:00:00.000Z', 'followup_t2h').toISOString(), '2026-11-03T14:00:00.000Z');
});

test('T+0 registra el acuse existente y no crea otro', () => {
  const seq = advanceLeadFollowUpSequence(lead(), at('2026-11-02T16:05:00Z'), catalog)!;
  assert.deepEqual(seq.drafts.map(d => [d.step, d.status]), [['ack_t0', 'existente']]);
  assert.equal(seq.drafts[0].body, undefined);
});

test('secuencia completa: borradores internos, 1 alternativa real y cierre en frío', () => {
  let l = lead();
  for (const now of ['2026-11-02T16:05:00Z', '2026-11-02T18:01:00Z', '2026-11-03T16:01:00Z', '2026-11-05T16:01:00Z']) {
    const next = advanceLeadFollowUpSequence(l, at(now), catalog);
    if (next) l = { ...l, followUpSequence: next };
  }
  const seq = l.followUpSequence!;
  assert.deepEqual(seq.drafts.map(d => d.step), ['ack_t0', 'followup_t2h', 'alternative_t24h', 'soft_close_t72h']);
  for (const d of seq.drafts.slice(1)) {
    assert.equal(d.status, 'borrador_no_enviado');
    assert.equal(d.queue, 'interna');
    assert.equal(d.to, 'ana@correo.cr');
    assert.match(d.body!, /CRT-[A-Z0-9]{8}/);
    assert.doesNotMatch(d.body!, /\$|USD|₡|operador|proveedor|\+506|wa\.me/i);
  }
  const alt = seq.drafts.find(d => d.step === 'alternative_t24h')!;
  assert.equal(alt.alternativeTourId, 'arenal-volcano-hike');
  assert.match(alt.body!, /Caminata Volcán Arenal/);
  assert.equal(seq.temperature, 'frio');
  assert.equal(advanceLeadFollowUpSequence(l, at('2026-11-09T16:00:00Z'), catalog), null);
});

test('fuera de horario no encola nada', () => {
  assert.equal(advanceLeadFollowUpSequence(lead(), at('2026-11-03T03:00:00Z'), catalog), null);
});

test('alternativa: nunca el mismo tour; sin coincidencias se omite (no se inventa)', () => {
  assert.equal(pickCatalogAlternative({ tourId: 'x', region: 'osa' }, catalog), null);
  assert.equal(pickCatalogAlternative({ tourId: 'arenal-volcano-hike', region: 'arenal' }, catalog)!.id, 'arenal-hanging-bridges');
  const seq = advanceLeadFollowUpSequence(lead({ request: { tourId: 'x', tourTitle: 'Osa', region: 'osa', date: '2026-12-01', people: 2 } }), at('2026-11-03T16:01:00Z'), catalog)!;
  const alt = seq.drafts.find(d => d.step === 'alternative_t24h')!;
  assert.equal(alt.status, 'omitido');
  assert.equal(alt.body, undefined);
});

test('se detiene: no abierto, triaje no activo, sin consentimiento, atendido por humano', () => {
  const now = at('2026-11-02T18:01:00Z');
  assert.equal(advanceLeadFollowUpSequence(lead({ status: 'pagado' }), now)!.stoppedReason, 'lead_no_abierto');
  assert.equal(advanceLeadFollowUpSequence(lead({ triage: { state: 'descartado' } }), now)!.stoppedReason, 'triaje_descartado');
  assert.equal(advanceLeadFollowUpSequence(lead({ consent: { dataProcessing: false } }), now)!.stoppedReason, 'sin_consentimiento');
  assert.equal(advanceLeadFollowUpSequence(lead({ lastActivityAt: '2026-11-02T17:00:00Z' }), now)!.stoppedReason, 'atendido_por_humano');
});

test('runner: nunca envía, solo persiste borradores', async () => {
  const saved: string[] = [];
  const out = await runLeadFollowUpSequence({ listOpenLeads: async () => [lead()], saveSequence: async id => { saved.push(id); }, catalog, now: at('2026-11-02T18:01:00Z') });
  assert.deepEqual(out, { checked: 1, updated: 1, drafts: 2, sent: 0 });
  assert.equal(saved.length, 1);
  const src = readFileSync('backend/leadFollowUpSequence.ts', 'utf8');
  assert.doesNotMatch(src, /sendEmail|notificationService|fetch\(|whatsapp/i);
});
