/**
 * Distribución de la oficina virtual a partir del registro real de agentes.
 * Las salas son las oficinas declaradas en shared/agentOfficeTypes (9). Cada agente
 * se coloca según su campo `office`; nada se agrupa por listas hardcodeadas.
 * Una sala sin agentes se muestra como vacante: no se inventan empleados.
 */
import { AGENT_OFFICE_DEFINITIONS, AGENT_STATUSES, type AgentOfficeId, type AgentStatus, type LocalizedText } from '../../shared/agentOfficeTypes';

export type OfficeAgentSignal = 'recent_activity' | 'no_recent_signal' | 'telemetry_unavailable';

export type OfficeAgent = {
  id: string;
  name?: LocalizedText | null;
  office?: AgentOfficeId | string | null;
  mission: string;
  status?: AgentStatus | string | null;
  signal: OfficeAgentSignal;
  lastEventType: string | null;
  lastObservedAt: string | null;
  lastHeartbeatAt?: string | null;
  /** Resumen seguro (sin objetivo textual): el backend redacta la tarea en agentOfficeProjection. */
  currentTask?: { runId: string; startedAt: string | null } | null;
  autonomyLevel?: number | null;
};

export type OfficeRoom = {
  id: AgentOfficeId | 'unassigned';
  name: LocalizedText;
  agents: OfficeAgent[];
  vacant: boolean;
};

const KNOWN_OFFICES = new Set<string>(AGENT_OFFICE_DEFINITIONS.map((office) => office.id));
const KNOWN_STATUSES = new Set<string>(AGENT_STATUSES);

/** Estado honesto: sin telemetría o sin heartbeat fresco => no_signal. */
export function honestAgentStatus(agent: Pick<OfficeAgent, 'status' | 'signal'>): AgentStatus {
  const declared = typeof agent.status === 'string' && KNOWN_STATUSES.has(agent.status) ? agent.status as AgentStatus : 'no_signal';
  if (declared === 'paused' || declared === 'revoked') return declared;
  if (agent.signal !== 'recent_activity') return 'no_signal';
  return declared;
}

export function buildOfficeRooms(agents: readonly OfficeAgent[]): OfficeRoom[] {
  const rooms: OfficeRoom[] = AGENT_OFFICE_DEFINITIONS.map((office) => {
    const members = agents.filter((agent) => agent.office === office.id);
    return { id: office.id, name: office.name, agents: members, vacant: members.length === 0 };
  });
  const unassigned = agents.filter((agent) => !agent.office || !KNOWN_OFFICES.has(String(agent.office)));
  if (unassigned.length) {
    rooms.push({ id: 'unassigned', name: { es: 'Sin oficina asignada (revisar registro)', en: 'No office assigned (check registry)' }, agents: unassigned, vacant: false });
  }
  return rooms;
}

export const AGENT_STATUS_LABELS: Record<AgentStatus, LocalizedText> = {
  idle: { es: 'Disponible', en: 'Idle' },
  working: { es: 'Trabajando', en: 'Working' },
  waiting_approval: { es: 'Esperando aprobación', en: 'Waiting for approval' },
  blocked: { es: 'Bloqueado', en: 'Blocked' },
  paused: { es: 'Pausado por el dueño', en: 'Paused by owner' },
  revoked: { es: 'Revocado', en: 'Revoked' },
  no_signal: { es: 'Sin señal', en: 'No signal' },
};
