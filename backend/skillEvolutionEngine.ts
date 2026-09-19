/**
 * Skill Evolution Engine — contextual, evidence-driven routing.
 * Uses deterministic contextual-bandit style selection with bounded canary exposure.
 * No unsafe action or autonomous code/policy mutation is permitted.
 */
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { listSkillVersions, getSkillVersion, recordSkillEvaluation, type GovernedSkillVersion, type SkillRisk } from './skillGenome';

export type SkillSelection = GovernedSkillVersion & { routingScore: number; routingReason: string; exposure: 'stable' | 'canary' };
const CANARY_PERCENT = Math.max(0, Math.min(25, Number(process.env.SKILL_CANARY_PERCENT || 10)));

function stableBucket(input: string): number {
  const digest = crypto.createHash('sha256').update(input).digest('hex').slice(0, 8);
  return parseInt(digest, 16) % 100;
}
function tokenize(value: string): string[] { return value.toLowerCase().split(/[^a-z0-9áéíóúñ]+/).filter(x => x.length > 2); }
function semanticOverlap(task: string, skill: GovernedSkillVersion): number {
  const q = new Set(tokenize(task));
  const text = tokenize(skill.name + ' ' + skill.mission + ' ' + skill.tools.join(' '));
  if (!q.size) return 0;
  return text.filter(token => q.has(token)).length / q.size;
}
function safetyWeight(skill: GovernedSkillVersion): number {
  return skill.evidence.safety * 0.45 + skill.evidence.groundedness * 0.25 + skill.evidence.quality * 0.20 + Math.min(1, skill.evidence.evaluations / 20) * 0.10;
}
function riskPenalty(risk: SkillRisk): number { return risk === 'irreversible' ? 1 : risk === 'sensitive' ? 0.35 : risk === 'reversible' ? 0.1 : 0; }

export function selectEvolvedSkill(agentId: string, task: string, sessionId = ''): SkillSelection | null {
  const skills = listSkillVersions().filter(skill => skill.agents.includes(agentId)).filter(skill => skill.lifecycle === 'active' || skill.lifecycle === 'canary');
  if (!skills.length) return null;
  const bucket = stableBucket(agentId + '|' + sessionId + '|' + task);
  const canaryEligible = bucket < CANARY_PERCENT;
  const candidates = skills.filter(skill => skill.lifecycle === 'active' || canaryEligible);
  const ranked = candidates.map(skill => {
    const overlap = semanticOverlap(task, skill);
    const evidence = safetyWeight(skill);
    const lifecycleBoost = skill.lifecycle === 'active' ? 0.12 : 0;
    const score = overlap * 0.5 + evidence + lifecycleBoost - riskPenalty(skill.risk);
    return { skill, score, exposure: skill.lifecycle === 'canary' ? 'canary' as const : 'stable' as const };
  }).sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  if (!winner) return null;
  return { ...winner.skill, routingScore: Number(winner.score.toFixed(4)), routingReason: 'context_overlap=' + semanticOverlap(task, winner.skill).toFixed(3) + ' evidence=' + safetyWeight(winner.skill).toFixed(3) + ' lifecycle=' + winner.skill.lifecycle, exposure: winner.exposure };
}

export async function recordSkillOutcome(input: { id: string; version: string; outcome: 'success' | 'partial' | 'failure' | 'human_corrected'; groundedness: number; safety: number; quality: number }) {
  const skill = getSkillVersion(input.id, input.version);
  if (!skill) throw new Error('Skill no encontrada');
  await recordSkillEvaluation(input.id, input.version, { groundedness: input.groundedness, safety: input.safety, quality: input.quality, criticalFailure: input.outcome === 'failure' && input.safety < 0.5 });
  return { success: true, skill: getSkillVersion(input.id, input.version), outcome: input.outcome };
}

export async function proposeSkillUpgrade(input: { id: string; version: string; observedFailure?: string; desiredOutcome?: string }) {
  const current = getSkillVersion(input.id, input.version);
  if (!current) throw new Error('Skill no encontrada');
  if (!process.env.GEMINI_API_KEY) return { success: false, reason: 'GEMINI_API_KEY no configurada', proposal: null };
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = ['Actúa como arquitecto de skills para un sistema de agentes turísticos.', 'Propón una evolución segura de una skill existente.', 'No generes código. No cambies políticas de seguridad. No inventes herramientas.', 'Devuelve JSON con: version, mission, prerequisites, tools, guardrails, rationale.', 'La nueva versión debe ser semver válida y mantener compatibilidad conceptual.', JSON.stringify({ current, observedFailure: input.observedFailure || '', desiredOutcome: input.desiredOutcome || '' })].join('\\n');
  const response = await ai.models.generateContent({ model: process.env.SKILL_EVOLUTION_MODEL || 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', temperature: 0.1 } });
  const raw = response.text || '{}';
  let proposal: any;
  try { proposal = JSON.parse(raw); } catch { return { success: false, reason: 'Respuesta del modelo no fue JSON válido', proposal: null }; }
  return { success: true, proposal: { id: current.id, version: String(proposal.version || ''), mission: String(proposal.mission || current.mission).slice(0, 500), prerequisites: Array.isArray(proposal.prerequisites) ? proposal.prerequisites.slice(0, 20) : current.prerequisites, tools: Array.isArray(proposal.tools) ? proposal.tools.slice(0, 20) : current.tools, guardrails: Array.isArray(proposal.guardrails) ? proposal.guardrails.slice(0, 20) : current.guardrails, rationale: String(proposal.rationale || '').slice(0, 1500) }, requiresHumanApproval: true };
}

export function buildSkillEvolutionReport() {
  const skills = listSkillVersions();
  const byLifecycle = skills.reduce<Record<string, number>>((acc, skill) => { acc[skill.lifecycle] = (acc[skill.lifecycle] || 0) + 1; return acc; }, {});
  return { generatedAt: new Date().toISOString(), canaryPercent: CANARY_PERCENT, byLifecycle, skills: skills.map(skill => ({ id: skill.id, version: skill.version, lifecycle: skill.lifecycle, evidence: skill.evidence, fingerprint: skill.fingerprint })) };
}