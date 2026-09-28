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

// Legacy post-booking workflows still contain older assumptions about what
// constitutes a confirmed service. They remain available for migration/testing,
// but production cron execution is fail-closed until explicitly enabled after
// their lifecycle contracts have been verified.
const PROVIDER_PAYOUTS_ENABLED = process.env.ENABLE_PROVIDER_PAYOUTS === 'true';
const LEGACY_POST_BOOKING_AUTOMATIONS_ENABLED = process.env.ENABLE_LEGACY_POST_BOOKING_AUTOMATIONS === 'true';

// =========================================================================
// 6. CRON: Liberación Automática de Soft Holds Expirados (Cada 5 minutos)
// =========================================================================
export async function cleanupExpiredSoftHolds() {
  try {
    const allBookings = await getAllBookings();
    const now = new Date().toISOString();

    const expiredHolds = allBookings.filter(b =>
      (b.status === 'hold' || b.status === 'pendiente_pago' || b.status === 'payment_pending' || b.holdActive) &&
      b.holdExpiresAt &&
      b.holdExpiresAt < now
    );

    let releasedCount = 0;
    for (const booking of expiredHolds) {
      const bookingId = booking.id || booking.bookingId;
      const result = await updateBookingStatus(bookingId, {
        // Cancellation is the existing availability-release path. Preserve the
        // business reason separately so an expired hold is not confused with a
        // traveler-requested cancellation.
        status: 'cancelada',
        lifecycle: 'cancelled',
        cancellationReason: 'soft_hold_expired',
        holdActive: false,
        expiredAt: new Date().toISOString()
      });
      if (!result.success) {
        logAutomationExecution(
          'AUTO_RELEASE_HOLD',
          0,
          'error',
          `No se pudo liberar el hold expirado ${bookingId}: ${result.error || 'error desconocido'}`
        );
        continue;
      }
      releasedCount += 1;
      logAutomationExecution(
        'AUTO_RELEASE_HOLD',
        5,
        'success',
        `Cupo liberado automáticamente para hold expirado: ${bookingId}`
      );
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
      tx.set(ref, {
        status: 'running',
        acquiredAt: now,
        updatedAt: now,
        owner: process.env.VERCEL_REGION || process.env.HOSTNAME || 'node'
      }, { merge: true });
    });
  } catch (error: any) {
    if (error?.message === 'automation_lock_busy') return null;
    throw error;
  }
  try {
    return await work();
  } finally {
    await ref.set({
      status: 'idle',
      releasedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => undefined);
  }
}

export function initializeAutomationEngine() {
  console.log('⚙️ Inicializando Motor Cron Nativo de Costa Rica Tours (Zona Horaria: America/Costa_Rica)...');

  const CR_TIMEZONE = { timezone: 'America/Costa_Rica' };

  // 1. PAGOS A PROVEEDORES
  // Fail-closed: el flujo legado puede interpretar pago del cliente como
  // confirmación operativa. Solo se agenda si la política se habilita de forma
  // explícita después de validar reglas de liquidación y proveedor.
  if (PROVIDER_PAYOUTS_ENABLED) {
    cron.schedule('0 6 * * *', async () => {
      console.log('🕒 [CRON 06:00 AM CR] Ejecutando: Pagos a Proveedores');
      try {
        const res = await withDistributedAutomationLock('provider-payouts-6am', executeAutomatedProviderPayouts);
        if (res) {
          logAutomationExecution(
            'CRON_PAGOS_PROVEEDORES_6AM',
            0,
            'success',
            `Pagos ejecutados: ${res.totalProcessed} procesadas, $${res.totalPaidUSD} USD liquidados.`
          );
        }
      } catch (error: any) {
        console.error('❌ Error ejecutando CRON_PAGOS_PROVEEDORES_6AM:', error);
        logAutomationExecution('CRON_PAGOS_PROVEEDORES_6AM', 0, 'error', `Fallo: ${error.message}`);
      }
    }, CR_TIMEZONE);
  } else {
    console.warn('🔒 Pagos automáticos a proveedores deshabilitados. Configure ENABLE_PROVIDER_PAYOUTS=true solo tras validar la política de liquidación.');
  }

  // 2, 4, 5, 6, 7 y 9. Automatizaciones post-booking legadas.
  // Permanecen en el código para migración y pruebas, pero no deben enviar
  // comunicaciones/cupones ni inferir confirmación desde paymentStatus en
  // producción sin una habilitación deliberada.
  if (LEGACY_POST_BOOKING_AUTOMATIONS_ENABLED) {
    cron.schedule('0 7 * * *', async () => {
      try {
        const res = await withDistributedAutomationLock('tour-reminders-7am', executeTour24hReminders);
        if (res) logAutomationExecution('CRON_RECORDATORIO_24H_7AM', 0, 'success', `Recordatorios para ${res.tomorrowDate}: ${res.totalRemindersSent} enviados.`);
      } catch (error: any) {
        console.error('❌ Error ejecutando CRON_RECORDATORIO_24H_7AM:', error);
        logAutomationExecution('CRON_RECORDATORIO_24H_7AM', 0, 'error', `Fallo: ${error.message}`);
      }
    }, CR_TIMEZONE);

    cron.schedule('0 17 * * *', async () => {
      try {
        const res = await withDistributedAutomationLock('post-tour-reviews-5pm', executePostTourReviewRequests);
        if (res) logAutomationExecution('CRON_RESENAS_POST_TOUR_5PM', 0, 'success', `Reseñas: ${res.eligibleBookings} elegibles, ${res.emailsSent} emails despachados.`);
      } catch (error: any) {
        console.error('❌ Error ejecutando CRON_RESENAS_POST_TOUR_5PM:', error);
        logAutomationExecution('CRON_RESENAS_POST_TOUR_5PM', 0, 'error', `Fallo: ${error.message}`);
      }
    }, CR_TIMEZONE);

    cron.schedule('0 20 * * *', async () => {
      try {
        const res = await withDistributedAutomationLock('daily-ops-report-8pm', executeDailyOperationReport);
        if (res) logAutomationExecution('CRON_REPORTE_DIARIO_8PM', 0, 'success', `Reporte diario ${res.reportDate}: ${res.totalBookingsToday} reservas, $${res.revenueUSD} USD facturados.`);
      } catch (error: any) {
        console.error('❌ Error ejecutando CRON_REPORTE_DIARIO_8PM:', error);
        logAutomationExecution('CRON_REPORTE_DIARIO_8PM', 0, 'error', `Fallo: ${error.message}`);
      }
    }, CR_TIMEZONE);

    cron.schedule('0 */4 * * *', async () => {
      try {
        const res = await withDistributedAutomationLock('legacy-weather-monitor-4h', executeWeatherMonitoringAlerts);
        if (res) logAutomationExecution('CRON_CLIMA_4H', 0, 'success', `Monitoreo legado de clima: ${res.checkedBookings} evaluadas, ${res.alertsSent} avisos emitidos.`);
      } catch (error: any) {
        console.error('❌ Error ejecutando CRON_CLIMA_4H:', error);
        logAutomationExecution('CRON_CLIMA_4H', 0, 'error', `Fallo: ${error.message}`);
      }
    }, CR_TIMEZONE);

    cron.schedule('30 6 * * *', async () => {
      try {
        const res = await withDistributedAutomationLock('morning-concierge-630am', executeMorningConciergeTips);
        if (res) logAutomationExecution('CRON_CONCIERGE_MATUTINO_630AM', 0, 'success', `Concierge matutino: ${res.tipsSent} recomendaciones enviadas.`);
      } catch (error: any) {
        console.error('❌ Error ejecutando CRON_CONCIERGE_MATUTINO_630AM:', error);
        logAutomationExecution('CRON_CONCIERGE_MATUTINO_630AM', 0, 'error', `Fallo: ${error.message}`);
      }
    }, CR_TIMEZONE);

    cron.schedule('0 10 * * *', async () => {
      try {
        const res = await withDistributedAutomationLock('legacy-vip-loyalty-10am', executePostSaleVipLoyalty);
        if (res) logAutomationExecution('CRON_FIDELIZACION_VIP_10AM', 0, 'success', `Fidelización VIP: ${res.couponsSent} cupones generados.`);
      } catch (error: any) {
        console.error('❌ Error ejecutando CRON_FIDELIZACION_VIP_10AM:', error);
        logAutomationExecution('CRON_FIDELIZACION_VIP_10AM', 0, 'error', `Fallo: ${error.message}`);
      }
    }, CR_TIMEZONE);
  } else {
    console.warn('🔒 Automatizaciones post-booking legadas deshabilitadas hasta completar migración a estados confirmed/in_operation/completed.');
  }

  // 3. Vigilancia y escalamiento de reservas pendientes (cada 2 horas).
  cron.schedule('0 */2 * * *', async () => {
    try {
      const res = await withDistributedAutomationLock('booking-surveillance-2h', executeSurveillanceAndEscalation);
      if (res) logAutomationExecution('CRON_VIGILANCIA_2H', 0, 'success', `Vigilancia: ${res.checkedBookings} revisadas, ${res.alertsSent} alertas.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_VIGILANCIA_2H:', error);
      logAutomationExecution('CRON_VIGILANCIA_2H', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 8. Recuperación de prospectos/pre-venta (cada hora).
  cron.schedule('0 * * * *', async () => {
    try {
      const res = await withDistributedAutomationLock('pre-sale-recovery-1h', executePreSaleProspectRecovery);
      if (res) logAutomationExecution('CRON_RECUPERACION_PREVENTA_1H', 0, 'success', `Recuperación pre-venta: ${res.recoveredSent} prospectos asistidos.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_RECUPERACION_PREVENTA_1H:', error);
      logAutomationExecution('CRON_RECUPERACION_PREVENTA_1H', 0, 'error', `Fallo: ${error.message}`);
    }
  }, CR_TIMEZONE);

  // 10. Agente de bandeja de proveedores (cada minuto).
  // Gmail OAuth es opcional: si no está configurado, el agente queda inactivo sin romper el resto del sistema.
  cron.schedule('* * * * *', async () => {
    try {
      const res = await withDistributedAutomationLock('provider-inbox-1m', processProviderInboxOnce);
      if (res?.enabled && (res.processed || res.errors)) {
        logAutomationExecution(
          'CRON_PROVIDER_INBOX_1M',
          0,
          res.errors ? 'warning' : 'success',
          'Bandeja de proveedores: ' + res.processed + ' procesadas, ' + res.errors + ' errores, ' + res.ignored + ' ignoradas.'
        );
      }
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_PROVIDER_INBOX_1M:', error);
      logAutomationExecution('CRON_PROVIDER_INBOX_1M', 0, 'error', 'Fallo: ' + error.message);
    }
  }, CR_TIMEZONE);

  // 11. Ciclo autónomo de reservas (cada minuto).
  // Este es el orquestador canónico: pago -> proveedor -> confirmación -> cliente.
  cron.schedule('* * * * *', async () => {
    try {
      const res = await withDistributedAutomationLock('reservation-lifecycle-1m', () => runReservationLifecycleSweep(100));
      if (res && (res.scanned || res.errors)) {
        logAutomationExecution(
          'CRON_RESERVATION_LIFECYCLE_1M',
          res.durationMs,
          res.errors ? 'warning' : 'success',
          'Ciclo de reservas: ' + res.scanned + ' revisadas, ' + res.results.filter((x: any) => x.status === 'completed').length + ' acciones, ' + res.errors + ' errores.'
        );
      }
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_RESERVATION_LIFECYCLE_1M:', error);
      logAutomationExecution('CRON_RESERVATION_LIFECYCLE_1M', 0, 'error', 'Fallo: ' + error.message);
    }
  }, CR_TIMEZONE);

  // 12. Agente omnicanal de correo (cada minuto).
  cron.schedule('* * * * *', async () => {
    try {
      const res = await withDistributedAutomationLock('email-operations-1m', processEmailOperationsOnce);
      if (res && (res.scanned || res.errors.length)) {
        logAutomationExecution(
          'CRON_EMAIL_OPERATIONS_1M',
          0,
          res.errors.length ? 'warning' : 'success',
          'Correo autónomo: ' + res.scanned + ' escaneados, ' + res.results.length + ' procesados, ' + res.errors.length + ' errores.'
        );
      }
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_EMAIL_OPERATIONS_1M:', error);
      logAutomationExecution('CRON_EMAIL_OPERATIONS_1M', 0, 'error', 'Fallo: ' + error.message);
    }
  }, CR_TIMEZONE);

  // 13. Liberación automática de soft holds expirados (cada 5 minutos).
  cron.schedule('*/5 * * * *', async () => {
    try {
      await withDistributedAutomationLock('soft-hold-cleanup-5m', cleanupExpiredSoftHolds);
    } catch (error: any) {
      console.error('❌ Error ejecutando soft-hold-cleanup-5m:', error);
      logAutomationExecution('CRON_SOFT_HOLD_CLEANUP_5M', 0, 'error', 'Fallo: ' + error.message);
    }
  }, CR_TIMEZONE);

  console.log('✅ Motor de Automatizaciones Nativo activo. Lifecycle, correo, proveedor, pre-venta y holds usan locks distribuidos.');
}