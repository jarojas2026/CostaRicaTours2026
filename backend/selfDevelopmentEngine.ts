/**
 * 🧠 MOTOR DE AUTO-DESARROLLO, AUTO-REPARACIÓN & INTELIGENCIA DINÁMICA 2026
 * =========================================================================
 * Regla de evidencia: este módulo sólo reporta como ejecutada una acción que
 * realmente ocurrió. Los scores derivados exponen su base y no sustituyen
 * observabilidad de infraestructura. No se generan rutas, ahorros, SLA ni
 * resultados sintéticos para decorar el panel administrativo.
 * =========================================================================
 */

import { getAllBookings } from './bookingService';
import { cleanupExpiredSoftHolds } from './cronEngine';
import { getProvidersOverview, handleProviderAction } from './providerCommunicationService';
import { TOURS } from '../src/data/toursData';

export interface SelfHealingAction {
  id: string;
  timestamp: string;
  category: 'soft_hold_cleanup' | 'provider_sla_escalation' | 'route_optimization' | 'dynamic_pricing' | 'memory_sanitization';
  description: string;
  impact: string;
  resolved: boolean;
}

export interface RouteOptimizationResult {
  zone: string;
  totalPickups: number;
  originalEstimatedMinutes: number;
  optimizedEstimatedMinutes: number;
  minutesSaved: number;
  co2SavedKg: number;
  optimizedSequence: string[];
}

export interface DynamicPricingInsight {
  tourId: string;
  tourName: string;
  basePriceUSD: number;
  currentDemandMultiplier: number;
  recommendedPriceUSD: number;
  demandFactor: 'very_high' | 'high' | 'normal' | 'low';
  justification: string;
  evidence?: {
    bookingCount: number;
    passengerCount: number;
    modelAssumption: string;
  };
}

const selfDevelopmentLog: SelfHealingAction[] = [];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function currentSlaBreaches(overview: ReturnType<typeof getProvidersOverview>, now = Date.now()) {
  return overview.recentServiceOrders.filter(order =>
    order.status === 'dispatched' &&
    Boolean(order.slaDeadline) &&
    new Date(order.slaDeadline).getTime() < now
  );
}

function healthFromObservedSignals(input: {
  cleanupHealthy?: boolean;
  unresolvedSlaBreaches: number;
  failedRecoveries?: number;
}) {
  let score = 100;
  if (input.cleanupHealthy === false) score -= 25;
  score -= Math.min(45, input.unresolvedSlaBreaches * 15);
  score -= Math.min(30, (input.failedRecoveries || 0) * 10);
  return clampScore(score);
}

/**
 * Ejecuta un ciclo real de auto-diagnóstico y auto-reparación.
 */
export async function runSelfHealingCycle(): Promise<{
  success: boolean;
  actionsExecuted: SelfHealingAction[];
  systemHealthScore: number;
  healthScoreBasis: Record<string, unknown>;
  metrics: {
    staleLocksFreed: number;
    slaBreachesDetected: number;
    slaBreachesRecovered: number;
    slaBreachesUnresolved: number;
    routesOptimized: number;
  };
}> {
  const actions: SelfHealingAction[] = [];
  const now = new Date();

  const cleanupResult = await cleanupExpiredSoftHolds().catch(() => ({ success: false, releasedCount: 0, totalChecked: 0 }));
  const freedLocksCount = Number(cleanupResult.releasedCount || 0);

  if (freedLocksCount > 0) {
    const lockAction: SelfHealingAction = {
      id: `sh_${Date.now()}_lock`,
      timestamp: now.toISOString(),
      category: 'soft_hold_cleanup',
      description: `Liberación de ${freedLocksCount} soft-holds expirados detectados en la base de reservas.`,
      impact: `${freedLocksCount} hold(s) pasaron por la rutina real de liberación de inventario.`,
      resolved: true
    };
    actions.push(lockAction);
    selfDevelopmentLog.unshift(lockAction);
  }

  const providerOverviewBefore = getProvidersOverview();
  const staleOrders = currentSlaBreaches(providerOverviewBefore, now.getTime());
  let slaBreachesRecovered = 0;
  let failedRecoveries = 0;

  for (const staleOrder of staleOrders) {
    try {
      const result = await handleProviderAction({
        orderId: staleOrder.id,
        action: 'reject',
        notes: 'Auto-remediación: SLA de confirmación excedido; iniciar recuperación/failover sólo con proveedor verificado.'
      });
      if (result.success) slaBreachesRecovered++;
      else failedRecoveries++;
    } catch {
      failedRecoveries++;
    }
  }

  if (staleOrders.length > 0) {
    const slaAction: SelfHealingAction = {
      id: `sh_${Date.now()}_sla`,
      timestamp: now.toISOString(),
      category: 'provider_sla_escalation',
      description: `Se detectaron ${staleOrders.length} órdenes fuera de SLA; ${slaBreachesRecovered} se procesaron por la ruta real de recuperación.`,
      impact: failedRecoveries > 0
        ? `${failedRecoveries} orden(es) requieren seguimiento adicional o revisión humana.`
        : 'Las órdenes detectadas fueron entregadas al flujo real de recuperación/failover.',
      resolved: failedRecoveries === 0
    };
    actions.push(slaAction);
    selfDevelopmentLog.unshift(slaAction);
  }

  if (selfDevelopmentLog.length > 50) selfDevelopmentLog.length = 50;

  const providerOverviewAfter = getProvidersOverview();
  const unresolved = currentSlaBreaches(providerOverviewAfter).length;
  const systemHealthScore = healthFromObservedSignals({
    cleanupHealthy: Boolean(cleanupResult.success),
    unresolvedSlaBreaches: unresolved,
    failedRecoveries
  });

  return {
    success: Boolean(cleanupResult.success) && failedRecoveries === 0,
    actionsExecuted: actions,
    systemHealthScore,
    healthScoreBasis: {
      derived: true,
      definition: 'Internal operational score based only on soft-hold cleanup execution and currently observed provider SLA exceptions.',
      cleanupHealthy: Boolean(cleanupResult.success),
      bookingsCheckedForExpiredHolds: Number(cleanupResult.totalChecked || 0),
      unresolvedSlaBreaches: unresolved,
      failedRecoveries,
      observedAt: new Date().toISOString()
    },
    metrics: {
      staleLocksFreed: freedLocksCount,
      slaBreachesDetected: staleOrders.length,
      slaBreachesRecovered,
      slaBreachesUnresolved: unresolved,
      routesOptimized: 0
    }
  };
}

/**
 * No devuelve rutas demostrativas. Hasta que exista telemetría real de pickups,
 * tiempos/geo y una ejecución del optimizador, la respuesta correcta es vacía.
 */
export function calculateOptimizedRoutes(): RouteOptimizationResult[] {
  return [];
}

/**
 * Señal comercial advisory basada en reservas registradas y catálogo.
 * No cambia precios server-authoritative ni se presenta como disponibilidad.
 */
export async function calculateDynamicPricingInsights(): Promise<DynamicPricingInsight[]> {
  const allBookings = await getAllBookings();
  const insights: DynamicPricingInsight[] = [];
  const targetTours = TOURS.slice(0, 5);

  for (const tour of targetTours) {
    const tourBookings = allBookings.filter((booking: any) => {
      const status = String(booking.status || '').toLowerCase();
      const notCancelled = !['cancelled', 'canceled', 'cancelada', 'expirada', 'refunded'].includes(status);
      const matchesTour = booking.tourId === tour.id || (booking.tourName && String(booking.tourName).toLowerCase().includes(String(tour.id).toLowerCase()));
      return notCancelled && matchesTour;
    });
    const totalPax = tourBookings.reduce((sum: number, booking: any) => sum + Number(booking.adults || 1) + Number(booking.children || 0), 0);

    // This denominator is explicitly a planning model, not measured inventory.
    const planningCapacity = Math.max(1, Number(tour.maxGroupSize || 15) * 4);
    const modeledLoad = totalPax / planningCapacity;

    let demandFactor: DynamicPricingInsight['demandFactor'] = 'normal';
    let multiplier = 1.0;
    if (modeledLoad > 0.75) { demandFactor = 'very_high'; multiplier = 1.12; }
    else if (modeledLoad > 0.4) { demandFactor = 'high'; multiplier = 1.06; }
    else if (modeledLoad <= 0.15) { demandFactor = 'low'; multiplier = 0.95; }

    insights.push({
      tourId: tour.id,
      tourName: tour.title.es,
      basePriceUSD: tour.priceUSD,
      currentDemandMultiplier: multiplier,
      recommendedPriceUSD: Math.round(tour.priceUSD * multiplier * 100) / 100,
      demandFactor,
      justification: `Advisory model using ${tourBookings.length} recorded non-cancelled booking(s) and ${totalPax} passenger(s). It does not modify the authoritative catalog price.`,
      evidence: {
        bookingCount: tourBookings.length,
        passengerCount: totalPax,
        modelAssumption: `Planning denominator = maxGroupSize (${Number(tour.maxGroupSize || 15)}) × 4 hypothetical departures; not live inventory.`
      }
    });
  }

  return insights.slice(0, 3);
}

export async function getSelfDevelopmentOverview() {
  const providerOverview = getProvidersOverview();
  const unresolvedSlaBreaches = currentSlaBreaches(providerOverview).length;
  const systemHealthScore = healthFromObservedSignals({ unresolvedSlaBreaches });

  return {
    status: 'ACTIVE_EVIDENCE_BACKED_AUTOMATION',
    systemHealthScore,
    healthScoreBasis: {
      derived: true,
      definition: 'Current admin overview score derived from observed provider SLA exceptions. Infrastructure health requires its authoritative monitoring source.',
      unresolvedSlaBreaches,
      observedAt: new Date().toISOString()
    },
    autoHealingActionsTotal: selfDevelopmentLog.length,
    recentHealingLogs: selfDevelopmentLog.slice(0, 15),
    routeOptimizations: calculateOptimizedRoutes(),
    pricingIntelligence: await calculateDynamicPricingInsights(),
    version: '2026.5-EvidenceBacked',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  };
}
