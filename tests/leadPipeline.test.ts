import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { TOURS } from '../src/data/toursData';
import { understandConciergeMessage } from '../backend/conciergeUnderstanding';
import {
  __resetLeadMemoryForTests, buildLeadDigest, buildLeadRecord, canTransition, captureLead, getLead, listLeads,
  matchOperatorCandidates, redactFreeText, transitionLead,
} from '../backend/leadPipeline';

const now = new Date('2026-10-14T12:00:00Z');
const pacuare = () => understandConciergeMessage('rafting Pacuare 2 personas diciembre', TOURS, { now });
const admin = { by: 'jose@example.com', role: 'owner' };
const operator = { by: 'operator', role: 'operator' };

test('state machine: forward path, cancel from open states, terminal states are final', () => {
  assert.ok(canTransition('nuevo', 'cotizando'));
  assert.ok(canTransition('cotizando', 'esperando_operador'));
  assert.ok(canTransition('esperando_operador', 'confirmado_por_escrito'));
  assert.ok(canTransition('confirmado_por_escrito', 'pagado'));
  assert.ok(canTransition('esperando_operador', 'cancelado'));
  assert.equal(canTransition('nuevo', 'pagado'), false, 'no skipping to paid');
  assert.equal(canTransition('nuevo', 'confirmado_por_escrito'), false);
  assert.equal(canTransition('pagado', 'cancelado'), false);
  assert.equal(canTransition('cancelado', 'nuevo'), false);
});

test('without consent (Ley 8968) no contact data is stored and free text is redacted', () => {
  const lead = buildLeadRecord({
    source: 'contact_form', understanding: pacuare(), consent: false,
    contact: { name: 'Ana', email: 'ana@example.com', phone: '+506 8888 7777' },
    message: 'Escríbanme a ana@example.com o al +506 8888 7777',
  }, now);
  assert.equal(lead.contact, null);
  assert.equal(lead.contactRedacted, true);
  assert.equal(lead.consent.dataProcessing, false);
  assert.equal(lead.consent.law, 'Ley 8968');
  assert.doesNotMatch(JSON.stringify(lead), /ana@example\.com|8888 ?7777|"Ana"/);
  assert.equal(redactFreeText('mail a@b.co tel 8888-7777'), 'mail [correo] tel [teléfono]');

  const consented = buildLeadRecord({ source: 'contact_form', understanding: pacuare(), consent: true, contact: { name: 'Ana', email: 'ANA@example.com' } }, now);
  assert.deepEqual(consented.contact, { name: 'Ana', email: 'ana@example.com' });
  assert.equal(consented.consent.dataProcessing, true);
});

test('Pacuare rafting is matched to Pacuare/Turrialba prospects with stored ES/EN drafts (never sent)', () => {
  const lead = buildLeadRecord({ source: 'sofia', understanding: pacuare(), consent: true, contact: { email: 'cliente@example.com' } }, now);
  assert.ok(lead.operatorCandidates.length > 0 && lead.operatorCandidates.length <= 3);
  for (const c of lead.operatorCandidates) {
    assert.equal(c.region, 'Pacuare/Turrialba');
    assert.notEqual(c.verification, 'verificado_ict', 'prospects are not verified');
  }
  assert.equal(lead.quoteRequestDrafts.length, lead.operatorCandidates.length * 2);
  for (const d of lead.quoteRequestDrafts) {
    assert.equal(d.status, 'borrador_no_enviado');
    assert.doesNotMatch(d.body, /cliente@example\.com/, 'drafts never include customer PII');
    assert.match(d.body, d.language === 'es' ? /Aún no es una reserva/ : /not a booking yet/);
  }
  assert.equal(lead.referenceQuote?.totalUSD, 220);
  assert.match(lead.referenceQuote!.line, /referencia, sujeto a confirmación/);
  assert.deepEqual(matchOperatorCandidates({}), []);
});

test('dedupe: repeated inquiry merges; after a terminal state a new lead is opened and then reused', async () => {
  __resetLeadMemoryForTests();
  const first = await captureLead({ source: 'sofia', understanding: pacuare(), sessionId: 'sess-1' }, now);
  const second = await captureLead({ source: 'contact_form', understanding: pacuare(), sessionId: 'sess-1' }, new Date(now.getTime() + 3600_000));
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.lead.id, first.lead.id);
  assert.equal(second.lead.inquiryCount, 2);
  assert.deepEqual(second.lead.sources, ['sofia', 'contact_form']);

  const cancelled = await transitionLead(first.lead.id, 'cancelado', operator, { note: 'cliente desistió' });
  assert.equal(cancelled.ok, true);
  const third = await captureLead({ source: 'sofia', understanding: pacuare(), sessionId: 'sess-1' }, new Date(now.getTime() + 7200_000));
  assert.equal(third.created, true);
  assert.notEqual(third.lead.id, first.lead.id);
  const fourth = await captureLead({ source: 'sofia', understanding: pacuare(), sessionId: 'sess-1' }, new Date(now.getTime() + 9000_000));
  assert.equal(fourth.created, false);
  assert.equal(fourth.lead.id, third.lead.id);
});

test('transitions require written evidence for confirmado_por_escrito/pagado and owner/admin for pagado', async () => {
  __resetLeadMemoryForTests();
  const { lead } = await captureLead({ source: 'booking_request', understanding: pacuare(), bookingId: 'CRT-1' }, now);
  assert.equal((await transitionLead(lead.id, 'pagado', admin)).ok, false);
  assert.equal((await transitionLead(lead.id, 'bogus', admin) as any).error, 'invalid_status');
  assert.equal((await transitionLead(lead.id, 'cotizando', operator)).ok, true);
  assert.equal((await transitionLead(lead.id, 'esperando_operador', operator)).ok, true);
  assert.equal((await transitionLead(lead.id, 'confirmado_por_escrito', operator) as any).error, 'evidence_required');
  assert.equal((await transitionLead(lead.id, 'confirmado_por_escrito', operator, { evidence: 'correo Exploradores 14/10' })).ok, true);
  assert.equal((await transitionLead(lead.id, 'pagado', operator, { evidence: 'SINPE 123' }) as any).error, 'admin_required');
  const paid = await transitionLead(lead.id, 'pagado', admin, { evidence: 'SINPE 123' });
  assert.equal(paid.ok, true);
  const stored = await getLead(lead.id);
  assert.equal(stored?.status, 'pagado');
  assert.deepEqual(stored?.statusHistory.map(h => h.to), ['nuevo', 'cotizando', 'esperando_operador', 'confirmado_por_escrito', 'pagado']);
});

test('digest counts by status and lists open leads without response for more than 24h', async () => {
  __resetLeadMemoryForTests();
  await captureLead({ source: 'sofia', understanding: pacuare(), sessionId: 'old', consent: true, contact: { email: 'old@cliente.cr' } }, new Date(now.getTime() - 30 * 3600_000));
  await captureLead({ source: 'sofia', understanding: pacuare(), sessionId: 'new', consent: true, contact: { email: 'new@cliente.cr' } }, new Date(now.getTime() - 2 * 3600_000));
  // Sin contacto: queda descartado por triaje y no cuenta como "sin respuesta".
  await captureLead({ source: 'sofia', understanding: pacuare(), sessionId: 'ghost' }, new Date(now.getTime() - 40 * 3600_000));
  const digest = buildLeadDigest(await listLeads(), now);
  assert.equal(digest.total, 3);
  assert.equal(digest.byStatus.nuevo, 3);
  assert.equal(digest.triagedOut, 1);
  assert.equal(digest.stale.length, 1);
  assert.equal(digest.stale[0].hoursWithoutResponse, 30);
  assert.match(digest.text, /Sin respuesta >24h \(1\)/);
});

test('HTTP: admin list/status behind operator auth, digest behind OPERATOR_API_KEY and dry-run by default', async () => {
  __resetLeadMemoryForTests();
  const saved = { key: process.env.OPERATOR_API_KEY, digest: process.env.LEADS_DIGEST_ENABLED, gemini: process.env.GEMINI_API_KEY };
  process.env.OPERATOR_API_KEY = 'test-operator-key';
  delete process.env.LEADS_DIGEST_ENABLED;
  delete process.env.GEMINI_API_KEY;
  const { createApp } = await import('../backend/app');
  const server = createApp().listen(0);
  const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const op = { 'x-operator-key': 'test-operator-key', 'content-type': 'application/json' };
  try {
    assert.equal((await fetch(`${base()}/api/admin/leads`)).status, 401);
    assert.equal((await fetch(`${base()}/api/internal/leads/digest`, { method: 'POST' })).status, 401);

    // A concrete Sofía inquiry creates a lead automatically.
    await fetch(`${base()}/api/gemini/concierge`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Quiero rafting Pacuare 2 personas diciembre', language: 'es' }) });
    let leads: any[] = [];
    for (let i = 0; i < 20 && leads.length === 0; i++) {
      await new Promise(r => setTimeout(r, 50));
      leads = (await (await fetch(`${base()}/api/admin/leads`, { headers: op })).json() as any).leads;
    }
    assert.equal(leads.length, 1);
    assert.equal(leads[0].firstSource, 'sofia');
    assert.equal(leads[0].request.tourId, 'pacuare-rafting');
    assert.equal(leads[0].contact, null);

    const bad = await fetch(`${base()}/api/admin/leads/${leads[0].id}/status`, { method: 'PATCH', headers: op, body: JSON.stringify({ status: 'pagado', evidence: 'x' }) });
    assert.equal(bad.status, 403);
    const okRes = await fetch(`${base()}/api/admin/leads/${leads[0].id}/status`, { method: 'PATCH', headers: op, body: JSON.stringify({ status: 'cotizando' }) });
    assert.equal(okRes.status, 200);
    const skip = await fetch(`${base()}/api/admin/leads/${leads[0].id}/status`, { method: 'PATCH', headers: op, body: JSON.stringify({ status: 'pagado', evidence: 'x' }) });
    assert.ok([403, 409].includes(skip.status));

    const digestRes = await fetch(`${base()}/api/internal/leads/digest`, { method: 'POST', headers: op, body: '{}' });
    const digest: any = await digestRes.json();
    assert.equal(digestRes.status, 200);
    assert.equal(digest.dryRun, true);
    assert.equal(digest.delivered, false);
    assert.equal(digest.digest.byStatus.cotizando, 1);
  } finally {
    server.close();
    for (const [k, v] of [['OPERATOR_API_KEY', saved.key], ['LEADS_DIGEST_ENABLED', saved.digest], ['GEMINI_API_KEY', saved.gemini]] as const) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
});

test('firestore rules: leads are admin/operator only, never public', () => {
  const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
  const start = rules.indexOf('match /leads/{leadId} {');
  assert.ok(start > 0);
  const block = rules.slice(start, rules.indexOf('\n    }', start));
  assert.match(block, /allow read: if isAdmin\(\) \|\| isOperatorRole\(\);/);
  assert.match(block, /allow create, update, delete: if isAdmin\(\);/);
  assert.doesNotMatch(block, /if true/);
});

test('daily digest workflow is keyless, uses OPERATOR_API_KEY and skips cleanly when it is missing', () => {
  const wf = fs.readFileSync(path.join(process.cwd(), '.github/workflows/leads-digest.yml'), 'utf8');
  assert.match(wf, /schedule:/);
  assert.match(wf, /\/api\/internal\/leads\/digest/);
  assert.match(wf, /X-Operator-Key: \$OPERATOR_API_KEY/);
  assert.match(wf, /secrets\.OPERATOR_API_KEY/);
  assert.match(wf, /enabled=false/);
  assert.doesNotMatch(wf, /credentials_json|GCP_SA_KEY|gcloud\s+run\s+deploy/);
});
