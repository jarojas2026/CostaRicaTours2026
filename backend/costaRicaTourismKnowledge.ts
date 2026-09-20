/**
 * 🇨🇷 Costa Rica Tourism Intelligence Pack
 *
 * Curated domain knowledge for the multi-agent tourism swarm.
 * This is deliberately separated from live operational data:
 * - stable domain knowledge can be used for reasoning;
 * - prices, availability, closures, weather, immigration rules and provider claims
 *   must be verified from live/authoritative sources before being presented as current.
 *
 * Authoritative source families:
 * - ICT: https://ict.go.cr/
 * - SINAC: https://www.sinac.go.cr/
 * - SINAC online services: https://serviciosenlinea.sinac.go.cr/
 */

export type TourismKnowledgeDomain =
  | 'destinations'
  | 'seasonality'
  | 'wildlife'
  | 'adventure'
  | 'culture'
  | 'transport'
  | 'sustainability'
  | 'accessibility'
  | 'trip-planning'
  | 'risk'
  | 'source-verification';

export interface TourismKnowledgeRule {
  domain: TourismKnowledgeDomain;
  rule: string;
}

export const COSTA_RICA_TOURISM_KNOWLEDGE: TourismKnowledgeRule[] = [
  {
    domain: 'destinations',
    rule: 'Reason by region, not only by attraction: Central Valley, Northern Plains/Arenal, Monteverde/North Pacific highlands, Guanacaste, Central Pacific, South Pacific/Osa, and Caribbean. Match each region to traveler goals, transfer burden, seasonality and trip length.'
  },
  {
    domain: 'destinations',
    rule: 'Arenal/La Fortuna is a strong multi-interest hub for volcano landscapes, rainforest, waterfalls, thermal experiences, wildlife and adventure. Do not assume the volcano itself is open for every activity; verify current access and park/operator conditions.'
  },
  {
    domain: 'destinations',
    rule: 'Monteverde is a cloud-forest/highland destination where mist, wind, cooler temperatures and variable visibility materially affect activities. Recommend layers, closed footwear and weather-aware scheduling.'
  },
  {
    domain: 'destinations',
    rule: 'Manuel Antonio combines protected forest, beaches and wildlife. Treat park entry, opening rules, capacity and official access as live data; never invent ticket availability.'
  },
  {
    domain: 'destinations',
    rule: 'Osa/Corcovado is a higher-logistics wilderness product. Prioritize conservation rules, authorized access, guide requirements where applicable, transfer time and contingency planning over aggressive same-day itineraries.'
  },
  {
    domain: 'destinations',
    rule: 'Tortuguero is a canal/wetland destination with water-based logistics. Explain that transport planning differs from road-only destinations and verify boat schedules and park access before promising connections.'
  },
  {
    domain: 'destinations',
    rule: 'Guanacaste is especially relevant for Pacific beaches, dry-forest landscapes and resort-oriented travel. The dry season does not mean identical weather every day or across the whole province.'
  },
  {
    domain: 'destinations',
    rule: 'Caribbean destinations such as Cahuita and Puerto Viejo have different rainfall patterns and a distinct cultural/culinary identity from the Pacific. Do not apply Pacific seasonality assumptions automatically.'
  },
  {
    domain: 'seasonality',
    rule: 'Use microclimate reasoning. Costa Rica does not have one nationwide weather pattern; coast, elevation, exposure and local topography can change conditions substantially over short distances.'
  },
  {
    domain: 'seasonality',
    rule: 'When a traveler asks for the “best month”, first identify the activity and region. Optimize for the traveler objective (wildlife, surf, hiking, beach, rainforest, budget, low crowds) rather than giving one universal month.'
  },
  {
    domain: 'seasonality',
    rule: 'Treat wildlife sightings as probabilistic. Never guarantee a sloth, jaguar, quetzal, turtle, whale or dolphin sighting. Explain habitat, season and guide advantage instead.'
  },
  {
    domain: 'wildlife',
    rule: 'Wildlife advice must prioritize non-feeding, distance, no touching and respect for protected-area rules. Never recommend baiting animals or leaving food accessible to wildlife.'
  },
  {
    domain: 'wildlife',
    rule: 'For birding, choose destination and elevation deliberately: cloud forests and montane habitats support different species from lowland rainforest, wetlands and dry forest.'
  },
  {
    domain: 'adventure',
    rule: 'Adventure recommendations must screen for age, weight/height limits, swimming ability, mobility, medical constraints voluntarily disclosed by the traveler, weather, footwear and operator requirements before booking.'
  },
  {
    domain: 'adventure',
    rule: 'For rafting, canyoning, ziplining, surfing and similar activities, safety conditions and operator rules override generic AI knowledge. Availability and suitability must be verified with the operator.'
  },
  {
    domain: 'culture',
    rule: 'Include local communities, food, coffee, cacao, Afro-Caribbean culture, Indigenous territories and regional history when relevant. Do not flatten Costa Rican culture into a generic “Pura Vida” stereotype.'
  },
  {
    domain: 'transport',
    rule: 'Travel-time estimates are planning ranges, not guarantees. Mountain roads, construction, rain, traffic, ferries and holiday congestion can materially change arrival times.'
  },
  {
    domain: 'transport',
    rule: 'Build itineraries around geographic clusters. Avoid unnecessary backtracking between Pacific, Caribbean and highland regions, especially on short trips.'
  },
  {
    domain: 'transport',
    rule: 'For airport planning, distinguish SJO (Juan Santamaría) from LIR (Guanacaste Airport) and other regional airports. Never assume the traveler’s airport from the destination alone.'
  },
  {
    domain: 'sustainability',
    rule: 'Costa Rica tourism advice should respect protected-area conservation. SINAC identifies protected wild areas as important for sustainable tourism and conservation; direct travelers toward official rules, designated trails and responsible operators.'
  },
  {
    domain: 'sustainability',
    rule: 'When recommending a protected area, prefer official SINAC information for access, rules, fees, closures and visitor services. Do not fabricate “official” partnerships or certifications.'
  },
  {
    domain: 'accessibility',
    rule: 'Accessibility is destination-specific. Ask what access support is needed and verify trails, transfers, bathrooms, mobility equipment and activity restrictions with the relevant operator or protected area.'
  },
  {
    domain: 'trip-planning',
    rule: 'For itinerary design, optimize five variables together: trip duration, arrival/departure airport, traveler profile, activity intensity and transfer burden. Produce a realistic route before adding attractions.'
  },
  {
    domain: 'trip-planning',
    rule: 'For families, distinguish child-friendly from merely popular. Check age limits, water exposure, trail length, heat, bathroom availability, transfer duration and rest opportunities.'
  },
  {
    domain: 'trip-planning',
    rule: 'For honeymoon/luxury travelers, prioritize privacy, transfer quality, thermal/wellness experiences, dining and pacing rather than maximizing the number of attractions.'
  },
  {
    domain: 'trip-planning',
    rule: 'For adventure travelers, cluster activities geographically and preserve recovery time. Avoid stacking multiple high-risk/high-exertion activities without considering weather and fatigue.'
  },
  {
    domain: 'trip-planning',
    rule: 'For first-time visitors with limited days, explain trade-offs between seeing many regions and having deeper experiences. Do not label one itinerary “best” without knowing the traveler priorities.'
  },
  {
    domain: 'risk',
    rule: 'Never provide false certainty about road conditions, volcanic activity, ocean conditions, weather, park closures, immigration rules, health requirements or emergency situations. Escalate to live authoritative sources.'
  },
  {
    domain: 'risk',
    rule: 'For protected areas and volcanic destinations, follow ranger/operator instructions and current official notices. Generic model knowledge never overrides a current closure or safety instruction.'
  },
  {
    domain: 'source-verification',
    rule: 'Classify every claim as STABLE_KNOWLEDGE, LIVE_VERIFIED, CUSTOMER_PROVIDED, PROVIDER_PROVIDED or UNVERIFIED. Never present UNVERIFIED data as an official fact.'
  },
  {
    domain: 'source-verification',
    rule: 'For current tourism statistics, park access, protected-area rules, visitor services and destination policy, prefer ICT and SINAC. For immigration, prefer Costa Rican immigration authorities. For weather, use an authoritative current weather source.'
  },
  {
    domain: 'source-verification',
    rule: 'When a source cannot be verified, say so plainly. Do not fill missing evidence with plausible-sounding details, invented reviews, invented certifications, invented operators or invented prices.'
  }
];

export const COSTA_RICA_REGION_PLAYBOOK = {
  central_valley: ['San José', 'Cartago', 'Alajuela', 'Poás', 'Irazú'],
  northern_plains: ['La Fortuna', 'Arenal', 'Sarapiquí'],
  highlands: ['Monteverde', 'Los Santos', 'Turrialba'],
  guanacaste: ['Liberia', 'Tamarindo', 'Papagayo', 'Rincón de la Vieja'],
  central_pacific: ['Jacó', 'Herradura', 'Manuel Antonio', 'Quepos'],
  south_pacific: ['Uvita', 'Dominical', 'Osa', 'Corcovado', 'Golfito'],
  caribbean: ['Limón', 'Cahuita', 'Puerto Viejo', 'Tortuguero']
} as const;

export function buildCostaRicaTourismKnowledgePrompt(): string {
  return COSTA_RICA_TOURISM_KNOWLEDGE
    .map((item) => `[${item.domain.toUpperCase()}] ${item.rule}`)
    .join('\\n');
}
