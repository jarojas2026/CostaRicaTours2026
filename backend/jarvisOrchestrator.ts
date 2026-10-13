import crypto from 'crypto';
import { autonomyPolicy, type ActionClass } from './autonomyPolicy';
import { runAdminAICommand } from './adminAICommandService';
import { getFirestoreDb } from './bookingService';
import {
  assertAgentExecutionAuthorized,
  getAgentExecutionAuthorization,
} from './agentGovernanceService';
import { listRegisteredAgents } from './agentRegistryService';
import {
  createAgentRun,
  getAgentRun,
} from './agentRunLedgerService';
import { sendAgentMessage } from './agentMeshService';
import {
  getOwnerApproval,
  requestOwnerApproval,
} from './ownerApprovalService';
import type { AgentRecord } from '../shared/agentOfficeTypes';
import type {
  JarvisCommandResponse,
  JarvisDelegation,
  JarvisPlanRecord,
  JarvisTaskStatus,
} from '../shared/jarvisTypes';
import type {
  GovernanceActor,
  OwnerApprovalAction,
} from '../shared/ownerApprovalTypes';

const COLLECTION = 'jarvis_plans';
const MAX_RETRIES = 2;

type TaskRule = {
  id: string;
  match: RegExp;
  preferredAgentId: string;
  actionClass: ActionClass;
  approvalAction: OwnerApprovalAction | null;
  objectiveEs: string;
  objectiveEn: string;
};

const TASK_RULES: readonly TaskRule[] = [
  {
    id: 'refund',
    match: /\b(reembolso|refund|devoluci[oó]n)\b/i,
    preferredAgentId: 'payments_support',
    actionClass: 'refund',
    approvalAction: 'refund',
    objectiveEs: 'Revisar la solicitud de reembolso y preparar evidencia para decisión del owner.',
    objectiveEn: 'Review the refund request and prepare evidence for the owner decision.',
  },
  {
    id: 'payout',
    match: /\b(payout|liquidaci[oó]n|pago\s+a\s+proveedor|provider\s+payout)\b/i,
    preferredAgentId: 'payments_support',
    actionClass: 'payout',
    approvalAction: 'payout',
    objectiveEs: 'Revisar la liquidación a proveedor sin ejecutar desembolsos.',
    objectiveEn: 'Review the provider payout without executing a disbursement.',
  },
  {
    id: 'payment',
    match: /\b(pago|payment|cobro|stripe|paypal|sinpe)\b/i,
    preferredAgentId: 'payments_support',
    actionClass: 'payment',
    approvalAction: 'payment',
    objectiveEs: 'Revisar el estado y evidencia del pago; cualquier movimiento de dinero requiere aprobación.',
    objectiveEn: 'Review payment state and evidence; any money movement requires approval.',
  },
  {
    id: 'mass-message',
    match: /\b(enviar|manda|send|broadcast|campaña|campaign)\b[\s\S]{0,80}\b(whatsapp|correo|email|clientes|customers|mensaje|message)\b/i,
    preferredAgentId: 'conversion_advisor',
    actionClass: 'mass_message',
    approvalAction: 'mass_message',
    objectiveEs: 'Preparar la comunicación solicitada sin enviarla hasta recibir aprobación explícita.',
    objectiveEn: 'Prepare the requested communication without sending it until explicit approval.',
  },
  {
    id: 'customer-message',
    match: /\b(responder|contestar|notificar|reply|notify)\b[\s\S]{0,80}\b(cliente|customer|viajero|traveler)\b/i,
    preferredAgentId: 'concierge',
    actionClass: 'customer_message',
    approvalAction: 'customer_message',
    objectiveEs: 'Preparar una respuesta al viajero sin enviarla hasta recibir aprobación explícita.',
    objectiveEn: 'Prepare a traveler response without sending it until explicit approval.',
  },
  {
    id: 'price-change',
    match: /\b(cambiar|subir|bajar|modificar|change|raise|lower|update)\b[\s\S]{0,60}\b(precio|tarifa|price|rate)\b/i,
    preferredAgentId: 'booking',
    actionClass: 'price_change',
    approvalAction: 'price_change',
    objectiveEs: 'Analizar el cambio de precio solicitado y preparar el cambio para aprobación.',
    objectiveEn: 'Analyze the requested price change and prepare it for approval.',
  },
  {
    id: 'publication',
    match: /\b(publicar|publica|publish|postear|post)\b/i,
    preferredAgentId: 'conversion_advisor',
    actionClass: 'publication',
    approvalAction: 'publication',
    objectiveEs: 'Preparar la publicación solicitada sin publicarla hasta recibir aprobación.',
    objectiveEn: 'Prepare the requested publication without publishing until approval.',
  },
  {
    id: 'itinerary',
    match: /\b(itinerario|itinerary|ruta\s+de\s+viaje|trip\s+plan)\b/i,
    preferredAgentId: 'itinerary_planner',
    actionClass: 'prepare',
    approvalAction: null,
    objectiveEs: 'Preparar un itinerario verificable reutilizando catálogo, memoria y servicios existentes.',
    objectiveEn: 'Prepare a verifiable itinerary using the existing catalog, memory and services.',
  },
  {
    id: 'availability',
    match: /\b(disponibilidad|cupo|availability|space|slot|reserva|booking)\b/i,
    preferredAgentId: 'booking',
    actionClass: 'observe',
    approvalAction: null,
    objectiveEs: 'Verificar el estado de reserva o disponibilidad usando la fuente de verdad existente.',
    objectiveEn: 'Verify booking or availability state using the existing source of truth.',
  },
  {
    id: 'provider',
    match: /\b(proveedor|operador|provider|operator|gu[ií]a|guide|pickup)\b/i,
    preferredAgentId: 'provider_liaison',
    actionClass: 'observe',
    approvalAction: null,
    objectiveEs: 'Revisar el estado del proveedor u operación sin inventar confirmaciones.',
    objectiveEn: 'Review provider or operational state without inventing confirmations.',
  },
  {
    id: 'operations',
    match: /\b(clima|weather|vuelo|flight|retraso|delay|emergencia|emergency|carretera|road)\b/i,
    preferredAgentId: 'operations',
    actionClass: 'observe',
    approvalAction: null,
    objectiveEs: 'Revisar el riesgo operativo con datos observables y fuentes existentes.',
    objectiveEn: 'Review operational risk using observable data and existing sources.',
  },
  {
    id: 'safety',
    match: /\b(seguridad|salud|safety|health|movilidad|mobility)\b/i,
    preferredAgentId: 'safety_health',
    actionClass: 'recommend',
    approvalAction: null,
    objectiveEs: 'Preparar orientación prudente de seguridad o salud sin diagnóstico.',
    objectiveEn: 'Prepare prudent safety or health guidance without diagnosis.',
  },
  {
    id: 'translation',
    match: /\b(traduc|translate|idioma|language|ingl[eé]s|english|franc[eé]s|french|alem[aá]n|german)\b/i,
    preferredAgentId: 'multilingual_support',
    actionClass: 'recommend',
    approvalAction: null,
    objectiveEs: 'Preparar la adaptación multilingüe conservando hechos, precios y nombres propios.',
    objectiveEn: 'Prepare the multilingual adaptation while preserving facts, prices and proper names.',
  },
  {
    id: 'sales',
    match: /\b(venta|sales|conversi[oó]n|conversion|prospecto|lead|comparar|compare)\b/i,
    preferredAgentId: 'conversion_advisor',
    actionClass: 'recommend',
    approvalAction: null,
    objectiveEs: 'Analizar la oportunidad comercial y recomendar el siguiente paso verificable.',
    objectiveEn: 'Analyze the commercial opportunity and recommend the next verifiable step.',
  },
  {
    id: 'quality',
    match: /\b(audita|auditar|verifica|verify|calidad|quality|error|fallo|failure)\b/i,
    preferredAgentId: 'supervisor',
    actionClass: 'observe',
    approvalAction: null,
    objectiveEs: 'Auditar evidencia, contradicciones y riesgos sin ejecutar cambios irreversibles.',
    objectiveEn: 'Audit evidence, contradictions and risks without irreversible changes.',
  },
];

function assertOwner(actor: GovernanceActor): void {
  if (!actor || actor.role !== 'owner') throw new Error('JARVIS solo acepta órdenes del owner.');
}

function cleanOrder(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) throw new Error('La orden para JARVIS no puede estar vacía.');
  return text.slice(0, 8000);
}

function safeLanguage(value: unknown): 'es' | 'en' {
  return value === 'en' ? 'en' : 'es';
}

export function decomposeJarvisOrder(
  ownerOrder: string,
  language: 'es' | 'en' = 'es',
): Array<{
  objective: string;
  preferredAgentId: string;
  actionClass: ActionClass;
  approvalAction: OwnerApprovalAction | null;
  ruleId: string;
}> {
  const order = cleanOrder(ownerOrder);
  const matches = TASK_RULES.filter((rule) => rule.match.test(order));
  const selected = matches.length ? matches : [{
    id: 'triage',
    match: /.*/,
    preferredAgentId: 'triage',
    actionClass: 'observe' as ActionClass,
    approvalAction: null,
    objectiveEs: 'Clasificar la orden, reunir evidencia y proponer el siguiente paso sin efectos comerciales.',
    objectiveEn: 'Classify the order, gather evidence and propose the next step without commercial side effects.',
  }];

  const seen = new Set<string>();
  return selected
    .filter((rule) => {
      const key = `${rule.preferredAgentId}:${rule.actionClass}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8)
    .map((rule) => ({
      objective: `${language === 'en' ? rule.objectiveEn : rule.objectiveEs} Contexto del owner: ${order}`,
      preferredAgentId: rule.preferredAgentId,
      actionClass: rule.actionClass,
      approvalAction: rule.approvalAction,
      ruleId: rule.id,
    }));
}

function agentAvailableForAssignment(agent: AgentRecord | undefined): boolean {
  if (!agent) return false;
  if (agent.currentTask) return false;
  return agent.status === 'idle' || agent.status === 'no_signal';
}

function chooseAgent(
  preferredAgentId: string,
  registry: AgentRecord[],
): { agent: AgentRecord | null; reason: string } {
  const preferred = registry.find((agent) => agent.id === preferredAgentId);
  if (agentAvailableForAssignment(preferred)) {
    return {
      agent: preferred || null,
      reason: preferred?.status === 'idle'
        ? 'Agente especializado libre con estado idle verificado.'
        : 'Agente especializado sin tarea registrada; la telemetría comenzará cuando un worker recoja la tarea.',
    };
  }

  const triage = registry.find((agent) => agent.id === 'triage');
  if (preferredAgentId !== 'triage' && agentAvailableForAssignment(triage)) {
    return {
      agent: triage || null,
      reason: 'El especialista no está disponible; triage queda como fallback seguro.',
    };
  }

  return {
    agent: null,
    reason: 'No hay un agente asignable con gobernanza válida y sin tarea registrada.',
  };
}

async function queueRun(input: {
  planId: string;
  delegation: JarvisDelegation;
  actor: GovernanceActor;
  approvalId?: string | null;
}): Promise<{ runId: string; assignedAgentId: string }> {
  const agentId = input.delegation.assignedAgentId;
  if (!agentId) throw new Error('La delegación no tiene agente asignado.');

  await assertAgentExecutionAuthorized(agentId);
  const run = await createAgentRun({
    requestedBy: {
      kind: 'owner',
      id: input.actor.uid || input.actor.email || 'owner',
      email: input.actor.email || null,
    },
    objective: input.delegation.objective,
    agentId,
  });

  await sendAgentMessage({
    conversationId: input.planId,
    fromAgent: 'jarvis',
    toAgent: agentId,
    audience: 'internal',
    type: 'request',
    subject: 'jarvis.task.queued',
    payload: {
      planId: input.planId,
      taskId: input.delegation.id,
      runId: run.id,
      objective: input.delegation.objective,
      actionClass: input.delegation.actionClass,
      approvalId: input.approvalId || null,
      retryCount: input.delegation.retryCount,
    },
  });

  return { runId: run.id, assignedAgentId: agentId };
}

function computePlanStatus(delegations: JarvisDelegation[]): JarvisPlanRecord['status'] {
  if (delegations.length > 0 && delegations.every((task) => task.status === 'completed')) return 'completed';
  if (delegations.some((task) => task.status === 'escalated' || task.status === 'blocked_autonomy')) return 'needs_owner';
  if (delegations.some((task) => task.status === 'waiting_approval')) return 'waiting_approval';
  if (delegations.some((task) => ['queued', 'running'].includes(task.status))) return 'in_progress';
  return 'planned';
}

function executiveSummary(
  delegations: JarvisDelegation[],
  language: 'es' | 'en',
): string {
  const counts = {
    queued: delegations.filter((task) => task.status === 'queued').length,
    running: delegations.filter((task) => task.status === 'running').length,
    completed: delegations.filter((task) => task.status === 'completed').length,
    waiting: delegations.filter((task) => task.status === 'waiting_approval').length,
    blocked: delegations.filter((task) => task.status === 'blocked_autonomy').length,
    escalated: delegations.filter((task) => task.status === 'escalated').length,
  };
  return language === 'en'
    ? `JARVIS: ${counts.completed} completed, ${counts.running} running, ${counts.queued} queued, ${counts.waiting} awaiting owner approval, ${counts.blocked} blocked by autonomy and ${counts.escalated} escalated.`
    : `JARVIS: ${counts.completed} completadas, ${counts.running} en ejecución, ${counts.queued} en cola, ${counts.waiting} esperando aprobación del owner, ${counts.blocked} bloqueadas por autonomía y ${counts.escalated} escaladas.`;
}

export async function runJarvisOwnerCommand(input: {
  ownerOrder: string;
  language?: 'es' | 'en';
  actor: GovernanceActor;
}): Promise<JarvisCommandResponse> {
  assertOwner(input.actor);
  const ownerOrder = cleanOrder(input.ownerOrder);
  const language = safeLanguage(input.language);
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible: JARVIS no puede crear un plan auditable.');

  const command = await runAdminAICommand({
    prompt: ownerOrder,
    mode: 'jarvis',
    actor: input.actor,
  });
  if (command.status !== 'approved') {
    throw new Error('La orden del owner no quedó autorizada para planificación.');
  }

  const registry = await listRegisteredAgents();
  const planId = `jarvis_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const tasks = decomposeJarvisOrder(ownerOrder, language);
  const delegations: JarvisDelegation[] = [];
  const approvalRequired: JarvisPlanRecord['approvalRequired'] = [];

  for (const task of tasks) {
    const assignment = chooseAgent(task.preferredAgentId, registry);
    const delegation: JarvisDelegation = {
      id: `task_${crypto.randomUUID()}`,
      objective: task.objective,
      actionClass: task.actionClass,
      preferredAgentId: task.preferredAgentId,
      assignedAgentId: assignment.agent?.id || null,
      assignmentReason: assignment.reason,
      status: 'queued',
      runId: null,
      retryCount: 0,
      approvalAction: task.approvalAction,
      approvalId: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    };

    if (!assignment.agent) {
      delegation.status = 'escalated';
      delegation.lastError = 'no_assignable_agent';
      delegations.push(delegation);
      continue;
    }

    const authorization = await getAgentExecutionAuthorization(assignment.agent.id);
    if (!authorization.allowed) {
      delegation.status = 'escalated';
      delegation.lastError = authorization.reason;
      delegations.push(delegation);
      continue;
    }

    if (task.approvalAction) {
      const approval = await requestOwnerApproval({
        action: task.approvalAction,
        summary: task.objective,
        resourceRef: `jarvis:${planId}:${delegation.id}`,
        requestedBy: input.actor,
        metadata: {
          planId,
          taskId: delegation.id,
          agentId: assignment.agent.id,
          actionClass: task.actionClass,
        },
      });
      delegation.status = 'waiting_approval';
      delegation.approvalId = approval.id;
      approvalRequired.push({
        taskId: delegation.id,
        action: task.approvalAction,
        approvalId: approval.id,
        summary: task.objective,
      });
      delegations.push(delegation);
      continue;
    }

    const policy = autonomyPolicy(assignment.agent.autonomyLevel, task.actionClass);
    if (!policy.allowed) {
      delegation.status = 'blocked_autonomy';
      delegation.lastError = `autonomy_level_${assignment.agent.autonomyLevel}_does_not_allow_${task.actionClass}`;
      delegations.push(delegation);
      continue;
    }

    const queued = await queueRun({
      planId,
      delegation,
      actor: input.actor,
    });
    delegation.runId = queued.runId;
    delegation.status = 'queued';
    delegations.push(delegation);
  }

  const plan: JarvisPlanRecord = {
    id: planId,
    commandId: command.commandId,
    requestedBy: {
      uid: input.actor.uid || null,
      email: input.actor.email || null,
      role: 'owner',
    },
    ownerOrder,
    language,
    understood: language === 'en'
      ? `I understood the owner order and decomposed it into ${delegations.length} governed task(s).`
      : `Entendí la orden del owner y la dividí en ${delegations.length} tarea(s) gobernadas.`,
    plan: delegations.map((task) => task.objective),
    delegations,
    approvalRequired,
    status: computePlanStatus(delegations),
    executiveSummary: executiveSummary(delegations, language),
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await db.collection(COLLECTION).doc(plan.id).create(plan);

  return {
    understood: plan.understood,
    plan: plan.plan,
    whoDoesIt: delegations.map((task) => ({
      taskId: task.id,
      agentId: task.assignedAgentId,
      status: task.status,
      runId: task.runId,
      reason: task.assignmentReason,
    })),
    approvalRequired,
    executiveSummary: plan.executiveSummary,
    planId: plan.id,
    commandId: plan.commandId,
  };
}

async function retryFailedTask(input: {
  plan: JarvisPlanRecord;
  task: JarvisDelegation;
}): Promise<JarvisDelegation> {
  if (!input.task.assignedAgentId) {
    return { ...input.task, status: 'escalated', lastError: 'missing_assigned_agent' };
  }

  if (input.task.retryCount >= MAX_RETRIES) {
    await sendAgentMessage({
      conversationId: input.plan.id,
      fromAgent: 'jarvis',
      toAgent: 'supervisor',
      audience: 'internal',
      type: 'alert',
      subject: 'jarvis.retry_limit_reached',
      payload: {
        planId: input.plan.id,
        taskId: input.task.id,
        agentId: input.task.assignedAgentId,
        retryCount: input.task.retryCount,
      },
    });
    return {
      ...input.task,
      status: 'escalated',
      lastError: 'retry_limit_reached',
      updatedAt: new Date().toISOString(),
    };
  }

  const authorization = await getAgentExecutionAuthorization(input.task.assignedAgentId);
  if (!authorization.allowed) {
    return {
      ...input.task,
      status: 'escalated',
      lastError: authorization.reason,
      updatedAt: new Date().toISOString(),
    };
  }

  if (input.task.approvalId) {
    const approval = await getOwnerApproval(input.task.approvalId);
    if (!approval || approval.status !== 'approved') {
      return {
        ...input.task,
        status: approval?.status === 'rejected' || approval?.status === 'consumed' ? 'escalated' : 'waiting_approval',
        lastError: approval ? `approval_${approval.status}` : 'approval_missing',
        updatedAt: new Date().toISOString(),
      };
    }
  } else {
    const policy = autonomyPolicy(authorization.autonomyLevel || 0, input.task.actionClass);
    if (!policy.allowed) {
      return {
        ...input.task,
        status: 'blocked_autonomy',
        lastError: `autonomy_level_${authorization.autonomyLevel || 0}_does_not_allow_${input.task.actionClass}`,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  const actor: GovernanceActor = {
    uid: null,
    email: input.plan.commandId,
    role: 'owner',
  };
  const nextTask = {
    ...input.task,
    retryCount: input.task.retryCount + 1,
    runId: null,
    status: 'queued' as JarvisTaskStatus,
    updatedAt: new Date().toISOString(),
  };
  const queued = await queueRun({
    planId: input.plan.id,
    delegation: nextTask,
    actor,
    approvalId: nextTask.approvalId,
  });
  return { ...nextTask, runId: queued.runId };
}

export async function reconcileJarvisPlan(planId: string): Promise<JarvisPlanRecord> {
  const id = String(planId || '').trim();
  if (!id) throw new Error('planId es obligatorio.');
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible.');

  const ref = db.collection(COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('Plan JARVIS no encontrado.');
  const plan = snapshot.data() as JarvisPlanRecord;
  const updated: JarvisDelegation[] = [];

  for (const task of plan.delegations) {
    if (task.status === 'completed' || task.status === 'escalated') {
      updated.push(task);
      continue;
    }

    if (task.status === 'waiting_approval' && task.approvalId) {
      const approval = await getOwnerApproval(task.approvalId);
      if (!approval) {
        updated.push({ ...task, status: 'escalated', lastError: 'approval_missing', updatedAt: new Date().toISOString() });
        continue;
      }
      if (approval.status === 'rejected') {
        updated.push({ ...task, status: 'escalated', lastError: 'approval_rejected', updatedAt: new Date().toISOString() });
        continue;
      }
      if (approval.status === 'approved' && task.assignedAgentId) {
        const queued = await queueRun({
          planId: plan.id,
          delegation: task,
          actor: planOwnerActor(plan),
          approvalId: approval.id,
        });
        updated.push({ ...task, status: 'queued', runId: queued.runId, updatedAt: new Date().toISOString() });
        continue;
      }
      updated.push(task);
      continue;
    }

    if (task.status === 'blocked_autonomy' && task.assignedAgentId) {
      const auth = await getAgentExecutionAuthorization(task.assignedAgentId);
      if (auth.allowed && autonomyPolicy(auth.autonomyLevel || 0, task.actionClass).allowed) {
        const queued = await queueRun({
          planId: plan.id,
          delegation: task,
          actor: planOwnerActor(plan),
        });
        updated.push({ ...task, status: 'queued', runId: queued.runId, lastError: null, updatedAt: new Date().toISOString() });
      } else {
        updated.push(task);
      }
      continue;
    }

    if (!task.runId) {
      updated.push(task);
      continue;
    }

    const run = await getAgentRun(task.runId);
    if (!run) {
      updated.push({ ...task, status: 'escalated', lastError: 'run_missing', updatedAt: new Date().toISOString() });
      continue;
    }

    if (run.status === 'completed') {
      updated.push({ ...task, status: 'completed', lastError: null, updatedAt: new Date().toISOString() });
    } else if (run.status === 'failed') {
      updated.push(await retryFailedTask({ plan, task: { ...task, status: 'failed', lastError: run.error?.code || 'run_failed' } }));
    } else if (run.status === 'revoked' || run.status === 'cancelled') {
      updated.push({ ...task, status: 'escalated', lastError: `run_${run.status}`, updatedAt: new Date().toISOString() });
    } else if (run.status === 'running') {
      updated.push({ ...task, status: 'running', updatedAt: new Date().toISOString() });
    } else if (run.status === 'waiting_approval') {
      updated.push({ ...task, status: 'waiting_approval', updatedAt: new Date().toISOString() });
    } else {
      updated.push(task);
    }
  }

  const next: JarvisPlanRecord = {
    ...plan,
    delegations: updated,
    approvalRequired: plan.approvalRequired.filter((item) => {
      const task = updated.find((candidate) => candidate.id === item.taskId);
      return task?.status === 'waiting_approval';
    }),
    status: computePlanStatus(updated),
    executiveSummary: executiveSummary(updated, plan.language),
    updatedAt: new Date().toISOString(),
  };
  await ref.set(next, { merge: true });
  return next;
}

function planOwnerActor(plan: JarvisPlanRecord): GovernanceActor {
  return {
    uid: plan.requestedBy.uid || null,
    email: plan.requestedBy.email || null,
    role: 'owner',
  };
}

export async function runJarvisSupervisionSweep(limit = 25): Promise<{
  scanned: number;
  reconciled: number;
  failures: Array<{ planId: string; error: string }>;
}> {
  const db = getFirestoreDb();
  if (!db) return { scanned: 0, reconciled: 0, failures: [{ planId: 'system', error: 'firestore_unavailable' }] };
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 25, 1), 50);
  const snapshot = await db.collection(COLLECTION).orderBy('updatedAt', 'desc').limit(safeLimit * 2).get();
  const candidates = snapshot.docs
    .map((document) => document.data() as JarvisPlanRecord)
    .filter((plan) => plan.status !== 'completed')
    .slice(0, safeLimit);

  let reconciled = 0;
  const failures: Array<{ planId: string; error: string }> = [];
  for (const plan of candidates) {
    try {
      await reconcileJarvisPlan(plan.id);
      reconciled += 1;
    } catch (error: any) {
      failures.push({ planId: plan.id, error: String(error?.message || 'unknown').slice(0, 500) });
    }
  }
  return { scanned: candidates.length, reconciled, failures };
}

export async function getJarvisPlan(planId: string): Promise<JarvisPlanRecord | null> {
  const id = String(planId || '').trim();
  if (!id) return null;
  const db = getFirestoreDb();
  if (!db) return null;
  const snapshot = await db.collection(COLLECTION).doc(id).get();
  return snapshot.exists ? snapshot.data() as JarvisPlanRecord : null;
}

export async function listJarvisPlans(limit = 40): Promise<JarvisPlanRecord[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 40, 1), 100);
  const snapshot = await db.collection(COLLECTION).orderBy('updatedAt', 'desc').limit(safeLimit).get();
  return snapshot.docs.map((document) => document.data() as JarvisPlanRecord);
}
