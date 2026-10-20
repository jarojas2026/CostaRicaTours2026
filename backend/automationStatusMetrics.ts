/**
 * Pure, instance-scoped summary of native automation events.
 * This is NOT a durable ledger and cannot certify global workflow health.
 */
export type NativeAutomationEvent = {
  status: 'success' | 'warning' | 'error';
  durationMs: number;
};

export function summarizeNativeAutomationEvents(
  events: readonly NativeAutomationEvent[],
): {
  observedEvents: number;
  eligibleOutcomes: number;
  warningEvents: number;
  successRate: number | null;
  averageReportedDurationMs: number | null;
} {
  const completed = events.filter(event => event.status === 'success' || event.status === 'error');
  // Warnings include skipped/locked jobs and must not become successes or failures.
  const durations = completed
    .map(event => event.durationMs)
    // A caller-supplied 0 is frequently a placeholder, not a measured latency.
    .filter(duration => Number.isFinite(duration) && duration > 0);
  return {
    observedEvents: events.length,
    eligibleOutcomes: completed.length,
    warningEvents: events.length - completed.length,
    successRate: completed.length
      ? Math.round(completed.filter(event => event.status === 'success').length / completed.length * 1000) / 10
      : null,
    averageReportedDurationMs: durations.length
      ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
      : null,
  };
}
