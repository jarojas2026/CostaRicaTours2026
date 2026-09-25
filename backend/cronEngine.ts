/**
 * 🕒 MOTOR CRON DE AUTOMATIZACIONES NATIVAS (Costa Rica Tours)
 * =========================================================================
 * Ejecuta periódicamente las tareas de fondo programadas directamente
 * en el servidor Node.js/Express con zona horaria oficial 'America/Costa_Rica'.
 */

import cron from 'node-cron';
import { getAllBookings, updateBookingStatus, getFirestoreDb } from './bookingService';
import { logAutomationExecution } from './nativeAutomationEngine';
import { processProviderInboxOnce } from './providerInboxAgent';
import { runReservationLifecycleSweep } from './reservationLifecycleOrchestrator';
import { processEmailOperationsOnce } from './emailOperationsAgent';
import {
  executeAutomatedProviderPayouts,
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
    if (error?.message === 'automation_lock_busy') return null;
    throw error;
  }
  try {
    return await work();
  } finally {
    await ref.set({ status: 'idle', releasedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true }).catch(() => undefined);
  }
}

export function initializeAutomationEngine() {
  console.log('⚙️ Inicializando Motor Cron Nativo de Costa Rica Tours (Zona Horaria: America/Costa_Rica)...');

  const CR_TIMEZONE = { timezone: 'America/Costa_Rica' };

  // 1. CRON: PAGOS AUTOMÁTICOS A PROVEEDORES (Diario 6:00 AM Costa Rica)
  cron.schedule('0 6 * * *', async () => {
    console.log('🕒 [CRON 06:00 AM CR] Ejecutando: Pagos Automáticos a Proveedores');
    try {
      const res = await executeAutomatedProviderPayouts();
      logAutomationExecution('CRON_PAGOS_PROVEEDORES_6AM', 0, 'success', `Pagos ejecutados: ${res.totalProcessed} procesadas, $${res.totalPaidUSD} USD liquidados.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_PAGOS_PROVEEDORES_6AM:', error);
      logAutomationExecution('CRON_PAGOS_PROVEEDORES_6AM', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 2. CRON: RECORDATORIO 24H ANTES DEL TOUR (Diario 7:00 AM Costa Rica)
  cron.schedule('0 7 * * *', async () => {
    console.log('🕒 [CRON 07:00 AM CR] Ejecutando: Recordatorios 24h Antes del Tour');
    try {
      const res = await executeTour24hReminders();
      logAutomationExecution('CRON_RECORDATORIO_24H_7AM', 0, 'success', `Recordatorios para ${res.tomorrowDate}: ${res.totalRemindersSent} enviados.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_RECORDATORIO_24H_7AM:', error);
      logAutomationExecution('CRON_RECORDATORIO_24H_7AM', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 3. CRON: VIGILANCIA Y ESCALAMIENTO DE RESERVAS (Cada 2 Horas)
  cron.schedule('0 */2 * * *', async () => {
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
  cron.schedule('0 17 * * *', async () => {
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
  cron.schedule('0 20 * * *', async () => {
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
  cron.schedule('0 */4 * * *', async () => {
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
  cron.schedule('30 6 * * *', async () => {
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
  cron.schedule('0 * * * *', async () => {
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
  cron.schedule('0 10 * * *', async () => {
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
  cron.schedule('* * * * *', async () => {
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
  cron.schedule('* * * * *', async () => {
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
  cron.schedule('* * * * *', async () => {
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
  cron.schedule('*/5 * * * *', async () => {
    await withDistributedAutomationLock('soft-hold-cleanup-5m', cleanupExpiredSoftHolds);
  });

  console.log('✅ Motor de Automatizaciones Nativo (Node.js/Express) activo y programado.');
}
