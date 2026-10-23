import assert from 'node:assert/strict';
import test from 'node:test';
import { isSensitiveCustomerEmail, looksLikeTravelRequest, newestEmailReply } from '../backend/emailRequestPolicy';

test('customer replies requesting date/party changes and cancellation require review', () => {
  for (const email of [
    'Hola, ahora somos 10 personas',
    'Finalmente seremos 4 viajeros',
    'Quiero cambiar la fecha al 15 de marzo',
    'Necesito cancelar mi reserva',
    'Solicito un reembolso',
    'Can you reschedule our booking?',
    'Please change the date',
    'I want to add more tours',
    'Me gustaría agregar un traslado'
  ]) {
    assert.equal(isSensitiveCustomerEmail(email), true, email);
  }
});
test('ordinary information/availability requests are not treated as authenticated mutations', () => {
  for (const email of ['¿Qué incluye el tour?', 'What is the price?', 'Is there availability?', 'Necesito cotización para 2 personas']) {
    assert.equal(isSensitiveCustomerEmail(email), false, email);
    assert.equal(looksLikeTravelRequest(email), true, email);
  }
});
test('missing context stays non-operational and vendor quoted text cannot authorize mutations', () => {
  assert.equal(isSensitiveCustomerEmail('confirmado'), false);
  assert.equal(looksLikeTravelRequest('ahora somos 10 personas'), true);
  assert.equal(looksLikeTravelRequest('Please update our hotel booking'), true);
  assert.equal(looksLikeTravelRequest('Hello'), false);
});
test('cron never runs both Gmail provider readers automatically', async () => {
  const { readFileSync } = await import('node:fs');
  const code = readFileSync('backend/cronEngine.ts', 'utf8');
  assert.match(code, /EMAIL_OPERATIONS_ENABLED !== 'false' \|\| process\.env\.PROVIDER_INBOX_LEGACY_ENABLED !== 'true'/);
  assert.match(code, /if \(process\.env\.EMAIL_OPERATIONS_ENABLED === 'false'\) return/);
});
test('email must verify assigned provider from Firestore and never treat mailbox sender as booking owner', async () => {
  const { readFileSync } = await import('node:fs');
  const code = readFileSync('backend/emailOperationsAgent.ts', 'utf8');
  assert.match(code, /verifiedProviderOrderForEmail\(mail\)/);
  assert.match(code, /resolveOperationalProvider\(/);
  assert.match(code, /EMAIL_VERIFIED_PROVIDER_ACTIONS_ENABLED === 'true'/);
  assert.match(code, /allowMutations: false/);
  assert.match(code, /status: 'needs_human_review'/);
});


test('quoted outgoing action menus do not trigger cancellation or change', () => {
  const input = [
    '¿Incluye transporte?',
    '',
    'El mar, 20 oct 2026, Costa Rica Tours escribió:',
    '> 1. Cambiar fecha',
    '> 4. Solicitar cancelación o revisar reembolso'
  ].join('\n');
  const latest = newestEmailReply(input);
  assert.equal(latest, '¿Incluye transporte?');
  assert.equal(isSensitiveCustomerEmail(latest), false);
  assert.equal(looksLikeTravelRequest(latest), true);
});

test('real change request in latest reply survives quoted history removal', () => {
  const input = [
    'Ahora somos 10 personas, por favor revisar cupos.',
    '',
    'On Tue, 20 Oct 2026 at 7:00 PM Example wrote:',
    '> 4. Request cancellation'
  ].join('\n');
  const latest = newestEmailReply(input);
  assert.match(latest, /10 personas/);
  assert.equal(isSensitiveCustomerEmail(latest), true);
  assert.doesNotMatch(latest, /Request cancellation/);
});
