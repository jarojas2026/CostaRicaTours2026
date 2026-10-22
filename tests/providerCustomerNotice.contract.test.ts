import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildProviderCustomerNotice } from '../backend/providerCustomerNotice';

for (const language of ['es', 'en']) {
  for (const action of ['confirm', 'reject', 'delay', 'no_show', 'complete']) {
    test(`customer notice is safe and actionable: ${language}/${action}`, () => {
      const notice = buildProviderCustomerNotice(action, language);
      assert.ok(notice.text.length > 50);
      assert.match(notice.subject, /Costa Rica Tours/);
      assert.doesNotMatch(notice.subject, /confirmad|confirmed/i);
      assert.doesNotMatch(JSON.stringify(notice), /@|https?:|OS-CR-|providerId|commission|comisión|voucher|<script/i);
      assert.equal(notice.html, `<p>${notice.text}</p>`);
    });
  }
}

test('acceptance cannot claim payment or final booking confirmation', () => {
  assert.match(buildProviderCustomerNotice('confirm', 'es').text, /no confirma el pago ni la reserva final/);
  assert.match(buildProviderCustomerNotice('confirm', 'en').text, /does not confirm payment or the final booking/);
  assert.match(buildProviderCustomerNotice('reject', 'en').text, /no alternative has been confirmed/);
  assert.match(buildProviderCustomerNotice('no_show', 'es').text, /requiere revisión/);
});

test('untrusted action/language cannot enter customer content', () => {
  const attack = '<script>provider-secret@example.invalid +506 00000000 OS-CR-PRIVATE 15%</script>';
  const notice = buildProviderCustomerNotice(attack, attack);
  assert.match(notice.text, /Recibimos una actualización/);
  assert.doesNotMatch(JSON.stringify(notice), /script|example|PRIVATE|15%/);
  assert.equal(buildProviderCustomerNotice('delay', 'en-US').text, buildProviderCustomerNotice('delay', 'en').text);
  assert.equal(buildProviderCustomerNotice('delay', null).text, buildProviderCustomerNotice('delay', 'es').text);
});

test('provider response email uses safe copy while retaining internal evidence and delivery result', () => {
  const code = readFileSync(new URL('../backend/emailOperationsAgent.ts', import.meta.url), 'utf8');
  const section = code.slice(code.indexOf('async function processProviderResponseEmail'), code.indexOf('async function processCustomerEmail'));
  const payload = section.slice(section.indexOf('const delivery = await sendEmailWithOutcome({'), section.indexOf('customerNotification = delivery.success'));
  assert.match(payload, /buildProviderCustomerNotice\(action, booking\?\.language \|\| booking\?\.customer\?\.language\)/);
  assert.doesNotMatch(payload, /result\.message|mail\.text|providerName|orderId/);
  assert.match(section, /resultMessage: result\.message/);
  assert.match(section, /customerNotified: customerNotification.status === 'sent'/);
});
