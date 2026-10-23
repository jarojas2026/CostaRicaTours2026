import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aiCapacityRouterEnabled } from '../backend/aiRouter';
import { capacitySlots } from '../backend/aiCapacityRouter';

test('AI_CAPACITY_ROUTER_ENABLED está apagado por defecto y solo "true" lo enciende', () => {
  assert.equal(aiCapacityRouterEnabled({}), false);
  assert.equal(aiCapacityRouterEnabled({ AI_CAPACITY_ROUTER_ENABLED: '' }), false);
  assert.equal(aiCapacityRouterEnabled({ AI_CAPACITY_ROUTER_ENABLED: 'false' }), false);
  assert.equal(aiCapacityRouterEnabled({ AI_CAPACITY_ROUTER_ENABLED: '1' }), false);
  assert.equal(aiCapacityRouterEnabled({ AI_CAPACITY_ROUTER_ENABLED: 'TRUE' }), true);
});

test('aiRouter: la rama openai_compat pasa por el selector y por defecto llama a openAiCompatChat como antes', () => {
  const src = readFileSync('backend/aiRouter.ts', 'utf8');
  assert.match(src, /callProvider\('openai_compat', input\.task, signal => openAiCompatChatForRouter\(/);
  assert.match(src, /aiCapacityRouterEnabled\(\) \? capacityChat\(params as any\) : openAiCompatChat\(params\)/);
  // El breaker de aiRouter sigue envolviendo la llamada.
  assert.equal((src.match(/callProvider\('openai_compat'/g) || []).length, 1);
});

test('slot de pago nunca entra sin AI_PAID_SLOT_ENABLED=true y presupuesto > 0 (flags OFF)', () => {
  const key = 'x'.repeat(24);
  const slots = capacitySlots({
    AI_PAID_SLOT_BASE_URL: 'https://paid.example/v1', AI_PAID_SLOT_API_KEY: key, AI_PAID_SLOT_MODEL: 'm',
  });
  assert.ok(!slots.some(s => s.name === 'paid'));
});
