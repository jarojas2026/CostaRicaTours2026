/**
 * Metadatos livianos del catálogo (categorías, operadores, regiones, servicios
 * y reseñas). Se importan de forma estática en el bundle inicial.
 *
 * El listado completo de tours (~180 kB) vive en ./toursCatalog y el frontend
 * lo carga bajo demanda con loadTours() (./loadTours).
 */
import type { CategoryInfo, RegionInfo, Review, OperatorProfile } from '../types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'volcanoes',
    name: { es: 'Volcanes y Termales', en: 'Volcanoes & Hot Springs', fr: 'Volcans & Sources Chaudes', de: 'Vulkane & Heiße Quellen', zh: '火山与温泉' },
    iconName: 'Flame',
    description: {
      es: 'Explora senderos volcánicos, paisajes y termales de distintas regiones; verifica accesos y condiciones antes del viaje.',
      en: 'Explore volcanic trails, landscapes and hot springs across regions; check access and conditions before traveling.'
    }
  },
  {
    id: 'canopy',
    name: { es: 'Aventura y Canopy', en: 'Adventure & Zipline', fr: 'Aventure & Tyrolienne', de: 'Abenteuer & Zipline', zh: '探险与滑索' },
    iconName: 'Zap',
    description: {
      es: 'Encuentra actividades de aventura como canopy y puentes; altura, duración, requisitos y operación dependen del proveedor.',
      en: 'Find adventure activities such as ziplining and hanging bridges; height, duration, requirements and operation depend on the provider.'
    }
  },
  {
    id: 'wildlife',
    name: { es: 'Naturaleza y Fauna', en: 'Nature & Wildlife', fr: 'Nature & Faune', de: 'Natur & Wildtiere', zh: '自然与野生动物' },
    iconName: 'Trees',
    description: {
      es: 'Explora áreas naturales y opciones de observación de fauna. Los avistamientos y las credenciales del guía se confirman por separado.',
      en: 'Explore natural areas and wildlife-watching options. Sightings and guide credentials must be confirmed separately.'
    }
  },
  {
    id: 'beaches',
    name: { es: 'Playas y Sol', en: 'Beaches & Sun', fr: 'Plages & Soleil', de: 'Strände & Sonne', zh: '海滩与阳光' },
    iconName: 'Sun',
    description: {
      es: 'Descubre playas y actividades costeras; el acceso, el oleaje y las salidas al mar dependen del sitio y las condiciones.',
      en: 'Discover beaches and coastal activities; access, surf and marine departures depend on the location and conditions.'
    }
  },
  {
    id: 'rafting',
    name: { es: 'Rafting y Ríos', en: 'Whitewater Rafting', fr: 'Rafting en Rivière', de: 'Wildwasser-Rafting', zh: '漂流探险' },
    iconName: 'Waves',
    description: {
      es: 'Compara opciones de rafting y río. Nivel, temporada, caudal, transporte y requisitos deben confirmarse con el operador.',
      en: 'Compare rafting and river options. Difficulty, season, water level, transport and requirements must be confirmed with the provider.'
    }
  },
  {
    id: 'culture',
    name: { es: 'Cultura y Café', en: 'Culture & Coffee', fr: 'Culture & Café', de: 'Kultur & Kaffee', zh: '文化与咖啡' },
    iconName: 'Coffee',
    description: {
      es: 'Conoce experiencias culturales y gastronómicas de café, cacao y cocina local; cada visita requiere confirmar finca, horario e idioma.',
      en: 'Explore coffee, cacao and local-food experiences; confirm the farm, schedule and language for each visit.'
    }
  },
  {
    id: 'hiking',
    name: { es: 'Senderismo', en: 'Hiking', fr: 'Randonnée', de: 'Wandern', zh: '徒步旅行' },
    iconName: 'Footprints',
    description: {
      es: 'Camina por senderos naturales y descubre paisajes impresionantes.',
      en: 'Hike through natural trails and discover breathtaking landscapes.'
    }
  },
  {
    id: 'waterfalls',
    name: { es: 'Cataratas', en: 'Waterfalls', fr: 'Cascades', de: 'Wasserfälle', zh: '瀑布' },
    iconName: 'Droplet',
    description: {
      es: 'Visita las cataratas más espectaculares escondidas en la selva.',
      en: 'Visit the most spectacular waterfalls hidden in the jungle.'
    }
  },
  {
    id: 'surf',
    name: { es: 'Surf', en: 'Surf', fr: 'Surf', de: 'Surfen', zh: '冲浪' },
    iconName: 'Waves',
    description: {
      es: 'Aprende o mejora tu surf en las mejores playas de Costa Rica.',
      en: 'Learn or improve your surfing in the best beaches of Costa Rica.'
    }
  },
  {
    id: 'snorkeling',
    name: { es: 'Snorkel y Buceo', en: 'Snorkeling & Diving', fr: 'Snorkeling & Plongée', de: 'Schnorcheln & Tauchen', zh: '浮潜与潜水' },
    iconName: 'Waves',
    description: {
      es: 'Explora la vida marina en arrecifes de coral protegidos.',
      en: 'Explore marine life in protected coral reefs.'
    }
  },
  {
    id: 'whale_watching',
    name: { es: 'Observación de Ballenas', en: 'Whale Watching', fr: 'Observation des Baleines', de: 'Walbeobachtung', zh: '赏鲸' },
    iconName: 'Waves',
    description: {
      es: 'Vive el espectáculo natural del avistamiento de ballenas jorobadas en el Parque Marino Ballena.',
      en: 'Experience the natural spectacle of humpback whale watching in Marino Ballena Park.'
    }
  },
  {
    id: 'combos',
    name: { es: 'Combos y experiencias de día completo', en: 'Combos & Full-Day Experiences' },
    iconName: 'Route',
    description: {
      es: 'Combina atractivos cercanos en una ruta; confirma traslados, entradas, ritmo y disponibilidad antes de reservar.',
      en: 'Combine nearby attractions into one route; confirm transfers, admissions, pace and availability before booking.'
    }
  },
  {
    id: 'multiday',
    name: { es: 'Viajes de varios días', en: 'Multi-Day Journeys' },
    iconName: 'CalendarDays',
    description: {
      es: 'Rutas con varias noches y traslados entre regiones que deben validarse según fechas y logística.',
      en: 'Multi-night routes and inter-region transfers that must be checked against dates and logistics.'
    }
  },
  {
    id: 'services',
    name: { es: 'Transporte y servicios', en: 'Transport & Services' },
    iconName: 'Bus',
    description: {
      es: 'Traslados, transporte y servicios turísticos. Precio, ruta, proveedor y disponibilidad se confirman antes de reservar.',
      en: 'Transfers, transport and travel services. Price, route, provider and availability are confirmed before booking.'
    }
  }
];

export const OPERATORS: OperatorProfile[] = [
  {
    id: 'alsama-tours',
    name: 'ALSAMA Tours',
    slug: 'alsama-tours',
    tagline: { es: 'Proveedor candidato para tours y transporte', en: 'Prospective tours and transport provider' },
    description: {
      es: 'Proveedor recomendado por Costa Rica Tours. Su web pública ofrece servicios turísticos en Costa Rica. La relación comercial, los servicios, tarifas, disponibilidad y condiciones aún deben confirmarse directamente.',
      en: 'Recommended by Costa Rica Tours. Its public website offers travel services in Costa Rica. The commercial relationship, services, rates, availability and terms still need direct confirmation.'
    },
    location: 'Uvita, Puntarenas',
    region: 'osa',
    rating: 0,
    reviewsCount: 0,
    yearsExperience: 0,
    verifiedBadge: false,
    commissionRate: 0,
    contact: {
      phone: '',
      whatsapp: '',
      email: 'info@alsamatourscr.com',
      website: 'https://alsamatourscr.com/'
    },
    specialties: { es: ['Transporte privado', 'Tours y servicios turísticos por confirmar'], en: ['Private transport', 'Tours and travel services to be confirmed'] },
    cancellationPolicy: { es: 'Condiciones por confirmar directamente antes de reservar.', en: 'Terms must be confirmed directly before booking.' }
  },
  {
    id: 'expediciones-tropicales',
    name: 'Expediciones Tropicales',
    slug: 'expediciones-tropicales',
    tagline: { es: 'Líderes en tours de un día desde San José', en: 'Leaders in day tours from San Jose' },
    description: {
      es: 'Con más de 25 años de experiencia, ofrecemos los mejores combos de un día a los volcanes y parques nacionales más emblemáticos.',
      en: 'With over 25 years of experience, we offer the best one-day combos to the most emblematic volcanoes and national parks.'
    },
    location: 'San José',
    region: 'sjo',
    rating: 4.8,
    reviewsCount: 3200,
    yearsExperience: 25,
    verifiedBadge: false,
    commissionRate: 0.20,
    contact: {
      phone: '+506 2222 2222',
      whatsapp: '+506 2222 2222',
      email: 'info@tropicalexpeditions.com'
    },
    specialties: { es: ['Volcanes', 'Cataratas', 'Combos'], en: ['Volcanoes', 'Waterfalls', 'Combos'] },
    cancellationPolicy: { es: 'Cancelación gratuita hasta 48 horas antes.', en: 'Free cancellation up to 48 hours before.' }
  }
];

export const REGIONS: RegionInfo[] = [
  {
    id: 'arenal',
    name: { es: 'La Fortuna / Volcán Arenal', en: 'La Fortuna / Arenal Volcano' },
    tagline: { es: 'La Capital de la Aventura y Termales', en: 'The Adventure & Hot Springs Capital' },
    description: { es: 'Famoso por su volcán cónico casi perfecto y sus relajantes aguas termales.', en: 'Famous for its nearly perfect conical volcano and relaxing hot springs.' },
    image: 'https://images.unsplash.com/photo-1651261932254-fd342bc4d999?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 42, y: 38 }
  },
  {
    id: 'monteverde',
    name: { es: 'Monteverde', en: 'Monteverde' },
    tagline: { es: 'Mágico Bosque Nuboso y Biodiversidad', en: 'Magical Cloud Forest & Biodiversity' },
    description: { es: 'Bosque nuboso, senderos y actividades de naturaleza; clima y observación de fauna varían.', en: 'Cloud forest, trails and nature activities; weather and wildlife sightings vary.' },
    image: 'https://images.unsplash.com/photo-1683414903327-f5a2fcb37020?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 33, y: 44 }
  },
  {
    id: 'manuel_antonio',
    name: { es: 'Manuel Antonio', en: 'Manuel Antonio' },
    tagline: { es: 'Donde el Bosque Encuentra el Mar', en: 'Where Rainforest Meets Ocean' },
    description: { es: 'Costa y bosque tropical con opciones de senderismo y naturaleza; avistamientos no garantizados.', en: 'Coast and tropical forest with hiking and nature options; wildlife sightings are not guaranteed.' },
    image: 'https://images.unsplash.com/photo-1683414903327-f5a2fcb37020?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 50, y: 68 }
  },
  {
    id: 'pacuare',
    name: { es: 'Río Pacuare / Turrialba', en: 'Pacuare River / Turrialba' },
    tagline: { es: 'Los Mejores Rápidos de Costa Rica', en: 'World-Class Whitewater Rafting' },
    description: { es: 'Rutas de río y rafting sujetas a nivel de agua, temporada, clima y operación local.', en: 'River and rafting trips depend on water levels, season, weather and local operation.' },
    image: 'https://images.unsplash.com/photo-1685550903259-96799741df9e?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 62, y: 52 }
  },
  {
    id: 'guanacaste',
    name: { es: 'Guanacaste / Tamarindo', en: 'Guanacaste / Tamarindo' },
    tagline: { es: 'Sol, Surf y Playas Doradas', en: 'Sunshine, Surf & Golden Beaches' },
    description: { es: 'Región extensa con playas, áreas protegidas y comunidades; clima y condiciones cambian por zona y temporada.', en: 'A large region with beaches, protected areas and communities; weather and conditions vary by area and season.' },
    image: 'https://images.unsplash.com/photo-1770848891773-9d866a56dd3d?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 18, y: 32 }
  },
  {
    id: 'tortuguero',
    name: { es: 'Tortuguero', en: 'Tortuguero' },
    tagline: { es: 'El Amazonas Costarricense y Tortugas Verdes', en: 'Costa Rican Amazon & Sea Turtles' },
    description: { es: 'Navega por canales remotos y observa el desove de las tortugas marinas.', en: 'Navigate remote canals and witness the nesting of sea turtles.' },
    image: 'https://images.unsplash.com/photo-1616563838466-520a4d28466e?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 70, y: 30 }
  },
  {
    id: 'osa',
    name: { es: 'Uvita / Marino Ballena / Osa', en: 'Uvita / Marino Ballena / Osa' },
    tagline: { es: 'El Hogar de las Ballenas y Corcovado', en: 'Home of Whales & Corcovado' },
    description: { es: 'Uvita, Marino Ballena, Osa y Corcovado ofrecen entornos costeros y naturales con accesos y condiciones distintas.', en: 'Uvita, Marino Ballena, Osa and Corcovado offer coastal and natural areas with different access rules and conditions.' },
    image: 'https://images.unsplash.com/photo-1712933342478-51b92117ca80?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 58, y: 82 }
  },
  {
    id: 'caribe_sur',
    name: { es: 'Puerto Viejo / Cahuita', en: 'Puerto Viejo / Cahuita' },
    tagline: { es: 'Ritmos Afrocaribeños y Playas de Ensueño', en: 'Afro-Caribbean Rhythms & Dreamy Beaches' },
    description: { es: 'Cultura vibrante, gastronomía caribeña y arrecifes de coral protegidos.', en: 'Vibrant culture, Caribbean gastronomy, and protected coral reefs.' },
    image: 'https://images.unsplash.com/photo-1643400811908-ed46db6c8066?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 85, y: 55 }
  },
  {
    id: 'sjo',
    name: { es: 'San José / Valle Central', en: 'San Jose / Central Valley' },
    tagline: { es: 'Cultura, Volcanes y Café Premium', en: 'Culture, Volcanoes & Heritage Coffee' },
    description: { es: 'El corazón cultural de Costa Rica y punto de partida hacia volcanes activos.', en: 'The cultural heart of Costa Rica and starting point to active volcanoes.' },
    image: 'https://images.unsplash.com/photo-1643400811908-ed46db6c8066?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 52, y: 50 }
  },
  {
    id: 'caribe',
    name: { es: 'Caribe Sur / Puerto Viejo', en: 'South Caribbean / Puerto Viejo' },
    tagline: { es: 'Ritmo Afrocaribeño, Arrecifes y Naturaleza', en: 'Afro-Caribbean Vibe, Reefs & Wildlife' },
    description: { es: 'Playas, cultura afrocaribeña y gastronomía local; algunas actividades marinas dependen del estado del mar.', en: 'Beaches, Afro-Caribbean culture and local food; some marine activities depend on sea conditions.' },
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 82, y: 62 }
  },
  {
    id: 'sarapiqui',
    name: { es: 'Sarapiquí / Llanuras del Norte', en: 'Sarapiquí / Northern Plains' },
    tagline: { es: 'Ríos, bosque lluvioso y turismo rural', en: 'Rivers, rainforest & rural tourism' },
    description: { es: 'Una zona de ríos, áreas naturales, actividades de aventura y comunidades rurales.', en: 'A region of rivers, natural areas, adventure activities and rural communities.' },
    image: 'https://images.unsplash.com/photo-1683414903327-f5a2fcb37020?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 68, y: 30 }
  },
  {
    id: 'central_pacific',
    name: { es: 'Pacífico Central / Carara', en: 'Central Pacific / Carara' },
    tagline: { es: 'Bosque de transición y esteros', en: 'Transitional forest & estuaries' },
    description: { es: 'Carara, Tárcoles y los manglares de la costa central; verifica accesos y condiciones.', en: 'Carara, Tárcoles and central-coast mangroves; check access and conditions.' },
    image: 'https://images.unsplash.com/photo-1509392671875-6ad9dd6ccf9d?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 49, y: 66 }
  },
  {
    id: 'los_santos',
    name: { es: 'Los Santos / Dota', en: 'Los Santos / Dota' },
    tagline: { es: 'Montaña, bosque y comunidades rurales', en: 'Mountains, forest & rural communities' },
    description: { es: 'Senderos de montaña y observación de aves, sujetos al clima y a condiciones locales.', en: 'Mountain trails and birdwatching, subject to weather and local conditions.' },
    image: 'https://images.unsplash.com/photo-1683414903327-f5a2fcb37020?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 54, y: 67 }
  },
  {
    id: 'golfito',
    name: { es: 'Golfito / Golfo Dulce', en: 'Golfito / Golfo Dulce' },
    tagline: { es: 'Mar, bosque y comunidades del sur', en: 'Ocean, forest & southern communities' },
    description: { es: 'Navegación y actividades marinas en el sur; confirma condiciones, permisos y operador.', en: 'Boating and marine activities in the south; confirm conditions, permits and operator.' },
    image: 'https://images.unsplash.com/photo-1712933342478-51b92117ca80?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 55, y: 88 }
  }
];

export interface TouristService {
  id: string;
  title: { es: string; en: string };
  category: string;
  description: { es: string; en: string };
  priceUSD: number;
  icon: string;
  badge: { es: string; en: string };
}

export const TOURIST_SERVICES: TouristService[] = [
  {
    id: 'sjo-shuttle',
    title: { es: 'Traslado Privado Aeropuerto SJO a Hoteles San José', en: 'Private Airport Transfer SJO to San José Hotels' },
    category: 'transport',
    description: { es: 'Servicio oficial de Costa Rica Tours. Van ejecutiva A/C con Wi-Fi a bordo, agua embotellada y recepción con cartel en terminal.', en: 'Official Costa Rica Tours service. Executive A/C van with on-board Wi-Fi, bottled water, and airport name greeting.' },
    priceUSD: 50,
    icon: 'Bus',
    badge: { es: 'Servicio Oficial • CST', en: 'Official Service • CST' }
  },
  {
    id: 'sjo-arenal-private-transfer',
    title: { es: 'Traslado Privado San José / SJO a La Fortuna (Volcán Arenal)', en: 'Private Transfer San José / SJO to La Fortuna (Arenal Volcano)' },
    category: 'transport',
    description: { es: 'Servicio puerta a puerta exclusivo de Costa Rica Tours (1-5 pax $170 / 6-10 pax $200), chofer bilingüe y paradas escénicas.', en: 'Exclusive door-to-door service by Costa Rica Tours (1-5 pax $170 / 6-10 pax $200), bilingual driver, and scenic stops.' },
    priceUSD: 170,
    icon: 'Bus',
    badge: { es: 'Transporte VIP • CST', en: 'VIP Transport • CST' }
  },
  {
    id: 'car-rental-4x4',
    title: { es: 'Alquiler de Suv 4x4 Todo Terreno con Seguro', en: 'SUV 4x4 All-Terrain Rental with Insurance' },
    category: 'car_rental',
    description: { es: 'Ideal para recorrer Monteverde, Río Celeste y playas del Pacífico con kilometraje libre.', en: 'Ideal for driving around Monteverde, Rio Celeste & Pacific beaches with unlimited mileage.' },
    priceUSD: 65,
    icon: 'Car',
    badge: { es: 'GPS & WiFi Gratis', en: 'Free GPS & WiFi' }
  },
  {
    id: 'private-guide',
    title: { es: 'Guía Naturalista Privado Certificado', en: 'Private CertifiedNaturalist Guide' },
    category: 'guide',
    description: { es: 'Acompañante bilingüe experto con telescopio de alta resolución para parques nacionales.', en: 'Bilingual expert companion equipped with HD spotting telescope for national parks.' },
    priceUSD: 75,
    icon: 'UserCheck',
    badge: { es: 'Certificado', en: 'Certified' }
  },
  {
    id: 'hot-springs-daypass',
    title: { es: 'Pase de Día Aguas Termales y Almuerzo', en: 'Hot Springs Day Pass & Lunch' },
    category: 'daypass',
    description: { es: 'Acceso a piscinas minerales termales en La Fortuna sin necesidad de hospedaje.', en: 'Access to mineral geothermal thermal pools in La Fortuna without staying overnight.' },
    priceUSD: 55,
    icon: 'Hotel',
    badge: { es: 'Acceso VIP', en: 'VIP Access' }
  },
  {
    id: 'tourist-sim-esim',
    title: { es: 'eSIM / SIM Card Turista Costa Rica 5G', en: 'Costa Rica Tourist 5G eSIM / SIM Card' },
    category: 'telecom',
    description: { es: '10GB de datos móviles ultrarrápidos para navegar con Waze y Google Maps en todo el país.', en: '10GB ultra-fast mobile data for seamless Waze & Google Maps navigation across Costa Rica.' },
    priceUSD: 25,
    icon: 'Wifi',
    badge: { es: 'Activación Inmediata', en: 'Instant Activation' }
  }
];

export const REVIEWS: Review[] = [
  {
    id: 'rev-1',
    tourId: 'arenal-hot-springs',
    userName: 'Sarah & Mark Miller',
    userCountry: 'EE. UU.',
    rating: 5,
    date: 'Hace 3 días',
    comment: '¡Fue el mejor día de nuestras vacaciones en Costa Rica! La caminata por la lava del volcán fue fascinante y las termales de Baldi al final del día fueron pura relajación. El guía Carlos conocía cada ave y mono de la zona.',
    verified: true
  },
  {
    id: 'rev-2',
    tourId: 'monteverde-canopy',
    userName: 'Gonzalo Fernández',
    userCountry: 'España',
    rating: 5,
    date: 'Hace 1 semana',
    comment: 'Impresionante tirarse en el cable Superman de 1.5 km volando sobre la niebla del bosque nuboso de Monteverde. Los puentes colgantes valen totalmente la pena, vimos 2 quetzales. ¡Pura Vida!',
    verified: true
  },
  {
    id: 'rev-3',
    tourId: 'manuel-antonio-park',
    userName: 'Elena Rostova',
    userCountry: 'Alemania',
    rating: 5,
    date: 'Hace 2 semanas',
    comment: 'Vimos 6 perezosos gracias al telescopio HD del guía. Las fotos que tomamos a través del lente del telescopio parecen de revista. La playa del parque es de arena suave y agua cristalina.',
    verified: true
  },
  {
    id: 'rev-4',
    tourId: 'pacuare-rafting',
    userName: 'David K. & Friends',
    userCountry: 'Canadá',
    rating: 5,
    date: 'Hace 2 semanas',
    comment: 'World class rafting! The canyon on Pacuare River is unreal. Big waves, super professional safety team and lunch served right on a remote river beach. 10/10 recommendation.',
    verified: true
  }
];
