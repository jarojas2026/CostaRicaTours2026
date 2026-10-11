/**
 * Read-only operational projection for the owner's virtual agent office.
 * An agent appearing in the registry is NOT proof it is running or idle.
 * No customer messages or event payloads are sent to the frontend.
 */
export type AgentOfficeSignal = 'recent_activity' | 'no_recent_signal' | 'telemetry_unavailable';
export type AgentOfficeAgent = {
  id: string;
  mission: string;
  signal: AgentOfficeSignal;
  lastEventType: string | null;
  lastObservedAt: string | null;
  currentTask: null; // Not observable until a verified task lifecycle/heartbeat is implemented.
};

type Identity = { id: string; mission: string };
type Event = { type?: unknown; createdAt?: unknown; payload?: { agentId?: unknown; [key: string]: unknown } | null };

export function projectAgentOffice(
  identities: readonly Identity[],
  events: readonly Event[],
  observedAt: string,
  telemetryAvailable: boolean
): { generatedAt: string; source: string; registered: number; recentlyObserved: number; agents: AgentOfficeAgent[] } {
  const now = Date.parse(observedAt);
  const latest = new Map<string, { type: string; at: string; timestamp: number }>();
  const validIds = new Set(identities.map(agent => agent.id));

  if (telemetryAvailable) {
    for (const event of events) {
      const id = typeof event.payload?.agentId === 'string' ? event.payload.agentId : '';
      const timestamp = typeof event.createdAt === 'string' ? Date.parse(event.createdAt) : NaN;
      if (!validIds.has(id) || !Number.isFinite(timestamp) || !Number.isFinite(now) || timestamp > now + 60_000) continue;
      if (!latest.has(id) || timestamp > latest.get(id)!.timestamp) {
        latest.set(id, {
          type: typeof event.type === 'string' ? event.type.slice(0, 80) : 'event',
          at: new Date(timestamp).toISOString(),
          timestamp
        });
      }
    }
  }

  const agents: AgentOfficeAgent[] = identities.map(agent => {
    const activity = latest.get(agent.id);
    const recent = Boolean(activity && now >= activity.timestamp && now - activity.timestamp <= 5 * 60_000);
    return {
      id: agent.id,
      mission: agent.mission,
      signal: !telemetryAvailable ? 'telemetry_unavailable' : recent ? 'recent_activity' : 'no_recent_signal',
      lastEventType: activity?.type ?? null,
      lastObservedAt: activity?.at ?? null,
      currentTask: null
    };
  });
  return {
    generatedAt: observedAt,
    source: telemetryAvailable ? 'firestore_agent_events_bounded_sample' : 'unavailable',
    registered: agents.length,
    recentlyObserved: agents.filter(agent => agent.signal === 'recent_activity').length,
    agents
  };
}
