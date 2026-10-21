/**
 * Rutas transversales: salud, clima, métricas y operación.
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import { requireOperator } from '../authMiddleware';
import { updateBookingStatus, getWeeklyConversionMetrics } from '../bookingService';
import { massiveEngine } from '../massiveProcessingEngine';
import { createRouter } from './shared';
import { aiHealthHttpStatus, getAiHealth } from '../aiHealth';
import { getBreakerStates } from '../aiRouter';
import { getAiConfig, isBillingBlocked } from '../aiConfig';

/** Health check. */
export const healthRouter = createRouter();

healthRouter.get('/api/health/ai', (_req, res) => {
  const health = getAiHealth();
  const cfg = getAiConfig();
  res.setHeader('Cache-Control', 'no-store');
  // 200 para available/unknown/unconfigured (status en el body); 503 solo si todos los configurados están degraded.
  res.status(aiHealthHttpStatus(health.providers)).json({
    ...health,
    policy: {
      provider: cfg.provider,
      fallbackEnabled: cfg.fallbackEnabled,
      maxCostUsd: cfg.maxCostUsd,
      allowExternalPii: cfg.allowExternalPii,
      billingBlocked: { gemini: isBillingBlocked('gemini'), claude: isBillingBlocked('claude'), openai_compat: isBillingBlocked('openai_compat') },
    },
    breakers: getBreakerStates(),
  });
});

healthRouter.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: 'Costa Rica Tours Native Automation Server',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/** Clima por destino. */
export const weatherRouter = createRouter();

weatherRouter.get('/api/weather/destinations', async (_req, res) => {
  try {
    const { getDestinationWeather } = await import('../weatherPulseService');
    const destinations = await getDestinationWeather();
    res.setHeader('cache-control', 'no-store');
    res.json({
      success: destinations.length > 0,
      source: destinations.length > 0 ? 'open-meteo' : 'unavailable',
      generatedAt: new Date().toISOString(),
      destinations,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Pronóstico de 5 días para la ficha /tour/:id (Open-Meteo, caché 1 h). */
weatherRouter.get('/api/weather/forecast', async (req, res) => {
  const { parseCostaRicaCoords, getTourForecast } = await import('../tourWeatherForecast');
  const coords = parseCostaRicaCoords(req.query.lat, req.query.lon);
  if (!coords) return res.status(400).json({ success: false, error: 'invalid_coordinates' });
  const forecast = await getTourForecast(coords.lat, coords.lon);
  if (!forecast) {
    res.setHeader('cache-control', 'no-store');
    return res.status(503).json({ success: false, error: 'forecast_unavailable' });
  }
  res.setHeader('cache-control', 'public, max-age=900, s-maxage=1800');
  return res.json({ success: true, ...forecast });
});

/** Métricas, procesamiento masivo y acciones de operación. */
export const opsMetricsRouter = createRouter();

// 9. Telemetría y Métricas en Tiempo Real de Procesamiento Masivo (RPS, Latencia, Concurrencia)
opsMetricsRouter.get(['/api/metrics/throughput', '/api/massive/status'], (req, res) => {
  const metrics = massiveEngine.getMetrics();
  res.json({
    success: true,
    platform: 'Costa Rica Tours 2026 - Massive Real-Time Processing Engine',
    timestamp: new Date().toISOString(),
    metrics
  });
});

// 10. Procesamiento Masivo Concurrente de Consultas en Lote (Batch Inquiries)
opsMetricsRouter.post(['/api/massive/batch-inquiries', '/api/massive/process-batch'], async (req, res) => {
  try {
    const inquiries = Array.isArray(req.body?.inquiries) ? req.body.inquiries : [req.body];
    const maxBatch = Number(process.env.MASSIVE_BATCH_MAX || 10);
    if (inquiries.length > maxBatch) {
      return res.status(413).json({ success: false, error: 'batch_too_large', maxBatch });
    }
    const results = await Promise.allSettled(
      inquiries.map((inquiry: any) =>
        massiveEngine.enqueue(
          'INQUIRY_CACHE_PROCESSING',
          inquiry,
          'INQUIRY_CACHE'
        )
      )
    );

    res.json({
      success: true,
      totalBatch: inquiries.length,
      processed: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results: results.map(r => r.status === 'fulfilled' ? (r as any).value : { error: (r as any).reason?.message })
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check para compatibilidad
opsMetricsRouter.all('/webhook/health-check', (req, res) => {
  res.json({ status: 'ok', service: 'costa-rica-tours-native-engine', timestamp: new Date().toISOString() });
});

// ==========================================
// 📊 ANALÍTICA NATIVA Y ACCIONES DE RESERVA
// ==========================================
opsMetricsRouter.get('/api/analytics/conversion-report', async (req, res) => {
  try {
    const metrics = await getWeeklyConversionMetrics();
    res.json({ success: true, data: metrics, source: 'firestore-native' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Acciones internas autenticadas para operaciones: confirmar, cancelar, reagendar o emitir voucher.
opsMetricsRouter.post('/api/ops/booking-action', requireOperator, async (req, res) => {
  try {
    const { bookingId, action, payload } = req.body || {};
    if (!bookingId || !action) return res.status(400).json({ error: 'Faltan bookingId y action' });
    const updates: any = action === 'confirm'
      ? { status: 'confirmada', paymentStatus: 'completed' }
      : action === 'cancel'
        ? { status: 'cancelada', cancellationReason: payload?.reason || 'Cancelado por operaciones' }
        : action === 'reschedule'
          ? { date: payload?.date, time: payload?.time || '08:00 AM' }
          : action === 'add_voucher'
            ? { voucherUrl: payload?.voucherUrl, voucherCode: payload?.voucherCode }
            : null;
    if (!updates) return res.status(400).json({ error: 'Acción no soportada' });
    const result = await updateBookingStatus(bookingId, updates);
    res.json({ success: result.success, action, booking: result.booking });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
