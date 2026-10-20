import assert from 'node:assert/strict';
import test from 'node:test';
import { __resetLeadMemoryForTests, buildLeadRecord, captureLead, getLead } from '../backend/leadPipeline';
import { buildFollowUpDraft, followUpEmail, isAutoFollowUpEnabled, missingLeadData } from '../backend/leadFollowUp';
import { OPERATOR_PROSPECTS } from '../data/operators/operatorProspects';

const now = new Date('2026-10-19T20:00:00-06:00');

test('flag LEAD_AUTOFOLLOWUP_ENABLED is off unless exactly "true"', () => {
  assert.equal(isAutoFollowUpEnabled({}), false);
  assert.equal(isAutoFollowUpEnabled({ LEAD_AUTOFOLLOWUP_ENABLED: 'false' }), false);
  assert.equal(isAutoFollowUpEnabled({ LEAD_AUTOFOLLOWUP_ENABLED: '1' }), false);
  assert.equal(isAutoFollowUpEnabled({ LEAD_AUTOFOLLOWUP_ENABLED: 'true' }), true);
});

test('missing data detection', () => {
  assert.deepEqual(missingLeadData({}), ['fecha', 'pax']);
  assert.deepEqual(missingLeadData({ people: 2 }), ['fecha']);
  assert.deepEqual(missingLeadData({ month: 3 }), ['pax']);
  assert.deepEqual(missingLeadData({ date: '2026-12-10', people: 2 }), []);
});

test('ES/EN drafts ask only for what is missing, in the lead language, without operators or prices', () => {
  const es = buildFollowUpDraft({ id: 'lead_abcdef1234567890', language: 'es', contact: { name: 'Ana Pérez', email: 'ana@cliente.cr' }, request: { tourTitle: 'Canopy Monteverde', people: 2 } }, now)!;
  assert.equal(es.status, 'borrador_no_enviado');
  assert.deepEqual(es.missing, ['fecha']);
  assert.match(es.body, /^Hola Ana:/);
  assert.match(es.body, /¿Qué fecha te interesa\?/);
  assert.doesNotMatch(es.body, /¿Cuántas personas/);
  assert.match(es.body, /Referencia: 34567890/);
  const en = buildFollowUpDraft({ id: 'lead_abcdef1234567890', language: 'en', contact: { email: 'joe@client.com' }, request: {} }, now)!;
  assert.match(en.subject, /One more detail to quote your Costa Rica experience/);
  assert.match(en.body, /^Hi traveler,/);
  assert.match(en.body, /What date/);
  assert.match(en.body, /How many people/);
  const names = OPERATOR_PROSPECTS.operators.map(o => o.name);
  for (const text of [es.body, es.subject, en.body, en.subject]) {
    assert.ok(!names.some(n => text.includes(n)), 'no operator names');
    assert.doesNotMatch(text, /US\$|\$\d/);
  }
  assert.equal(buildFollowUpDraft({ id: 'lead_x1234567', language: 'es', contact: { email: 'a@b.cr' }, request: { date: '2026-12-01', people: 2 } }, now), null);
  assert.equal(buildFollowUpDraft({ id: 'lead_x1234567', language: 'es', contact: null, request: {} }, now), null);
  assert.match(followUpEmail(es)!.html, /Hola Ana:/);
});

test('lead stores the draft only with consent + active triage; flag off means nothing is sent', async () => {
  delete process.env.LEAD_AUTOFOLLOWUP_ENABLED;
  __resetLeadMemoryForTests();
  const { lead } = await captureLead({ source: 'contact_form', language: 'en', consent: true, contact: { name: 'Joe', email: 'joe@client.com' }, request: { tourTitle: 'Rafting', people: 3 } }, now);
  assert.equal(lead.followUp?.status, 'borrador_no_enviado');
  assert.equal(lead.followUp?.language, 'en');
  assert.deepEqual(lead.followUp?.missing, ['fecha']);
  assert.equal((await getLead(lead.id))?.followUp?.status, 'borrador_no_enviado');

  const noConsent = buildLeadRecord({ source: 'contact_form', consent: false, contact: { email: 'x@client.com' }, request: { people: 2 } }, now);
  assert.equal(noConsent.followUp, undefined);
  const spam = buildLeadRecord({ source: 'contact_form', consent: true, contact: { email: 'y@client.com' }, message: 'hola' }, now);
  assert.equal(spam.triage?.state, 'spam');
  assert.equal(spam.followUp, undefined);
});

test('a repeated inquiry that brings the missing party size withdraws the unsent draft', async () => {
  __resetLeadMemoryForTests();
  const base = { source: 'contact_form' as const, consent: true, contact: { email: 'ana@cliente.cr' } };
  const first = await captureLead({ ...base, request: { tourId: 'x-tour', date: '2026-12-10' } }, now);
  assert.deepEqual(first.lead.followUp?.missing, ['pax']);
  const second = await captureLead({ ...base, request: { tourId: 'x-tour', date: '2026-12-10', people: 4 } }, new Date(now.getTime() + 60_000));
  assert.equal(second.created, false);
  assert.equal(second.lead.followUp, undefined);
  assert.equal((await getLead(first.lead.id))?.followUp, undefined);
});
