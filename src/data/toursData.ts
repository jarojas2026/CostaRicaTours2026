import { Tour, CategoryInfo, RegionInfo, Review } from '../types';





export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'volcanoes',
    name: { es: 'Volcanes y Termales Chuzos', en: 'Volcanoes & Hot Springs' },
    iconName: 'Flame',
    description: {
      es: 'Explora coladas de lava del Volcán Arenal y relájate en aguas termales minerales naturales.',
      en: 'Explore lava flows at Arenal Volcano and unwind in natural mineral hot springs.'
    }
  },
  {
    id: 'canopy',
    name: { es: 'Canopy y Tirolesas', en: 'Zip-line & Canopy' },
    iconName: 'Zap',
    description: {
      es: 'Siente la adrenalina volando sobre las copas de los árboles en el bosque nuboso.',
      en: 'Feel the rush flying over rainforest tree canopies in misty cloud forests.'
    }
  },
  {
    id: 'wildlife',
    name: { es: 'Fauna Silvestre y Perezosos', en: 'Wildlife & Sloths' },
    iconName: 'Trees',
    description: {
      es: 'Observa perezosos, monos capuchinos, tucanes y ranas de ojos rojos con guías experimentados.',
      en: 'Spot sloths, capuchin monkeys, toucans, and red-eyed tree frogs with certified naturalists.'
    }
  },
  {
    id: 'beaches',
    name: { es: 'Playas y Catamarán', en: 'Beaches & Catamaran' },
    iconName: 'Sun',
    description: {
      es: 'Playas tuanis de arena blanca, snorkel y atardeceres de película en el Pacífico.',
      en: 'Pristine white sand beaches, snorkeling, and sunset catamaran cruises on the Pacific.'
    }
  },
  {
    id: 'rafting',
    name: { es: 'Rafting y Ríos', en: 'Whitewater Rafting' },
    iconName: 'Waves',
    description: {
      es: 'Desciende los cañones vírgenes del Río Pacuare, votado uno de los más bellos del mundo.',
      en: 'Navigate pristine jungle canyons on the Pacuare River, rated top 5 in the world.'
    }
  },
  {
    id: 'culture',
    name: { es: 'Café, Chocolate y Cultura', en: 'Coffee, Chocolate & Culture' },
    iconName: 'Coffee',
    description: {
      es: 'Aprende el proceso del café costarricense "El Grano de Oro" y chocolate artesanal de cacao puro.',
      en: 'Discover Costa Rica’s famous coffee roasting and traditional cacao chocolate making.'
    }
  },
  {
    id: 'multiday',
    name: { es: 'Paquetes Multidía', en: 'Multi-Day Packages' },
    iconName: 'Compass',
    description: {
      es: 'Itinerarios completos de 3 a 7 días combinando montaña, bosque nuboso y playa tropical.',
      en: 'Complete 3 to 7 day all-inclusive tours combining volcano, cloud forest, and coast.'
    }
  }
];

export const REGIONS: RegionInfo[] = [
  {
    id: 'arenal',
    name: 'La Fortuna / Volcán Arenal',
    tagline: { es: 'La Capital de la Aventura y Termales', en: 'The Adventure & Hot Springs Capital' },
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 42, y: 38 }
  },
  {
    id: 'monteverde',
    name: 'Monteverde',
    tagline: { es: 'Mágico Bosque Nuboso y Biodiversidad', en: 'Magical Cloud Forest & Biodiversity' },
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 33, y: 44 }
  },
  {
    id: 'manuel_antonio',
    name: 'Manuel Antonio',
    tagline: { es: 'Donde el Bosque Encuentra el Mar', en: 'Where Rainforest Meets Ocean' },
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 50, y: 68 }
  },
  {
    id: 'pacuare',
    name: 'Río Pacuare / Turrialba',
    tagline: { es: 'Los Mejores Rápidos de Costa Rica', en: 'World-Class Whitewater Rafting' },
    image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 62, y: 52 }
  },
  {
    id: 'guanacaste',
    name: 'Guanacaste / Tamarindo',
    tagline: { es: 'Sol, Surf y Playas Doradas', en: 'Sunshine, Surf & Golden Beaches' },
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 18, y: 32 }
  },
  {
    id: 'tortuguero',
    name: 'Tortuguero',
    tagline: { es: 'El Amazonas Costarricense y Tortugas Verdes', en: 'Costa Rican Amazon & Sea Turtles' },
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 70, y: 30 }
  },
  {
    id: 'osa',
    name: 'Península de Osa / Corcovado',
    tagline: { es: 'El Lugar Más Intenso del Planeta', en: 'Most Biologically Intense Place' },
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 72, y: 88 }
  },
  {
    id: 'sjo',
    name: 'San José / Valle Central',
    tagline: { es: 'Cultura, Volcanes y Café Premium', en: 'Culture, Volcanoes & Heritage Coffee' },
    image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 52, y: 50 }
  },
  {
    id: 'caribe',
    name: 'Caribe Sur / Puerto Viejo',
    tagline: { es: 'Ritmo Afrocaribeño, Arrecifes y Naturaleza', en: 'Afro-Caribbean Vibe, Reefs & Wildlife' },
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 82, y: 62 }
  }
];

export const TOURS: Tour[] = [
  {
    id: 'sjo-3-in-1-combo',
    title: {
      es: 'Combo 3-en-1: Volcán Poás, Doka Coffee & Cataratas La Paz',
      en: '3-in-1 Combo: Poás Volcano, Doka Coffee Estate & La Paz Waterfalls'
    },
    subtitle: {
      es: 'El tour de 1 día más popular desde San José',
      en: 'The most popular 1-day tour from San Jose'
    },
    category: 'combos',
    region: 'sjo',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'
    ],
    priceUSD: 145,
    durationHours: 10,
    durationLabel: { es: 'Día Completo (10 hrs)', en: 'Full Day (10 hrs)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil - Todas las edades', en: 'Easy - All ages' },
    rating: 4.9,
    reviewsCount: 845,
    featured: true,
    bestseller: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 15,
    freeCancellation: true,
    description: {
      es: 'Aprovecha al máximo tu estadía en San José con este increíble Combo de 1 Día. Primero visitaremos las plantaciones de café Doka Estate para desayunar y hacer el tour del café. Luego subiremos al cráter principal del Volcán Poás (uno de los cráteres tipo géiser más grandes del mundo). Terminamos en los espectaculares Jardines de la Catarata La Paz, donde almorzaremos un buffet típico y caminaremos por el aviario, mariposario y las cataratas mágicas. Salida desde San José.',
      en: 'Maximize your stay in San Jose with this incredible 1-Day Combo. First, we visit Doka Estate coffee plantations for breakfast and the coffee tour. Then we ascend to the main crater of Poás Volcano (one of the largest geyser-type craters in the world). We finish at the spectacular La Paz Waterfall Gardens, where we will have a traditional buffet lunch and walk through the aviary, butterfly observatory, and magical waterfalls. Departs from San Jose.'
    },
    highlights: {
      es: ['Tour guiado de café', 'Entrada al Parque Nacional Volcán Poás', 'Santuario de Vida Silvestre La Paz', 'Desayuno y almuerzo buffet incluidos', 'Transporte desde tu hotel en San José'],
      en: ['Guided coffee tour', 'Poás Volcano National Park entrance', 'La Paz Waterfall Wildlife Sanctuary', 'Breakfast and buffet lunch included', 'Roundtrip transport from San Jose hotels']
    },
    inclusions: {
      es: ['Transporte A/C ida y vuelta', 'Guía bilingüe profesional', 'Desayuno típico buffet', 'Almuerzo buffet en La Paz', 'Entrada al Parque Nacional Volcán Poás', 'Entrada a Cataratas La Paz'],
      en: ['Roundtrip A/C Transportation', 'Professional bilingual guide', 'Traditional buffet breakfast', 'Buffet lunch at La Paz', 'Poás Volcano National Park entrance', 'La Paz Waterfall Gardens ticket']
    },
    exclusions: {
      es: ['Propinas voluntarias', 'Bebidas alcohólicas no incluidas'],
      en: ['Optional gratuities', 'Alcoholic beverages not specified']
    },
    whatToBring: {
      es: ['Abrigo ligero o suéter', 'Zapatos cómodos para caminar', 'Cámara fotográfica', 'Capa o impermeable'],
      en: ['Light jacket or sweater', 'Comfortable walking shoes', 'Camera', 'Raincoat or poncho']
    },
    pickupHotels: [
      'San José Palacio', 'Radisson San José', 'Gran Hotel Costa Rica', 'Hilton Garden Inn San José',
      'Studio Hotel Santa Ana', 'Intercontinental Costa Rica', 'Crowne Plaza Corobicí', 'Marriott San José Belén'
    ],
    departureTimes: ['06:30 AM', '07:00 AM'],
    location: {
      lat: 10.1983,
      lng: -84.2307,
      placeName: 'Volcán Poás, Alajuela, Costa Rica'
    },
    operatorName: 'Expediciones Tropicales',
    operatorBadge: {
      es: 'Operador Oficial Certificado #1',
      en: 'Certified Official Operator #1'
    },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'arenal-hot-springs',
    title: {
      es: 'Combo Arenal: Caminata Volcánica, Catarata y Aguas Termales de Baldi',
      en: 'Arenal Combo: Volcano Hike, Waterfall & Baldi Hot Springs'
    },
    subtitle: {
      es: 'Pase completo con almuerzo, cena buffet y transporte incluido',
      en: 'Full day pass with lunch, dinner buffet & roundtrip pickup'
    },
    category: 'volcanoes',
    region: 'arenal',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 125,
    durationHours: 10,
    durationLabel: { es: 'Día Completo (10h)', en: 'Full Day (10h)' },
    difficulty: 'moderado',
    difficultyLabel: { es: 'Moderado', en: 'Moderate' },
    rating: 4.9,
    reviewsCount: 384,
    featured: true,
    bestseller: true,
    freeCancellation: true,
    tourType: "group",
    ecoCert: true,
    description: {
      es: 'Vive la experiencia definitiva en La Fortuna. Inicia con una caminata guiada por las senderos de lava volcánica de 1968 observando aves, tucanes y monas. Desciende a la majestuosa Catarata La Fortuna de 70m para nadar en sus cristalinas aguas frías. Finaliza el día relajando tus músculos en más de 25 piscinas térmicas de aguas termales volcánicas con cena buffet incluida.',
      en: 'The ultimate La Fortuna adventure. Start with a guided walk through 1968 Arenal volcano lava trails watching wildlife, toucans, and monkeys. Descend to the majestic 70m La Fortuna Waterfall for a refreshing swim. Conclude your day relaxing in over 25 geothermal thermal pools surrounded by lush gardens, followed by a delicious buffet dinner.'
    },
    highlights: {
      es: [
        'Caminata por el Parque Nacional Volcán Arenal sobre coladas de lava',
        'Nado en la impresionante Catarata La Fortuna',
        'Acceso a 25 piscinas termales naturales con diferentes temperaturas',
        'Almuerzo típico costarricense y cena buffet completa',
        'Guía naturalista bilingüe experimentado por el'
      ],
      en: [
        'Volcano hiking trail over historic 1968 lava fields',
        'Swim in the natural pool of La Fortuna Waterfall',
        'Access to 25 volcanic hot spring pools surrounded by tropical flora',
        'Traditional Costa Rican lunch and full dinner buffet included',
        'Certified bilingualnaturalist guide'
      ]
    },
    inclusions: {
      es: ['Transporte ida y vuelta desde tu hotel en La Fortuna', 'Entrada al Parque Nacional Volcán Arenal', 'Entrada a Catarata La Fortuna', 'Pase de día y cena en Aguas Termales Baldi', 'Guía naturalista bilingüe', 'Agua embotellada y frutas'],
      en: ['Roundtrip hotel transport in La Fortuna', 'Arenal Volcano NP entry fee', 'La Fortuna Waterfall entry fee', 'Day pass & buffet dinner at Baldi Hot Springs', 'Certified bilingual guide', 'Bottled water and fresh fruit']
    },
    exclusions: {
      es: ['Propinas para el guía y chofer', 'Tratamientos de Spa y masajes', 'Bebidas alcohólicas adicionales'],
      en: ['Tips for driver and guide', 'Spa treatments or massages', 'Alcoholic beverages']
    },
    whatToBring: {
      es: ['Zapatos de senderismo o tenis', 'Traje de baño y paño', 'Ropa de cambio', 'Repelente de insectos ecológico', 'Protector solar y capa para lluvia'],
      en: ['Hiking shoes or sneakers', 'Swimsuit and towel', 'Change of clothes', 'Eco-friendly bug spray', 'Sunscreen and light raincoat']
    },
    pickupHotels: [
      'Nayara Springs & Resorts',
      'The Springs Resort & Spa',
      'Tabacón Thermal Resort',
      'Amor Arenal',
      'Hotel Los Lagos',
      'Selina La Fortuna',
      'Arenal Observatory Lodge',
      'Cualquier Hotel en Centro de La Fortuna'
    ],
    departureTimes: ['07:30 AM', '11:30 AM'],
    location: {
      lat: 10.4633,
      lng: -84.7032,
      placeName: 'La Fortuna, Alajuela, Costa Rica'
    }
  },
  {
    id: 'monteverde-canopy',
    title: {
      es: 'Monteverde Extreme Canopy Zipline y Puentes Colgantes',
      en: 'Monteverde Extreme Zipline Canopy & Hanging Bridges'
    },
    subtitle: {
      es: 'Vuela por una de las tirolesas más largas de Latinoamérica (1,590 metros) y camina sobre las nubes',
      en: 'Fly on one of Latin America’s longest ziplines (1,590 meters) and walk among cloud forest tops'
    },
    category: 'canopy',
    region: 'monteverde',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 89,
    durationHours: 5,
    durationLabel: { es: 'Medio Día (5h)', en: 'Half Day (5h)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil a Moderado', en: 'Easy to Moderate' },
    rating: 4.95,
    reviewsCount: 512,
    featured: true,
    bestseller: true,
    freeCancellation: true,
    tourType: "group",
    ecoCert: true,
    description: {
      es: 'Siente la verdadera adrenalina en el famoso Bosque Nuboso de Monteverde. Este tour incluye 10 tirolesas acrobáticas, vuelo estilo "Superman" de 1.5km sobre el dosel arbóreo, y el aterrador Tarzan Swing. Luego, camina pacíficamente a través de 8 puentes colgantes suspendidos en las copas de los árboles, donde habita el majestuoso Quetzal Resplandeciente.',
      en: 'Experience pure thrill in the famous Monteverde Cloud Forest. Includes 10 canopy zip cables, a 1.5km Superman flight over the lush canopy, and the famous Tarzan Swing. Afterwards, stroll through 8 suspension bridges suspended high above the cloud forest, home to the resplendent quetzal.'
    },
    highlights: {
      es: [
        'Vuelo Superman en tirolesa de 1.59 kilómetros de longitud',
        'Tarzan Swing de 45 metros de caída libre',
        '8 puentes colgantes sobre el bosque nuboso para avistamiento de aves',
        'Equipos de seguridad franceses Petzl con doble cable',
        'Guías especialistas en aventura e historia natural'
      ],
      en: [
        '1.59km Superman zipline cable high over cloud forest',
        'Thrilling 45m Tarzan Swing free fall drop',
        '8 canopy hanging bridges ideal for quetzal and hummingbird spotting',
        'Top-of-the-line Petzl safety gear with dual wire cables',
        'Expert bilingual guides certified in high-ropes & wildlife rescue'
      ]
    },
    inclusions: {
      es: ['Transporte ida y vuelta desde hoteles de Santa Elena y Monteverde', 'Todo el equipo de seguridad experimentado', 'Guías instructores bilingües', 'Caminata por puentes colgantes'],
      en: ['Roundtrip hotel transport in Monteverde & Santa Elena', 'All Petzl certified safety equipment', 'Bilingual canopy instructors', 'Hanging bridges guided walk']
    },
    exclusions: {
      es: ['Almuerzo (disponible en restaurante local por $15)', 'Fotografías profesionales de la tirolesa'],
      en: ['Lunch (optional at restaurant $15)', 'Professional action photos']
    },
    whatToBring: {
      es: ['Pantalón largo cómodo', 'Abrigo o chaqueta cortaviento', 'Zapatos cerrados de amarrar', 'Cámara con correa sujetadora'],
      en: ['Comfortable long pants', 'Windbreaker or jacket', 'Closed-toe hiking shoes or sneakers', 'Camera with wrist strap']
    },
    pickupHotels: [
      'Hotel Belmar',
      'El Establo Mountain Hotel',
      'Senda Monteverde',
      'Monteverde Lodge & Gardens',
      'Selina Monteverde',
      'Hoteles en Santa Elena Centro'
    ],
    departureTimes: ['08:00 AM', '11:00 AM', '02:00 PM'],
    location: {
      lat: 10.3157,
      lng: -84.8255,
      placeName: 'Monteverde, Puntarenas, Costa Rica'
    }
  },
  {
    id: 'manuel-antonio-park',
    title: {
      es: 'Excursión Guiada Parque Nacional Manuel Antonio y Playa',
      en: 'Guided Manuel Antonio National Park & Beach Safari'
    },
    subtitle: {
      es: 'Avistamiento de perezosos, monos cara blanca, iguanas y tarde de baño en playa paradisíaca',
      en: 'Spot sloths, capuchins, toucans & relax on ranked top world beaches'
    },
    category: 'wildlife',
    region: 'manuel_antonio',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 65,
    durationHours: 4,
    durationLabel: { es: '4 Horas', en: '4 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil (Apto para familias)', en: 'Easy (Family Friendly)' },
    rating: 4.88,
    reviewsCount: 420,
    featured: true,
    bestseller: true,
    freeCancellation: true,
    tourType: "group",
    ecoCert: true,
    description: {
      es: 'Descubre el parque nacional más famoso de Costa Rica. Con nuestros telescopios HD de alta potencia y guías naturalistas, observa perezosos de dos y tres dedos, monos aulladores, capuchinos, ciervos, iguanas y venados. La caminata concluye en la paradisíaca Playa Manuel Antonio, votada entre las 10 mejores playas del mundo por TripAdvisor.',
      en: 'Explore Costa Rica’s jewel national park. Guided by naturalists equipped with high-powered HD spotting scopes, capture stunning up-close photos of 2-toe and 3-toe sloths, capuchin monkeys, iguanas, and tropical birds. The easy boardwalk walk ends at pristine Manuel Antonio beach for a crystal blue swim.'
    },
    highlights: {
      es: [
        'Uso de telescopios ópticos HD de alta definición para fotos increíbles con celular',
        'Alta probabilidad de avistar perezosos y familias de monos capuchinos',
        'Paseo por senderos elevados accesibles y boscosos',
        'Tiempo libre para disfrutar de la arena blanca y mar turquesa del parque',
        'Pase de entrada con hora reservada sin filas en la boletería'
      ],
      en: [
        'HD spotting scopes provided for amazing phone photos of wildlife',
        'High probability of sloth and monkey sightings with expert guide',
        'Flat boardwalk trails easy for children and seniors',
        'Free swim time at breathtaking white-sand Manuel Antonio beach',
        'Skip-the-line pre-reserved entrance ticket included'
      ]
    },
    inclusions: {
      es: ['Boleto de entrada autorizada al Parque Nacional Manuel Antonio', 'Guía naturalista profesional de', 'Uso de telescopio HD', 'Transporte desde hoteles en Manuel Antonio y Quepos'],
      en: ['Official entry park ticket to Manuel Antonio NP', 'certified naturalist guide', 'HD spotting telescope', 'Roundtrip pickup in Manuel Antonio & Quepos']
    },
    exclusions: {
      es: ['Comidas (dentro del parque no se permite plástico de un solo uso)', 'Alquiler de sillas de playa'],
      en: ['Food (single use plastics prohibited inside park)', 'Beach chair rental']
    },
    whatToBring: {
      es: ['Traje de baño puesto', 'Paño de playa', 'Botella de agua reutilizable', 'Pasaporte o copia clara de cédula', 'Zapato cómodo para caminar'],
      en: ['Swimsuit underneath', 'Beach towel', 'Reusable water bottle', 'Passport or valid photo ID copy', 'Walking shoes or sandals']
    },
    pickupHotels: [
      'Arenas Del Mar Beachfront Resort',
      'Hotel Parador Nature Resort',
      'Shana By The Beach',
      'Makanda by the Sea',
      'Selina Manuel Antonio',
      'Hoteles en Quepos Centro'
    ],
    departureTimes: ['07:00 AM', '09:00 AM', '12:30 PM'],
    location: {
      lat: 9.3908,
      lng: -84.1332,
      placeName: 'Manuel Antonio, Puntarenas, Costa Rica'
    }
  },
  {
    id: 'pacuare-rafting',
    title: {
      es: 'Rafting en Río Pacuare Rápidos Clase III-IV',
      en: 'Pacuare River Whitewater Rafting Class III-IV'
    },
    subtitle: {
      es: 'Aventura de día completo en uno de los 5 ríos más hermosos del planeta por National Geographic',
      en: 'Full-day adrenaline down National Geographic top 5 most scenic rivers in the world'
    },
    category: 'rafting',
    region: 'pacuare',
    image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 110,
    durationHours: 9,
    durationLabel: { es: 'Día Completo (9h)', en: 'Full Day (9h)' },
    difficulty: 'exigente',
    difficultyLabel: { es: 'Exigente (Edad mín. 12)', en: 'Challenging (Min age 12)' },
    rating: 4.98,
    reviewsCount: 290,
    featured: true,
    bestseller: false,
    ecoCert: true,
    description: {
      es: 'El Río Pacuare ofrece la combinación perfecta de rápidos electrizantes de Clase III y IV y cañones con cascadas que caen directamente al río. Durante el recorrido de 30 km, navegarás por la selva virgen de la Cordillera de Talamanca, con paradas en riachuelos para disfrutar de un delicioso almuerzo preparado en la orilla.',
      en: 'The Pacuare River provides an unforgettable mix of thrilling Class III-IV rapids and virgin rainforest canyons with cascading waterfalls. On this 18-mile stretch, you will raft past primary rainforest in Talamanca, enjoying a delicious riverside picnic lunch along the canyon.'
    },
    highlights: {
      es: [
        '30 km de rápidos intensos como "Doble Cerro", "Huacas" y "Cialitos"',
        'Cañón del Pacuare con paredes de roca cubiertas de selva tropical',
        'Desayuno calientito en el centro de operaciones y almuerzo picnic abundante',
        'Guías fluviales experimentados por la IRF (Federación Internacional de Rafting)',
        'Salidas desde San José, Turrialba o Puerto Viejo'
      ],
      en: [
        '18 miles of continuous Class III & IV rapids',
        'Pass through the breathtaking Pacuare river gorge canyon',
        'Hearty Costa Rican breakfast and riverside gourmet lunch included',
        'IRF (International Rafting Federation) certified river guides',
        'Roundtrip transport available from San José, Turrialba, or Puerto Viejo'
      ]
    },
    inclusions: {
      es: ['Transporte desde San José o Turrialba', 'Desayuno completo y almuerzo a la orilla del río', 'Todo el equipo de rafting (casco, chaleco salvavidas, remo)', 'Guía por balsa y balsa de seguridad'],
      en: ['Transport from San José or Turrialba', 'Hot breakfast and riverside picnic lunch', 'Complete safety equipment (paddles, helmets, vests)', 'Certificated guide per boat & safety kayak']
    },
    medicalRestrictions: {
      es: ['No recomendado para personas con problemas cardíacos, embarazadas después del sexto mes o quienes sufren lesiones de espalda'],
      en: ['Not recommended for individuals with heart conditions, pregnant women past their 6th month, or those with severe back injuries']
    },
    exclusions: {
      es: ['Fotos de acción en los rápidos ($30 por balsa)', 'Propinas para guías'],
      en: ['Action photos package ($30 per boat)', 'Guide gratuities']
    },
    whatToBring: {
      es: ['Ropa para mojarse (camisa sintética y short)', 'Zapato de agua sujetado al pie (no chancletas)', 'Ropa seca y paño para el regreso', 'Bloqueador solar resistente al agua'],
      en: ['Clothes to get wet (quick dry shorts/rashguard)', 'Secured water shoes or strapped sandals (no flip flops)', 'Dry change of clothes & towel for return', 'Waterproof sunscreen']
    },
    pickupHotels: [
      'Hoteles en San José (Paseo Colón, La Sabana, Escalante)',
      'Hoteles en Turrialba',
      'Guápiles Centro de Operaciones'
    ],
    departureTimes: ['06:00 AM'],
    location: {
      lat: 9.9234,
      lng: -83.5678,
      placeName: 'Siquirres / Río Pacuare, Limón, Costa Rica'
    }
  },
  {
    id: 'tortuguero-canals',
    title: {
      es: 'Expedición en Bote por los Canales de Tortuguero',
      en: 'Tortuguero National Park Amazonian Canals Boat Tour'
    },
    subtitle: {
      es: 'Navega por la selva tropical del Caribe observando garzas, caimanes, manatíes y monos',
      en: 'Boat safari through Caribbean rainforest waterways, caimans & sea turtles'
    },
    category: 'wildlife',
    region: 'tortuguero',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 95,
    durationHours: 8,
    durationLabel: { es: 'Día Completo (8h)', en: 'Full Day (8h)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil', en: 'Easy' },
    rating: 4.92,
    reviewsCount: 185,
    featured: false,
    bestseller: false,
    ecoCert: true,
    description: {
      es: 'Tortuguero es conocido mundialmente como "El Amazonas de Costa Rica". Sin carreteras para vehículos, esta aventura te lleva en bote a motor eléctrico silencioso por sus pintorescos canales donde se refugian caimanes, nutrias de río, monos aulladores y aves acuáticas exóticas. Entre julio y octubre, opcionalmente puedes presenciar el desove de la Tortuga Verde marina.',
      en: 'Known worldwide as "Costa Rica’s Amazon". With no paved roads, this tour journeys by quiet electric boat through maze-like jungle canals. Home to caimans, river otters, spider monkeys, and cyan toucans. From July to October, observe the nesting of giant green sea turtles on the Caribbean beach.'
    },
    highlights: {
      es: [
        'Navegación silenciosa en botes ecológicos por canales vírgenes',
        'Visita al pintoresco pueblo caribeño de Tortuguero',
        'Posibilidad de ver desove de tortugas marinas (en temporada Jul-Oct)',
        'Almuerzo buffet caribeño con arroz con coco y patacones'
      ],
      en: [
        'Silent eco-boat cruise deep into ancient jungle waterways',
        'Cultural visit to Tortuguero Caribbean village',
        'Night sea turtle nesting watch tour available in season (July-Oct)',
        'Delicious Caribbean lunch with coconut rice & fried plantains'
      ]
    },
    inclusions: {
      es: ['Transporte terrestre y fluvial en bote con motor', 'Almuerzo buffet caribeño', 'Guía naturalista caribeño local', 'Entrada al Parque Nacional Tortuguero'],
      en: ['Land and boat water taxi transport', 'Caribbean buffet lunch', 'Local Caribbean naturalist guide', 'Tortuguero NP entry fee']
    },
    exclusions: {
      es: ['Tour nocturno de tortugas ($35 extra en temporada)', 'Bebidas alcohólicas'],
      en: ['Night turtle nesting tour ($35 extra in season)', 'Alcoholic drinks']
    },
    whatToBring: {
      es: ['Capa para la lluvia o poncho', 'Camisa fresca de manga larga', 'Cámara con zoom', 'Efectivo en colones para artesanías locales'],
      en: ['Rain poncho or waterproof jacket', 'Light long-sleeve shirt', 'Zoom camera', 'Cash CRC for local artisan souvenirs']
    },
    pickupHotels: [
      'Pavo Real Lodge Tortuguero',
      'Mawamba Lodge',
      'Laguna Lodge',
      'Hoteles en San José (Salida 05:30 AM)'
    ],
    departureTimes: ['06:00 AM'],
    location: {
      lat: 10.5417,
      lng: -83.5021,
      placeName: 'Tortuguero, Limón, Costa Rica'
    }
  },
  {
    id: 'tamarindo-catamaran',
    title: {
      es: 'Catamarán al Atardecer Tamarindo con Snorkel y Open Bar',
      en: 'Tamarindo Sunset Catamaran Cruise, Snorkel & Open Bar'
    },
    subtitle: {
      es: 'Navegación de lujo por la costa del Pacífico de Guanacaste, snorkel y avistamiento de delfines',
      en: 'Luxury sailing along Guanacaste gold coast, dolphin watch & open bar'
    },
    category: 'beaches',
    region: 'guanacaste',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 90,
    durationHours: 5,
    durationLabel: { es: '5 Horas', en: '5 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil (Relax)', en: 'Easy (Relaxing)' },
    rating: 4.87,
    reviewsCount: 310,
    featured: true,
    bestseller: true,
    freeCancellation: true,
    tourType: "group",
    ecoCert: false,
    description: {
      es: 'Sube a bordo de nuestro espacioso catamarán de 50 pies para navegar por las doradas aguas del Pacífico. Fondearemos en una bahía aislada ideal para hacer snorkel entre peces tropicales, mantarrayas y tablas de paddleboard. Disfruta de barra libre ilimitada de cócteles tropicales y comida fresca mientras contemplas el legendario atardecer de Guanacaste.',
      en: 'Board our sleek 50ft catamaran for a memorable afternoon along the Gold Coast. We anchor in a secluded cove perfect for snorkeling among tropical fish, rays, and paddleboarding. Enjoy unlimited open bar cocktails and light meal while marveling at Guanacaste’s famous Pacific sunset.'
    },
    highlights: {
      es: [
        'Barra libre ilimitada (piña colada, margaritas, cerveza costarricense Imperial y jugos)',
        'Almuerzo o aperitivos calientes (fajitas de pollo, guacamole, chips y frutas)',
        'Equipo completo de snorkel, kayaks y tablas de Stand Up Paddle (SUP)',
        'Avistamiento frecuente de delfines, tortugas marinas y ballenas jorobadas en temporada',
        'Música a bordo y atardecer inolvidable'
      ],
      en: [
        'Unlimited open bar (Piña coladas, margaritas, local Imperial beer, fruit juices)',
        'Fresh hot meal served on board (chicken fajitas, guacamole, tropical fruits)',
        'Complimentary use of snorkel gear, kayaks, and Stand-Up Paddle boards',
        'Spot wild dolphins, sea turtles, and humpback whales in season',
        'Lively music and majestic Pacific golden hour sunset'
      ]
    },
    inclusions: {
      es: ['Navegación de 5 horas en catamarán', 'Barra libre ilimitada de bebidas', 'Comida servida a bordo', 'Uso de tablas de SUP y snorkel', 'Transporte desde playa Tamarindo, Langosta y Conchal'],
      en: ['5-hour catamaran sailing', 'Unlimited open bar beverages', 'Meal served on board', 'Snorkel gear & Stand Up Paddleboards', 'Pickup from Tamarindo, Langosta & Conchal']
    },
    exclusions: {
      es: ['Propinas para la tripulación marinera'],
      en: ['Tips for boat captain and crew']
    },
    whatToBring: {
      es: ['Traje de baño puesto', 'Lentes de sol y gorra', 'Bloqueador solar seguro para arrecifes', 'Cámara impermeable'],
      en: ['Swimsuit on', 'Sunglasses and hat', 'Reef-safe sunscreen', 'Waterproof phone case or camera']
    },
    pickupHotels: [
      'Jardín del Edén Boutique Hotel',
      'JW Marriott Guanacaste',
      'The Westin Reserva Conchal',
      'W Costa Rica Reserva Conchal',
      'Hoteles en Tamarindo Centro'
    ],
    departureTimes: ['01:30 PM'],
    location: {
      lat: 10.2993,
      lng: -85.8371,
      placeName: 'Tamarindo, Guanacaste, Costa Rica'
    }
  },
  {
    id: 'corcovado-expedition',
    title: {
      es: 'Expedición Bosque Virgen Parque Nacional Corcovado (Sirena)',
      en: 'Corcovado National Park Wildlife Safari (Sirena Station)'
    },
    subtitle: {
      es: 'Aventura a la estación Sirena en bote rápido para ver tapires, jaguares y monos ardilla',
      en: 'Boat safari to Sirena Station to spot tapirs, monkeys, and wild scarlet macaws'
    },
    category: 'wildlife',
    region: 'osa',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 165,
    durationHours: 10,
    durationLabel: { es: 'Día Completo (10h)', en: 'Full Day (10h)' },
    difficulty: 'moderado',
    difficultyLabel: { es: 'Moderado', en: 'Moderate' },
    rating: 5.0,
    reviewsCount: 142,
    featured: true,
    bestseller: false,
    ecoCert: true,
    description: {
      es: 'Corcovado fue definido por National Geographic como "el lugar con mayor intensidad biológica de la Tierra". Representa el 2.5% de la biodiversidad del planeta. Esta expedición en bote rápido te lleva hasta la remota Estación Sirena en el corazón del parque, donde habitan las 4 especies de monos de Costa Rica, la danta o tapir de Centroamérica, chanchos de monte y guacamayas rojas.',
      en: 'Described by National Geographic as "the most biologically intense place on Earth", Corcovado hosts 2.5% of world biodiversity. Take a scenic ocean boat journey into the remote Sirena Ranger Station. Here you can encounter all 4 Costa Rican monkey species, Baird’s tapir, peccaries, and brilliant scarlet macaws.'
    },
    highlights: {
      es: [
        'Desembarco húmedo emocionante en las playas vírgenes de Corcovado',
        'Caminatas guiadas con avistamiento de Tapires de Centroamérica',
        'Observación de las 4 especies de monos: Capuchino, Aullador, Araña y Ardilla',
        'Guía especialista en biología de conservación con telescopio',
        'Almuerzo estilo picnic servido en la estación biológica'
      ],
      en: [
        'Thrilling wet landing at remote Sirena station beach',
        'High chance to spot endangered Baird’s Tapirs sleeping or bathing',
        'Observe all 4 native species of monkeys in one single day',
        'Biologist naturalists with specialized field gear',
        'Picnic lunch inside Corcovado ranger station'
      ]
    },
    inclusions: {
      es: ['Transporte en bote bimotor rápido desde Drake Bay o Puerto Jiménez', 'Permisos y tickets de entrada a Corcovado', 'Guía naturalista profesional de el SINAC', 'Almuerzo y frutas'],
      en: ['Speedboat ocean transport from Drake Bay or Puerto Jiménez', 'SINAC official entrance permits', 'Certified SINAC wildlife guide', 'Lunch & trail snacks']
    },
    exclusions: {
      es: ['Propinas para la tripulación', 'Alojamiento nocturno (tour de 1 día)'],
      en: ['Crew tips', 'Overnight stay fees']
    },
    whatToBring: {
      es: ['Sandalias para desembarco en agua + tenis para caminata', 'Medias altas para proteger de picaduras', 'Botella con agua (mínimo 2 litros)', 'Cámara con buen lente o funda impermeable'],
      en: ['Water sandals for wet landing + sturdy trail sneakers', 'Tall socks for trail protection', 'Reusable water bottle (2 Liters min)', 'Camera with telephoto lens']
    },
    pickupHotels: [
      'Aguila de Osa Rainforest Lodge',
      'Copa De Arbol Beach & Rainforest Resort',
      'Drake Bay Getaway',
      'Hoteles en Bahía Drake o Puerto Jiménez'
    ],
    departureTimes: ['06:00 AM'],
    location: {
      lat: 8.4802,
      lng: -83.5888,
      placeName: 'Estación Sirena, Corcovado, Puntarenas, Costa Rica'
    }
  },
  {
    id: 'coffee-chocolate-tour',
    title: {
      es: 'Tour Don Juan: Café, Chocolate Cacao Artesanal y Caña de Azúcar',
      en: 'Don Juan Coffee, Organic Chocolate & Sugar Cane Tour'
    },
    subtitle: {
      es: 'Experiencia gastronómica y cultural participativa en finca orgánica costarricense',
      en: 'Hands-on organic farm experience, coffee tasting & cacao chocolate making'
    },
    category: 'culture',
    region: 'arenal',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 45,
    durationHours: 2.5,
    durationLabel: { es: '2.5 Horas', en: '2.5 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Muy Fácil', en: 'Very Easy' },
    rating: 4.91,
    reviewsCount: 215,
    featured: false,
    bestseller: false,
    ecoCert: true,
    description: {
      es: 'Descubre el secreto del mejor café gourmet de Costa Rica y el origen maya del chocolate. En este recorrido interactivo por la finca, cosecharás granos de café, probarás los diferentes grados de tueste y aprenderás a preparar chocolate artesanal moliendo tus propias semillas de cacao con canela y vainilla natural. ¡Muele caña de azúcar en el trapiches tradicional!',
      en: 'Learn the secrets of Costa Rican gourmet coffee and ancient chocolate making. Pick coffee cherries right from the trees, roast fresh coffee beans, and craft your own pure dark chocolate from raw cacao seeds. Finish by squeezing sweet sugar cane juice on an authentic wooden trapiche press!'
    },
    highlights: {
      es: [
        'Cosecha y degustación de café arábica recién molido con método Chorreador',
        'Taller de chocolate: molido manual de cacao y preparación de bombones',
        'Extracción de jugo de caña dulce en trapiche de madera tradicional',
        'Apto para niños y adultos de todas las edades'
      ],
      en: [
        'Interactive coffee picking and traditional Chorreador cloth filter tasting',
        'Chocolate workshop: crush cacao beans & customize your own chocolate bar',
        'Fresh sugar cane juice extraction on traditional ox press',
        'Family friendly interactive cultural experience'
      ]
    },
    inclusions: {
      es: ['Entrada a la finca orgánica', 'Degustación ilimitada de café, chocolate y jugo de caña', 'Guía local experto en cultura cafetalera', 'Transporte local disponible'],
      en: ['Farm entry ticket', 'Unlimited coffee, chocolate & sugarcane juice tastings', 'Expert local coffee artisan guide', 'Local transport pickup available']
    },
    exclusions: {
      es: ['Productos de la tienda de souvenirs (café en grano para llevar)'],
      en: ['Souvenir shop purchases']
    },
    whatToBring: {
      es: ['Ropa cómoda', 'Cámara fotográfica', 'Apetito por el chocolate'],
      en: ['Comfortable casual clothes', 'Camera', 'Sweet tooth for gourmet chocolate']
    },
    pickupHotels: [
      'Hoteles en La Fortuna',
      'Hoteles en Monteverde'
    ],
    departureTimes: ['08:00 AM', '10:00 AM', '01:00 PM', '03:00 PM'],
    location: {
      lat: 10.4682,
      lng: -84.6421,
      placeName: 'La Fortuna / Monteverde, Costa Rica'
    }
  },
  {
    id: 'rio-celeste-waterfall',
    title: {
      es: 'Caminata Parque Nacional Volcán Tenorio y Río Celeste',
      en: 'Rio Celeste Waterfall & Tenorio Volcano National Park Hike'
    },
    subtitle: {
      es: 'Descubre la mítica catarata turquesa, "Los Teñideros" y pozas sulfurosas celestes',
      en: 'Witness the magical turquoise waterfall, blue lagoon & chemical reaction point'
    },
    category: 'volcanoes',
    region: 'arenal',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 98,
    durationHours: 7,
    durationLabel: { es: '7 Horas', en: '7 Hours' },
    difficulty: 'moderado',
    difficultyLabel: { es: 'Moderado (Senderos de montaña)', en: 'Moderate (Mountain Trails)' },
    rating: 4.96,
    reviewsCount: 368,
    featured: true,
    bestseller: true,
    freeCancellation: true,
    tourType: "group",
    ecoCert: true,
    description: {
      es: 'Cunta la leyenda que cuando Dios terminó de pintar el cielo, lavó sus pinceles en el Río Celeste. En esta espectacular caminata guiada por la selva tropical del Parque Nacional Volcán Tenorio, visitarás la deslumbrante Catarata Río Celeste de 30 metros de altura, los borbollones de azufre hirviente, la Laguna Azul y "Los Teñideros", donde dos ríos transparentes se unen y cambian químicamente a un color azul turquesa brillante.',
      en: 'Legend says when God finished painting the sky, he washed his brushes in Rio Celeste. On this guided hike through Tenorio Volcano National Park, witness the iconic 100ft turquoise waterfall, bubbling volcanic fumaroles, Blue Lagoon, and "Los Teñideros"—the exact junction where two clear rivers merge to turn brilliant neon sky blue.'
    },
    highlights: {
      es: [
        'Avistamiento del fenómeno químico natural en "Los Teñideros"',
        'Fotografías inolvidables en la Catarata Río Celeste de 30m',
        'Caminata en selva tropical virgen rica en perezosos y ranas',
        'Almuerzo típico gourmet costarricense (Casado) en restaurante local',
        'Transporte privado A/C con chofer profesional'
      ],
      en: [
        'See the natural optical chemistry phenomenon at "Los Teñideros"',
        'Capture photos at the stunning 100ft turquoise Rio Celeste Waterfall',
        'Hike primary rainforest trails full of sloths, tapir tracks & monkeys',
        'Enjoy a delicious authentic farm-to-table Costa Rican Casado lunch',
        'Roundtrip A/C transport from La Fortuna hotels included'
      ]
    },
    inclusions: {
      es: ['Entrada autorizada al Parque Nacional Volcán Tenorio', 'Guía naturalista bilingüe experimentado', 'Almuerzo típico costarricense', 'Transporte ida y vuelta desde hoteles en La Fortuna'],
      en: ['Official entry ticket to Tenorio Volcano NP', 'Certified bilingual naturalist guide', 'Traditional Costa Rican lunch', 'Roundtrip pickup in La Fortuna']
    },
    exclusions: {
      es: ['Alquiler de botas de hule en época lluviosa ($5)', 'Propinas al guía'],
      en: ['Rubber boot rental in rainy season ($5)', 'Guide tips']
    },
    whatToBring: {
      es: ['Zapatos de senderismo con buen agarre', 'Capa de lluvia o poncho', 'Repelente ecológico de mosquitos', 'Cámara y botella de agua'],
      en: ['Hiking shoes with good traction', 'Rain jacket or poncho', 'Eco-friendly bug spray', 'Water bottle and camera']
    },
    pickupHotels: [
      'Hoteles en La Fortuna y alrededores',
      'Bijagua Lodge & Resorts'
    ],
    departureTimes: ['07:00 AM', '08:30 AM'],
    location: {
      lat: 10.7028,
      lng: -85.0152,
      placeName: 'Parque Nacional Volcán Tenorio, Bijagua, Costa Rica'
    }
  },
  {
    id: 'night-jungle-walk',
    title: {
      es: 'Caminata Nocturna por la Selva: Ranas de Ojos Rojos, Serpientes y Perezosos',
      en: 'Jungle Night Safari: Red-Eyed Tree Frogs, Sloths & Nocturnal Wildlife'
    },
    subtitle: {
      es: 'Explora el bosque tropical cuando el 80% de las criaturas despiertan al anochecer',
      en: 'Discover the rainforest at dusk when 80% of rainforest species awaken'
    },
    category: 'wildlife',
    region: 'arenal',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 52,
    durationHours: 2.5,
    durationLabel: { es: '2.5 Horas', en: '2.5 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil (Todo Público)', en: 'Easy (All Ages)' },
    rating: 4.93,
    reviewsCount: 289,
    featured: false,
    bestseller: true,
    freeCancellation: true,
    tourType: "group",
    ecoCert: true,
    description: {
      es: 'Cuando el sol se oculta en Costa Rica, la selva cobra una vida vibrante y misteriosa. Con linternas LED de alta potencia proporcionadas, tu guía experto te adentrará por senderos protegidos para buscar la emblemática Rana de Ojos Rojos, ranas de cristal, tarántulas de rodillas doradas, puercoespines, serpientes no venenosas y perezosos activos en las copas de los árboles.',
      en: 'When the sun sets over Costa Rica, over 80% of rainforest animals emerge. Equipped with high-power LED flashlights provided, journey along jungle trails with an expert Herpetologist naturalist to spot iconic Red-Eyed Tree Frogs, translucent Glass Frogs, sleeping toucans, bioluminescent fungi, tarantulas, and active nocturnal sloths.'
    },
    highlights: {
      es: [
        'Observación cercana de la famosa Rana de Ojos Rojos (Agalychnis callidryas)',
        'Guía especialista en herpetología y biología nocturna',
        'Linterna LED profesional individual incluida',
        'Bebida caliente calientita (Café o Chocolate) y galletas al finalizar'
      ],
      en: [
        'Up-close photography of the famous Red-Eyed Tree Frog',
        'Expert Herpetologist guide with extensive jungle spotting experience',
        'Individual powerful LED flashlight provided',
        'Warm Costa Rican coffee, hot cocoa & traditional pastries after hike'
      ]
    },
    inclusions: {
      es: ['Entrada a la reserva biológica nocturna', 'Guía especialista bilingüe', 'Linterna LED profesional', 'Transporte ida y vuelta desde tu hotel', 'Bebida caliente y refrigerio'],
      en: ['Reserve entry ticket', 'Expert bilingual naturalist guide', 'Professional LED flashlight', 'Roundtrip hotel pickup', 'Hot drink & traditional snacks']
    },
    exclusions: {
      es: ['Propinas para el guía'],
      en: ['Guide tips']
    },
    whatToBring: {
      es: ['Pantalón largo y camisa cómoda', 'Zapato cerrado (tenis o botas)', 'Repelente de mosquitos', 'Cámara con flash o celular'],
      en: ['Long pants and comfortable shirt', 'Closed-toe shoes (sneakers or boots)', 'Bug spray', 'Camera with flash']
    },
    pickupHotels: [
      'Todos los hoteles en La Fortuna',
      'Hoteles en Monteverde'
    ],
    departureTimes: ['05:30 PM', '07:00 PM'],
    location: {
      lat: 10.465,
      lng: -84.65,
      placeName: 'La Fortuna / Monteverde, Costa Rica'
    }
  },
  {
    id: 'mistico-hanging-bridges',
    title: {
      es: 'Santuario de Puentes Colgantes Místico Arenal',
      en: 'Místico Arenal Hanging Bridges Guided Canopy Walk'
    },
    subtitle: {
      es: 'Cruza 16 puentes sobre las copas de los árboles con vista al Volcán Arenal',
      en: 'Walk across 16 bridges high in the tree canopy overlooking Arenal Volcano'
    },
    category: 'canopy',
    region: 'arenal',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80'
    ],
    priceUSD: 72,
    durationHours: 3.5,
    durationLabel: { es: '3.5 Horas', en: '3.5 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil (Apto para familias)', en: 'Easy (Family Friendly)' },
    rating: 4.89,
    reviewsCount: 410,
    featured: false,
    bestseller: false,
    ecoCert: true,
    description: {
      es: 'Místico Park es uno de los santuarios ecológicos más impresionantes de Costa Rica. Camina por un sendero de 3.2 km atravesando 16 puentes (6 de ellos suspendidos a más de 45 metros de altura) que te ofrecen una perspectiva ojo a ojo con las aves, perezosos, monos aulladores y orquídeas salvajes, con una vista panorámica majestuosa al Volcán Arenal.',
      en: 'Místico Park offers one of Costa Rica’s most breathtaking canopy walks. Meander along a 2-mile paved nature loop across 16 bridges (6 hanging high in the canopy up to 148ft above the forest floor). Enjoy eye-level encounters with sloths, howler monkeys, toucans, and wild orchids with iconic volcano vistas.'
    },
    highlights: {
      es: [
        'Cruce seguro por 16 puentes con arquitectura suiza de alta ingeniería',
        'Vistas panorámicas espectaculares del Volcán Arenal y la Laguna',
        'Telescopios HD para observar fauna en la copa de los árboles',
        'Accesibilidad universal con senderos pavimentados y rampas'
      ],
      en: [
        'Cross 16 high-tech Swiss engineered canopy & suspension bridges',
        'Sweeping panoramic views of Arenal Volcano & Lake Arenal',
        'Naturalist guide with HD scope for wildlife tree-top spotting',
        'Paved non-slip trails suitable for strollers and wheelchairs'
      ]
    },
    inclusions: {
      es: ['Entrada autorizada a Místico Park', 'Guía naturalista bilingüe experimentado', 'Transporte ida y vuelta desde hoteles en La Fortuna'],
      en: ['Official entry ticket to Místico Park', 'Certified bilingual naturalist guide', 'Roundtrip hotel pickup in La Fortuna']
    },
    exclusions: {
      es: ['Almuerzo', 'Propinas'],
      en: ['Lunch', 'Tips']
    },
    whatToBring: {
      es: ['Zapatos cómodos de caminata', 'Cámara fotográfica', 'Impermeable liviano', 'Agua embotellada'],
      en: ['Comfortable walking shoes', 'Camera', 'Light rain jacket', 'Bottled water']
    },
    pickupHotels: [
      'Hoteles en La Fortuna y zona volcánica'
    ],
    departureTimes: ['08:00 AM', '10:30 AM', '01:30 PM'],
    location: {
      lat: 10.4355,
      lng: -84.7552,
      placeName: 'Místico Park, La Fortuna, Costa Rica'
    }
  },
  {
    id: 'cano-island-snorkeling',
    title: {
      es: 'Isla del Caño: Snorkeling y Avistamiento de Delfines y Ballenas',
      en: 'Caño Island Biological Reserve Snorkeling & Dolphin Marine Safari'
    },
    subtitle: {
      es: 'El mejor arrecife de coral del Pacífico con visibilidad cristalina y mantarrayas',
      en: 'Costa Rica’s top Pacific coral reef with clear waters, sea turtles & reef sharks'
    },
    category: 'beaches',
    region: 'osa',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 145,
    durationHours: 8,
    durationLabel: { es: '8 Horas', en: '8 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil a Moderado', en: 'Easy to Moderate' },
    rating: 4.97,
    reviewsCount: 176,
    featured: true,
    bestseller: false,
    ecoCert: true,
    description: {
      es: 'Ubicada a 20 km de la costa de la Península de Osa, la Reserva Biológica Isla del Caño alberga el arrecife de coral mejor conservado de Costa Rica. Sumérgete en sus aguas transparentes para nadar junto a tortugas mariposas, tiburones arrecifales de punta blanca, rayas águila y cardúmenes de peces tropicales multicolor. Durante el trayecto en bote, avistarás delfines salvajes y ballenas jorobadas.',
      en: 'Located 12 miles off the Osa Peninsula coast, Caño Island Marine Reserve protects Costa Rica’s healthiest coral reef. Snorkel in crystal clear waters alongside hawksbill sea turtles, harmless white-tip reef sharks, eagle rays, and vibrant schools of tropical fish. During the boat ride, watch for pods of wild dolphins and migratory humpback whales.'
    },
    highlights: {
      es: [
        'Dos inmersiones de snorkeling guiadas en arrecifes protegidos',
        'Aguas vírgenes con visibilidad de 15 a 30 metros',
        'Avistamiento de delfines manchados y ballenas jorobadas (en temporada)',
        'Almuerzo buffet en la playa de Violines o Drake Bay'
      ],
      en: [
        'Two guided snorkeling sessions at top protected reef locations',
        'Pristine underwater visibility ranging from 50 to 100 feet',
        'Dolphin watching and humpback whale spotting in migration season',
        'Delicious beachside buffet lunch included'
      ]
    },
    inclusions: {
      es: ['Transporte marítimo en bote motorizado', 'Equipo completo de snorkel (máscara, tubo, aletas y chaleco)', 'Entrada a la Reserva Biológica Isla del Caño', 'Guía de buque y snorkel experimentado', 'Almuerzo y frutas tropicales'],
      en: ['Boat marine transportation', 'Complete snorkel gear (mask, fins, snorkel & vest)', 'Caño Island Reserve entry permits', 'Certified marine guide', 'Lunch and fresh tropical fruits']
    },
    exclusions: {
      es: ['Propinas para la tripulación'],
      en: ['Crew tips']
    },
    whatToBring: {
      es: ['Traje de baño puesto', 'Lentes de sol', 'Bloqueador ecológico seguro para coral', 'Funda impermeable para teléfono'],
      en: ['Swimsuit on', 'Sunglasses', 'Reef-safe eco sunscreen', 'Waterproof phone case']
    },
    pickupHotels: [
      'Hoteles en Uvita / Marino Ballena',
      'Hoteles en Drake Bay',
      'Hoteles en Sierpe'
    ],
    departureTimes: ['07:00 AM'],
    location: {
      lat: 8.7118,
      lng: -83.8821,
      placeName: 'Isla del Caño / Uvita, Puntarenas, Costa Rica'
    }
  },
  {
    id: 'poas-volcano-doka-waterfall',
    title: {
      es: 'Combo 3 en 1: Volcán Poás, Hacienda de Café Doka y Cataratas La Paz',
      en: '3-in-1 Combo: Poás Volcano Crater, Doka Coffee Estate & La Paz Waterfalls'
    },
    subtitle: {
      es: 'Visita uno de los cráteres volcánicos activos más impresionantes de Costa Rica (2,708m), prueba café gourmet y camina entre cataratas y mariposas',
      en: 'Explore one of Costa Rica’s most iconic active volcanic craters (8,885ft), sip world-class coffee & explore waterfall gardens'
    },
    category: 'volcanoes',
    region: 'sjo',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 115,
    durationHours: 9,
    durationLabel: { es: '9 Horas', en: '9 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil (Todo Público)', en: 'Easy (All Ages)' },
    rating: 4.92,
    reviewsCount: 310,
    featured: true,
    bestseller: true,
    freeCancellation: true,
    tourType: "group",
    ecoCert: true,
    description: {
      es: 'Disfruta de tres atracciones icónicas de Costa Rica en un solo día desde San José. Explora la galardonada Hacienda Doka para aprender el secreto del café de exportación. Admira el impresionante cráter activo del Volcán Poás con su laguna sulfurosa de color turquesa. Finaliza almorzando buffet en La Paz Waterfall Gardens, rodeado de 5 majestuosas cataratas, aviario y santuario de felinos.',
      en: 'Combine three Costa Rica staples in one full-day tour from San Jose. Tour the historic Doka Coffee Estate to learn traditional roasting secrets. Peer into the active crater of Poás Volcano with its vibrant turquoise sulfur lagoon. Enjoy a gourmet buffet at La Paz Waterfall Gardens with 5 dramatic waterfalls, sloth exhibit, and tropical bird observatory.'
    },
    highlights: {
      es: [
        'Cráter activo del Volcán Poás y mirador de la Laguna Botos',
        'Degustación de café orgánico recién tostado en Hacienda Doka',
        'Caminata pavimentada por 5 espectaculares cataratas en La Paz',
        'Almuerzo buffet tradicional costarricense incluido',
        'Santuario de tucanes, colibríes, ranas y mariposas'
      ],
      en: [
        'View the massive active crater & turquoise acid lake at Poás Volcano',
        'Freshly roasted gourmet coffee tasting at historic Doka Estate',
        'Paved rainforest walking trails past 5 thunderous waterfalls',
        'Sumptuous traditional Costa Rican lunch buffet included',
        'Rescued wildlife sanctuary with sloths, toucans & hummingbird gardens'
      ]
    },
    inclusions: {
      es: ['Transporte ida y vuelta desde hoteles en San José, Alajuela y Heredia', 'Entradas autorizadas a Poás, Doka y La Paz Gardens', 'Desayuno típico y almuerzo buffet gourmet', 'Guía bilingüe experimentado'],
      en: ['Roundtrip hotel pickup in San José, Alajuela & Heredia', 'Official entry tickets to Poás, Doka & La Paz Gardens', 'Traditional breakfast and gourmet buffet lunch', 'Bilingual certified naturalist guide']
    },
    exclusions: {
      es: ['Propinas opcionales', 'Compras de café en grano en la tienda'],
      en: ['Optional tips', 'Coffee bean souvenir purchases']
    },
    whatToBring: {
      es: ['Chaqueta o abrigo para el volcán (suele hacer frío)', 'Zapatos cómodos', 'Capa para lluvia', 'Cámara fotográfica'],
      en: ['Light jacket or sweater (volcano peak is cool)', 'Comfortable walking shoes', 'Rain poncho', 'Camera']
    },
    pickupHotels: [
      'Hotel Real InterContinental San José',
      'Gran Hotel Costa Rica Curio Collection',
      'Radisson Hotel San Jose',
      'Hilton Garden Inn Santa Ana / San Jose',
      'Cualquier Hotel en San José Centro o Alajuela'
    ],
    departureTimes: ['06:45 AM'],
    location: {
      lat: 10.1982,
      lng: -84.2307,
      placeName: 'Volcán Poás / Alajuela, Costa Rica'
    }
  },
  {
    id: 'corcovado-sirena-expedition',
    title: {
      es: 'Expedición Extrema Parque Nacional Corcovado Estación Sirena',
      en: 'Extreme Corcovado National Park Sirena Station Expedition'
    },
    subtitle: {
      es: 'El lugar biológicamente más intenso de la Tierra según National Geographic. Danta, jaguares y tapires',
      en: 'The most biologically intense place on Earth. Tapirs, monkeys, scarlet macaws & wild primary jungle'
    },
    category: 'wildlife',
    region: 'osa',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 175,
    durationHours: 10,
    durationLabel: { es: '10 Horas', en: '10 Hours' },
    difficulty: 'exigente',
    difficultyLabel: { es: 'Exigente (Caminata intensa)', en: 'Challenging (Strenuous Hike)' },
    rating: 4.99,
    reviewsCount: 189,
    featured: true,
    bestseller: true,
    freeCancellation: true,
    tourType: "group",
    ecoCert: true,
    description: {
      es: 'Incursión en bote a la mítica Estación Biológica Sirena en el corazón del Parque Nacional Corcovado. Contiene el 2.5% de la biodiversidad de todo el planeta. Acompañado de un guía biólogo con telescopio, rastrearás dantas (tapires), las 4 especies de monos de Costa Rica, guacamayas rojas, saínos y huellas de jaguar en selva virgen.',
      en: 'Journey by boat to the legendary Sirena Station in the heart of Corcovado National Park, home to 2.5% of the world’s biodiversity. Guided by an expert wildlife biologist, track Baird’s tapirs, all 4 Costa Rican monkey species, scarlet macaws, peccaries, and elusive jaguar tracks in pristine rainforest.'
    },
    highlights: {
      es: [
        'Acceso en bote de alta velocidad bordeando la virgen costa de la Península de Osa',
        'Avistamiento frecuente de Dantas (Baird’s Tapir) en estado salvaje',
        'Las 4 especies de monos: Mono Ardilla (Tití), Congo, Carablanca y Araña',
        'Guacamayas Rojas volando libremente en las copas del dosel',
        'Almuerzo picnic estilo safari en la Estación Sirena'
      ],
      en: [
        'High-speed boat coastal voyage along wild Osa Peninsula',
        'Unmatched wildlife viewing: wild Baird’s tapirs sleeping or feeding',
        'All 4 monkey species present: squirrel, howler, capuchin & spider monkeys',
        'Pairs of vibrant Scarlet Macaws flying overhead in primary jungle',
        'Picnic lunch served at remote Sirena Ranger Station'
      ]
    },
    inclusions: {
      es: ['Transporte en bote ida y vuelta desde Drake Bay o Sierpe', 'Permiso autorizada e impuesto de entrada al Parque Nacional Corcovado', 'Guía biólogo experimentado por el SINAC', 'Almuerzo completo y snacks'],
      en: ['Roundtrip boat transportation from Drake Bay or Sierpe', 'Official Corcovado NP entry permits', 'Certified SINAC naturalist guide', 'Full picnic lunch and energy snacks']
    },
    exclusions: {
      es: ['Propinas para el guía y capitán del bote'],
      en: ['Tips for captain and guide']
    },
    whatToBring: {
      es: ['Botas de caminata o tenis de agarre duro', 'Medias altas para proteger de picaduras', 'Camisa manga larga ligera', 'Repelente de mosquitos y bloqueador', '2 litros de agua por persona'],
      en: ['Hiking boots with thick tread', 'Tall socks for trail protection', 'Lightweight long sleeve shirt', 'Bug spray and eco sunscreen', '2 liters of water per person']
    },
    pickupHotels: [
      'Hoteles en Drake Bay',
      'Hoteles en Sierpe',
      'Hoteles en Puerto Jiménez'
    ],
    departureTimes: ['06:00 AM'],
    location: {
      lat: 8.4802,
      lng: -83.5898,
      placeName: 'Estación Sirena, Corcovado, Puntarenas, Costa Rica'
    }
  },
  {
    id: 'rincon-de-la-vieja-canopy-mud',
    title: {
      es: 'Mega Aventura Rincón de la Vieja: Tirolesas, Tubing y Baño de Barro Volcánico',
      en: 'Rincón de la Vieja Mega Combo: Zipline, River Tubing & Volcanic Mud Baths'
    },
    subtitle: {
      es: 'Día de adrenalina en Guanacaste: cañones, rápidos, caballos y relajación termal orgánica',
      en: 'Guanacaste’s top outdoor adventure: canyoning, river tubing, horseback riding & thermal mud'
    },
    category: 'canopy',
    region: 'guanacaste',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 135,
    durationHours: 8,
    durationLabel: { es: '8 Horas', en: '8 Hours' },
    difficulty: 'moderado',
    difficultyLabel: { es: 'Moderado (Adrenalina)', en: 'Moderate (Thrill)' },
    rating: 4.90,
    reviewsCount: 245,
    featured: false,
    bestseller: true,
    freeCancellation: true,
    tourType: "group",
    ecoCert: true,
    description: {
      es: 'El combo de aventura definitivo en las faldas del Volcán Rincón de la Vieja en Guanacaste. Incluye vuelo en tirolesas por el cañón del río, descenso en neumáticos (tubing) en los rápidos del Río Negro, pase en caballo y relajación en saunas naturales y pozas de barro volcánico rico en minerales.',
      en: 'The ultimate Guanacaste adrenaline day at Rincón de la Vieja Volcano. Soar through a dramatic river canyon on ziplines, conquer Class II rapids in individual river inner tubes, ride horses along mountain trails, and unwind in natural volcanic mud baths and thermal hot springs.'
    },
    highlights: {
      es: [
        'Canopy tour volando sobre el cañón del Río Blanco con rappel y rapel',
        'Rafting en tubing de 5 km por los rápidos del Río Negro',
        'Paseo a caballo por bosques secos y tropicales',
        'Baño de barro volcánico mineral revitalizante y termales',
        'Almuerzo buffet guanacasteco en el restaurante de montaña'
      ],
      en: [
        'Canyon canopy zip-lining with rock climbing wall and rappel',
        '5 km exhilarating river tubing down Rio Negro Class II rapids',
        'Scenic horseback ride through dry tropical forest trails',
        'Organic mineral-rich volcanic mud bath & natural hot springs',
        'Traditional Guanacaste buffet lunch included'
      ]
    },
    inclusions: {
      es: ['Transporte ida y vuelta desde playas de Tamarindo, Conchal, Flamingo y Papagayo', 'Todo el equipo de seguridad y guías capacitados', 'Almuerzo buffet completo', 'Pase de entrada a las termales y mud baths'],
      en: ['Roundtrip transport from Tamarindo, Conchal, Flamingo & Papagayo hotels', 'All safety helmets, harnesses, tubes & expert guides', 'Full buffet lunch', 'Hot springs and volcanic mud bath entry']
    },
    exclusions: {
      es: ['Toallas adicionales', 'Bebidas alcohólicas'],
      en: ['Towel rental', 'Alcoholic drinks']
    },
    whatToBring: {
      es: ['2 trajes de baño', 'Ropa para mojarse (camisa y shorts sintéticos)', 'Zapatos que se puedan mojar (zapato de agua o tenis viejas)', 'Ropa seca de cambio'],
      en: ['2 swimsuits', 'Clothes to get wet (quick-dry shirt and shorts)', 'Water shoes or old sneakers for tubing', 'Change of dry clothes']
    },
    pickupHotels: [
      'RIU Palace & RIU Guanacaste',
      'Westin Reserva Conchal',
      'W Costa Rica Reserva Conchal',
      'Andaz Costa Rica Resort at Peninsula Papagayo',
      'Four Seasons Resort Costa Rica',
      'Hoteles en Tamarindo y Flamingo'
    ],
    departureTimes: ['07:00 AM'],
    location: {
      lat: 10.7712,
      lng: -85.3341,
      placeName: 'Rincón de la Vieja, Guanacaste, Costa Rica'
    }
  },
  {
    id: 'sloth-territory-la-fortuna',
    title: {
      es: 'Santuario y Sendero de los Perezosos de La Fortuna',
      en: 'La Fortuna Sloth Sanctuary & Wildlife Trail Hike'
    },
    subtitle: {
      es: 'Altas probabilidades de observar perezosos de 2 y 3 dedos en su hábitat natural protegido',
      en: 'High chance of 2-toed & 3-toed sloth sightings in protected family rainforest habitat'
    },
    category: 'wildlife',
    region: 'arenal',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 49,
    durationHours: 3,
    durationLabel: { es: '3 Horas', en: '3 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Muy Fácil (Accesible)', en: 'Very Easy (Accessible)' },
    rating: 4.96,
    reviewsCount: 520,
    featured: false,
    bestseller: true,
    freeCancellation: true,
    tourType: "group",
    ecoCert: true,
    description: {
      es: 'Recorre un sendero privado rodeado de árboles de cecropia (guarumo) en La Fortuna, donde habita la mayor densidad de perezosos en libertad de Costa Rica. Con la ayuda de telescopios profesionales y guías experimentados, observa mamás perezosas con sus crías, tucanes, ranas de ojos rojos y mariposas Morpho.',
      en: 'Walk a flat private reserve trail in La Fortuna shaded by native Guarumo trees, boasting the highest wild sloth population density in Costa Rica. Equipped with optical telescopes, certified guides help you spot mother sloths carrying babies, toucans, poison dart frogs, and blue Morpho butterflies.'
    },
    highlights: {
      es: [
        'Observación de perezosos de 2 y 3 dedos en libertad a corta distancia',
        'Sendero 100% plano accesible para sillas de ruedas y niños',
        'Telescopios profesionales HD para capturar fotos perfectas con tu celular',
        'Avistamiento de ranas venenosas y tucanes pico iris',
        'Degustación de frutas frescas de la zona al terminar'
      ],
      en: [
        'Up-close sightings of wild 2-toed and 3-toed sloths in natural trees',
        '100% flat easy walking trail accessible for strollers and wheelchair users',
        'Pro HD spotting scopes to snap crisp close-up phone photos',
        'Spot poison dart frogs, toucans, and sleeping owls',
        'Fresh organic tropical fruit tasting at tour end'
      ]
    },
    inclusions: {
      es: ['Entrada al Santuario Privado de Perezosos', 'Guía naturalista experimentado', 'Uso de telescopios de alta potencia', 'Frutas de temporada', 'Transporte ida y vuelta en La Fortuna'],
      en: ['Private Sloth Sanctuary entry ticket', 'Certified naturalist guide', 'HD spotting scope access', 'Fresh seasonal fruit platter', 'Roundtrip La Fortuna hotel pickup']
    },
    exclusions: {
      es: ['Propinas al guía'],
      en: ['Guide tips']
    },
    whatToBring: {
      es: ['Calzado cómodo de caminar', 'Cámara o smartphone cargado', 'Repelente de mosquitos ecológico', 'Capa de lluvia ligera'],
      en: ['Comfortable walking shoes', 'Fully charged smartphone/camera', 'Eco bug spray', 'Light rain poncho']
    },
    pickupHotels: [
      'Cualquier Hotel o Airbnb en La Fortuna y alrededores del Volcán Arenal'
    ],
    departureTimes: ['08:00 AM', '10:30 AM', '02:00 PM'],
    location: {
      lat: 10.4715,
      lng: -84.6451,
      placeName: 'La Fortuna Sloth Territory, Alajuela, Costa Rica'
    }
  },
  {
    id: 'cahuita-snorkel-sloth-hike',
    title: {
      es: 'Arrecife Coral de Cahuita, Snorkel y Caminata de Perezosos en Caribe Sur',
      en: 'Cahuita Coral Reef Snorkeling & Coastal Sloth Sanctuary Walk'
    },
    subtitle: {
      es: 'Combina el arrecife vivo más hermoso de la costa caribeña con la selva costera repleta de vida',
      en: 'Combine Costa Rica’s finest Caribbean living coral reef with coastal jungle sloth spotting'
    },
    category: 'beaches',
    region: 'caribe',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 79,
    durationHours: 6,
    durationLabel: { es: '6 Horas', en: '6 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil (Relax Caribeño)', en: 'Easy (Caribbean Chill)' },
    rating: 4.89,
    reviewsCount: 168,
    featured: false,
    bestseller: false,
    ecoCert: true,
    description: {
      es: 'Descubre la magia del Caribe costarricense en Cahuita. Navega en bote tradicional hacia el arrecife coralino para nadar entre corales cerebro, peces cirujano y pez ángel. Luego, camina por los senderos costeros del Parque Nacional Cahuita observando perezosos, monos aulladores y mapaches a metros de la playa de arena blanca.',
      en: 'Immerse yourself in Costa Rica’s Caribbean culture and biodiversity in Cahuita. Ride a local boat out to the protected coral reef for guided snorkeling among brain coral, sea turtles, and angelfish. Follow up with a coastal nature walk where sloths, howler monkeys, and coatis roam right along white sand beaches.'
    },
    highlights: {
      es: [
        'Snorkeling en el arrecife de coral mejor preservado del Caribe de Costa Rica',
        'Caminata por el Parque Nacional Cahuita bordeando playas de aguas turquesa',
        'Avistamiento frecuente de perezosos, iguanas verdes y serpientes ecoracero',
        'Aprende sobre la cultura afrocaribeña y música calipso',
        'Snacks con fruta fresca tropical e hidratación'
      ],
      en: [
        'Guided snorkeling over 35 species of brain and sea fan corals',
        'Coastal rainforest walk in Cahuita National Park along turquoise beaches',
        'Frequent sightings of sloths, howler monkeys, toucans & vipers',
        'Experience vibrant Afro-Caribbean reggae & calypso roots',
        'Fresh tropical fruit platter served right on the beach'
      ]
    },
    inclusions: {
      es: ['Transporte ida y vuelta desde Puerto Viejo, Cahuita y Culebra', 'Capitán y equipo de snorkel', 'Caminata guiada en Parque Nacional Cahuita', 'Frutas frescas y bebidas'],
      en: ['Roundtrip transport from Puerto Viejo, Cahuita & Cocles', 'Boat captain & full snorkel equipment', 'Guided national park coastal walk', 'Fresh fruits and cold beverages']
    },
    exclusions: {
      es: ['Donación voluntaria al Parque Nacional Cahuita ($5)', 'Almuerzo Rice & Beans caribeño opcional'],
      en: ['Voluntary entry donation to Cahuita NP ($5)', 'Optional Caribbean Rice & Beans lunch']
    },
    whatToBring: {
      es: ['Traje de baño y paño', 'Protector solar seguro para arrecifes', 'Zapatillas de agua o sandalias sujetas', 'Repelente ecológico'],
      en: ['Swimsuit and beach towel', 'Reef-safe sunscreen', 'Water sandals or wet shoes', 'Eco bug spray']
    },
    pickupHotels: [
      'Hotel Le Caméléon Puerto Viejo',
      'Hotel Namuwoki',
      'Shawandha Lodge',
      'Uvita & Puerto Viejo Center Hotels'
    ],
    departureTimes: ['08:30 AM'],
    location: {
      lat: 9.7335,
      lng: -82.8423,
      placeName: 'Parque Nacional Cahuita, Limón, Costa Rica'
    }
  },
  {
    id: 'nauyaca-waterfalls-4x4',
    title: {
      es: 'Cataratas Nauyaca en Camión 4x4 Safari y Nado en Pozas Naturales',
      en: 'Nauyaca Waterfalls 4x4 Safari Truck & Swimming Adventure'
    },
    subtitle: {
      es: 'La catarata escalonada más impresionante del Pacífico Sur con piscinas de nado cristalinas',
      en: 'Costa Rica’s most spectacular tiered waterfall with giant freshwater swimming pools'
    },
    category: 'wildlife',
    region: 'manuel_antonio',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 85,
    durationHours: 6,
    durationLabel: { es: '6 Horas', en: '6 Hours' },
    difficulty: 'moderado',
    difficultyLabel: { es: 'Moderado', en: 'Moderate' },
    rating: 4.94,
    reviewsCount: 205,
    featured: false,
    bestseller: false,
    ecoCert: true,
    description: {
      es: 'Aventúrate hacia las majestuosas Cataratas Nauyaca en las montañas de Barú. Aborda un camión todoterreno 4x4 safari para ascender por la selva. La catarata superior cae 45 metros en cañón y la inferior cuenta con una poza natural de 1,000 metros cuadrados ideal para nadar y relajarse.',
      en: 'Journey to the breathtaking Nauyaca Waterfalls tucked into the canyon mountains of Barú near Dominical. Hop aboard an open-air 4x4 safari truck ascending lush jungle. Marvel at the 147-foot upper fall and swim in the massive 10,000 square foot natural pool beneath the lower fall.'
    },
    highlights: {
      es: [
        'Paseo emocionante en camión safari 4x4 por bosques tropicales',
        'Acceso a las dos cascadas gigantescas de Nauyaca',
        'Nado refrescante en poa natural gigante de agua de montaña',
        'Almuerzo buffet casero costarricense en la casona de campo',
        'Guía local experto'
      ],
      en: [
        'Fun 4x4 safari truck transport up mountain rainforest trails',
        'Visit both the upper falls and lower waterfall pools',
        'Swim in giant cyan mountain water swimming hole',
        'Traditional home-style Costa Rican buffet lunch included',
        'Friendly local bilingual guide'
      ]
    },
    inclusions: {
      es: ['Transporte 4x4 safari hasta las cataratas', 'Entradas autorizadas a Nauyaca', 'Almuerzo típico costarricense', 'Transporte desde Manuel Antonio, Dominical o Uvita'],
      en: ['4x4 safari truck ride to waterfalls', 'Nauyaca official entry permits', 'Traditional Costa Rican lunch', 'Pickup in Manuel Antonio, Dominical & Uvita']
    },
    exclusions: {
      es: ['Alquiler de caballos (opcional si prefiere ir a caballo)'],
      en: ['Horseback upgrade (optional on request)']
    },
    whatToBring: {
      es: ['Traje de baño puesto', 'Zapatos de agua con buen agarre o tenis', 'Paño y ropa seca de cambio', 'Cámara fotográfica'],
      en: ['Swimsuit underneath', 'Water shoes with good tread or old sneakers', 'Towel and dry change of clothes', 'Camera']
    },
    pickupHotels: [
      'Hoteles en Manuel Antonio y Quepos',
      'Hoteles en Dominical y Uvita'
    ],
    departureTimes: ['07:30 AM'],
    location: {
      lat: 9.2811,
      lng: -83.8219,
      placeName: 'Cataratas Nauyaca, Dominical, Puntarenas, Costa Rica'
    }
  },
  {
    id: 'marino-ballena-whale-dolphin',
    title: {
      es: 'Avistamiento de Ballenas Jorobadas, Delfines y Snorkel en Parque Marino Ballena',
      en: 'Marino Ballena Humpback Whale Watching, Dolphins & Reef Snorkel'
    },
    subtitle: {
      es: 'Observa madres e hijas ballenas jorobadas en la Tómbolo Cola de Ballena de Uvita',
      en: 'Witness wild humpback whale mothers and calves at the famous Uvita Whale Tail reef'
    },
    category: 'beaches',
    region: 'manuel_antonio',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 95,
    durationHours: 4,
    durationLabel: { es: '4 Horas', en: '4 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil (Para Toda la Familia)', en: 'Easy (Family Friendly)' },
    rating: 4.91,
    reviewsCount: 230,
    featured: false,
    bestseller: true,
    freeCancellation: true,
    tourType: "group",
    ecoCert: true,
    description: {
      es: 'Navega por las aguas protegidas del Parque Nacional Marino Ballena en Uvita, mundialmente famoso por la formación rocosa natural en forma de Cola de Ballena. Es el mejor lugar de Costa Rica para avistar ballenas jorobadas en sus migraciones del Polo Sur y Norte, junto con delfines manchados y tortugas marinas.',
      en: 'Set sail through the marine sanctuary of Marino Ballena National Park in Uvita, famous for its natural sand and reef formation shaped like a whale tail. Spot majestic humpback whales breaching with their calves during migration seasons (Jan-Apr & Jul-Oct), plus wild spotted dolphins and sea turtles.'
    },
    highlights: {
      es: [
        'Avistamiento guiado de ballenas jorobadas y saltos espectaculares',
        'Encuentros con manadas de delfines mulares y manchados',
        'Snorkeling en las formaciones de coral del tómbolo',
        'Paseo en bote por cavernas marinas y arcos naturales de Playa Ventanas',
        'Frutas tropicales y agua a bordo'
      ],
      en: [
        'Guided search for breaching humpback whales and newborn calves',
        'Playful wild spotted and bottlenose dolphin encounters',
        'Snorkeling over coral formations near the Whale Tail reef',
        'Boat exploration of sea caves and natural rock arches at Ventanas Beach',
        'Fresh tropical fruits and refreshments served on board'
      ]
    },
    inclusions: {
      es: ['Paseo en bote con capitán experimentado', 'Entrada autorizada al Parque Nacional Marino Ballena', 'Equipo de snorkel y chaleco salvavidas', 'Guía marino bilingüe', 'Frutas tropicales y bebidas'],
      en: ['Boat tour with experienced captain', 'Official Marino Ballena NP entry permit', 'Snorkel gear and life jackets', 'Bilingual marine guide', 'Fresh fruits and drinks']
    },
    exclusions: {
      es: ['Propinas a la tripulación'],
      en: ['Crew tips']
    },
    whatToBring: {
      es: ['Traje de baño puesto', 'Lentes de sol con cordón', 'Sombrero o gorra', 'Bloqueador marino eco-friendly', 'Cámara con zoom'],
      en: ['Swimsuit underneath', 'Sunglasses with strap', 'Sun hat', 'Eco-friendly reef safe sunscreen', 'Camera with zoom lens']
    },
    pickupHotels: [
      'Hoteles en Uvita y Dominical',
      'Hoteles en Manuel Antonio y Quepos'
    ],
    departureTimes: ['08:30 AM', '01:00 PM'],
    location: {
      lat: 9.1673,
      lng: -83.7408,
      placeName: 'Parque Nacional Marino Ballena, Uvita, Costa Rica'
    }
  },
  {
    id: 'monteverde-night-walk',
    title: {
      es: 'Caminata Nocturna por el Bosque Nuboso de Monteverde',
      en: 'Monteverde Nocturnal Cloud Forest Wildlife Safari'
    },
    subtitle: {
      es: 'El 80% de la fauna de la selva despierta de noche: perezosos, tucanetes, tarántulas y perezosos',
      en: '80% of rainforest wildlife comes alive after dark: sloths, tarantulas, tree frogs & sleeping toucans'
    },
    category: 'wildlife',
    region: 'monteverde',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 45,
    durationHours: 2.5,
    durationLabel: { es: '2.5 Horas', en: '2.5 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil (Caminata Nocturna)', en: 'Easy (Night Walk)' },
    rating: 4.93,
    reviewsCount: 380,
    featured: false,
    bestseller: true,
    freeCancellation: true,
    tourType: "group",
    ecoCert: true,
    description: {
      es: 'Adéntrate en la misteriosa oscuridad del bosque nuboso de Monteverde equipado con linternas de alta potencia. Acompañado de un especialista en vida nocturna, descubre perezosos activos alimentándose, tucanes durmiendo en ramas, ranas arborícolas de colores deslumbrantes, kinkajús (micos de noche) y armadillos.',
      en: 'Step into the mysterious nocturnal realm of Monteverde cloud forest equipped with high-powered flashlights. Led by a nocturnal naturalist guide, spot active climbing sloths, sleeping toucans curled up on branches, luminous tree frogs, kinkajous (night monkeys), and bioluminescent fungi.'
    },
    highlights: {
      es: [
        'Caminata guiada en reserva privada con linternas profesionales incluidas',
        'Observación de perezosos en movimiento durante sus horas activas de alimentación',
        'Avistamiento de ranas verde de ojos rojos, ranas de cristal y tarántulas',
        'Aves dormidas a pocos centímetros de los senderos',
        'Experiencia de sonidos envolventes de la selva nocturna'
      ],
      en: [
        'Guided night safari in private reserve with pro flashlights provided',
        'Watch wild sloths climbing and feeding during their active nighttime hours',
        'Spot red-eyed tree frogs, glass frogs, side-striped palm pit vipers & tarantulas',
        'See sleeping toucans and quetzals resting close to forest trails',
        'Immerse in the magical chorus of night jungle sounds'
      ]
    },
    inclusions: {
      es: ['Entrada a la Reserva Nocturna Privada', 'Guía especialista en fauna nocturna', 'Linterna LED de alta potencia por persona', 'Transporte ida y vuelta desde hoteles en Monteverde'],
      en: ['Private Night Reserve admission ticket', 'Specialized nocturnal naturalist guide', 'High-power LED flashlight per guest', 'Roundtrip hotel transport in Monteverde & Santa Elena']
    },
    exclusions: {
      es: ['Propinas para el guía'],
      en: ['Guide tips']
    },
    whatToBring: {
      es: ['Pantalón largo imprescindible', 'Abrigo o chaqueta cortaviento', 'Zapatos cerrados de caminata', 'Camara con flash desactivable'],
      en: ['Long pants essential', 'Warm jacket or fleece sweater', 'Closed-toe hiking shoes', 'Camera with flash turned off']
    },
    pickupHotels: [
      'Hoteles en Santa Elena y Monteverde'
    ],
    departureTimes: ['05:30 PM', '07:30 PM'],
    location: {
      lat: 10.3182,
      lng: -84.8192,
      placeName: 'Monteverde Reserve Area, Puntarenas, Costa Rica'
    }
  },
  {
    id: 'irazu-volcano-orosi-valley',
    title: {
      es: 'Volcán Irazú, Valle de Orosí y Basílica de Cartago',
      en: 'Irazú Volcano Crater, Orosi Valley & Historic Cartago Day Tour'
    },
    subtitle: {
      es: 'Sube al pico más alto de Costa Rica (3,432m) y contempla ambos océanos en días despejados',
      en: 'Summit Costa Rica’s highest volcano peak (11,260ft) and glimpse both oceans on clear days'
    },
    category: 'volcanoes',
    region: 'sjo',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 89,
    durationHours: 7,
    durationLabel: { es: '7 Horas', en: '7 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil (Paisaje Lunar)', en: 'Easy (Moonscape)' },
    rating: 4.87,
    reviewsCount: 145,
    featured: false,
    bestseller: false,
    ecoCert: true,
    description: {
      es: 'Asciende al punto más alto de la Cordillera Volcánica Central en el Parque Nacional Volcán Irazú a 3,432 metros de altitud. Camina por su sobrecogedor paisaje lunar y contempla el enorme Cráter Diego de la Haya. Desciende luego al colonial Valle de Orosí, visitando la iglesia más antigua de Costa Rica (1743) y la Basílica de Nuestra Señora de los Ángeles.',
      en: 'Ascend to Costa Rica’s highest volcano summit at 11,260 feet in Irazú Volcano National Park. Walk across a stark lunar landscape gazing into massive active craters. Descend into the scenic Orosi Valley, visiting Costa Rica’s oldest working church built in 1743 and Cartago’s holy Basilica.'
    },
    highlights: {
      es: [
        'Visita al Cráter Principal y Cráter Diego de la Haya del Volcán Irazú',
        'Impresionante vista panorámica sobre las nubes del Valle Central',
        'Recorrido por la histórica Basílica de Los Ángeles en Cartago',
        'Paseo por los miradores del pintoresco Valle de Orosí',
        'Almuerzo buffet típico en restaurante de montaña'
      ],
      en: [
        'Explore the main active crater and Diego de la Haya crater at Irazú Volcano',
        'Stunning high-altitude views above cloud level across Central Valley',
        'Tour Cartago’s famous Basilica of Our Lady of the Angels',
        'Scenic drive through coffee plantations and ruins in Orosi Valley',
        'Delicious traditional buffet lunch at mountain restaurant'
      ]
    },
    inclusions: {
      es: ['Transporte ida y vuelta desde San José y Cartago', 'Entrada al Parque Nacional Volcán Irazú', 'Almuerzo buffet típico completo', 'Guía bilingüe de historia y cultura'],
      en: ['Roundtrip hotel transport in San José & Cartago', 'Official Irazú Volcano NP entry permit', 'Full traditional buffet lunch', 'Bilingual culture & natural history guide']
    },
    exclusions: {
      es: ['Propinas opcionales'],
      en: ['Optional tips']
    },
    whatToBring: {
      es: ['Chaqueta o abrigo grueso (3,400m de altitud hace frío)', 'Bloqueador solar', 'Zapatos cómodos', 'Cámara fotográfica'],
      en: ['Warm winter jacket (cold altitude at 11,260 ft)', 'Sunscreen', 'Comfortable sneakers', 'Camera']
    },
    pickupHotels: [
      'Hoteles en San José Centro, Escazú y Cartago'
    ],
    departureTimes: ['07:30 AM'],
    location: {
      lat: 9.9792,
      lng: -83.8524,
      placeName: 'Volcán Irazú, Cartago, Costa Rica'
    }
  },
  {
    id: 'san-jose-city-gold-museum',
    title: {
      es: 'San José Histórico, Museo del Oro Precolombino y Mercado Central',
      en: 'San José Historical City Walking Tour, Pre-Columbian Gold Museum & Central Market'
    },
    subtitle: {
      es: 'Descubre el patrimonio cultural, arquitectura del Teatro Nacional y gastronomía costarricense',
      en: 'Discover Costa Rica’s cultural heritage, iconic National Theater & local market flavors'
    },
    category: 'culture',
    region: 'sjo',
    image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 55,
    durationHours: 4,
    durationLabel: { es: '4 Horas', en: '4 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil (Caminata Urbana)', en: 'Easy (City Walk)' },
    rating: 4.85,
    reviewsCount: 198,
    featured: false,
    bestseller: false,
    ecoCert: false,
    description: {
      es: 'Explora la vibrante capital costarricense con un guía historiador. Admira la deslumbrante arquitectura europea del Teatro Nacional (1897), sumérgete bajo tierra en el Museo del Oro Precolombino con piezas indígenas de valor incalculable y pasea por los coloridos pasillos del legendario Mercado Central de 1880 degustando helado de sorbetera y empanadas.',
      en: 'Explore Costa Rica’s historic capital city guided by a passionate cultural historian. Marvel at the opulent neo-classical architecture of the National Theater (built in 1897), descend underground into the subterranean Pre-Columbian Gold Museum housing indigenous gold artifacts, and stroll through the bustling 1880 Central Market tasting local bites.'
    },
    highlights: {
      es: [
        'Visita guiada al Teatro Nacional de Costa Rica y la Plaza de la Cultura',
        'Entrada e interpretación en el Museo del Oro Precolombino',
        'Paseo gastronómico por el centenario Mercado Central de San José',
        'Degustación de café de especialidad y Helado de Sorbetera tradicional',
        'Guía profesional de patrimonio histórico'
      ],
      en: [
        'Guided tour inside Costa Rica’s majestic National Theater & Culture Plaza',
        'Entry and guided exhibit at the subterranean Pre-Columbian Gold Museum',
        'Tasting food stroll through the vibrant 1880 San Jose Central Market',
        'Specialty coffee tasting & traditional spiced Sorbetera ice cream',
        'Professional local heritage historian guide'
      ]
    },
    inclusions: {
      es: ['Entradas autorizadas al Teatro Nacional y Museo del Oro', 'Degustaciones de comida típica en el Mercado Central', 'Guía historiador bilingüe', 'Transporte desde hoteles céntricos'],
      en: ['Official entry tickets to National Theater & Gold Museum', 'Local food tastings in Central Market', 'Bilingual history guide', 'Hotel pickup in central San José']
    },
    exclusions: {
      es: ['Almuerzo completo opcional'],
      en: ['Full lunch (optional at market)']
    },
    whatToBring: {
      es: ['Zapatos cómodos de caminar', 'Cámara fotográfica', 'Moneda local para souvenirs'],
      en: ['Comfortable walking shoes', 'Camera', 'Local CRC colones for artisan souvenirs']
    },
    pickupHotels: [
      'Hoteles en San José Centro, Paseo Colón y Sabana'
    ],
    departureTimes: ['08:30 AM', '01:30 PM'],
    location: {
      lat: 9.9333,
      lng: -84.0768,
      placeName: 'San José Centro, Costa Rica'
    }
  },
  {
    id: 'bribri-indigenous-cultural',
    title: {
      es: 'Inmersión Cultural Indígena BriBri, Cacao Ancestral y Catarata Volio',
      en: 'BriBri Indigenous Village Immersion, Ancestral Cacao & Volio Waterfall'
    },
    subtitle: {
      es: 'Aprende medicina natural con un Chamán Bribri y elabora chocolate artesanal puro de cacao',
      en: 'Discover sacred medicinal plants with an indigenous Shaman & craft pure dark chocolate'
    },
    category: 'culture',
    region: 'caribe',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80'
    ],
    priceUSD: 75,
    durationHours: 6,
    durationLabel: { es: '6 Horas', en: '6 Hours' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil (Cultura Viviente)', en: 'Easy (Living Culture)' },
    rating: 4.96,
    reviewsCount: 160,
    featured: false,
    bestseller: false,
    ecoCert: true,
    description: {
      es: 'Visita la reserva indígena Bribri en las montañas de Talamanca. Conoce a un Awá (Chamán curandero Bribri) que te enseñará el uso de plantas sagradas. Participa en el ritual ancestral del cacao moliendo granos tostados en piedra para elaborar chocolate puro aromatizado con especias caribeñas, concluyendo con un baño en la Catarata Volio.',
      en: 'Journey deep into the Talamanca mountains to visit an authentic Bribri indigenous community. Meet a native Awá (Bribri spiritual shaman) who shares ancient plant medicine secrets. Participate in a traditional sacred cacao ceremony grinding organic beans on stone to craft pure dark chocolate, finishing with a swim at Volio Waterfall.'
    },
    highlights: {
      es: [
        'Encuentro genuino con la cultura y cosmogonía de la tribu Bribri',
        'Taller interactivo de elaboración de chocolate desde el fruto del cacao',
        'Demostración de arquería tradicional con arco y flechas artesanales',
        'Charla de plantas medicinales con el Chamán Bribri',
        'Caminata corta y nado en la escondida Catarata Volio'
      ],
      en: [
        'Authentic cultural exchange with native Bribri community elders',
        'Hands-on organic chocolate making from raw cacao pod to stone grinding',
        'Traditional hunting archery demonstration with handmade bows',
        'Herbal medicinal plant walk with indigenous Awá healer',
        'Short jungle walk & swim at hidden Volio Waterfall'
      ]
    },
    inclusions: {
      es: ['Transporte ida y vuelta desde Puerto Viejo o Cahuita', 'Donación a la comunidad indígena Bribri', 'Almuerzo tradicional servido en hojas de plátano', 'Taller de cacao y degustación libre', 'Guía local Bribri'],
      en: ['Roundtrip transport from Puerto Viejo or Cahuita', 'Community entry fees & donation', 'Traditional lunch served on banana leaves', 'Interactive cacao workshop & endless chocolate tasting', 'Local Bribri community guide']
    },
    exclusions: {
      es: ['Compras de artesanías de madera o chocolate molido para llevar'],
      en: ['Handmade wooden crafts or cacao souvenirs']
    },
    whatToBring: {
      es: ['Traje de baño', 'Zapatos cómodos que puedan ensuciarse con barro', 'Repelente de insectos', 'Efectivo para comprar artesanías directas'],
      en: ['Swimsuit', 'Comfortable shoes that can get muddy', 'Bug spray', 'Cash for direct indigenous artisan crafts']
    },
    pickupHotels: [
      'Hoteles en Puerto Viejo, Cahuita, Cocles y Manzanillo'
    ],
    departureTimes: ['08:00 AM'],
    location: {
      lat: 9.6121,
      lng: -82.8512,
      placeName: 'Reserva Indígena Bribri, Talamanca, Limón, Costa Rica'
    }
  },
  {
    id: 'sjo-irazu-orosi-lankester',
    title: {
      es: 'Volcán Irazú, Valle de Orosí & Jardines Lankester',
      en: 'Irazú Volcano, Orosí Valley & Lankester Botanical Gardens'
    },
    subtitle: {
      es: 'El volcán más alto de Costa Rica y la cuna colonial del café',
      en: 'Costa Rica\'s highest active volcano & colonial coffee valley'
    },
    category: 'volcanoes',
    region: 'sjo',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80'
    ],
    priceUSD: 127,
    durationHours: 9,
    durationLabel: { es: 'Día Completo (9 hrs)', en: 'Full Day (9 hrs)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil - Familiar', en: 'Easy - Family Friendly' },
    rating: 4.8,
    reviewsCount: 320,
    featured: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 16,
    freeCancellation: true,
    description: {
      es: 'Asciende hasta los 3,432 metros de altitud para contemplar el cráter principal de color verde esmeralda del Volcán Irazú. Luego descendemos al pintoresco Valle de Orosí para visitar la iglesia colonial más antigua de Costa Rica (1743) y recorrer los Jardines Botánicos Lankester con su colección de más de 800 especies de orquídeas exóticas. Incluye almuerzo típico con vista panorámica.',
      en: 'Ascend to 3,432 meters above sea level to witness the emerald-colored crater lake of Irazú Volcano. Then journey down into the picturesque Orosí Valley to visit Costa Rica’s oldest colonial church (1743) and explore the world-renowned Lankester Botanical Gardens boasting over 800 orchid species. Includes a delicious traditional lunch overlooking the valley.'
    },
    highlights: {
      es: ['Cráter principal del Volcán Irazú', 'Jardín Botánico Lankester y orquídeas', 'Templo Colonial de Orosí', 'Almuerzo típico costarricense', 'Transporte desde hoteles en San José'],
      en: ['Irazú Volcano main crater view', 'Lankester Botanical Garden orchids', 'Historic Orosí Colonial Church', 'Authentic Costa Rican buffet lunch', 'San Jose hotel roundtrip transport']
    },
    inclusions: {
      es: ['Transporte A/C ida y vuelta', 'Guía naturalista profesional', 'Entrada al Parque Nacional Volcán Irazú', 'Entrada a Jardines Lankester', 'Almuerzo típico'],
      en: ['Roundtrip A/C transport', 'Professional naturalist guide', 'Irazú Volcano National Park ticket', 'Lankester Gardens ticket', 'Traditional lunch']
    },
    exclusions: {
      es: ['Propinas', 'Gastos personales no especificados'],
      en: ['Gratuities', 'Personal souvenirs']
    },
    whatToBring: {
      es: ['Abrigo térmico o cortavientos', 'Zapatos cómodos', 'Cámara', 'Protector solar'],
      en: ['Warm jacket or windbreaker', 'Comfortable walking shoes', 'Camera', 'Sunscreen']
    },
    pickupHotels: ['San José Palacio', 'Radisson San José', 'Gran Hotel Costa Rica', 'Hilton Garden Inn San José', 'Intercontinental Escazú'],
    departureTimes: ['07:30 AM'],
    location: { lat: 9.9791, lng: -83.8528, placeName: 'Volcán Irazú, Cartago, Costa Rica' },
    operatorName: 'Expediciones Tropicales',
    operatorBadge: { es: 'Operador Certificado #1 San José', en: 'Certified #1 San Jose Operator' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'sjo-tortuga-island-cruise',
    title: {
      es: 'Crucero en Catamarán a Isla Tortuga & Playa Blanca',
      en: 'Tortuga Island Catamaran Cruise & White Sand Beach'
    },
    subtitle: {
      es: 'Navegación en el Golfo de Nicoya con almuerzo buffet y snorkel',
      en: 'Gulf of Nicoya sailing with gourmet buffet lunch & snorkeling'
    },
    category: 'beaches',
    region: 'sjo',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80'
    ],
    priceUSD: 150,
    durationHours: 11,
    durationLabel: { es: 'Día Completo (11 hrs)', en: 'Full Day (11 hrs)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil - Familiar', en: 'Easy - Family' },
    rating: 4.9,
    reviewsCount: 540,
    featured: true,
    bestseller: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 45,
    freeCancellation: true,
    description: {
      es: 'Aborda un confortable catamarán de alta tecnología en el puerto de Puntarenas y navega por las aguas turquesas del Golfo de Nicoya hasta llegar a las playas vírgenes de arena blanca de Isla Tortuga. Disfruta de música en vivo, frutas tropicales, snorkel en arrecifes de roca volcánica, tour de banana boat y un exquisito almuerzo servido bajo las palmeras.',
      en: 'Board a comfortable modern catamaran in Puntarenas and sail across the turquoise waters of the Gulf of Nicoya to the pristine white sands of Tortuga Island. Enjoy live music, fresh tropical fruit, coral reef snorkeling, banana boat rides, and an exquisite 4-course lunch served right under the coconut palms.'
    },
    highlights: {
      es: ['Navegación en catamarán de lujo por el Golfo', 'Playa de arena blanca y aguas transparentes', 'Tour de snorkel con equipo completo', 'Almuerzo buffet gourmet en la playa', 'Transporte desde San José'],
      en: ['Luxury catamaran cruise across Nicoya Gulf', 'White sand beach and crystal waters', 'Guided reef snorkel tour with gear', 'Gourmet beach buffet lunch', 'Roundtrip transport from San Jose']
    },
    inclusions: {
      es: ['Transporte A/C terrestre San José - Puntarenas', 'Desayuno ligero', 'Almuerzo buffet gourmet', 'Frutas tropicales y bebidas naturales', 'Equipo de snorkel y banana boat'],
      en: ['A/C ground transfer San Jose - Puntarenas', 'Light breakfast on board', 'Gourmet buffet lunch', 'Fresh fruits and fruit punch', 'Snorkel gear and banana boat']
    },
    exclusions: {
      es: ['Bebidas alcohólicas premium', 'Alquiler de kayaks o sillas reclinables privadas'],
      en: ['Premium alcoholic drinks', 'Private beach lounger upgrades']
    },
    whatToBring: {
      es: ['Traje de baño', 'Toalla', 'Bloqueador biodegradable', 'Gafas de sol', 'Cambio de ropa seca'],
      en: ['Swimsuit', 'Towel', 'Biodegradable sunscreen', 'Sunglasses', 'Dry change of clothes']
    },
    pickupHotels: ['San José Palacio', 'Gran Hotel Costa Rica', 'Radisson', 'Crown Plaza', 'Hoteles en Puntarenas'],
    departureTimes: ['06:00 AM'],
    location: { lat: 9.7744, lng: -84.9017, placeName: 'Isla Tortuga, Golfo de Nicoya, Costa Rica' },
    operatorName: 'Expediciones Tropicales / Bay Island Cruises',
    operatorBadge: { es: 'Crucero Oficial Certificado', en: 'Certified Official Cruise' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'sjo-city-heritage-tour',
    title: {
      es: 'San José City Tour VIP & Teatro Nacional',
      en: 'San José VIP City Tour & National Theater'
    },
    subtitle: {
      es: 'Museo de Oro Precolombino, Mercado Central y arquitectura histórica',
      en: 'Pre-Columbian Gold Museum, Central Market & historic architecture'
    },
    category: 'culture',
    region: 'sjo',
    image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 74,
    durationHours: 5,
    durationLabel: { es: 'Medio Día (5 hrs)', en: 'Half Day (5 hrs)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil', en: 'Easy' },
    rating: 4.8,
    reviewsCount: 190,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 18,
    freeCancellation: true,
    description: {
      es: 'Descubre la rica historia, arquitectura y vida cotidiana de la capital de Costa Rica. Visitaremos el emblemático Teatro Nacional (joya arquitectónica de 1897), el Museo del Oro Precolombino, la Catedral Metropolitana, el Parque Central y nos sumergiremos en los aromas del Mercado Central para probar café gourmet y comida típica.',
      en: 'Immerse yourself in the history, architecture, and vibrant culture of Costa Rica’s capital. Visit the iconic National Theater (1897 architectural masterpiece), the Pre-Columbian Gold Museum, the Metropolitan Cathedral, Central Park, and taste gourmet coffee while exploring the lively historic Central Market.'
    },
    highlights: {
      es: ['Teatro Nacional de Costa Rica', 'Museo de Oro Precolombino', 'Recorrido por el Mercado Central', 'Guía historiador bilingüe', 'Degustación de café costarricense'],
      en: ['National Theater guided visit', 'Pre-Columbian Gold Museum entrance', 'Central Market cultural stroll', 'Bilingual historian guide', 'Costa Rican coffee tasting']
    },
    inclusions: {
      es: ['Transporte hotelero ida y vuelta', 'Guía profesional bilingüe', 'Entrada al Teatro Nacional', 'Entrada al Museo de Oro', 'Degustación de café'],
      en: ['Roundtrip hotel transport', 'Professional bilingual guide', 'National Theater entrance', 'Gold Museum entrance', 'Coffee tasting']
    },
    exclusions: {
      es: ['Almuerzo completo', 'Propinas'],
      en: ['Full lunch', 'Gratuities']
    },
    whatToBring: {
      es: ['Zapatos cómodos para caminar', 'Cámara fotográfica', 'Sombrilla o impermeable'],
      en: ['Comfortable walking shoes', 'Camera', 'Umbrella or light rain jacket']
    },
    pickupHotels: ['Hoteles céntricos de San José, Escazú, Belén y Santa Ana'],
    departureTimes: ['08:30 AM', '01:30 PM'],
    location: { lat: 9.9333, lng: -84.0833, placeName: 'San José Centro, Costa Rica' },
    operatorName: 'Expediciones Tropicales',
    operatorBadge: { es: 'Tour Cultural Oficial', en: 'Official Cultural Tour' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'arenal-pure-trek-canyoning',
    title: {
      es: 'Rapel en Cataratas & Cañonismo Pure Trek La Fortuna',
      en: 'Pure Trek Waterfall Rappel & Canyon Adventure'
    },
    subtitle: {
      es: 'Desciende 4 cascadas en el cañón de la selva tropical con almuerzo típico',
      en: 'Rappel down 4 cascading waterfalls in pristine rainforest canyon with lunch'
    },
    category: 'canopy',
    region: 'arenal',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 119,
    durationHours: 4,
    durationLabel: { es: 'Medio Día (4 hrs)', en: 'Half Day (4 hrs)' },
    difficulty: 'moderado',
    difficultyLabel: { es: 'Moderado / Aventura', en: 'Moderate / Adventure' },
    rating: 4.98,
    reviewsCount: 920,
    featured: true,
    bestseller: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 12,
    freeCancellation: true,
    description: {
      es: 'El tour de cañonismo y rapel en cataratas #1 de Costa Rica. En un cañón privado en la selva virgen de La Fortuna, descenderás 4 cascadas de agua cristalina (de hasta 50 metros de altura), realizarás una tirolesa con caída controlada Monkey Drop y caminarás por senderos de bosque lluvioso. Finaliza con un delicioso almuerzo típico costarricense en la base del cañón.',
      en: 'Costa Rica\'s #1 canyoning and waterfall rappelling tour. Located in a private rainforest canyon in La Fortuna, you will rappel down 4 crystal-clear waterfalls (up to 165 feet high), experience the thrilling Monkey Drop zipline, and hike through lush jungle trails. Concludes with a delicious traditional Costa Rican lunch.'
    },
    highlights: {
      es: ['4 rapeles en cascadas espectaculares', 'Monkey Drop (Tirolesa + Rapel)', 'Equipo experimentado Petzl de máxima seguridad', 'Almuerzo típico buffet incluido', 'Transporte desde hoteles en La Fortuna'],
      en: ['4 waterfall rappels up to 165ft', 'Monkey Drop zip-and-rappel combo', 'Certified Petzl top safety equipment', 'Organic Costa Rican lunch included', 'La Fortuna hotel transport']
    },
    inclusions: {
      es: ['Transporte A/C ida y vuelta', 'Guías bilingües experimentados Pure Trek', 'Cascos, arneses y guantes profesionales', 'Almuerzo casero completo', 'Toallas limpias'],
      en: ['Roundtrip A/C transportation', 'Pure Trek certified bilingual guides', 'Professional harnesses, helmets & gloves', 'Full homemade buffet lunch', 'Clean towels']
    },
    exclusions: {
      es: ['Fotografías profesionales del tour (opcional)', 'Propinas'],
      en: ['Professional photo package (optional)', 'Gratuities']
    },
    whatToBring: {
      es: ['Ropa cómoda que se pueda mojar', 'Zapatos cerrados de suela de goma o hiking', 'Ropa seca de cambio', 'Bolsa plástica para ropa mojada'],
      en: ['Clothes you don’t mind getting wet', 'Closed-toe shoes or trail runners', 'Dry change of clothes', 'Plastic bag for wet gear']
    },
    pickupHotels: ['The Springs Resort', 'Tabacón Resort', 'Nayara Resorts', 'Baldi Hot Springs', 'Hoteles en La Fortuna'],
    departureTimes: ['07:30 AM', '11:30 AM'],
    location: { lat: 10.4500, lng: -84.6600, placeName: 'Cañón Pure Trek, La Fortuna, San Carlos, Costa Rica' },
    operatorName: 'Pure Trek Canyoning',
    operatorBadge: { es: 'Operador #1 Cañonismo La Fortuna', en: '#1 Canyoning Operator in Arenal' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'arenal-wave-balsa-rafting',
    title: {
      es: 'Rafting Río Balsa Clase II-III en La Fortuna',
      en: 'Balsa River Whitewater Rafting Class II-III'
    },
    subtitle: {
      es: 'Rápidos divertidos para familias y principiantes con almuerzo buffet campesino',
      en: 'Fun whitewater waves for families and beginners with traditional organic lunch'
    },
    category: 'rafting',
    region: 'arenal',
    image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 75,
    durationHours: 5,
    durationLabel: { es: 'Medio Día (5 hrs)', en: 'Half Day (5 hrs)' },
    difficulty: 'moderado',
    difficultyLabel: { es: 'Moderado - Para toda la familia', en: 'Moderate - Family Friendly' },
    rating: 4.9,
    reviewsCount: 460,
    featured: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 20,
    freeCancellation: true,
    description: {
      es: 'Desciende 10 kilómetros de emocionantes olas y rápidos clase II y III por el Río Balsa en medio de exuberante selva tropical. Entre rápidos podrás observar monos, perezosos, iguanas y tucanes en los árboles ribereños. En la mitad del recorrido disfrutaremos de un picnic de sandía y piña fresca al lado del río y al finalizar, un almuerzo típico campesino.',
      en: 'Navigate 6 miles of exciting class II and III whitewater rapids along the lush Balsa River. Spot monkeys, sloths, iguanas, and toucans in the riverside canopy between rapids. Midway through, enjoy a tropical fruit picnic on the riverbanks, followed by a warm farm-to-table lunch at a rustic countryside estate.'
    },
    highlights: {
      es: ['Rápidos continuos clase II y III', 'Avistamiento de fauna en la selva ribereña', 'Picnic de frutas tropicales frescas en el río', 'Almuerzo tradicional campesino', 'Guías experimentados de rescate acuático'],
      en: ['Continuous Class II-III thrilling rapids', 'Wildlife spotting along rainforest riverbanks', 'Fresh tropical fruit break on the river', 'Traditional organic country lunch', 'Certified river rescue raft guides']
    },
    inclusions: {
      es: ['Transporte A/C ida y vuelta', 'Equipo completo de rafting (cascos, chalecos experimentados)', 'Guía bilingüe por balsa', 'Picnic de frutas y bebidas', 'Almuerzo buffet campesino'],
      en: ['Roundtrip A/C transport', 'Certified rafting gear (helmets, lifejackets)', 'Bilingual safety guide per raft', 'Tropical fruit picnic', 'Traditional country buffet lunch']
    },
    exclusions: {
      es: ['Fotografías del tour', 'Propinas para guías'],
      en: ['Tour action photos', 'Guide gratuities']
    },
    whatToBring: {
      es: ['Traje de baño o shorts sintéticos', 'Zapatos de agua o tenis que se puedan mojar', 'Protector solar', 'Ropa seca y toalla para después'],
      en: ['Swimsuit or quick-dry clothes', 'Water shoes or old sneakers with grip', 'Sunscreen', 'Dry clothes and towel for after']
    },
    pickupHotels: ['Todos los hoteles en La Fortuna, Arenal y alrededores'],
    departureTimes: ['09:00 AM', '12:30 PM'],
    location: { lat: 10.3800, lng: -84.5800, placeName: 'Río Balsa, San Carlos, Alajuela, Costa Rica' },
    operatorName: 'Wave Expeditions & Arenal Rafting',
    operatorBadge: { es: 'Operador Oficial Rafting Arenal', en: 'Official Arenal Rafting Operator' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'arenal-sky-trek-tram-combo',
    title: {
      es: 'Sky Adventures Ultimate: Sky Tram, Sky Trek & Sky Walk',
      en: 'Sky Adventures Ultimate: Aerial Tram, Zipline & Hanging Bridges'
    },
    subtitle: {
      es: 'Vistas panorámicas del lago y volcán Arenal con cables de hasta 70 km/h',
      en: 'Panoramic volcano and lake views with zip lines reaching 70 km/h'
    },
    category: 'canopy',
    region: 'arenal',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 145,
    durationHours: 6,
    durationLabel: { es: 'Día Completo (6 hrs)', en: 'Full Day (6 hrs)' },
    difficulty: 'moderado',
    difficultyLabel: { es: 'Moderado', en: 'Moderate' },
    rating: 4.95,
    reviewsCount: 780,
    featured: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 15,
    freeCancellation: true,
    description: {
      es: 'La experiencia de canopy más avanzada de Costa Rica con tecnología de frenado automático y cables de acero ultralargos. Asciende en el teleférico Sky Tram sobre el dosel de la selva hasta la plataforma de observación más alta con vistas insuperables al Volcán Arenal y el Lago. Desciende volando en 7 tirolesas de alta velocidad (Sky Trek) y recorre 3 km de puentes colgantes inmersos en la biodiversidad (Sky Walk).',
      en: 'Costa Rica’s most advanced zipline experience with auto-braking systems and mega cables. Ride the Sky Tram aerial gondola above the canopy to the highest observation deck facing Arenal Volcano and Lake. Fly down 7 high-speed Sky Trek cables (reaching speeds up to 45 mph) and explore 2 miles of guided suspension canopy bridges (Sky Walk).'
    },
    highlights: {
      es: ['Teleférico Sky Tram panorámico', '7 cables de tirolesa Sky Trek ultralargas', 'Puentes colgantes Sky Walk en selva virgen', 'Vistas directas al Lago Arenal y Volcán', 'Sistema de frenado magnético de última generación'],
      en: ['Scenic Sky Tram aerial gondola ride', '7 high-speed Sky Trek mega cables', 'Sky Walk hanging suspension bridges trail', 'Direct panoramic views of Lake Arenal & Volcano', 'Top-tier magnetic auto-braking system']
    },
    inclusions: {
      es: ['Transporte A/C ida y vuelta', 'Boleto Sky Tram, Sky Trek y Sky Walk', 'Guías bilingües experimentados', 'Equipo de máxima seguridad'],
      en: ['Roundtrip A/C transport', 'Sky Tram, Sky Trek & Sky Walk tickets', 'Certified bilingual guides', 'Top safety harness and gear']
    },
    exclusions: {
      es: ['Almuerzo en restaurante Sky (disponible a la carta)', 'Propinas'],
      en: ['Lunch at Sky Restaurant (available à la carte)', 'Gratuities']
    },
    whatToBring: {
      es: ['Pantalón largo cómodo', 'Tenis o zapatos para caminar cerrados', 'Capa impermeable o cortavientos', 'Cámara con correa de seguridad'],
      en: ['Comfortable long pants', 'Closed-toe walking shoes', 'Rain jacket or windbreaker', 'Camera with wrist strap']
    },
    pickupHotels: ['Hoteles en La Fortuna y zona volcánica de Arenal'],
    departureTimes: ['08:00 AM', '10:30 AM', '01:00 PM'],
    location: { lat: 10.4350, lng: -84.7100, placeName: 'Sky Adventures Arenal Park, El Castillo, Alajuela, Costa Rica' },
    operatorName: 'Sky Adventures Costa Rica',
    operatorBadge: { es: 'Parque de Aventura Certificado', en: 'Certified Adventure Park' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'guanacaste-guachipelin-combo',
    title: {
      es: 'Mega Combo Aventura Hacienda Guachipelín',
      en: 'Hacienda Guachipelín One-Day Adventure Mega Pass'
    },
    subtitle: {
      es: 'Canopy en cañón, tubing en Río Negro, cabalgata y termales de barro volcánico',
      en: 'Canyon zipline, river tubing, horseback ride & volcanic hot mud springs'
    },
    category: 'combos',
    region: 'guanacaste',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 129,
    durationHours: 8,
    durationLabel: { es: 'Día Completo (8 hrs)', en: 'Full Day (8 hrs)' },
    difficulty: 'moderado',
    difficultyLabel: { es: 'Aventura Completa', en: 'Full Adventure' },
    rating: 4.94,
    reviewsCount: 680,
    featured: true,
    bestseller: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 18,
    freeCancellation: true,
    description: {
      es: 'El tour de aventura más legendario de Guanacaste en las faldas del Volcán Rincón de la Vieja. Incluye un circuito de tirolesas y rapel en el cañón del Río Blanco, 5 km de rafting en flotadores tubings por los rápidos del Río Negro, cabalgata guiada por la sabana guanacasteca, almuerzo buffet típico y relajación total en las piscinas de aguas termales volcánicas y baños de barro mineral.',
      en: 'The most legendary all-day adventure pass in Guanacaste located at the foothills of Rincón de la Vieja Volcano. Includes a thrilling canyon zipline and rappel course, 3 miles of class II-III tubing down the crystal rapids of Río Negro, a scenic horseback ride, an authentic ranch buffet lunch, and soothing volcanic hot springs with rejuvenating natural mud baths.'
    },
    highlights: {
      es: ['Canopy y tirolesas en el cañón del Río Blanco', 'Tubing en rápidos del Río Negro', 'Paseo a caballo por hacienda tradicional', 'Termales de Río Negro y barro volcánico mineral', 'Almuerzo buffet guanacasteco incluido'],
      en: ['Canyon zipline and rock rappel course', 'Exciting Río Negro river tubing rapids', 'Scenic horseback riding trail', 'Natural volcanic hot springs & mud bath spa', 'Full authentic Guanacaste buffet lunch']
    },
    inclusions: {
      es: ['Transporte A/C ida y vuelta desde Tamarindo/Liberia/Papagayo', 'Acceso a las 4 aventuras', 'Almuerzo buffet guanacasteco', 'Equipo de seguridad y guías experimentados', 'Entrada a las aguas termales de Río Negro'],
      en: ['Roundtrip A/C transport from Tamarindo/Liberia/Papagayo', 'Access to all 4 adventure activities', 'Full buffet lunch', 'Safety gear and bilingual guides', 'Río Negro hot springs entrance ticket']
    },
    exclusions: {
      es: ['Bebidas alcohólicas', 'Propinas'],
      en: ['Alcoholic drinks', 'Tips']
    },
    whatToBring: {
      es: ['Traje de baño', 'Pantalón largo para cabalgata', 'Zapatos de río con buen agarre', 'Ropa seca de cambio', 'Protector solar biodegradable'],
      en: ['Swimsuit', 'Long pants for horseback ride', 'Sturdy water shoes', 'Dry change of clothes', 'Biodegradable sunscreen']
    },
    pickupHotels: ['Hoteles en Tamarindo, Conchal, Flamingo, Playas del Coco, Papagayo y Liberia'],
    departureTimes: ['07:00 AM'],
    location: { lat: 10.7500, lng: -85.3800, placeName: 'Hacienda Guachipelín, Rincón de la Vieja, Guanacaste, Costa Rica' },
    operatorName: 'Hacienda Guachipelín Adventure Center',
    operatorBadge: { es: 'Parque Oficial Rincón de la Vieja', en: 'Official Rincón de la Vieja Park' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'guanacaste-diamante-adventure',
    title: {
      es: 'Diamante Eco Adventure Pass & Santuario Animal',
      en: 'Diamante Eco Adventure Ocean-View Pass & Animal Sanctuary'
    },
    subtitle: {
      es: 'Tirolesa Superman con vista al Pacífico y santuario de rescate de jaguares y perezosos',
      en: 'Ocean-view Superman zipline & Costa Rica’s top animal rescue sanctuary'
    },
    category: 'canopy',
    region: 'guanacaste',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 118,
    durationHours: 6,
    durationLabel: { es: 'Día Completo (6 hrs)', en: 'Full Day (6 hrs)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil - Familiar', en: 'Easy - Family Friendly' },
    rating: 4.9,
    reviewsCount: 520,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 20,
    freeCancellation: true,
    description: {
      es: 'Ubicado frente a las costas del Golfo de Papagayo, Diamante Eco Adventure ofrece la famosa tirolesa Superman de casi 1 milla de longitud con vista directa al océano Pacífico, el salto libre QuickJump y acceso al santuario de rescate animal más grande y moderno de Costa Rica donde podrás ver jaguares, pumas, perezosos, tucanes y monos rescatados.',
      en: 'Located on the ocean bluffs of Papagayo Gulf, Diamante Eco Adventure features the famous nearly 1-mile dual Superman zipline with direct Pacific Ocean views, the QuickJump freefall, and access to Costa Rica\'s largest animal sanctuary housing rescued jaguars, pumas, sloths, toucans, monkeys, and crocodiles.'
    },
    highlights: {
      es: ['Tirolesa Superman con vista frontal al mar', 'Santuario de rescate de jaguares y fauna', 'Aviario y mariposario inmersivo', 'Almuerzo buffet frente al mar', 'Acceso a la playa privada de Diamante'],
      en: ['Ocean-view Superman mega zipline', 'Top jaguar and wildlife rescue sanctuary', 'Walk-through aviary & butterfly house', 'Oceanfront buffet lunch included', 'Access to Diamante’s private beach']
    },
    inclusions: {
      es: ['Transporte hotelero ida y vuelta', 'Pase ilimitado a tirolesas y QuickJump', 'Entrada al Santuario Animal', 'Almuerzo buffet y bebidas naturales', 'Acceso a playa y kayaks'],
      en: ['Roundtrip hotel transport', 'Unlimited zipline and QuickJump access', 'Animal Sanctuary entrance', 'Buffet lunch and fresh juices', 'Beach access and kayaks']
    },
    exclusions: {
      es: ['Tours en cuadraciclos ATVs (opcional)', 'Propinas'],
      en: ['ATV tours (optional upgrade)', 'Tips']
    },
    whatToBring: {
      es: ['Zapatos cerrados', 'Ropa fresca', 'Traje de baño y toalla para la playa', 'Protector solar y lentes'],
      en: ['Closed-toe shoes', 'Light clothes', 'Swimsuit and beach towel', 'Sunscreen and sunglasses']
    },
    pickupHotels: ['Hoteles en Golfo de Papagayo, Playas del Coco, Hermosa, Tamarindo y Conchal'],
    departureTimes: ['08:30 AM'],
    location: { lat: 10.5800, lng: -85.6700, placeName: 'Diamante Eco Adventure Park, Matapalo, Guanacaste, Costa Rica' },
    operatorName: 'Diamante Eco Adventure Park',
    operatorBadge: { es: 'Parque Eco-Aventura Certificado', en: 'Certified Eco-Adventure Park' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'guanacaste-marlin-del-rey-sunset',
    title: {
      es: 'Catamarán al Atardecer Marlín del Rey & Snorkel',
      en: 'Marlin del Rey Sunset Sailing & Snorkel Catamaran'
    },
    subtitle: {
      es: 'Navegación por playas vírgenes con barra libre abierta, bocadillos y snorkel',
      en: 'Sailing secluded Pacific coves with open bar, lunch buffet & snorkeling'
    },
    category: 'beaches',
    region: 'guanacaste',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 95,
    durationHours: 5,
    durationLabel: { es: 'Tarde de Atardecer (5 hrs)', en: 'Sunset Afternoon (5 hrs)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil - Relajante', en: 'Easy - Relaxing' },
    rating: 4.96,
    reviewsCount: 840,
    featured: true,
    bestseller: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 40,
    freeCancellation: true,
    description: {
      es: 'Zarpa desde Playa Tamarindo o Playas del Coco a bordo del espacioso catamarán Marlín del Rey de 66 pies. Fondearemos en una bahía tranquila y apartada para hacer snorkel entre peces tropicales, remar en kayak o relajarse en las colchonetas flotantes. En el camino de regreso, disfruta de la barra libre ilimitada y la música mientras contemplas uno de los atardeceres dorados más famosos del planeta.',
      en: 'Set sail from Tamarindo or Playas del Coco aboard the premier 66-foot Marlin del Rey catamaran. Anchor in a secluded cove to snorkel with tropical fish and sea turtles, paddleboard, or lounge on floating mats. On the sail back, enjoy an open bar, delicious appetizers, and music as the sun sets in a blaze of gold and crimson over the Pacific.'
    },
    highlights: {
      es: ['Catamarán de 66 pies con red lounge frontal', 'Barra libre ilimitada (cervezas, cócteles, vino)', 'Snorkel guiado con equipo incluido', 'Comida caliente tipo buffet a bordo', 'Atardecer inolvidable en el Pacífico'],
      en: ['66ft luxury catamaran with bow trampolines', 'Unlimited open bar (beer, cocktails, wine)', 'Guided snorkeling with complete gear', 'Hot buffet meal served on board', 'Iconic world-famous Pacific sunset']
    },
    inclusions: {
      es: ['Navegación de 5 horas', 'Barra libre ilimitada de bebidas y licores', 'Comida buffet caliente (pollo, arroz, ensaladas, dips)', 'Equipo completo de snorkel', 'Kayaks y tablas de stand-up paddle'],
      en: ['5-hour catamaran sail', 'Unlimited open bar and beverages', 'Hot buffet meal and fresh snacks', 'Snorkel masks, fins and vests', 'Kayaks and paddleboards']
    },
    exclusions: {
      es: ['Transporte terrestre a la playa de salida (disponible bajo solicitud)', 'Propinas para la tripulación'],
      en: ['Ground transport to beach departure point', 'Crew gratuities']
    },
    whatToBring: {
      es: ['Traje de baño', 'Toalla de playa', 'Bloqueador solar', 'Gafas de sol', 'Cámara sumergible'],
      en: ['Swimsuit', 'Beach towel', 'Sunscreen', 'Sunglasses', 'Waterproof camera']
    },
    pickupHotels: ['Puntos de encuentro en Playa Tamarindo y Playas del Coco'],
    departureTimes: ['01:30 PM'],
    location: { lat: 10.2990, lng: -85.8400, placeName: 'Playa Tamarindo, Guanacaste, Costa Rica' },
    operatorName: 'Marlin del Rey Catamarans',
    operatorBadge: { es: 'Operador #1 Catamarán Guanacaste', en: '#1 Catamaran Operator in Guanacaste' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'monteverde-selvatura-all-in-one',
    title: {
      es: 'Selvatura Park All-in-One: Canopy, Puentes & Santuario de Perezosos',
      en: 'Selvatura Park All-in-One: Zipline Canopy, Hanging Bridges & Sloth Sanctuary'
    },
    subtitle: {
      es: 'El parque más grande dentro del dosel del bosque nuboso virgen',
      en: 'The premier eco-adventure park inside the virgin Monteverde cloud forest canopy'
    },
    category: 'canopy',
    region: 'monteverde',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 120,
    durationHours: 6,
    durationLabel: { es: 'Día Completo (6 hrs)', en: 'Full Day (6 hrs)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil - Para todas las edades', en: 'Easy - All Ages' },
    rating: 4.95,
    reviewsCount: 890,
    featured: true,
    bestseller: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 15,
    freeCancellation: true,
    description: {
      es: 'Selvatura Park es el único parque de conservación y aventura construido 100% dentro del bosque nuboso primario de Monteverde. Este paquete Todo Incluido te permite recorrer 13 cables de tirolesa (incluyendo el vuelo Superman y Tarzan Swing), cruzar 8 impresionantes puentes colgantes suspendidos entre las nubes y visitar el santuario de perezosos y el mariposario más grande del continente.',
      en: 'Selvatura Park is the only conservation and adventure park built 100% inside the primary cloud forest of Monteverde. This All-in-One package includes 13 zipline cables (featuring the Superman cable & Tarzan Swing), 8 massive hanging bridges soaring through the mist, the sloth sanctuary, and one of the largest live butterfly gardens in the Americas.'
    },
    highlights: {
      es: ['13 cables de canopy dentro del bosque nuboso', '8 puentes colgantes panorámicos (3 km de senderos)', 'Santuario de rescate de perezosos de dos y tres dedos', 'Jardín de mariposas tropicales vivas', 'Almuerzo buffet en restaurante El Sapo'],
      en: ['13 zipline cables in pristine cloud forest', '8 massive hanging bridges spanning 1.9 miles', 'Dedicated sloth sanctuary rescue exhibit', 'Giant walk-through butterfly biopark', 'Full lunch at El Sapo Restaurant']
    },
    inclusions: {
      es: ['Transporte A/C ida y vuelta desde hoteles en Monteverde/Santa Elena', 'Entrada completa a las 4 atracciones de Selvatura', 'Guías naturalistas bilingües experimentados', 'Almuerzo buffet completo', 'Equipo de canopy'],
      en: ['Roundtrip A/C hotel transport in Monteverde', 'All-inclusive entry to all 4 Selvatura exhibits', 'Certified bilingual naturalist guides', 'Full buffet lunch', 'Zipline safety equipment']
    },
    exclusions: {
      es: ['Fotografías del tour', 'Propinas'],
      en: ['Tour souvenir photos', 'Tips']
    },
    whatToBring: {
      es: ['Abrigo ligero o sudadera', 'Zapatos cómodos con buen agarre para caminar', 'Impermeable o capa para lluvia', 'Cámara'],
      en: ['Light jacket or sweater', 'Comfortable hiking shoes or sneakers', 'Rain jacket or poncho', 'Camera']
    },
    pickupHotels: ['Todos los hoteles y eco-lodges de Santa Elena y Monteverde'],
    departureTimes: ['08:30 AM', '11:00 AM', '01:00 PM'],
    location: { lat: 10.3300, lng: -84.7900, placeName: 'Selvatura Park, Santa Elena, Monteverde, Puntarenas, Costa Rica' },
    operatorName: 'Selvatura Park Monteverde',
    operatorBadge: { es: 'Parque Ecológico Oficial Monteverde', en: 'Official Monteverde Eco-Park' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'monteverde-100-aventura-extreme',
    title: {
      es: '100% Aventura: Mega Tirolesa Superman & Tarzán Swing',
      en: '100% Aventura: Mega Superman Zipline & Giant Tarzan Swing'
    },
    subtitle: {
      es: 'El cable de tirolesa más largo de Latinoamérica (1.5 km) y salto libre',
      en: 'Latin America’s longest zipline cable (1.5 km) & thrilling freefall swing'
    },
    category: 'canopy',
    region: 'monteverde',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 65,
    durationHours: 3,
    durationLabel: { es: 'Medio Día (3 hrs)', en: 'Half Day (3 hrs)' },
    difficulty: 'moderado',
    difficultyLabel: { es: 'Adrenalina Pura', en: 'Pure Adrenaline' },
    rating: 4.92,
    reviewsCount: 610,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 15,
    freeCancellation: true,
    description: {
      es: 'Para los amantes de la adrenalina pura. 100% Aventura cuenta con 10 cables de tirolesa, incluyendo el cable Superman de 1,590 metros de largo (casi 1 milla de vuelo en posición horizontal sobre cañones y bosque nuboso), un cable subterráneo en túnel y el famoso Mega Tarzan Swing con caída libre de 45 metros de altura.',
      en: 'Designed for pure adrenaline seekers. 100% Aventura features 10 zipline cables, headlined by the 5,220-foot (1,590 meters) Superman cable—flying face-forward over pristine cloud forest valleys—plus a subterranean tunnel cable and the heart-stopping Mega Tarzan Swing with a 150-foot freefall drop.'
    },
    highlights: {
      es: ['Cable Superman de 1.5 km sobre el cañón', 'Mega Tarzan Swing con caída libre de 45m', '10 cables de tirolesas de alta velocidad', 'Vistas panorámicas del Golfo de Nicoya en días despejados', 'Guías expertos en seguridad en alturas'],
      en: ['1-mile Superman cable across the valley', 'Giant 150ft Tarzan freefall swing', '10 high-speed canopy cables', 'Clear day views toward the Nicoya Gulf', 'Expert safety-certified rigging guides']
    },
    inclusions: {
      es: ['Transporte A/C ida y vuelta en Monteverde', 'Equipo completo de tirolesa experimentado', 'Acceso a los 10 cables, Superman y Tarzan Swing', 'Guías bilingües'],
      en: ['Roundtrip A/C transport in Monteverde', 'Certified safety harness and equipment', 'Full course access (Superman + Tarzan Swing)', 'Bilingual guides']
    },
    exclusions: {
      es: ['Fotografías y videos en Go-Pro', 'Almuerzo'],
      en: ['GoPro video and photos', 'Lunch']
    },
    whatToBring: {
      es: ['Pantalón largo cómodo', 'Zapatos cerrados de deporte', 'Abrigo ligero', 'Ganas de adrenalina'],
      en: ['Comfortable long pants', 'Closed-toe sneakers', 'Light jacket', 'Courage and energy']
    },
    pickupHotels: ['Hoteles en Monteverde y Santa Elena'],
    departureTimes: ['08:00 AM', '11:00 AM', '01:00 PM', '03:00 PM'],
    location: { lat: 10.3150, lng: -84.8200, placeName: '100% Aventura Park, Monteverde, Costa Rica' },
    operatorName: '100% Aventura Monteverde',
    operatorBadge: { es: 'Canopy Extremo Oficial', en: 'Official Extreme Canopy' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'manuel-antonio-damas-mangrove',
    title: {
      es: 'Safari en Bote por Manglares de Isla Damas',
      en: 'Damas Island Estuary & Mangrove Boat Wildlife Safari'
    },
    subtitle: {
      es: 'Navega por canales protegidos observando monos cariblancos, osos hormigueros y boas',
      en: 'Cruise protected mangrove canals watching capuchin monkeys, anteaters & boas'
    },
    category: 'wildlife',
    region: 'manuel_antonio',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 75,
    durationHours: 4,
    durationLabel: { es: 'Medio Día (4 hrs)', en: 'Half Day (4 hrs)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil - Todas las edades', en: 'Easy - All Ages' },
    rating: 4.88,
    reviewsCount: 410,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 18,
    freeCancellation: true,
    description: {
      es: 'Navega en cómodos botes techados con motores silenciosos por los intrincados canales y raíces gigantes de los manglares de Isla Damas, a solo 15 minutos de Manuel Antonio. Guiado por un naturalista bilingüe, observarás monos capuchinos curiosos que se acercan al bote, osos hormigueros sedosos, caimanes, boas arbóreas y cientos de aves acuáticas tropicales. Incluye almuerzo típico en restaurante local.',
      en: 'Glide through the tranquil protected mangrove waterways and giant root systems of Damas Island aboard comfortable shaded safari boats. Accompanied by expert naturalists, you’ll encounter curious white-faced capuchin monkeys, silky silky anteaters, caimans, tree boas, and rare tropical birds. Followed by an authentic home-style Costa Rican lunch.'
    },
    highlights: {
      es: ['Bote techado silencioso por canales vírgenes', 'Interacción cercana con monos cariblancos', 'Ecosistema de manglar protegido', 'Guía naturalista con telescopio', 'Almuerzo típico costarricense incluido'],
      en: ['Comfortable shaded safari riverboat', 'Close-up white-faced monkey encounters', 'Protected mangrove coastal ecosystem', 'Spotting scope equipped naturalist guide', 'Traditional home-cooked lunch included']
    },
    inclusions: {
      es: ['Transporte A/C ida y vuelta en Manuel Antonio y Quepos', 'Paseo en lancha con capitán y guía naturalista', 'Almuerzo típico completo y bebidas', 'Agua embotellada'],
      en: ['Roundtrip A/C hotel transport in Manuel Antonio/Quepos', 'Boat safari with licensed captain & naturalist', 'Full traditional lunch and drinks', 'Bottled water']
    },
    exclusions: {
      es: ['Bebidas alcohólicas', 'Propinas'],
      en: ['Alcoholic beverages', 'Tips']
    },
    whatToBring: {
      es: ['Ropa fresca y cómoda', 'Repelente de mosquitos ecológico', 'Cámara fotográfica', 'Gafas de sol y sombrero'],
      en: ['Light comfortable clothing', 'Eco-friendly bug repellent', 'Camera with zoom', 'Sunglasses and hat']
    },
    pickupHotels: ['Hoteles en Manuel Antonio y Quepos'],
    departureTimes: ['08:00 AM', '01:00 PM'],
    location: { lat: 9.4700, lng: -84.2200, placeName: 'Estero Isla Damas, Quepos, Puntarenas, Costa Rica' },
    operatorName: 'Iguana Tours Manuel Antonio',
    operatorBadge: { es: 'Operador Oficial #1 Quepos', en: '#1 Operator in Quepos' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'manuel-antonio-ocean-king-catamaran',
    title: {
      es: 'Mega Catamarán Ocean King con Toboganes & Snorkel',
      en: 'Ocean King Luxury Mega Catamaran with Water Slides & Snorkel'
    },
    subtitle: {
      es: 'Paseo escénico por el Parque Manuel Antonio con jacuzzi, comida y bebidas',
      en: 'Scenic cruise along Manuel Antonio coast with on-board jacuzzi, lunch & drinks'
    },
    category: 'beaches',
    region: 'manuel_antonio',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 90,
    durationHours: 4,
    durationLabel: { es: 'Medio Día (4 hrs)', en: 'Half Day (4 hrs)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil - Diversión', en: 'Easy - Fun & Leisure' },
    rating: 4.93,
    reviewsCount: 760,
    featured: true,
    bestseller: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 50,
    freeCancellation: true,
    description: {
      es: 'Navega en el catamarán más grande y lujoso de Centroamérica (100 pies). El Ocean King cuenta con 2 jacuzzis a bordo, 2 toboganes gigantes de agua directo al mar, trampolines de sol, barra libre ilimitada de cócteles y almuerzo preparado por chef a bordo. Fondeamos en la hermosa Bahía Biesanz para practicar snorkel rodeado de peces tropicales.',
      en: 'Cruise on the largest and most luxurious catamaran in Central America (100 feet). The Ocean King features 2 on-board jacuzzis, 2 massive curved water slides splashing into the ocean, tanning trampolines, unlimited open bar cocktails, and a freshly prepared lunch by an on-board chef. Anchors at scenic Biesanz Bay for snorkeling.'
    },
    highlights: {
      es: ['Catamarán de 100 pies con 2 jacuzzis y 2 toboganes al mar', 'Barra libre ilimitada (cócteles tropicales, cerveza, jugos)', 'Snorkel en la hermosa Bahía Biesanz', 'Almuerzo completo preparado a bordo', 'Avistamiento regular de delfines y ballenas'],
      en: ['100-foot mega catamaran with 2 jacuzzis & water slides', 'Unlimited open bar (tropical cocktails, beer, juices)', 'Snorkeling in sheltered Biesanz Bay', 'Fresh gourmet meal prepared on board', 'Frequent dolphin and seasonal whale sightings']
    },
    inclusions: {
      es: ['Transporte A/C ida y vuelta en Manuel Antonio/Quepos', 'Navegación de 4 horas', 'Barra libre ilimitada de bebidas y licores', 'Almuerzo completo con pescado o pollo fresco', 'Equipo de snorkel'],
      en: ['Roundtrip A/C transport in Manuel Antonio/Quepos', '4-hour coastal cruise', 'Unlimited open bar drinks and cocktails', 'Full freshly cooked lunch', 'Snorkel gear and lifevests']
    },
    exclusions: {
      es: ['Bebidas alcohólicas ultra premium', 'Propinas'],
      en: ['Ultra-premium spirits', 'Gratuities']
    },
    whatToBring: {
      es: ['Traje de baño', 'Toalla', 'Bloqueador solar biodegradable', 'Gafas de sol', 'Cámara impermeable'],
      en: ['Swimsuit', 'Towel', 'Biodegradable sunscreen', 'Sunglasses', 'Waterproof camera']
    },
    pickupHotels: ['Todos los hoteles en Manuel Antonio y Quepos'],
    departureTimes: ['09:00 AM', '02:00 PM'],
    location: { lat: 9.4200, lng: -84.1600, placeName: 'Marina Pez Vela, Quepos, Puntarenas, Costa Rica' },
    operatorName: 'Ocean King / Iguana Tours',
    operatorBadge: { es: 'Mega Catamarán Oficial', en: 'Official Mega Catamaran' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'uvita-whale-watching-combo',
    title: {
      es: 'Avistamiento de Ballenas Jorobadas en Parque Marino Ballena',
      en: 'Humpback Whale & Dolphin Watching at Marino Ballena'
    },
    subtitle: {
      es: 'Encuentro con madres y crías en la famosa formación natural de Cola de Ballena',
      en: 'Encounter mother whales & calves at the iconic Whale Tail sandbar formation'
    },
    category: 'wildlife',
    region: 'manuel_antonio',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 88,
    durationHours: 4,
    durationLabel: { es: 'Medio Día (4 hrs)', en: 'Half Day (4 hrs)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil - Familiar', en: 'Easy - Family Friendly' },
    rating: 4.96,
    reviewsCount: 510,
    featured: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 18,
    freeCancellation: true,
    description: {
      es: 'El Parque Nacional Marino Ballena en Uvita es el santuario de ballenas jorobadas más importante del Pacífico tropical. Durante las temporadas de migración (Julio a Noviembre y Diciembre a Marzo), podrás admirar saltos espectaculares de ballenas jorobadas gigantes, delfines manchados y tortugas marinas. Incluye parada de snorkel en el arrecife de la formación de la Cola de Ballena y visita a cuevas marinas de Ventanas.',
      en: 'Marino Ballena National Park in Uvita is the most celebrated humpback whale sanctuary in Central America. During migration seasons (July-Nov & Dec-March), witness awe-inspiring breaches of giant humpback mothers and calves, playful spotted dolphins, and sea turtles. Includes reef snorkeling at the iconic Whale Tail formation and boat visits to Ventanas sea caves.'
    },
    highlights: {
      es: ['Avistamiento garantizado de ballenas jorobadas en temporada', 'Navegación frente al tómbolo en forma de Cola de Ballena', 'Snorkel en arrecife de coral protegido', 'Visita a las cavernas marinas de Playa Ventanas', 'Guía biólogo marino experimentado'],
      en: ['Top seasonal humpback whale sighting success', 'Cruise past the world-famous Whale Tail sandbar', 'Snorkeling in protected coral reef', 'Boat exploration of Playa Ventanas sea caves', 'Certified marine biologist guide']
    },
    inclusions: {
      es: ['Entrada autorizada al Parque Nacional Marino Ballena', 'Bote con capitanes experimentados y guía marino', 'Equipo completo de snorkel', 'Frutas tropicales y agua', 'Seguro de navegación'],
      en: ['Official Marino Ballena National Park ticket', 'Safety boat with certified captain & guide', 'Complete snorkeling equipment', 'Fresh tropical fruit & water', 'Marine insurance']
    },
    exclusions: {
      es: ['Transporte terrestre a Uvita (disponible desde Manuel Antonio)', 'Propinas'],
      en: ['Ground transport to Uvita', 'Tips']
    },
    whatToBring: {
      es: ['Traje de baño puesto', 'Protector solar ecológico', 'Toalla', 'Sombrero y lentes de sol', 'Cámara con zoom'],
      en: ['Swimsuit on', 'Eco-friendly sunscreen', 'Beach towel', 'Hat and sunglasses', 'Camera with zoom lens']
    },
    pickupHotels: ['Punto de salida autorizada en Bahía Aventuras, Uvita'],
    departureTimes: ['08:30 AM', '01:00 PM'],
    location: { lat: 9.1550, lng: -83.7450, placeName: 'Parque Nacional Marino Ballena, Uvita, Osa, Costa Rica' },
    operatorName: 'Bahía Aventuras Uvita',
    operatorBadge: { es: 'Operador Oficial Marino Ballena', en: 'Official Marino Ballena Operator' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'uvita-cano-island-snorkel',
    title: {
      es: 'Snorkel & Buceo en Reserva Biológica Isla del Caño',
      en: 'Caño Island Biological Reserve Snorkeling & Boat Expedition'
    },
    subtitle: {
      es: 'Aguas cristalinas con tortugas marinas, tiburones de arrecife y mantarrayas',
      en: 'Pristine Pacific waters teeming with sea turtles, reef sharks & giant rays'
    },
    category: 'beaches',
    region: 'manuel_antonio',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 145,
    durationHours: 7,
    durationLabel: { es: 'Día Completo (7 hrs)', en: 'Full Day (7 hrs)' },
    difficulty: 'moderado',
    difficultyLabel: { es: 'Moderado', en: 'Moderate' },
    rating: 4.97,
    reviewsCount: 380,
    featured: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 14,
    freeCancellation: true,
    description: {
      es: 'Considerada la "Pequeña Galápagos de Costa Rica", la Reserva Biológica Isla del Caño alberga uno de los arrecifes coralinos más vírgenes y con mayor visibilidad de Centroamérica (hasta 25 metros). Nadarás junto a tortugas carey, tiburones punta blanca de arrecife inofensivos, mantarrayas gigantes, cardúmenes de barracudas y delfines.',
      en: 'Dubbed the "Mini Galapagos of Costa Rica," Caño Island Biological Reserve boasts one of the most pristine coral reef ecosystems with the highest underwater visibility in Central America (up to 80 feet). Snorkel alongside gentle sea turtles, harmless white-tip reef sharks, giant manta rays, schools of jacks, and dolphins.'
    },
    highlights: {
      es: ['Visibilidad submarina de hasta 25 metros', 'Avistamiento de tiburones punta blanca y tortugas marinas', '2 sesiones completas de snorkel en diferentes arrecifes', 'Almuerzo en la playa de Bahía Drake o Uvita', 'Transporte marítimo en lancha rápida segura'],
      en: ['Underwater visibility up to 80 feet', 'White-tip reef sharks & sea turtles spotting', '2 full guided snorkeling sessions on different reefs', 'Picnic lunch at secluded beach', 'Safe offshore speedboat transit']
    },
    inclusions: {
      es: ['Entrada autorizada a la Reserva Biológica Isla del Caño', 'Lancha rápida bimotor con capitán y guía naturalista', 'Equipo profesional de snorkel (máscara, aletas, chaleco)', 'Almuerzo completo tipo picnic', 'Frutas tropicales y bebidas'],
      en: ['Official Caño Island Biological Reserve permit', 'Twin-engine speedboat with captain & guide', 'Professional snorkel gear (mask, fins, snorkel)', 'Full beach picnic lunch', 'Fresh fruit and refreshments']
    },
    exclusions: {
      es: ['Equipo de buceo SCUBA con tanques (disponible por $60 extra)', 'Propinas'],
      en: ['SCUBA diving tanks upgrade (available for +$60)', 'Gratuities']
    },
    whatToBring: {
      es: ['Traje de baño puesto', 'Toalla', 'Bloqueador solar biodegradable', 'Gafas de sol', 'Cámara submarina GoPro'],
      en: ['Swimsuit on', 'Towel', 'Reef-safe biodegradable sunscreen', 'Sunglasses', 'Underwater GoPro camera']
    },
    pickupHotels: ['Bahía Aventuras en Uvita o Playa Drake'],
    departureTimes: ['07:30 AM'],
    location: { lat: 8.7050, lng: -83.8800, placeName: 'Reserva Biológica Isla del Caño, Osa, Puntarenas, Costa Rica' },
    operatorName: 'Bahía Aventuras',
    operatorBadge: { es: 'Operador Autorizado Reserva Marina', en: 'Authorized Marine Reserve Operator' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'osa-corcovado-sirena-day',
    title: {
      es: 'Expedición de 1 Día a Estación Sirena en Parque Nacional Corcovado',
      en: 'Full-Day Corcovado National Park Sirena Ranger Station Expedition'
    },
    subtitle: {
      es: 'Incursión guiada por el área de mayor biodiversidad del planeta: dantas y jaguares',
      en: 'Guided deep trek in the world’s most biodiverse wilderness: tapirs & monkeys'
    },
    category: 'wildlife',
    region: 'osa',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 145,
    durationHours: 8,
    durationLabel: { es: 'Día Completo (8 hrs)', en: 'Full Day (8 hrs)' },
    difficulty: 'exigente',
    difficultyLabel: { es: 'Exigente / Trekking', en: 'Demanding / Trekking' },
    rating: 4.99,
    reviewsCount: 420,
    featured: true,
    bestseller: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 8,
    freeCancellation: true,
    description: {
      es: 'Corcovado fue calificado por National Geographic como "el lugar biológicamente más intenso del planeta". Esta expedición en lancha hasta la remota Estación Sirena te permite adentrarte en el corazón del bosque tropical primario con un guía naturalista experimentado por el SINAC. Es el mejor lugar de Centroamérica para observar la danta centroamericana (tapir), los 4 monos de Costa Rica, pecaríes, osos hormigueros gigantes y cocodrilos.',
      en: 'Described by National Geographic as "the most biologically intense place on Earth." This boat expedition to the remote Sirena Ranger Station takes you straight into the heart of virgin primary rainforest accompanied by a SINAC-certified master naturalist guide. The premier location in the Americas to spot Baird’s tapirs, all 4 Costa Rican monkey species, peccaries, and giant anteaters.'
    },
    highlights: {
      es: ['Navegación escénica en lancha por la costa virgen de Osa', 'Caminatas guiadas en los senderos de Estación Sirena', 'Avistamiento de tapires (dantas), las 4 especies de monos y pecaríes', 'Guía naturalista con telescopio Swarovsky de alta definición', 'Almuerzo completo en el campamento'],
      en: ['Scenic coastal boat cruise to remote ranger station', 'Guided jungle treks on Sirena Station trails', 'Baird’s tapirs, 4 monkey species & peccaries spotting', 'Master naturalist with HD spotting scope', 'Full picnic lunch at the station']
    },
    inclusions: {
      es: ['Permiso y entrada autorizada del SINAC a Corcovado', 'Lancha rápida ida y vuelta desde Bahía Drake o Sierpe', 'Guía naturalista privado experimentado por el parque', 'Almuerzo completo y frutas', 'Seguro de operaciones'],
      en: ['Official SINAC Corcovado National Park permit', 'Roundtrip offshore boat transfer from Drake Bay or Sierpe', 'Licensed private naturalist guide', 'Full lunch and snacks', 'Expedition insurance']
    },
    exclusions: {
      es: ['Hospedaje nocturno en la estación (requiere paquete de 2 días)', 'Propinas'],
      en: ['Overnight lodging (requires 2-day pass)', 'Gratuities']
    },
    whatToBring: {
      es: ['Calzado cerrado impermeable o botas de trekking', 'Pantalón largo fresco', 'Repelente y bloqueador solar', 'Botella de agua reutilizable (no se permite plástico de un solo uso)', 'Cámara con zoom'],
      en: ['Sturdy hiking shoes or trail runners', 'Breathable long pants', 'Insect repellent & sunscreen', 'Reusable water bottle (single-use plastic banned)', 'Camera with telephoto lens']
    },
    pickupHotels: ['Playa Drake, Sierpe o Puerto Jiménez'],
    departureTimes: ['06:00 AM'],
    location: { lat: 8.4800, lng: -83.5900, placeName: 'Estación Biológica Sirena, Parque Nacional Corcovado, Osa, Costa Rica' },
    operatorName: 'Corcovado Info Center & Osa Wild',
    operatorBadge: { es: 'Guías Oficiales Certificados SINAC', en: 'Certified Official SINAC Guides' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'tortuguero-mawamba-3d2n',
    title: {
      es: 'Paquete Todo Incluido 3D/2N Canales de Tortuguero',
      en: 'All-Inclusive 3D/2N Tortuguero Canals & Jungle Expedition'
    },
    subtitle: {
      es: 'Transporte desde San José, hotel estilo eco-lodge, safari en lancha y caminata en parque',
      en: 'Roundtrip SJO transport, eco-lodge stay, boat safari & turtle nesting tour'
    },
    category: 'multiday',
    region: 'tortuguero',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 390,
    durationHours: 72,
    durationLabel: { es: 'Paquete 3 Días / 2 Noches', en: 'Package 3 Days / 2 Nights' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil - Todo Incluido', en: 'Easy - All Inclusive' },
    rating: 4.94,
    reviewsCount: 390,
    featured: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 16,
    freeCancellation: true,
    description: {
      es: 'El Amazonas de Centroamérica. Este paquete completo de 3 días y 2 noches incluye transporte terrestre y fluvial desde San José a través del Parque Braulio Carrillo, 2 noches en eco-lodge con piscina frente a los canales, todas las comidas buffet, tours en lancha por los canales del Parque Nacional Tortuguero, visita al pueblo y caminata guiada por senderos de selva virgen.',
      en: 'The Amazon of Central America. This comprehensive 3-day / 2-night expedition includes ground and riverboat transport from San Jose through Braulio Carrillo rainforest, 2 nights at a premier riverfront eco-lodge with swimming pool, all buffet meals, boat safaris through Tortuguero National Park canals, town tour, and guided jungle trails.'
    },
    highlights: {
      es: ['Transporte terrestre y en lancha desde San José ida y vuelta', '2 noches en Lodge rústico de lujo en Tortuguero', 'Todas las comidas incluidas (desayunos, almuerzos, cenas)', 'Safaris en bote por los canales del Parque Nacional', 'Visita guiada al pueblo caribeño de Tortuguero'],
      en: ['Roundtrip ground & riverboat transfers from San Jose', '2 nights at top riverfront rainforest eco-lodge', 'All meals included (breakfasts, lunches, dinners)', 'Boat safaris inside Tortuguero National Park canals', 'Guided walking tour of Tortuguero Caribbean village']
    },
    inclusions: {
      es: ['Transporte A/C desde San José + lancha rápida', '2 noches de alojamiento con baño privado', 'Todas las comidas buffet (día 1 al 3)', 'Guía naturalista experimentado durante todo el viaje', 'Tours en lancha por canales y senderos del lodge'],
      en: ['A/C bus transfer from San Jose + scenic boat ride', '2 nights accommodation with private bathroom', 'All buffet meals (Day 1 lunch to Day 3 lunch)', 'Certified naturalist guide throughout', 'Boat canal tours & lodge nature trails']
    },
    exclusions: {
      es: ['Entrada al Parque Nacional Tortuguero ($17 USD directo a taquilla SINAC)', 'Tour nocturno de desove de tortugas (Jul-Oct, $35 opcional)'],
      en: ['Tortuguero National Park entrance fee ($17 USD direct to park)', 'Night turtle nesting tour (Jul-Oct, $35 optional)']
    },
    whatToBring: {
      es: ['Ropa fresca de algodón o secado rápido', 'Capa o impermeable para lluvia', 'Repelente de mosquitos y bloqueador', 'Linterna con luz roja para la noche', 'Cámara'],
      en: ['Lightweight quick-dry clothing', 'Rain jacket or poncho', 'Bug repellent & sunscreen', 'Red-light flashlight for night walks', 'Camera']
    },
    pickupHotels: ['Hoteles en San José, Heredia, Alajuela y Guápiles'],
    departureTimes: ['06:00 AM'],
    location: { lat: 10.5400, lng: -83.5000, placeName: 'Parque Nacional Tortuguero, Limón, Costa Rica' },
    operatorName: 'Grupo Mawamba / Pachira Lodge',
    operatorBadge: { es: 'Operador Líder Todo Incluido Tortuguero', en: 'Premier All-Inclusive Tortuguero Operator' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'caribe-cahuita-snorkeling-hike',
    title: {
      es: 'Snorkel en Arrecife & Caminata en Parque Nacional Cahuita',
      en: 'Cahuita National Park Coral Reef Snorkeling & Coastal Rainforest Hike'
    },
    subtitle: {
      es: 'Más de 35 especies de coral tropical, perezosos en los árboles y mar azul turquesa',
      en: 'Over 35 species of tropical coral, sloths in trees & turquoise Caribbean water'
    },
    category: 'beaches',
    region: 'caribe',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
    priceUSD: 65,
    durationHours: 5,
    durationLabel: { es: 'Medio Día (5 hrs)', en: 'Half Day (5 hrs)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil - Familiar', en: 'Easy - Family' },
    rating: 4.92,
    reviewsCount: 310,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 12,
    freeCancellation: true,
    description: {
      es: 'Explora el arrecife de coral vivo más importante del Caribe costarricense. Comenzaremos con un paseo en bote hasta Punta Cahuita para realizar 2 sesiones de snorkel guiadas con peces loro, rayas, corales cerebro y abanicos de mar. Luego caminaremos por el sendero costero del Parque Nacional Cahuita donde es común ver monos aulladores, perezosos, mapaches y serpientes oropel.',
      en: 'Explore the most significant living coral reef in Costa Rica’s Caribbean coast. Begin with a scenic boat ride to Punta Cahuita for 2 guided snorkeling sessions surrounded by parrotfish, stingrays, brain corals, and sea fans. Afterward, enjoy a guided nature hike along Cahuita National Park’s coastal jungle trail, famous for spotting howler monkeys, sloths, and toucans.'
    },
    highlights: {
      es: ['Snorkel en el arrecife de coral más grande del Caribe de CR', 'Paseo en lancha hasta Punta Cahuita', 'Caminata por la selva costera del Parque Nacional', 'Avistamiento de perezosos y monos aulladores', 'Frutas tropicales frescas en la playa'],
      en: ['Snorkel Costa Rica’s premier Caribbean coral reef', 'Scenic boat ride to Punta Cahuita point', 'Coastal rainforest walk inside Cahuita National Park', 'Sloths and howler monkeys regular sightings', 'Fresh tropical fruit break on the beach']
    },
    inclusions: {
      es: ['Transporte desde hoteles en Puerto Viejo y Cahuita', 'Paseo en lancha con capitán experimentado', 'Equipo completo de snorkel (máscara, tubo, aletas)', 'Guía naturalista bilingüe', 'Frutas tropicales y agua'],
      en: ['Roundtrip transport from Puerto Viejo and Cahuita', 'Boat ride with certified captain', 'Complete snorkeling gear (mask, snorkel, fins)', 'Bilingual naturalist guide', 'Fresh fruits and water']
    },
    exclusions: {
      es: ['Donación voluntaria de entrada al Parque Cahuita ($5 USD)', 'Propinas'],
      en: ['Voluntary entrance donation to Cahuita Park ($5 USD)', 'Tips']
    },
    whatToBring: {
      es: ['Traje de baño puesto', 'Toalla', 'Zapatos cómodos para caminar', 'Bloqueador solar ecológico', 'Repelente de mosquitos'],
      en: ['Swimsuit on', 'Towel', 'Comfortable walking shoes', 'Reef-safe eco sunscreen', 'Bug spray']
    },
    pickupHotels: ['Hoteles en Puerto Viejo, Cahuita, Cocles, Playa Chiquita y Manzanillo'],
    departureTimes: ['08:30 AM', '01:00 PM'],
    location: { lat: 9.7350, lng: -82.8400, placeName: 'Parque Nacional Cahuita, Limón, Costa Rica' },
    operatorName: 'Caribe Fun Sunrise & Terraventuras',
    operatorBadge: { es: 'Operador Oficial Caribe Sur', en: 'Official South Caribbean Operator' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  },
  {
    id: 'circuit-classic-costa-rica-5d',
    title: {
      es: 'Circuito Esencial de Costa Rica 5 Días (Arenal, Monteverde & Manuel Antonio)',
      en: 'Essential Costa Rica 5-Day Circuit (Arenal Volcano, Cloud Forest & Beach)'
    },
    subtitle: {
      es: 'Itinerario completo con hoteles 4 estrellas, transporte privado y entradas autorizadas',
      en: 'Complete curated circuit with 4-star hotels, private intercity transfers & top tours'
    },
    category: 'multiday',
    region: 'sjo',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
    ],
    priceUSD: 780,
    durationHours: 120,
    durationLabel: { es: 'Circuito 5 Días / 4 Noches', en: 'Circuit 5 Days / 4 Nights' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil / Todo Coordinado', en: 'Easy / Fully Coordinated' },
    rating: 4.98,
    reviewsCount: 290,
    featured: true,
    bestseller: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 12,
    freeCancellation: true,
    description: {
      es: 'El itinerario definitivo para conocer lo mejor de Costa Rica en 5 días sin complicaciones logísticas. Día 1: Recogida en San José, traslado a La Fortuna, caminata en lava del Volcán Arenal y aguas termales de Baldi. Día 2: Traslado taxi-bote-taxi por el Lago Arenal hacia Monteverde y caminata en puentes colgantes. Día 3: Tirolesa Superman en bosque nuboso y traslado a Manuel Antonio. Día 4: Tour guiado en Parque Nacional Manuel Antonio y tarde libre en la playa. Día 5: Desayuno y traslado de regreso al Aeropuerto SJO.',
      en: 'The definitive 5-day / 4-night Costa Rica highlights itinerary with seamless logistics. Day 1: San Jose pickup, transfer to Arenal Volcano lava trails & Baldi Hot Springs. Day 2: Scenic boat transfer across Lake Arenal to Monteverde Cloud Forest hanging bridges. Day 3: Monteverde Superman zipline canopy & transfer to Manuel Antonio beach. Day 4: Guided wildlife safari in Manuel Antonio National Park & beach relaxation. Day 5: Breakfast and private transfer back to SJO Airport.'
    },
    highlights: {
      es: ['Volcán Arenal y termales minerales de Baldi', 'Cruce escénico en bote por el Lago Arenal', 'Puentes colgantes y tirolesas en Monteverde', 'Parque Nacional Manuel Antonio y playas del Pacífico', 'Todos los traslados interurbanos coordinados con chofer'],
      en: ['Arenal Volcano hike & Baldi mineral hot springs', 'Lake Arenal boat transfer crossing', 'Monteverde Cloud Forest canopy bridges & zipline', 'Manuel Antonio National Park guided wildlife safari', 'All door-to-door intercity hotel transfers included']
    },
    inclusions: {
      es: ['4 noches de hospedaje en hoteles 4 estrellas con desayuno', 'Todos los traslados terrestres y acuáticos privados entre destinos', 'Entradas a Volcán Arenal, Termales Baldi, Puentes Monteverde y Manuel Antonio', 'Guías bilingües autorizadas en cada tour', 'Asistencia local 24/7 de Costa Rica Tours (costaricatours.es)'],
      en: ['4 nights in top 4-star hotels with daily breakfast', 'All private door-to-door intercity & boat transfers', 'Entrance tickets to Arenal, Baldi Springs, Monteverde Bridges & Manuel Antonio', 'Certified bilingual guides on every tour', '24/7 dedicated local concierge assistance']
    },
    exclusions: {
      es: ['Vuelos internacionales', 'Almuerzos y cenas no especificados', 'Propinas'],
      en: ['International airfare', 'Unspecified lunches & dinners', 'Gratuities']
    },
    whatToBring: {
      es: ['Ropa para clima cálido y abrigo ligero para Monteverde', 'Zapatos cómodos para caminar y sandalias', 'Traje de baño y toalla', 'Protector solar y repelente', 'Pasaporte vigente'],
      en: ['Summer clothes and a light jacket for Monteverde', 'Walking shoes and sandals', 'Swimsuit and towel', 'Sunscreen and repellent', 'Valid passport']
    },
    pickupHotels: ['Aeropuerto Internacional Juan Santamaría (SJO) o cualquier hotel en San José'],
    departureTimes: ['07:00 AM'],
    location: { lat: 9.9333, lng: -84.0833, placeName: 'San José / Arenal / Monteverde / Manuel Antonio, Costa Rica' },
    operatorName: 'Horizontes Nature Tours & Swiss Travel',
    operatorBadge: { es: 'Circuito Nacional Garantizado', en: 'Guaranteed National Circuit' },
    instantConfirmation: true,
    bestPriceGuaranteed: true
  }
];

export const TOURS_DATA = TOURS;

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
    title: { es: 'Traslado Privado Aeropuerto (SJO / LIR) a Hoteles', en: 'Private Airport Transfer (SJO / LIR) to Hotels' },
    category: 'transport',
    description: { es: 'Microbús A/C moderno con chofer profesional y recepción en terminal por nombre de pasajero.', en: 'Modern A/C van with professional bilingual driver and passenger name terminal greeting.' },
    priceUSD: 85,
    icon: 'Bus',
    badge: { es: 'Servicio 24/7', en: '24/7 Service' }
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


