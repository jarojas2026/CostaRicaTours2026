/**
 * Catálogo de tours: media, disponibilidad y tipo de cambio.
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import { TOURS } from '../../src/data/toursData';
import { getTourMediaById } from '../tourMediaService';
import { checkTourAvailability } from '../bookingService';
import { createRouter } from './shared';

/** Media, disponibilidad y tipo de cambio. */
export const toursRouter = createRouter();

// ==========================================
// 📦 SISTEMA DE RESERVAS Y DISPONIBILIDAD (FIRESTORE)
// ==========================================

// Catálogo visual por tour: una sola capa de infraestructura para hero, galería y metadatos de imagen.
toursRouter.get('/api/tours/:id/media', (req, res) => {
  try {
    const media = getTourMediaById(String(req.params.id), TOURS);
    if (!media) {
      return res.status(404).json({ error: 'Tour no encontrado' });
    }

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400');
    return res.json(media);
  } catch (error: any) {
    console.error('Tour media error:', error);
    return res.status(500).json({ error: 'No se pudo cargar el contenido visual del tour' });
  }
});

// Consulta de disponibilidad de cupos por tour
toursRouter.get('/api/tours/:id/availability', async (req, res) => {
  try {
    const { date, time, seats } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'El parámetro "date" es requerido.' });
    }

    const result = await checkTourAvailability(
      req.params.id,
      String(date),
      time ? String(time) : undefined,
      seats ? Number(seats) : 1
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Tipo de cambio: override manual (USD_TO_CRC_RATE) o el tipo de cambio de referencia
// del BCCR publicado por el Ministerio de Hacienda (api.hacienda.go.cr), con caché de 1 h.
let haciendaRateCache: { rate: number; buy: number; date: string; fetchedAt: number } | null = null;
async function fetchHaciendaRate() {
  if (haciendaRateCache && Date.now() - haciendaRateCache.fetchedAt < 60 * 60_000) return haciendaRateCache;
  const res = await fetch('https://api.hacienda.go.cr/indicadores/tc/dolar', { signal: AbortSignal.timeout(6_000) });
  if (!res.ok) throw new Error(`Hacienda ${res.status}`);
  const data: any = await res.json();
  const rate = Number(data?.venta?.valor);
  const buy = Number(data?.compra?.valor);
  if (!Number.isFinite(rate) || rate < 300 || rate > 1000) throw new Error('Tipo de cambio fuera de rango');
  haciendaRateCache = { rate, buy, date: String(data?.venta?.fecha || ''), fetchedAt: Date.now() };
  return haciendaRateCache;
}

toursRouter.get('/api/currency/exchange-rate', async (_req, res) => {
  const configuredRate = Number(process.env.USD_TO_CRC_RATE);
  if (Number.isFinite(configuredRate) && configuredRate > 0) {
    return res.json({ usdToCrc: configuredRate, crcToUsd: 1 / configuredRate, currency: 'CRC', source: 'runtime-config', updatedAt: new Date().toISOString() });
  }
  try {
    const live = await fetchHaciendaRate();
    res.setHeader('cache-control', 'public, max-age=1800');
    return res.json({
      usdToCrc: live.rate, usdToCrcBuy: live.buy, crcToUsd: 1 / live.rate, currency: 'CRC',
      source: 'BCCR vía Ministerio de Hacienda (api.hacienda.go.cr), tipo de cambio de venta',
      rateDate: live.date, updatedAt: new Date(live.fetchedAt).toISOString(),
    });
  } catch (err: any) {
    return res.status(503).json({
      error: 'Tipo de cambio no disponible.',
      message: 'No se pudo consultar el tipo de cambio oficial. Configure USD_TO_CRC_RATE como respaldo.',
      detail: err?.message,
    });
  }
});
