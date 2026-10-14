import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  bookingDocumentToken,
  issueChatSession,
  verifyBookingDocumentToken,
  verifyChatSessionAccess,
} from '../backend/signedAccessTokens';
import { wrapAsyncHandler } from '../backend/asyncRoutes';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('chat memory requires a server-minted session id plus its HMAC token', () => {
  const session = issueChatSession();
  assert.match(session.sessionId, /^chat_[0-9a-f-]{36}$/);
  assert.equal(verifyChatSessionAccess(session.sessionId, session.sessionToken), true);
  assert.equal(verifyChatSessionAccess(`${session.sessionId}_counter_agent`, session.sessionToken), true, 'agent-scoped ids share the base token');

  const other = issueChatSession();
  assert.equal(verifyChatSessionAccess(other.sessionId, session.sessionToken), false, 'a token never opens another session');
  assert.equal(verifyChatSessionAccess(session.sessionId, ''), false);
  assert.equal(verifyChatSessionAccess(session.sessionId, undefined), false);
  for (const guessed of ['wa_50688888888', 'voice_CA123', 'trav_1700000000000_abcdef0123', 'session_abc123', 'web_1234567890']) {
    assert.equal(verifyChatSessionAccess(guessed, session.sessionToken), false, guessed);
  }
});

test('booking document links are bound to exactly one booking', () => {
  const token = bookingDocumentToken('CR-PV-0001');
  assert.equal(verifyBookingDocumentToken('CR-PV-0001', token), true);
  assert.equal(verifyBookingDocumentToken('CR-PV-0002', token), false);
  assert.equal(verifyBookingDocumentToken('CR-PV-0001', 'forged'), false);
  assert.equal(verifyBookingDocumentToken('CR-PV-0001', undefined), false);
});

test('async route rejections are forwarded to next(err) instead of crashing the process', async () => {
  const failure = new Error('boom');
  const handler = wrapAsyncHandler(async () => { throw failure; });
  const received = await new Promise<unknown>((resolve) => {
    handler({} as any, {} as any, resolve as any);
  });
  assert.equal(received, failure);
  const errorHandler = (_err: any, _req: any, _res: any, _next: any) => undefined;
  assert.equal(wrapAsyncHandler(errorHandler), errorHandler, 'error middleware keeps its 4-arity signature');
});

test('server installs async safety, an API error handler and a stricter LLM limiter before admin routers', () => {
  const server = read('server.ts');
  assert.match(server, /installAsyncRouteSafety\(app\)/);
  assert.match(server, /app\.use\(apiErrorHandler\)/);
  assert.match(server, /const llmLimiter = rateLimit\(/);
  const limiterIndex = server.indexOf("app.use('/api/', generalApiLimiter");
  assert.ok(limiterIndex > 0);
  assert.ok(server.indexOf("app.use('/api/admin/commerce', commerceAdminRouter)") > limiterIndex, 'commerce router after limiter');
  assert.ok(server.indexOf("app.use('/api/admin/knowledge', knowledgeCityRouter)") > limiterIndex, 'knowledge router after limiter');
  assert.match(server, /MASSIVE_BATCH_MAX/);
  assert.match(server, /batch_too_large/);
});

test('chat history routes and concierge memory require chat-session proof', () => {
  const server = read('server.ts');
  assert.match(server, /app\.get\('\/api\/chat\/history', requireChatSession\('query'\)/);
  assert.match(server, /app\.post\('\/api\/chat\/history', requireChatSession\('body'\)/);
  assert.match(server, /app\.delete\('\/api\/chat\/history', requireChatSession\('either'\)/);
  assert.match(server, /const memorySessionId = verifyChatSessionAccess\(/);
  const assistant = read('src/components/AIAssistant.tsx');
  assert.doesNotMatch(assistant, /'session_' \+ Math\.random/);
  assert.match(assistant, /chatSessionHeaders\(chatSession\)/);
});

test('operational, cron, notification and automation routes require server-side auth', () => {
  const server = read('server.ts');
  const guarded: Array<[string, string]> = [
    ["'/api/fcm/send'", 'requireAdmin'],
    ["'/api/fcm/register'", 'requireFirebaseUser'],
    ["'/api/bookings/send-proforma-confirmation']", 'requireAdmin'],
    ["'/api/reminders/run-24h'", 'requireAdmin'],
    ["'/api/reviews/run-request-batch'", 'requireAdmin'],
    ["'/api/surveillance/run-check'", 'requireAdmin'],
    ["'/api/reports/run-daily-ops'", 'requireAdmin'],
    ["'/api/agents/supervisor'", 'requireAdmin'],
    ["'/api/agents/log_exception'", 'requireAdmin'],
    ["'/api/agents/triage'", 'requireAdmin'],
    ["'/api/calendario/sincronizar']", 'requireAdmin'],
    ["'/api/operadores/notificar']", 'requireAdmin'],
    ["'/api/nps/despachar']", 'requireAdmin'],
    ["'/api/reportes/semanal']", 'requireAdmin'],
    ["'/api/payments/sinpe-verify'", 'requireOperator'],
    ["'/api/reservas/confirmar'", 'requireAdmin'],
    ['additionalWebhooks', 'requireAdmin'],
  ];
  for (const [route, middleware] of guarded) {
    const line = server.split('\n').find((candidate) => /^app\.(post|get|all)\(/.test(candidate) && candidate.includes(route));
    assert.ok(line, `route not found: ${route}`);
    assert.ok(line!.includes(middleware), `${route} must use ${middleware}: ${line}`);
  }
  const automationLines = server.split('\n').filter((line) => /^app\.post\(.*'\/api\/automations\//.test(line));
  assert.ok(automationLines.length >= 6);
  for (const line of automationLines) assert.match(line, /requireAdmin/);
  // FCM tokens are bound to the authenticated uid, never to req.body.userId.
  assert.match(server, /const userId = String\(\(req as any\)\.user\?\.uid \|\| ''\)/);
});

test('booking documents and provider status are no longer public and never scan every booking', () => {
  const server = read('server.ts');
  assert.match(server, /async function loadAuthorizedBookingDocument/);
  assert.match(server, /verifyBookingDocumentToken\(bookingId, req\.query\.token\)/);
  assert.match(server, /user\.email_verified === true/);
  const pdfBlock = server.slice(server.indexOf("app.get('/api/bookings/:id/pdf'"), server.indexOf('// Despacho de Proforma'));
  assert.doesNotMatch(pdfBlock, /getAllBookings/);
  const statusBlock = server.slice(server.indexOf("app.get(['/api/provider/status/:bookingId'"), server.indexOf('// 2. Confirmación de Reserva al Cliente'));
  assert.doesNotMatch(statusBlock, /getAllBookings/);
  assert.match(statusBlock, /resolveOperatorAccess\(req\)/);
  assert.match(statusBlock, /vercel-oidc-wif-provider-evidence/);
  const workflows = read('backend/nativeWorkflows.ts');
  assert.match(workflows, /download-pdf\?token=/);
});

test('unverified phone or e-mail never links to, reveals or overwrites an existing traveler', () => {
  const identity = read('backend/travelerIdentityService.ts');
  assert.match(identity, /input\.verifiedPhone === true \? \{ kind: 'phone'/);
  assert.match(identity, /input\.verifiedEmail === true \? \{ kind: 'email'/);
  assert.match(identity, /traveler_identity_pending_links/);
  assert.match(identity, /status: 'pending_verification'/);
  const intake = read('backend/customerIntakeGateway.ts');
  assert.match(intake, /verifiedPhone: trust\.verifiedPhone === true/);
  assert.doesNotMatch(intake, /identity: \{ canonicalId: identity\.canonicalId/);
  const server = read('server.ts');
  // Only the Meta-signed WhatsApp webhook marks the phone as verified.
  assert.match(server, /trust: \{ verifiedPhone: true \}/);
  assert.match(server, /\^web_\[A-Za-z0-9-\]\{8,80\}\$/);
});
