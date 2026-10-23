import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { argValue, classifyLeads, testSignals } from '../scripts/discardTestLeads';

test('argv accepts "--flag value" and "--flag=value"', () => {
  assert.equal(argValue(['--base-url', 'https://a.test'], '--base-url'), 'https://a.test');
  assert.equal(argValue(['--base-url=https://b.test'], '--base-url'), 'https://b.test');
  assert.equal(argValue(['--base-url', '--apply'], '--base-url'), '');
  assert.equal(argValue([], '--base-url'), '');
});

test('needs ≥2 signals; single-signal leads are borderline; discarded skipped', () => {
  const leads = [
    { id: 'a', contact: { email: 'qa@example.com', name: 'Prueba E2E' } },
    { id: 'b', contact: { email: 'maria@gmail.com', name: 'Maria Test' } },
    { id: 'c', contact: { email: 'real@gmail.com', name: 'Ana' }, messageSnippet: 'Rafting en Arenal' },
    { id: 'd', contact: { email: 'test@example.com' }, triage: { state: 'descartado' } },
    { id: 'e', contact: { email: 'test@example.com' } },
  ];
  const { toDiscard, borderline } = classifyLeads(leads);
  assert.deepEqual(toDiscard.map(l => l.id), ['a', 'e']);
  assert.deepEqual(borderline.map(l => l.id), ['b']);
  assert.equal(testSignals(leads[2]).count, 0);
});

test('script matches the real API contract (requireOperator, ids, descartar) and is dry-run by default', () => {
  const route = readFileSync('backend/routes/leads.ts', 'utf8');
  assert.match(route, /post\('\/api\/admin\/leads\/triage', requireOperator/);
  assert.match(route, /req\.body\?\.ids/);
  assert.match(route, /action !== 'descartar' && action !== 'restaurar'/);
  const script = readFileSync('scripts/discardTestLeads.ts', 'utf8');
  assert.match(script, /action: 'descartar', ids: batch/);
  assert.match(script, /X-Operator-Key/);
  assert.match(script, /argv\.includes\('--apply'\)/);
  assert.ok(!/method: 'DELETE'/.test(script), 'never deletes');
});
