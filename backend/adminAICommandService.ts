import crypto from 'crypto';
import { getFirestoreDb } from './bookingService';

type CommandStatus = 'pending_approval' | 'approved' | 'rejected';
type AdminAICommand = {
  id: string; prompt: string; mode: string;
  actor: { email?: string | null; role?: string | null };
  status: CommandStatus; createdAt: string; updatedAt: string;
  approval?: { email?: string | null; role?: string | null; at: string };
  rejection?: { email?: string | null; role?: string | null; at: string; reason: string };
};
const COLLECTION = 'admin_ai_commands';

function sanitize(params: { prompt: string; mode: string; actor: any }): AdminAICommand {
  const prompt = String(params.prompt || '').trim().slice(0, 8000);
  const mode = String(params.mode || 'review').trim().slice(0, 80);
  if (!prompt) throw new Error('El comando IA no puede estar vacío.');
  if (!params.actor || params.actor.role !== 'admin') throw new Error('Se requiere identidad administrativa.');
  const now = new Date().toISOString();
  return { id: `cmd_${crypto.randomUUID()}`, prompt, mode,
    actor: { email: params.actor.email || null, role: params.actor.role || null },
    status: 'pending_approval', createdAt: now, updatedAt: now };
}
export async function listAdminAICommands(limit = 40) {
  const db = getFirestoreDb(); if (!db) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 40, 1), 100);
  const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').limit(safeLimit).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
export async function runAdminAICommand(params: { prompt: string; mode: string; actor: any }) {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible: no se puede registrar el comando administrativo.');
  const command = sanitize(params);
  await db.collection(COLLECTION).doc(command.id).set(command);
  return { success: true, commandId: command.id, status: command.status,
    response: 'Comando registrado para revisión. Ningún cambio irreversible se ejecutó automáticamente.',
    timestamp: command.createdAt };
}
async function resolveCommand(commandId: string, actor: any, resolution: 'approved' | 'rejected', reason?: string) {
  const db = getFirestoreDb(); if (!db) throw new Error('Firestore no disponible.');
  if (!actor || actor.role !== 'admin') throw new Error('Se requiere identidad administrativa.');
  const id = String(commandId || '').trim().slice(0, 160);
  if (!id) throw new Error('commandId es obligatorio.');
  const ref = db.collection(COLLECTION).doc(id), now = new Date().toISOString();
  return db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    if (!snap.exists) return { success: false, commandId: id, status: 'not_found' };
    const current = snap.data() || {};
    if (current.status !== 'pending_approval') return { success: false, commandId: id, status: current.status || 'unknown' };
    const patch: Record<string, unknown> = { status: resolution, updatedAt: now };
    if (resolution === 'approved') patch.approval = { email: actor.email || null, role: actor.role, at: now };
    else patch.rejection = { email: actor.email || null, role: actor.role, at: now, reason: String(reason || 'Sin motivo').slice(0, 1000) };
    transaction.update(ref, patch);
    return { success: true, commandId: id, status: resolution };
  });
}
export async function approveAdminAICommand(commandId: string, actor: any) { return resolveCommand(commandId, actor, 'approved'); }
export async function rejectAdminAICommand(commandId: string, actor: any, reason: string) { return resolveCommand(commandId, actor, 'rejected', reason); }
