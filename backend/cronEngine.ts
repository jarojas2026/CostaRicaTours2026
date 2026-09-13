import cron from 'node-cron';
import { getWeeklyConversionMetrics, getAllBookings, updateBookingStatus } from './bookingService';
import { executeReporteSemanalConversion, executePostTourNPS, logAutomationExecution } from './nativeAutomationEngine';

export function initializeAutomationEngine() {
  console.log('⚙️ Inicializando Motor de Automatizaciones 100% en Código Nativo (Cron Engine)...');

  // 1. CRON: Reporte Semanal de Conversión (Lunes a las 08:00 AM)
  cron.schedule('0 8 * * 1', async () => {
    console.log('🕒 Ejecutando Cron Nativo: Reporte Semanal de Conversión');
    try {
      const result = await executeReporteSemanalConversion();
      console.log('✅ Reporte semanal generado y procesado en código nativo:', result.metrics.period);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON_SEMANAL_CONVERSION:', error);
      logAutomationExecution('CRON_SEMANAL_CONVERSION', 0, 'error', `Fallo en cron semanal: ${error.message}`);
    }
  });

  // 2. CRON: Monitoreo y Liberación Automática de Soft Holds Expirados (Cada 5 minutos)
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
        console.log(`🕒 [CRON NATIVO] Liberando ${expiredHolds.length} reservas con soft-hold expirado...`);
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

  // 3. CRON: Encuestas NPS Post-Tour (Diariamente a las 18:00)
  cron.schedule('0 18 * * *', async () => {
    console.log('🕒 Ejecutando Cron Nativo: Despacho de Encuestas NPS Post-Tour');
    try {
      const allBookings = await getAllBookings();
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      const finishedTours = allBookings.filter(b => 
        (b.status === 'confirmada' || b.paymentStatus === 'completed') &&
        b.date === yesterday
      );

      for (const booking of finishedTours) {
        await executePostTourNPS({
          bookingId: booking.bookingId || booking.id,
          tourName: booking.tourName,
          customerName: booking.customerName || booking.customer?.name,
          customerPhone: booking.customerPhone || booking.customer?.phone
        });
      }
      console.log(`✅ [CRON NATIVO] ${finishedTours.length} encuestas post-tour despachadas directamente.`);
    } catch (error: any) {
      console.error('❌ Error ejecutando CRON NPS:', error);
    }
  });

  console.log('✅ Motor de Automatizaciones Nativo (Node.js/Express) activo y programado.');
}
