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

// Tipo de cambio configurable. No se usa un valor fijo obsoleto en producción.
toursRouter.get('/api/currency/exchange-rate', (_req, res) => {
  const configuredRate = Number(process.env.USD_TO_CRC_RATE);
  if (!Number.isFinite(configuredRate) || configuredRate <= 0) {
    return res.status(503).json({
      error: 'Tipo de cambio no configurado.',
      message: 'Configure USD_TO_CRC_RATE con el valor vigente de una fuente oficial antes de emitir cotizaciones en CRC.'
    });
  }
  res.json({
    usdToCrc: configuredRate,
    crcToUsd: 1 / configuredRate,
    currency: 'CRC',
    source: 'runtime-config',
    updatedAt: new Date().toISOString()
  });
});
