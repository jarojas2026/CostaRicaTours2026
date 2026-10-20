import test from 'node:test';
import assert from 'node:assert/strict';
import { EXTRA_AGENT_KNOWLEDGE, EXTENSION_AGENT_IDENTITIES } from '../backend/agentSkillPack';

test('booking, provider and supervisor agents distinguish all commercial evidence gates', () => {
  const booking = EXTRA_AGENT_KNOWLEDGE.booking.join(' ');
  const provider = EXTRA_AGENT_KNOWLEDGE.provider_liaison.join(' ');
  const supervisor = EXTRA_AGENT_KNOWLEDGE.supervisor.join(' ');
  assert.match(booking, /oferta publicada, capacidad fechada y aceptación explícita/);
  assert.match(booking, /pago verificado y voucher/);
  assert.match(provider, /NO significa que el proveedor lo recibió o aceptó/);
  assert.match(provider, /nunca asumas un reparto 85\/15/);
  assert.match(supervisor, /aceptación del transporte/);
});

test('JARVIS knowledge retains owner approvals and real evidence of work', () => {
  const jarvis = EXTENSION_AGENT_IDENTITIES.find(x => x.id === 'jarvis');
  assert.ok(jarvis);
  const knowledge = jarvis.knowledge.join(' ');
  assert.match(knowledge, /owner conserva la última palabra/);
  assert.match(knowledge, /pago firmado y confirmación al cliente/);
  assert.match(knowledge, /queued no significa trabajo ejecutado/);
  assert.match(knowledge, /sin afirmar que se notificó a nadie/);
});

test('conversion knowledge prefers AI intake and escalates human WhatsApp appropriately', () => {
  const conversion = EXTENSION_AGENT_IDENTITIES.find(x => x.id === 'conversion_advisor');
  assert.ok(conversion);
  assert.match(conversion.knowledge.join(' '), /consulta IA y el expediente comercial/);
  assert.match(EXTRA_AGENT_KNOWLEDGE.concierge.join(' '), /triaje IA/);
});
