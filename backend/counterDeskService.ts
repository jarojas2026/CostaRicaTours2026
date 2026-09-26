import { getAllBookings, checkTourAvailability } from './bookingService';
import { getAlerts } from './alertService';
import { getProvidersOverview } from './providerCommunicationService';
import { getNativeEngineStatus } from './nativeAutomationEngine';
import { processChatInquiry } from './aiAssistantService';
import { getOperationalMemory, rememberTurn } from './memoryService';
import { buildAgentKnowledgeContext } from './agentKnowledgeFabric';
import type { Language } from '../src/types';

let counterSnapshotCache: { expiresAt: number; value: any } | null = null;
const COUNTER_SNAPSHOT_TTL_MS = 10_000;

export type CounterDeskAskInput = {
  message: string;
  sessionId?: string;
  language?: Language;
  context?: Record<string, any>;
};

export async function askCounterDesk(input: CounterDeskAskInput) {
  const message = String(input.message || '').trim().slice(0, 5000);
  if (!message) throw new Error('message es requerido');

  const language: Language = input.language || 'es';
  const modelLanguage: 'es' | 'en' = language === 'es' ? 'es' : 'en';
  const sessionId = String(input.sessionId || '').trim();
  const history = sessionId ? (await getOperationalMemory(sessionId)).turns : [];
  const knowledgeContext = await buildAgentKnowledgeContext({ query: message, sessionId: sessionId || undefined });

  const result = await processChatInquiry(
    message,
    modelLanguage,
    history.map(t => ({ role: t.role, text: t.text })),
    'counter_agent',
    sessionId || undefined
  );

  if (sessionId) {
    await rememberTurn(sessionId, { role: 'user', text: message }, { agentId: result.agentId || 'counter_agent' });
    await rememberTurn(sessionId, { role: 'assistant', text: result.reply }, { agentId: result.agentId || 'counter_agent' });
  }

  return {
    success: true,
    agentId: result.agentId || 'counter_agent',
    reply: result.reply,
    quickActions: result.quickActions || [],
    language,
    modelUsed: result.modelUsed,
    knowledgeContext: knowledgeContext.slice(0, 12000),
    timestamp: new Date().toISOString()
  };
}

export async function getCounterOperationsSnapshot() {
  if (counterSnapshotCache && counterSnapshotCache.expiresAt > Date.now()) return counterSnapshotCache.value;
  const [bookings, alerts, providers] = await Promise.all([
    getAllBookings(),
    getAlerts({ resolved: false }),
    Promise.resolve(getProvidersOverview())
  ]);

  const now = Date.now();
  const upcoming = bookings.filter((b: any) => {
    const d = new Date(String(b.date || '') + 'T' + String(b.time || '00:00:00')).getTime();
    return Number.isFinite(d) && d >= now && d <= now + 72 * 60 * 60 * 1000;
  });

  const pendingPayments = bookings.filter((b: any) => ['pending', 'pendiente_pago'].includes(String(b.paymentStatus || b.status || '').toLowerCase()));
  const unresolvedCritical = alerts.filter((a: any) => a.severity === 'critical').length;

  const providerList = Array.isArray((providers as any).providers)
    ? (providers as any).providers
    : Array.isArray(providers) ? providers : [];

  const snapshot = {
    generatedAt: new Date().toISOString(),
    engine: getNativeEngineStatus(),
    counters: {
      totalBookings: bookings.length,
      upcoming72h: upcoming.length,
      pendingPayments: pendingPayments.length,
      unresolvedAlerts: alerts.length,
      criticalAlerts: unresolvedCritical,
      activeProviders: providerList.filter((p: any) => p.status === 'active').length
    },
    upcoming: upcoming.slice(0, 12).map((b: any) => ({
      bookingId: b.bookingId || b.id,
      date: b.date,
      time: b.time,
      tourName: b.tourName,
      status: b.status,
      paymentStatus: b.paymentStatus,
      providerName: b.providerName
    })),
    alerts: alerts.slice(0, 12).map((a: any) => ({
      id: a.id, severity: a.severity, title: a.title, message: a.message,
      bookingId: a.bookingId, providerId: a.providerId, createdAt: a.createdAt
    })),
    providers: providerList.slice(0, 20).map((p: any) => ({
      id: p.id, name: p.name, region: p.region, status: p.status,
      slaTargetMinutes: p.slaTargetMinutes, averageResponseMinutes: p.averageResponseMinutes,
      acceptanceRate: p.acceptanceRate
    }))
  };
  counterSnapshotCache = { expiresAt: Date.now() + COUNTER_SNAPSHOT_TTL_MS, value: snapshot };
  return snapshot;
}

export async function runCounterSafeAutopilot() {
  const snapshot = await getCounterOperationsSnapshot();
  const actions: Array<{id:string; priority:'high'|'medium'|'low'; action:string; reason:string; safe:boolean}> = [];

  if (snapshot.counters.criticalAlerts > 0) {
    actions.push({ id: 'critical-alerts', priority: 'high', action: 'Revisar y escalar alertas críticas', reason: 'Hay alertas operativas críticas sin resolver.', safe: true });
  }
  if (snapshot.counters.pendingPayments > 0) {
    actions.push({ id: 'pending-payments', priority: 'high', action: 'Revisar pagos pendientes y conciliación', reason: 'Existen reservas con pago pendiente.', safe: true });
  }
  if (snapshot.counters.upcoming72h > 0) {
    actions.push({ id: 'upcoming-ops', priority: 'medium', action: 'Verificar proveedores y SLA de las salidas de las próximas 72 horas', reason: 'Hay operaciones próximas que requieren cobertura.', safe: true });
  }
  if (snapshot.counters.unresolvedAlerts === 0 && snapshot.counters.pendingPayments === 0) {
    actions.push({ id: 'preventive-check', priority: 'low', action: 'Ejecutar revisión preventiva de operaciones', reason: 'No hay incidencias pendientes; mantener vigilancia.', safe: true });
  }

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    mode: 'recommendation_first',
    actions,
    snapshot
  };
}


export async function organizeCounterDesk() {
  const snapshot = await getCounterOperationsSnapshot();
  const fallback = await runCounterSafeAutopilot();
  if (!process.env.GEMINI_API_KEY) {
    return { ...fallback, ai: { enabled: false, note: 'GEMINI_API_KEY no configurada; se usa organización determinista.' } };
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = [
    'Eres el supervisor operativo de una plataforma de tours en Costa Rica.',
    'Organiza el trabajo a partir del snapshot real. No inventes datos, no cambies precios, reservas ni pagos.',
    'Devuelve JSON con: summary, priorities (máximo 8 objetos con id, priority high|medium|low, action, reason), watchlist (máximo 6 strings), handoffs (máximo 6 strings).',
    'Prioriza seguridad, pagos pendientes, salidas próximas, alertas y cobertura de proveedores.',
    JSON.stringify(snapshot).slice(0, 60000)
  ].join('\n\n');

  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  const raw = response.text || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(raw.trim().replace(/^json\s*/i, ''));
  } catch {
    parsed = { summary: raw.slice(0, 2000), priorities: fallback.actions, watchlist: [], handoffs: [] };
  }

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    mode: 'ai_supervisor',
    ai: { enabled: true, model: 'gemini-2.5-flash' },
    ...parsed,
    snapshot
  };
}

export async function checkCounterAvailability(tourId: string, date: string, time: string | undefined, seats: number) {
  return checkTourAvailability(tourId, date, time, Math.max(1, Math.min(50, Number(seats) || 1)));
}

export async function getUnifiedTravelerOperationsContext(input: {
  journeyId?: string;
  sessionId?: string;
}) {
  const { executeAgentTool } = await import('./agentTools');
  const health = await executeAgentTool('trip_health_snapshot', {
    journeyId: input.journeyId,
    sessionId: input.sessionId
  });
  const nextAction = await executeAgentTool('next_best_action', {
    health: health.health,
    hasDate: Boolean(health.traveler?.date),
    hasSelection: Array.isArray(health.itinerary?.days) && health.itinerary.days.some((day: any) => day.tourId)
  });
  return {
    generatedAt: new Date().toISOString(),
    health,
    nextAction,
    handoffReady: Boolean(health.journeyId || input.sessionId),
    channels: ['web', 'Counter Desk', 'voice Agent Desk', 'WhatsApp', 'provider operations']
  };
}
