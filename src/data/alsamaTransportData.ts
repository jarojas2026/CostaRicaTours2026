/**
 * 🚐 Catálogo y Tarifario Oficial de Transporte - Alsama Tours CR
 * Proveedor Verificado de Transporte Turístico y Privado en Costa Rica
 * Referencia oficial: https://alsamatourscr.com/transport/
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
    es: 'Proveedor Oficial Verificado • CST Sostenible',
    en: 'Verified Official Provider • CST Certified'
  },
  website: 'https://alsamatourscr.com/',
  transportUrl: 'https://alsamatourscr.com/transport/',
  description: {
    es: 'Alsama Tours CR es nuestro operador oficial de traslados turísticos privados en Costa Rica. Ofrece servicio puerta a puerta con choferes profesionales bilingües, unidades ejecutivas modernas con aire acondicionado de alta potencia, conexión Wi-Fi a bordo y agua embotellada de cortesía.',
    en: 'Alsama Tours CR is our official private tourist transportation provider in Costa Rica. Offering door-to-door service with certified bilingual drivers, modern air-conditioned executive vans, on-board Wi-Fi, and complimentary bottled water.'
  },
  amenities: [
    { icon: 'Wind', es: 'Aire Acondicionado de Alta Potencia', en: 'High-Power Air Conditioning' },
    { icon: 'Wifi', es: 'Conexión Wi-Fi 4G/5G a bordo', en: 'On-Board High-Speed Wi-Fi' },
    { icon: 'Coffee', es: 'Agua embotellada de cortesía', en: 'Complimentary Bottled Water' },
    { icon: 'MapPin', es: 'Paradas escénicas en ruta (Fotos y Comida)', en: 'Scenic stops on the way (Photos & Meals)' },
    { icon: 'Clock', es: 'Puntualidad garantizada con monitoreo de vuelos', en: 'Guaranteed Punctuality & Flight Tracking' },
    { icon: 'ShieldCheck', es: 'Póliza de seguro MOPT/ICT e INS al 100%', en: 'Full MOPT/ICT & INS Traveler Insurance' }
  ],
  fleetTypes: [
    {
      name: 'Van Ejecutiva (1 - 5 Pasajeros)',
      capacity: 'Hasta 5 pasajeros + 5 maletas grandes',
      description: {
        es: 'Toyota HiAce / Hyundai H1 equipada con asientos reclinables, maletero amplio y cargadores USB.',
        en: 'Toyota HiAce / Hyundai H1 featuring reclining seats, spacious luggage compartment and USB chargers.'
      }
    },
    {
      name: 'Microbús Familiar (6 - 10 Pasajeros)',
      capacity: 'Hasta 10 pasajeros + 10 maletas',
      description: {
        es: 'Microbús espacioso ideal para familias grandes y grupos de amigos que viajan con equipaje completo.',
        en: 'Spacious passenger van ideal for extended families and travel groups with full luggage.'
      }
    }
  ],
  cancellationPolicy: {
    es: 'Cancelación gratuita hasta 24 horas antes de la hora acordada de recogida.',
    en: 'Free cancellation up to 24 hours prior to the scheduled pickup time.'
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
