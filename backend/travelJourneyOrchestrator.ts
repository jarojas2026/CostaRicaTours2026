import { TOURS } from '../src/data/toursData';
import { getFirestoreDb } from './bookingService';
import { getDestinationWeather } from './weatherPulseService';
import { assessTripFit, buildPackingList, buildRouteStrategy, buildTravelerReasoning } from './tourismIntelligenceEngine';
import { verifyJourneyAvailability, validateJourneyState } from './journeyVerificationService';
import { getOperationalMemory } from './memoryService';

type JourneyParams = {
  sessionId?: string;
  query?: string;
  days?: number;
  travelers?: number;
  adults?: number;
  children?: number;
  profile?: string;
  pace?: string;
  budgetUSD?: number;
  regions?: string[];
  arrivalAirport?: string;
  departureAirport?: string;
  date?: string;
  time?: string;
  selectedTourIds?: string[];
  activities?: string[];
  priorities?: string[];
  transportPreference?: string;
  lodgingPreference?: string;
  specialRequests?: string;
  language?: 'es' | 'en';
};

function clean(value: unknown, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}

function normalized(value: unknown) {
  return clean(value, 240)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'costa', 'rica', 'tour', 'tours', 'viaje', 'trip', 'travel', 'con', 'para', 'the', 'and',
  'transport', 'transporte', 'lodging', 'alojamiento', 'season', 'temporada', 'dias', 'days'
]);

function queryTokens(values: unknown[]) {
  return Array.from(new Set(
    values
      .map(normalized)
      .join(' ')
      .split(/\s+/)
      .filter(token => token.length >= 3 && !STOP_WORDS.has(token))
  ));
}

function tourText(tour: any) {
  return normalized([
    tour.id,
    tour.region,
    tour.category,
    tour.title?.es,
    tour.title?.en,
    tour.subtitle?.es,
    tour.subtitle?.en,
    ...(tour.highlights?.es || []),
    ...(tour.highlights?.en || [])
  ].filter(Boolean).join(' '));
}

function regionMatches(tourRegion: unknown, requestedRegion: unknown) {
  const a = normalized(tourRegion);
  const b = normalized(requestedRegion);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const aliases: Record<string, string[]> = {
    arenal: ['la fortuna', 'northern plains', 'llanuras del norte'],
    monteverde: ['bosque nuboso', 'highlands', 'tierras altas'],
    'manuel antonio': ['quepos', 'pacifico central', 'central pacific'],
    guanacaste: ['tamarindo', 'papagayo', 'north pacific', 'pacifico norte'],
    pacuare: ['turrialba'],
    caribe: ['tortuguero', 'puerto viejo', 'limon', 'caribbean'],
    'pacifico sur': ['osa', 'corcovado', 'uvita', 'south pacific']
  };
  return Object.entries(aliases).some(([canonical, terms]) => {
    const group = [canonical, ...terms];
    const left = group.some(term => a.includes(term));
    const right = group.some(term => b.includes(term));
    return left && right;
  });
}

function localizedTourTitle(tour: any, language: 'es' | 'en') {
  return clean(language === 'en' ? (tour.titleEn || tour.title) : tour.title, 220) || clean(tour.id, 120);
}

function selectCatalog(params: JourneyParams) {
  const requestedRegions = (params.regions || []).map(clean).filter(Boolean);
  const selected = new Set((params.selectedTourIds || []).map(clean));
  const tokens = queryTokens([
    params.query,
    ...(params.activities || []),
    ...(params.priorities || [])
  ]);

  const scored = TOURS.map((tour: any, index: number) => {
    const text = tourText(tour);
    const explicit = selected.has(String(tour.id));
    const matchingRegions = requestedRegions.filter(region => regionMatches(tour.region, region));
    const regionScore = requestedRegions.length ? (matchingRegions.length ? 45 : -40) : 0;
    const tokenHits = tokens.filter(token => text.includes(token)).length;
    const score = (explicit ? 200 : 0) + regionScore + tokenHits * 7 + (tour.providerId ? 2 : 0);
    return { tour, score, index, explicit, matchingRegions };
  });

  let pool = scored
    .filter(item => item.explicit || item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  if (!pool.length && requestedRegions.length) {
    pool = scored
      .filter(item => requestedRegions.some(region => regionMatches(item.tour.region, region)))
      .sort((a, b) => a.index - b.index);
  }
  if (!pool.length) pool = scored.slice(0, 12);

  return pool.slice(0, 12).map(({ tour, explicit }) => ({
    id: tour.id,
    title: tour.title?.es || tour.title?.en || tour.id,
    titleEn: tour.title?.en || tour.title?.es || tour.id,
    region: tour.region,
    category: tour.category,
    priceUSD: Number(tour.priceUSD || 0),
    duration: tour.durationLabel?.es || tour.durationHours || '',
    durationHours: tour.durationHours,
    difficulty: tour.difficulty,
    providerId: tour.providerId || tour.operatorId || undefined,
    catalogStatus: tour.catalogStatus || undefined,
    selected: explicit
  }));
}

function orderRegions(regions: string[], arrivalAirport?: string) {
  const airport = normalized(arrivalAirport || 'SJO');
  const rankSjo = ['caribe', 'arenal', 'monteverde', 'guanacaste', 'manuel antonio', 'pacifico sur'];
  const rankLir = ['guanacaste', 'monteverde', 'arenal', 'manuel antonio', 'pacifico sur', 'caribe'];
  const ranking = airport.includes('lir') ? rankLir : rankSjo;

  return [...regions].sort((a, b) => {
    const na = normalized(a);
    const nb = normalized(b);
    const ai = ranking.findIndex(key => na.includes(key) || key.includes(na));
    const bi = ranking.findIndex(key => nb.includes(key) || key.includes(nb));
    const av = ai === -1 ? 999 : ai;
    const bv = bi === -1 ? 999 : bi;
    return av - bv;
  });
}

function addIsoDays(startDate: string | undefined, offset: number) {
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return undefined;
  const date = new Date(`${startDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return undefined;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function buildRegionSequence(regions: string[], slots: number) {
  if (slots <= 0) return [];
  if (!regions.length) return Array.from({ length: slots }, () => 'Por definir');
  const result: string[] = [];
  for (let i = 0; i < slots; i++) {
    const regionIndex = Math.min(regions.length - 1, Math.floor(i * regions.length / Math.max(1, slots)));
    result.push(regions[regionIndex]);
  }
  return result;
}

function buildProfessionalDays(params: {
  days: number;
  catalog: any[];
  regions: string[];
  arrivalAirport?: string;
  departureAirport?: string;
  startDate?: string;
  pace?: string;
  language: 'es' | 'en';
}) {
  const { days, catalog, regions, arrivalAirport, departureAirport, startDate, language } = params;
  const isEn = language === 'en';
  const count = Math.max(1, Math.min(days, 21));
  const firstRegion = regions[0] || (isEn ? 'first selected region' : 'primera región seleccionada');
  const lastRegion = regions[regions.length - 1] || firstRegion;
  const activitySlots = Math.max(0, count - (count >= 3 ? 2 : 1));
  const sequence = buildRegionSequence(regions, activitySlots);
  const useIndex = new Map<string, number>();
  const result: any[] = [];

  result.push({
    day: 1,
    date: addIsoDays(startDate, 0),
    title: isEn ? 'Arrival, orientation and first transfer' : 'Llegada, orientación y primer traslado',
    region: firstRegion,
    description: isEn
      ? `Arrival through ${arrivalAirport || 'the selected airport'}, trip briefing and transfer toward ${firstRegion}. The exact operator, vehicle, pickup window and travel time remain subject to operational verification.`
      : `Llegada por ${arrivalAirport || 'el aeropuerto seleccionado'}, orientación del viaje y traslado hacia ${firstRegion}. Operador, vehículo, hora de recogida y tiempo de ruta quedan sujetos a verificación operativa.`,
    morning: isEn ? 'Arrival / baggage / meeting point according to flight time.' : 'Llegada, equipaje y punto de encuentro según el horario del vuelo.',
    afternoon: isEn ? `Transfer and check-in in ${firstRegion}; avoid loading the arrival day with a major excursion.` : `Traslado y check-in en ${firstRegion}; se evita sobrecargar el día de llegada con una excursión principal.`,
    evening: isEn ? 'Rest, local dinner and trip briefing.' : 'Descanso, cena local y repaso del plan.',
    transfer: isEn ? `Airport → ${firstRegion}; duration and supplier pending verification.` : `Aeropuerto → ${firstRegion}; duración y proveedor pendientes de verificación.`,
    stay: isEn ? `Lodging in ${firstRegion} — category/preference only, property not confirmed.` : `Alojamiento en ${firstRegion} — sólo preferencia/categoría, propiedad no confirmada.`,
    serviceStatus: 'planning_only'
  });

  for (let slot = 0; slot < activitySlots; slot++) {
    const dayNumber = slot + 2;
    const region = sequence[slot] || firstRegion;
    const regionTours = catalog.filter(tour => regionMatches(tour.region, region));
    const index = useIndex.get(region) || 0;
    const tour = regionTours.length ? regionTours[index % regionTours.length] : undefined;
    useIndex.set(region, index + 1);
    const previousRegion = slot === 0 ? firstRegion : sequence[slot - 1];
    const changingRegion = normalized(previousRegion) !== normalized(region);
    const title = tour
      ? localizedTourTitle(tour, language)
      : (isEn ? `Flexible discovery day in ${region}` : `Día flexible de exploración en ${region}`);
    const pace = normalized(params.pace || 'balanced');
    const lightAfternoon = pace.includes('relax') || pace.includes('tranquil');

    result.push({
      day: dayNumber,
      date: addIsoDays(startDate, dayNumber - 1),
      title,
      region,
      tourId: tour?.id,
      description: tour
        ? (isEn
            ? `Primary catalog experience in ${region}. It is proposed because it matches the requested route; availability, schedule, pickup terms and final price still require verification.`
            : `Experiencia principal del catálogo en ${region}. Se propone porque encaja con la ruta solicitada; cupo, horario, recogida y precio final todavía requieren verificación.`)
        : (isEn
            ? 'No exact catalog service is being invented for this day; keep it flexible until a matching service is verified.'
            : 'No se inventa un servicio del catálogo para este día; queda flexible hasta verificar una opción que realmente corresponda.'),
      morning: tour
        ? (isEn ? `Primary experience: ${localizedTourTitle(tour, language)}.` : `Experiencia principal: ${localizedTourTitle(tour, language)}.`)
        : (isEn ? 'Local exploration based on the traveler priorities.' : 'Exploración local según las prioridades del viajero.'),
      afternoon: lightAfternoon
        ? (isEn ? 'Recovery/free time close to the lodging area; optional secondary activity only if logistics allow.' : 'Descanso/tiempo libre cerca del alojamiento; actividad secundaria sólo si la logística lo permite.')
        : (isEn ? 'Flexible complementary experience or local time; confirm timing before adding a second major activity.' : 'Experiencia complementaria flexible o tiempo local; confirmar horarios antes de añadir una segunda actividad principal.'),
      evening: isEn ? 'Dinner and rest in the same region unless the verified route requires a transfer.' : 'Cena y descanso en la misma región salvo que la ruta verificada requiera traslado.',
      transfer: changingRegion
        ? (isEn ? `${previousRegion} → ${region}; transfer mode, duration and road conditions pending verification.` : `${previousRegion} → ${region}; modalidad, duración y condiciones de carretera pendientes de verificación.`)
        : (isEn ? 'Local transfers only; pickup details pending service verification.' : 'Traslados locales; punto y hora de recogida pendientes de verificación del servicio.'),
      stay: isEn ? `Lodging in ${region} — property and rate pending verification.` : `Alojamiento en ${region} — propiedad y tarifa pendientes de verificación.`,
      serviceStatus: tour ? 'catalog_option_pending_verification' : 'planning_only'
    });
  }

  if (count >= 3) {
    result.push({
      day: count,
      date: addIsoDays(startDate, count - 1),
      title: isEn ? 'Departure logistics and airport transfer' : 'Logística de salida y traslado al aeropuerto',
      region: lastRegion,
      description: departureAirport
        ? (isEn
            ? `Return from ${lastRegion} to ${departureAirport}. Final pickup time depends on the verified transfer duration and the flight departure time.`
            : `Regreso desde ${lastRegion} hacia ${departureAirport}. La hora final de recogida depende de la duración verificada del traslado y del horario del vuelo.`)
        : (isEn
            ? 'Departure airport/time has not been confirmed yet, so the final transfer remains intentionally open.'
            : 'Todavía no se indicó aeropuerto/horario de salida, por lo que el último traslado se mantiene abierto de forma intencional.'),
      morning: isEn ? 'Check-out and final local time, depending on flight schedule.' : 'Check-out y último tiempo local según horario del vuelo.',
      afternoon: isEn ? 'Airport transfer if required by the confirmed flight schedule.' : 'Traslado al aeropuerto si corresponde según el vuelo confirmado.',
      evening: isEn ? 'Departure / trip closure.' : 'Salida / cierre del viaje.',
      transfer: departureAirport
        ? (isEn ? `${lastRegion} → ${departureAirport}; pending verified pickup time and duration.` : `${lastRegion} → ${departureAirport}; hora de recogida y duración pendientes de verificación.`)
        : (isEn ? 'Departure transfer to be defined.' : 'Traslado de salida por definir.'),
      stay: isEn ? 'No lodging assumed after departure.' : 'No se supone alojamiento después de la salida.',
      serviceStatus: 'planning_only'
    });
  }

  return result.slice(0, count);
}

async function persistJourney(journey: any) {
  const db = getFirestoreDb();
  if (!db) return;
  const firestoreSafe = JSON.parse(JSON.stringify(journey));
  await db.collection('traveler_journeys').doc(journey.journeyId).set(firestoreSafe, { merge: true });
}

async function loadJourney(journeyId: string): Promise<any> {
  const db = getFirestoreDb();
  if (!db) return null;
  const doc = await db.collection('traveler_journeys').doc(journeyId).get();
  return doc.exists ? { journeyId, ...(doc.data() || {}) } : null;
}

export async function buildTripJourney(params: JourneyParams) {
  const days = Math.max(1, Math.min(Number(params.days) || 7, 21));
  const adults = Math.max(0, Math.min(Number(params.adults) || 0, 200));
  const children = Math.max(0, Math.min(Number(params.children) || 0, 200));
  const travelers = Math.max(1, Math.min(Number(params.travelers) || adults + children || 2, 200));
  const sessionId = clean(params.sessionId, 160) || undefined;
  const language = params.language === 'en' ? 'en' : 'es';
  const memory = sessionId ? await getOperationalMemory(sessionId) : null;
  const effectiveQuery = clean(params.query) || memory?.summary || '';
  const catalog = selectCatalog({ ...params, query: effectiveQuery });

  const requestedRegions = (params.regions || []).map(clean).filter(Boolean);
  const catalogRegions = Array.from(new Set(catalog.map(t => clean(t.region)).filter(Boolean)));
  const regions = orderRegions(requestedRegions.length ? requestedRegions : catalogRegions, params.arrivalAirport);

  const route = buildRouteStrategy({
    regions,
    days,
    arrivalAirport: clean(params.arrivalAirport) || undefined,
    departureAirport: clean(params.departureAirport) || undefined
  });

  const itineraryDays = buildProfessionalDays({
    days,
    catalog,
    regions,
    arrivalAirport: clean(params.arrivalAirport) || undefined,
    departureAirport: clean(params.departureAirport) || undefined,
    startDate: clean(params.date) || undefined,
    pace: clean(params.pace || params.profile) || 'balanced',
    language
  });

  const plannedTourIds = Array.from(new Set(
    itineraryDays.map(day => clean(day.tourId, 160)).filter(Boolean)
  ));
  const verificationCatalog = catalog.map(tour => ({
    ...tour,
    selected: plannedTourIds.includes(String(tour.id))
  }));

  const weather = await getDestinationWeather();
  const relevantWeather = weather.filter(w =>
    regions.some(r =>
      normalized(r).includes(normalized(w.regionId)) ||
      normalized(w.name).includes(normalized(r)) ||
      normalized(r).includes(normalized(w.name))
    )
  ).slice(0, 6);

  const fit = assessTripFit({
    query: effectiveQuery,
    days,
    airport: params.arrivalAirport,
    profile: params.pace || params.profile,
    regions
  });
  const reasoning = buildTravelerReasoning({
    query: effectiveQuery,
    profile: params.profile || params.pace,
    days,
    travelers,
    budgetUSD: Number.isFinite(Number(params.budgetUSD)) ? Number(params.budgetUSD) : undefined,
    regions,
    priorities: params.priorities || params.activities
  });
  const packing = buildPackingList({ activities: params.activities, regions, profile: params.profile });

  const availability = await verifyJourneyAvailability({
    catalog: verificationCatalog,
    date: clean(params.date),
    time: clean(params.time),
    travelers
  });

  const validation = validateJourneyState({
    days,
    regions,
    itinerary: itineraryDays,
    weatherRisk: relevantWeather.some((item: any) => /rain|storm|risk|lluvia|tormenta/i.test(JSON.stringify(item))),
    availability: availability.items
  });

  const uniquePlannedTours = catalog.filter(tour => plannedTourIds.includes(String(tour.id)));
  const catalogReferenceSubtotalUSD = uniquePlannedTours.reduce((sum, tour) => sum + Number(tour.priceUSD || 0), 0) * travelers;
  const journeyId = 'jrn_' + cryptoSafeId();
  const hasDate = Boolean(clean(params.date));

  const journey = {
    journeyId,
    status: 'planning',
    version: 1,
    sessionId,
    traveler: {
      travelers,
      adults: adults || undefined,
      children: children || undefined,
      days,
      profile: clean(params.profile) || undefined,
      pace: clean(params.pace) || undefined,
      budgetUSD: Number.isFinite(Number(params.budgetUSD)) ? Number(params.budgetUSD) : undefined,
      priorities: (params.priorities || []).map(item => clean(item, 120)).filter(Boolean),
      transportPreference: clean(params.transportPreference) || undefined,
      lodgingPreference: clean(params.lodgingPreference) || undefined,
      specialRequests: clean(params.specialRequests, 1200) || undefined,
      query: effectiveQuery,
      date: clean(params.date) || undefined,
      arrivalAirport: clean(params.arrivalAirport) || 'SJO',
      departureAirport: clean(params.departureAirport) || undefined
    },
    planning: {
      regions,
      route,
      tripFit: fit,
      travelerReasoning: reasoning,
      packing,
      assumptions: [
        'El itinerario es una propuesta: hoteles, traslados, cupos, horarios y precios finales requieren verificación.',
        'El clima observado sirve como contexto actual y no como garantía de condiciones para la fecha futura.',
        ...(params.departureAirport ? [] : ['El aeropuerto de salida todavía no fue confirmado.'])
      ]
    },
    catalog,
    live: {
      weather: relevantWeather,
      weatherVerifiedAt: new Date().toISOString(),
      availability: availability.items,
      availabilityStatus: availability.status,
      availabilityVerifiedAt: availability.verifiedAt,
      availabilityTruth: 'internal_capacity_signal_not_provider_confirmation'
    },
    itinerary: {
      title: language === 'en' ? `Costa Rica · ${days}-day custom route` : `Costa Rica · ruta personalizada de ${days} días`,
      summary: language === 'en'
        ? 'A day-by-day proposal built from the traveler request, catalog matches and operational constraints. Unverified components remain explicitly pending.'
        : 'Propuesta día por día construida desde la solicitud del viajero, coincidencias reales del catálogo y restricciones operativas. Los componentes no verificados quedan explícitamente pendientes.',
      days: itineraryDays,
      validation
    },
    sales: {
      stage: hasDate ? 'VERIFICATION' : 'DISCOVERY',
      nextAction: !hasDate
        ? (language === 'en' ? 'Provide an exact start date to begin live/provider verification.' : 'Definir una fecha exacta de inicio para comenzar la verificación viva/con proveedor.')
        : (language === 'en' ? 'Verify each itinerary component and prepare an evidence-backed quote before any reservation or payment.' : 'Verificar cada componente del itinerario y preparar una cotización respaldada por evidencia antes de cualquier reserva o pago.'),
      catalogReferenceSubtotalUSD,
      estimatedTourCostUSD: catalogReferenceSubtotalUSD,
      estimateKind: 'catalog_reference_not_quote',
      disclaimer: language === 'en'
        ? 'Catalog reference only. This is not a final quote and does not include unverified lodging, transfers, fees or provider conditions.'
        : 'Referencia del catálogo únicamente. No es una cotización final y no incluye alojamiento, traslados, cargos ni condiciones de proveedor no verificadas.'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await persistJourney(journey);
  return journey;
}

function cryptoSafeId() {
  const globalCrypto = globalThis.crypto as Crypto | undefined;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID().replace(/-/g, '').slice(0, 20);
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
    adults: params.adults ?? existing.traveler?.adults,
    children: params.children ?? existing.traveler?.children,
    profile: params.profile || existing.traveler?.profile,
    pace: params.pace || existing.traveler?.pace,
    budgetUSD: params.budgetUSD ?? existing.traveler?.budgetUSD,
    date: params.date || existing.traveler?.date,
    arrivalAirport: params.arrivalAirport || existing.traveler?.arrivalAirport,
    departureAirport: params.departureAirport || existing.traveler?.departureAirport,
    regions: params.regions || existing.planning?.regions,
    selectedTourIds: params.selectedTourIds || (existing.catalog || []).filter((t: any) => t.selected).map((t: any) => t.id),
    activities: params.activities,
    priorities: params.priorities || existing.traveler?.priorities,
    transportPreference: params.transportPreference || existing.traveler?.transportPreference,
    lodgingPreference: params.lodgingPreference || existing.traveler?.lodgingPreference,
    specialRequests: params.specialRequests || existing.traveler?.specialRequests,
    language: params.language
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
