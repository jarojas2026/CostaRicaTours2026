import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { TOURS } from '../src/data/toursData';
import { __resetLeadMemoryForTests, buildLeadDigest, buildTourPageLeadInput, captureLead, getLead, listLeads, triageLeads } from '../backend/leadPipeline';
import { applyManualTriage, computeLeadPriority, hasValidContact, isJunkLeadText, triageNewLead } from '../backend/leadTriage';

const now = new Date('2026-10-19T20:00:00-06:00');
const tour = TOURS[0];
const tourInput = (over: { email?: string; message?: string; approxDate?: string; people?: number; tourId?: string } = {}) => {
  const t = over.tourId ? TOURS.find(x => x.id === over.tourId)! : tour;
  return buildTourPageLeadInput({
    source: 'tour_page', tourId: t.id, language: 'es', consent: true,
    customer: { name: 'Ana Pérez', email: over.email ?? 'ana@cliente.cr' },
    request: { people: over.people ?? 2, ...(over.approxDate !== undefined ? { approxDate: over.approxDate } : { approxDate: '2026-12-10' }) },
    ...(over.message ? { message: over.message } : {}),
  }, t);
};

test('junk text detector: greetings/tests/keyboard mash are junk, real requests and empty text are not', () => {
  for (const junk of ['hola', 'Hola!!', 'hi', 'test', 'prueba', 'asdfgh', '???', 'hola urgente', 'ok gracias', 'aaaaaa']) {
    assert.equal(isJunkLeadText(junk), true, junk);
  }
  for (const real of ['', undefined, 'Somos 2 adultos y un niño, ¿hay transporte desde La Fortuna?', 'rafting', 'Need pickup at hotel']) {
    assert.equal(isJunkLeadText(real), false, String(real));
  }
});

test('valid contact and priority', () => {
  assert.equal(hasValidContact({ email: 'ana@cliente.cr' }), true);
  assert.equal(hasValidContact({ email: 'test@test.com' }), false);
  assert.equal(hasValidContact({ phone: '+506 8888 7777' }), true);
  assert.equal(hasValidContact({ phone: '11111111' }), false);
  assert.equal(hasValidContact(null), false);
  assert.equal(computeLeadPriority({ request: { date: '2026-12-10', people: 2 }, validContact: true }), 'alta');
  assert.equal(computeLeadPriority({ request: { people: 2 }, validContact: true }), 'media');
  assert.equal(computeLeadPriority({ request: {}, validContact: false }), 'baja');
});

test('triage on creation: high priority, spam, no-contact discard, duplicate same email+tour within 24h', async () => {
  __resetLeadMemoryForTests();
  const good = await captureLead(tourInput(), now);
  assert.equal(good.lead.triage?.state, 'activo');
  assert.equal(good.lead.triage?.priority, 'alta');

  const spam = await captureLead(tourInput({ email: 'otro@cliente.cr', message: 'hola', approxDate: '' }), now);
  assert.equal(spam.lead.triage?.state, 'spam');
  assert.deepEqual(spam.lead.triage?.reasons, ['texto_basura']);

  const ghost = await captureLead({ source: 'sofia', request: { activity: 'rafting' }, sessionId: 'x' }, now);
  assert.equal(ghost.lead.triage?.state, 'descartado');
  assert.deepEqual(ghost.lead.triage?.reasons, ['sin_contacto_valido']);
  assert.equal(ghost.lead.triage?.priority, 'baja');

  // Mismo correo + mismo tour, otra fecha, 3 h después → nuevo registro marcado duplicado.
  const dup = await captureLead(tourInput({ approxDate: '2026-12-20' }), new Date(now.getTime() + 3 * 3600_000));
  assert.equal(dup.created, true);
  assert.equal(dup.lead.triage?.state, 'duplicado');
  assert.equal(dup.lead.triage?.duplicateOf, good.lead.id);

  // Pasadas 24 h desde el último envío del mismo correo+tour ya no es duplicado.
  const later = await captureLead(tourInput({ approxDate: '2027-01-05' }), new Date(now.getTime() + 28 * 3600_000));
  assert.equal(later.lead.triage?.state, 'activo');

  // Filtros y resumen: solo los activos cuentan.
  assert.equal((await listLeads({ triage: 'activo' })).length, 2);
  assert.equal((await listLeads({ priority: 'alta', triage: 'activo' })).length, 2);
  const digest = buildLeadDigest(await listLeads(), new Date(now.getTime() + 60 * 3600_000));
  assert.equal(digest.triagedOut, 3);
  assert.ok(digest.stale.every(s => s.id === good.lead.id || s.id === later.lead.id));
});

test('manual discard is reversible and keeps history and priority', async () => {
  __resetLeadMemoryForTests();
  const { lead } = await captureLead(tourInput(), now);
  const discarded = await triageLeads([lead.id], 'descartado', { by: 'jose' }, 'cliente de prueba', now);
  assert.equal(discarded.updated[0].triage?.state, 'descartado');
  assert.equal(discarded.updated[0].status, 'nuevo', 'commercial status untouched');
  const restored = await triageLeads([lead.id], 'activo', { by: 'jose' }, undefined, now);
  const t = restored.updated[0].triage!;
  assert.equal(t.state, 'activo');
  assert.equal(t.priority, 'alta');
  assert.deepEqual(t.history.map(h => h.to), ['activo', 'descartado', 'activo']);
  assert.match(t.history[1].reason, /descartado_manual: cliente de prueba/);
  assert.equal((await getLead(lead.id))?.triage?.state, 'activo');
});

test('applyManualTriage clears duplicateOf on restore', () => {
  const base = triageNewLead({ id: 'lead_b', createdAt: now.toISOString(), contact: { email: 'a@cliente.cr' }, request: { tourId: 't1', people: 2 } },
    [{ id: 'lead_a', createdAt: new Date(now.getTime() - 3600_000).toISOString(), email: 'a@cliente.cr', tourId: 't1' }], now);
  assert.equal(base.state, 'duplicado');
  const restored = applyManualTriage(base, 'activo', 'jose', undefined, now);
  assert.equal(restored.duplicateOf, undefined);
  assert.equal(restored.auto, false);
});

test('HTTP: bulk discard/restore and list filters behind operator auth', async () => {
  __resetLeadMemoryForTests();
  const saved = process.env.OPERATOR_API_KEY;
  process.env.OPERATOR_API_KEY = 'test-operator-key';
  const { createApp } = await import('../backend/app');
  const server = createApp().listen(0);
  const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const op = { 'x-operator-key': 'test-operator-key', 'content-type': 'application/json' };
  try {
    const a = await captureLead(tourInput(), now);
    const b = await captureLead(tourInput({ email: 'b@cliente.cr', message: 'test', approxDate: '' }), now);
    assert.equal((await fetch(`${base()}/api/admin/leads/triage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: [a.lead.id], action: 'descartar' }) })).status, 401);
    assert.equal((await fetch(`${base()}/api/admin/leads/triage`, { method: 'POST', headers: op, body: JSON.stringify({ ids: [], action: 'descartar' }) })).status, 400);
    assert.equal((await fetch(`${base()}/api/admin/leads?priority=bogus`, { headers: op })).status, 400);

    const spamList = await (await fetch(`${base()}/api/admin/leads?triage=spam`, { headers: op })).json();
    assert.deepEqual(spamList.leads.map((l: any) => l.id), [b.lead.id]);

    const res = await fetch(`${base()}/api/admin/leads/triage`, { method: 'POST', headers: op, body: JSON.stringify({ ids: [a.lead.id, 'lead_nope_00000000'], action: 'descartar' }) });
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.updated[0].triage.state, 'descartado');
    assert.deepEqual(json.notFound, ['lead_nope_00000000']);
    const active = await (await fetch(`${base()}/api/admin/leads?triage=activo`, { headers: op })).json();
    assert.equal(active.leads.length, 0);

    const undo = await (await fetch(`${base()}/api/admin/leads/triage`, { method: 'POST', headers: op, body: JSON.stringify({ ids: [a.lead.id], action: 'restaurar' }) })).json();
    assert.equal(undo.updated[0].triage.state, 'activo');
  } finally {
    server.close();
    if (saved === undefined) delete process.env.OPERATOR_API_KEY; else process.env.OPERATOR_API_KEY = saved;
  }
});
