import { RegionInfo } from '../types';

export const REGIONS_DATA: RegionInfo[] = [
  {
    id: 'arenal',
    name: 'La Fortuna / Volcán Arenal',
    tagline: {
      es: 'Volcán activo, aguas termales curativas, cataratas y puentes en la selva',
      en: 'Active volcano, healing hot springs, majestic waterfalls & rainforest bridges'
    },
    image: '/images/arenal_volcano_tour_1785203794047.jpg',
    coordinates: { x: 42, y: 35 } // percentage on map
  },
  {
    id: 'monteverde',
    name: 'Monteverde (Bosque Nuboso)',
    tagline: {
      es: 'La cuna del ecoturismo, tirolesas legendarias, orquídeas y el mítico Quetzal',
      en: 'Ecotourism haven, legendary canopy ziplines, cloud forest & Resplendent Quetzal'
    },
    image: '/images/monteverde_cloud_forest_1785203813611.jpg',
    coordinates: { x: 32, y: 42 }
  },
  {
    id: 'manuel_antonio',
    name: 'Manuel Antonio / Quepos',
    tagline: {
      es: 'Donde la selva tropical se abraza con el Océano Pacífico y playas de ensueño',
      en: 'Where tropical rainforest meets white sand Pacific beaches & wildlife'
    },
    image: '/images/manuel_antonio_beach_1785203803239.jpg',
    coordinates: { x: 48, y: 68 }
  },
  {
    id: 'guanacaste',
    name: 'Guanacaste & Tamarindo',
    tagline: {
      es: 'Costa de Oro, playas doradas, surf de clase mundial y cruceros al atardecer',
      en: 'Gold Coast, sunny beaches, world-class surf breaks & luxury catamarans'
    },
    image: '/images/manuel_antonio_beach_1785203803239.jpg',
    coordinates: { x: 18, y: 28 }
  },
  {
    id: 'pacuare',
    name: 'Río Pacuare & Turrialba',
    tagline: {
      es: 'Rápidos de nivel mundial en un cañón vírgenes con cascadas de cuento',
      en: 'World-class whitewater rafting down a pristine jungle gorge'
    },
    image: '/images/pacuare_rafting_adventure_1785203824345.jpg',
    coordinates: { x: 62, y: 52 }
  },
  {
    id: 'tortuguero',
    name: 'Tortuguero (Caribe Norte)',
    tagline: {
      es: 'El Amazonas tico: canales naturales, manglares y desove de tortugas marinas',
      en: 'Costa Rica\'s Amazon: labyrinth of jungle canals & sea turtle nesting'
    },
    image: '/images/costa_rica_hero_1785203783748.jpg',
    coordinates: { x: 68, y: 28 }
  },
  {
    id: 'san_jose',
    name: 'San José & Valle Central',
    tagline: {
      es: 'Museos de oro, cultura, fincas de café gourmet y el volcán Poás',
      en: 'Gold museums, culture, gourmet coffee estates & Poas Volcano crater'
    },
    image: '/images/arenal_volcano_tour_1785203794047.jpg',
    coordinates: { x: 48, y: 48 }
  },
  {
    id: 'osa',
    name: 'Península de Osa & Corcovado',
    tagline: {
      es: 'La experiencia salvaje más intensa del planeta según National Geographic',
      en: 'Earth\'s most intense biological sanctuary with wild sloths & tapirs'
    },
    image: '/images/costa_rica_hero_1785203783748.jpg',
    coordinates: { x: 72, y: 88 }
  }
];
