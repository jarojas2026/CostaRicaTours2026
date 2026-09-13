import cron from 'node-cron';
import { dispatchToN8N } from './n8nService';
import { getWeeklyConversionMetrics, getAllBookings } from './bookingService';

export function initializeAutomationEngine() {
  console.log('⚙️ Inicializando Motor de Automatizaciones (Cron Engine)...');

  // 1. CRON: Reporte Semanal de Conversión (Lunes a las 08:00 AM)
  cron.schedule('0 8 * * 1', async () => {
    console.log('🕒 Ejecutando Cron: Reporte Semanal de Conversión');
    try {
      const metrics = await getWeeklyConversionMetrics();
      await dispatchToN8N('/webhook/reporte-semanal-conversion', {
        trigger: 'CRON_SEMANAL_CONVERSION',
        periodo: metrics.period,
        tasaConversion: `${metrics.conversionRate}%`,
        volumenReservas: metrics.totalBookings,
        reservasConfirmadas: metrics.confirmedBookings,
        ingresosTotalesUSD: metrics.totalRevenueUSD,
        topTours: metrics.topTours
      });
      console.log('✅ Reporte semanal despachado a n8n.');
    } catch (error) {
      console.error('❌ Error ejecutando CRON_SEMANAL_CONVERSION:', error);
    }
  });

  // 2. CRON: Monitoreo de Soft Holds Expirados (Cada 5 minutos)
  cron.schedule('*/5 * * * *', async () => {
    console.log('🕒 Ejecutando Cron: Auditoría de Reservas Soft Hold Expiradas');
    try {
      // Simularíamos la búsqueda de reservas en Firestore con `status === 'hold'` y `expiresAt < Date.now()`
      const allBookings = await getAllBookings();
      const now = new Date().toISOString();
      
      const expiredHolds = allBookings.filter(b => 
        b.status === 'hold' && 
        b.holdExpiresAt && 
        b.holdExpiresAt < now
      );

      if (expiredHolds.length > 0) {
        console.log(`⚠️ Se encontraron ${expiredHolds.length} reservas expiradas. Despachando a n8n...`);
        for (const booking of expiredHolds) {
          await dispatchToN8N('/webhook/auto-release-hold', {
            trigger: 'AUTO_RELEASE_HOLD',
            bookingId: booking.id,
            expiredAt: booking.holdExpiresAt,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('❌ Error ejecutando Auditoría de Soft Holds:', error);
    }
  });

  // 3. CRON: Encuestas NPS Post-Tour (Diariamente a las 18:00)
  cron.schedule('0 18 * * *', async () => {
    console.log('🕒 Ejecutando Cron: Despacho de Encuestas NPS Post-Tour');
    try {
      await dispatchToN8N('/webhook/post-tour-nps', {
        trigger: 'CRON_NPS_DISPATCH',
        targetDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Tours de hace 24 hrs
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error ejecutando CRON NPS:', error);
    }
  });

  console.log('✅ Cron Engine activo y programado (3 procesos).');
}
