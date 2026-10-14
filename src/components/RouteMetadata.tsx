import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Language } from '../types';
import { LEGAL_PAGES, LEGAL_PAGE_ORDER } from '../data/legalPages';
import { findBlogPost } from '../data/blogPosts';

const SITE_ORIGIN = 'https://costaricatours2026.vercel.app';
const BRAND = 'Costa Rica Tours';

type Bi = { es: string; en: string };

export interface RouteMeta {
  title: Bi;
  description: Bi;
}

const STATIC_ROUTES: Record<string, RouteMeta> = {
  '/': {
    title: { es: 'Tours en Costa Rica | Experiencias y asistencia de viaje', en: 'Costa Rica Tours | Experiences and trip assistance' },
    description: {
      es: 'Descubre tours, naturaleza, playas y aventuras en Costa Rica. Cotiza por WhatsApp o con el asistente: confirmamos operador, precio y cupo antes de cualquier pago.',
      en: 'Discover tours, nature, beaches and adventures in Costa Rica. Request a quote on WhatsApp or with the assistant: we confirm operator, price and availability before any payment.',
    },
  },
  '/tours': {
    title: { es: 'Catálogo de tours en Costa Rica', en: 'Costa Rica tour catalog' },
    description: {
      es: 'Explora tours por región y actividad. Precios de referencia sujetos a confirmación de operador, fecha y cupo.',
      en: 'Browse tours by region and activity. Reference prices subject to confirmation of operator, date and availability.',
    },
  },
  '/destinations': {
    title: { es: 'Destinos de Costa Rica', en: 'Costa Rica destinations' },
    description: {
      es: 'Regiones y destinos de Costa Rica para armar una ruta coherente antes de elegir actividades.',
      en: 'Costa Rica regions and destinations to plan a coherent route before choosing activities.',
    },
  },
  '/activities': {
    title: { es: 'Actividades en Costa Rica', en: 'Activities in Costa Rica' },
    description: {
      es: 'Naturaleza, aventura, playa y cultura en el catálogo de Costa Rica Tours.',
      en: 'Nature, adventure, beach and culture in the Costa Rica Tours catalog.',
    },
  },
  '/map': {
    title: { es: 'Mapa interactivo de Costa Rica', en: 'Interactive map of Costa Rica' },
    description: {
      es: 'Mapa con tours, parques del SINAC, transporte y capas nacionales (salud CCSS, fauna, patrimonio). Verifica horarios y tarifas en fuentes oficiales.',
      en: 'Map with tours, SINAC parks, transport and national layers (CCSS health, wildlife, heritage). Check hours and fees with official sources.',
    },
  },
  '/ai': {
    title: { es: 'Asistente de viaje Sofía', en: 'Sofía travel assistant' },
    description: {
      es: 'Planifica con el asistente de IA y continúa por WhatsApp con un asesor. Las respuestas de IA se verifican antes de reservar.',
      en: 'Plan with the AI assistant and continue on WhatsApp with an advisor. AI answers are verified before booking.',
    },
  },
  '/blog': {
    title: { es: 'Guías de viaje de Costa Rica', en: 'Costa Rica travel guides' },
    description: {
      es: 'Guías con fuentes oficiales: destinos, temporada de ballenas y viaje sostenible en Costa Rica.',
      en: 'Guides based on official sources: destinations, whale season and sustainable travel in Costa Rica.',
    },
  },
  '/about': {
    title: { es: 'Acerca de Costa Rica Tours', en: 'About Costa Rica Tours' },
    description: {
      es: 'Quiénes somos y cómo trabajamos: consultas, verificación con operadores locales y confirmación antes de pagar.',
      en: 'Who we are and how we work: inquiries, checks with local operators and confirmation before payment.',
    },
  },
  '/trip': {
    title: { es: 'Mi viaje', en: 'My trip' },
    description: { es: 'Organiza tu viaje y tus solicitudes en Costa Rica.', en: 'Organize your Costa Rica trip and requests.' },
  },
  '/itinerary': {
    title: { es: 'Planificador de itinerario', en: 'Itinerary planner' },
    description: { es: 'Arma un borrador de itinerario por Costa Rica.', en: 'Build a draft itinerary for Costa Rica.' },
  },
  '/flights': {
    title: { es: 'Vuelos a Costa Rica', en: 'Flights to Costa Rica' },
    description: { es: 'Busca opciones de vuelo a San José (SJO) y Liberia (LIR).', en: 'Search flight options to San José (SJO) and Liberia (LIR).' },
  },
  '/culture': {
    title: { es: 'Cultura tica', en: 'Tico culture' },
    description: { es: 'Gastronomía, café, expresiones y tradiciones de Costa Rica.', en: 'Costa Rican food, coffee, slang and traditions.' },
  },
  '/tools': {
    title: { es: 'Transporte en Costa Rica', en: 'Transport in Costa Rica' },
    description: { es: 'Buses, trenes y traslados para moverte por Costa Rica.', en: 'Buses, trains and transfers to get around Costa Rica.' },
  },
  '/ciudad': {
    title: { es: 'Ciudad digital de Costa Rica', en: 'Costa Rica digital city' },
    description: {
      es: 'Plano de la ciudad digital de Costa Rica Tours. Las inscripciones requieren revisión.',
      en: 'Map of the Costa Rica Tours digital city. Registrations require review.',
    },
  },
  '/participar': {
    title: { es: 'Participar en la ciudad digital', en: 'Join the digital city' },
    description: {
      es: 'Solicitud privada para participar. Los perfiles no se publican sin revisión.',
      en: 'Private request to take part. Profiles are not published without review.',
    },
  },
};

for (const id of LEGAL_PAGE_ORDER) {
  const page = LEGAL_PAGES[id];
  STATIC_ROUTES[page.path] = { title: page.title, description: page.metaDescription };
}

/** Resolves title/description for a pathname (exported for tests). */
export function resolveRouteMeta(pathname: string, language: Language): { title: string; description: string } {
  const lang = language === 'es' ? 'es' : 'en';
  const clean = pathname !== '/' ? pathname.replace(/\/$/, '') : '/';
  let meta: RouteMeta | undefined = STATIC_ROUTES[clean];

  if (!meta && clean.startsWith('/blog/')) {
    const post = findBlogPost(clean.slice('/blog/'.length));
    if (post) meta = { title: post.title, description: post.metaDescription };
  }
  if (!meta && clean.startsWith('/tour/')) {
    meta = {
      title: { es: 'Detalle del tour', en: 'Tour details' },
      description: {
        es: 'Información del tour, punto de encuentro y precio de referencia. Operador, precio y cupo se confirman antes de pagar.',
        en: 'Tour information, meeting point and reference price. Operator, price and availability are confirmed before payment.',
      },
    };
  }
  const resolved = meta || STATIC_ROUTES['/'];
  const title = clean === '/' ? resolved.title[lang] : `${resolved.title[lang]} | ${BRAND}`;
  return { title, description: resolved.description[lang] };
}

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

/** Per-route, per-language document title + meta description. */
export function RouteMetadata({ language }: { language: Language }) {
  const { pathname } = useLocation();

  useEffect(() => {
    const { title, description } = resolveRouteMeta(pathname, language);
    const canonicalUrl = `${SITE_ORIGIN}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;

    document.title = title;
    document.documentElement.lang = language === 'es' ? 'es' : 'en';
    upsertMeta('meta[name="description"]', { name: 'description' }, description);
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, title);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
    upsertCanonical(canonicalUrl);
  }, [pathname, language]);

  return null;
}
