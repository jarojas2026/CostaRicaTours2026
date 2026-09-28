import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_ORIGIN = 'https://costaricatours2026.vercel.app';

const ROUTE_METADATA: Array<{
  match: (pathname: string) => boolean;
  title: string;
  description: string;
}> = [
  {
    match: pathname => pathname === '/',
    title: 'Tours Costa Rica | Experiencias, Naturaleza y Asistencia de Viaje',
    description: 'Descubre tours, naturaleza, playas y aventuras en Costa Rica. Planifica tu viaje, solicita disponibilidad y recibe asistencia durante el proceso de reserva.',
  },
  {
    match: pathname => pathname === '/tours',
    title: 'Tours en Costa Rica | Explora experiencias y solicita disponibilidad',
    description: 'Explora tours y experiencias en Costa Rica por región y actividad. Consulta detalles y solicita disponibilidad antes de reservar.',
  },
  {
    match: pathname => pathname.startsWith('/tours/'),
    title: 'Detalle del tour | Costa Rica Tours',
    description: 'Consulta información del tour, fecha, pasajeros, punto de encuentro y disponibilidad antes de enviar una solicitud de reserva.',
  },
  {
    match: pathname => pathname === '/trip',
    title: 'Mi viaje | Costa Rica Tours',
    description: 'Organiza tu viaje, revisa solicitudes y continúa la planificación de tus experiencias en Costa Rica.',
  },
  {
    match: pathname => pathname === '/ai',
    title: 'Asistente de viaje | Costa Rica Tours',
    description: 'Recibe asistencia para descubrir, comparar y planificar experiencias en Costa Rica con verificación cuando se requieren datos operativos.',
  },
  {
    match: pathname => pathname === '/destinations',
    title: 'Destinos de Costa Rica | Costa Rica Tours',
    description: 'Explora regiones y destinos de Costa Rica para construir una ruta de viaje coherente antes de seleccionar actividades.',
  },
  {
    match: pathname => pathname === '/activities',
    title: 'Actividades en Costa Rica | Costa Rica Tours',
    description: 'Explora naturaleza, aventura, playa, cultura y otras actividades disponibles en el catálogo de Costa Rica Tours.',
  },
  {
    match: pathname => pathname === '/map',
    title: 'Mapa de Costa Rica | Destinos y experiencias',
    description: 'Explora destinos y experiencias de Costa Rica en el mapa para entender distancias, regiones y opciones de viaje.',
  },
  {
    match: pathname => pathname === '/blog',
    title: 'Guía de viaje de Costa Rica | Costa Rica Tours',
    description: 'Información y contenidos para planificar viajes y experiencias en Costa Rica.',
  },
  {
    match: pathname => pathname === '/about',
    title: 'Acerca de Costa Rica Tours',
    description: 'Conoce la plataforma Costa Rica Tours y cómo ayuda a explorar, planificar y solicitar servicios turísticos en Costa Rica.',
  },
];

function upsertMeta(selector: string, attrs: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => element!.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(url: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

export function RouteMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = ROUTE_METADATA.find(item => item.match(pathname)) || ROUTE_METADATA[0];
    const canonicalUrl = `${SITE_ORIGIN}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;

    document.title = metadata.title;
    upsertMeta('meta[name="description"]', { name: 'description' }, metadata.description);
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, metadata.title);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, metadata.description);
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, metadata.title);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, metadata.description);
    upsertCanonical(canonicalUrl);
  }, [pathname]);

  return null;
}
