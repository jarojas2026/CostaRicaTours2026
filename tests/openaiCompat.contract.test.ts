import test from 'node:test';
import assert from 'node:assert/strict';
import { isOpenAiCompatConfigured, getOpenAiCompatConfig, providerOrder } from '../backend/aiConfig';
import { toOpenAiTools } from '../backend/openaiCompatClient';
import { selectCompatTools, buildCompatSystemPrompt, COMPAT_READ_ONLY_TOOLS } from '../backend/compatConcierge';
import { GEMINI_FUNCTION_DECLARATIONS, AGENT_TOOL_REGISTRY } from '../backend/agentTools';
import { classifyAiFailure } from '../backend/aiHealth';

const KEY = 'gsk_test_key_never_real_0000000000';

test('Groq se considera configurado solo con URL https y clave', () => {
  assert.equal(isOpenAiCompatConfigured({}), false);
  assert.equal(isOpenAiCompatConfigured({ OPENAI_COMPAT_BASE_URL: 'http://api.groq.com/openai/v1', OPENAI_COMPAT_API_KEY: KEY }), false);
  assert.equal(isOpenAiCompatConfigured({ OPENAI_COMPAT_BASE_URL: 'https://api.groq.com/openai/v1', OPENAI_COMPAT_API_KEY: KEY }), true);
});

test('config por defecto: gpt-oss-120b, reasoning low, tokens acotados', () => {
  const c = getOpenAiCompatConfig({ OPENAI_COMPAT_BASE_URL: 'https://api.groq.com/openai/v1/' });
  assert.equal(c.model, 'openai/gpt-oss-120b');
  assert.equal(c.reasoningEffort, 'low');
  assert.equal(c.baseUrl, 'https://api.groq.com/openai/v1');
  assert.equal(getOpenAiCompatConfig({ OPENAI_COMPAT_MAX_TOKENS: '99999' }).maxTokens, 4000);
});

test('providerOrder incluye openai_compat solo si está configurado', () => {
  assert.deepEqual(providerOrder({}), []);
  assert.deepEqual(providerOrder({ OPENAI_COMPAT_BASE_URL: 'https://api.groq.com/openai/v1', OPENAI_COMPAT_API_KEY: KEY }), ['openai_compat']);
  assert.deepEqual(providerOrder({ OPENAI_COMPAT_BASE_URL: 'https://api.groq.com/openai/v1', OPENAI_COMPAT_API_KEY: KEY, AI_BILLABLE_PROVIDERS: 'openai_compat' }), []);
});

test('el concierge Groq solo expone herramientas de lectura', () => {
  const selected = selectCompatTools(GEMINI_FUNCTION_DECLARATIONS as any, AGENT_TOOL_REGISTRY as any);
  assert.ok(selected.length > 0);
  for (const d of selected) {
    assert.ok((COMPAT_READ_ONLY_TOOLS as readonly string[]).includes(d.name));
    assert.notEqual((AGENT_TOOL_REGISTRY as any)[d.name].sideEffect, true);
  }
  assert.ok(!selected.some(d => d.name === 'create_reservation'));
  const tools = toOpenAiTools(selected as any);
  assert.equal(tools[0].type, 'function');
  assert.equal(tools[0].function.parameters.type, 'object');
  assert.doesNotMatch(JSON.stringify(tools), /"type":"[A-Z]+"/);
});

test('el prompt protege la identidad del proveedor y prohíbe inventar', () => {
  const p = buildCompatSystemPrompt(false);
  assert.match(p, /Never reveal operator/);
  assert.match(p, /Never invent/);
  assert.match(p, /ALWAYS call search_operator_tours/);
  assert.match(p, /responde en español/i);
});

test('429 de Groq se clasifica como cuota (breaker de 5 min)', () => {
  assert.equal(classifyAiFailure(Object.assign(new Error('openai_compat_http_429:rate_limit_exceeded'), { status: 429 })), 'quota');
});
