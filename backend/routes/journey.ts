/**
 * Construcción y adaptación de journeys de viaje.
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import { buildTripJourney, adaptTravelerJourney, getTravelerJourney } from '../travelJourneyOrchestrator';
import { observeJourneyState, guardianReplanJourney } from '../journeyVerificationService';
import { createRouter, aiAdmission } from './shared';

/** Travel journey con memoria (/api/ai/journey). */
export const aiJourneyRouter = createRouter();

// ==========================================
// 🧠 AI TRAVEL INTELLIGENCE — READ ONLY
// ==========================================
// ==========================================
/* 🧭 FULL TRAVEL JOURNEY — MEMORY + CATALOG + LIVE DATA + SALES */
aiJourneyRouter.post('/api/ai/journey', aiAdmission.middleware, async (req, res) => {
  try {
    const result = await buildTripJourney(req.body || {});
    res.json({ success: true, journey: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo construir el viaje.' });
  }
});

aiJourneyRouter.post('/api/ai/journey/:journeyId/guardian', aiAdmission.middleware, async (req, res) => {
  try {
    const journey = await getTravelerJourney(String(req.params.journeyId || ''));
    if (!journey) return res.status(404).json({ success: false, error: 'Viaje no encontrado.' });
    const result = await guardianReplanJourney({
      catalog: Array.isArray(journey.catalog) ? journey.catalog : [],
      date: journey.traveler?.date,
      time: journey.traveler?.time,
      travelers: Number(journey.traveler?.travelers) || 1,
      previousAvailability: Array.isArray(journey.live?.availability) ? journey.live.availability : [],
      days: Number(journey.traveler?.days) || undefined,
      regions: Array.isArray(journey.traveler?.regions) ? journey.traveler.regions : undefined,
      itinerary: Array.isArray(journey.itinerary) ? journey.itinerary : []
    });
    res.json({ success: true, journeyId: journey.journeyId, guardian: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo ejecutar el Guardian.' });
  }
});

aiJourneyRouter.post('/api/ai/journey/:journeyId/observe', aiAdmission.middleware, async (req, res) => {
  try {
    const journey = await getTravelerJourney(String(req.params.journeyId || ''));
    if (!journey || journey.status === 'not_found') {
      return res.status(404).json({ success: false, error: 'Viaje no encontrado.' });
    }
    const observation = await observeJourneyState({
      catalog: Array.isArray(journey.catalog) ? journey.catalog : [],
      date: journey.traveler?.date,
      time: journey.traveler?.time,
      travelers: Number(journey.traveler?.travelers) || 1,
      previousAvailability: Array.isArray(journey.live?.availability) ? journey.live.availability : []
    });
    res.json({ success: true, journeyId: journey.journeyId, observation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo observar el estado del viaje.' });
  }
});

aiJourneyRouter.get('/api/ai/journey/:journeyId', async (req, res) => {
  try {
    const result = await getTravelerJourney(String(req.params.journeyId || ''));
    if (!result) return res.status(404).json({ success: false, error: 'Viaje no encontrado.' });
    res.json({ success: true, journey: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo recuperar el viaje.' });
  }
});

aiJourneyRouter.patch('/api/ai/journey/:journeyId', aiAdmission.middleware, async (req, res) => {
  try {
    const result = await adaptTravelerJourney(String(req.params.journeyId || ''), req.body || {});
    res.json({ success: true, journey: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo adaptar el viaje.' });
  }
});

/** Journey builder público (/api/journey). */
export const journeyRouter = createRouter();

// Full-trip Journey API: keeps the public planning flow connected to memory,
// authoritative catalog, live weather, availability, itinerary and sales next step.
journeyRouter.post('/api/journey/build', async (req, res) => {
  try {
    const result = await buildTripJourney(req.body || {});
    res.json({ success: true, journey: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'No se pudo construir el viaje' });
  }
});

journeyRouter.get('/api/journey/:journeyId', async (req, res) => {
  try {
    const journey = await getTravelerJourney(String(req.params.journeyId || ''));
    if (!journey) return res.status(404).json({ success: false, error: 'Viaje no encontrado' });
    res.json({ success: true, journey });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'No se pudo recuperar el viaje' });
  }
});

journeyRouter.post('/api/journey/:journeyId/adapt', async (req, res) => {
  try {
    const journey = await adaptTravelerJourney(String(req.params.journeyId || ''), req.body || {});
    res.json({ success: true, journey });
  } catch (err: any) {
    const status = /no encontrado/i.test(err.message || '') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message || 'No se pudo adaptar el viaje' });
  }
});
