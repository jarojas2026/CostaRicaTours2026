/**
 * Step 7 — Graduated autonomy policy.
 * Agents can observe and recommend freely, while irreversible actions require
 * explicit authorization and a traceable reason.
 */
export type AutonomyLevel = 0 | 1 | 2 | 3;

export type ActionClass =
  | 'observe'
  | 'recommend'
  | 'notify'
  | 'reserve'
  | 'change_booking'
  | 'payment'
  | 'refund'
  | 'delete';

const SAFE_BY_LEVEL: Record<AutonomyLevel, ActionClass[]> = {
  0: ['observe'],
  1: ['observe', 'recommend'],
  2: ['observe', 'recommend', 'notify', 'reserve'],
  3: ['observe', 'recommend', 'notify', 'reserve', 'change_booking']
};

export function canAutoExecute(level: AutonomyLevel, action: ActionClass): boolean {
  return SAFE_BY_LEVEL[level].includes(action) && !['payment', 'refund', 'delete'].includes(action);
}

export function requiresHumanApproval(level: AutonomyLevel, action: ActionClass): boolean {
  return !canAutoExecute(level, action);
}

export function autonomyPolicy(level: AutonomyLevel, action: ActionClass) {
  return {
    level,
    action,
    allowed: canAutoExecute(level, action),
    requiresHuman: requiresHumanApproval(level, action),
    principle: 'read → reason → propose → execute only when authorized'
  };
}

export function parseAutonomyLevel(raw: unknown): AutonomyLevel {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return 0;
}
