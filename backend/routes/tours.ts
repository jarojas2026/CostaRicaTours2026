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
import { availableCurrencies, getExchangeRates } from '../exchangeRateService';

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

// Tipo de cambio: fuente única en backend/exchangeRateService.ts (BCCR para CRC,
// BCE vía Frankfurter para el resto), caché 6 h en memoria + Firestore.
// Compatibilidad: este endpoint conserva el contrato USD→CRC histórico.
toursRouter.get('/api/currency/exchange-rate', async (_req, res) => {
  const configuredRate = Number(process.env.USD_TO_CRC_RATE);
  if (Number.isFinite(configuredRate) && configuredRate > 0) {
    return res.json({ usdToCrc: configuredRate, crcToUsd: 1 / configuredRate, currency: 'CRC', source: 'runtime-config', updatedAt: new Date().toISOString() });
  }
  try {
    const snapshot = await getExchangeRates();
    const rate = snapshot.rates.CRC;
    if (!rate || !snapshot.sources.CRC) throw new Error('BCCR sin dato');
    res.setHeader('cache-control', 'public, max-age=1800');
    return res.json({
      usdToCrc: rate, usdToCrcBuy: snapshot.usdToCrcBuy, crcToUsd: 1 / rate, currency: 'CRC',
      source: snapshot.sources.CRC.label,
      rateDate: snapshot.sources.CRC.rateDate, updatedAt: snapshot.fetchedAt, stale: snapshot.stale,
    });
  } catch (err: any) {
    return res.status(503).json({
      error: 'Tipo de cambio no disponible.',
      message: 'No se pudo consultar el tipo de cambio oficial. Configure USD_TO_CRC_RATE como respaldo.',
      detail: err?.message,
    });
  }
});

// Todas las tasas con base USD, con fuente y fecha por moneda. Sin valores por defecto.
toursRouter.get('/api/currency/rates', async (_req, res) => {
  try {
    const snapshot = await getExchangeRates();
    const available = availableCurrencies(snapshot);
    if (available.length <= 1) {
      return res.status(503).json({
        error: 'Tipos de cambio no disponibles.',
        base: 'USD',
        rates: { USD: 1 },
        available: ['USD'],
        unavailable: snapshot.unavailable,
        fetchedAt: snapshot.fetchedAt,
      });
    }
    res.setHeader('cache-control', 'public, max-age=1800, s-maxage=3600');
    return res.json({ ...snapshot, available });
  } catch (err: any) {
    return res.status(503).json({ error: 'Tipos de cambio no disponibles.', base: 'USD', rates: { USD: 1 }, available: ['USD'], detail: err?.message });
  }
});
