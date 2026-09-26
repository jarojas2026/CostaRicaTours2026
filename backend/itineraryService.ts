import { GoogleGenAI } from '@google/genai';
import { TOURS } from '../src/data/toursData';
import type { Language } from '../src/types';

export interface ItineraryParams {
  days: number;
  travelers?: number;
  style?: string;
  regions?: string[];
  budget?: string;
  group?: string;
  language?: Language;
  specialRequests?: string;
  pace?: string;
}

export interface DayActivity {
  day: number;
  title: string;
  location: string;
  destination: string;
  driveEstimate?: string;
  morningActivity: string;
  afternoonActivity: string;
  eveningActivity: string;
  ecoTip: string;
  activities: string[];
  tips: string;
  recommendedTourId?: string;
  suggestedTours: string[];
  stay: string;
  transfer: string;
}

export interface GeneratedItinerary {
  title: string;
  summary: string;
  totalDays: number;
  estimatedBudgetUSD: number;
  estimatedBudgetCRC: number;
  recommendedSeason: string;
  packingList: string[];
  days: DayActivity[];
  itinerary: DayActivity[]; // Alias for Claude modal compatibility
  tips: string[];
  modelUsed: string;
}

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

/**
 * Catálogo resumido de tours reales para inyectar en el contexto de Gemini
 */
const getCatalogTourSnippets = () => {
  return TOURS.slice(0, 18).map(t => ({
    id: t.id,
    title: t.title.es,
    titleEn: t.title.en,
    region: t.region,
    priceUSD: t.priceUSD,
    durationHours: t.durationHours
  }));
};

/**
 * Generador algorítmico robusto cuando la IA no responde o está offline
 */
export function generateDeterministicItinerary(params: ItineraryParams): GeneratedItinerary {
  const languageLabels: Record<Language, string> = { es: 'español', en: 'inglés', de: 'alemán', fr: 'francés', zh: 'chino', ja: 'japonés' };
  const isEn = params.language === 'en';
  const totalDays = Math.max(3, Math.min(14, Number(params.days) || 5));
  const pax = Math.max(1, Number(params.travelers) || 2);
  const style = (params.style || 'aventura').toLowerCase();

  const curatedDays: DayActivity[] = [];

  // Día 1: San José / Llegada y traslado a La Fortuna
  curatedDays.push({
    day: 1,
    title: isEn ? 'Arrival in Costa Rica & Scenic Transfer to Arenal' : 'Llegada a Costa Rica & Traslado a La Fortuna',
    location: 'La Fortuna / Arenal',
    destination: 'La Fortuna / Arenal',
    driveEstimate: isEn ? '3.5 hours via Alsama Private Van' : '3.5 horas vía Van Privada Alsama Tours',
    morningActivity: isEn ? 'Arrival at SJO Airport and meet private driver' : 'Recepción VIP en Aeropuerto Juan Santamaría (SJO)',
    afternoonActivity: isEn ? 'Check-in at Arenal Eco-Resort and explore La Fortuna town' : 'Check-in en Eco-Lodge y paseo por el pueblo de La Fortuna',
    eveningActivity: isEn ? 'Natural volcanic mineral thermal springs with buffet dinner' : 'Aguas termales minerales del Volcán Arenal con cena buffet',
    ecoTip: isEn ? 'Bring eco-friendly biodegradable mineral sunscreen and insect repellent.' : 'Usa bloqueador biodegradable para proteger las fuentes de aguas termales.',
    activities: [
      isEn ? 'SJO Airport private transfer with on-board Wi-Fi' : 'Traslado privado desde Aeropuerto SJO con Wi-Fi a bordo',
      isEn ? 'Evening thermal soaking at volcanic mineral pools' : 'Sesión nocturna relajante en termales minerales con vista al volcán',
      isEn ? 'Traditional Costa Rican dinner with organic ingredients' : 'Cena típica costarricense "Casado" con ingredientes orgánicos'
    ],
    tips: isEn ? 'Keep a light raincoat handy, Arenal rainforest has microclimates.' : 'Ten a mano capa ligera, en Arenal el clima cambia rápidamente.',
    recommendedTourId: 'arenal-volcano-hot-springs',
    suggestedTours: [isEn ? 'Arenal Volcano & Tabacón Hot Springs' : 'Volcán Arenal y Termales Tabacón'],
    stay: isEn ? 'Arenal Springs Eco Resort (Boutique & Sustainable)' : 'Arenal Springs Eco Resort (Sostenible CST)',
    transfer: 'Alsama Tours CR - Van Ejecutiva Privada'
  });

  // Día 2: Volcán Arenal & Catarata La Fortuna
  curatedDays.push({
    day: 2,
    title: isEn ? 'Arenal 1968 Lava Trails & La Fortuna Waterfall' : 'Senderos de Lava 1968 & Catarata La Fortuna',
    location: 'Arenal Volcano National Park',
    destination: 'Arenal Volcano National Park',
    driveEstimate: '20 min',
    morningActivity: isEn ? 'Guided trek on 1968 historic volcanic lava fields with certified naturalist' : 'Caminata guiada sobre las coladas de lava histórica de 1968',
    afternoonActivity: isEn ? '500-step hike down to the majestic 70m La Fortuna Waterfall & natural pool swim' : 'Descenso a la Catarata La Fortuna y nado en poza natural',
    eveningActivity: isEn ? 'Sunset craft beer tasting and wood-fired dining in downtown La Fortuna' : 'Cata de cerveza artesanal y gastronomía local en La Fortuna',
    ecoTip: isEn ? 'Stay on marked trails to protect regenerating primary secondary forest.' : 'Respeta los senderos marcados para no erosionar el suelo volcánico.',
    activities: [
      isEn ? 'Guided volcanic geology and wildlife spotting (sloths, toucans)' : 'Avistamiento guiado de perezosos, tucanes y ranas dardo',
      isEn ? 'Swimming at the emerald pool of La Fortuna Waterfall' : 'Nado refrescante en la poza esmeralda de la Catarata',
      isEn ? 'Organic coffee and cacao farm presentation' : 'Demostración de café de altura y cacao artesanal'
    ],
    tips: isEn ? 'Wear sturdy trail running or hiking shoes with good grip.' : 'Usa calzado de senderismo con buen agarre para los 500 escalones.',
    recommendedTourId: 'arenal-volcano-waterfall',
    suggestedTours: [isEn ? 'Arenal Volcano Guided Hike' : 'Caminata Volcán Arenal & Catarata'],
    stay: isEn ? 'Arenal Springs Eco Resort' : 'Arenal Springs Eco Resort',
    transfer: 'Servicio de Guía Local y Traslado Incluido'
  });

  // Día 3: Traslado Lacustre a Monteverde & Bosque Nuboso
  curatedDays.push({
    day: 3,
    title: isEn ? 'Arenal Lake Boat Crossing & Monteverde Cloud Forest' : 'Cruce Lacustre Lago Arenal & Bosque Nuboso Monteverde',
    location: 'Monteverde / Santa Elena',
    destination: 'Monteverde',
    driveEstimate: isEn ? '2.5 hours via scenic Taxi-Boat-Taxi' : '2.5 horas vía Taxi-Bote-Taxi por el Lago Arenal',
    morningActivity: isEn ? 'Scenic boat crossing on Lake Arenal with stunning volcano panoramas' : 'Navegación panorámica por el Lago Arenal con vistas al cráter',
    afternoonActivity: isEn ? 'Hanging bridges skywalk 40 meters above the misty cloud forest' : 'Circuito de puentes colgantes a 40 metros de altura en el dosel',
    eveningActivity: isEn ? 'Guided night walk to spot tarantulas, kinkajous, and sleeping quetzals' : 'Tour nocturno guiado para avistar kinkajús, ranas y aves dormidas',
    ecoTip: isEn ? 'Monteverde is one of the rarest ecosystems on Earth; avoid single-use plastics.' : 'Monteverde alberga el 2.5% de la biodiversidad mundial; prohibido plástico de un solo uso.',
    activities: [
      isEn ? 'Scenic boat transfer across Arenal Lake' : 'Cruce panorámico en lancha por el Lago Arenal',
      isEn ? 'Tree-top canopy walking tour through epiphytes and orchids' : 'Caminata de dosel entre orquídeas y musgos del bosque nuboso',
      isEn ? 'Night safari exploring nocturnal biodiversity' : 'Safari nocturno con linternas profesionales y telescopio'
    ],
    tips: isEn ? 'Temperatures drop in Monteverde (14°C - 18°C), bring a cozy fleece jacket.' : 'Las noches en Monteverde son frescas (15°C); empaca abrigo ligero.',
    recommendedTourId: 'monteverde-hanging-bridges',
    suggestedTours: [isEn ? 'Monteverde Cloud Forest Suspension Bridges' : 'Puentes Colgantes Bosque Nuboso Monteverde'],
    stay: isEn ? 'Monteverde Cloud Forest Eco-Lodge' : 'Monteverde Cloud Forest Eco-Lodge',
    transfer: 'Conexión Taxi-Boat-Taxi Arenal a Monteverde'
  });

  // Día 4: Aventura Extrema en Monteverde o Traslado al Pacífico
  if (totalDays >= 4) {
    curatedDays.push({
      day: 4,
      title: isEn ? 'Monteverde Canopy Zipline & Descent to Central Pacific' : 'Canopy Tirolesa Extrema & Descenso al Pacífico Central',
      location: 'Monteverde a Manuel Antonio',
      destination: 'Manuel Antonio / Quepos',
      driveEstimate: isEn ? '3.5 hours scenic drive to the coastline' : '3.5 horas hacia la costa del Pacífico Central',
      morningActivity: isEn ? 'World-famous 1.5km Superman zipline and Tarzan swing through clouds' : 'Vuelo Superman de 1.5 km y columpio Tarzán sobre el bosque nuboso',
      afternoonActivity: isEn ? 'Scenic mountain descent, stop at Tárcoles Crocodile Bridge' : 'Descenso hacia la costa con parada en el Puente de los Cocodrilos del Río Tárcoles',
      eveningActivity: isEn ? 'Pacific sunset cocktail overlooking Espadilla Beach in Manuel Antonio' : 'Atardecer frente al mar en Playa Espadilla con cóctel tropical',
      ecoTip: isEn ? 'Never feed wild animals at crocodile bridges or beach fronts.' : 'Nunca alimentes fauna silvestre ni monos en el litoral pacífico.',
      activities: [
        isEn ? 'Extreme zipline canopy adventure with certified guides' : 'Aventura de tirolesa extrema certificada ICT',
        isEn ? 'Tárcoles River wildlife observation point' : 'Observación de cocodrilos gigantes en su hábitat del Río Tárcoles',
        isEn ? 'Arrival at tropical beach resort in Manuel Antonio' : 'Check-in en resort con acceso al Parque Nacional'
      ],
      tips: isEn ? 'Sunglasses and UV-protection swimwear are essential on the Pacific coast.' : 'Lentes de sol y ropa de playa ligera para el clima cálido del Pacífico.',
      recommendedTourId: 'monteverde-zipline-canopy',
      suggestedTours: [isEn ? 'Monteverde Extreme Canopy Zipline' : 'Canopy Tirolesa Extrema Monteverde'],
      stay: isEn ? 'Si Como No Resort & Wildlife Refuge (Manuel Antonio)' : 'Si Como No Resort & Wildlife Refuge (Manuel Antonio)',
      transfer: 'Alsama Tours CR - Traslado Privado Climatizado'
    });
  }

  // Día 5: Parque Nacional Manuel Antonio
  if (totalDays >= 5) {
    curatedDays.push({
      day: 5,
      title: isEn ? 'Manuel Antonio National Park: Wildlife & Secret Beaches' : 'Parque Nacional Manuel Antonio: Fauna & Playas Vírgenes',
      location: 'Manuel Antonio National Park',
      destination: 'Manuel Antonio',
      driveEstimate: '10 min',
      morningActivity: isEn ? 'Early entrance with spotting scope: two & three-toed sloths, capuchin monkeys' : 'Ingreso temprano con guía SINAC: perezosos de 2 y 3 dedos, monos carablanca',
      afternoonActivity: isEn ? 'Swim at crystalline Playa Manuel Antonio, rated top 25 beaches in the world' : 'Tarde de playa en Playa Manuel Antonio y Playa Gemelas',
      eveningActivity: isEn ? 'Fresh seafood catch-of-the-day dinner at Marina Pez Vela' : 'Cena de mariscos frescos del día en Marina Pez Vela',
      ecoTip: isEn ? 'National Park regulations strictly prohibit single-use plastic and bringing food inside.' : 'SINAC prohíbe alimentos e ingresos con bolsas plásticas de un solo uso.',
      activities: [
        isEn ? 'SINAC Official certified guided naturalist tour' : 'Tour guiado oficial con telescopio de alta resolución',
        isEn ? 'White sand beach leisure and gentle ocean snorkeling' : 'Snorkel en arrecife de coral y descanso en la arena blanca',
        isEn ? 'Sunset boardwalk stroll along Marina Pez Vela' : 'Paseo al atardecer por los muelles de Marina Pez Vela'
      ],
      tips: isEn ? 'Book park tickets at least 10 days in advance due to strict daily visitor caps.' : 'Las entradas al parque se agotan; nuestro agente garantiza el aforo oficial.',
      recommendedTourId: 'manuel-antonio-guided-nature',
      suggestedTours: [isEn ? 'Manuel Antonio National Park Guided Tour' : 'Tour Guiado Parque Nacional Manuel Antonio'],
      stay: isEn ? 'Si Como No Resort & Wildlife Refuge' : 'Si Como No Resort & Wildlife Refuge',
      transfer: 'Traslado Local Coordinado'
    });
  }

  // Días 6-7: Catamarán en el Pacífico y Retorno a San José
  if (totalDays >= 6) {
    curatedDays.push({
      day: 6,
      title: isEn ? 'Ocean King Sunset Catamaran Cruise & Snorkel' : 'Crucero en Catamarán Ocean King & Snorkel al Atardecer',
      location: 'Manuel Antonio / Quepos Marina',
      destination: 'Manuel Antonio',
      driveEstimate: '15 min',
      morningActivity: isEn ? 'Lazy morning tropical breakfast with toucans visiting resort gardens' : 'Mañana relajada con desayuno tropical y avistamiento de aves en el hotel',
      afternoonActivity: isEn ? 'Boarding 100ft luxury catamaran: dolphin spotting, water slides & reef snorkel' : 'Navegación en catamarán con avistamiento de delfines y snorkel',
      eveningActivity: isEn ? 'Open-bar grilled dinner aboard and 360° sunset over the Pacific' : 'Cena a bordo frente al atardecer del Pacífico con música costarricense',
      ecoTip: isEn ? 'Use reef-safe zinc mineral sunscreen while snorkeling on marine reserves.' : 'Usa bloqueador mineral que no dañe los arrecifes de coral.',
      activities: [
        isEn ? 'Catamaran sailing along coastal marine cliffs' : 'Navegación costera por los acantilados de Manuel Antonio',
        isEn ? 'Snorkeling gear and guided fish identification' : 'Snorkel guiado en la Reserva Marina de Biesanz',
        isEn ? 'Buffet dinner and tropical refreshments on board' : 'Almuerzo/Cena buffet y bebidas tropicales a bordo'
      ],
      tips: isEn ? 'Bring a waterproof phone pouch and dry change of clothes.' : 'Lleva funda impermeable para celular y muda de ropa seca.',
      recommendedTourId: 'manuel-antonio-catamaran-sunset',
      suggestedTours: [isEn ? 'Ocean King Luxury Catamaran' : 'Catamarán de Lujo Ocean King'],
      stay: isEn ? 'Si Como No Resort & Wildlife Refuge' : 'Si Como No Resort & Wildlife Refuge',
      transfer: 'Traslado ida y vuelta Marina Pez Vela'
    });
  }

  if (totalDays >= 7) {
    curatedDays.push({
      day: 7,
      title: isEn ? 'Souvenir Artisan Market & Private Transfer to SJO Airport' : 'Mercado Artesanal & Traslado Privado al Aeropuerto SJO',
      location: 'Manuel Antonio a San José (SJO)',
      destination: 'San José / SJO Airport',
      driveEstimate: isEn ? '3 hours direct highway transfer' : '3 horas por Ruta 27 hacia el Aeropuerto SJO',
      morningActivity: isEn ? 'Traditional gallo pinto breakfast and final beach stroll' : 'Último desayuno típico con Gallo Pinto y café chorreado',
      afternoonActivity: isEn ? 'Stop at Mercado Central or Sarchí artisan woodcraft ox-cart factory' : 'Parada en Mercado de Artesanías de Sarchí o Café Britt',
      eveningActivity: isEn ? 'Drop-off at SJO Airport 3 hours prior to international flight departure' : 'Entrega VIP en puerta de salidas internacionales del Aeropuerto SJO',
      ecoTip: isEn ? 'Support local cooperatives by purchasing authentic certified fair-trade Costa Rican coffee.' : 'Apoya el comercio justo comprando café en cooperativas locales certificadas.',
      activities: [
        isEn ? 'Final morning beach views' : 'Despedida de la costa del Pacífico',
        isEn ? 'Authentic Costa Rican coffee and souvenir boutique stop' : 'Compra de café de exportación y artesanías certificadas',
        isEn ? 'Direct executive transfer to SJO departures terminal' : 'Traslado ejecutivo directo a sala de embarque SJO'
      ],
      tips: isEn ? 'Arrive at SJO airport 3 hours prior to international flights for baggage drop.' : 'Llega al aeropuerto con 3 horas de antelación para vuelos internacionales.',
      recommendedTourId: 'sjo-3-in-1-combo',
      suggestedTours: [isEn ? 'San Jose City & Artisan Heritage' : 'Tour Cultural Valle Central'],
      stay: isEn ? 'Departure Flight / Return Home' : 'Vuelo de Retorno / Fin del Viaje',
      transfer: 'Alsama Tours CR - Traslado Aeropuerto SJO'
    });
  }

  // Días adicionales 8 a 14: agregar extensiones en Tortuguero o Guanacaste
  for (let d = 8; d <= totalDays; d++) {
    curatedDays.push({
      day: d,
      title: isEn ? `Day ${d}: Tropical Exploration & Pacific Beach Freedom` : `Día ${d}: Exploración Tropical & Playas del Pacífico`,
      location: d <= 10 ? 'Guanacaste / Tamarindo' : 'Caribe Sur / Puerto Viejo',
      destination: d <= 10 ? 'Guanacaste' : 'Caribe Sur',
      driveEstimate: '2.5 hours',
      morningActivity: isEn ? 'Morning surf lesson or kayak safari along mangrove estuaries' : 'Clase de surf matutina o safari en kayak por manglares',
      afternoonActivity: isEn ? 'Relaxing on golden beaches and organic cacao culinary experience' : 'Tarde libre en playas doradas y degustación de chocolate artesanal',
      eveningActivity: isEn ? 'Fresh tropical dinner under the stars' : 'Cena bajo las estrellas frente al mar',
      ecoTip: isEn ? 'Help keep Costa Rica green: leave no trace on public beaches.' : 'Cero huella: no dejes residuos en las playas públicas.',
      activities: [
        isEn ? 'Ecological coastal activities' : 'Actividades costeras sostenibles',
        isEn ? 'Local culinary discovery' : 'Degustación culinaria tradicional'
      ],
      tips: isEn ? 'Hydrate frequently with coconut water (agua de pipa).' : 'Hidrátate con agua de pipa fría en puestos locales.',
      recommendedTourId: 'guanacaste-sunset-catamaran',
      suggestedTours: [isEn ? 'Guanacaste Coastal Adventure' : 'Aventura Costera Guanacaste'],
      stay: isEn ? 'Pacific Green Resort' : 'Pacific Green Resort',
      transfer: 'Traslado Privado Local'
    });
  }

  const baseRatePerDay = style.includes('lujo') ? 260 : (style.includes('econom') ? 110 : 165);
  const estimatedBudgetUSD = Math.round(baseRatePerDay * totalDays * pax);
  const usdRate = Number(process.env.USD_TO_CRC_RATE) || 0;
  const estimatedBudgetCRC = usdRate > 0 ? Math.round(estimatedBudgetUSD * usdRate) : 0;

  const title = isEn
    ? `${totalDays}-Day Master ${style.includes('aventura') ? 'Adventure & Volcano' : 'Pura Vida Highlights'} Route`
    : `Itinerario Maestro de ${totalDays} Días: ${style.includes('aventura') ? 'Aventura, Volcanes & Playas' : 'Lo Mejor de Costa Rica Pura Vida'}`;

  const summary = isEn
    ? `A flawless ${totalDays}-day hand-crafted Costa Rican journey connecting Arenal's volcanic thermal rivers, Monteverde's mystical cloud forest canopy, and Manuel Antonio's world-renowned wildlife beaches. Seamlessly synchronized with verified private drivers, certified naturalists, and SINAC national park permits.`
    : `Una ruta maestra de ${totalDays} días perfectamente coordinada entre las aguas termales del Volcán Arenal, el dosel nuboso de Monteverde y las playas vírgenes con fauna de Manuel Antonio. Sincronizada con choferes privados verificados de Alsama Tours CR, guías naturalistas bilingües y cupos garantizados en SINAC.`;

  const packingList = isEn ? [
    'Quick-dry lightweight clothing (light colors)',
    'Comfortable closed-toe hiking shoes with traction',
    'Rain jacket or lightweight poncho',
    'Swimwear & microfiber towel',
    'Biodegradable reef-friendly sunscreen',
    'Insect repellent (DEET-free / eucalyptus based)',
    'Waterproof dry-bag or phone case',
    'Polarized sunglasses & sun hat',
    'Reusable filtered water bottle'
  ] : [
    'Ropa ligera de secado rápido (colores claros)',
    'Zapatos de senderismo cerrados con buen agarre',
    'Capa impermeable o chaqueta liviana',
    'Traje de baño y toalla de microfibra',
    'Bloqueador solar biodegradable',
    'Repelente de insectos biodegradable',
    'Funda impermeable para celular',
    'Lentes de sol con protección UV y sombrero',
    'Botella de agua reutilizable'
  ];

  const tips = isEn ? [
    'US Dollars (USD) are widely accepted everywhere in tourism areas; Colones (CRC) are useful for small road stalls.',
    'Costa Rica standard electricity is 120V / 60Hz with US-style Type A/B plugs.',
    'Tap water is safe and potable in 90% of the country.',
    'Drive times can vary due to scenic mountain topography; private vans offer the safest, stress-free transit.'
  ] : [
    'El dólar estadounidense (USD) es aceptado en todas las zonas turísticas; colones útiles para compras pequeñas en pulperías.',
    'La electricidad es de 120V / 60Hz con enchufes estándar tipo A/B.',
    'El agua del grifo es 100% potable en la mayoría de hoteles y zonas turísticas.',
    'Los traslados privados puerta a puerta evitan el estrés de manejar en carreteras de montaña.'
  ];

  return {
    title,
    summary,
    totalDays,
    estimatedBudgetUSD,
    estimatedBudgetCRC,
    recommendedSeason: isEn ? 'December - May (Dry Season) / June - Nov (Green Lush Season)' : 'Diciembre - Mayo (Seca) / Junio - Noviembre (Verde)',
    packingList,
    days: curatedDays,
    itinerary: curatedDays,
    tips,
    modelUsed: 'Costa Rica Tours Intelligent Route Engine 2026'
  };
}

/**
 * Generador con Gemini 2.5 Flash con fallback automático al generador de conocimiento local
 */
export async function generateGeminiItinerary(params: ItineraryParams): Promise<GeneratedItinerary> {
  const isEn = params.language === 'en';
  const ai = getAI();

  if (!ai) {
    console.log('Gemini API key no configurada, usando generador inteligente local.');
    return generateDeterministicItinerary(params);
  }

  const daysCount = Math.max(3, Math.min(14, Number(params.days) || 5));
  const pax = Math.max(1, Number(params.travelers) || 2);
  const style = params.style || 'Aventura y Naturaleza';
  const budget = params.budget || 'Medio';
  const group = params.group || 'Pareja';
  const catalogTours = getCatalogTourSnippets();

  const prompt = `Diseña un itinerario turístico completo y realista para Costa Rica con exactamente ${daysCount} días.
Parámetros del viajero:
- Días: ${daysCount}
- Pasajeros: ${pax}
- Estilo: ${style}
- Presupuesto: ${budget}
- Compañía: ${group}
- Idioma: ${isEn ? 'Inglés' : 'Español'}
${params.specialRequests ? `- Requerimientos especiales: ${params.specialRequests}` : ''}

Tours reales disponibles en nuestro catálogo que debes incluir o referenciar cuando coincida la región:
${JSON.stringify(catalogTours, null, 2)}

Reglas obligatorias:
1. Respeta la geografía de Costa Rica (no saltes de Arenal a Manuel Antonio y luego a Guanacaste el mismo día).
2. Incluye traslados privados con tiempos de ruta realistas (ej: SJO a La Fortuna: 3.5h; La Fortuna a Monteverde: 2.5h vía Taxi-Boat-Taxi; Monteverde a Manuel Antonio: 3.5h).
3. Incluye recomendaciones de vestimenta, eco-tips de sostenibilidad CST y consejos de la cultura Pura Vida.
4. Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura estricta:
{
  "title": "string llamativo y profesional",
  "summary": "string explicativo con valor comercial y de sostenibilidad",
  "totalDays": ${daysCount},
  "estimatedBudgetUSD": number (total para todo el grupo en USD),
  "recommendedSeason": "string de temporada",
  "packingList": ["item 1", "item 2", ...],
  "days": [
    {
      "day": 1,
      "title": "string título del día",
      "location": "string región o destino",
      "destination": "string destino",
      "driveEstimate": "string tiempo de traslado",
      "morningActivity": "string actividad matutina",
      "afternoonActivity": "string actividad vespertina",
      "eveningActivity": "string actividad nocturna",
      "ecoTip": "string consejo de sostenibilidad",
      "activities": ["actividad 1", "actividad 2", "actividad 3"],
      "tips": "string consejo local útil",
      "recommendedTourId": "id del tour en el catalogo si aplica",
      "suggestedTours": ["Nombre del tour sugerido"],
      "stay": "Nombre sugerido de hotel o eco-lodge",
      "transfer": "Descripción del transporte"
    }
  ],
  "tips": ["consejo 1", "consejo 2", "consejo 3"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `Eres el Diseñador Experto de Itinerarios Oficial de Costa Rica Tours.
Tu objetivo es diseñar rutas de viaje hiper-personalizadas, sostenibles y optimizadas logísticamente en Costa Rica.
Usa datos reales de carreteras, parques SINAC, microclimas y tours verificados.
Devuelve SIEMPRE JSON estructurado estricto conforme al esquema solicitado.`,
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Respuesta vacía de Gemini');
    }

    const parsed = JSON.parse(text);
    if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      throw new Error('Estructura de días inválida');
    }

    // Asegurar compatibilidad de campos y aliases
    const daysFormatted: DayActivity[] = parsed.days.map((d: any, idx: number) => ({
      day: d.day || (idx + 1),
      title: d.title || (isEn ? `Day ${idx + 1}: Costa Rica Adventure` : `Día ${idx + 1}: Experiencia Pura Vida`),
      location: d.location || d.destination || 'Costa Rica',
      destination: d.destination || d.location || 'Costa Rica',
      driveEstimate: d.driveEstimate || '1-2 hrs',
      morningActivity: d.morningActivity || (d.activities?.[0] || ''),
      afternoonActivity: d.afternoonActivity || (d.activities?.[1] || ''),
      eveningActivity: d.eveningActivity || (d.activities?.[2] || ''),
      ecoTip: d.ecoTip || (isEn ? 'Support local conservation.' : 'Apoya la conservación comunitaria.'),
      activities: Array.isArray(d.activities) && d.activities.length > 0 ? d.activities : [
        d.morningActivity || 'Exploración matutina',
        d.afternoonActivity || 'Actividad en la naturaleza',
        d.eveningActivity || 'Descanso y cena típica'
      ],
      tips: d.tips || (isEn ? 'Stay hydrated and carry rain gear.' : 'Mantén buena hidratación y calzado cómodo.'),
      recommendedTourId: d.recommendedTourId,
      suggestedTours: Array.isArray(d.suggestedTours) ? d.suggestedTours : (d.recommendedTourId ? [d.recommendedTourId] : []),
      stay: d.stay || (isEn ? 'Verified Eco-Lodge' : 'Eco-Lodge Verificado CST'),
      transfer: d.transfer || 'Alsama Tours CR - Traslado Privado'
    }));

    const totalUsd = Number(parsed.estimatedBudgetUSD) || (daysCount * pax * 175);
    const usdRate = Number(process.env.USD_TO_CRC_RATE) || 0;
    const totalCrc = usdRate > 0 ? Math.round(totalUsd * usdRate) : 0;

    return {
      title: parsed.title || (isEn ? `${daysCount}-Day Costa Rica Itinerary` : `Itinerario de ${daysCount} Días en Costa Rica`),
      summary: parsed.summary || (isEn ? 'Personalized custom travel route crafted by Gemini AI.' : 'Ruta de viaje personalizada diseñada por Gemini 2.5 Flash.'),
      totalDays: daysCount,
      estimatedBudgetUSD: totalUsd,
      estimatedBudgetCRC: totalCrc,
      recommendedSeason: parsed.recommendedSeason || (isEn ? 'All Year Round' : 'Todo el año'),
      packingList: Array.isArray(parsed.packingList) ? parsed.packingList : ['Ropa ligera', 'Zapatos para caminar', 'Bloqueador', 'Repelente'],
      days: daysFormatted,
      itinerary: daysFormatted,
      tips: Array.isArray(parsed.tips) ? parsed.tips : ['Lleva dólares y colones', 'Respeta la fauna de los parques'],
      modelUsed: 'Gemini 2.5 Flash'
    };
  } catch (err: any) {
    console.warn('⚠️ Fallback en generación de itinerario Gemini, activando motor determinista:', err.message);
    return generateDeterministicItinerary(params);
  }
}
