/**
 * Graduated autonomy policy for the Tourism Commerce & Operations OS.
 * Existing numeric levels 0..3 remain backward compatible. Semantic stages
 * describe the larger operating model without granting new authority.
 */
export type AutonomyLevel = 0 | 1 | 2 | 3;
export type SemanticAutonomyStage =
  | 'L0_OBSERVE'
  | 'L1_RECOMMEND'
  | 'L2_PREPARE'
  | 'L3_EXECUTE_REVERSIBLE'
  | 'L4_EXECUTE_POLICY'
  | 'L5_HUMAN_REQUIRED';

export type ActionClass =
  | 'observe'
  | 'recommend'
  | 'notify'
  | 'prepare'
  | 'reserve'
  | 'change_booking'
  | 'payment'
  | 'refund'
  | 'payout'
  | 'legal_or_policy_change'
  | 'identity_merge'
  | 'delete';

const SAFE_BY_LEVEL: Record<AutonomyLevel, ActionClass[]> = {
  0: ['observe'],
  1: ['observe', 'recommend'],
  2: ['observe', 'recommend', 'notify', 'prepare', 'reserve'],
  3: ['observe', 'recommend', 'notify', 'prepare', 'reserve', 'change_booking']
};

const ALWAYS_HUMAN: ActionClass[] = ['payment', 'refund', 'payout', 'legal_or_policy_change', 'identity_merge', 'delete'];

export function canAutoExecute(level: AutonomyLevel, action: ActionClass): boolean {
  return SAFE_BY_LEVEL[level].includes(action) && !ALWAYS_HUMAN.includes(action);
}

export function requiresHumanApproval(level: AutonomyLevel, action: ActionClass): boolean {
  return !canAutoExecute(level, action);
}

export function semanticAutonomyStage(level: AutonomyLevel, action: ActionClass): SemanticAutonomyStage {
  if (ALWAYS_HUMAN.includes(action)) return 'L5_HUMAN_REQUIRED';
  if (level === 0) return 'L0_OBSERVE';
  if (level === 1) return 'L1_RECOMMEND';
  if (level === 2 && action === 'prepare') return 'L2_PREPARE';
  if (level === 2) return 'L3_EXECUTE_REVERSIBLE';
  return 'L4_EXECUTE_POLICY';
}

export function autonomyPolicy(level: AutonomyLevel, action: ActionClass) {
  return {
    level,
    semanticStage: semanticAutonomyStage(level, action),
    action,
    allowed: canAutoExecute(level, action),
    requiresHuman: requiresHumanApproval(level, action),
    irreversible: ALWAYS_HUMAN.includes(action),
    principle: 'identity → evidence → reason → policy → execute only when authorized → verify → audit'
  };
}

export function parseAutonomyLevel(raw: unknown): AutonomyLevel {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return 0;
}
