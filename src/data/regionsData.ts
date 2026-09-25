import { RegionInfo } from '../types';

export const REGIONS_DATA: RegionInfo[] = [
  {
    id: 'arenal',
    name: { es: 'La Fortuna / Volcán Arenal', en: 'La Fortuna / Arenal Volcano' },
    tagline: {
      es: 'Volcán activo, aguas termales curativas, cataratas y puentes en la selva',
      en: 'Active volcano, healing hot springs, majestic waterfalls & rainforest bridges'
    },
    description: {
      es: 'El destino más popular de Costa Rica, hogar del majestuoso Volcán Arenal.',
      en: 'Costa Rica\'s most popular destination, home to the majestic Arenal Volcano.'
    },
    image: 'https://images.unsplash.com/photo-1651261932254-fd342bc4d999?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 42, y: 35 } // percentage on map
  },
  {
    id: 'monteverde',
    name: { es: 'Monteverde (Bosque Nuboso)', en: 'Monteverde (Cloud Forest)' },
    tagline: {
      es: 'La cuna del ecoturismo, tirolesas legendarias, orquídeas y el mítico Quetzal',
      en: 'Ecotourism haven, legendary canopy ziplines, cloud forest & Resplendent Quetzal'
    },
    description: {
      es: 'Un santuario de biodiversidad envuelto en niebla y aventura.',
      en: 'A biodiversity sanctuary wrapped in mist and adventure.'
    },
    image: 'https://images.unsplash.com/photo-1683414903327-f5a2fcb37020?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 32, y: 42 }
  },
  {
    id: 'manuel_antonio',
    name: { es: 'Manuel Antonio / Quepos', en: 'Manuel Antonio / Quepos' },
    tagline: {
      es: 'Donde la selva tropical se abraza con el Océano Pacífico y playas de ensueño',
      en: 'Where tropical rainforest meets white sand Pacific beaches & wildlife'
    },
    description: {
      es: 'El parque nacional más visitado, famoso por sus playas blancas y vida silvestre.',
      en: 'The most visited national park, famous for its white beaches and wildlife.'
    },
    image: 'https://images.unsplash.com/photo-1509392671875-6ad9dd6ccf9d?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 48, y: 68 }
  },
  {
    id: 'guanacaste',
    name: { es: 'Guanacaste & Tamarindo', en: 'Guanacaste & Tamarindo' },
    tagline: {
      es: 'Costa de Oro, playas doradas, surf de clase mundial y cruceros al atardecer',
      en: 'Gold Coast, sunny beaches, world-class surf breaks & luxury catamarans'
    },
    description: {
      es: 'Famoso por su clima soleado, playas hermosas y cultura sabanera.',
      en: 'Famous for its sunny weather, beautiful beaches, and sabanero culture.'
    },
    image: 'https://images.unsplash.com/photo-1770848891773-9d866a56dd3d?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 18, y: 28 }
  },
  {
    id: 'pacuare',
    name: { es: 'Río Pacuare & Turrialba', en: 'Pacuare River & Turrialba' },
    tagline: {
      es: 'Rápidos de nivel mundial en un cañón vírgenes con cascadas de cuento',
      en: 'World-class whitewater rafting down a pristine jungle gorge'
    },
    description: {
      es: 'Uno de los ríos más bellos del mundo para el rafting de aguas blancas.',
      en: 'One of the most beautiful rivers in the world for white water rafting.'
    },
    image: 'https://images.unsplash.com/photo-1712933342478-51b92117ca80?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 62, y: 52 }
  },
  {
    id: 'tortuguero',
    name: { es: 'Tortuguero (Caribe Norte)', en: 'Tortuguero (North Caribbean)' },
    tagline: {
      es: 'El Amazonas tico: canales naturales, manglares y desove de tortugas marinas',
      en: 'Costa Rica\'s Amazon: labyrinth of jungle canals & sea turtle nesting'
    },
    description: {
      es: 'Accesible solo por bote o avión, es el lugar principal de anidación de tortugas.',
      en: 'Accessible only by boat or plane, it is the main nesting site for turtles.'
    },
    image: 'https://images.unsplash.com/photo-1616563838466-520a4d28466e?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 68, y: 28 }
  },
  {
    id: 'san_jose',
    name: { es: 'San José & Valle Central', en: 'San Jose & Central Valley' },
    tagline: {
      es: 'Museos de oro, cultura, fincas de café gourmet y el volcán Poás',
      en: 'Gold museums, culture, gourmet coffee estates & Poas Volcano crater'
    },
    description: {
      es: 'La capital vibrante rodeada de montañas y plantaciones de café.',
      en: 'The vibrant capital surrounded by mountains and coffee plantations.'
    },
    image: 'https://images.unsplash.com/photo-1666606654560-3de1e3c59d32?auto=format&fit=crop&w=1200&q=85',
    coordinates: { x: 48, y: 48 }
  },
  {
    id: 'osa',
    name: { es: 'Península de Osa & Corcovado', en: 'Osa Peninsula & Corcovado' },
    tagline: {
      es: 'La experiencia salvaje más intensa del planeta según National Geographic',
      en: 'Earth\'s most intense biological sanctuary with wild sloths & tapirs'
    },
    description: {
      es: 'El lugar biológicamente más intenso del mundo según National Geographic.',
      en: 'The most biologically intense place on Earth according to National Geographic.'
    },
    image: 'https://images.unsplash.com/photo-1685550903259-96799741df9e?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 72, y: 88 }
  }
];
