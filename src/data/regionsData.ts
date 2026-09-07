import { RegionInfo } from '../types';

export const REGIONS_DATA: RegionInfo[] = [
  {
    id: 'arenal',
    name: 'La Fortuna / Volcán Arenal',
    tagline: {
      es: 'Volcán activo, aguas termales curativas, cataratas y puentes en la selva',
      en: 'Active volcano, healing hot springs, majestic waterfalls & rainforest bridges'
    },
    image: 'https://images.unsplash.com/photo-1579294800821-694d95e86143?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 42, y: 35 } // percentage on map
  },
  {
    id: 'monteverde',
    name: 'Monteverde (Bosque Nuboso)',
    tagline: {
      es: 'La cuna del ecoturismo, tirolesas legendarias, orquídeas y el mítico Quetzal',
      en: 'Ecotourism haven, legendary canopy ziplines, cloud forest & Resplendent Quetzal'
    },
    image: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 32, y: 42 }
  },
  {
    id: 'manuel_antonio',
    name: 'Manuel Antonio / Quepos',
    tagline: {
      es: 'Donde la selva tropical se abraza con el Océano Pacífico y playas de ensueño',
      en: 'Where tropical rainforest meets white sand Pacific beaches & wildlife'
    },
    image: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 48, y: 68 }
  },
  {
    id: 'guanacaste',
    name: 'Guanacaste & Tamarindo',
    tagline: {
      es: 'Costa de Oro, playas doradas, surf de clase mundial y cruceros al atardecer',
      en: 'Gold Coast, sunny beaches, world-class surf breaks & luxury catamarans'
    },
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 18, y: 28 }
  },
  {
    id: 'pacuare',
    name: 'Río Pacuare & Turrialba',
    tagline: {
      es: 'Rápidos de nivel mundial en un cañón vírgenes con cascadas de cuento',
      en: 'World-class whitewater rafting down a pristine jungle gorge'
    },
    image: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 62, y: 52 }
  },
  {
    id: 'tortuguero',
    name: 'Tortuguero (Caribe Norte)',
    tagline: {
      es: 'El Amazonas tico: canales naturales, manglares y desove de tortugas marinas',
      en: 'Costa Rica\'s Amazon: labyrinth of jungle canals & sea turtle nesting'
    },
    image: 'https://images.unsplash.com/photo-1544979590-37e9b47eb705?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 68, y: 28 }
  },
  {
    id: 'san_jose',
    name: 'San José & Valle Central',
    tagline: {
      es: 'Museos de oro, cultura, fincas de café gourmet y el volcán Poás',
      en: 'Gold museums, culture, gourmet coffee estates & Poas Volcano crater'
    },
    image: 'https://images.unsplash.com/photo-1519046904884-53103b34b271?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 48, y: 48 }
  },
  {
    id: 'osa',
    name: 'Península de Osa & Corcovado',
    tagline: {
      es: 'La experiencia salvaje más intensa del planeta según National Geographic',
      en: 'Earth\'s most intense biological sanctuary with wild sloths & tapirs'
    },
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
    coordinates: { x: 72, y: 88 }
  }
];
