import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { clientIpFromRequest, createFormAbuseGuard, normalizeIp } from '../backend/formAbuseGuard';
import { FORM_GUARD_MESSAGES, FORM_RATE_LIMIT, HONEYPOT_FIELD, STARTED_AT_FIELD } from '../shared/formAbuse';

type Guard = ReturnType<typeof createFormAbuseGuard>;

async function withApp(guard: Guard, run: (url: string, seen: unknown[]) => Promise<void>) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  const seen: unknown[] = [];
  app.post('/form', guard, (req, res) => { seen.push(req.body); res.status(202).json({ success: true, processed: true }); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}/form`, seen); }
  finally { server.close(); }
}

const post = (url: string, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

// Lo que llega a Cloud Run desde el gateway de Vercel: Vercel fija la IP real y el GFE añade la de la función.
const viaVercel = (clientIp: string) => ({ 'x-crt-gateway': 'vercel-oidc-wif', 'x-forwarded-for': `${clientIp}, 3.3.3.3` });

test('429 after 5 submissions in 10 minutes from the same client IP, with friendly ES/EN message and Retry-After', async () => {
  let now = 1_000_000;
  const guard = createFormAbuseGuard({ name: 't429', now: () => now });
  await withApp(guard, async url => {
    assert.equal(FORM_RATE_LIMIT.max, 5);
    assert.equal(FORM_RATE_LIMIT.windowMs, 10 * 60_000);
    for (let i = 0; i < 5; i++) assert.equal((await post(url, { language: 'es' }, viaVercel('1.1.1.1'))).status, 202);
    const es = await post(url, { language: 'es' }, viaVercel('1.1.1.1'));
    assert.equal(es.status, 429);
    assert.ok(Number(es.headers.get('retry-after')) > 0);
    const esBody = await es.json();
    assert.equal(esBody.code, 'rate_limited');
    assert.equal(esBody.message, FORM_GUARD_MESSAGES.rate_limited.es);
    const en = await post(url, { language: 'en' }, viaVercel('1.1.1.1'));
    assert.equal((await en.json()).message, FORM_GUARD_MESSAGES.rate_limited.en);
    // Otro visitante detrás del mismo proxy de Vercel (misma IP de función) no queda bloqueado.
    assert.equal((await post(url, {}, viaVercel('2.2.2.2'))).status, 202);
    // La ventana se reinicia.
    now += 10 * 60_000 + 1;
    assert.equal((await post(url, {}, viaVercel('1.1.1.1'))).status, 202);
  });
});

test('honeypot filled: generic 202 without reaching the handler; fields are stripped for real users', async () => {
  const guard = createFormAbuseGuard({ name: 'thp', now: () => 10_000_000 });
  await withApp(guard, async (url, seen) => {
    const bot = await post(url, { name: 'x', [HONEYPOT_FIELD]: 'http://spam.example' }, viaVercel('4.4.4.4'));
    assert.equal(bot.status, 202);
    assert.deepEqual(await bot.json(), { success: true, status: 'received' });
    assert.equal(seen.length, 0);
    const human = await post(url, { name: 'Ana', [HONEYPOT_FIELD]: '', [STARTED_AT_FIELD]: 10_000_000 - 5_000 }, viaVercel('4.4.4.5'));
    assert.equal(human.status, 202);
    assert.deepEqual(seen, [{ name: 'Ana' }]);
  });
});

test('minimum fill time: too-fast submissions get 400 too_fast (ES/EN); old clients without timestamp pass', async () => {
  const now = 50_000_000;
  const guard = createFormAbuseGuard({ name: 'tfast', now: () => now });
  await withApp(guard, async url => {
    const fast = await post(url, { language: 'en', [STARTED_AT_FIELD]: now - 500 }, viaVercel('5.5.5.5'));
    assert.equal(fast.status, 400);
    const body = await fast.json();
    assert.equal(body.code, 'too_fast');
    assert.equal(body.message, FORM_GUARD_MESSAGES.too_fast.en);
    assert.equal((await post(url, { [STARTED_AT_FIELD]: 'abc' }, viaVercel('5.5.5.6'))).status, 400);
    assert.equal((await post(url, {}, viaVercel('5.5.5.7'))).status, 202);
  });
});

test('client IP behind Vercel proxy uses x-real-ip / Vercel hop, not the proxy IP; spoofed XFF without gateway falls back to req.ip', () => {
  const req = (headers: Record<string, string>, ip = '9.9.9.9') => ({ headers, ip, socket: {} }) as any;
  assert.equal(clientIpFromRequest(req({ 'x-crt-gateway': 'vercel-oidc-wif', 'x-real-ip': '7.7.7.7', 'x-forwarded-for': '7.7.7.7, 3.3.3.3' })), '7.7.7.7');
  assert.equal(clientIpFromRequest(req({ 'x-crt-gateway': 'vercel-oidc-wif', 'x-forwarded-for': '8.8.8.8, 3.3.3.3' })), '8.8.8.8');
  assert.equal(clientIpFromRequest(req({ 'x-forwarded-for': '6.6.6.6' })), '9.9.9.9');
  assert.equal(normalizeIp('::ffff:1.2.3.4'), '1.2.3.4');
  assert.equal(normalizeIp('2001:db8:aa:bb:1:2:3:4'), normalizeIp('2001:db8:aa:bb:ffff::1'));
});

test('public forms are guarded: quote-request, contact form (customer-intake) and /participar', () => {
  assert.match(fs.readFileSync('backend/routes/leads.ts', 'utf8'), /post\('\/api\/leads\/quote-request', chatLimiter, quoteRequestGuard,/);
  assert.match(fs.readFileSync('backend/routes/intake.ts', 'utf8'), /post\('\/api\/customer-intake', chatLimiter, contactFormGuard,/);
  assert.match(fs.readFileSync('backend/digitalCityApplicationRouter.ts', 'utf8'), /post\('\/', intakeLimiter, participateGuard, requireVerifiedApplicant,/);
  for (const file of ['src/components/TourQuoteRequestForm.tsx', 'src/components/ContactSection.tsx', 'src/pages/DigitalCityJoinPage.tsx']) {
    const src = fs.readFileSync(file, 'utf8');
    assert.match(src, /<HoneypotField /, file);
    assert.match(src, /formGuardFields\(startedAt, ?honeypot\)/, file);
  }
});

test('cotizaciones: además del límite corto hay tope diario de 20 por IP (rescatado de #286)', async () => {
  const { QUOTE_DAILY_LIMIT, quoteRequestDailyGuard } = await import('../backend/formAbuseGuard');
  assert.equal(QUOTE_DAILY_LIMIT.max, 20);
  assert.equal(QUOTE_DAILY_LIMIT.windowMs, 24 * 60 * 60_000);
  assert.equal(typeof quoteRequestDailyGuard.reset, 'function');
  let now = 0;
  const daily = createFormAbuseGuard({ name: 'tday', ...QUOTE_DAILY_LIMIT, now: () => now });
  const req = { headers: {}, ip: '5.5.5.5', socket: {}, body: {} } as any;
  const run = () => { let status = 200; let passed = false; const res: any = { setHeader() {}, status(c: number) { status = c; return res; }, json() { return res; } }; daily(req, res, () => { passed = true; }); return passed ? 200 : status; };
  for (let i = 0; i < 20; i += 1) { now += 60 * 60_000 / 2; assert.equal(run(), 200); }
  assert.equal(run(), 429);
  now += 24 * 60 * 60_000;
  assert.equal(run(), 200);
  assert.match(fs.readFileSync('backend/routes/leads.ts', 'utf8'), /quoteRequestGuard, quoteRequestDailyGuard, async/);
});
