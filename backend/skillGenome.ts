/**
 * STEP 10 — Skill Genome / Capability Versions.
 *
 * A versioned capability layer for agents. Unlike a static prompt list, each
 * skill carries scope, prerequisites, risk class, evidence requirements and
 * compatibility metadata. Selection is deterministic; execution remains gated.
 */
import crypto from 'crypto';
import { autonomyPolicy, AutonomyLevel } from './autonomyPolicy';

export type SkillRisk = 'read' | 'reversible' | 'sensitive' | 'irreversible';

export type SkillVersion = {
  id: string;
  version: string;
  name: string;
  mission: string;
  agents: string[];
  risk: SkillRisk;
  requiresEvidence: boolean;
  prerequisites: string[];
  tools: string[];
  guardrails: string[];
  createdAt: string;
};

const SKILLS: SkillVersion[] = [
  {
    id: 'counter-orchestration',
    version: '3.0.0',
    name: 'Counter Orchestration',
    mission: 'Resolver, verificar disponibilidad y coordinar handoffs sin inventar operaciones.',
    agents: ['counter_agent', 'concierge', 'triage'],
    risk: 'reversible',
    requiresEvidence: true,
    prerequisites: ['knowledge_fabric', 'booking_availability'],
    tools: ['/api/counter/ask', '/api/tours/:id/availability'],
    guardrails: ['No confirmar cupo sin fuente operativa.', 'No cobrar desde conversación.'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'provider-diplomacy',
    version: '2.1.0',
    name: 'Provider Diplomacy',
    mission: 'Coordinar proveedor, cliente y operaciones conservando trazabilidad de cambios.',
    agents: ['provider_liaison', 'operations', 'supervisor'],
    risk: 'sensitive',
    requiresEvidence: true,
    prerequisites: ['agent_mesh', 'booking_state_machine'],
    tools: ['provider_communication', 'agent_mesh'],
    guardrails: ['No alterar una reserva sin autorización.', 'Conservar versión anterior del dato.'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'recovery-pilot',
    version: '1.4.0',
    name: 'Recovery Pilot',
    mission: 'Detectar desviaciones y preparar rutas de recuperación antes de escalar a humano.',
    agents: ['operations', 'supervisor'],
    risk: 'sensitive',
    requiresEvidence: true,
    prerequisites: ['event_bus', 'autonomy_policy', 'weather'],
    tools: ['alerts', 'weather', 'agent_mesh'],
    guardrails: ['No emitir reembolsos automáticamente.', 'Escalar eventos críticos.'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'learning-curator',
    version: '1.0.0',
    name: 'Learning Curator',
    mission: 'Convertir resultados y correcciones humanas en ejemplos evaluables y privados.',
    agents: ['learning', 'supervisor'],
    risk: 'read',
    requiresEvidence: true,
    prerequisites: ['learning_events', 'evaluation_harness'],
    tools: ['learning_engine', 'evaluation'],
    guardrails: ['Eliminar PII antes de dataset.', 'Nunca modificar código automáticamente.'],
    createdAt: new Date().toISOString()
  }
];

export function listSkillVersions() {
  return SKILLS.map(x => ({ ...x, fingerprint: crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 12) }));
}

export function selectSkills(agentId: string, task: string, autonomyLevel: AutonomyLevel = 1) {
  const tokens = task.toLowerCase().split(/[^a-z0-9áéíóúñ]+/).filter(Boolean);
  return listSkillVersions()
    .filter(skill => skill.agents.includes(agentId))
    .map(skill => {
      const matchCount = tokens.filter(t => skill.name.toLowerCase().includes(t) || skill.mission.toLowerCase().includes(t)).length;
      const allowed = autonomyPolicy(autonomyLevel, skill.risk === 'irreversible' ? 'delete' : skill.risk === 'sensitive' ? 'change_booking' : skill.risk === 'reversible' ? 'reserve' : 'observe').allowed;
      return { ...skill, matchScore: matchCount, autonomyAllowed: allowed };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
