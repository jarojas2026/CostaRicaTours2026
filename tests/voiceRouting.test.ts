import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { voiceRoutingPolicy, requestsHuman } from '../backend/voiceRoutingPolicy';

test('voice readiness fails closed and never exposes the authentication token', () => {
  assert.equal(voiceRoutingPolicy({}).ready, false);
  const env = { VOICE_AGENT_DESK_ENABLED: 'true', VOICE_PROVIDER_AUTH_TOKEN: 'test-only-secret', PUBLIC_BASE_URL: 'https://example.com/' };
  assert.equal(voiceRoutingPolicy(env).ready, true);
  for (const url of ['http://example.com', 'https://user:pass@example.com', 'https://example.com/path', 'invalid']) {
    assert.equal(voiceRoutingPolicy({ ...env, PUBLIC_BASE_URL: url }).ready, false);
  }
  assert.doesNotMatch(JSON.stringify(voiceRoutingPolicy(env)), /test-only-secret/);
});

test('voice transfer accepts only unique international phone numbers and explicit human requests', () => {
  assert.deepEqual(voiceRoutingPolicy({ VOICE_HUMAN_NUMBERS: '+50680000000, bad, +50680000000, 123, +50680000001' }).numbers, ['+50680000000', '+50680000001']);
  for (const speech of ['Quiero un operador', 'una persona por favor', 'a human please']) assert.equal(requestsHuman(speech), true);
  assert.equal(requestsHuman('', '0'), true);
  assert.equal(requestsHuman('playa para cuatro'), false);
  for (const speech of ['one person for the forest tour', 'solo una persona', 'somos dos personas']) assert.equal(requestsHuman(speech), false);
  assert.equal(requestsHuman('I want to speak to a person'), true);
  assert.equal(requestsHuman('quiero hablar con una persona'), true);
});

test('every voice callback is signature guarded before routes and status errors request retry', () => {
  const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const guard = server.indexOf("app.use(['/api/voice/incoming', '/api/voice/respond', '/api/voice/human-transfer', '/api/voice/status']");
  assert.ok(guard > 0);
  const guardBody = server.slice(guard, server.indexOf("app.get('/api/voice/config'", guard));
  assert.match(guardBody, /verifyVoiceSignature/);
  assert.match(guardBody, /status\(403\)/);
  for (const route of ['incoming', 'respond', 'human-transfer', 'status']) assert.ok(server.indexOf(`app.post('/api/voice/${route}'`) > guard);
  assert.match(server, /Unable to persist call status/);
});
