/**
 * Owner-only, read-only JARVIS Executive briefing.
 * Recommendations are deterministic hypotheses tied to explicit input fields.
 * A recommendation never means an agent has executed an action.
 */
import { getAdminControlCenterSnapshot } from './adminControlCenterService';

type BriefingEvidence = {
  path: string;
  value: number | null;
  quality: 'sample' | 'unverified' | 'unavailable';
};
type Recommendation = {
  id: string;
  severity: 'critical' | 'attention' | 'information';
  department: 'operations' | 'sales' | 'agentops' | 'finance';
  title: { es: string; en: string };
  detail: { es: string; en: string };
  evidence: BriefingEvidence[];
  suggestedRoute: string;
  execution: 'proposal_only';
  approvalRequiredForAnyMutation: true;
};
type Input = {
  generatedAt?: unknown;
  alerts?: { critical?: unknown; unresolved?: unknown };
  business?: { pendingBookings?: unknown; confirmedBookings?: unknown };
  journeyPipeline?: { total?: unknown; readyToQuote?: unknown; recovery?: unknown };
  agentOffice?: { source?: unknown; registered?: unknown; recentlyObserved?: unknown; active?: unknown; noSignal?: unknown; waitingApproval?: unknown };
};

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function fact(path: string, value: unknown, quality: BriefingEvidence['quality'] = 'unverified'): BriefingEvidence {
  return { path, value: count(value), quality };
}

/** Deterministic advice only; never treats sampling/booking states as verified cash or global totals. */
export function buildEvidenceBasedOwnerBriefing(input: Input) {
  const alerts = fact('alerts.critical', input.alerts?.critical, 'unverified');
  const pending = fact('business.pendingBookings', input.business?.pendingBookings, 'unverified');
  const ready = fact('journeyPipeline.readyToQuote', input.journeyPipeline?.readyToQuote, 'sample');
  const recovery = fact('journeyPipeline.recovery', input.journeyPipeline?.recovery, 'sample');
  const officeReady = input.agentOffice?.source === 'firestore_agent_registry_and_events';
  const noSignal = fact('agentOffice.noSignal', officeReady ? input.agentOffice?.noSignal : null, officeReady ? 'sample' : 'unavailable');
  const working = fact('agentOffice.active', officeReady ? input.agentOffice?.active : null, officeReady ? 'sample' : 'unavailable');
  const waiting = fact('agentOffice.waitingApproval', officeReady ? input.agentOffice?.waitingApproval : null, officeReady ? 'sample' : 'unavailable');
  const recommendations: Recommendation[] = [];

  if (alerts.value !== null && alerts.value > 0) recommendations.push({
    id: 'critical-alert-review', severity: 'critical', department: 'operations',
    title: { es: 'Investigar alertas críticas', en: 'Investigate critical alerts' },
    detail: {
      es: 'Abrir las alertas registradas, revisar evidencia y asignar seguimiento. El agente no declara que hayan sido resueltas.',
      en: 'Open recorded alerts, inspect evidence and assign follow-up. No agent claims they have been resolved.',
    },
    evidence: [alerts], suggestedRoute: '/admin', execution: 'proposal_only', approvalRequiredForAnyMutation: true,
  });
  if (pending.value !== null && pending.value > 0) recommendations.push({
    id: 'booking-pending-review', severity: 'attention', department: 'operations',
    title: { es: 'Revisar reservas pendientes', en: 'Review pending bookings' },
    detail: {
      es: 'Comprobar pago, capacidad interna y respuesta del proveedor por separado; no confirmar sin fuentes autoritativas.',
      en: 'Check payment, internal capacity and provider response separately; do not confirm without authoritative evidence.',
    },
    evidence: [pending], suggestedRoute: '/admin', execution: 'proposal_only', approvalRequiredForAnyMutation: true,
  });
  if (noSignal.value !== null && noSignal.value > 0) recommendations.push({
    id: 'agent-heartbeats', severity: 'attention', department: 'agentops',
    title: { es: 'Verificar agentes sin señal reciente', en: 'Investigate agents without recent signals' },
    detail: {
      es: 'La falta de heartbeat NO prueba fallo ni inactividad. Verificar el runtime antes de reanudar procesos.',
      en: 'A missing heartbeat does NOT prove failure or idleness. Verify runtime before resuming processes.',
    },
    evidence: [noSignal], suggestedRoute: '/admin/ai-command', execution: 'proposal_only', approvalRequiredForAnyMutation: true,
  });
  if (ready.value !== null && ready.value > 0) recommendations.push({
    id: 'quote-readiness-sample', severity: 'information', department: 'sales',
    title: { es: 'Analizar oportunidades listas para cotizar', en: 'Review ready-to-quote opportunities' },
    detail: {
      es: 'Esta es una muestra de expedientes; verificar contacto, consentimiento, disponibilidad y precio antes de enviar propuestas.',
      en: 'This is a sample of journeys; verify contact, consent, availability and price before outreach.',
    },
    evidence: [ready], suggestedRoute: '/admin/leads', execution: 'proposal_only', approvalRequiredForAnyMutation: true,
  });
  if (recovery.value !== null && recovery.value > 0) recommendations.push({
    id: 'journey-recovery-sample', severity: 'attention', department: 'sales',
    title: { es: 'Revisar itinerarios en recuperación', en: 'Review journeys in recovery' },
    detail: {
      es: 'Identificar bloqueos de los expedientes muestreados y proponer alternativas con fuentes verificadas.',
      en: 'Find blockers in sampled journeys and propose alternatives grounded in verified sources.',
    },
    evidence: [recovery], suggestedRoute: '/admin/leads', execution: 'proposal_only', approvalRequiredForAnyMutation: true,
  });

  // No reconciled payment ledger is consulted here. Financial collection and margin are unknown.
  recommendations.push({
    id: 'financial-evidence', severity: 'information', department: 'finance',
    title: { es: 'Conectar evidencia de cobros conciliados', en: 'Connect reconciled collection evidence' },
    detail: {
      es: 'El valor de reservas no es caja. No se puede certificar ingresos cobrados, margen o utilidad desde este snapshot.',
      en: 'Booking value is not cash. Collected revenue, margin and profit cannot be certified from this snapshot.',
    },
    evidence: [{ path: 'finance.reconciledCollectionsUSD', value: null, quality: 'unavailable' }],
    suggestedRoute: '/admin/financial-legal', execution: 'proposal_only', approvalRequiredForAnyMutation: true,
  });

  const order = { critical: 0, attention: 1, information: 2 };
  recommendations.sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    generatedAt: typeof input.generatedAt === 'string' ? input.generatedAt : null,
    method: 'deterministic_evidence_review' as const,
    execution: 'none' as const,
    coverage: 'uncertified_bounded_sources' as const,
    metrics: {
      alerts, pending, ready, recovery, noSignal, working, waiting,
    },
    workforceSample: officeReady ? [
      { status: 'working', count: working.value },
      { status: 'waiting_approval', count: waiting.value },
      { status: 'no_signal', count: noSignal.value },
    ] : null,
    recommendations,
    factsNotCertified: [
      'verified collections', 'profit/margin', 'global workflow uptime',
      'provider capacity', 'full lifetime conversion',
    ],
  };
}

export async function getOwnerExecutiveBriefing() {
  return buildEvidenceBasedOwnerBriefing(await getAdminControlCenterSnapshot());
}
