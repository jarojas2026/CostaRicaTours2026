/**
 * Private AI command lifecycle for the owner/admin control center.
 *
 * Lifecycle:
 * analyze/propose/simulate -> persisted proposal -> explicit human approval ->
 * optional safe platform-control execution -> audit record.
 *
 * The model never receives credentials and never gets a direct mutation tool.
 * Code proposals remain proposal-only; source changes must go through reviewed
 * Git branches/PRs rather than direct writes to main.
 */
import { GoogleGenAI } from '@google/genai';
import { getFirestoreDb } from './bookingService';
import { getAdminControlCenterSnapshot } from './adminControlCenterService';
import { getPlatformControls, updatePlatformControls } from './platformControlService';

const ALLOWED_MODES = new Set(['analyze', 'propose', 'simulate', 'code']);
const MAX_PROMPT_LENGTH = 6000;

function cleanPrompt(value: unknown) {
  return String(value || '').trim().slice(0, MAX_PROMPT_LENGTH);
}

function db() {
  return getFirestoreDb();
}

async function persist(command: Record<string, unknown>) {
  const firestore = db();
  const id = String(command.id);
  if (firestore) {
    await firestore.collection('admin_ai_commands').doc(id).set(command, { merge: true });
  }
  return command;
}

function makeId() {
  return `aicmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function runAdminAICommand(input: {
  prompt: string;
  mode?: string;
  actor?: { email?: string; role?: string };
}) {
  const prompt = cleanPrompt(input.prompt);
  const mode = ALLOWED_MODES.has(String(input.mode)) ? String(input.mode) : 'analyze';
  if (!prompt) throw new Error('La solicitud de IA no puede estar vacía.');

  const snapshot = await getAdminControlCenterSnapshot();
  const controls = await getPlatformControls();
  const context = JSON.stringify({
    generatedAt: snapshot.generatedAt,
    business: snapshot.business,
    financial: snapshot.financial?.kpis,
    conversion: snapshot.conversion,
    alerts: snapshot.alerts,
    providers: snapshot.providers,
    agents: snapshot.agents,
    automation: snapshot.automation?.engine,
    evolution: snapshot.evolution,
    controls: controls.values
  }).slice(0, 45000);

  const commandId = makeId();
  const base = {
    id: commandId,
    status: 'proposal',
    mode,
    prompt,
    actorEmail: input.actor?.email || null,
    actorRole: input.actor?.role || null,
    createdAt: new Date().toISOString(),
    approvalRequired: true
  };

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return persist({
      ...base,
      status: 'blocked',
      analysis: 'No hay proveedor de IA configurado en el servidor.',
      proposal: {
        summary: 'Configurar el proveedor de IA antes de ejecutar el análisis.',
        impact: 'bloqueado',
        risk: 'bajo',
        files: [],
        tests: [],
        suggestedControlChanges: {}
      }
    });
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: process.env.ADMIN_AI_MODEL || 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [{
        text: [
          'Eres el copiloto ejecutivo privado de una empresa de turismo de Costa Rica.',
          'Trabajas dentro de un centro administrativo autenticado.',
          'No ejecutes cambios. No inventes datos. Distingue HECHOS, INFERENCIAS y PROPUESTAS.',
          'Entrega JSON válido con exactamente estas claves:',
          'summary, facts, inferences, recommendations, impact, risk, files, tests, suggestedControlChanges, approvalRequired.',
          'suggestedControlChanges solo puede contener claves de los controles entregados en el contexto y valores compatibles con ellos.',
          'Si el modo es code, describe archivos, cambios y pruebas; NO despliegues ni escribas archivos.',
          `MODO: ${mode}`,
          `CONTEXTO: ${context}`,
          `SOLICITUD: ${prompt}`
        ].join('\n')
      }]
    }]
  });

  const raw = response.text || '';
  let proposal: any;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    proposal = match ? JSON.parse(match[0]) : { summary: raw };
  } catch {
    proposal = { summary: raw };
  }

  return persist({
    ...base,
    analysis: raw,
    proposal,
    status: 'pending_approval'
  });
}

export async function listAdminAICommands(limit = 25) {
  const firestore = db();
  if (!firestore) return [];
  const snap = await firestore.collection('admin_ai_commands').orderBy('createdAt', 'desc').limit(Math.min(Math.max(limit, 1), 100)).get();
  return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

export async function approveAdminAICommand(id: string, actor: { email?: string; role?: string }) {
  const firestore = db();
  if (!firestore) throw new Error('Firestore no está disponible.');
  const ref = firestore.collection('admin_ai_commands').doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Propuesta no encontrada.');
  const command: any = snap.data();
  if (command.status !== 'pending_approval') throw new Error('La propuesta no está pendiente de aprobación.');

  const changes = command.proposal?.suggestedControlChanges;
  let execution: any = { executed: false, reason: 'La aprobación no contenía cambios de parámetros seguros.' };
  if (changes && typeof changes === 'object' && Object.keys(changes).length) {
    const updated = await updatePlatformControls(changes);
    execution = {
      executed: true,
      type: 'platform_controls',
      changedKeys: Object.keys(changes),
      values: updated.values
    };
  }

  const result = {
    ...command,
    status: 'approved_executed',
    approvedAt: new Date().toISOString(),
    approvedBy: actor.email || null,
    execution
  };
  await ref.set(result, { merge: true });
  await firestore.collection('admin_audit_log').add({
    type: 'ai_command_approved',
    commandId: id,
    actorEmail: actor.email || null,
    actorRole: actor.role || null,
    createdAt: new Date().toISOString(),
    execution
  });
  return result;
}

export async function rejectAdminAICommand(id: string, actor: { email?: string; role?: string }, reason = '') {
  const firestore = db();
  if (!firestore) throw new Error('Firestore no está disponible.');
  const ref = firestore.collection('admin_ai_commands').doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Propuesta no encontrada.');
  const result = {
    ...snap.data(),
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectedBy: actor.email || null,
    rejectionReason: String(reason).slice(0, 1000)
  };
  await ref.set(result, { merge: true });
  await firestore.collection('admin_audit_log').add({
    type: 'ai_command_rejected',
    commandId: id,
    actorEmail: actor.email || null,
    actorRole: actor.role || null,
    reason: result.rejectionReason,
    createdAt: new Date().toISOString()
  });
  return result;
}
