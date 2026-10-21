/**
 * 🕒 MOTOR CRON DE AUTOMATIZACIONES NATIVAS (Costa Rica Tours)
 * =========================================================================
 * Ejecuta periódicamente las tareas de fondo programadas directamente
 * en el servidor Node.js/Express con zona horaria oficial 'America/Costa_Rica'.
 */

import cron from 'node-cron';
import { getAllBookings, updateBookingStatus, getFirestoreDb } from './bookingService';
import { logAutomationExecution, noteAutomationOutcome, runWithAutomationOutcome, type AutomationOutcomeStatus } from './nativeAutomationEngine';
import { processProviderInboxOnce } from './providerInboxAgent';
import { runReservationLifecycleSweep } from './reservationLifecycleOrchestrator';
import { processEmailOperationsOnce } from './emailOperationsAgent';
import { runJarvisSupervisionSweep } from './jarvisOrchestrator';
import { executeAutomatedProviderPayouts } from './providerPayoutService';
import { executeProviderConfirmationReminders } from './providerReminderService';
import {
  executeSurveillanceAndEscalation,
  executeDailyOperationReport,
  executePostTourReviewRequests,
  executeTour24hReminders,
  executeWeatherMonitoringAlerts,
  executeMorningConciergeTips,
  executePreSaleProspectRecovery,
  executePostSaleVipLoyalty
} from './nativeWorkflows';

// =========================================================================
// 6. CRON: Liberación Automática de Soft Holds Expirados (Cada 5 minutos)
// =========================================================================
export async function cleanupExpiredSoftHolds() {
  try {
    const allBookings = await getAllBookings();
    const now = new Date().toISOString();

    const expiredHolds = allBookings.filter(b =>
      (b.status === 'hold' || b.status === 'pendiente_pago' || b.holdActive) &&
      b.holdExpiresAt &&
      b.holdExpiresAt < now
    );

    let releasedCount = 0;
    if (expiredHolds.length > 0) {
      for (const booking of expiredHolds) {
        await updateBookingStatus(booking.id || booking.bookingId, {
          status: 'expirada',
          holdActive: false,
          liberadaAt: new Date().toISOString()
        });
        releasedCount++;
        logAutomationExecution(
          'AUTO_RELEASE_HOLD',
          5,
          'success',
          `Cupo liberado automáticamente para reserva expirada: ${booking.bookingId || booking.id}`
        );
      }
    }
    return { success: true, releasedCount, totalChecked: allBookings.length };
  } catch (error: any) {
    console.error('❌ Error ejecutando Auditoría de Soft Holds:', error);
    throw error;
  }
}

const AUTOMATION_LOCK_STALE_MS = 10 * 60 * 1000;

/**
 * Lock distribuido por job. Impide que varias instancias del runtime ejecuten
 * el mismo sweep a la vez durante escalamiento horizontal.
 */
export async function withDistributedAutomationLock<T>(lockId: string, work: () => Promise<T>): Promise<T | null> {
  const db = getFirestoreDb();
  if (!db) return work();
  const ref = db.collection('automation_locks').doc(lockId);
  try {
    await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        const data = snap.data() || {};
        const acquiredAt = Date.parse(String(data.acquiredAt || data.updatedAt || ''));
        if (data.status === 'running' && Number.isFinite(acquiredAt) && Date.now() - acquiredAt < AUTOMATION_LOCK_STALE_MS) {
          throw new Error('automation_lock_busy');
        }
      }
      const now = new Date().toISOString();
      tx.set(ref, { status: 'running', acquiredAt: now, updatedAt: now, owner: process.env.VERCEL_REGION || process.env.HOSTNAME || 'node' }, { merge: true });
    });
  } catch (error: any) {
    if (error?.message === 'automation_lock_busy') {
      noteAutomationOutcome('skipped', 'Omitido: otra instancia mantiene el lock distribuido.');
      return null;
    }
    throw error;
  }
  try {
    return await work();
  } finally {
    await ref.set({ status: 'idle', releasedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true }).catch(() => undefined);
  }
}

// =========================================================================
// HEARTBEAT PERSISTENTE DE CRONS
// Cada job programado se envuelve en runTrackedCronJob: registra último run,
// estado, duración y error (saneado) en Firestore, en el documento del job dentro
// de la colección existente `automation_locks` (campo `heartbeat`, merge; no
// toca el estado del lock). Cuota $0: jobs de alta frecuencia (≤5 min) escriben
// como máximo cada 15 min salvo cambio de estado. Sin Firestore → memoria.
// =========================================================================

export interface CronJobDefinition { id: string; trigger: string | null; schedule: string; expectedIntervalMinutes: number }

export const CRON_JOBS: readonly CronJobDefinition[] = [
  { id: 'provider-payouts-daily-6am', trigger: 'CRON_PAGOS_PROVEEDORES_6AM', schedule: '0 6 * * *', expectedIntervalMinutes: 1440 },
  { id: 'tour-24h-reminder-7am', trigger: 'CRON_RECORDATORIO_24H_7AM', schedule: '0 7 * * *', expectedIntervalMinutes: 1440 },
  { id: 'provider-confirmation-reminders-6h', trigger: 'CRON_RECORDATORIO_PROVEEDORES_6H', schedule: '15 */6 * * *', expectedIntervalMinutes: 360 },
  { id: 'booking-surveillance-2h', trigger: 'CRON_VIGILANCIA_2H', schedule: '0 */2 * * *', expectedIntervalMinutes: 120 },
  { id: 'post-tour-reviews-5pm', trigger: 'CRON_RESENAS_POST_TOUR_5PM', schedule: '0 17 * * *', expectedIntervalMinutes: 1440 },
  { id: 'daily-report-8pm', trigger: 'CRON_REPORTE_DIARIO_8PM', schedule: '0 20 * * *', expectedIntervalMinutes: 1440 },
  { id: 'weather-watch-4h', trigger: 'CRON_CLIMA_4H', schedule: '0 */4 * * *', expectedIntervalMinutes: 240 },
  { id: 'morning-concierge-630am', trigger: 'CRON_CONCIERGE_MATUTINO_630AM', schedule: '30 6 * * *', expectedIntervalMinutes: 1440 },
  { id: 'presale-recovery-1h', trigger: 'CRON_RECUPERACION_PREVENTA_1H', schedule: '0 * * * *', expectedIntervalMinutes: 60 },
  { id: 'vip-loyalty-10am', trigger: 'CRON_FIDELIZACION_VIP_10AM', schedule: '0 10 * * *', expectedIntervalMinutes: 1440 },
  { id: 'provider-inbox-1m', trigger: 'CRON_PROVIDER_INBOX_1M', schedule: '* * * * *', expectedIntervalMinutes: 1 },
  { id: 'reservation-lifecycle-1m', trigger: 'CRON_RESERVATION_LIFECYCLE_1M', schedule: '* * * * *', expectedIntervalMinutes: 1 },
  { id: 'email-operations-1m', trigger: 'CRON_EMAIL_OPERATIONS_1M', schedule: '* * * * *', expectedIntervalMinutes: 1 },
  { id: 'soft-hold-cleanup-5m', trigger: null, schedule: '*/5 * * * *', expectedIntervalMinutes: 5 },
  { id: 'jarvis-supervision-1m', trigger: 'CRON_JARVIS_SUPERVISION_1M', schedule: '* * * * *', expectedIntervalMinutes: 1 },
];

export const HEARTBEAT_COLLECTION = 'automation_locks';
export const HEARTBEAT_THROTTLE_MS = 15 * 60 * 1000;
const HIGH_FREQUENCY_MAX_MINUTES = 5;
const HEARTBEAT_INSTANCE = String(process.env.K_REVISION || process.env.VERCEL_DEPLOYMENT_ID || process.env.HOSTNAME || 'local').slice(0, 64);

export type CronRunStatus = AutomationOutcomeStatus;
export interface CronHeartbeat {
  jobId: string;
  lastStatus: CronRunStatus;
  lastStartedAt: string;
  lastFinishedAt: string;
  lastDurationMs: number;
  lastError: string | null;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  instance: string;
  updatedAt: string;
}

/** Recorta y limpia errores: sin e-mails, teléfonos ni tokens largos. */
export function sanitizeHeartbeatError(message: unknown, max = 240): string {
  return String(message ?? '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\+?\d[\d\s-]{6,}\d/g, '[tel]')
    .replace(/[A-Za-z0-9_-]{32,}/g, '[token]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

const heartbeatWrites = new Map<string, { at: number; status: CronRunStatus }>();
const memoryHeartbeats = new Map<string, CronHeartbeat>();
export function __resetCronHeartbeatsForTests() { heartbeatWrites.clear(); memoryHeartbeats.clear(); }

/** Jobs de alta frecuencia: una escritura cada 15 min salvo cambio de estado. El resto escribe siempre. */
export function shouldPersistHeartbeat(expectedIntervalMinutes: number, jobId: string, status: CronRunStatus, nowMs: number): boolean {
  if (expectedIntervalMinutes > HIGH_FREQUENCY_MAX_MINUTES) return true;
  const prev = heartbeatWrites.get(jobId);
  return !prev || prev.status !== status || nowMs - prev.at >= HEARTBEAT_THROTTLE_MS;
}

async function persistCronHeartbeat(def: CronJobDefinition, hb: CronHeartbeat, nowMs: number): Promise<boolean> {
  if (!shouldPersistHeartbeat(def.expectedIntervalMinutes, def.id, hb.lastStatus, nowMs)) return false;
  heartbeatWrites.set(def.id, { at: nowMs, status: hb.lastStatus });
  const db = getFirestoreDb();
  if (!db) { memoryHeartbeats.set(def.id, { ...(memoryHeartbeats.get(def.id) || {}), ...hb }); return true; }
  try {
    await db.collection(HEARTBEAT_COLLECTION).doc(def.id).set({ heartbeat: hb }, { merge: true });
    return true;
  } catch (error: any) {
    console.warn('[cron-heartbeat] no guardado:', sanitizeHeartbeatError(error?.message));
    return false;
  }
}

/**
 * Ejecuta un job registrando inicio/fin/estado/duración. Nunca altera el
 * resultado del job ni propaga fallos del registro.
 */
export async function runTrackedCronJob(jobId: string, fn: () => Promise<unknown> | unknown, clock: () => number = Date.now): Promise<CronHeartbeat | null> {
  const def = CRON_JOBS.find(job => job.id === jobId);
  if (!def) throw new Error(`cron_job_not_registered:${jobId}`);
  const started = clock();
  let status: CronRunStatus = 'success';
  let error: string | null = null;
  try {
    const { outcome } = await runWithAutomationOutcome(fn);
    if (outcome.status) status = outcome.status;
    if (status === 'error') error = sanitizeHeartbeatError(outcome.summary || 'Fallo');
  } catch (err: any) {
    status = 'error';
    error = sanitizeHeartbeatError(err?.message || err);
    console.error(`❌ Job ${jobId} lanzó un error no controlado:`, error);
  }
  const finished = clock();
  const finishedAt = new Date(finished).toISOString();
  const hb: CronHeartbeat = {
    jobId,
    lastStatus: status,
    lastStartedAt: new Date(started).toISOString(),
    lastFinishedAt: finishedAt,
    lastDurationMs: Math.max(0, finished - started),
    lastError: error,
    ...(status === 'success' || status === 'warning' ? { lastSuccessAt: finishedAt } : {}),
    ...(status === 'error' ? { lastErrorAt: finishedAt } : {}),
    instance: HEARTBEAT_INSTANCE,
    updatedAt: finishedAt,
  };
  try { return (await persistCronHeartbeat(def, hb, finished)) ? hb : null; } catch { return null; }
}

function scheduleTracked(jobId: string, expression: string, fn: () => Promise<unknown> | unknown, options?: Parameters<typeof cron.schedule>[2]) {
  return cron.schedule(expression, () => { void runTrackedCronJob(jobId, fn); }, options);
}

export type CronJobHealth = 'ok' | 'warning' | 'failed' | 'overdue' | 'no_signal';

/** Atrasado = sin heartbeat dentro de intervalo + margen (el margen cubre el throttle de 15 min). */
export function cronJobHealth(def: CronJobDefinition, hb: Pick<CronHeartbeat, 'lastStatus' | 'lastFinishedAt'> | null, nowMs: number): CronJobHealth {
  if (!hb || !hb.lastFinishedAt) return 'no_signal';
  const age = nowMs - Date.parse(hb.lastFinishedAt);
  const graceMinutes = Math.max(20, def.expectedIntervalMinutes * 0.25);
  if (!Number.isFinite(age) || age > (def.expectedIntervalMinutes + graceMinutes) * 60_000) return 'overdue';
  if (hb.lastStatus === 'error') return 'failed';
  if (hb.lastStatus === 'warning') return 'warning';
  return 'ok';
}

/** Estado de los crons para el Centro de Control (sobre de evidencia). Nunca lanza. */
export async function getCronHeartbeatEvidence(now: Date = new Date()) {
  const observedAt = now.toISOString();
  const db = getFirestoreDb();
  let beats = new Map<string, CronHeartbeat>();
  let source = 'memory:cron_heartbeats';
  if (!db) beats = new Map(memoryHeartbeats);
  else {
    source = `firestore:${HEARTBEAT_COLLECTION}.heartbeat`;
    try {
      const snap = await db.collection(HEARTBEAT_COLLECTION).get();
      snap.docs.forEach((doc: any) => { const hb = doc.data()?.heartbeat; if (hb && typeof hb === 'object') beats.set(doc.id, hb); });
    } catch (error: any) {
      console.warn('[cron-heartbeat] lectura fallida:', sanitizeHeartbeatError(error?.message));
      return { value: null, state: 'unavailable' as const, source, observedAt, note: 'No se pudieron leer los heartbeats.' };
    }
  }
  const jobs = CRON_JOBS.map(def => {
    const hb = beats.get(def.id) || null;
    return {
      id: def.id, trigger: def.trigger, schedule: def.schedule, expectedIntervalMinutes: def.expectedIntervalMinutes,
      health: cronJobHealth(def, hb, now.getTime()),
      lastStatus: hb?.lastStatus ?? null, lastFinishedAt: hb?.lastFinishedAt ?? null, lastDurationMs: hb?.lastDurationMs ?? null,
      lastError: hb?.lastError ?? null, lastSuccessAt: hb?.lastSuccessAt ?? null, lastErrorAt: hb?.lastErrorAt ?? null,
    };
  });
  const alerts = jobs.filter(j => j.health === 'overdue' || j.health === 'failed').map(j => ({ jobId: j.id, kind: j.health === 'overdue' ? 'atrasado' as const : 'fallido' as const, since: j.health === 'overdue' ? j.lastFinishedAt : j.lastErrorAt }));
  const withSignal = jobs.filter(j => j.health !== 'no_signal').length;
  return {
    value: {
      jobs, alerts,
      counts: { total: jobs.length, ok: jobs.filter(j => j.health === 'ok').length, overdue: jobs.filter(j => j.health === 'overdue').length, failed: jobs.filter(j => j.health === 'failed').length, noSignal: jobs.length - withSignal },
    },
    state: (withSignal === 0 ? 'unavailable' : withSignal < jobs.length || !db ? 'partial' : 'measured') as 'measured' | 'partial' | 'unavailable',
    source, observedAt,
    note: 'Jobs de cada minuto escriben como máx. cada 15 min. Cloud Run con min-instances=0: un job "atrasado" puede reflejar instancia dormida.',
  };
}

export function initializeAutomationEngine() {
  console.log('⚙️ Inicializando Motor Cron Nativo de Costa Rica Tours (Zona Horaria: America/Costa_Rica)...');

  const CR_TIMEZONE = { timezone: 'America/Costa_Rica' };

  // 1. CRON: PAGOS A PROVEEDORES (Diario 6:00 AM Costa Rica)
  // El servicio financiero es fail-closed y requiere ENABLE_PROVIDER_PAYOUTS=true,
  // credenciales PayPal live, pago verificado, proveedor confirmado y fecha ya cumplida.
  scheduleTracked('provider-payouts-daily-6am', '0 6 * * *', async () => {
    console.log('🕒 [CRON 06:00 AM CR] Ejecutando: Liquidación Segura a Proveedores');
    try {
      const res = await withDistributedAutomationLock('provider-payouts-daily-6am', executeAutomatedProviderPayouts);
      if (!res) {
        logAutomationExecution('CRON_PAGOS_PROVEEDORES_6AM', 0, 'warning', 'Ejecución omitida: otro runtime mantiene el lock distribuido.');
        return;
      }
      const level = res.success ? 'success' : 'warning';
      const blocked = res.blockedReason ? ` Bloqueado: ${res.blockedReason}.` : '';
      logAutomationExecution(
        'CRON_PAGOS_PROVEEDORES_6AM',
        0,
        level,
        `Payout seguro: ${res.totalProcessed} procesadas, $${res.totalPaidUSD} USD confirmados como pagados.${blocked}`
      );
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_PAGOS_PROVEEDORES_6AM:', error);
      logAutomationExecution('CRON_PAGOS_PROVEEDORES_6AM', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 2. CRON: RECORDATORIO 24H ANTES DEL TOUR (Diario 7:00 AM Costa Rica)
  scheduleTracked('tour-24h-reminder-7am', '0 7 * * *', async () => {
    console.log('🕒 [CRON 07:00 AM CR] Ejecutando: Recordatorios 24h Antes del Tour');
    try {
      const res = await executeTour24hReminders();
      logAutomationExecution('CRON_RECORDATORIO_24H_7AM', 0, 'success', `Recordatorios para ${res.tomorrowDate}: ${res.totalRemindersSent} enviados.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_RECORDATORIO_24H_7AM:', error);
      logAutomationExecution('CRON_RECORDATORIO_24H_7AM', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 2b. CRON: RECORDATORIO A PROVEEDORES SIN CONFIRMAR (Cada 6 horas)
  // Reemplaza el workflow n8n "Seguimiento a Proveedores (IA)".
  scheduleTracked('provider-confirmation-reminders-6h', '15 */6 * * *', async () => {
    try {
      const res = await withDistributedAutomationLock('provider-confirmation-reminders-6h', () => executeProviderConfirmationReminders());
      if (res) logAutomationExecution('CRON_RECORDATORIO_PROVEEDORES_6H', 0, 'success', `Revisadas ${res.checked}, recordatorios ${res.reminded}, escaladas ${res.escalated}, sin email ${res.missingEmail}, errores ${res.errors}.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_RECORDATORIO_PROVEEDORES_6H:', error);
      logAutomationExecution('CRON_RECORDATORIO_PROVEEDORES_6H', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 3. CRON: VIGILANCIA Y ESCALAMIENTO DE RESERVAS (Cada 2 Horas)
  scheduleTracked('booking-surveillance-2h', '0 */2 * * *', async () => {
    console.log('🕒 [CRON CADA 2 HORAS] Ejecutando: Vigilancia y Escalamiento de Reservas');
    try {
      const res = await executeSurveillanceAndEscalation();
      logAutomationExecution('CRON_VIGILANCIA_2H', 0, 'success', `Vigilancia completada: ${res.checkedBookings} revisadas, ${res.alertsSent} alertas enviadas.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_VIGILANCIA_2H:', error);
      logAutomationExecution('CRON_VIGILANCIA_2H', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 4. CRON: SOLICITUD DE RESEÑA POST-TOUR (Diario 5:00 PM Costa Rica)
  scheduleTracked('post-tour-reviews-5pm', '0 17 * * *', async () => {
    console.log('🕒 [CRON 05:00 PM CR] Ejecutando: Solicitudes de Reseña Post-Tour');
    try {
      const res = await executePostTourReviewRequests();
      logAutomationExecution('CRON_RESENAS_POST_TOUR_5PM', 0, 'success', `Reseñas: ${res.eligibleBookings} elegibles, ${res.emailsSent} emails despachados.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_RESENAS_POST_TOUR_5PM:', error);
      logAutomationExecution('CRON_RESENAS_POST_TOUR_5PM', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 5. CRON: REPORTE DIARIO DE OPERACIÓN (Diario 8:00 PM Costa Rica)
  scheduleTracked('daily-report-8pm', '0 20 * * *', async () => {
    console.log('🕒 [CRON 08:00 PM CR] Ejecutando: Reporte Diario de Operación');
    try {
      const res = await executeDailyOperationReport();
      logAutomationExecution('CRON_REPORTE_DIARIO_8PM', 0, 'success', `Reporte diario ${res.reportDate}: ${res.totalBookingsToday} reservas, $${res.revenueUSD} USD facturados.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_REPORTE_DIARIO_8PM:', error);
      logAutomationExecution('CRON_REPORTE_DIARIO_8PM', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 6. CRON: ALERTA METEOROLÓGICA Y ADAPTACIÓN DE ITINERARIO (Cada 4 Horas)
  scheduleTracked('weather-watch-4h', '0 */4 * * *', async () => {
    console.log('🕒 [CRON C/4H] Ejecutando: Monitoreo Meteorológico y Seguridad');
    try {
      const res = await executeWeatherMonitoringAlerts();
      logAutomationExecution('CRON_CLIMA_4H', 0, 'success', `Monitoreo de clima: ${res.checkedBookings} evaluadas, ${res.alertsSent} avisos emitidos.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_CLIMA_4H:', error);
      logAutomationExecution('CRON_CLIMA_4H', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 7. CRON: CONCIERGE MATUTINO Y TIPS DE SEGURIDAD (Diario 6:30 AM Costa Rica)
  scheduleTracked('morning-concierge-630am', '30 6 * * *', async () => {
    console.log('🕒 [CRON 06:30 AM CR] Ejecutando: Concierge Matutino para Tours de Hoy');
    try {
      const res = await executeMorningConciergeTips();
      logAutomationExecution('CRON_CONCIERGE_MATUTINO_630AM', 0, 'success', `Concierge matutino: ${res.tipsSent} recomendaciones enviadas.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_CONCIERGE_MATUTINO_630AM:', error);
      logAutomationExecution('CRON_CONCIERGE_MATUTINO_630AM', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 8. CRON: RECUPERACIÓN DE PROSPECTOS Y CARRITOS ABANDONADOS (Cada 1 Hora)
  scheduleTracked('presale-recovery-1h', '0 * * * *', async () => {
    console.log('🕒 [CRON CADA HORA] Ejecutando: Recuperación de Prospectos Pre-Venta');
    try {
      const res = await executePreSaleProspectRecovery();
      logAutomationExecution('CRON_RECUPERACION_PREVENTA_1H', 0, 'success', `Recuperación pre-venta: ${res.recoveredSent} prospectos asistidos.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_RECUPERACION_PREVENTA_1H:', error);
      logAutomationExecution('CRON_RECUPERACION_PREVENTA_1H', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 9. CRON: FIDELIZACIÓN Y CUPONES VIP POST-VENTA (Diario 10:00 AM Costa Rica)
  scheduleTracked('vip-loyalty-10am', '0 10 * * *', async () => {
    console.log('🕒 [CRON 10:00 AM CR] Ejecutando: Fidelización y Cupones VIP Post-Venta');
    try {
      const res = await executePostSaleVipLoyalty();
      logAutomationExecution('CRON_FIDELIZACION_VIP_10AM', 0, 'success', `Fidelización VIP: ${res.couponsSent} cupones generados.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_FIDELIZACION_VIP_10AM:', error);
      logAutomationExecution('CRON_FIDELIZACION_VIP_10AM', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 10. CRON: AGENTE DE BANDEJA DE PROVEEDORES (Cada minuto)
  // Gmail OAuth es opcional: si no está configurado, el agente queda inactivo sin romper el resto del sistema.
  scheduleTracked('provider-inbox-1m', '* * * * *', async () => {
    try {
      const res = await withDistributedAutomationLock('provider-inbox-1m', processProviderInboxOnce);
      if (res?.enabled && (res.processed || res.errors)) {
        logAutomationExecution('CRON_PROVIDER_INBOX_1M', 0, res.errors ? 'warning' : 'success',
          'Bandeja de proveedores: ' + res.processed + ' procesadas, ' + res.errors + ' errores, ' + res.ignored + ' ignoradas.');
      }
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_PROVIDER_INBOX_1M:', error);
      logAutomationExecution('CRON_PROVIDER_INBOX_1M', 0, 'error', 'Fallo: ' + error.message);
    }
  }, CR_TIMEZONE);

  // 12. CRON: CICLO AUTÓNOMO DE RESERVAS (Cada minuto)
  // Revisa pagos, despacho a proveedor, confirmaciones y notificación al cliente.
  scheduleTracked('reservation-lifecycle-1m', '* * * * *', async () => {
    try {
      const res = await withDistributedAutomationLock('reservation-lifecycle-1m', () => runReservationLifecycleSweep(100));
      if (res && (res.scanned || res.errors)) {
        logAutomationExecution('CRON_RESERVATION_LIFECYCLE_1M', res.durationMs, res.errors ? 'warning' : 'success',
          'Ciclo de reservas: ' + res.scanned + ' revisadas, ' + res.results.filter((x: any) => x.status === 'completed').length + ' acciones, ' + res.errors + ' errores.');
      }
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_RESERVATION_LIFECYCLE_1M:', error);
      logAutomationExecution('CRON_RESERVATION_LIFECYCLE_1M', 0, 'error', 'Fallo: ' + error.message);
    }
  }, CR_TIMEZONE);

  // 11. CRON: AGENTE OMNICANAL DE CORREO (Cada minuto)
  // Revisa Gmail y Outlook, clasifica solicitudes, continúa reservas existentes
  // y responde automáticamente cuando la política de autonomía y la confianza lo permiten.
  scheduleTracked('email-operations-1m', '* * * * *', async () => {
    try {
      const res = await withDistributedAutomationLock('email-operations-1m', processEmailOperationsOnce);
      if (res && (res.scanned || res.errors.length)) {
        logAutomationExecution('CRON_EMAIL_OPERATIONS_1M', 0, res.errors.length ? 'warning' : 'success',
          'Correo autónomo: ' + res.scanned + ' escaneados, ' + res.results.length + ' procesados, ' + res.errors.length + ' errores.');
      }
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_EMAIL_OPERATIONS_1M:', error);
      logAutomationExecution('CRON_EMAIL_OPERATIONS_1M', 0, 'error', 'Fallo: ' + error.message);
    }
  }, CR_TIMEZONE);

  // 10. CRON: Liberación Automática de Soft Holds Expirados (Cada 5 minutos)
  scheduleTracked('soft-hold-cleanup-5m', '*/5 * * * *', async () => {
    await withDistributedAutomationLock('soft-hold-cleanup-5m', cleanupExpiredSoftHolds);
  });

  // JARVIS supervision: observes queued/failed delegated runs, retries at most
  // twice and escalates. It never executes a payment/message/publication itself.
  scheduleTracked('jarvis-supervision-1m', '* * * * *', async () => {
    try {
      const res = await withDistributedAutomationLock('jarvis-supervision-1m', () => runJarvisSupervisionSweep(25));
      if (res && (res.reconciled || res.failures.length)) {
        logAutomationExecution(
          'CRON_JARVIS_SUPERVISION_1M',
          0,
          res.failures.length ? 'warning' : 'success',
          'JARVIS supervision: ' + res.scanned + ' plans scanned, ' + res.reconciled + ' reconciled, ' + res.failures.length + ' failures.'
        );
      }
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_JARVIS_SUPERVISION_1M:', error);
      logAutomationExecution('CRON_JARVIS_SUPERVISION_1M', 0, 'error', 'Fallo: ' + error.message);
    }
  }, CR_TIMEZONE);

  console.log('✅ Motor de Automatizaciones Nativo (Node.js/Express) activo y programado.');
}
