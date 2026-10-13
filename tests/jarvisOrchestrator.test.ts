import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decomposeJarvisOrder,
  JARVIS_MAX_RETRIES,
} from '../backend/jarvisOrchestrator';
import { buildAgentRegistrySeed } from '../backend/agentRegistryService';

test('JARVIS decomposes multi-domain owner orders without inventing execution', () => {
  const tasks = decomposeJarvisOrder(
    'Revisa disponibilidad de reservas, estado del proveedor y clima para mañana.',
    'es',
  );
  assert.ok(tasks.some((task) => task.preferredAgentId === 'booking' && task.actionClass === 'observe'));
  assert.ok(tasks.some((task) => task.preferredAgentId === 'provider_liaison' && task.actionClass === 'observe'));
  assert.ok(tasks.some((task) => task.preferredAgentId === 'operations' && task.actionClass === 'observe'));
});

test('JARVIS marks money and outbound communications as explicit approval actions', () => {
  const tasks = decomposeJarvisOrder(
    'Procesa un reembolso y envía una campaña por WhatsApp a los clientes.',
    'es',
  );
  assert.ok(tasks.some((task) => task.approvalAction === 'refund'));
  assert.ok(tasks.some((task) => task.approvalAction === 'mass_message'));
  assert.ok(tasks.filter((task) => task.approvalAction).every((task) => task.actionClass !== 'observe'));
});

test('JARVIS fallback reuses supervisor routing and remains observation-only', () => {
  const tasks = decomposeJarvisOrder('Investiga este asunto administrativo ambiguo.', 'es');
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].actionClass, 'observe');
  assert.ok(tasks[0].preferredAgentId.length > 0);
});

test('JARVIS retries at most twice', () => {
  assert.equal(JARVIS_MAX_RETRIES, 2);
});

test('JARVIS is a real registered agent in the JARVIS room', () => {
  const seed = buildAgentRegistrySeed(new Date('2026-10-12T18:00:00.000Z'));
  const jarvis = seed.find((agent) => agent.id === 'jarvis');
  assert.ok(jarvis);
  assert.equal(jarvis.office, 'jarvis_room');
  assert.equal(jarvis.autonomyLevel, 0);
  assert.equal(jarvis.status, 'no_signal');
});
