import test from 'node:test';
import assert from 'node:assert/strict';
import { getAiHealth, recordAiObservation, classifyAiFailure } from '../backend/aiHealth';
import { geminiOptions } from '../backend/geminiRuntime';
import { readFileSync } from 'node:fs';

test('configuration is not proof of a functioning model; observations expire', () => {
  const env = { GEMINI_API_KEY: 'test-key-never-a-real-key' };
  const now = Date.now();
  assert.equal(getAiHealth(env, now).status, 'unknown');
  recordAiObservation('gemini', null, now);
  assert.equal(getAiHealth(env, now).status, 'available');
  assert.equal(getAiHealth(env, now + 300_001).status, 'unknown');
  recordAiObservation('gemini', 'quota', now);
  assert.equal(getAiHealth(env, now).status, 'degraded');
  assert.equal(getAiHealth({}, now).status, 'degraded');
  assert.doesNotMatch(JSON.stringify(getAiHealth(env, now)), /test-key/);
});

test('provider errors are classified without exposing error messages', () => {
  for (const [status, expected] of [[401, 'authentication'], [403, 'permission'], [429, 'quota'], [404, 'model_unavailable'], [504, 'timeout'], [500, 'provider_error']] as const) {
    assert.equal(classifyAiFailure({ status, message: 'private payload' }), expected);
  }
});

test('Vertex requires explicit configuration and never falls through to an API key', () => {
  assert.equal(geminiOptions({}), null);
  assert.equal(geminiOptions({ GEMINI_API_KEY: 'AQ.invalid-session-token' }), null);
  assert.equal(geminiOptions({ GOOGLE_GENAI_USE_VERTEXAI: 'true', GEMINI_API_KEY: 'test-key-never-a-real-key' }), null);
  const options = geminiOptions({ GOOGLE_GENAI_USE_VERTEXAI: 'true', GOOGLE_CLOUD_PROJECT: 'test', GOOGLE_CLOUD_LOCATION: 'global' });
  assert.equal(options?.vertexai, true);
  assert.equal(options?.apiKey, undefined);
});

test('health is passive and concierge retains national function calling and safe fallback', () => {
  const health = readFileSync('backend/routes/misc.ts', 'utf8');
  assert.match(health, /healthRouter.get\('\/api\/health\/ai'/);
  const service = readFileSync('backend/aiAssistantService.ts', 'utf8');
  assert.match(service, /functionDeclarations: GEMINI_FUNCTION_DECLARATIONS/);
  assert.match(service, /executeAgentTool\(toolName/);
  assert.match(service, /model: getConciergeModel\(\)/);
  const fallback = service.slice(service.indexOf('function getKnowledgeBaseReply'), service.indexOf('export async function processChatInquiry'));
  assert.match(fallback, /knowledgeToolReply/);
  assert.doesNotMatch(fallback, /Confirmación inmediata|\$145|24 horas/);
});
