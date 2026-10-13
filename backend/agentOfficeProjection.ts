/**
 * Read-only operational projection for the owner's virtual agent office.
 * Runtime status is trusted only while its heartbeat is fresh. Missing or
 * stale telemetry becomes no_signal rather than being guessed as idle.
 * Customer/event payload bodies are never projected to the frontend.
 */
import {
  AGENT_STATUSES,
  type AgentCurrentTask,
  type AgentDailyUsage,
  type AgentOfficeId,
  type AgentStatus,
  type LocalizedText,
} from '../shared/agentOfficeTypes';
import { AGENT_NO_SIGNAL_AFTER_MS } from './agentRuntimeService';

export type AgentOfficeSignal = 'recent_activity' | 'no_recent_signal' | 'telemetry_unavailable';

export type AgentOfficeAgent = {
  id: string;
  name: LocalizedText | null;
  office: AgentOfficeId | null;
  mission: string;
  status: AgentStatus;
  signal: AgentOfficeSignal;
  lastEventType: string | null;
  lastObservedAt: string | null;
  lastHeartbeatAt: string | null;
  currentTask: AgentCurrentTask | null;
  autonomyLevel: number | null;
  usageToday: AgentDailyUsage | null;
  model: string | null;
  allowedTools: string[];
};

type Identity = {
  id: string;
  mission: string | LocalizedText;
  name?: LocalizedText;
  office?: AgentOfficeId;
  status?: AgentStatus;
  lastHeartbeatAt?: string | null;
  currentTask?: AgentCurrentTask | null;
  autonomyLevel?: number;
  usageToday?: AgentDailyUsage | null;
  model?: string | null;
  allowedTools?: string[];
};

type Event = {
  type?: unknown;
  createdAt?: unknown;
  payload?: { agentId?: unknown; [key: string]: unknown } | null;
};

const VALID_STATUSES = new Set<string>(AGENT_STATUSES);

function localizedMission(value: Identity['mission']): string {
  if (typeof value === 'string') return value;
  return value?.es || value?.en || '';
}

function validHeartbeat(value: unknown, now: number): { at: string; timestamp: number; fresh: boolean } | null {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || !Number.isFinite(now) || timestamp > now + 60_000) return null;
  return {
    at: new Date(timestamp).toISOString(),
    timestamp,
    fresh: now >= timestamp && now - timestamp <= AGENT_NO_SIGNAL_AFTER_MS,
  };
}

function runtimeStatus(agent: Identity, heartbeatFresh: boolean, telemetryAvailable: boolean): AgentStatus {
  if (!telemetryAvailable) return 'no_signal';
  const declared = typeof agent.status === 'string' && VALID_STATUSES.has(agent.status)
    ? agent.status
    : 'no_signal';

  // Governance states remain meaningful even without a process heartbeat.
  if (declared === 'paused' || declared === 'revoked') return declared;
  return heartbeatFresh ? declared : 'no_signal';
}

export function projectAgentOffice(
  identities: readonly Identity[],
  events: readonly Event[],
  observedAt: string,
  telemetryAvailable: boolean,
): {
  generatedAt: string;
  source: string;
  registered: number;
  recentlyObserved: number;
  active: number;
  waitingApproval: number;
  noSignal: number;
  agents: AgentOfficeAgent[];
} {
  const now = Date.parse(observedAt);
  const latest = new Map<string, { type: string; at: string; timestamp: number }>();
  const validIds = new Set(identities.map((agent) => agent.id));

  if (telemetryAvailable) {
    for (const event of events) {
      const id = typeof event.payload?.agentId === 'string' ? event.payload.agentId : '';
      const timestamp = typeof event.createdAt === 'string' ? Date.parse(event.createdAt) : NaN;
      if (!validIds.has(id) || !Number.isFinite(timestamp) || !Number.isFinite(now) || timestamp > now + 60_000) continue;
      if (!latest.has(id) || timestamp > latest.get(id)!.timestamp) {
        latest.set(id, {
          type: typeof event.type === 'string' ? event.type.slice(0, 80) : 'event',
          at: new Date(timestamp).toISOString(),
          timestamp,
        });
      }
    }
  }

  const agents: AgentOfficeAgent[] = identities.map((agent) => {
    const activity = latest.get(agent.id);
    const heartbeat = validHeartbeat(agent.lastHeartbeatAt, now);
    const fresh = Boolean(heartbeat?.fresh);
    const status = runtimeStatus(agent, fresh, telemetryAvailable);
    const lastObserved = [activity?.at, heartbeat?.at]
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;

    return {
      id: agent.id,
      name: agent.name ?? null,
      office: agent.office ?? null,
      mission: localizedMission(agent.mission),
      status,
      signal: !telemetryAvailable
        ? 'telemetry_unavailable'
        : fresh
          ? 'recent_activity'
          : 'no_recent_signal',
      lastEventType: activity?.type ?? null,
      lastObservedAt: lastObserved,
      lastHeartbeatAt: heartbeat?.at ?? null,
      currentTask: agent.currentTask ?? null,
      autonomyLevel: Number.isInteger(agent.autonomyLevel) ? Number(agent.autonomyLevel) : null,
      usageToday: agent.usageToday ?? null,
      model: typeof agent.model === 'string' ? agent.model : null,
      allowedTools: Array.isArray(agent.allowedTools) ? agent.allowedTools.slice(0, 100) : [],
    };
  });

  return {
    generatedAt: observedAt,
    source: telemetryAvailable ? 'firestore_agent_registry_and_events' : 'unavailable',
    registered: agents.length,
    recentlyObserved: agents.filter((agent) => agent.signal === 'recent_activity').length,
    active: agents.filter((agent) => agent.status === 'working').length,
    waitingApproval: agents.filter((agent) => agent.status === 'waiting_approval').length,
    noSignal: agents.filter((agent) => agent.status === 'no_signal').length,
    agents,
  };
}
