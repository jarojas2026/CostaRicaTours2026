/**
 * Fase C · Etapa 1 — herramientas de lectura del asistente IA:
 *  - get_product: ficha de un tour del catálogo por id/slug, SIN datos del operador
 *    (ni id, ni nombre, ni logo, ni fuente, ni contactos, ni puntos de recogida con nombre
 *    de negocio). Los textos pasan por la redacción de privacidad de proveedores.
 *  - get_policies: cancelación y términos tal como están publicados en las páginas
 *    legales (src/data/legalPages.ts). No inventa reembolsos ni plazos.
 *
 * Funciones puras de lectura: no escriben en Firestore, no cobran, no envían nada.
 */
import { TOURS } from '../src/data/toursData';
import type { Tour } from '../src/types';
import {
  LEGAL_DRAFT_NOTICE,
  LEGAL_LAST_UPDATED,
  LEGAL_PAGES,
  type LegalPageId,
} from '../src/data/legalPages';
import { redactProviderIdentityForCustomer } from './customerOutboundPrivacy';

type Lang = 'es' | 'en';
const langOf = (v: unknown): Lang => (v === 'en' ? 'en' : 'es');
const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

/** Campos del Tour que NUNCA salen hacia el modelo/cliente. */
export const PRODUCT_FORBIDDEN_FIELDS = [
  'operatorId', 'providerId', 'operatorName', 'operatorLogo', 'sourceUrl', 'pickupHotels', 'operatorIctVerified',
] as const;

export function findCatalogTour(idOrSlug: unknown): Tour | undefined {
  const key = norm(idOrSlug);
  if (!key) return undefined;
  return TOURS.find(t => norm(t.id) === key || norm(t.slug) === key);
}

/** Estado del precio: 'consulta_requerida' cuando no hay precio publicado o el tour es solo de consulta. */
export function priceStatusOf(tour: Tour): 'precio_de_referencia' | 'consulta_requerida' | 'tarifa_de_catalogo' {
  if (!(tour.priceUSD > 0)) return 'consulta_requerida';
  if (tour.priceSource === 'precio_referencia' || tour.catalogStatus === 'inquiry' || tour.catalogStatus === 'discovery') return 'precio_de_referencia';
  return 'tarifa_de_catalogo';
}

function clean(text: unknown, lang: Lang, providerNames: string[]): string {
  return redactProviderIdentityForCustomer(String(text ?? ''), { language: lang, providerNames });
}

function pick<T>(loc: { es?: T; en?: T } | undefined, lang: Lang): T | undefined {
  if (!loc) return undefined;
  return (lang === 'en' ? loc.en ?? loc.es : loc.es ?? loc.en) as T | undefined;
}

export function getProduct(input: { tourId?: unknown; language?: unknown }) {
  const lang = langOf(input.language);
  const tour = findCatalogTour(input.tourId);
  if (!tour) return { success: false as const, error: 'tour_not_found', hint: 'Usa search_operator_tours o search_tours para obtener un id válido.' };

  const providerNames = [tour.operatorName, tour.providerId, tour.operatorId].filter((n): n is string => typeof n === 'string' && n.length >= 3);
  const c = (t: unknown) => clean(t, lang, providerNames);
  const list = (loc: { es?: string[]; en?: string[] } | undefined) => (pick(loc, lang) || []).map(c).filter(Boolean).slice(0, 15);
  const status = priceStatusOf(tour);

  return {
    success: true as const,
    product: {
      id: tour.id,
      slug: tour.slug ?? null,
      title: c(pick(tour.title, lang)),
      subtitle: c(pick(tour.subtitle, lang)) || null,
      category: tour.category,
      region: tour.region,
      place: c(tour.location?.placeName) || null,
      priceUSD: tour.priceUSD > 0 ? tour.priceUSD : null,
      childPriceUSD: tour.childPriceUSD && tour.childPriceUSD > 0 ? tour.childPriceUSD : null,
      priceStatus: status,
      priceCheckedAt: tour.priceCheckedAt ?? null,
      durationHours: tour.durationHours || null,
      durationLabel: c(pick(tour.durationLabel, lang)) || null,
      difficulty: tour.difficulty,
      ageMinimum: tour.ageMinimum ?? null,
      maxGroupSize: tour.maxGroupSize ?? null,
      tourType: tour.tourType ?? null,
      catalogStatus: tour.catalogStatus ?? 'bookable',
      freeCancellation: tour.freeCancellation ?? null,
      description: c(pick(tour.description, lang)).slice(0, 1200),
      highlights: list(tour.highlights),
      inclusions: list(tour.inclusions),
      exclusions: list(tour.exclusions),
      whatToBring: list(tour.whatToBring),
      medicalRestrictions: list(tour.medicalRestrictions),
      departureTimes: (tour.departureTimes || []).slice(0, 8),
      itinerarySteps: (tour.itinerarySteps || []).slice(0, 12).map(s => ({
        time: s.time ?? null,
        title: c(pick(s.title, lang)),
        desc: c(pick(s.desc, lang)),
      })),
      isDemoData: tour.isDemoData === true,
    },
    rules: [
      status === 'consulta_requerida'
        ? (lang === 'en' ? 'No published price: offer a quote; never estimate a price.' : 'Sin precio publicado: ofrecer cotización; nunca estimar un precio.')
        : (lang === 'en' ? 'Reference price subject to confirmation; availability is confirmed before any payment.' : 'Precio de referencia sujeto a confirmación; la disponibilidad se confirma antes de cualquier pago.'),
      lang === 'en'
        ? 'Never name the local operator; it is shared in the booking confirmation.'
        : 'Nunca nombrar al operador local; se comparte en la confirmación de la reserva.',
    ],
  };
}

export const POLICY_TOPICS = ['cancellation', 'terms'] as const;
export type PolicyTopic = typeof POLICY_TOPICS[number] | 'all';

/**
 * Políticas publicadas. Solo texto de las páginas legales; se marca si son preliminares.
 * Si se pasa tourId, añade la bandera de cancelación gratuita del catálogo (sin ampliarla).
 */
export function getPolicies(input: { topic?: unknown; language?: unknown; tourId?: unknown }) {
  const lang = langOf(input.language);
  const topic = (POLICY_TOPICS as readonly string[]).includes(String(input.topic)) ? (input.topic as PolicyTopic) : 'all';
  const ids: LegalPageId[] = topic === 'all' ? ['cancellation', 'terms'] : [topic as LegalPageId];
  const pages = ids.map(id => {
    const page = LEGAL_PAGES[id];
    return {
      id,
      path: page.path,
      title: page.title[lang],
      intro: page.intro[lang],
      sections: page.sections
        // El bloque de contacto es para la web, no para el modelo.
        .filter(s => !/^(contacto|contact)$/i.test(s.heading.es))
        .map(s => ({ heading: s.heading[lang], text: s.paragraphs[lang].join(' ') })),
    };
  });
  const tour = input.tourId ? findCatalogTour(input.tourId) : undefined;
  return {
    success: true as const,
    lastUpdated: LEGAL_LAST_UPDATED[lang],
    preliminary: true,
    preliminaryNotice: LEGAL_DRAFT_NOTICE[lang],
    pages,
    tour: tour ? { id: tour.id, freeCancellationFlag: tour.freeCancellation ?? null } : null,
    guidance: lang === 'en'
      ? 'Quote only this published text. Do not promise refunds, deadlines or percentages beyond it; the confirmed operator policy is sent in writing before payment.'
      : 'Cita solo este texto publicado. No prometas reembolsos, plazos ni porcentajes fuera de él; la política del operador confirmado se envía por escrito antes del pago.',
  };
}
