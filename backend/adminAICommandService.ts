/**
 * Durable administrative AI command proposals.
 *
 * Administrative AI requests are persisted as auditable proposals. Approval is
 * explicit and never implies direct code execution.
 */
import crypto from 'crypto';
import { getFirestoreDb } from './bookingService';

type CommandStatus = 'proposed' | 'approved' | 'rejected';

type AdminAICommand = {
  commandId: string;
  prompt: string;
  mode: string;
  status: CommandStatus;
  actor: {
    role?: string | null;
    email?: string | null;
    scope?: string | null;
  };
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
};

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function actorSnapshot(actor: any) {
  return {
    role: cleanText(actor?.role, 40) || null,
    email: cleanText(actor?.email, 256).toLowerCase() || null,
    scope: cleanText(actor?.scope, 80) || null
  };
}

function toPlainCommand(id: string, data: any): AdminAICommand {
  const toIso = (value: any) => {
    if (value?.toDate instanceof Function) return value.toDate().toISOString();
    const parsed = new Date(String(value || ''));
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  };

  return {
    commandId: id,
    prompt: cleanText(data?.prompt, 4000),
    mode: cleanText(data?.mode, 80) || 'analyze',
    status: (['proposed', 'approved', 'rejected'].includes(data?.status) ? data.status : 'proposed') as CommandStatus,
    actor: actorSnapshot(data?.actor),
    createdAt: toIso(data?.createdAt),
    updatedAt: toIso(data?.updatedAt),
    approvedAt: data?.approvedAt ? toIso(data.approvedAt) : undefined,
    rejectedAt: data?.rejectedAt ? toIso(data.rejectedAt) : undefined,
    rejectionReason: data?.rejectionReason ? cleanText(data.rejectionReason, 1200) : undefined
  };
}

export async function listAdminAICommands(limit = 40) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 40));
  const db = getFirestoreDb();
  if (!db) return [];

  const snapshot = await db.collection('admin_ai_commands')
    .orderBy('createdAt', 'desc')
    .limit(safeLimit)
    .get();

  return snapshot.docs.map(doc => toPlainCommand(doc.id, doc.data()));
}

export async function runAdminAICommand(params: { prompt: string; mode: string; actor: any }) {
  const prompt = cleanText(params.prompt, 4000);
  const mode = cleanText(params.mode, 80) || 'analyze';
  if (!prompt) throw new Error('El prompt administrativo no puede estar vacío.');

  const db = getFirestoreDb();
  if (!db) {
    return {
      success: false,
      status: 'unavailable',
      message: 'El historial administrativo requiere Firestore; no se registró ninguna acción.'
    };
  }

  const commandId = 'cmd_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const now = new Date().toISOString();
  const command = {
    commandId,
    prompt,
    mode,
    status: 'proposed' as const,
    actor: actorSnapshot(params.actor),
    createdAt: now,
    updatedAt: now
  };

  await db.collection('admin_ai_commands').doc(commandId).set(command);

  return {
    success: true,
    status: 'proposed',
    commandId,
    response: 'Propuesta registrada y pendiente de aprobación explícita. No se ejecutó ningún cambio todavía.',
    command
  };
}

async function updateCommandStatus(commandId: string, status: CommandStatus, actor: any, reason?: string) {
  const cleanId = cleanText(commandId, 120);
  if (!cleanId) throw new Error('commandId es obligatorio.');

  const db = getFirestoreDb();
  if (!db) throw new Error('El historial administrativo requiere Firestore.');

  const commandRef = db.collection('admin_ai_commands').doc(cleanId);
  const actorData = actorSnapshot(actor);
  if (status === 'approved' && actorData.role !== 'admin') {
    throw new Error('Solo un administrador puede aprobar una propuesta.');
  }

  const now = new Date().toISOString();
  const outcome = await db.runTransaction(async transaction => {
    const snap = await transaction.get(commandRef);
    if (!snap.exists) throw new Error('Comando administrativo no encontrado.');

    const current = toPlainCommand(snap.id, snap.data());
    if (current.status !== 'proposed') {
      return {
        success: false,
        status: current.status,
        commandId: cleanId,
        message: 'El comando ya fue resuelto y no puede cambiarse nuevamente.'
      };
    }

    const patch: any = {
      status,
      updatedAt: now
    };
    if (status === 'approved') {
      patch.approvedAt = now;
      patch.approvedBy = actorData;
    } else {
      patch.rejectedAt = now;
      patch.rejectedBy = actorData;
      patch.rejectionReason = cleanText(reason, 1200) || 'Sin motivo indicado.';
    }

    transaction.set(commandRef, patch, { merge: true });
    return null;
  });

  if (outcome) return outcome;
  return {
    success: true,
    status,
    commandId: cleanId,
    message: status === 'approved'
      ? 'Propuesta aprobada. La aprobación queda registrada; los cambios de código siguen requiriendo el flujo revisado del repositorio.'
      : 'Propuesta rechazada y registrada en el historial.'
  };
}

export async function approveAdminAICommand(commandId: string, actor: any) {
  return updateCommandStatus(commandId, 'approved', actor);
}

export async function rejectAdminAICommand(commandId: string, actor: any, reason: string) {
  return updateCommandStatus(commandId, 'rejected', actor, reason);
}
