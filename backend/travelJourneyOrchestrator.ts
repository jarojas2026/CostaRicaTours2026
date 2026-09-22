/**
 * Full-trip journey orchestrator.
 * Connects traveler memory + expert tourism intelligence + catalog + live availability
 * + live weather + itinerary + sales next steps without replacing existing services.
 */
import { randomUUID } from 'crypto';
import { TOURS } from '../src/data/toursData';
import { checkTourAvailability, getFirestoreDb } from './bookingService';
import { rememberTurn, retrieveRelevantMemory } from './memoryService';
import { assessTripFit, buildPackingList, buildRouteStrategy } from './tourismIntelligenceEngine';
import { getDestinationWeather, getWeatherRisk } from './weatherPulseService';
import { generateDeterministicItinerary } from './itineraryService';

export type JourneyMode = 'design' | 'adapt' | 'sales_follow_up';

export interface JourneyInput {
  sessionId?: string;
  journeyId?: string;
  query?: string;
  days?: number;
  travelers?: number;
  profile?: any;
  regions?: string[];
  arrivalAirport?: string;
  departureAirport?: string;
  date?: string;
  time?: string;
  selectedTourIds?: string[];
  activities?: string[];
  language?: 'es' | 'en';
  mode?: JourneyMode;
}

function clean(value: unknown, max = 1200) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeDays(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(21, Math.floor(n))) : 7;
}

function safePax(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(50, Math.floor(n))) : 2;
}

function catalogMatches(query: string, regions: string[] = [], selectedTourIds: string[] = []) {
  const q = clean(query, 600).toLowerCase();
  const regionSet = new Set(regions.map(x => clean(x, 80).toLowerCase()));
  const idSet = new Set(selectedTourIds);
  return TOURS.map(t => {
    const hay = [t.id, t.title.es, t.title.en, t.region, t.category, t.description?.es, t.description?.en].join(' ').toLowerCase();
    const textHits = q ? q.split(/[^a-z0-9áéíóúñü]+/i).filter(x => x.length > 3 && hay.includes(x)).length : 0;
    const regionHit = !regionSet.size || regionSet.has(String(t.region).toLowerCase()) || [...regionSet].some(r => hay.includes(r));
    const selected = idSet.has(t.id);
    return { t, score: textHits * 4 + (regionHit ? 3 : 0) + (selected ? 20 : 0) };
  }).filter(x => x.score > 0 || (!q && (!regionSet.size || regionSet.has(String(x.t.region).toLowerCase()))))
    .sort((a, b) => b.score - a.score).slice(0, 8)
    .map(({ t, score }) => ({
      id: t.id, title: t.title.es, titleEn: t.title.en, region: t.region, category: t.category,
      priceUSD: t.priceUSD, durationHours: t.durationHours, duration: t.durationLabel?.es || t.durationHours,
      maxGroupSize: t.maxGroupSize, catalogSource: 'AUTHORITATIVE_CATALOG', matchScore: score
    }));
}

async function liveAvailability(tour: any, input: JourneyInput, seats: number) {
  if (!input.date) return { tourId: tour.id, status: 'DATE_REQUIRED' as const };
  try {
    const result = await checkTourAvailability(tour.id, input.date, input.time, seats);
    return { tourId: tour.id, ...result, sourceClass: 'LIVE_VERIFIED' as const };
  } catch (error: any) {
    return { tourId: tour.id, status: 'UNAVAILABLE_TO_VERIFY', error: clean(error?.message, 240), sourceClass: 'UNVERIFIED' as const };
  }
}

function salesStage(input: JourneyInput, availability: any[]) {
  if (!input.date) return { stage: 'DISCOVERY', nextAction: 'Elegir fecha y pasajeros para verificar disponibilidad real.' };
  const verified = availability.filter(x => x.sourceClass === 'LIVE_VERIFIED');
  const available = verified.filter(x => x.available === true || x.status === 'available' || x.status === 'open');
  if (!verified.length) return { stage: 'VERIFICATION', nextAction: 'Verificar disponibilidad con el proveedor antes de cotizar como confirmada.' };
  if (available.length) return { stage: 'READY_TO_QUOTE', nextAction: 'Seleccionar experiencia, generar proforma y continuar a reserva.' };
  return { stage: 'RECOVERY', nextAction: 'Buscar una fecha, horario o experiencia alternativa sin perder las preferencias del viajero.' };
}

export async function buildTripJourney(input: JourneyInput) {
  const language = input.language === 'en' ? 'en' : 'es';
  const query = clean(input.query);
  const days = safeDays(input.days);
  const travelers = safePax(input.travelers);
  const sessionId = clean(input.sessionId, 160);
  const mode = input.mode || 'design';

  const memory = sessionId ? await retrieveRelevantMemory(sessionId, query || 'plan de viaje Costa Rica', 8).catch(() => null) : null;
  const effectiveQuery = [query, memory?.summary || '', ...(memory?.relevantTurns || []).slice(0, 3).map(x => x.text)].filter(Boolean).join(' | ');
  const fit = assessTripFit({ query: effectiveQuery, days, airport: input.arrivalAirport, profile: input.profile, regions: input.regions });
  const regions = (input.regions?.length ? input.regions : fit.candidateRegions.map(x => x.regionId)).slice(0, 5);
  const route = buildRouteStrategy({ regions, days, arrivalAirport: input.arrivalAirport, departureAirport: input.departureAirport });

  const weather = await getDestinationWeather().catch(() => []);
  const weatherByRegion = weather.filter(w => regions.includes(w.regionId)).map(w => ({
    regionId: w.regionId, name: w.name, temperatureC: w.temperatureC,
    precipitationProbability: w.precipitationProbability, windKmh: w.windKmh,
    labelEs: w.labelEs, labelEn: w.labelEn, observedAt: w.observedAt,
    sourceClass: w.source === 'open-meteo' ? 'LIVE_VERIFIED' : 'UNVERIFIED',
    risk: getWeatherRisk(w)
  }));

  const catalog = catalogMatches(effectiveQuery, regions, input.selectedTourIds || []);
  const availability = await Promise.all(catalog.slice(0, 5).map(t => liveAvailability(t, input, travelers)));
  const itinerary = generateDeterministicItinerary({
    days, travelers, style: fit.profiles?.[0] || 'relaxed', regions, language, specialRequests: query
  });
  const packing = buildPackingList({ activities: input.activities?.length ? input.activities : fit.interests, regions, profile: fit.profiles?.[0] });

  const journeyId = clean(input.journeyId, 160) || 'journey_' + randomUUID();
  const stage = salesStage(input, availability);
  const journey = {
    journeyId, mode, sessionId: sessionId || null, language, updatedAt: new Date().toISOString(),
    traveler: { travelers, profile: fit.profiles?.[0] || 'relaxed', preferences: fit.interests, memorySummary: memory?.summary || '' },
    planning: { days, arrivalAirport: input.arrivalAirport || null, departureAirport: input.departureAirport || null, regions, fit, route, packing },
    live: { weather: weatherByRegion, availability },
    catalog,
    itinerary: { title: itinerary.title, summary: itinerary.summary, days: itinerary.days.slice(0, days) },
    sales: { ...stage, proformaReady: stage.stage === 'READY_TO_QUOTE', bookingChannels: ['web_form', 'whatsapp', 'email'], humanHandoffAvailable: true },
    sourceClasses: {
      knowledge: 'STABLE_KNOWLEDGE', catalog: 'AUTHORITATIVE_CATALOG',
      weather: weatherByRegion.some(x => x.sourceClass === 'LIVE_VERIFIED') ? 'LIVE_VERIFIED' : 'UNVERIFIED',
      availability: availability.some(x => x.sourceClass === 'LIVE_VERIFIED') ? 'LIVE_VERIFIED' : 'UNVERIFIED'
    }
  };

  const db = getFirestoreDb();
  if (db) await db.collection('traveler_journeys').doc(journeyId).set(journey, { merge: true });
  if (sessionId) await rememberTurn(sessionId, { role: 'user', text: query || 'Actualización del viaje' }, {
    agentId: 'journey_orchestrator', activeGoal: 'Construir y adaptar el viaje completo paso a paso.'
  }).catch(() => undefined);
  return journey;
}

export async function getTravelerJourney(journeyId: string) {
  const id = clean(journeyId, 160);
  if (!id) return null;
  const db = getFirestoreDb();
  if (!db) return null;
  const doc = await db.collection('traveler_journeys').doc(id).get();
  return doc.exists ? { journeyId: doc.id, ...doc.data() } : null;
}

export async function adaptTravelerJourney(journeyId: string, changes: Omit<JourneyInput, 'journeyId'>) {
  const previous: any = await getTravelerJourney(journeyId);
  if (!previous) throw new Error('Viaje no encontrado');
  const priorPlanning = previous.planning || {};
  const priorTraveler = previous.traveler || {};
  return buildTripJourney({
    ...changes, journeyId, sessionId: changes.sessionId || previous.sessionId || undefined,
    days: changes.days ?? priorPlanning.days, travelers: changes.travelers ?? priorTraveler.travelers,
    profile: changes.profile ?? priorTraveler.profile, regions: changes.regions ?? priorPlanning.regions,
    arrivalAirport: changes.arrivalAirport ?? priorPlanning.arrivalAirport,
    departureAirport: changes.departureAirport ?? priorPlanning.departureAirport,
    language: changes.language || previous.language || 'es', mode: 'adapt'
  });
}
