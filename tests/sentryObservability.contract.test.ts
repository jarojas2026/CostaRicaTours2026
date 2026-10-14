import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { REDACTED, scrubEvent, scrubText } from '../shared/observability/scrubPii';
import { initServerSentry, isServerSentryActive } from '../backend/observability/sentry';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('scrubText redacts emails and phone numbers but keeps ids, dates and amounts', () => {
  const input = 'Cliente ana.perez@example.com, tel +506 8795-9148 / 87959148 / (506) 2771 0000, reserva BK-1234 del 2026-10-14 por 245.50 USD';
  const output = scrubText(input);
  assert.doesNotMatch(output, /ana\.perez|example\.com|8795|2771/);
  assert.match(output, /\[email\]/);
  assert.match(output, /\[phone\]/);
  assert.match(output, /BK-1234/);
  assert.match(output, /2026-10-14/);
  assert.match(output, /245\.50 USD/);
});

test('scrubEvent drops user, cookies, bodies and query strings and redacts auth headers', () => {
  const event = scrubEvent({
    event_id: '0123456789abcdef0123456789abcdef',
    user: { id: 'u1', email: 'a@b.co', ip_address: '1.2.3.4' },
    request: {
      url: 'https://costaricatours.example/api/chat/history?sessionId=abc&email=a@b.co',
      cookies: { session: 'x' },
      data: { phone: '+50687959148' },
      query_string: 'email=a@b.co',
      headers: { authorization: 'Bearer secret', 'x-chat-session-token': 't', 'content-type': 'application/json' },
    },
    exception: { values: [{ value: 'No se encontró reserva para jose@example.com' }] },
  });
  assert.equal(event.user, undefined);
  const request = event.request as Record<string, unknown>;
  assert.equal(request.cookies, undefined);
  assert.equal(request.data, undefined);
  assert.equal(request.query_string, undefined);
  assert.equal(request.url, 'https://costaricatours.example/api/chat/history');
  const headers = request.headers as Record<string, string>;
  assert.equal(headers.authorization, REDACTED);
  assert.equal(headers['x-chat-session-token'], REDACTED);
  assert.equal(headers['content-type'], 'application/json');
  assert.equal(event.event_id, '0123456789abcdef0123456789abcdef');
  assert.doesNotMatch(JSON.stringify(event), /jose@example\.com/);
});

test('server Sentry stays off without SENTRY_DSN', async () => {
  assert.equal(await initServerSentry({ NODE_ENV: 'test' }), false);
  assert.equal(isServerSentryActive(), false);
});

test('Sentry SDKs are opt-in, privacy-first and lazily loaded', () => {
  for (const file of ['backend/observability/sentry.ts', 'src/observability/sentry.ts']) {
    const source = read(file);
    assert.match(source, /userInfo: false/, file);
    assert.match(source, /httpBodies: \[\]/, file);
    assert.match(source, /beforeSend: \(event\) => scrubEvent\(event\)/, file);
    assert.doesNotMatch(source, /^import (?!type)[^;]*from '@sentry\//m, `${file} must not import a Sentry SDK statically`);
  }
  assert.match(read('backend/observability/sentry.ts'), /env\.SENTRY_DSN\?\.trim\(\)/);
  assert.match(read('src/observability/sentry.ts'), /env\.VITE_SENTRY_DSN\?\.trim\(\)/);
  assert.match(read('src/observability/sentry.ts'), /import\('@sentry\/react'\)/);
  assert.match(read('src/main.tsx'), /void initClientSentry\(\);/);
  assert.match(read('src/components/ErrorBoundary.tsx'), /reportClientError\(error/);
  assert.match(read('backend/asyncRoutes.ts'), /if \(httpStatus >= 500\) captureServerException/);
});
