import { TOURS } from '../src/data/toursData';
import { getFirestoreDb } from './bookingService';
import { getDestinationWeather } from './weatherPulseService';
import { assessTripFit, buildPackingList, buildRouteStrategy } from './tourismIntelligenceEngine';
import { getOperationalMemory } from './memoryService';

type JourneyParams = {
  sessionId?: string;
  query?: string;
  days?: number;
  travelers?: number;
  profile?: string;
  regions?: string[];
  arrivalAirport?: string;
  departureAirport?: string;
  date?: string;
  time?: string;
  selectedTourIds?: string[];
  activities?: string[];
  language?: 'es' | 'en';
};

function clean(value: unknown, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}

function matchesQuery(tour: any, query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const haystack = [
    tour.id, tour.region, tour.category, tour.title?.es, tour.title?.en,
    tour.subtitle?.es, tour.subtitle?.en
  ].filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).filter(Boolean).some(token => haystack.includes(token));
}

function selectCatalog(params: JourneyParams) {
  const regions = (params.regions || []).map(clean).filter(Boolean).map(x => x.toLowerCase());
  const selected = new Set((params.selectedTourIds || []).map(clean));
  const query = clean(params.query).toLowerCase();

  const candidates = TOURS.filter((tour: any) => {
    const region = String(tour.region || '').toLowerCase();
    const explicit = selected.has(String(tour.id));
    const regionMatch = !regions.length || regions.some(r => region.includes(r) || r.includes(region));
    return explicit || (regionMatch && matchesQuery(tour, query));
  });

  const fallback = TOURS.filter((tour: any) => {
    const region = String(tour.region || '').toLowerCase();
    return !regions.length || regions.some(r => region.includes(r) || r.includes(region));
  });

  const pool = candidates.length ? candidates : fallback.length ? fallback : TOURS;
  return pool.slice(0, 8).map((tour: any) => ({
    id: tour.id,
    title: tour.title?.es || tour.title?.en || tour.id,
    titleEn: tour.title?.en || tour.title?.es || tour.id,
    region: tour.region,
    category: tour.category,
    priceUSD: Number(tour.priceUSD || 0),
    duration: tour.durationLabel?.es || tour.durationHours || '',
    durationHours: tour.durationHours,
    difficulty: tour.difficulty,
    rating: tour.rating,
    selected: selected.has(String(tour.id))
  }));
}

function buildDays(days: number, catalog: any[], profile: string) {
  const count = Math.max(1, Math.min(days, 21));
  const chosen = catalog.slice(0, Math.min(catalog.length, count));
  return Array.from({ length: count }, (_, index) => {
    const tour = chosen[index % Math.max(1, chosen.length)];
    if (index === 0) return { day: 1, title: 'Llegada y adaptación', description: 'Llegada, descanso y preparación para la ruta.', region: tour?.region || 'San José' };
    if (!tour) return { day: index + 1, title: 'Día flexible', description: 'Espacio para ajustar el viaje según disponibilidad y condiciones.', region: 'Por definir' };
    return {
      day: index + 1,
      title: tour.title,
      description: `Actividad de ${tour.category || 'turismo'} en ${tour.region || 'Costa Rica'}.`,
      region: tour.region,
      tourId: tour.id
    };
  });
}

async function persistJourney(journey: any) {
  const db = getFirestoreDb();
  if (!db) return;
  await db.collection('traveler_journeys').doc(journey.journeyId).set(journey, { merge: true });
}

async function loadJourney(journeyId: string) {
  const db = getFirestoreDb();
  if (!db) return null;
  const doc = await db.collection('traveler_journeys').doc(journeyId).get();
  return doc.exists ? { journeyId, ...(doc.data() || {}) } : null;
}

export async function buildTripJourney(params: JourneyParams) {
  const days = Math.max(1, Math.min(Number(params.days) || 7, 21));
  const travelers = Math.max(1, Math.min(Number(params.travelers) || 2, 50));
  const sessionId = clean(params.sessionId, 160) || undefined;
  const memory = sessionId ? await getOperationalMemory(sessionId) : null;
  const effectiveQuery = clean(params.query) || memory?.summary || '';
  const catalog = selectCatalog({ ...params, query: effectiveQuery });
  const regions = Array.from(new Set(catalog.map(t => t.region).filter(Boolean)));
  const route = buildRouteStrategy({
    regions,
    days,
    arrivalAirport: clean(params.arrivalAirport) || undefined,
    departureAirport: clean(params.departureAirport) || undefined
  });
  const weather = await getDestinationWeather();
  const relevantWeather = weather.filter(w => regions.some(r => String(r).toLowerCase().includes(String(w.regionId).toLowerCase()) || String(w.name).toLowerCase().includes(String(r).toLowerCase()))).slice(0, 6);
  const fit = assessTripFit({
    query: effectiveQuery,
    days,
    airport: params.arrivalAirport,
    profile: params.profile,
    regions
  });
  const packing = buildPackingList({ activities: params.activities, regions, profile: params.profile });
  const estimatedTourCostUSD = catalog.reduce((sum, tour) => sum + tour.priceUSD, 0) * travelers;
  const journeyId = 'jrn_' + cryptoSafeId();
  const journey = {
    journeyId,
    status: 'planning',
    version: 1,
    sessionId,
    traveler: {
      travelers,
      profile: clean(params.profile) || 'relaxed',
      query: effectiveQuery,
      date: clean(params.date) || undefined,
      arrivalAirport: clean(params.arrivalAirport) || 'SJO',
      departureAirport: clean(params.departureAirport) || undefined
    },
    planning: {
      regions,
      route,
      tripFit: fit,
      packing,
      assumptions: ['Las actividades son opciones de catálogo; la disponibilidad debe verificarse antes de reservar.']
    },
    catalog,
    live: {
      weather: relevantWeather,
      weatherVerifiedAt: new Date().toISOString(),
      availability: [],
      availabilityStatus: params.date ? 'pending_verification' : 'date_required'
    },
    itinerary: {
      title: `Costa Rica · ${days} días`,
      summary: 'Borrador dinámico basado en catálogo y preferencias; puede adaptarse antes de reservar.',
      days: buildDays(days, catalog, clean(params.profile) || 'relaxed')
    },
    sales: {
      stage: 'planning',
      nextAction: params.date ? 'Verificar disponibilidad y preparar cotización' : 'Definir fecha para verificar disponibilidad',
      estimatedTourCostUSD,
      disclaimer: 'La cotización final se calcula en el flujo de reserva.'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await persistJourney(journey);
  return journey;
}

function cryptoSafeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export async function getTravelerJourney(journeyId: string) {
  const existing = await loadJourney(clean(journeyId, 120));
  return existing || {
    journeyId,
    status: 'not_found',
    error: 'No existe un viaje persistido con ese identificador.'
  };
}

export async function adaptTravelerJourney(journeyId: string, params: JourneyParams) {
  const existing = await loadJourney(clean(journeyId, 120));
  if (!existing || existing.status === 'not_found') {
    return { journeyId, status: 'not_found', error: 'No existe el viaje solicitado.' };
  }

  const merged: JourneyParams = {
    ...(existing.traveler || {}),
    ...(params || {}),
    sessionId: params.sessionId || existing.sessionId,
    query: params.query || existing.traveler?.query,
    days: params.days ?? existing.traveler?.days,
    travelers: params.travelers ?? existing.traveler?.travelers,
    profile: params.profile || existing.traveler?.profile,
    date: params.date || existing.traveler?.date,
    arrivalAirport: params.arrivalAirport || existing.traveler?.arrivalAirport,
    departureAirport: params.departureAirport || existing.traveler?.departureAirport,
    regions: params.regions || existing.planning?.regions,
    selectedTourIds: params.selectedTourIds || (existing.catalog || []).filter((t: any) => t.selected).map((t: any) => t.id),
    activities: params.activities
  };
  const rebuilt = await buildTripJourney(merged);
  const adapted = {
    ...rebuilt,
    journeyId,
    version: Number(existing.version || 1) + 1,
    status: 'adapted',
    previousVersion: existing.version || 1,
    adaptation: {
      changed: Object.keys(params || {}).filter(key => params[key as keyof JourneyParams] !== undefined),
      adaptedAt: new Date().toISOString()
    },
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  };
  await persistJourney(adapted);
  return adapted;
}
