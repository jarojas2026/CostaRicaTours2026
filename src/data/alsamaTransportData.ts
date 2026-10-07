/**
 * Reference routes only. Historical route estimates below are not verified offers,
 * prices, schedules, capacities, or availability and must never be used to charge.
 * Confirm every service directly with the provider before publishing it as bookable.
 */

export interface AlsamaTransportRoute {
  id: string;
  origin: { es: string; en: string };
  destination: { es: string; en: string };
  durationHours: number;
  durationLabel: { es: string; en: string };
  price1to5USD: number;
  price6to10USD: number;
  distanceKm: number;
  popular?: boolean;
  airportRoute?: boolean;
  scenicStops?: { es: string; en: string };
}

export interface AlsamaTransportProviderInfo {
  id: string;
  name: string;
  badge: { es: string; en: string };
  website: string;
  transportUrl: string;
  description: { es: string; en: string };
  amenities: Array<{ icon: string; es: string; en: string }>;
  fleetTypes: Array<{ name: string; capacity: string; description: { es: string; en: string } }>;
  cancellationPolicy: { es: string; en: string };
}

export const ALSAMA_PROVIDER_INFO: AlsamaTransportProviderInfo = {
  id: 'alsama-tours-cr',
  name: 'Alsama Tours CR',
  badge: {
    es: 'Proveedor recomendado • Acuerdo por confirmar',
    en: 'Recommended provider • Agreement to be confirmed'
  },
  website: 'https://alsamatourscr.com/',
  transportUrl: 'https://alsamatourscr.com/transport/',
  description: {
    es: 'Proveedor recomendado por Costa Rica Tours. Consulta su sitio público; la relación comercial, los servicios, tarifas, disponibilidad y condiciones se confirman directamente antes de reservar.',
    en: 'Recommended by Costa Rica Tours. Visit its public website; the commercial relationship, services, rates, availability and terms must be confirmed directly before booking.'
  },
  amenities: [],
  fleetTypes: [],
  cancellationPolicy: {
    es: 'Condiciones de cancelación por confirmar con el proveedor.',
    en: 'Cancellation terms to be confirmed with the provider.'
  }
};

export const ALSAMA_TRANSPORT_ROUTES: AlsamaTransportRoute[] = [
  {
    id: 'sjo-to-la-fortuna-arenal',
    origin: { es: 'San José / Aeropuerto SJO', en: 'San José / SJO Airport' },
    destination: { es: 'La Fortuna / Volcán Arenal', en: 'La Fortuna / Arenal Volcano' },
    durationHours: 3.5,
    durationLabel: { es: '~3.5 horas', en: '~3.5 hours' },
    price1to5USD: 170,
    price6to10USD: 200,
    distanceKm: 130,
    popular: true,
    airportRoute: true,
    scenicStops: {
      es: 'Mirador de San Ramón, plantaciones de café y bosque nuboso',
      en: 'San Ramón viewpoint, coffee farms and cloud forest'
    }
  },
  {
    id: 'sjo-to-jaco',
    origin: { es: 'Aeropuerto SJO / San José', en: 'SJO Airport / San José' },
    destination: { es: 'Jacó / Playa Hermosa', en: 'Jacó / Hermosa Beach' },
    durationHours: 1.75,
    durationLabel: { es: '~1 hr 45 min', en: '~1 hr 45 min' },
    price1to5USD: 143,
    price6to10USD: 170,
    distanceKm: 85,
    popular: true,
    airportRoute: true,
    scenicStops: {
      es: 'Parada clásica en el Puente de los Cocodrilos del Río Tárcoles',
      en: 'Classic stop at Tárcoles River Crocodile Bridge'
    }
  },
  {
    id: 'sjo-to-manuel-antonio',
    origin: { es: 'San José / Aeropuerto SJO', en: 'San José / SJO Airport' },
    destination: { es: 'Manuel Antonio / Quepos', en: 'Manuel Antonio / Quepos' },
    durationHours: 3.0,
    durationLabel: { es: '~3 horas', en: '~3 hours' },
    price1to5USD: 186,
    price6to10USD: 214,
    distanceKm: 160,
    popular: true,
    airportRoute: true,
    scenicStops: {
      es: 'Puente de los Cocodrilos, paradas de frutas tropicales y costa pacífica',
      en: 'Crocodile Bridge, tropical fruit stands, and Pacific coastline'
    }
  },
  {
    id: 'sjo-to-monteverde',
    origin: { es: 'San José / Aeropuerto SJO', en: 'San José / SJO Airport' },
    destination: { es: 'Monteverde (Bosque Nuboso)', en: 'Monteverde (Cloud Forest)' },
    durationHours: 3.5,
    durationLabel: { es: '~3.5 horas', en: '~3.5 hours' },
    price1to5USD: 186,
    price6to10USD: 214,
    distanceKm: 140,
    popular: true,
    airportRoute: true,
    scenicStops: {
      es: 'Vistas panorámicas del Golfo de Nicoya y ascenso montañoso',
      en: 'Nicoya Gulf panoramic views and mountain ascent'
    }
  },
  {
    id: 'airport-sjo-to-san-jose-hotel',
    origin: { es: 'Aeropuerto SJO (Terminal Llegadas)', en: 'SJO Airport (Arrivals)' },
    destination: { es: 'Hoteles San José / Escazú / Sabana', en: 'San José Hotels / Escazú / Sabana' },
    durationHours: 0.5,
    durationLabel: { es: '~30 a 45 min', en: '~30 to 45 min' },
    price1to5USD: 50,
    price6to10USD: 57,
    distanceKm: 18,
    popular: true,
    airportRoute: true,
    scenicStops: {
      es: 'Recepción con cartel por nombre en la salida oficial del aeropuerto',
      en: 'Meet & Greet with personalized name sign at airport exit'
    }
  },
  {
    id: 'san-jose-hotel-to-airport-sjo',
    origin: { es: 'Hoteles San José / Escazú / Sabana', en: 'San José Hotels / Escazú / Sabana' },
    destination: { es: 'Aeropuerto SJO (Terminal Salidas)', en: 'SJO Airport (Departures)' },
    durationHours: 0.5,
    durationLabel: { es: '~30 a 45 min', en: '~30 to 45 min' },
    price1to5USD: 43,
    price6to10USD: 50,
    distanceKm: 18,
    popular: true,
    airportRoute: true,
    scenicStops: {
      es: 'Recogida puntual en lobby con asistencia de equipaje directo a la terminal',
      en: 'Prompt lobby pickup with luggage assistance directly to terminal gate'
    }
  },
  {
    id: 'sjo-to-puntarenas-caldera',
    origin: { es: 'Aeropuerto SJO / San José', en: 'SJO Airport / San José' },
    destination: { es: 'Puntarenas (Ferry) / Puerto Caldera', en: 'Puntarenas (Ferry) / Caldera Port' },
    durationHours: 1.75,
    durationLabel: { es: '~1 hr 45 min', en: '~1 hr 45 min' },
    price1to5USD: 143,
    price6to10USD: 170,
    distanceKm: 95,
    popular: false,
    airportRoute: true,
    scenicStops: {
      es: 'Conexión directa con ferry a Paquera/Tambor o terminal de cruceros',
      en: 'Direct ferry connection to Paquera/Tambor or cruise dock'
    }
  },
  {
    id: 'arenal-to-manuel-antonio',
    origin: { es: 'La Fortuna / Arenal', en: 'La Fortuna / Arenal' },
    destination: { es: 'Manuel Antonio / Quepos', en: 'Manuel Antonio / Quepos' },
    durationHours: 4.5,
    durationLabel: { es: '~4.5 horas', en: '~4.5 hours' },
    price1to5USD: 260,
    price6to10USD: 300,
    distanceKm: 220,
    popular: true,
    airportRoute: false,
    scenicStops: {
      es: 'Ruta inter-destinos conectando Volcán y Playa Pacífica con parada en Tárcoles',
      en: 'Inter-destination scenic route connecting Volcano and Pacific Beach'
    }
  },
  {
    id: 'arenal-to-monteverde',
    origin: { es: 'La Fortuna / Arenal', en: 'La Fortuna / Arenal' },
    destination: { es: 'Monteverde (Vía Lago o Terrestre)', en: 'Monteverde (Lake Crossing or Land)' },
    durationHours: 3.0,
    durationLabel: { es: '~3 horas', en: '~3 hours' },
    price1to5USD: 160,
    price6to10USD: 190,
    distanceKm: 110,
    popular: true,
    airportRoute: false,
    scenicStops: {
      es: 'Ruta panorámica bordeando el Lago Arenal y cordillera de Tilarán',
      en: 'Panoramic route skirting Lake Arenal and Tilarán mountain range'
    }
  },
  {
    id: 'sjo-to-guanacaste-tamarindo',
    origin: { es: 'San José / Aeropuerto SJO', en: 'San José / SJO Airport' },
    destination: { es: 'Tamarindo / Papagayo / Flamingo', en: 'Tamarindo / Papagayo / Flamingo' },
    durationHours: 4.5,
    durationLabel: { es: '~4.5 horas', en: '~4.5 hours' },
    price1to5USD: 260,
    price6to10USD: 310,
    distanceKm: 255,
    popular: true,
    airportRoute: true,
    scenicStops: {
      es: 'Puente La Amistad sobre el Río Tempisque y sabana guanacasteca',
      en: 'La Amistad Bridge over Tempisque River and Guanacaste savannah'
    }
  },
  {
    id: 'sjo-to-puerto-viejo-caribe',
    origin: { es: 'San José / Aeropuerto SJO', en: 'San José / SJO Airport' },
    destination: { es: 'Puerto Viejo de Talamanca / Cahuita', en: 'Puerto Viejo / Cahuita' },
    durationHours: 4.5,
    durationLabel: { es: '~4.5 horas', en: '~4.5 hours' },
    price1to5USD: 240,
    price6to10USD: 280,
    distanceKm: 215,
    popular: true,
    airportRoute: true,
    scenicStops: {
      es: 'Túnel Zurquí en Parque Braulio Carrillo y costa del Mar Caribe',
      en: 'Zurquí Tunnel through Braulio Carrillo rainforest and Caribbean coast'
    }
  },
  {
    id: 'sjo-to-la-paz-poas',
    origin: { es: 'San José / Aeropuerto SJO', en: 'San José / SJO Airport' },
    destination: { es: 'Volcán Poás / La Paz Waterfall Gardens', en: 'Poás Volcano / La Paz Waterfall Gardens' },
    durationHours: 1.25,
    durationLabel: { es: '~1 hr 15 min', en: '~1 hr 15 min' },
    price1to5USD: 120,
    price6to10USD: 140,
    distanceKm: 45,
    popular: false,
    airportRoute: true,
    scenicStops: {
      es: 'Fincas cafetaleras de Alajuela, cataratas y miradores del Valle Central',
      en: 'Alajuela coffee estates, waterfalls, and Central Valley viewpoints'
    }
  }
];
