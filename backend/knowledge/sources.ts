/**
 * Fuentes de la base de conocimiento del asistente (RAG lite). Solo datos que ya están
 * en el repositorio y solo campos aptos para clientes:
 *  - Catálogo de tours (src/data/toursData.ts) SIN identidad del operador.
 *  - Políticas publicadas (src/data/legalPages.ts), sin bloques de contacto.
 *  - Guías prácticas de viaje (src/data/travelKnowledge.ts).
 *  - Reglas de dominio turístico (backend/costaRicaTourismKnowledge.ts).
 *  - Resumen ICT (requisitos y regiones) y la FORMA pública del directorio de proveedores
 *    (shared/supplierDirectory.ts): tipos, regiones ICT y provincias/cantones. Nunca nombres,
 *    razones sociales, contactos ni ninguna fila del directorio.
 */
import { TOURS } from '../../src/data/toursData';
import { LEGAL_PAGES, LEGAL_PAGE_ORDER } from '../../src/data/legalPages';
import { TRAVEL_GUIDES } from '../../src/data/travelKnowledge';
import { COSTA_RICA_TOURISM_KNOWLEDGE } from '../costaRicaTourismKnowledge';
import { CR_CANTONS_BY_PROVINCE, ICT_TOURISM_REGIONS, SUPPLIER_TYPES } from '../../shared/supplierDirectory';
import { redactProviderIdentityForCustomer } from '../customerOutboundPrivacy';

export type KnowledgeKind = 'tour' | 'policy' | 'guide' | 'tourism_rule' | 'ict' | 'supplier_network';
type Bi = { es: string; en: string };

export interface KnowledgeDoc {
  id: string;
  kind: KnowledgeKind;
  title: Bi;
  /** Texto que se muestra al modelo (ya redactado). */
  body: Bi;
  /** Texto adicional solo para indexar (sinónimos, ids). */
  keywords?: string;
  source: string;
}

const squash = (s: unknown, max = 600) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

const SUPPLIER_TYPE_LABELS: Record<(typeof SUPPLIER_TYPES)[number], Bi> = {
  operador_tours: { es: 'operadores de tours', en: 'tour operators' },
  agencia_viajes: { es: 'agencias de viajes', en: 'travel agencies' },
  hospedaje: { es: 'hospedaje', en: 'lodging' },
  transporte: { es: 'transporte', en: 'transportation' },
  restaurante: { es: 'restaurantes', en: 'restaurants' },
  actividad_aventura: { es: 'actividades de aventura', en: 'adventure activities' },
  guia: { es: 'guías', en: 'guides' },
  atraccion: { es: 'atracciones', en: 'attractions' },
  otro: { es: 'otros servicios turísticos', en: 'other tourism services' },
};

function tourDocs(): KnowledgeDoc[] {
  return TOURS.map((t: any) => {
    const providerNames = [t.operatorName, t.providerId, t.operatorId].filter((n: unknown): n is string => typeof n === 'string' && n.length >= 3);
    const red = (text: unknown, language: 'es' | 'en') => redactProviderIdentityForCustomer(String(text ?? ''), { language, providerNames });
    const price = (lang: 'es' | 'en') => (t.priceUSD > 0
      ? (lang === 'es' ? `precio de referencia USD ${t.priceUSD} por persona (sujeto a confirmación)` : `reference price USD ${t.priceUSD} per person (subject to confirmation)`)
      : (lang === 'es' ? 'sin precio publicado: requiere cotización' : 'no published price: quote required'));
    const body = (lang: 'es' | 'en') => {
      const parts = [
        `${lang === 'es' ? 'Tour' : 'Tour'} "${red(t.title?.[lang] || t.title?.es, lang)}" (id ${t.id})`,
        `${lang === 'es' ? 'región' : 'region'}: ${t.region}`,
        `${lang === 'es' ? 'categoría' : 'category'}: ${t.category}`,
        t.durationLabel?.[lang] ? `${lang === 'es' ? 'duración' : 'duration'}: ${t.durationLabel[lang]}` : '',
        t.difficulty ? `${lang === 'es' ? 'dificultad' : 'difficulty'}: ${t.difficulty}` : '',
        t.ageMinimum ? `${lang === 'es' ? 'edad mínima' : 'minimum age'}: ${t.ageMinimum}` : '',
        price(lang),
        squash(red(t.description?.[lang] || t.description?.es, lang), 280),
      ].filter(Boolean);
      return parts.join(' · ');
    };
    const keywords = [t.title?.es, t.title?.en, t.subtitle?.es, t.subtitle?.en, t.location?.placeName,
      ...(t.highlights?.es || []), ...(t.highlights?.en || []), squash(t.description?.es, 800), squash(t.description?.en, 800)]
      .map(x => redactProviderIdentityForCustomer(String(x ?? ''), { providerNames })).join(' ');
    return {
      id: `tour:${t.id}`,
      kind: 'tour' as const,
      title: { es: red(t.title?.es, 'es'), en: red(t.title?.en || t.title?.es, 'en') },
      body: { es: body('es'), en: body('en') },
      keywords: `${keywords} ${t.region} ${t.category}`,
      source: 'catalog',
    };
  });
}

function policyDocs(): KnowledgeDoc[] {
  const docs: KnowledgeDoc[] = [];
  for (const id of LEGAL_PAGE_ORDER) {
    const page = LEGAL_PAGES[id];
    page.sections.forEach((s, i) => {
      if (/^(contacto|contact)$/i.test(s.heading.es)) return; // el contacto es para la web
      docs.push({
        id: `policy:${id}:${i}`,
        kind: 'policy',
        title: { es: `${page.title.es} — ${s.heading.es}`, en: `${page.title.en} — ${s.heading.en}` },
        body: { es: squash(s.paragraphs.es.join(' '), 700), en: squash(s.paragraphs.en.join(' '), 700) },
        keywords: id === 'cancellation' ? 'cancelar cancelacion reembolso devolucion refund cancel' : id === 'privacy' ? 'privacidad datos personales privacy data' : 'terminos condiciones terms',
        source: page.path,
      });
    });
  }
  return docs;
}

function guideDocs(): KnowledgeDoc[] {
  return TRAVEL_GUIDES.map(g => ({
    id: `guide:${g.id}`,
    kind: 'guide' as const,
    title: g.title,
    body: { es: squash(`${g.summary.es} ${g.steps.es.join(' ')}`, 700), en: squash(`${g.summary.en} ${g.steps.en.join(' ')}`, 700) },
    keywords: `${g.id} ${g.sourceLabel}`,
    source: g.sourceLabel,
  }));
}

function tourismRuleDocs(): KnowledgeDoc[] {
  return COSTA_RICA_TOURISM_KNOWLEDGE.map((r, i) => ({
    id: `rule:${r.domain}:${i}`,
    kind: 'tourism_rule' as const,
    title: { es: `Conocimiento turístico (${r.domain})`, en: `Tourism knowledge (${r.domain})` },
    body: { es: squash(r.rule, 600), en: squash(r.rule, 600) },
    keywords: r.domain,
    source: 'backend/costaRicaTourismKnowledge.ts',
  }));
}

/** Resumen ICT apto para clientes (derivado de textos ya publicados en el repo). */
export const ICT_SUMMARY: Bi = {
  es: 'El ICT (Instituto Costarricense de Turismo) otorga la declaratoria turística a empresas del sector. Costa Rica Tours trabaja con operadores locales y verifica su declaratoria turística del ICT antes de confirmar cada reserva; no afirmamos que todos los negocios del país estén certificados. La identidad del operador se comparte en la confirmación de la reserva, antes de cualquier pago. Para información turística nacional la fuente prioritaria es el ICT (https://www.ict.go.cr/) y para parques y áreas protegidas el SINAC. Los requisitos de entrada al país los determina Migración: verifica pasaporte, visado si corresponde y boleto de salida.',
  en: 'ICT (Costa Rica Tourism Board) grants the tourism declaration to businesses in the sector. Costa Rica Tours works with local operators and verifies their ICT tourism declaration before confirming each booking; we do not claim every business in the country is certified. The operator identity is shared in the booking confirmation, before any payment. For national tourism information the primary source is ICT (https://www.ict.go.cr/) and for parks and protected areas SINAC. Entry requirements are set by Costa Rican immigration: check passport, visa if applicable and onward ticket.',
};

function ictAndNetworkDocs(): KnowledgeDoc[] {
  const types = SUPPLIER_TYPES.filter(t => t !== 'otro');
  const docs: KnowledgeDoc[] = [
    { id: 'ict:summary', kind: 'ict', title: { es: 'ICT y verificación de operadores', en: 'ICT and operator verification' }, body: ICT_SUMMARY,
      keywords: 'ict declaratoria turistica certificado certificacion licencia legal verificado operador proveedor migracion entrada pasaporte visa', source: 'https://www.ict.go.cr/' },
    { id: 'ict:regions', kind: 'ict', title: { es: 'Regiones turísticas del ICT', en: 'ICT tourism regions' },
      body: { es: `El ICT divide el país en ${ICT_TOURISM_REGIONS.length} unidades de planeamiento turístico: ${ICT_TOURISM_REGIONS.join(', ')}.`,
        en: `ICT divides the country into ${ICT_TOURISM_REGIONS.length} tourism planning units: ${ICT_TOURISM_REGIONS.join(', ')}.` },
      keywords: 'region regiones zona zonas', source: 'https://ict.go.cr/en/documents/plan-nacional-y-planes-generales/planes-generales-por-unidad-de-planeamiento.html' },
    { id: 'network:types', kind: 'supplier_network', title: { es: 'Red de servicios locales', en: 'Local service network' },
      body: { es: `Coordinamos con proveedores locales de estos tipos: ${types.map(t => SUPPLIER_TYPE_LABELS[t].es).join(', ')}. No compartimos nombres ni contactos de proveedores; la disponibilidad se confirma antes de cualquier pago.`,
        en: `We coordinate with local providers of these kinds: ${types.map(t => SUPPLIER_TYPE_LABELS[t].en).join(', ')}. We do not share provider names or contacts; availability is confirmed before any payment.` },
      keywords: 'proveedor proveedores operador operadores socios aliados partner provider supplier hotel transporte guia', source: 'shared/supplierDirectory.ts' },
  ];
  for (const [province, cantons] of Object.entries(CR_CANTONS_BY_PROVINCE)) {
    docs.push({ id: `geo:${province}`, kind: 'supplier_network', title: { es: `Provincia de ${province}`, en: `${province} province` },
      body: { es: `${province} tiene ${cantons.length} cantones: ${cantons.join(', ')}.`, en: `${province} has ${cantons.length} cantons: ${cantons.join(', ')}.` },
      keywords: 'provincia canton cantones province', source: 'shared/supplierDirectory.ts' });
  }
  return docs;
}

export function buildKnowledgeDocs(): KnowledgeDoc[] {
  return [...ictAndNetworkDocs(), ...policyDocs(), ...guideDocs(), ...tourismRuleDocs(), ...tourDocs()];
}
