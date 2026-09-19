/**
 * Skill Genome — evolución gobernada de capacidades.
 *
 * Las habilidades son versionadas, observables y reversibles. El sistema puede
 * registrar nuevas versiones y hacer canary/promotion/rollback, pero nunca
 * modifica código, prompts críticos ni políticas de seguridad por sí solo.
 */
import crypto from 'crypto';
import { autonomyPolicy } from './autonomyPolicy';
import type { AutonomyLevel } from './autonomyPolicy';

export type SkillRisk = 'read' | 'reversible' | 'sensitive' | 'irreversible';
export type SkillLifecycle = 'candidate' | 'canary' | 'active' | 'retired';

export type SkillEvidence = {
  evaluations: number;
  groundedness: number;
  safety: number;
  quality: number;
  criticalFailures: number;
  lastEvaluatedAt?: string;
};

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
  parentVersion?: string;
};

export type GovernedSkillVersion = SkillVersion & {
  lifecycle: SkillLifecycle;
  evidence: SkillEvidence;
  fingerprint: string;
};

const SKILL_CREATED_AT = '2026-09-19T00:00:00.000Z';
const DEFAULT_EVIDENCE: SkillEvidence = {
  evaluations: 0,
  groundedness: 0,
  safety: 0,
  quality: 0,
  criticalFailures: 0
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
    createdAt: SKILL_CREATED_AT
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
    createdAt: SKILL_CREATED_AT
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
    createdAt: SKILL_CREATED_AT
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
    createdAt: SKILL_CREATED_AT
  },
  {
    id: 'counter-intent-graph',
    version: '1.0.0',
    name: 'Counter Intent Graph',
    mission: 'Detectar intención, entidades, restricciones y dependencias antes de seleccionar una acción.',
    agents: ['counter_agent', 'triage', 'concierge'],
    risk: 'read',
    requiresEvidence: true,
    prerequisites: ['knowledge_fabric', 'evaluation_harness'],
    tools: ['agent_tools', 'memory', 'evaluation'],
    guardrails: ['No ejecutar acciones de escritura.', 'Pedir aclaración cuando la intención sea ambigua.'],
    createdAt: SKILL_CREATED_AT
  },
  {
    id: 'weather-recovery-synthesis',
    version: '1.0.0',
    name: 'Weather Recovery Synthesis',
    mission: 'Cruzar clima, reserva, región y capacidad para proponer alternativas operativas verificables.',
    agents: ['operations', 'supervisor', 'counter_agent'],
    risk: 'sensitive',
    requiresEvidence: true,
    prerequisites: ['weather', 'booking_state_machine', 'event_bus'],
    tools: ['weather', 'availability', 'agent_mesh'],
    guardrails: ['Proponer; no cancelar ni reembolsar automáticamente.', 'Toda alternativa debe citar una fuente operativa.'],
    createdAt: SKILL_CREATED_AT
  }
];

const runtimeSkills = new Map<string, SkillVersion>(SKILLS.map(skill => [skillKey(skill.id, skill.version), skill]));
const lifecycleState = new Map<string, SkillLifecycle>(SKILLS.map(skill => [skillKey(skill.id, skill.version), 'active']));
const evidenceState = new Map<string, SkillEvidence>();

function skillKey(id: string, version: string): string {
  return id + '@' + version;
}

function fingerprint(skill: SkillVersion): string {
  return crypto.createHash('sha256').update(JSON.stringify(skill)).digest('hex').slice(0, 16);
}

function normalizeEvidence(value: any): SkillEvidence {
  return {
    evaluations: Math.max(0, Number(value?.evaluations) || 0),
    groundedness: Math.max(0, Math.min(1, Number(value?.groundedness) || 0)),
    safety: Math.max(0, Math.min(1, Number(value?.safety) || 0)),
    quality: Math.max(0, Math.min(1, Number(value?.quality) || 0)),
    criticalFailures: Math.max(0, Number(value?.criticalFailures) || 0),
    lastEvaluatedAt: value?.lastEvaluatedAt
  };
}

function semverOk(version: string): boolean {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version);
}

function promotionGate(skill: GovernedSkillVersion, target: 'canary' | 'active') {
  const e = skill.evidence;
  const requirements = target === 'canary'
    ? { evaluations: 3, groundedness: 0.8, safety: 0.95, quality: 0.7 }
    : { evaluations: 10, groundedness: 0.9, safety: 0.98, quality: 0.8 };
  const reasons: string[] = [];
  if (skill.lifecycle === 'retired') reasons.push('skill_retired');
  if (e.evaluations < requirements.evaluations) reasons.push('insufficient_evaluations');
  if (e.groundedness < requirements.groundedness) reasons.push('groundedness_below_gate');
  if (e.safety < requirements.safety) reasons.push('safety_below_gate');
  if (e.quality < requirements.quality) reasons.push('quality_below_gate');
  if (e.criticalFailures > 0) reasons.push('critical_failures_present');
  return { allowed: reasons.length === 0, reasons };
}

export async function hydrateSkillGenome(): Promise<void> {
  try {
    const { getFirestoreDb } = await import('./bookingService');
    const db = getFirestoreDb();
    if (!db) return;
    const snap = await db.collection('skill_genome_versions').get();
    snap.forEach(doc => {
      const data = doc.data() || {};
      const skill = data.skill as SkillVersion | undefined;
      if (!skill?.id || !skill.version) return;
      const key = skillKey(skill.id, skill.version);
      runtimeSkills.set(key, skill);
      lifecycleState.set(key, (data.lifecycle || 'candidate') as SkillLifecycle);
      evidenceState.set(key, normalizeEvidence(data.evidence));
    });
  } catch (error) {
    console.warn('Skill Genome hydration skipped:', error);
  }
}

export function listSkillVersions(): GovernedSkillVersion[] {
  return Array.from(runtimeSkills.values()).map(skill => {
    const key = skillKey(skill.id, skill.version);
    return {
      ...skill,
      lifecycle: lifecycleState.get(key) || 'candidate',
      evidence: evidenceState.get(key) || { ...DEFAULT_EVIDENCE },
      fingerprint: fingerprint(skill)
    };
  }).sort((a, b) => a.id.localeCompare(b.id) || a.version.localeCompare(b.version));
}

export function getSkillVersion(id: string, version: string): GovernedSkillVersion | undefined {
  return listSkillVersions().find(skill => skill.id === id && skill.version === version);
}

export async function registerSkillVersion(input: SkillVersion): Promise<GovernedSkillVersion> {
  if (!input.id || !semverOk(input.version)) throw new Error('Skill id/version inválidos');
  if (!input.agents?.length || !input.mission) throw new Error('Una skill requiere agentes y misión');
  const key = skillKey(input.id, input.version);
  if (runtimeSkills.has(key)) throw new Error('La versión de skill ya existe');
  runtimeSkills.set(key, input);
  lifecycleState.set(key, 'candidate');
  evidenceState.set(key, { ...DEFAULT_EVIDENCE });
  await persistSkill(key);
  return getSkillVersion(input.id, input.version)!;
}

export async function recordSkillEvaluation(
  id: string,
  version: string,
  metrics: { groundedness: number; safety: number; quality: number; criticalFailure?: boolean }
) {
  const key = skillKey(id, version);
  if (!runtimeSkills.has(key)) throw new Error('Skill no encontrada');
  const previous = evidenceState.get(key) || { ...DEFAULT_EVIDENCE };
  const n = previous.evaluations + 1;
  const evidence: SkillEvidence = {
    evaluations: n,
    groundedness: ((previous.groundedness * previous.evaluations) + Number(metrics.groundedness || 0)) / n,
    safety: ((previous.safety * previous.evaluations) + Number(metrics.safety || 0)) / n,
    quality: ((previous.quality * previous.evaluations) + Number(metrics.quality || 0)) / n,
    criticalFailures: previous.criticalFailures + (metrics.criticalFailure ? 1 : 0),
    lastEvaluatedAt: new Date().toISOString()
  };
  evidenceState.set(key, normalizeEvidence(evidence));
  await persistSkill(key);
  return getSkillVersion(id, version)!;
}

export async function promoteSkillVersion(id: string, version: string, target: 'canary' | 'active' = 'active') {
  const skill = getSkillVersion(id, version);
  if (!skill) throw new Error('Skill no encontrada');
  const gate = promotionGate(skill, target);
  if (!gate.allowed) return { success: false, skill, gate };
  lifecycleState.set(skillKey(id, version), target);
  await persistSkill(skillKey(id, version));
  return { success: true, skill: getSkillVersion(id, version), gate };
}

export async function rollbackSkillVersion(id: string, version: string, reason = 'manual_rollback') {
  const skill = getSkillVersion(id, version);
  if (!skill) throw new Error('Skill no encontrada');
  lifecycleState.set(skillKey(id, version), 'retired');
  await persistSkill(skillKey(id, version), { rollbackReason: String(reason).slice(0, 500) });
  return { success: true, skill: getSkillVersion(id, version), reason };
}

async function persistSkill(key: string, extra: Record<string, any> = {}) {
  try {
    const { getFirestoreDb } = await import('./bookingService');
    const db = getFirestoreDb();
    const skill = runtimeSkills.get(key);
    if (!db || !skill) return;
    await db.collection('skill_genome_versions').doc(key.replace(/[^A-Za-z0-9_-]/g, '_')).set({
      skill,
      lifecycle: lifecycleState.get(key) || 'candidate',
      evidence: evidenceState.get(key) || { ...DEFAULT_EVIDENCE },
      fingerprint: fingerprint(skill),
      updatedAt: new Date().toISOString(),
      ...extra
    }, { merge: true });
  } catch (error) {
    console.warn('Skill Genome persistence skipped:', error);
  }
}

export function selectSkills(agentId: string, task: string, autonomyLevel: AutonomyLevel = 1) {
  const tokens = task.toLowerCase().split(/[^a-z0-9áéíóúñ]+/).filter(Boolean);
  return listSkillVersions()
    .filter(skill => skill.lifecycle === 'active' || skill.lifecycle === 'canary')
    .filter(skill => skill.agents.includes(agentId))
    .map(skill => {
      const matchCount = tokens.filter(t => skill.name.toLowerCase().includes(t) || skill.mission.toLowerCase().includes(t)).length;
      const allowed = autonomyPolicy(
        autonomyLevel,
        skill.risk === 'irreversible' ? 'delete' :
        skill.risk === 'sensitive' ? 'change_booking' :
        skill.risk === 'reversible' ? 'reserve' : 'observe'
      ).allowed;
      return { ...skill, matchScore: matchCount, autonomyAllowed: allowed };
    })
    .sort((a, b) => (b.matchScore - a.matchScore) || (b.evidence.safety - a.evidence.safety));
}
