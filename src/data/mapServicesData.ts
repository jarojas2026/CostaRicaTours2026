import { Localized } from '../types';

export type MapServiceType = 
  | 'hotel' 
  | 'national_park' 
  | 'bus_station' 
  | 'train_station' 
  | 'taxi_stand' 
  | 'airport' 
  | 'airstrip';

export interface MapTourismService {
  id: string;
  type: MapServiceType;
  name: Localized<string>;
  subtitle: Localized<string>;
  region: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: Localized<string>;
  image: string;
  rating?: number;
  reviewsCount?: number;
  // Hotel specifics
  pricePerNightUSD?: number;
  pricePerNightCRC?: number;
  stars?: number;
  cstCertificate?: string;
  amenities?: Localized<string[]>;
  // National Park specifics
  officialPriceUSD?: number;
  officialPriceCRC?: number;
  sinacCode?: string;
  dailyQuota?: number;
  entryHours?: Localized<string>;
  closedDays?: Localized<string>;
  regulations?: Localized<string[]>;
  sinacBookingUrl?: string;
  // Transport specifics
  transportCompany?: string;
  routesServed?: Localized<string[]>;
  averageTicketUSD?: number;
  averageTicketCRC?: number;
  departureFrequency?: Localized<string>;
  phone?: string;
  flightCode?: string;
  flightTimeFromSJO?: string;
  runwayType?: string;
  description: Localized<string>;
  tips: Localized<string>;
  canBeBooked: boolean;
}

export const MAP_TOURISM_SERVICES: MapTourismService[] = [
  // ==========================================
  // 🏨 ALOJAMIENTOS Y ECO-LODGES SOSTENIBLES
  // ==========================================
  {
    id: 'hotel-nayara-tented',
    type: 'hotel',
    name: {
      es: 'Nayara Tented Camp & Hot Springs',
      en: 'Nayara Tented Camp & Hot Springs'
    },
    subtitle: {
      es: 'Lujo ecológico con vista frontal al Volcán Arenal y aguas termales',
      en: 'Eco-luxury safari tents with Arenal Volcano views & hot springs'
    },
    region: 'arenal',
    coordinates: { lat: 10.4984, lng: -84.6934 },
    address: {
      es: 'Carretera a La Fortuna, 6 km al oeste, Volcán Arenal',
      en: 'Road to La Fortuna, 6 km west, Arenal Volcano'
    },
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    rating: 4.9,
    reviewsCount: 640,
    pricePerNightUSD: 550,
    pricePerNightCRC: 286000,
    stars: 5,
    cstCertificate: 'CST Nivel Elite (5 Hojas)',
    amenities: {
      es: ['Piscina privada de aguas termales', 'Desayuno gourmet incluido', 'Santuario de perezosos', 'Spa botánico', 'WiFi Starlink'],
      en: ['Private mineral hot spring plunge pool', 'Gourmet breakfast included', 'Sloth sanctuary on-site', 'Botanical spa', 'Starlink WiFi']
    },
    description: {
      es: 'Uno de los eco-resorts más galardonados de América Latina. Carpas de safari de ultralujo inmersas en la selva con vistas directas al cráter del Volcán Arenal y piscinas privadas alimentadas por fuentes termales naturales.',
      en: 'One of the most acclaimed eco-resorts in Latin America. Ultra-luxury safari tents immersed in rainforest canopy with direct crater views and private mineral hot spring pools.'
    },
    tips: {
      es: 'Reserva con al menos 3 semanas de anticipación en temporada alta (diciembre a abril).',
      en: 'Book at least 3 weeks ahead for high season (December through April).'
    },
    canBeBooked: true
  },
  {
    id: 'hotel-monteverde-lodge',
    type: 'hotel',
    name: {
      es: 'Monteverde Cloud Forest Lodge & Reserve',
      en: 'Monteverde Cloud Forest Lodge & Reserve'
    },
    subtitle: {
      es: 'Refugio de montaña inmerso en la reserva nubosa con senderos privados',
      en: 'Mountain retreat tucked in cloud forest reserve with private trails'
    },
    region: 'monteverde',
    coordinates: { lat: 10.3125, lng: -84.8188 },
    address: {
      es: 'Santa Elena de Monteverde, camino al Bosque Nuboso',
      en: 'Santa Elena, Monteverde, Cloud Forest road'
    },
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80',
    rating: 4.8,
    reviewsCount: 420,
    pricePerNightUSD: 240,
    pricePerNightCRC: 124800,
    stars: 4,
    cstCertificate: 'CST Nivel 5 (Sostenible)',
    amenities: {
      es: ['Senderos privados para quetzales', 'Restaurante de cocina tica orgánica', 'Calefacción ecológica', 'Guías naturalistas'],
      en: ['Private quetzal trails', 'Organic Tico farm-to-table cuisine', 'Eco heating', 'Naturalist resident guides']
    },
    description: {
      es: 'Eco-lodge de madera noble en medio de 23 hectáreas de bosque nuboso primario. Ideal para avistamiento de aves al amanecer y descanso con sonidos de la niebla.',
      en: 'Hardwood eco-lodge set within 23 hectares of primary cloud forest. Perfect for sunrise birdwatching and relaxing amid highland mist.'
    },
    tips: {
      es: 'Trae calzado de senderismo impermeable y abrigo ligero para las noches frescas.',
      en: 'Pack waterproof hiking shoes and a light jacket for crisp mountain evenings.'
    },
    canBeBooked: true
  },
  {
    id: 'hotel-arenas-del-mar',
    type: 'hotel',
    name: {
      es: 'Arenas del Mar Beachfront & Rainforest Resort',
      en: 'Arenas del Mar Beachfront & Rainforest Resort'
    },
    subtitle: {
      es: 'Acceso directo a dos playas paradisíacas colindantes al Parque Manuel Antonio',
      en: 'Direct access to two pristine beaches adjacent to Manuel Antonio Park'
    },
    region: 'manuel_antonio',
    coordinates: { lat: 9.4002, lng: -84.1568 },
    address: {
      es: 'Playa Playitas, Manuel Antonio, Quepos',
      en: 'Playitas Beach, Manuel Antonio, Quepos'
    },
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80',
    rating: 4.9,
    reviewsCount: 510,
    pricePerNightUSD: 390,
    pricePerNightCRC: 202800,
    stars: 5,
    cstCertificate: 'CST 5 Hojas & Certificado Bandera Azul Ecológica',
    amenities: {
      es: ['Acceso directo a Playa Espadilla', 'Avistamiento de monos y perezosos en los balcones', 'Gastronomía sin gluten certificada', 'Clases de surf'],
      en: ['Direct access to Espadilla Beach', 'Monkeys and sloths spotted from decks', 'Certified gluten-free dining', 'Surf lessons']
    },
    description: {
      es: 'El único resort de lujo en Manuel Antonio ubicado directamente sobre la arena con vista al mar y en el corazón de la selva tropical. La vida silvestre transita a diario por sus pasarelas.',
      en: 'The premier luxury resort in Manuel Antonio directly on the sand with ocean views and surrounded by coastal rainforest where sloths and capuchins roam daily.'
    },
    tips: {
      es: 'Los carritos eléctricos de golf te llevan entre las suites y la playa en 2 minutos.',
      en: 'Complimentary electric golf buggies ferry guests between rooms and the private beach.'
    },
    canBeBooked: true
  },
  {
    id: 'hotel-lapa-rios',
    type: 'hotel',
    name: {
      es: 'Lapa Rios Rainforest Ecolodge (Osa & Corcovado)',
      en: 'Lapa Rios Rainforest Ecolodge (Osa & Corcovado)'
    },
    subtitle: {
      es: 'Ícono mundial de ecoturismo en 1,000 acres de selva virgen del Golfo Dulce',
      en: 'World-renowned ecotourism icon in 1,000 acres of virgin rainforest'
    },
    region: 'osa',
    coordinates: { lat: 8.4061, lng: -83.2981 },
    address: {
      es: 'Cabo Matapalo, Península de Osa, Golfo Dulce',
      en: 'Cabo Matapalo, Osa Peninsula, Golfo Dulce'
    },
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80',
    rating: 4.9,
    reviewsCount: 380,
    pricePerNightUSD: 620,
    pricePerNightCRC: 322400,
    stars: 5,
    cstCertificate: 'CST Pionero 5 Hojas Máxima Distinción',
    amenities: {
      es: ['Bungalows abiertos a la brisa marina', 'Piscina de borde infinito sobre el dosel', 'Tours naturalistas guiados incluidos', 'Pensión completa'],
      en: ['Breeze-cooled open-air bungalows', 'Infinity pool above rainforest canopy', 'Guided naturalist treks included', 'Full board gourmet dining']
    },
    description: {
      es: 'Situado en la Península de Osa frente a Corcovado, donde habita el 2.5% de la biodiversidad del planeta. Los bungalows sobre pilotes miran al mar y al dosel de árboles centenarios.',
      en: 'Set in the Osa Peninsula near Corcovado, home to 2.5% of the planet’s biodiversity. Raised bungalows overlook Golfo Dulce and ancient rainforest trees.'
    },
    tips: {
      es: 'Llega en vuelo doméstico en avioneta a Puerto Jiménez (PJM) y toma el transfer 4x4.',
      en: 'Arrive via domestic flight to Puerto Jiménez (PJM) and take the scenic 4x4 lodge transfer.'
    },
    canBeBooked: true
  },
  {
    id: 'hotel-mawamba-lodge',
    type: 'hotel',
    name: {
      es: 'Mawamba Lodge Tortuguero',
      en: 'Mawamba Lodge Tortuguero'
    },
    subtitle: {
      es: 'Entre los canales y el mar Caribe con jardines de mariposas y ranas',
      en: 'Nestled between Tortuguero canals and the Caribbean Sea'
    },
    region: 'tortuguero',
    coordinates: { lat: 10.5512, lng: -83.5098 },
    address: {
      es: 'Canales de Tortuguero, acceso exclusivo en lancha',
      en: 'Tortuguero Canals, boat-only access'
    },
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80',
    rating: 4.7,
    reviewsCount: 340,
    pricePerNightUSD: 190,
    pricePerNightCRC: 98800,
    stars: 4,
    cstCertificate: 'CST 4 Hojas',
    amenities: {
      es: ['Mariposario y ranario privado', 'Piscina con bar', 'Restaurante flotante Katonga', 'Lanchas ecológicas de safari'],
      en: ['Private butterfly & frog garden', 'Pool & lounge', 'Katonga floating restaurant', 'Electric eco safari boats']
    },
    description: {
      es: 'Aislado en una estrecha franja de tierra entre los canales del Parque Tortuguero y la costa del Caribe. Despierta con el llamado de los monos aulladores y viaja en lanchas silenciosas por los humedales.',
      en: 'Secluded on a sand spit between the Tortuguero lagoon and the Caribbean Sea. Wake up to howler monkeys and cruise calm canal waterways.'
    },
    tips: {
      es: 'El equipaje en lancha tiene un límite recomendado de 12 kg (25 lbs) por persona.',
      en: 'Boat transfers have a recommended baggage weight limit of 12 kg (25 lbs) per guest.'
    },
    canBeBooked: true
  },
  {
    id: 'hotel-aguas-claras',
    type: 'hotel',
    name: {
      es: 'Hotel Aguas Claras Boutique (Caribe Sur)',
      en: 'Hotel Aguas Claras Boutique (South Caribbean)'
    },
    subtitle: {
      es: 'Relais & Châteaux de estilo caribeño victoriano frente a Playa Chiquita',
      en: 'Relais & Châteaux Victorian Caribbean boutique at Playa Chiquita'
    },
    region: 'caribe',
    coordinates: { lat: 9.6385, lng: -82.7214 },
    address: {
      es: 'Playa Chiquita, Puerto Viejo de Talamanca, Limón',
      en: 'Playa Chiquita, Puerto Viejo de Talamanca, Limon'
    },
    image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1000&q=80',
    rating: 4.8,
    reviewsCount: 290,
    pricePerNightUSD: 360,
    pricePerNightCRC: 187200,
    stars: 5,
    cstCertificate: 'CST Sostenible & Relais & Châteaux',
    amenities: {
      es: ['Bicicletas cruiser vintage incluidas', 'Arte costarricense original en cada villa', 'Restaurante Papaya frente al arrecife', 'Acceso a playa de aguas turquesas'],
      en: ['Complimentary cruiser bicycles', 'Original Costa Rican art in each villa', 'Papaya beachfront reef restaurant', 'Direct turquoise cove access']
    },
    description: {
      es: 'Casas victorianas de madera decoradas con arte caribeño contemporáneo en medio de jardines florales y a pasos de los arrecifes de coral de Playa Chiquita.',
      en: 'Victorian-Caribbean restored wooden villas surrounded by tropical flora and steps from the turquoise coral lagoons of Playa Chiquita.'
    },
    tips: {
      es: 'Usa las bicicletas para pedalear hasta Punta Uva y los restaurantes de Puerto Viejo.',
      en: 'Take the complimentary bikes to explore Punta Uva beach and downtown Puerto Viejo.'
    },
    canBeBooked: true
  },
  {
    id: 'hotel-pacuare-lodge',
    type: 'hotel',
    name: {
      es: 'Pacuare Lodge (Aventura en el Cañón)',
      en: 'Pacuare Lodge (Canyon Wilderness)'
    },
    subtitle: {
      es: 'Lodge de aventura mundial accesible exclusivamente en balsa de rafting',
      en: 'World-class wilderness lodge accessible exclusively by white-water raft'
    },
    region: 'pacuare',
    coordinates: { lat: 9.8781, lng: -83.5241 },
    address: {
      es: 'Cañón del Río Pacuare, Turrialba / Limón',
      en: 'Pacuare River Canyon, Turrialba / Limon'
    },
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=80',
    rating: 5.0,
    reviewsCount: 310,
    pricePerNightUSD: 580,
    pricePerNightCRC: 301600,
    stars: 5,
    cstCertificate: 'National Geographic Unique Lodges & CST 5 Hojas',
    amenities: {
      es: ['Entrada en balsa por rápidos Clase III-IV', 'Cenas a la luz de velas en el bosque', 'Canopy sobre el cañón', 'Suites con piscina privada de manantial'],
      en: ['Rafting arrival through Class III-IV rapids', 'Candlelit dining in primary jungle', 'Canyon canopy zipline', 'Spring-fed private pool suites']
    },
    description: {
      es: 'Reconocido por National Geographic como uno de los lodges más extraordinarios del planeta. La llegada en balsa de rafting a través de paredes de roca de 100 metros y cataratas es una experiencia insuperable.',
      en: 'Named by National Geographic as one of the world’s top eco-lodges. Reached by navigating Class III-IV river rapids past 300-ft gorges and cascading waterfalls.'
    },
    tips: {
      es: 'Todo el transporte en rafting, guías certificados y equipo están incluidos en el paquete de estadía.',
      en: 'All rafting logistics, certified guides, and gear are fully coordinated with your booking.'
    },
    canBeBooked: true
  },
  {
    id: 'hotel-grano-de-oro',
    type: 'hotel',
    name: {
      es: 'Hotel Boutique Grano de Oro (San José)',
      en: 'Hotel Boutique Grano de Oro (San José)'
    },
    subtitle: {
      es: 'Mansión victoriana de la época de oro del café en el corazón de la capital',
      en: 'Victorian coffee-baron mansion in the heart of Costa Rica’s capital'
    },
    region: 'san_jose',
    coordinates: { lat: 9.9327, lng: -84.0934 },
    address: {
      es: 'Calle 30, Avenida 2 y 4, Barrio Don Bosco, San José',
      en: 'Calle 30, Av 2 & 4, Barrio Don Bosco, San José'
    },
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=80',
    rating: 4.9,
    reviewsCount: 780,
    pricePerNightUSD: 195,
    pricePerNightCRC: 101400,
    stars: 4,
    cstCertificate: 'CST Nivel Sostenible',
    amenities: {
      es: ['Restaurante gourmet franco-costarricense', 'Patios coloniales con fuentes', 'Cava de vinos premiada', 'Jacuzzis en terraza'],
      en: ['French-Costa Rican fine dining', 'Colonial garden courtyards', 'Award-winning wine cellar', 'Rooftop hot tubs']
    },
    description: {
      es: 'El hotel con más encanto de San José. Una histórica mansión tropical restaurada con maderas preciosas, azulejos artesanales y una de las experiencias gastronómicas más aclamadas del país.',
      en: 'San José’s most charming heritage hotel. A restored tropical Victorian mansion featuring period tilework, rich woods, and an acclaimed fine-dining courtyard.'
    },
    tips: {
      es: 'Excelente base para tu primera o última noche cerca de museos y a 25 minutos del Aeropuerto SJO.',
      en: 'Ideal base for your arrival or departure night, 25 minutes from SJO airport and near national museums.'
    },
    canBeBooked: true
  },

  // ==========================================
  // 🌿 PARQUES NACIONALES Y RESERVAS (SINAC)
  // ==========================================
  {
    id: 'park-manuel-antonio',
    type: 'national_park',
    name: {
      es: 'Parque Nacional Manuel Antonio (SINAC)',
      en: 'Manuel Antonio National Park (SINAC)'
    },
    subtitle: {
      es: 'Playas de arena blanca, senderos de bosque lluvioso y vida silvestre abundante',
      en: 'Pristine white sand beaches, rainforest trails & abundant coastal wildlife'
    },
    region: 'manuel_antonio',
    coordinates: { lat: 9.3888, lng: -84.1415 },
    address: {
      es: 'Entrada oficial El Espadilla Sur, Manuel Antonio, Puntarenas',
      en: 'Official Gate, South Espadilla, Manuel Antonio, Puntarenas'
    },
    image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1000&q=80',
    rating: 4.8,
    reviewsCount: 1420,
    officialPriceUSD: 18.08,
    officialPriceCRC: 1808,
    sinacCode: 'PNMA-ACOPAC',
    dailyQuota: 3000,
    entryHours: {
      es: '7:00 AM a 3:00 PM (Cerrado los MARTES)',
      en: '7:00 AM to 3:00 PM (Closed on TUESDAYS)'
    },
    closedDays: {
      es: 'Todos los martes del año',
      en: 'Every Tuesday year-round'
    },
    regulations: {
      es: [
        'Prohibido ingresar con plásticos de un solo uso (botellas plásticas desechables)',
        'Prohibido el ingreso de alimentos para proteger a los monos y mapaches',
        'Se requiere compra previa con cédula o pasaporte en el sistema SINAC',
        'No alimentar ni acercarse a menos de 2 metros de los animales silvestres'
      ],
      en: [
        'Single-use plastic bottles prohibited (bring reusable containers)',
        'No outside food allowed to safeguard native monkeys and raccoons',
        'Advance passport/ID registered ticket mandatory via SINAC',
        'Never feed or approach wildlife closer than 2 meters'
      ]
    },
    sinacBookingUrl: 'https://serviciosenlinea.sinac.go.cr',
    description: {
      es: 'Reconocido por Forbes como uno de los parques nacionales más bellos del mundo. Combina senderos accesibles de bosque tropical lluvioso habitados por perezosos y monos tití con playas de postal del Pacífico.',
      en: 'Voted by Forbes among the world’s most stunning national parks. Features accessible boardwalks winding through rainforest to postcard-perfect Pacific coves with sloths and squirrel monkeys.'
    },
    tips: {
      es: 'Ingresa en el primer turno de las 7:00 AM para evitar calor y ver mayor actividad de animales.',
      en: 'Book the 7:00 AM opening time slot to beat peak heat and see active wildlife before crowds arrive.'
    },
    canBeBooked: true
  },
  {
    id: 'park-volcan-arenal',
    type: 'national_park',
    name: {
      es: 'Parque Nacional Volcán Arenal (SINAC)',
      en: 'Arenal Volcano National Park (SINAC)'
    },
    subtitle: {
      es: 'Coladas de lava de la erupción de 1968, miradores al cono y senderos de ceibas',
      en: 'Historical 1968 lava fields, crater observation lookouts & ancient ceiba trees'
    },
    region: 'arenal',
    coordinates: { lat: 10.4633, lng: -84.7032 },
    address: {
      es: 'Puesto Principal Los Heliconias, La Fortuna de San Carlos',
      en: 'Heliconias Main Station, La Fortuna de San Carlos'
    },
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=80',
    rating: 4.8,
    reviewsCount: 1180,
    officialPriceUSD: 16.95,
    officialPriceCRC: 1130,
    sinacCode: 'PNVA-ACAHN',
    dailyQuota: 2200,
    entryHours: {
      es: '8:00 AM a 4:00 PM (Abierto todos los días)',
      en: '8:00 AM to 4:00 PM (Open every day)'
    },
    closedDays: {
      es: 'Ninguno (Abierto 365 días del año)',
      en: 'None (Open 365 days a year)'
    },
    regulations: {
      es: [
        'Prohibido cruzar las zonas de restricción geológica o acercarse al cráter activo',
        'Permanecer siempre en senderos señalizados (Las Coladas, El Ceibo)',
        'Llevar calzado con tracción para suelo volcánico pedregoso'
      ],
      en: [
        'Hazardous zones off-limits; hiking to the active peak is illegal and dangerous',
        'Remain on designated trails (Las Coladas, El Ceibo)',
        'Wear closed-toe trail shoes with grip for rough lava terrain'
      ]
    },
    sinacBookingUrl: 'https://serviciosenlinea.sinac.go.cr',
    description: {
      es: 'Guarda el imponente cono perfecto de 1,633 metros. Podrás caminar sobre los campos de lava petrificada de la gran erupción de 1968 y contemplar vistas panorámicas del Lago Arenal.',
      en: 'Protects the iconic 1,633-meter volcano cone. Hike across jagged petrified lava flows from the historic 1968 event with panoramic vistas over Lake Arenal.'
    },
    tips: {
      es: 'El sendero El Ceibo alberga un árbol sagrado de más de 400 años que sobrevivió a las erupciones.',
      en: 'Don’t miss the El Ceibo trail leading to a 400-year-old giant tree that survived volcanic blasts.'
    },
    canBeBooked: true
  },
  {
    id: 'park-volcan-poas',
    type: 'national_park',
    name: {
      es: 'Parque Nacional Volcán Poás (SINAC)',
      en: 'Poás Volcano National Park (SINAC)'
    },
    subtitle: {
      es: 'Uno de los cráteres tipo caldera más grandes del mundo con laguna ácida turquesa',
      en: 'One of Earth’s largest active caldera craters with a vivid acid lake'
    },
    region: 'san_jose',
    coordinates: { lat: 10.1983, lng: -84.2333 },
    address: {
      es: 'Cordillera Volcánica Central, Alajuela (a 50 min de SJO)',
      en: 'Central Volcanic Ridge, Alajuela (50 mins from SJO)'
    },
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    rating: 4.7,
    reviewsCount: 960,
    officialPriceUSD: 16.95,
    officialPriceCRC: 1130,
    sinacCode: 'PNVP-ACC',
    dailyQuota: 1500,
    entryHours: {
      es: '8:00 AM a 3:30 PM (Turnos escalonados cada 20 minutos con casco de seguridad)',
      en: '8:00 AM to 3:30 PM (Staggered 20-min timed slots with safety helmets)'
    },
    closedDays: {
      es: 'Abierto todos los días (sujeto a monitoreo de gases volcánicos por OVSICORI)',
      en: 'Open daily (subject to real-time OVSICORI gas activity monitors)'
    },
    regulations: {
      es: [
        'Reserva previa 100% digital obligatoria antes de subir a la montaña',
        'Uso de casco de seguridad suministrado por guardaparques en el mirador',
        'No recomendado para personas con afecciones respiratorias severas debido a fumarolas'
      ],
      en: [
        '100% digital advance reservation required before driving up the mountain',
        'Safety helmet provided by park rangers must be worn at the rim',
        'Not recommended for people with severe asthma due to sulfur emissions'
      ]
    },
    sinacBookingUrl: 'https://serviciosenlinea.sinac.go.cr',
    description: {
      es: 'Cráter colosal de 1.5 km de diámetro y 300 metros de profundidad. Su laguna caliente de color azul turquesa emana columnas de vapor geotérmico en un paisaje casi lunar rodeado de bosque enano.',
      en: 'Colossal caldera 1.5 km across and 300 meters deep. Its turquoise mineral lake boils with steaming fumaroles surrounded by high-elevation dwarf cloud forest.'
    },
    tips: {
      es: 'Reserva el turno de las 8:00 AM o 8:40 AM; las nubes suelen cubrir el cráter a partir de las 11:00 AM.',
      en: 'Book the 8:00 AM or 8:40 AM slot; fog and rain clouds roll in over the crater around 11:00 AM.'
    },
    canBeBooked: true
  },
  {
    id: 'park-tortuguero',
    type: 'national_park',
    name: {
      es: 'Parque Nacional Tortuguero (SINAC)',
      en: 'Tortuguero National Park (SINAC)'
    },
    subtitle: {
      es: 'El Amazonas de Centroamérica: santuario de tortugas verdes y canales fluviales',
      en: 'The Amazon of Central America: green sea turtle haven & calm waterways'
    },
    region: 'tortuguero',
    coordinates: { lat: 10.5367, lng: -83.5042 },
    address: {
      es: 'Puesto Cuatro Esquinas, Tortuguero, Pococí, Limón',
      en: 'Cuatro Esquinas Ranger Station, Tortuguero, Limon'
    },
    image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1000&q=80',
    rating: 4.9,
    reviewsCount: 880,
    officialPriceUSD: 16.95,
    officialPriceCRC: 1130,
    sinacCode: 'PNT-ACTO',
    dailyQuota: 2000,
    entryHours: {
      es: '6:00 AM a 4:00 PM para senderos y canales; tours nocturnos de 8:00 PM a 10:00 PM',
      en: '6:00 AM to 4:00 PM for canals & trails; night turtle walks 8:00 PM to 10:00 PM'
    },
    closedDays: {
      es: 'Abierto los 365 días del año',
      en: 'Open 365 days a year'
    },
    regulations: {
      es: [
        'Los tours nocturnos de desove de tortugas requieren guía certificado acreditado por SINAC',
        'Estrictamente prohibido usar linternas de luz blanca, flash o cámaras durante el desove',
        'Navegación en canales en botes con motor 4 tiempos o kayaks/canoas'
      ],
      en: [
        'Night turtle walks require a licensed SINAC-certified naturalist guide',
        'White flashlights, cell flashes, and camera lighting strictly banned during nesting',
        'Only low-emission 4-stroke boat engines or non-motorized paddle canoes permitted'
      ]
    },
    sinacBookingUrl: 'https://serviciosenlinea.sinac.go.cr',
    description: {
      es: 'Accesible únicamente por agua o aire. Una red de ríos y canales rodeados de selva densa donde conviven manatíes, caimanes, tucanes y jaguares, y la mayor colonia de anidación de tortuga verde del Caribe.',
      en: 'Accessible only by boat or aircraft. A wild network of inland canals and lagoons where green sea turtles, caimans, toucans, and river manatees thrive.'
    },
    tips: {
      es: 'Temporada cumbre de desove de tortuga verde: de julio a octubre.',
      en: 'Peak green sea turtle nesting season runs from July through October.'
    },
    canBeBooked: true
  },
  {
    id: 'park-corcovado',
    type: 'national_park',
    name: {
      es: 'Parque Nacional Corcovado (SINAC - Estación Sirena)',
      en: 'Corcovado National Park (SINAC - Sirena Station)'
    },
    subtitle: {
      es: 'La joya biológica más intensa del planeta: dantas, jaguares y cuatro especies de monos',
      en: 'The most biologically intense place on Earth: tapirs, jaguars & wildlife'
    },
    region: 'osa',
    coordinates: { lat: 8.4808, lng: -83.5898 },
    address: {
      es: 'Estación Biológica Sirena, Península de Osa',
      en: 'Sirena Biological Station, Osa Peninsula'
    },
    image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?auto=format&fit=crop&w=1000&q=80',
    rating: 5.0,
    reviewsCount: 750,
    officialPriceUSD: 16.95,
    officialPriceCRC: 1808,
    sinacCode: 'PNC-ACOSA',
    dailyQuota: 280,
    entryHours: {
      es: '7:00 AM a 4:00 PM (Cupo muy restringido - requiere reserva con semanas de anticipación)',
      en: '7:00 AM to 4:00 PM (Very strict quotas - reserve weeks in advance)'
    },
    closedDays: {
      es: 'Cerrado en octubre por mantenimiento de senderos y lluvias torrenciales',
      en: 'Closed in October for annual trail maintenance and heavy rains'
    },
    regulations: {
      es: [
        'OBLIGATORIO ingresar con Guía Naturalista Certificado por SINAC (máximo 6 personas por guía)',
        'Prohibido salirse de los senderos demarcados por presencia de serpientes y dantas salvajes',
        'Registro de pasaporte y pago anticipado antes de abordar la lancha en Bahía Drake o Sierpe'
      ],
      en: [
        'MANDATORY entry with a licensed SINAC Naturalist Guide (maximum 6 hikers per guide)',
        'Stay on marked tracks; dense jungle hosts wild Baird’s tapirs, peccaries, and vipers',
        'ID registration and prepaid permit required before boarding boat at Drake or Sierpe'
      ]
    },
    sinacBookingUrl: 'https://serviciosenlinea.sinac.go.cr',
    description: {
      es: 'Bautizado por National Geographic como "el lugar con mayor intensidad biológica del planeta". Alberga todas las especies de felinos de América, dantas cruzando las playas y manadas de pecaríes.',
      en: 'Acclaimed by National Geographic as "the most biologically intense place on Earth." Shelters tapirs on the beach, four monkey species, scarlet macaws, and pristine ancient canopy.'
    },
    tips: {
      es: 'La mejor forma de entrar para pasadía es en lancha rápida desde Bahía Drake directo a la playa de Sirena.',
      en: 'The most scenic and reliable day trip access is a 45-min boat ride from Drake Bay to Sirena Beach.'
    },
    canBeBooked: true
  },
  {
    id: 'park-monteverde-cloud',
    type: 'national_park',
    name: {
      es: 'Reserva Biológica Bosque Nuboso Monteverde',
      en: 'Monteverde Cloud Forest Biological Reserve'
    },
    subtitle: {
      es: 'Santuario neotropical de orquídeas, puentes suspendidos y hábitat del quetzal',
      en: 'Highland cloud sanctuary: quetzals, hanging bridges & ancient bromeliads'
    },
    region: 'monteverde',
    coordinates: { lat: 10.3023, lng: -84.7958 },
    address: {
      es: 'Final de la Carretera a Monteverde, Santa Elena, Puntarenas',
      en: 'End of Monteverde Road, Santa Elena, Puntarenas'
    },
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=80',
    rating: 4.9,
    reviewsCount: 1650,
    officialPriceUSD: 26.00,
    officialPriceCRC: 13500,
    sinacCode: 'RBBNM-CCT',
    dailyQuota: 450,
    entryHours: {
      es: '7:00 AM a 4:00 PM (Diariamente)',
      en: '7:00 AM to 4:00 PM (Daily)'
    },
    closedDays: {
      es: 'Abierto todos los días del año',
      en: 'Open every single day'
    },
    regulations: {
      es: [
        'Mantener silencio en los miradores para facilitar la observación de quetzales y colibríes',
        'Capacidad máxima simultánea de 250 personas dentro del bosque para minimizar impacto',
        'Uso obligatorio de senderos de madera elevados en zonas pantanosas'
      ],
      en: [
        'Maintain quiet along trails to optimize quetzal and bellbird sightings',
        'Maximum 250 hikers simultaneously inside the reserve to minimize eco-impact',
        'Stick to elevated wooden boardwalks across delicate mossy highland soil'
      ]
    },
    sinacBookingUrl: 'https://cloudforestmonteverde.com',
    description: {
      es: 'Ubicada sobre la división continental de aguas de Costa Rica. La niebla casi constante nutre más de 500 especies de orquídeas, helechos gigantes y el mítico Quetzal Resplandeciente.',
      en: 'Perched along Costa Rica’s continental divide. Near-constant moisture nourishes over 500 orchid species, tree ferns, and the resplendent quetzal.'
    },
    tips: {
      es: 'Llega con telescopio o contrata un guía local en la entrada; tienen ojos entrenados para hallar el quetzal.',
      en: 'Hire a reserve spotting guide at the gate; their high-power scopes make locating hidden quetzals effortless.'
    },
    canBeBooked: true
  },
  {
    id: 'park-cahuita',
    type: 'national_park',
    name: {
      es: 'Parque Nacional Cahuita (Arrecifes & Playa)',
      en: 'Cahuita National Park (Reefs & Beach Trails)'
    },
    subtitle: {
      es: 'Senderos costeros con monos cariblancos, arena blanca y snorkel en arrecife de coral',
      en: 'Coastal trail with monkeys, white sands & Caribbean coral reef snorkeling'
    },
    region: 'caribe',
    coordinates: { lat: 9.7364, lng: -82.8427 },
    address: {
      es: 'Entrada Kelly Creek (Pueblo de Cahuita) y Sector Puerto Vargas',
      en: 'Kelly Creek Gate (Cahuita town) & Puerto Vargas sector'
    },
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
    rating: 4.8,
    reviewsCount: 890,
    officialPriceUSD: 5.65,
    officialPriceCRC: 1000,
    sinacCode: 'PNC-ACLAC',
    dailyQuota: 1800,
    entryHours: {
      es: '8:00 AM a 4:00 PM (Kelly Creek opera con donación voluntaria; Puerto Vargas $5.65)',
      en: '8:00 AM to 4:00 PM (Kelly Creek by voluntary donation; Puerto Vargas $5.65)'
    },
    closedDays: {
      es: 'Abierto todos los días',
      en: 'Open daily'
    },
    regulations: {
      es: [
        'Cuidar mochilas y alimentos; los monos capuchinos y mapaches saben abrir zíperes',
        'Para hacer snorkel en la barrera de coral se requiere guía con lancha autorizada por SINAC',
        'No pisar los corales ni usar protectores solares con oxibenzona'
      ],
      en: [
        'Guard daypacks; habituated raccoons and capuchins know how to unzip bags',
        'Snorkeling the outer barrier reef requires an authorized local boat guide',
        'Never touch live coral; use reef-safe biodegradable sunscreen only'
      ]
    },
    sinacBookingUrl: 'https://serviciosenlinea.sinac.go.cr',
    description: {
      es: 'Un modelo ejemplar de comanejo comunitario entre el pueblo de Cahuita y el SINAC. El sendero bordea el mar turquesa bajo cocoteros con perezosos y monos a la vista.',
      en: 'A celebrated community co-managed park. The trail hugs the turquoise Caribbean under shade palms with sloths and white-faced capuchins resting overhead.'
    },
    tips: {
      es: 'La entrada por el pueblo (Playa Blanca) pide contribución voluntaria para apoyar a los guardaparques comunales.',
      en: 'Entering via downtown Cahuita (Kelly Creek) operates by suggested donation supporting local community rangers.'
    },
    canBeBooked: true
  },

  // ==========================================
  // 🚌 ESTACIONES DE BUSES INTERURBANOS
  // ==========================================
  {
    id: 'bus-terminal-7-10',
    type: 'bus_station',
    name: {
      es: 'Terminal 7-10 (San José Centro)',
      en: 'Terminal 7-10 (Downtown San José)'
    },
    subtitle: {
      es: 'Principal hub de buses hacia Guanacaste, La Fortuna, Monteverde y Jacó',
      en: 'Main bus terminal for Guanacaste, Arenal/La Fortuna, Monteverde & Jacó'
    },
    region: 'san_jose',
    coordinates: { lat: 9.9385, lng: -84.0847 },
    address: {
      es: 'Calle 8, Avenidas 7 y 9, Barrio Paso de la Vaca, San José',
      en: 'Calle 8, between Ave 7 & 9, Paso de la Vaca, San José'
    },
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=80',
    transportCompany: 'Autotransportes San José - San Carlos / Transmonteverde / Transportes Jacó / Alfaro',
    routesServed: {
      es: ['La Fortuna (Arenal): 8:40 AM & 11:30 AM (₡3,100 / $6)', 'Monteverde: 6:30 AM & 2:30 PM (₡3,600 / $7)', 'Tamarindo / Nicoya: 7:30 AM & 3:30 PM (₡6,000 / $12)', 'Jacó Beach: Salidas cada 2 horas (₡2,800 / $5.50)'],
      en: ['La Fortuna: 8:40 AM & 11:30 AM ($6 / ₡3,100)', 'Monteverde: 6:30 AM & 2:30 PM ($7 / ₡3,600)', 'Tamarindo: 7:30 AM & 3:30 PM ($12 / ₡6,000)', 'Jacó Beach: Departs every 2 hrs ($5.50 / ₡2,800)']
    },
    averageTicketUSD: 7,
    averageTicketCRC: 3600,
    departureFrequency: {
      es: 'Salidas diarias frecuentes desde las 5:00 AM hasta las 8:00 PM',
      en: 'Daily departures from 5:00 AM to 8:00 PM'
    },
    phone: '+506 2255-4300',
    description: {
      es: 'Terminal moderna y techada de 3 niveles con salas de espera climatizadas, cajeros automáticos, zona de comidas, guardaequipajes y boleterías electrónicas para las principales rutas turísticas.',
      en: 'Modern multi-story enclosed transit hub featuring air-conditioned waiting halls, ATMs, luggage lockers, food court, and ticket booths for major tourist hubs.'
    },
    tips: {
      es: 'Compra los boletos con 1 hora de anticipación en ventanilla o por internet para asegurar asiento numerado.',
      en: 'Arrive 45–60 minutes ahead to secure your numbered seat ticket, especially on Fridays and Sundays.'
    },
    canBeBooked: true
  },
  {
    id: 'bus-terminal-caribenos',
    type: 'bus_station',
    name: {
      es: 'Terminal Gran Caribe / Caribeños (San José)',
      en: 'Gran Caribe / Caribeños Terminal (San José)'
    },
    subtitle: {
      es: 'Rutas hacia Puerto Viejo, Cahuita, Limón y conexión a Tortuguero (La Pavona)',
      en: 'Buses to Puerto Viejo, Cahuita, Limón & Tortuguero boat connector (La Pavona)'
    },
    region: 'san_jose',
    coordinates: { lat: 9.9409, lng: -84.0772 },
    address: {
      es: 'Calle Central, Avenida 13, Barrio Tournón, San José',
      en: 'Calle Central, Ave 13, Barrio Tournon, San José'
    },
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1000&q=80',
    transportCompany: 'Autotransportes MEPE & Grupo Caribeños',
    routesServed: {
      es: ['Puerto Viejo de Talamanca / Cahuita: 6:00 AM, 8:00 AM, 10:00 AM, 12:00 PM, 2:00 PM, 4:00 PM (₡6,500 / $13)', 'Cariari / La Pavona (Lancha Tortuguero): 6:30 AM & 9:00 AM (₡2,100 / $4.20)', 'Limón Puerto Directo: Cada hora de 5:30 AM a 7:30 PM (₡4,200 / $8)'],
      en: ['Puerto Viejo / Cahuita: 6 AM, 8 AM, 10 AM, 12 PM, 2 PM, 4 PM ($13 / ₡6,500)', 'Cariari / La Pavona (Tortuguero boat): 6:30 AM & 9:00 AM ($4.20 / ₡2,100)', 'Limón City Direct: Hourly from 5:30 AM to 7:30 PM ($8 / ₡4,200)']
    },
    averageTicketUSD: 11,
    averageTicketCRC: 5700,
    departureFrequency: {
      es: 'Salidas cada 1 o 2 horas hacia el Caribe',
      en: 'Hourly to bi-hourly departures to the Caribbean coast'
    },
    phone: '+506 2221-7990',
    description: {
      es: 'El punto neurálgico para viajar hacia las playas y selvas del Caribe costarricense. Cuenta con servicio expreso por la Ruta 32 cruzando el Parque Nacional Braulio Carrillo.',
      en: 'The prime departure hub for the Caribbean coast. Express coaches traverse Route 32 through Braulio Carrillo National Park’s rainforest pass.'
    },
    tips: {
      es: 'Para ir a Tortuguero, toma el bus a Cariari de las 6:30 AM o 9:00 AM para sincronizar con la lancha en La Pavona.',
      en: 'To reach Tortuguero, catch the 6:30 AM or 9:00 AM bus to Cariari to sync seamlessly with the connecting riverboat.'
    },
    canBeBooked: true
  },
  {
    id: 'bus-terminal-tracopa',
    type: 'bus_station',
    name: {
      es: 'Terminal TRACOPA (Pacífico Sur)',
      en: 'TRACOPA Bus Terminal (South Pacific)'
    },
    subtitle: {
      es: 'Buses expreso hacia Manuel Antonio, Quepos, Dominical, Uvita y Sierpe (Corcovado)',
      en: 'Express coaches to Manuel Antonio, Quepos, Dominical, Uvita & Sierpe'
    },
    region: 'san_jose',
    coordinates: { lat: 9.9238, lng: -84.0841 },
    address: {
      es: 'Calle 5, Plaza Víquez, San José',
      en: 'Calle 5, Plaza Viquez, San José'
    },
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=80',
    transportCompany: 'Empresa TRACOPA Ltda.',
    routesServed: {
      es: ['Quepos / Manuel Antonio: Cada hora de 6:00 AM a 6:00 PM (₡5,200 / $10)', 'Uvita / Dominical: 6:00 AM, 9:00 AM, 2:30 PM (₡6,800 / $13.50)', 'Sierpe (Lancha a Drake y Corcovado): 5:00 AM & 8:30 AM (₡8,500 / $17)', 'Golfito / Puerto Jiménez: 6:30 AM & 12:00 PM (₡9,200 / $18)'],
      en: ['Manuel Antonio / Quepos: Hourly 6 AM to 6 PM ($10 / ₡5,200)', 'Uvita / Dominical: 6 AM, 9 AM, 2:30 PM ($13.50 / ₡6,800)', 'Sierpe (Boat to Drake/Corcovado): 5 AM & 8:30 AM ($17 / ₡8,500)', 'Golfito / Puerto Jiménez: 6:30 AM & 12 PM ($18 / ₡9,200)']
    },
    averageTicketUSD: 12,
    averageTicketCRC: 6200,
    departureFrequency: {
      es: 'Servicio directo continuo por Costanera Sur',
      en: 'Frequent direct service via Costanera Sur coastal highway'
    },
    phone: '+506 2221-4214',
    description: {
      es: 'Terminal con autobuses ejecutivos con aire acondicionado que conectan San José con todas las playas del Pacífico Central y la remota Península de Osa.',
      en: 'Executive air-conditioned coaches linking the capital with Pacific surf beaches, national parks, and Osa Peninsula boat gateways.'
    },
    tips: {
      es: 'Pide siempre boleto "Directo" en vez de "Colectivo" para ahorrar más de 1.5 horas de trayecto.',
      en: 'Always request the "Directo" (express) bus rather than "Colectivo" to save over 90 minutes of stops.'
    },
    canBeBooked: true
  },

  // ==========================================
  // 🚆 ESTACIONES DE TREN METROPOLITANO (INCOFER)
  // ==========================================
  {
    id: 'train-estacion-atlantico',
    type: 'train_station',
    name: {
      es: 'Estación al Atlántico (Tren INCOFER)',
      en: 'Atlantic Railway Station (INCOFER)'
    },
    subtitle: {
      es: 'Tren interurbano patrimonial San José - Cartago / Curridabat / UCR',
      en: 'Historic commuter train linking San José with Cartago & University district'
    },
    region: 'san_jose',
    coordinates: { lat: 9.9348, lng: -84.0706 },
    address: {
      es: 'Avenida 3, Calle 21, frente al Parque Nacional, San José',
      en: 'Ave 3, Calle 21, facing National Park, San José'
    },
    image: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1000&q=80',
    transportCompany: 'Instituto Costarricense de Ferrocarriles (INCOFER)',
    routesServed: {
      es: ['San José ➡️ Cartago (Basílica): Horas pico mañana (5:30 - 8:30 AM) y tarde (3:30 - 7:30 PM) (₡600 / $1.20)', 'San José ➡️ UCR / Curridabat: Frecuencia cada 30 min en horas laborales (₡350 / $0.70)'],
      en: ['San José ➡️ Cartago: Peak hours morning & afternoon ($1.20 / ₡600)', 'San José ➡️ UCR / Curridabat: Every 30 mins peak hours ($0.70 / ₡350)']
    },
    averageTicketUSD: 1.20,
    averageTicketCRC: 600,
    departureFrequency: {
      es: 'Lunes a Viernes en horas pico de mañana y tarde',
      en: 'Monday to Friday during morning and evening rush hours'
    },
    phone: '+506 2233-1466',
    description: {
      es: 'Monumento arquitectónico neoclásico inaugurado en 1908. Hoy opera modernos trenes diésel de pasajeros que evitan el denso tráfico vial del Valle Central hacia Cartago y los campus universitarios.',
      en: 'Neoclassical architectural landmark dating to 1908. Operates modern passenger commuter trains bypassing heavy highway traffic between San José and Cartago.'
    },
    tips: {
      es: 'El pago se realiza con tarjeta bancaria sin contacto directamente en el torniquete.',
      en: 'Contactless debit/credit cards or smartwatches tap directly at the turnstiles for instant boarding.'
    },
    canBeBooked: false
  },
  {
    id: 'train-estacion-pacifico',
    type: 'train_station',
    name: {
      es: 'Estación al Pacífico (Tren INCOFER)',
      en: 'Pacific Railway Station (INCOFER)'
    },
    subtitle: {
      es: 'Conexión ferroviaria hacia Belén, San Antonio y Heredia',
      en: 'Railway terminal serving Belén, San Antonio & suburban business hubs'
    },
    region: 'san_jose',
    coordinates: { lat: 9.9242, lng: -84.0805 },
    address: {
      es: 'Avenida 20, Calle 2, Plaza González Víquez, San José',
      en: 'Ave 20, Calle 2, Plaza Gonzalez Viquez, San José'
    },
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1000&q=80',
    transportCompany: 'INCOFER',
    routesServed: {
      es: ['San José ➡️ San Antonio de Belén: 5:40 AM - 8:15 AM y 4:00 PM - 7:30 PM (₡450 / $0.90)', 'San José ➡️ Pavas: 6:00 AM a 6:30 PM (₡350 / $0.70)'],
      en: ['San José ➡️ Belén: Morning & afternoon peak periods ($0.90 / ₡450)', 'San José ➡️ Pavas: 6 AM to 6:30 PM ($0.70 / ₡350)']
    },
    averageTicketUSD: 0.90,
    averageTicketCRC: 450,
    departureFrequency: {
      es: 'Lunes a Viernes en frecuencias laborales',
      en: 'Monday to Friday scheduled commuter runs'
    },
    phone: '+506 2221-0777',
    description: {
      es: 'Terminal histórica donde partía el tren al puerto de Puntarenas. Actualmente conecta el centro financiero con las zonas corporativas y residenciales del oeste metropolitano.',
      en: 'Historic rail terminal once linking the capital to Puntarenas seaport. Now serving western business corridors and residential suburbs.'
    },
    tips: {
      es: 'Es la vía más veloz para cruzar de este a oeste en la capital sin sufrir presas en horas pico.',
      en: 'The fastest way to transit between east and west San José without rush-hour gridlock.'
    },
    canBeBooked: false
  },

  // ==========================================
  // 🚕 PARADAS DE TAXI OFICIAL Y SHUTTLES
  // ==========================================
  {
    id: 'taxi-aeropuerto-sjo',
    type: 'taxi_stand',
    name: {
      es: 'Base Oficial Taxis Naranjas Aeropuerto SJO',
      en: 'Official Orange Airport Taxi Base SJO'
    },
    subtitle: {
      es: 'Taxis oficiales autorizados las 24 horas con tarifas fijadas por ARESEP',
      en: 'Authorized official 24/7 orange airport taxis with regulated rates'
    },
    region: 'san_jose',
    coordinates: { lat: 9.9982, lng: -84.2045 },
    address: {
      es: 'Salida de llegadas internacionales, Aeropuerto SJO, Alajuela',
      en: 'International arrivals curbside, SJO Airport, Alajuela'
    },
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1000&q=80',
    transportCompany: 'Taxis Unidos Aeropuerto SJO',
    routesServed: {
      es: ['SJO ➡️ San José Centro: $25 - $32 USD (₡14,000 - ₡17,000)', 'SJO ➡️ Escazú / Santa Ana: $28 - $35 USD', 'SJO ➡️ La Fortuna / Arenal: $135 - $160 USD', 'SJO ➡️ Manuel Antonio: $160 - $190 USD'],
      en: ['SJO ➡️ Downtown San José: $25 - $32 USD', 'SJO ➡️ Escazú: $28 - $35 USD', 'SJO ➡️ Arenal / La Fortuna: $135 - $160 USD', 'SJO ➡️ Manuel Antonio: $160 - $190 USD']
    },
    averageTicketUSD: 30,
    averageTicketCRC: 15600,
    departureFrequency: {
      es: 'Disponibilidad inmediata 24 horas al salir de aduana',
      en: 'Immediate 24/7 curb availability right outside customs'
    },
    phone: '+506 2221-6865',
    description: {
      es: 'Única flotilla de taxis legalmente autorizada para recoger pasajeros dentro de la terminal aérea. Vehículos tipo sedán y microbuses con seguro de viajero y cobro con tarjeta o efectivo.',
      en: 'The only taxi fleet legally authorized for curbside pickup directly inside the airport grounds. Includes sedans and minivans with card payment.'
    },
    tips: {
      es: 'No aceptes ofertas de personas que te aborden dentro de la terminal; compra tu tiquete en el mostrador oficial rotulado en la salida.',
      en: 'Bypass unofficial freelance drivers inside customs; book at the official Orange Taxi desk right at the exit doors.'
    },
    canBeBooked: true
  },
  {
    id: 'shuttle-la-fortuna-hub',
    type: 'taxi_stand',
    name: {
      es: 'Hub Central de Shuttles Turísticos La Fortuna',
      en: 'La Fortuna Intercity Tourist Shuttle Hub'
    },
    subtitle: {
      es: 'Servicios diarios puerta a puerta entre hoteles en vans modernas con aire acondicionado',
      en: 'Daily shared & private door-to-door hotel transfers in AC vans'
    },
    region: 'arenal',
    coordinates: { lat: 10.4716, lng: -84.6452 },
    address: {
      es: 'Parque Central de La Fortuna, San Carlos',
      en: 'Central Park area, La Fortuna, San Carlos'
    },
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=80',
    transportCompany: 'Interbus Costa Rica & RideCR Network',
    routesServed: {
      es: ['La Fortuna ➡️ Monteverde (Van-Boat-Van por el Lago Arenal): 8:00 AM & 2:00 PM ($35 USD / 3 hrs)', 'La Fortuna ➡️ Manuel Antonio: 7:30 AM & 1:30 PM ($59 USD / 4.5 hrs)', 'La Fortuna ➡️ San José / Aeropuerto SJO: 8:00 AM & 1:00 PM ($54 USD / 3.5 hrs)', 'La Fortuna ➡️ Tamarindo / Liberia: 8:00 AM ($57 USD / 4 hrs)'],
      en: ['La Fortuna ➡️ Monteverde (Van-Boat-Van across Lake Arenal): 8 AM & 2 PM ($35 USD / 3 hrs)', 'La Fortuna ➡️ Manuel Antonio: 7:30 AM & 1:30 PM ($59 USD / 4.5 hrs)', 'La Fortuna ➡️ SJO Airport: 8 AM & 1 PM ($54 USD / 3.5 hrs)', 'La Fortuna ➡️ Tamarindo / LIR: 8 AM ($57 USD / 4 hrs)']
    },
    averageTicketUSD: 49,
    averageTicketCRC: 25480,
    departureFrequency: {
      es: 'Salidas fijas 2 veces al día (Mañana y Tarde)',
      en: 'Scheduled twice-daily departures (Morning & Afternoon)'
    },
    phone: '+506 2283-5573',
    description: {
      es: 'La forma más cómoda y recomendada para turistas. Te recogen directamente en la recepción de tu hotel y te llevan al siguiente destino con paradas de descanso en miradores y WiFi a bordo.',
      en: 'The most stress-free travel method for visitors. Pickups right at your hotel lobby with scenic stops and luggage handling.'
    },
    tips: {
      es: 'La conexión hacia Monteverde vía "Van-Bote-Van" cruzando el Lago Arenal es una de las rutas más hermosas del país.',
      en: 'The "Van-Boat-Van" route to Monteverde cuts travel time in half while offering spectacular volcano views from the water.'
    },
    canBeBooked: true
  },

  // ==========================================
  // ✈️ AEROPUERTOS INTERNACIONALES (AVIONES)
  // ==========================================
  {
    id: 'airport-sjo',
    type: 'airport',
    name: {
      es: 'Aeropuerto Internacional Juan Santamaría (SJO)',
      en: 'Juan Santamaría International Airport (SJO)'
    },
    subtitle: {
      es: 'Principal terminal aérea internacional del país ubicada en Alajuela / San José',
      en: 'Costa Rica’s main international gateway in Alajuela / San José'
    },
    region: 'san_jose',
    coordinates: { lat: 9.9937, lng: -84.2088 },
    address: {
      es: 'Ruta 1, Alajuela (a 18 km al oeste de San José)',
      en: 'Route 1, Alajuela (18 km west of downtown San José)'
    },
    image: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=1000&q=80',
    flightCode: 'SJO / MROC',
    transportCompany: 'AERIS Holding Costa Rica (30+ aerolíneas internacionales)',
    routesServed: {
      es: ['Conexiones directas a Miami, Houston, Madrid, París, Zúrich, Ciudad de Panamá, Los Ángeles, etc.', 'Terminal Doméstica Local contigua para vuelos Sansa / Green Airways'],
      en: ['Direct routes to Miami, Houston, Madrid, Paris, Zurich, Panama, Los Angeles, etc.', 'Adjacent Domestic Terminal for Sansa & Green Airways local flights']
    },
    description: {
      es: 'Galardonado como uno de los mejores aeropuertos regionales de Centroamérica. Dispone de salones VIP, tiendas de café costarricense gourmet, aduanas modernas y terminal doméstica dedicada.',
      en: 'Award-winning international airport featuring VIP lounges, Costa Rican artisan coffee boutiques, fast biometric customs, and a dedicated domestic flight concourse.'
    },
    tips: {
      es: 'Llega con 3 horas de anticipación para vuelos internacionales y 1 hora para vuelos domésticos.',
      en: 'Arrive 3 hours before international departures and 1 hour before domestic flights.'
    },
    canBeBooked: true
  },
  {
    id: 'airport-lir',
    type: 'airport',
    name: {
      es: 'Aeropuerto Internacional Daniel Oduber Quirós (LIR)',
      en: 'Guanacaste Airport / Daniel Oduber (LIR)'
    },
    subtitle: {
      es: 'Puerta de entrada directa a las playas de Guanacaste, Papagayo y Tamarindo',
      en: 'Direct gateway to Guanacaste beaches, Gulf of Papagayo & Tamarindo'
    },
    region: 'guanacaste',
    coordinates: { lat: 10.5933, lng: -85.5444 },
    address: {
      es: 'Carretera a Comunidad, Liberia, Guanacaste',
      en: 'Comunidad Road, Liberia, Guanacaste'
    },
    image: 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=1000&q=80',
    flightCode: 'LIR / MRLB',
    transportCompany: 'VINCI Airports Guanacaste',
    routesServed: {
      es: ['Vuelos directos desde Atlanta, Dallas, Toronto, Denver, Nueva York, Charlotte, Montreal', 'Conexión terrestre a Playas del Coco (25 min), Tamarindo (1h), Península Papagayo (35 min)'],
      en: ['Direct arrivals from Atlanta, Dallas, Toronto, Denver, New York, Montreal', 'Highway transfer to Papagayo (35 min), Tamarindo (1 hr), Coco Beach (25 min)']
    },
    description: {
      es: 'Terminal ecológica moderna que te deja a menos de una hora de las mejores playas de surf y resorts de lujo del Pacífico Norte costarricense.',
      en: 'Modern eco-certified gateway positioned less than an hour from world-class Pacific surf breaks and all-inclusive coastal resorts.'
    },
    tips: {
      es: 'La mejor opción si tu viaje se concentra en volcanes de Guanacaste y la costa del Pacífico.',
      en: 'The optimal choice if your vacation is centered around Guanacaste beaches, surfing, and dry forest volcanos.'
    },
    canBeBooked: true
  },

  // ==========================================
  // 🛩️ AERÓDROMOS LOCALES Y VUELOS EN AVIONETA
  // ==========================================
  {
    id: 'airstrip-la-fortuna',
    type: 'airstrip',
    name: {
      es: 'Aeródromo La Fortuna / Arenal (FON)',
      en: 'La Fortuna / Arenal Airstrip (FON)'
    },
    subtitle: {
      es: 'Vuelos domésticos en avioneta: San José a La Fortuna en solo 25 minutos',
      en: 'Domestic flight hop: SJO to Arenal Volcano in just 25 minutes'
    },
    region: 'arenal',
    coordinates: { lat: 10.4439, lng: -84.5828 },
    address: {
      es: 'El Tanque, a 8 km al este de La Fortuna centro',
      en: 'El Tanque, 8 km east of downtown La Fortuna'
    },
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1000&q=80',
    flightCode: 'FON / MRAN',
    flightTimeFromSJO: '25 minutos (vs 3.5 horas por tierra)',
    transportCompany: 'SANSA Regional & Costa Rica Green Airways (Cessna Caravan 208B EX)',
    averageTicketUSD: 110,
    averageTicketCRC: 57200,
    departureFrequency: {
      es: '2 a 3 vuelos diarios directos desde el Aeropuerto SJO',
      en: '2 to 3 scheduled daily flights direct from SJO'
    },
    runwayType: 'Asfalto 1,000m x 18m',
    description: {
      es: 'Pista de aterrizaje con sobrevuelo panorámico espectacular del cráter del Volcán Arenal y la cordillera volcánica. Ahorra 3 horas de curvas por carretera.',
      en: 'Scenic airstrip offering breathtaking aerial flybys of Arenal Volcano cone and highland ridges, slashing a 3.5-hour mountain drive to 25 minutes.'
    },
    tips: {
      es: 'El límite de equipaje estándar en vuelos domésticos es de 14 kg (30 lbs); puedes pagar sobrepeso si viajas con maletas grandes.',
      en: 'Standard luggage allowance on regional flights is 14 kg (30 lbs) per traveler; extra baggage can be purchased in advance.'
    },
    canBeBooked: true
  },
  {
    id: 'airstrip-quepos-manuel-antonio',
    type: 'airstrip',
    name: {
      es: 'Aeródromo Quepos / Manuel Antonio (XQP)',
      en: 'Quepos / Manuel Antonio Airstrip (XQP)'
    },
    subtitle: {
      es: 'Vuelo panorámico sobre el litoral pacífico: 20 minutos desde San José',
      en: 'Coastal flyover route: 20 minutes from San José to Manuel Antonio'
    },
    region: 'manuel_antonio',
    coordinates: { lat: 9.4431, lng: -84.1297 },
    address: {
      es: 'La Inmaculada, a 5 km de Quepos centro y 12 km de Manuel Antonio',
      en: 'La Inmaculada, 5 km from downtown Quepos, 12 km to park'
    },
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1000&q=80',
    flightCode: 'XQP / MRQP',
    flightTimeFromSJO: '20 minutos (vs 3.5 horas por carretera)',
    transportCompany: 'SANSA & Green Airways',
    averageTicketUSD: 98,
    averageTicketCRC: 50960,
    departureFrequency: {
      es: '4 a 6 vuelos diarios desde SJO en temporada alta',
      en: '4 to 6 daily flights from SJO during peak travel season'
    },
    runwayType: 'Asfalto 1,100m con torre de radio',
    description: {
      es: 'La puerta de entrada más rápida al Parque Nacional Manuel Antonio. Al aterrizar, tienes taxis oficiales y alquiler de autos listos en la terminal para llevarte a la playa.',
      en: 'The quickest gateway to Manuel Antonio National Park. Curbside taxis and car rentals greet passengers upon touchdown.'
    },
    tips: {
      es: 'Pide asiento en ventanilla del lado derecho en el vuelo de ida para ver la línea costera del Pacífico.',
      en: 'Request a right-side window seat on flights heading south from SJO for stunning Pacific coastal vistas.'
    },
    canBeBooked: true
  },
  {
    id: 'airstrip-puerto-jimenez',
    type: 'airstrip',
    name: {
      es: 'Aeródromo Puerto Jiménez / Corcovado (PJM)',
      en: 'Puerto Jiménez / Corcovado Airstrip (PJM)'
    },
    subtitle: {
      es: 'Acceso exprés al Golfo Dulce y Parque Nacional Corcovado en 45 minutos',
      en: 'Express hop to Golfo Dulce & Corcovado National Park in 45 mins'
    },
    region: 'osa',
    coordinates: { lat: 8.5358, lng: -83.3047 },
    address: {
      es: 'Puerto Jiménez, Península de Osa, Golfo Dulce',
      en: 'Puerto Jimenez, Osa Peninsula, Golfo Dulce'
    },
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1000&q=80',
    flightCode: 'PJM / MRPJ',
    flightTimeFromSJO: '45 minutos (vs 7.5 a 8 horas por tierra)',
    transportCompany: 'SANSA & Vuelos Charter Privados',
    averageTicketUSD: 145,
    averageTicketCRC: 75400,
    departureFrequency: {
      es: '3 vuelos diarios programados',
      en: '3 scheduled daily flights'
    },
    runwayType: 'Asfalto 825m',
    description: {
      es: 'El salvavidas logístico para viajar a la Península de Osa. Convierte una extenuante travesía terrestre de 8 horas en un placentero vuelo de 45 minutos sobrevolando islas y ballenas en el Golfo Dulce.',
      en: 'A logistics gamechanger for Osa Peninsula explorers. Replaces an exhausting 8-hour drive with a smooth 45-minute flight across mountains and Golfo Dulce.'
    },
    tips: {
      es: 'Desde la pista puedes caminar o tomar un taxi en 3 minutos hasta los botes y restaurantes locales.',
      en: 'The runway is located 3 minutes from the local pier connecting to wildlife boats and eco-lodges.'
    },
    canBeBooked: true
  },
  {
    id: 'airstrip-tortuguero',
    type: 'airstrip',
    name: {
      es: 'Aeródromo Tortuguero (TTQ)',
      en: 'Tortuguero Airstrip (TTQ)'
    },
    subtitle: {
      es: 'Sobrevuelo de selva y canales: 35 minutos desde la capital',
      en: 'Aerial rainforest flight: 35 minutes from San José directly to the canals'
    },
    region: 'tortuguero',
    coordinates: { lat: 10.5694, lng: -83.5186 },
    address: {
      es: 'Franja costera de Tortuguero, acceso directo a lanchas',
      en: 'Tortuguero coastal spit, immediate water taxi dock'
    },
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1000&q=80',
    flightCode: 'TTQ / MRBT',
    flightTimeFromSJO: '35 minutos (vs 5 horas en combinación bus+lancha)',
    transportCompany: 'SANSA & Aerolíneas Charter',
    averageTicketUSD: 125,
    averageTicketCRC: 65000,
    departureFrequency: {
      es: 'Vuelos matutinos diarios (6:00 AM y 10:30 AM)',
      en: 'Daily morning departures (6:00 AM & 10:30 AM)'
    },
    runwayType: 'Asfalto 950m entre el mar y el canal',
    description: {
      es: 'Aterrizar aquí es inolvidable: la pista de asfalto se ubica en una estrecha franja de selva rodeada por el mar Caribe a la derecha y los canales a la izquierda. Al bajar, tu lancha del hotel te espera en el muelle.',
      en: 'An unforgettable landing: the strip sits on a narrow jungle sandbar bordered by the Caribbean on one side and river canals on the other, where your lodge boat awaits.'
    },
    tips: {
      es: 'Ideal para quienes tienen pocos días en Costa Rica y quieren ver Tortuguero sin pasar medio día viajando.',
      en: 'Ideal for travelers on tight schedules seeking to experience Tortuguero without spending a full travel day.'
    },
    canBeBooked: true
  },
  {
    id: 'airstrip-tamarindo',
    type: 'airstrip',
    name: {
      es: 'Aeródromo Tamarindo (TNO)',
      en: 'Tamarindo Surf Airstrip (TNO)'
    },
    subtitle: {
      es: 'Aterriza directamente junto a las olas y vida nocturna de Tamarindo',
      en: 'Land right next to Tamarindo’s world-class surf breaks & dining'
    },
    region: 'guanacaste',
    coordinates: { lat: 10.3150, lng: -85.8136 },
    address: {
      es: 'Villarreal, a 3 km de Playa Tamarindo, Guanacaste',
      en: 'Villarreal, 3 km from Tamarindo Beach, Guanacaste'
    },
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1000&q=80',
    flightCode: 'TNO / MRTM',
    flightTimeFromSJO: '40 minutos (vs 4.5 horas de manejo)',
    transportCompany: 'SANSA Regional',
    averageTicketUSD: 115,
    averageTicketCRC: 59800,
    departureFrequency: {
      es: '2 a 4 vuelos diarios directos',
      en: '2 to 4 scheduled daily flights'
    },
    runwayType: 'Asfalto 800m',
    description: {
      es: 'Te deja a solo 5 minutos en taxi de la playa y las escuelas de surf de Tamarindo, Langosta y Playa Grande.',
      en: 'Positions you a mere 5-minute taxi hop from Tamarindo Bay surf breaks, Langosta, and Playa Grande.'
    },
    tips: {
      es: 'Sansa permite transportar tablas de surf en el compartimento de carga bajo reserva previa.',
      en: 'Surfboards can be transported on regional aircraft with advance luggage registration.'
    },
    canBeBooked: true
  }
];

// Helper to calculate approximate distance in KM between two coordinates
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Helper to calculate estimated travel times
export function estimateTravelTime(distanceKm: number): {
  driveHours: string;
  busHours: string;
  flightMins?: string;
} {
  // In Costa Rica, average mountain/coastal driving speed is around 45-55 km/h
  const driveTimeHours = (distanceKm / 48).toFixed(1);
  const busTimeHours = (distanceKm / 35 + 0.5).toFixed(1); // includes stops
  const flightMins = distanceKm > 60 ? Math.round(distanceKm * 0.25 + 10) : undefined;

  return {
    driveHours: `${driveTimeHours} h`,
    busHours: `${busTimeHours} h`,
    flightMins: flightMins ? `${flightMins} min` : undefined
  };
}
