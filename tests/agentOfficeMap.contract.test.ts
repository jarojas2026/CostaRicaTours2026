import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildAgentRegistrySeed } from '../backend/agentRegistryService';
import { projectAgentOffice } from '../backend/agentOfficeProjection';
import { AGENT_OFFICE_IDS } from '../shared/agentOfficeTypes';
import { AgentOfficeMap } from '../src/components/AgentOfficeMap';
import { buildOfficeRooms, honestAgentStatus } from '../src/components/agentOfficeLayout';

const NOW = '2026-10-25T15:00:00.000Z';
const NEW_AGENTS = ['marketing_content', 'finance_analyst', 'compliance'] as const;

function seedSnapshot(telemetry = true) {
  const seed = buildAgentRegistrySeed(new Date(NOW));
  return projectAgentOffice(seed, [], NOW, telemetry);
}

test('el registro tiene 17 agentes: los 14 previos + 3 nuevos en autonomía 0 y sin herramientas', () => {
  const seed = buildAgentRegistrySeed(new Date(NOW));
  assert.equal(seed.length, 17);
  const byId = new Map(seed.map((agent) => [agent.id, agent]));
  for (const id of ['concierge', 'triage', 'booking', 'provider_liaison', 'operations', 'supervisor', 'learning', 'jarvis', 'itinerary_planner', 'conversion_advisor', 'multilingual_support', 'sustainability_guide', 'safety_health', 'payments_support']) {
    assert.ok(byId.has(id), `falta ${id}`);
  }
  assert.equal(byId.get('marketing_content')?.office, 'international_marketing');
  assert.equal(byId.get('finance_analyst')?.office, 'finance');
  assert.equal(byId.get('compliance')?.office, 'verification_quality');
  for (const id of NEW_AGENTS) {
    const agent = byId.get(id)!;
    assert.equal(agent.autonomyLevel, 0);
    assert.deepEqual(agent.allowedTools, []);
    assert.equal(agent.status, 'no_signal');
    assert.ok(agent.permissions.write.every((scope) => ['drafts', 'tasks'].includes(scope)), `${id} solo escribe borradores/tareas`);
    assert.ok(agent.version >= 4);
  }
});

test('la planta usa las 9 oficinas del registro y coloca a cada agente en su sala', () => {
  const snapshot = seedSnapshot();
  const rooms = buildOfficeRooms(snapshot.agents);
  assert.deepEqual(rooms.map((room) => room.id), [...AGENT_OFFICE_IDS]);
  const roomOf = (id: string) => rooms.find((room) => room.agents.some((agent) => agent.id === id))?.id;
  assert.equal(roomOf('jarvis'), 'jarvis_room');
  assert.equal(roomOf('payments_support'), 'payments');
  assert.equal(roomOf('marketing_content'), 'international_marketing');
  assert.equal(roomOf('finance_analyst'), 'finance');
  assert.equal(rooms.reduce((sum, room) => sum + room.agents.length, 0), snapshot.agents.length);
  assert.ok(rooms.every((room) => !room.vacant), 'con los 3 nuevos ya no quedan salas vacantes');
});

test('salas sin agente aparecen vacantes y agentes sin oficina válida van a una sala de revisión', () => {
  const rooms = buildOfficeRooms([
    { id: 'concierge', office: 'reception_sales', mission: 'x', signal: 'no_recent_signal', lastEventType: null, lastObservedAt: null },
    { id: 'ghost', office: 'payment', mission: 'x', signal: 'no_recent_signal', lastEventType: null, lastObservedAt: null },
  ]);
  assert.equal(rooms.filter((room) => room.vacant).length, 8);
  assert.equal(rooms.at(-1)?.id, 'unassigned');
  assert.deepEqual(rooms.at(-1)?.agents.map((agent) => agent.id), ['ghost']);
});

test('estado honesto: sin heartbeat fresco es "sin señal" aunque el registro diga working', () => {
  assert.equal(honestAgentStatus({ status: 'working', signal: 'no_recent_signal' }), 'no_signal');
  assert.equal(honestAgentStatus({ status: 'working', signal: 'telemetry_unavailable' }), 'no_signal');
  assert.equal(honestAgentStatus({ status: 'working', signal: 'recent_activity' }), 'working');
  assert.equal(honestAgentStatus({ status: 'paused', signal: 'no_recent_signal' }), 'paused');
  assert.equal(honestAgentStatus({ status: 'inventado', signal: 'recent_activity' }), 'no_signal');
});

test('AgentOfficeMap no usa departamentos hardcodeados ni el id inexistente "payment"', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/components/AgentOfficeMap.tsx'), 'utf8');
  assert.doesNotMatch(source, /const departments\s*=/);
  assert.doesNotMatch(source, /'payment'/);
  assert.doesNotMatch(source, /Otras especialidades/);
});

for (const language of ['es', 'en'] as const) {
  test('AgentOfficeMap renderiza las 9 salas y "sin señal" honesto en ' + language, () => {
    const html = renderToStaticMarkup(React.createElement(AgentOfficeMap, { language, snapshot: seedSnapshot() }));
    for (const office of AGENT_OFFICE_IDS) assert.ok(html.includes(`data-office="${office}"`), `falta sala ${office}`);
    assert.match(html, language === 'es' ? /Sin señal/ : /No signal/);
    assert.doesNotMatch(html, language === 'es' ? /Trabajando/ : />Working</);
    assert.match(html, language === 'es' ? /Analista financiero/ : /Finance Analyst/);
  });
}

test('sin datos no se dibujan agentes ficticios', () => {
  const html = renderToStaticMarkup(React.createElement(AgentOfficeMap, { language: 'es', snapshot: null }));
  assert.match(html, /No se generarán agentes ficticios/);
  assert.doesNotMatch(html, /data-office=/);
});
