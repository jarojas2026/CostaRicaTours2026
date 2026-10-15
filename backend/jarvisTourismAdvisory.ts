/**
 * JARVIS tourism advisory foundation.
 * Pure domain knowledge and source provenance; no duplicate booking, payment,
 * weather, routing, or admin-authorization services.
 * Live route duration, park slots and road conditions must be queried elsewhere.
 */
export type TourismSignal = 'stable-guidance' | 'verify-live';
export type TourismAdvisory = {
  id: string;
  signal: TourismSignal;
  es: string;
  en: string;
  verification?: string[];
};

export const JARVIS_TOURISM_ADVISORIES: readonly TourismAdvisory[] = [
  { id:'geography',signal:'stable-guidance',es:'Costa Rica tiene distancias que parecen cortas en el mapa, pero montañas, ríos, curvas y conectividad regional pueden convertir traslados en jornadas largas.',en:'Distances may look short on a map, but mountains, rivers, winding roads and regional connectivity can turn transfers into long travel days.' },
  { id:'gam',signal:'verify-live',es:'En la Gran Área Metropolitana (San José, Alajuela, Heredia y Cartago) las horas pico y las presas afectan traslados y conexiones aeroportuarias.',en:'Rush-hour congestion in the Greater Metropolitan Area affects transfers and airport connections.',verification:['traffic','departure-time','road-routing'] },
  { id:'roads',signal:'verify-live',es:'No asumir velocidades de autopista: revisar superficie, lastre, piedra, barro, pendientes, puentes, obras, cierres y necesidad real de 4x4 para cada acceso.',en:'Do not assume highway speeds: check gravel, rocks, mud, slopes, bridges, roadworks, closures and actual 4x4 requirements for each access.',verification:['road-status','operator-access','vehicle-suitability'] },
  { id:'weather',signal:'verify-live',es:'Las lluvias, inundaciones, deslizamientos y condiciones de mar pueden cambiar la ruta o cancelar actividades; el pronóstico no garantiza operación.',en:'Rain, floods, landslides and sea conditions can change routes or cancel activities; forecasts do not guarantee operations.',verification:['forecast','official-alerts','operator-confirmation'] },
  { id:'regional-pace',signal:'stable-guidance',es:'Evitar itinerarios cortos con múltiples polos turísticos distantes; agrupar por región, aeropuerto, noches disponibles y ritmo del viajero.',en:'Avoid short itineraries with too many distant tourism hubs; group by region, airport, available nights and traveler pace.' },
  { id:'urban-diversity',signal:'stable-guidance',es:'La oferta urbana y de servicios varía: Escazú, Rohrmoser y sectores de Guanacaste pueden tener opciones de alto nivel, pero no representan el precio o infraestructura de todo el país.',en:'Urban amenities vary: Escazú, Rohrmoser and parts of Guanacaste can offer premium services but do not represent prices or infrastructure nationwide.' },
  { id:'wildlife',signal:'verify-live',es:'Ballenas, aves, mamíferos, anfibios y fauna nocturna dependen de temporada, hábitat, clima y comportamiento; nunca garantizar avistamientos.',en:'Whales, birds, mammals, amphibians and nocturnal wildlife depend on season, habitat, weather and behavior; never guarantee sightings.',verification:['season','local-naturalist','operator-conditions'] },
  { id:'night-walks',signal:'verify-live',es:'Las caminatas nocturnas requieren guía autorizado cuando corresponda, acceso permitido, equipo, evaluación de seguridad y horarios verificados.',en:'Night walks require suitable guiding, permitted access, equipment, safety screening and verified operating hours.',verification:['access','guide','weather','safety'] },
  { id:'protected-areas',signal:'verify-live',es:'Parques nacionales y áreas protegidas tienen cupos, sectores, horarios y canales de reserva diferentes; comprobar SINAC y condiciones específicas.',en:'National parks and protected areas have different capacity, sectors, schedules and booking channels; check SINAC and specific rules.',verification:['sinac-booking-channel','park-rules','capacity'] },
  { id:'oceans',signal:'verify-live',es:'El Pacífico y el Caribe tienen dinámicas estacionales diferentes; validar oleaje, mareas, navegación y restricciones locales.',en:'Pacific and Caribbean coasts have different seasonal patterns; verify surf, tides, navigation and local restrictions.',verification:['marine-forecast','operator','safety'] }
] as const;

export const JARVIS_SOURCE_REGISTRY = [
  { id:'mopt', url:'https://www.mopt.go.cr/noticias', purpose:'Obras, cierres y avisos viales; no es una API de tiempos en vivo' },
  { id:'conavi', url:'https://conavi.go.cr/red-vial-mopt', purpose:'Red vial y cartografía oficial' },
  { id:'sinac', url:'https://www.sinac.go.cr/ES/resvlinea/Paginas/default.aspx', purpose:'Canales oficiales de ingreso y reservas a áreas protegidas' },
  { id:'ict', url:'https://es.visitcostarica.com/things-to-do/ecoturism/national-parks', purpose:'Contexto turístico y áreas protegidas' }
] as const;

export type JarvisOwnerBrief = {
  status:'advisory-only';
  generatedAt:string;
  advisoryCount:number;
  alerts:readonly string[];
  requiredChecks:readonly string[];
  ownerApprovalRequired: true;
  commercialActionsExecuted: false;
};

export function buildJarvisOwnerBrief(params: {
  days?: number;
  regions?: string[];
  requestedActivities?: string[];
  roadConditionVerified?: boolean;
  providerConfirmed?: boolean;
  liveWeatherVerified?: boolean;
}, now = new Date()): JarvisOwnerBrief {
  const regions = params.regions || [];
  const days = Number(params.days) || 0;
  const alerts:string[] = [];
  if (days > 0 && regions.length > Math.ceil(days / 2)) alerts.push('Demasiadas regiones para el tiempo disponible: reducir traslados.');
  if (!params.roadConditionVerified) alerts.push('Falta verificación de carreteras, tiempos reales y accesos 4x4.');
  if (!params.liveWeatherVerified) alerts.push('Falta pulso meteorológico vigente y alertas oficiales.');
  if (!params.providerConfirmed) alerts.push('No hay confirmación comprobada del proveedor.');
  const requested = (params.requestedActivities || []).join(' ').toLowerCase();
  if (/ballena|whale|bird|ave|night|nocturn|fauna/.test(requested)) alerts.push('La observación de fauna no está garantizada; verificar temporada y operador.');
  return {
    status:'advisory-only',
    generatedAt:now.toISOString(),
    advisoryCount:JARVIS_TOURISM_ADVISORIES.length,
    alerts,
    requiredChecks:['existing-route-strategy','weatherPulseService','provider-verification','SINAC-when-applicable'],
    ownerApprovalRequired:true,
    commercialActionsExecuted:false
  };
}
