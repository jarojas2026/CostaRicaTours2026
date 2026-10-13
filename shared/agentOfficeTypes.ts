export const AGENT_STATUSES = [
  'idle',
  'working',
  'waiting_approval',
  'blocked',
  'paused',
  'revoked',
  'no_signal',
] as const;

export type AgentStatus = (typeof AGENT_STATUSES)[number];
export type AgentAutonomyLevel = 0 | 1 | 2 | 3;

export const AGENT_OFFICE_IDS = [
  'reception_sales',
  'reservations_availability',
  'providers_operators',
  'payments',
  'international_marketing',
  'traveler_support',
  'verification_quality',
  'finance',
  'jarvis_room',
] as const;

export type AgentOfficeId = (typeof AGENT_OFFICE_IDS)[number];

export type LocalizedText = {
  es: string;
  en: string;
};

export type AgentPermissionProfile = {
  read: string[];
  write: string[];
  escalation: string[];
};

export type AgentCurrentTask = {
  runId: string;
  objective: string;
  startedAt: string;
};

export type AgentDailyUsage = {
  dayKey: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  billedCostUSD: number | null;
};

export type AgentRecord = {
  id: string;
  name: LocalizedText;
  office: AgentOfficeId;
  mission: LocalizedText;
  model: string | null;
  allowedTools: string[];
  permissions: AgentPermissionProfile;
  autonomyLevel: AgentAutonomyLevel;
  status: AgentStatus;
  currentTask: AgentCurrentTask | null;
  lastHeartbeatAt: string | null;
  usageToday: AgentDailyUsage | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export const AGENT_RUN_STATUSES = [
  'queued',
  'running',
  'waiting_approval',
  'completed',
  'failed',
  'cancelled',
  'revoked',
] as const;

export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export type AgentRunActor = {
  kind: 'owner' | 'admin' | 'operator' | 'system' | 'agent';
  id: string;
  email: string | null;
};

export type AgentRunCost = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  billedCostUSD: number | null;
};

export type AgentRunError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type AgentRunRecord = {
  id: string;
  requestedBy: AgentRunActor;
  objective: string;
  agentId: string;
  status: AgentRunStatus;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  cost: AgentRunCost | null;
  error: AgentRunError | null;
  lastStepSequence: number;
  version: number;
};

export type AgentRunStepStatus = 'started' | 'completed' | 'failed' | 'waiting_approval';

export type AgentRunStepTool = {
  name: string;
  callId: string | null;
};

export type AgentRunStepResult = {
  status: 'ok' | 'error' | 'waiting_approval';
  summary: string;
  evidenceRefs: string[];
};

export type AgentRunStepRecord = {
  id: string;
  runId: string;
  sequence: number;
  agentId: string;
  status: AgentRunStepStatus;
  decisionSummary: string;
  tool: AgentRunStepTool | null;
  result: AgentRunStepResult | null;
  error: AgentRunError | null;
  durationMs: number | null;
  cost: AgentRunCost | null;
  createdAt: string;
};

export const AGENT_OFFICE_DEFINITIONS: ReadonlyArray<{
  id: AgentOfficeId;
  name: LocalizedText;
}> = [
  { id: 'reception_sales', name: { es: 'Recepción y Ventas', en: 'Reception & Sales' } },
  { id: 'reservations_availability', name: { es: 'Reservas y Disponibilidad', en: 'Bookings & Availability' } },
  { id: 'providers_operators', name: { es: 'Proveedores y Operadores', en: 'Providers & Operators' } },
  { id: 'payments', name: { es: 'Pagos', en: 'Payments' } },
  { id: 'international_marketing', name: { es: 'Marketing Internacional', en: 'International Marketing' } },
  { id: 'traveler_support', name: { es: 'Soporte al Viajero', en: 'Traveler Support' } },
  { id: 'verification_quality', name: { es: 'Verificación y Calidad', en: 'Verification & Quality' } },
  { id: 'finance', name: { es: 'Finanzas', en: 'Finance' } },
  { id: 'jarvis_room', name: { es: 'Sala de JARVIS', en: 'JARVIS Room' } },
];
