import { REGIONS } from '../src/data/toursData';

export type TravelerProfile = 'family' | 'couple' | 'honeymoon' | 'adventure' | 'wildlife' | 'senior' | 'relaxed' | 'photography' | 'accessibility';
export type ActivityIntensity = 'easy' | 'moderate' | 'active' | 'high';

const REGION_KNOWLEDGE: Record<string, { label: string; strengths: string[]; planning: string[]; stableNotes: string[]; verify: string[] }> = {
  sjo: { label: 'San José / Valle Central', strengths: ['arrival hub','coffee and culture','museums','day trips','Poás and highland access'], planning: ['Useful as an arrival/departure base; avoid unnecessary hotel changes for short trips.'], stableNotes: ['Elevation makes the Central Valley generally milder than the lowland coasts.'], verify: ['airport transfer timing','road conditions','protected-area access'] },
  arenal: { label: 'La Fortuna / Arenal', strengths: ['volcano landscapes','hot springs','waterfalls','rainforest','wildlife','adventure'], planning: ['Strong multi-interest hub; cluster activities locally rather than crossing the country between activities.'], stableNotes: ['Microclimate can change quickly around the volcano and foothills.'], verify: ['weather','trail access','activity safety','operator availability'] },
  monteverde: { label: 'Monteverde / highlands', strengths: ['cloud forest','birding','canopy','hiking','cooler climate','photography'], planning: ['Allow flexibility for mist, wind and visibility; pack layers and closed footwear.'], stableNotes: ['Highland weather is materially different from nearby Pacific lowlands.'], verify: ['road conditions','visibility','wind','activity restrictions'] },
  guanacaste: { label: 'Guanacaste', strengths: ['beaches','surf','dry-forest landscapes','sun-focused vacations','resort travel'], planning: ['Good fit when beach time is a priority; airport choice can materially reduce transfers.'], stableNotes: ['Pacific dry-season patterns do not guarantee identical weather every day.'], verify: ['ocean conditions','surf conditions','road traffic','park access'] },
  manuel_antonio: { label: 'Quepos / Manuel Antonio / Central Pacific', strengths: ['wildlife','protected forest','beaches','guided nature','photography'], planning: ['Combine forest and beach without overloading the day; protect time for heat and humidity.'], stableNotes: ['Wildlife sightings are probabilistic, never guaranteed.'], verify: ['park entry/access','weather','ocean conditions','operator schedule'] },
  caribe_sur: { label: 'Caribbean South', strengths: ['Caribbean culture','beaches','rainforest','cycling','food','wildlife'], planning: ['Do not apply Pacific seasonality assumptions automatically.'], stableNotes: ['Caribbean rainfall patterns differ from the Pacific side.'], verify: ['weather','ocean conditions','road conditions','protected-area access'] },
  osa: { label: 'South Pacific / Osa', strengths: ['wilderness','wildlife','Corcovado','marine life','photography','conservation'], planning: ['Treat this as a logistics-sensitive destination; build transfer and contingency margin.'], stableNotes: ['Protected wilderness requires greater respect for access rules and logistics.'], verify: ['authorized access','guide requirements','weather','boat/road logistics'] }
};

const PROFILE_RULES: Record<TravelerProfile, { priorities: string[]; avoid: string[] }> = {
  family: { priorities: ['manageable transfers','age-appropriate activities','bathroom/rest access','morning activities'], avoid: ['stacking multiple strenuous activities','assuming every popular activity accepts young children'] },
  couple: { priorities: ['pacing','privacy','scenic experiences','food and wellness'], avoid: ['overpacking the itinerary'] },
  honeymoon: { priorities: ['privacy','quality transfers','wellness','scenic stays','unhurried pacing'], avoid: ['long backtracking','multiple exhausting activity days in sequence'] },
  adventure: { priorities: ['activity intensity','safety screening','recovery time','weather-aware scheduling'], avoid: ['booking high-exertion activities without screening requirements'] },
  wildlife: { priorities: ['habitat quality','early starts where appropriate','guides','low-impact observation'], avoid: ['guaranteeing sightings','feeding or touching wildlife'] },
  senior: { priorities: ['comfortable transport','moderate pacing','shorter walking blocks','rest opportunities'], avoid: ['assuming age alone determines ability','back-to-back demanding excursions'] },
  relaxed: { priorities: ['few hotel changes','short transfer burden','beach/wellness','free time'], avoid: ['multi-region itineraries with excessive driving'] },
  photography: { priorities: ['light/weather flexibility','habitat diversity','scenic stops','buffer time'], avoid: ['guaranteeing animal encounters or visibility'] },
  accessibility: { priorities: ['verified access conditions','transfer assistance','restrooms','surface/trail information'], avoid: ['assuming an attraction is accessible without operator/protected-area verification'] }
};

export const TOURISM_INTELLIGENCE_RULES = [
  'Plan geographically before adding attractions: airport, regions, transfers, traveler profile and trip length are first-class constraints.',
  'A best month only makes sense relative to the activity, region and traveler objective.',
  'Stable tourism knowledge never overrides live weather, road, park, ocean, safety or provider information.',
  'Wildlife sightings are probabilities; never promise a sighting.',
  'For adventure activities, suitability depends on operator rules, age/size limits, ability, equipment, weather and voluntarily disclosed constraints.',
  'For protected areas, current official access and conservation rules take precedence over model knowledge.',
  'For short trips, depth in fewer regions is often more realistic than crossing Costa Rica repeatedly; present this as a trade-off.',
  'Every recommendation should end with a concrete next action: compare tours, verify availability, build a route, or contact a human.'
] as const;

function norm(value: unknown) { return String(value ?? '').trim().toLowerCase(); }
function clamp(n: number, min: number, max: number, fallback: number) { return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback; }

function inferProfile(text: string): TravelerProfile[] {
  const q = norm(text); const found: TravelerProfile[] = [];
  const tests: Array<[TravelerProfile, RegExp]> = [
    ['family', /famil|niñ|niñ[oa]s|kids|children/], ['honeymoon', /luna de miel|honeymoon/], ['couple', /pareja|couple|romantic/],
    ['adventure', /aventur|rafting|canopy|zipline|canyoning/], ['wildlife', /fauna|wildlife|animales|perezoso|sloth|ballena|whale|aves|bird/],
    ['senior', /adulto mayor|senior/], ['relaxed', /relaj|descanso|tranquil|beach vacation/], ['photography', /foto|fotograf|photo/], ['accessibility', /accesib|movilidad|wheelchair|mobility/]
  ];
  for (const pair of tests) if (pair[1].test(q)) found.push(pair[0]);
  return found.length ? found : ['relaxed'];
}

function inferInterests(text: string): string[] {
  const q = norm(text);
  const pairs: Array<[string, RegExp]> = [
    ['beaches', /playa|beach|surf/], ['volcanoes', /volc|arenal|poás|irazu/], ['rainforest', /selva|bosque|rainforest|jungle/], ['cloud_forest', /monteverde|bosque nuboso|cloud forest/],
    ['wildlife', /fauna|wildlife|perezoso|monkey|ballena|whale|bird/], ['adventure', /aventur|rafting|canopy|zipline|canyoning/], ['culture', /cultura|coffee|café|cacao|caribe/], ['wellness', /termal|hot spring|spa|wellness/]
  ];
  return pairs.filter(function(p) { return p[1].test(q); }).map(function(p) { return p[0]; });
}

export function getDestinationIntelligence(regionId: string) {
  const key = norm(regionId); const region = REGION_KNOWLEDGE[key];
  if (!region) return { found: false, regionId: key, sourceClass: 'UNVERIFIED' as const };
  return { found: true, regionId: key, sourceClass: 'STABLE_KNOWLEDGE' as const, ...region, liveVerificationRequired: true };
}

export function assessTripFit(input: { query?: string; days?: number; airport?: string; profile?: TravelerProfile; intensity?: ActivityIntensity; regions?: string[] }) {
  const query = norm(input.query); const profiles = input.profile ? [input.profile] : inferProfile(query); const interests = inferInterests(query);
  const days = clamp(Number(input.days), 1, 21, 5); const intensity = input.intensity || (/extrem|adventure|rafting|canopy/i.test(query) ? 'active' : 'moderate');
  const profileRules = profiles.flatMap(function(p) { return PROFILE_RULES[p].priorities; }); const avoid = profiles.flatMap(function(p) { return PROFILE_RULES[p].avoid; });
  const requested = (input.regions || []).map(norm).filter(Boolean);
  const candidates = Object.entries(REGION_KNOWLEDGE).filter(function(pair) { return !requested.length || requested.includes(pair[0]) || requested.includes(norm(pair[1].label)); }).map(function(pair) {
    const text = (pair[1].label + ' ' + pair[1].strengths.join(' ')).toLowerCase();
    const hits = interests.filter(function(i) { return text.includes(i.replace('_', ' ')); }).length;
    const score = Math.min(100, 40 + hits * 12 + (days >= 5 ? 8 : 0) + (profiles.includes('wildlife') && /wildlife/.test(text) ? 10 : 0));
    return { regionId: pair[0], region: pair[1].label, fitScore: score, matchingStrengths: pair[1].strengths.filter(function(s) { return interests.some(function(i) { return s.toLowerCase().includes(i.replace('_', ' ')); }); }) };
  }).sort(function(a,b) { return b.fitScore - a.fitScore; }).slice(0, 5);
  return { sourceClass: 'STABLE_KNOWLEDGE' as const, days, airport: input.airport || 'not specified', profiles, interests, intensity, priorities: [...new Set(profileRules)].slice(0,10), avoid: [...new Set(avoid)].slice(0,8), candidateRegions: candidates, liveChecksRequired: ['availability','weather','road conditions','park/operator access','current prices'] };
}

export function buildPackingList(input: { activities?: string[]; regions?: string[]; profile?: TravelerProfile }) {
  const activities = (input.activities || []).map(norm); const regions = (input.regions || []).map(norm);
  const items = new Set<string>(['documentos y reservas accesibles offline','protector solar y repelente','botella reutilizable','medicamentos personales','calzado cerrado con buena tracción','capa ligera para lluvia']);
  const notes: string[] = [];
  if (activities.some(function(a) { return /playa|beach|surf|snorkel/.test(a); })) { items.add('traje de baño'); items.add('protección solar respetuosa con el entorno acuático'); items.add('toalla ligera'); }
  if (activities.some(function(a) { return /rafting|canyon|canopy|zipline|hiking|senderismo/.test(a); })) { items.add('ropa deportiva de secado rápido'); items.add('segunda capa de ropa seca'); items.add('bolsa impermeable para objetos'); }
  if (activities.some(function(a) { return /bird|aves|wildlife|fauna|fotograf/.test(a); })) { items.add('binoculares o cámara, si los usas'); items.add('ropa de colores discretos'); }
  if (regions.some(function(r) { return /monteverde|highland|turrialba/.test(r); })) notes.push('En zonas altas: añade una capa abrigadora y protección contra viento/lluvia.');
  if (regions.some(function(r) { return /caribe|osa|manuel|arenal/.test(r); })) notes.push('En zonas húmedas: prioriza prendas de secado rápido y protección para equipo electrónico.');
  if (input.profile === 'accessibility') notes.push('Lleva cualquier equipo de apoyo personal y confirma previamente accesos, superficies y baños con el operador.');
  return { sourceClass: 'STABLE_KNOWLEDGE' as const, items: [...items], notes, verifyBeforeDeparture: ['clima','requisitos del operador','acceso al parque/atracción','documentos y horario de salida'] };
}

export function screenActivitySuitability(input: { activity: string; age?: number; canSwim?: boolean; mobility?: string; fearOfHeights?: boolean; medicalConstraint?: string }) {
  const activity = norm(input.activity); const flags: string[] = []; const checks: string[] = []; const highIntensity = /rafting|canyon|canopy|zipline|surf|hiking|senderismo/.test(activity);
  if (highIntensity) checks.push('edad y requisitos del operador','condición física/autoevaluación del viajero','clima y condiciones del día');
  if (/rafting|surf|snorkel|kayak/.test(activity) && input.canSwim === false) flags.push('La actividad puede requerir habilidades acuáticas; verificar requisitos específicos antes de reservar.');
  if (/canopy|zipline/.test(activity) && input.fearOfHeights) flags.push('La exposición a altura puede ser relevante; confirmar alternativas o requisitos con el operador.');
  if (input.mobility) flags.push('Verificar superficies, escaleras, baños, transporte y asistencia directamente con el operador.');
  if (input.medicalConstraint) flags.push('No diagnosticar: la condición declarada debe revisarse con un profesional de salud y con los requisitos del operador.');
  if (Number.isFinite(input.age) && Number(input.age) < 18) checks.push('edad mínima específica del operador');
  return { sourceClass: 'STABLE_KNOWLEDGE' as const, activity: input.activity, suitableToAutoConfirm: false, flags, checks: [...new Set(checks)], decision: flags.length ? 'VERIFY_BEFORE_BOOKING' : 'NO_AUTOMATIC_BLOCK', note: 'Este filtro orienta; nunca sustituye las reglas de seguridad del operador.' };
}

export function buildRouteStrategy(input: { regions: string[]; days: number; arrivalAirport?: string; departureAirport?: string }) {
  const regions = input.regions.map(norm).filter(Boolean); const days = clamp(Number(input.days), 1, 21, 5);
  const known = regions.map(function(id) { return { id, info: REGION_KNOWLEDGE[id] }; }).filter(function(x) { return !!x.info; });
  const unknown = regions.filter(function(id) { return !REGION_KNOWLEDGE[id]; }); const clusters = known.map(function(x) { return x.info.label; });
  const transferBurden = regions.length <= 2 ? 'lower' : regions.length <= 4 ? 'moderate' : 'high';
  return { sourceClass: 'STABLE_KNOWLEDGE' as const, days, arrivalAirport: input.arrivalAirport || null, departureAirport: input.departureAirport || null, requestedRegions: regions, recognizedRegions: clusters, unknownRegions: unknown, transferBurden, strategy: transferBurden === 'high' ? 'Reduce cambios de región o aumenta la duración del viaje; demasiados saltos consumen tiempo de experiencia.' : 'Agrupa actividades por región y deja margen para traslados y contingencias.', liveChecksRequired: ['road conditions','weather','operator schedules','park access'] };
}

export function buildIntelligenceInsights(query: string): string[] {
  const q = norm(query); const insights: string[] = [];
  if (/maleta|equipaje|qué llevar|que llevar|packing/.test(q)) { const list = buildPackingList({ activities: inferInterests(q) }); insights.push('LISTA DE EQUIPAJE INTELIGENTE: ' + list.items.slice(0,12).join(', ')); }
  if (/qué me conviene|que me conviene|qué destino|which destination|where should|perfil/.test(q)) { const fit = assessTripFit({ query: q }); insights.push('AJUSTE DE VIAJE: ' + fit.candidateRegions.map(function(x) { return x.regionId + ':' + x.fitScore; }).join(', ')); }
  if (/segur|apto|puedo hacer|can i|requirements|requisito/.test(q)) { const screen = screenActivitySuitability({ activity: q.slice(0,60) }); insights.push('FILTRO DE SEGURIDAD: ' + screen.decision + (screen.flags.length ? ' — ' + screen.flags.join(' ') : '')); }
  const matched = Object.keys(REGION_KNOWLEDGE).find(function(id) { return q.includes(id.replace('_',' ')); });
  if (matched) insights.push('DESTINO: ' + JSON.stringify(getDestinationIntelligence(matched)));
  return insights;
}

export { REGION_KNOWLEDGE, PROFILE_RULES };