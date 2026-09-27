import crypto from 'crypto';
import { getFirestoreDb } from './bookingService';

export type PlatformControls = {
  maintenanceMode: boolean;
  allowBookings: boolean;
  defaultCommissionRate: number;
  supportedCurrencies: string[];
  maxAgentToolRounds: number;
  maxAutonomousActionsPerCycle: number;
  requireHumanApprovalForFinancialActions: boolean;
  requireHumanApprovalForPolicyChanges: boolean;
  updatedAt: string;
  updatedBy?: string;
  version: number;
};

const DEFAULT_CONTROLS: PlatformControls = {
  maintenanceMode: false,
  allowBookings: true,
  defaultCommissionRate: 0.20,
  supportedCurrencies: ['USD', 'CRC', 'EUR', 'GBP', 'CAD'],
  maxAgentToolRounds: 3,
  maxAutonomousActionsPerCycle: 5,
  requireHumanApprovalForFinancialActions: true,
  requireHumanApprovalForPolicyChanges: true,
  updatedAt: new Date(0).toISOString(),
  version: 1
};

const COLLECTION = 'platform_controls';
const DOCUMENT = 'current';

function normalize(input: any, previous: PlatformControls = DEFAULT_CONTROLS): PlatformControls {
  const commission = Number(input?.defaultCommissionRate ?? previous.defaultCommissionRate);
  const rounds = Number(input?.maxAgentToolRounds ?? previous.maxAgentToolRounds);
  const actions = Number(input?.maxAutonomousActionsPerCycle ?? previous.maxAutonomousActionsPerCycle);
  if (!Number.isFinite(commission) || commission < 0 || commission > 1) {
    throw new Error('defaultCommissionRate debe estar entre 0 y 1.');
  }
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 12) {
    throw new Error('maxAgentToolRounds debe ser un entero entre 1 y 12.');
  }
  if (!Number.isInteger(actions) || actions < 1 || actions > 50) {
    throw new Error('maxAutonomousActionsPerCycle debe ser un entero entre 1 y 50.');
  }

  return {
    ...previous,
    maintenanceMode: Boolean(input?.maintenanceMode ?? previous.maintenanceMode),
    allowBookings: Boolean(input?.allowBookings ?? previous.allowBookings),
    defaultCommissionRate: commission,
    supportedCurrencies: Array.isArray(input?.supportedCurrencies)
      ? Array.from(new Set(input.supportedCurrencies.map((x: any) => String(x).trim().toUpperCase()).filter(Boolean))).slice(0, 20)
      : previous.supportedCurrencies,
    maxAgentToolRounds: rounds,
    maxAutonomousActionsPerCycle: actions,
    requireHumanApprovalForFinancialActions: Boolean(
      input?.requireHumanApprovalForFinancialActions ?? previous.requireHumanApprovalForFinancialActions
    ),
    requireHumanApprovalForPolicyChanges: Boolean(
      input?.requireHumanApprovalForPolicyChanges ?? previous.requireHumanApprovalForPolicyChanges
    ),
    updatedAt: new Date().toISOString(),
    version: previous.version + 1
  };
}

export async function getPlatformControls(): Promise<PlatformControls> {
  const db = getFirestoreDb();
  if (!db) return { ...DEFAULT_CONTROLS, updatedAt: new Date().toISOString() };

  try {
    const snap = await db.collection(COLLECTION).doc(DOCUMENT).get();
    if (!snap.exists) {
      const initial = { ...DEFAULT_CONTROLS, updatedAt: new Date().toISOString() };
      await db.collection(COLLECTION).doc(DOCUMENT).create(initial);
      return initial;
    }
    return normalize(snap.data() || {}, { ...DEFAULT_CONTROLS, ...(snap.data() || {}) });
  } catch (error) {
    console.warn('No se pudieron leer los controles persistentes de plataforma:', error);
    return { ...DEFAULT_CONTROLS, updatedAt: new Date().toISOString() };
  }
}

export async function updatePlatformControls(controls: any, actor = 'system'): Promise<{ success: boolean; controls: PlatformControls; changeId: string }> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible: no se guardan cambios de control de plataforma.');

  const ref = db.collection(COLLECTION).doc(DOCUMENT);
  const changeId = `ctl_${crypto.randomUUID()}`;
  const currentSnap = await ref.get();
  const previous = currentSnap.exists
    ? normalize(currentSnap.data() || {}, { ...DEFAULT_CONTROLS, ...(currentSnap.data() || {}) })
    : DEFAULT_CONTROLS;
  const next = normalize(controls, previous);
  next.updatedBy = String(actor || 'system').slice(0, 160);

  await ref.set(next, { merge: false });
  await db.collection(COLLECTION).doc(changeId).set({
    id: changeId,
    type: 'control_change',
    previous,
    next,
    actor: next.updatedBy,
    createdAt: next.updatedAt
  });

  return { success: true, controls: next, changeId };
}
