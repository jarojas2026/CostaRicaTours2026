/**
 * Human admin platform controls.
 * Additive layer: stores operational policy parameters separately from code/env.
 * The existing services remain the source of truth for execution.
 */
import { getFirestoreDb } from './bookingService';

export type PlatformControlKey =
  | 'ai_autonomy_level'
  | 'max_agent_tool_rounds'
  | 'journey_adaptation_enabled'
  | 'live_availability_required'
  | 'weather_context_enabled'
  | 'human_handoff_enabled'
  | 'provider_auto_coordination'
  | 'sales_followup_enabled'
  | 'risk_escalation_enabled'
  | 'learning_reflection_enabled';

const DEFAULTS: Record<PlatformControlKey, string | number | boolean> = {
  ai_autonomy_level: 'supervised',
  max_agent_tool_rounds: 3,
  journey_adaptation_enabled: true,
  live_availability_required: true,
  weather_context_enabled: true,
  human_handoff_enabled: true,
  provider_auto_coordination: true,
  sales_followup_enabled: true,
  risk_escalation_enabled: true,
  learning_reflection_enabled: true
};

export async function getPlatformControls() {
  const db = getFirestoreDb();
  if (!db) return { values: DEFAULTS, source: 'defaults' };
  try {
    const snap = await db.collection('platform_control').doc('global').get();
    return { values: { ...DEFAULTS, ...(snap.exists ? snap.data() : {}) }, source: snap.exists ? 'firestore' : 'defaults' };
  } catch {
    return { values: DEFAULTS, source: 'defaults' };
  }
}

export async function updatePlatformControls(input: Record<string, unknown>) {
  const allowed = new Set(Object.keys(DEFAULTS));
  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (!allowed.has(key)) continue;
    const expected = DEFAULTS[key as PlatformControlKey];
    if (typeof expected === 'boolean' && typeof value === 'boolean') sanitized[key] = value;
    else if (typeof expected === 'number' && Number.isFinite(Number(value))) sanitized[key] = Math.max(1, Math.min(10, Number(value)));
    else if (typeof expected === 'string' && typeof value === 'string') sanitized[key] = value.slice(0, 40);
  }
  const db = getFirestoreDb();
  if (db && Object.keys(sanitized).length) {
    await db.collection('platform_control').doc('global').set({
      ...sanitized,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }
  return getPlatformControls();
}
