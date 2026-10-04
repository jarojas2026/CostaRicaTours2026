import { TourRegion } from '../types';

/** Region-level inspiration based on ICT sources; these are not supplier offers or live inventory. */
export interface RegionalExperienceGuide {
  id: string;
  regionId: TourRegion;
  name: { es: string; en: string };
  description: { es: string; en: string };
  activities: { es: string[]; en: string[] };
  officialGuideUrl: string;
}

export const REGIONAL_EXPERIENCE_GUIDES: RegionalExperienceGuide[] = [
  {
    id: 'central-pacific',
    regionId: 'central_pacific',
    name: { es: 'Pacífico Central · Carara y Tárcoles', en: 'Central Pacific · Carara & Tárcoles' },
    description: { es: 'Bosque de transición, aves, esteros y costa; combina naturaleza y mar sin prometer avistamientos.', en: 'Transitional forest, birdlife, estuaries and coast—nature and ocean without promising wildlife sightings.' },
    activities: { es: ['Senderos accesibles en Carara', 'Manglar en bote o kayak', 'Safari fluvial en Tárcoles'], en: ['Accessible trails at Carara', 'Mangrove by boat or kayak', 'Tárcoles river safari'] },
    officialGuideUrl: 'https://www.visitcostarica.com/where-to-go/central-pacific'
  },
  {
    id: 'south-pacific',
    regionId: 'osa',
    name: { es: 'Pacífico Sur · Osa y Golfo Dulce', en: 'South Pacific · Osa & Golfo Dulce' },
    description: { es: 'Selva, costa y áreas protegidas; Corcovado requiere planificar accesos y reserva con antelación.', en: 'Rainforest, coast and protected areas; Corcovado access requires advance planning and reservation.' },
    activities: { es: ['Senderismo y naturaleza', 'Manglares y navegación', 'Mar y pesca deportiva'], en: ['Hiking and nature', 'Mangroves and boating', 'Ocean and sport fishing'] },
    officialGuideUrl: 'https://www.visitcostarica.com/where-to-go/south-pacific'
  },
  {
    id: 'sarapiqui',
    regionId: 'sarapiqui',
    name: { es: 'Sarapiquí · ríos y bosque lluvioso', en: 'Sarapiquí · Rivers & Rainforest' },
    description: { es: 'Destino del Caribe norte con experiencias de río, naturaleza, aventura y turismo rural.', en: 'Northern Caribbean destination for river, nature, adventure and rural experiences.' },
    activities: { es: ['Paseos en bote', 'Aves y vida silvestre', 'Canopy y turismo rural'], en: ['Boat trips', 'Birding and wildlife', 'Canopy and rural tourism'] },
    officialGuideUrl: 'https://www.visitcostarica.com/where-to-go/northern-plains/tourist-attractions-in-northern-plains'
  },
  {
    id: 'los-santos',
    regionId: 'los_santos',
    name: { es: 'Los Santos · Dota y San Gerardo', en: 'Los Santos · Dota & San Gerardo' },
    description: { es: 'Montaña, comunidades rurales, senderos y observación de aves; la fauna nunca está garantizada.', en: 'Mountain scenery, rural communities, trails and birding; wildlife is never guaranteed.' },
    activities: { es: ['Observación de aves', 'Caminatas de montaña', 'Turismo rural y café'], en: ['Birdwatching', 'Mountain hikes', 'Rural and coffee experiences'] },
    officialGuideUrl: 'https://www.visitcostarica.com/sites/default/files/2024-10/LOS%20SANTOS%20INGLES.pdf'
  },
  {
    id: 'south-caribbean',
    regionId: 'caribe',
    name: { es: 'Caribe Sur · Cahuita y Puerto Viejo', en: 'South Caribbean · Cahuita & Puerto Viejo' },
    description: { es: 'Playas, cultura afrocaribeña, gastronomía y áreas naturales; el estado del mar condiciona algunas actividades.', en: 'Beaches, Afro-Caribbean culture, food and nature; sea conditions affect some activities.' },
    activities: { es: ['Caminatas costeras', 'Snorkel sujeto a condiciones', 'Cultura y cocina local'], en: ['Coastal walks', 'Snorkeling subject to conditions', 'Local culture and food'] },
    officialGuideUrl: 'https://www.visitcostarica.com/where-to-go/caribbean'
  },
  {
    id: 'guanacaste',
    regionId: 'guanacaste',
    name: { es: 'Guanacaste · volcanes y litoral', en: 'Guanacaste · Volcanoes & Coast' },
    description: { es: 'Una región extensa con playas, áreas protegidas y actividades terrestres y marinas muy distintas entre sí.', en: 'A large region with beaches, protected areas and varied land and marine activities.' },
    activities: { es: ['Playas y surf', 'Senderos y volcanes', 'Navegación y pesca'], en: ['Beaches and surfing', 'Trails and volcanoes', 'Boating and fishing'] },
    officialGuideUrl: 'https://www.visitcostarica.com/where-to-go/guanacaste'
  }
];
