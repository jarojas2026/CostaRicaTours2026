/**
 * The city is a navigation model, NOT a geographic map or verified service
 * directory. Every destination is an existing route in this repository.
 */
export type CityDistrictId = 'nature' | 'territory' | 'community' | 'mobility' | 'planning' | 'assistance';
export type CityDistrict = {
  id: CityDistrictId;
  number: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  href: string;
  icon: 'compass' | 'map' | 'users' | 'plane' | 'route' | 'bot';
  labelEs: string;
  labelEn: string;
};
export const CITY_DISTRICTS: readonly CityDistrict[] = [
  {
    id: 'nature', number: '01', titleEs: 'Distrito de experiencias', titleEn: 'Experiences district',
    descriptionEs: 'Tours y actividades existentes, con disponibilidad por verificar antes de reservar.',
    descriptionEn: 'Existing tours and activities; availability must be checked before booking.',
    href: '/tours', icon: 'compass', labelEs: 'Explorar catálogo', labelEn: 'Explore catalog'
  },
  {
    id: 'territory', number: '02', titleEs: 'Territorio y destinos', titleEn: 'Territory and destinations',
    descriptionEs: 'Mapa turístico para orientarse entre regiones, destinos y puntos de interés.',
    descriptionEn: 'Travel map for exploring regions, destinations and points of interest.',
    href: '/map', icon: 'map', labelEs: 'Abrir mapa', labelEn: 'Open map'
  },
  {
    id: 'community', number: '03', titleEs: 'Barrio de la comunidad', titleEn: 'Community district',
    descriptionEs: 'Personas, comunidades y microempresas pueden solicitar participar; no se publican automáticamente.',
    descriptionEn: 'People, communities and small businesses can apply; listings are not published automatically.',
    href: '/participar', icon: 'users', labelEs: 'Solicitar participación', labelEn: 'Apply to join'
  },
  {
    id: 'mobility', number: '04', titleEs: 'Conexiones y movilidad', titleEn: 'Mobility and connections',
    descriptionEs: 'Acceso al buscador de vuelos disponible; los precios y rutas deben comprobarse.',
    descriptionEn: 'Access the existing flight search; fares and routes require verification.',
    href: '/flights', icon: 'plane', labelEs: 'Buscar vuelos', labelEn: 'Find flights'
  },
  {
    id: 'planning', number: '05', titleEs: 'Estudio de itinerarios', titleEn: 'Itinerary studio',
    descriptionEs: 'Diseña propuestas de viaje, sujetas a condiciones y reservas verificadas.',
    descriptionEn: 'Build travel proposals, subject to real operating conditions and verified bookings.',
    href: '/itinerary', icon: 'route', labelEs: 'Diseñar mi ruta', labelEn: 'Plan my route'
  },
  {
    id: 'assistance', number: '06', titleEs: 'Centro de asistencia IA', titleEn: 'AI assistance center',
    descriptionEs: 'Orientación conversacional para investigar y decidir el siguiente paso.',
    descriptionEn: 'Conversational assistance for research and planning your next step.',
    href: '/ai', icon: 'bot', labelEs: 'Hablar con la IA', labelEn: 'Talk to AI'
  }
] as const;

export const CITY_ACTIVE_ROUTE_PATHS = [
  '/tours', '/map', '/participar', '/flights', '/itinerary', '/ai'
] as const;
