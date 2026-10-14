/**
 * Workflows nativos, webhooks heredados y jobs operativos.
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import path from 'path';
import { cleanupExpiredSoftHolds } from '../cronEngine';
import { getWeeklyConversionMetrics } from '../bookingService';
import { executeChatInquiry, executeInicioReserva, executeSolicitudPago, executeConfirmacionReserva, executeSolicitudItinerario, executeSolicitudSoporte, executeNotificarProveedor, executeEvaluarAntifraude, executeAIOpsAction, executeSyncCalendar, executePostTourNPS, executeReporteSemanalConversion, executeGenericAutomation, executeAutonomousMultiDayPlanner, executeDynamicPricingYieldOptimizer, executeEmergencyContingencyRerouting, executeDGTElectronicInvoicingSettlement, executeAutonomousFlightGuardDispatch, executeAutonomousCrisisSentimentEscalation, executeAutonomousFullBookingLifecycle, getNativeAutomationLogs, logAutomationExecution } from '../nativeAutomationEngine';
import { executeProviderRealtimeCoordination, executeSurveillanceAndEscalation, executeDailyOperationReport, executePostTourReviewRequests, executeTour24hReminders, executeWeatherMonitoringAlerts, executeMorningConciergeTips, executePreSaleProspectRecovery, executePostSaleVipLoyalty } from '../nativeWorkflows';
import { executeAutomatedProviderPayouts } from '../providerPayoutService';
import { createRouter, requireAdmin, requireAdminOrInternalJob, llmLimiter } from './shared';

/** Workflows nativos. */
export const nativeWorkflowsRouter = createRouter();

nativeWorkflowsRouter.get(['/api/native-engine/logs', '/api/native/logs'], requireAdmin, (req, res) => {
  const limit = Number(req.query.limit) || 50;
  res.json(getNativeAutomationLogs(limit));
});

// Despachadores manuales / UI de los 7 Workflows Nativos
nativeWorkflowsRouter.post('/api/native/workflows/payouts', requireAdmin, async (req, res) => {
  try {
    const result = await executeAutomatedProviderPayouts();
    logAutomationExecution('WF_PAGOS_PROVEEDORES', 3, 'success', `Manual: ${result.totalProcessed} procesadas, $${result.totalPaidUSD} USD.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_PAGOS_PROVEEDORES', 3, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

nativeWorkflowsRouter.post('/api/native/workflows/reminders', requireAdmin, async (req, res) => {
  try {
    const result = await executeTour24hReminders();
    logAutomationExecution('WF_RECORDATORIOS_24H', 7, 'success', `Manual: ${result.totalRemindersSent} recordatorios.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_RECORDATORIOS_24H', 7, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

nativeWorkflowsRouter.post('/api/native/workflows/surveillance', requireAdmin, async (req, res) => {
  try {
    const result = await executeSurveillanceAndEscalation();
    logAutomationExecution('WF_VIGILANCIA_2H', 4, 'success', `Manual: ${result.checkedBookings} auditadas, ${result.alertsSent} alertas.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_VIGILANCIA_2H', 4, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

nativeWorkflowsRouter.post('/api/native/workflows/reviews', requireAdmin, async (req, res) => {
  try {
    const result = await executePostTourReviewRequests();
    logAutomationExecution('WF_RESENAS_POST_TOUR', 6, 'success', `Manual: ${result.emailsSent} encuestas enviadas.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_RESENAS_POST_TOUR', 6, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

nativeWorkflowsRouter.post('/api/native/workflows/daily-report', requireAdmin, async (req, res) => {
  try {
    const result = await executeDailyOperationReport();
    logAutomationExecution('WF_REPORTE_DIARIO', 5, 'success', `Manual: ${result.totalBookingsToday} reservas, $${result.revenueUSD} USD.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_REPORTE_DIARIO', 5, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

nativeWorkflowsRouter.post('/api/native/workflows/cleanup-holds', requireAdmin, async (req, res) => {
  try {
    const result = await cleanupExpiredSoftHolds();
    logAutomationExecution('AUTO_RELEASE_HOLD', 5, 'success', `Manual: ${result.releasedCount} cupos liberados.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('AUTO_RELEASE_HOLD', 5, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

nativeWorkflowsRouter.post('/api/native/workflows/conversion-report', requireAdmin, async (req, res) => {
  try {
    const metrics = await getWeeklyConversionMetrics();
    logAutomationExecution('CRON_SEMANAL_CONVERSION', 5, 'success', `Manual: Tasa conv: ${metrics.conversionRate == null ? 'N/D' : metrics.conversionRate + '%'}, Ventas: $${metrics.totalRevenueUSD}.`);
    res.json({ success: true, metrics });
  } catch (err: any) {
    logAutomationExecution('CRON_SEMANAL_CONVERSION', 5, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

nativeWorkflowsRouter.post('/api/native/workflows/weather', requireAdmin, async (req, res) => {
  try {
    const result = await executeWeatherMonitoringAlerts();
    logAutomationExecution('WF_CLIMA_SEGURIDAD', 0, 'success', `Manual: ${result.checkedBookings} revisadas, ${result.alertsSent} avisos.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_CLIMA_SEGURIDAD', 0, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

nativeWorkflowsRouter.post('/api/native/workflows/concierge', requireAdmin, async (req, res) => {
  try {
    const result = await executeMorningConciergeTips();
    logAutomationExecution('WF_CONCIERGE_MATUTINO', 0, 'success', `Manual: ${result.tipsSent} tips enviados.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_CONCIERGE_MATUTINO', 0, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

nativeWorkflowsRouter.post('/api/native/workflows/prospects', requireAdmin, async (req, res) => {
  try {
    const result = await executePreSaleProspectRecovery();
    logAutomationExecution('WF_RECUPERACION_PROSPECTOS', 0, 'success', `Manual: ${result.recoveredSent} prospectos contactados.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_RECUPERACION_PROSPECTOS', 0, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

nativeWorkflowsRouter.post('/api/native/workflows/loyalty', requireAdmin, async (req, res) => {
  try {
    const result = await executePostSaleVipLoyalty();
    logAutomationExecution('WF_FIDELIZACION_VIP', 0, 'success', `Manual: ${result.couponsSent} cupones VIP emitidos.`);
    res.json({ success: true, result });
  } catch (err: any) {
    logAutomationExecution('WF_FIDELIZACION_VIP', 0, 'error', `Fallo: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🚀 PIPELINE 100% AUTÓNOMO (Sin intervención manual humana)
// Procesa la consulta -> Bloquea cupo -> Crea reserva -> Notifica al proveedor -> Envía voucher digital QR al cliente
nativeWorkflowsRouter.post(['/api/native/autonomous-booking-flow', '/api/native/flujo-autonomo'], requireAdmin, async (req, res) => {
  try {
    const result = await executeAutonomousFullBookingLifecycle(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Webhooks heredados y automatizaciones. */
export const legacyWebhooksRouter = createRouter();

// 1. Asistente Inteligente & Chat Oficial (Gemini 2.5 Flash + Base Oficial)
legacyWebhooksRouter.post(['/webhook/chat-consulta', '/api/chat', '/api/chat-consulta'], llmLimiter, async (req, res) => {
  try {
    const result = await executeChatInquiry(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 2. Inicio de Reserva & Soft-Hold en Firestore (15 minutos)
legacyWebhooksRouter.post('/api/reservas/inicio', async (req, res) => {
  try {
    const result = await executeInicioReserva(req.body);
    if (!result.exito && !result.disponible) {
      return res.status(409).json(result);
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 3. Solicitud de Pago & Conciliación Criptográfica HMAC
legacyWebhooksRouter.post('/api/pagos/solicitud', requireAdmin, async (req, res) => {
  try {
    const result = await executeSolicitudPago(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 4. Confirmación de Reserva, Voucher Digital QR & Notificaciones Multicanal
legacyWebhooksRouter.post('/api/reservas/confirmar', requireAdmin, async (req, res) => {
  try {
    const result = await executeConfirmacionReserva(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 5. Planificador de Rutas & Itinerarios IA Personalizados
legacyWebhooksRouter.post('/api/itinerario', async (req, res) => {
  try {
    const result = await executeSolicitudItinerario(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 6. Analítica en Tiempo Real
legacyWebhooksRouter.post('/webhook/evento-analitica', async (req, res) => {
  res.json({ exito: true, timestamp: new Date().toISOString() });
});

// 7. Soporte al Cliente, Escalación Multicanal & Concierge Urgente
legacyWebhooksRouter.post(['/webhook/solicitud-soporte', '/api/soporte/crear-ticket'], async (req, res) => {
  try {
    const result: any = await executeSolicitudSoporte(req.body);
    res.status(result?.estado === 'pending_manual' ? 202 : 200).json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 8. Coordinación y Notificación en Tiempo Real a Proveedores y Operadores Locales
legacyWebhooksRouter.post(['/webhook/notificar-proveedor', '/api/operadores/notificar'], requireAdmin, async (req, res) => {
  try {
    const result: any = await executeNotificarProveedor(req.body);
    res.status(result?.estado === 'pending_manual' ? 202 : 200).json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 9. Motor Antifraude y Matriz de Riesgo Criptográfica
legacyWebhooksRouter.post(['/webhook/evaluar-antifraude', '/webhook/antifraude-evaluacion', '/api/seguridad/antifraude'], async (req, res) => {
  try {
    const result = await executeEvaluarAntifraude(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 10. Operaciones de Terreno y Despacho a Guías (100% nativo)
legacyWebhooksRouter.post(['/webhook/panel-control-ops', '/api/ops/action'], requireAdmin, async (req, res) => {
  try {
    const result = await executeAIOpsAction(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 12. Sincronización Automática con Google Calendar
legacyWebhooksRouter.post(['/webhook/sync-calendar', '/api/calendario/sincronizar'], requireAdmin, async (req, res) => {
  try {
    const result: any = await executeSyncCalendar(req.body);
    res.status(result?.estado === 'pending_manual' ? 202 : 200).json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 13. Encuesta de Satisfacción Post-Tour & Recolección NPS WhatsApp
legacyWebhooksRouter.post(['/webhook/post-tour-nps', '/api/nps/despachar'], requireAdmin, async (req, res) => {
  try {
    const result: any = await executePostTourNPS(req.body);
    res.status(result?.estado === 'pending_manual' ? 202 : 200).json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 14. Reporte Semanal de Rendimiento, Conversión y Volumen
legacyWebhooksRouter.post(['/webhook/reporte-semanal-conversion', '/api/reportes/semanal'], requireAdmin, async (req, res) => {
  try {
    const result = await executeReporteSemanalConversion();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// ==========================================
// 🚀 WORKFLOWS COMPLEJOS Y SÚPER AVANZADOS (WF-COMPLEX-01 a 06 EN CÓDIGO NATIVO)
// ==========================================

// WF-COMPLEX-01: Orquestador Autónomo de Itinerarios Multidía (SINAC/IMN/Alsama)
legacyWebhooksRouter.post(['/webhook/autonomous-multi-day-planner', '/api/automations/multi-day-planner'], requireAdmin, async (req, res) => {
  try {
    const result = await executeAutonomousMultiDayPlanner(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// WF-COMPLEX-02: Motor Predictivo de Dynamic Pricing & Yield Management
legacyWebhooksRouter.post(['/webhook/predictive-dynamic-pricing', '/api/automations/dynamic-pricing'], requireAdmin, async (req, res) => {
  try {
    const result = await executeDynamicPricingYieldOptimizer(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// WF-COMPLEX-03: Matriz Predictiva de Contingencias Climáticas & Re-enrutamiento
legacyWebhooksRouter.post(['/webhook/weather-contingency-rerouting', '/api/automations/weather-contingency'], requireAdmin, async (req, res) => {
  try {
    const result = await executeEmergencyContingencyRerouting(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// WF-COMPLEX-04: Facturación Electrónica DGT Hacienda v4.3 & Liquidación Operadores
legacyWebhooksRouter.post(['/webhook/dgt-electronic-invoicing-settlement', '/api/automations/dgt-invoicing'], requireAdmin, async (req, res) => {
  try {
    const result = await executeDGTElectronicInvoicingSettlement(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// WF-COMPLEX-05: Flight Guard Predictivo en Tiempo Real & Despacho Alsama
legacyWebhooksRouter.post(['/webhook/flight-guard-autonomous-dispatch', '/api/automations/flight-guard'], requireAdmin, async (req, res) => {
  try {
    const result = await executeAutonomousFlightGuardDispatch(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// WF-COMPLEX-06: Asistente Autónomo con Análisis de Sentimiento & Escalamiento
legacyWebhooksRouter.post(['/webhook/crisis-sentiment-escalation', '/api/automations/crisis-sentiment'], requireAdmin, async (req, res) => {
  try {
    const result = await executeAutonomousCrisisSentimentEscalation(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// ==========================================
// 🚀 RUTAS ADICIONALES (WF-14 a WF-24 EJECUTADAS EN CÓDIGO NATIVO)
// ==========================================
const additionalWebhooks = [
  '/webhook/reserva-parques-sinac',
  '/webhook/alerta-vuelo-retrasado',
  '/webhook/reporte-objeto-olvidado',
  '/webhook/whatsapp-traductor-soporte',
  '/webhook/recepcion-vip-aeropuerto',
  '/webhook/alerta-requerimientos-especiales',
  '/webhook/cancelacion-reembolso-inteligente',
  '/webhook/entrega-fotos-recuerdos',
  '/webhook/sincronizacion-operadores-locales',
  '/webhook/alerta-emergencia-sos',
  '/webhook/booster-reseñas-incentivos',
  '/webhook/contingency',
  '/webhook/supervisor'
];

legacyWebhooksRouter.post(additionalWebhooks, requireAdmin, async (req, res) => {
  try {
    const endpoint = req.path;
    const triggerName = endpoint.replace('/webhook/', '').toUpperCase().replace(/-/g, '_');
    const result: any = await executeGenericAutomation(triggerName, req.body);
    res.status(result?.estado === 'pending_manual' ? 202 : 200).json(result);
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// ==========================================
// 🌿 LOS 7 WORKFLOWS NATIVOS DE NEGOCIO MIGRADOS
// ==========================================

// 1. Coordinación en Tiempo Real con Proveedores (Webhook & API Nativa)
legacyWebhooksRouter.post(['/webhook/proveedores-coordinacion', '/webhook/coordinacion-proveedores', '/api/webhooks/provider-coordination', '/api/native/workflows/coordinacion-proveedor', '/api/native/workflows/notificar-proveedor'], async (req, res) => {
  try {
    const authHeader = req.headers['x-webhook-secret'] as string;
    const result = await executeProviderRealtimeCoordination(req.body, authHeader);
    res.json(result);
  } catch (error: any) {
    const status = error.message.includes('No autorizado') ? 401 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/** Jobs operativos (cron / Cloud Scheduler). */
export const operationalJobsRouter = createRouter();

// 4. Vigilancia y Escalamiento de Reservas Pendientes (Cron Trigger)
operationalJobsRouter.post(['/api/surveillance/run-check', '/webhook/vigilancia-reservas'], requireAdminOrInternalJob, async (req, res) => {
  try {
    const result = await executeSurveillanceAndEscalation();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Reporte Diario de Operación (Cron Trigger)
operationalJobsRouter.post(['/api/reports/run-daily-ops', '/webhook/reporte-diario-operacion'], requireAdminOrInternalJob, async (req, res) => {
  try {
    const result = await executeDailyOperationReport();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Solicitud de Reseña Post-Tour (Cron Trigger)
operationalJobsRouter.post(['/api/reviews/run-request-batch', '/webhook/solicitud-resenas'], requireAdminOrInternalJob, async (req, res) => {
  try {
    const result = await executePostTourReviewRequests();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Recordatorio 24h Antes del Tour (Cron Trigger)
operationalJobsRouter.post(['/api/reminders/run-24h', '/webhook/recordatorio-24h'], requireAdminOrInternalJob, async (req, res) => {
  try {
    const result = await executeTour24hReminders();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
