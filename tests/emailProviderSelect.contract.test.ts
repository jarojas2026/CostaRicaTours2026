import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { emailProviderPreference, emailProviderStatus, selectedEmailTransport } from '../backend/emailProviderSelect';
import { sendEmail } from '../backend/notificationService';

const SMTP = { SMTP_USER: 'u@example.test', SMTP_PASS: 'not-a-real-pass' };
const RESEND = { RESEND_API_KEY: 're_test_not_real' };

test('auto keeps historical precedence: resend > sendgrid > smtp', () => {
  assert.equal(emailProviderPreference({}), 'auto');
  assert.equal(selectedEmailTransport({}), null);
  assert.equal(selectedEmailTransport(SMTP), 'smtp');
  assert.equal(selectedEmailTransport({ ...SMTP, SENDGRID_API_KEY: 'x' }), 'sendgrid');
  assert.equal(selectedEmailTransport({ ...SMTP, SENDGRID_API_KEY: 'x', ...RESEND }), 'resend');
});

test('explicit switch SMTP <-> Resend ignores the other transport', () => {
  assert.equal(selectedEmailTransport({ ...SMTP, ...RESEND, EMAIL_PROVIDER: 'smtp' }), 'smtp');
  assert.equal(selectedEmailTransport({ ...SMTP, ...RESEND, EMAIL_PROVIDER: 'resend' }), 'resend');
  assert.equal(selectedEmailTransport({ ...SMTP, EMAIL_PROVIDER: 'resend' }), null, 'resend chosen but not configured → no silent switch');
  assert.equal(selectedEmailTransport({ ...SMTP, ...RESEND, EMAIL_PROVIDER: 'none' }), null);
  assert.equal(emailProviderPreference({ EMAIL_PROVIDER: 'bogus' }), 'auto');
});

test('EMAIL_PROVIDER=none: sendEmail never calls out and never claims delivery', async () => {
  const prev = { ...process.env };
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response('{}'); }) as typeof fetch;
  try {
    Object.assign(process.env, RESEND, { EMAIL_PROVIDER: 'none' });
    const r = await sendEmail({ to: 'nobody@example.test', subject: 's', html: '<p>x</p>' } as any);
    assert.equal(r.success, false);
    assert.equal(r.id, undefined);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = realFetch;
    for (const k of Object.keys(process.env)) if (!(k in prev)) delete process.env[k];
    Object.assign(process.env, prev);
  }
});

test('EMAIL_PROVIDER=smtp with a Resend key does not hit the Resend API', async () => {
  const prev = { ...process.env };
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response('{}'); }) as typeof fetch;
  try {
    delete process.env.SMTP_USER; delete process.env.SMTP_PASS;
    Object.assign(process.env, RESEND, { EMAIL_PROVIDER: 'smtp' });
    const r = await sendEmail({ to: 'nobody@example.test', subject: 's', html: '<p>x</p>' } as any);
    assert.equal(r.success, false);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = realFetch;
    for (const k of Object.keys(process.env)) if (!(k in prev)) delete process.env[k];
    Object.assign(process.env, prev);
  }
});

test('status flags free-mailbox senders and exposes no secrets', () => {
  const s = emailProviderStatus({ ...RESEND, EMAIL_FROM: 'Tours <x@gmail.com>' });
  assert.equal(s.freeMailboxSender, true);
  assert.ok(!JSON.stringify(s).includes('re_test'));
});

test('selection module never enables autosend', () => {
  const src = readFileSync('backend/emailProviderSelect.ts', 'utf8');
  assert.ok(!/AUTOSEND_ENABLED\s*=|AUTOFOLLOWUP_ENABLED\s*=/.test(src));
});
