import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sendEmail } from '../backend/notificationService';

test('no configured SMTP/API provider must not claim delivery or return a fake message id', async () => {
  const keys = ['RESEND_API_KEY', 'SENDGRID_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    const result = await sendEmail({
      to: 'no-delivery@example.invalid',
      subject: 'No transport regression test',
      html: '<p>Not delivered</p>',
    });
    assert.deepEqual(result, { success: false, error: 'email_transport_unconfigured' });
    assert.equal('id' in result, false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('email transport fallback must not log recipient details or simulated success', () => {
  const code = readFileSync('backend/notificationService.ts', 'utf8');
  assert.doesNotMatch(code, /sim-mail-/);
  assert.doesNotMatch(code, /EMAIL TRANSACCIONAL REGISTRADO/);
  assert.match(code, /email_transport_unconfigured/);
});
