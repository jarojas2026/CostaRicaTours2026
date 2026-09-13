/**
 * 🕒 MOTOR CRON DE AUTOMATIZACIONES NATIVAS (Costa Rica Tours)
 * =========================================================================
 * Ejecuta periódicamente las tareas de fondo programadas directamente
 * en el servidor Node.js/Express con zona horaria oficial 'America/Costa_Rica'.
 */

import cron from 'node-cron';
import { getAllBookings, updateBookingStatus } from './bookingService';
import { logAutomationExecution } from './nativeAutomationEngine';
import {
  executeAutomatedProviderPayouts,
  executeSurveillanceAndEscalation,
  executeDailyOperationReport,
  executePostTourReviewRequests,
  executeTour24hReminders
} from './nativeWorkflows';

export function initializeAutomationEngine() {
  console.log('⚙️ Inicializando Motor Cron Nativo de Costa Rica Tours (Zona Horaria: America/Costa_Rica)...');

  const CR_TIMEZONE = { timezone: 'America/Costa_Rica' };

  // =========================================================================
  // 1. CRON: PAGOS AUTOMÁTICOS A PROVEEDORES (Diario 6:00 AM Costa Rica)
  // Workflow 3: PayPal Payouts Idempotente por reserva con senderBatchId único
  // =========================================================================
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

  // =========================================================================
  // 2. CRON: RECORDATORIO 24H ANTES DEL TOUR (Diario 7:00 AM Costa Rica)
  // Workflow 7: Notifica al cliente de tours programados para el día de mañana
  // =========================================================================
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

  // =========================================================================
  // 3. CRON: VIGILANCIA Y ESCALAMIENTO DE RESERVAS (Cada 2 Horas)
  // Workflow 4: Escanea reservas en pendiente_pago > 2h y escala a Telegram
  // =========================================================================
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

  // =========================================================================
  // 4. CRON: SOLICITUD DE RESEÑA POST-TOUR (Diario 5:00 PM Costa Rica)
  // Workflow 6: Envía invitaciones de reseña con link a formulario propio
  // =========================================================================
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

  // =========================================================================
  // 5. CRON: REPORTE DIARIO DE OPERACIÓN (Diario 8:00 PM Costa Rica)
  // Workflow 5: Consolida métricas del día y envía resumen oficial a Telegram
  // =========================================================================
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

  // =========================================================================
  // 6. CRON: Liberación Automática de Soft Holds Expirados (Cada 5 minutos)
  // =========================================================================
  cron.schedule('*/5 * * * *', async () => {
    try {
      const allBookings = await getAllBookings();
      const now = new Date().toISOString();

      const expiredHolds = allBookings.filter(b =>
        (b.status === 'hold' || b.status === 'pendiente_pago' || b.holdActive) &&
        b.holdExpiresAt &&
        b.holdExpiresAt < now
      );

      if (expiredHolds.length > 0) {
        for (const booking of expiredHolds) {
          await updateBookingStatus(booking.id || booking.bookingId, {
            status: 'expirada',
            holdActive: false,
            liberadaAt: new Date().toISOString()
          });
          logAutomationExecution(
            'AUTO_RELEASE_HOLD',
            5,
            'success',
            `Cupo liberado automáticamente para reserva expirada: ${booking.bookingId || booking.id}`
          );
        }
      }
    } catch (error: any) {
      console.error('❌ Error ejecutando Auditoría de Soft Holds:', error);
    }
  });

  console.log('✅ Motor de Automatizaciones Nativo (Node.js/Express) activo y programado.');
}
