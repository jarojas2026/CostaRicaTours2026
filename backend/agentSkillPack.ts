/**
 * Paquete de habilidades adicionales para los agentes IA de Costa Rica Tours.
 *
 * REGLAS DE DISEÑO (no romper):
 * - Solo datos y funciones PURAS DE LECTURA. No escribe en Firestore, no cobra,
 *   no confirma reservas y no toca pagos.
 * - Nunca inventa disponibilidad, precios ni tipos de cambio: todo sale del
 *   catálogo (TOURS) o de variables de entorno. Si falta el dato, lo dice.
 * - La comisión comercial es información INTERNA: no aparece aquí.
 */
import { TOURS } from '../src/data/toursData';
import type { Tour, TourCategory } from '../src/types';

// ---------------------------------------------------------------------------
// Datos de la empresa (fuente única para los agentes)
// ---------------------------------------------------------------------------
export const COMPANY_FACTS = {
  name: 'Costa Rica Tours',
  role: 'Comercializadora/intermediaria: los tours los opera el proveedor local indicado en cada ficha.',
  base: 'Pérez Zeledón, Costa Rica',
  coverage: 'Todo Costa Rica',
  whatsappE164: '50687959148',
  whatsappDisplay: '+506 8795 9148',
  email: 'jarojas800@gmail.com',
  hours: '24/7',
  paymentMethods: ['Tarjeta', 'Transferencia', 'PayPal', 'SINPE Móvil'],
  // Texto tal como lo declaró el dueño. Es ambiguo ("24 horas antes 100% pagado"),
  // por eso los agentes NO deben prometer reembolsos más allá de este texto.
  cancellationPolicyRaw: 'Pago antes del servicio. 24 horas antes: 100% pagado.',
  cancellationPolicyNeedsOwnerConfirmation: true
} as const;

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------
const norm = (value: unknown): string => String(value ?? '').trim().toLowerCase();

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

function findTour(idOrSlug: string): Tour | undefined {
  const key = norm(idOrSlug);
  if (!key) return undefined;
  return TOURS.find((t) => norm(t.id) === key || norm(t.slug) === key);
}

function summarizeTour(t: Tour) {
  return {
    id: t.id,
    title: t.title.es,
    titleEn: t.title.en ?? t.title.es,
    region: t.region,
    category: t.category,
    priceUSD: t.priceUSD,
    durationHours: t.durationHours,
    difficulty: t.difficulty,
    rating: t.rating,
    reviewsCount: t.reviewsCount,
    ageMinimum: t.ageMinimum ?? null,
    maxGroupSize: t.maxGroupSize ?? null,
    tourType: t.tourType ?? null,
    freeCancellation: t.freeCancellation ?? null,
    operatorName: t.operatorName ?? null,
    isDemoData: t.isDemoData === true
  };
}

// ---------------------------------------------------------------------------
// Habilidad 1: comparar tours
// ---------------------------------------------------------------------------
export function compareTours(tourIds: string[]) {
  const wanted = tourIds.map((x) => String(x).trim()).filter(Boolean).slice(0, 4);
  const compared: ReturnType<typeof summarizeTour>[] = [];
  const missing: string[] = [];
  for (const id of wanted) {
    const tour = findTour(id);
    if (tour) compared.push(summarizeTour(tour));
    else missing.push(id);
  }
  return {
    compared,
    missing,
    note: 'Comparación basada solo en el catálogo. La disponibilidad real se verifica con check_availability.'
  };
}

// ---------------------------------------------------------------------------
// Habilidad 2: cotización estimada (el total final lo calcula el servidor)
// ---------------------------------------------------------------------------
export function quotePrice(input: { tourId: string; adults?: number; children?: number }) {
  const tour = findTour(input.tourId);
  if (!tour) return { success: false as const, error: 'tour_not_found' };

  const adults = clampInt(input.adults, 1, 50, 1);
  const children = clampInt(input.children, 0, 50, 0);
  const people = adults + children;
  const totalUSD = round2(tour.priceUSD * people);

  // Tipo de cambio: solo si está configurado en el entorno. Nunca se inventa.
  const rate = Number(process.env.USD_TO_CRC_RATE);
  const hasRate = Number.isFinite(rate) && rate > 0;

  return {
    success: true as const,
    tourId: tour.id,
    title: tour.title.es,
    people,
    unitPriceUSD: tour.priceUSD,
    estimatedTotalUSD: totalUSD,
    estimatedTotalCRC: hasRate ? Math.round(totalUSD * rate) : null,
    crcReferenceOnly: true,
    isDemoData: tour.isDemoData === true,
    notes: [
      'Estimación: el catálogo no define tarifa infantil distinta; se cuenta a todos al precio unitario.',
      'El total final y el cobro los calcula y verifica el servidor al reservar.',
      hasRate ? 'La conversión a CRC es solo referencial.' : 'Tipo de cambio a CRC no configurado: no se muestra conversión.',
      ...(tour.isDemoData === true ? ['Este tour está marcado como DEMO: precio no confirmado.'] : [])
    ]
  };
}

// ---------------------------------------------------------------------------
// Habilidad 3: esquema de itinerario a partir del catálogo real
// ---------------------------------------------------------------------------
export function planItineraryOutline(input: { days: number; interests?: string[]; regions?: string[] }) {
  const days = clampInt(input.days, 1, 14, 1);
  const interests = (input.interests ?? []).map(norm).filter(Boolean);
  const regions = (input.regions ?? []).map(norm).filter(Boolean);

  const byQuality = (a: Tour, b: Tour) => b.rating - a.rating || b.reviewsCount - a.reviewsCount;
  const inRegion = (t: Tour) => regions.length === 0 || regions.includes(norm(t.region));
  const matchesInterest = (t: Tour) => interests.length === 0 || interests.includes(norm(t.category));

  const primary = TOURS.filter((t) => inRegion(t) && matchesInterest(t)).sort(byQuality);
  const primaryIds = new Set(primary.map((t) => t.id));
  const filler = TOURS.filter((t) => inRegion(t) && !primaryIds.has(t.id)).sort(byQuality);

  const chosen = [...primary, ...filler].slice(0, days);
  // Agrupar por región para reducir traslados entre días.
  const ordered = [...chosen].sort((a, b) => a.region.localeCompare(b.region));

  return {
    days,
    plan: ordered.map((t, i) => ({
      day: i + 1,
      matchesInterest: primaryIds.has(t.id),
      ...summarizeTour(t)
    })),
    unfilledDays: Math.max(0, days - ordered.length),
    notes: [
      'Sugerencia basada en el catálogo; NO garantiza disponibilidad: verificar cada fecha con check_availability.',
      'No se modelan tiempos de traslado entre regiones: revisar distancias antes de proponer el orden final al viajero.'
    ]
  };
}

// ---------------------------------------------------------------------------
// Habilidad 4: enlace de WhatsApp contextual
// ---------------------------------------------------------------------------
export function whatsappHandoffLink(input: {
  tourTitle?: string;
  date?: string;
  people?: number;
  language?: 'es' | 'en';
  note?: string;
}): string {
  const en = input.language === 'en';
  const parts: string[] = [];
  if (input.tourTitle) {
    parts.push(en
      ? `Hello, I'm interested in the tour "${input.tourTitle}".`
      : `Hola, estoy interesado en el tour "${input.tourTitle}".`);
  } else {
    parts.push(en ? 'Hello, I would like information about your tours in Costa Rica.' : 'Hola, quisiera información sobre sus tours en Costa Rica.');
  }
  if (input.date && input.people) {
    parts.push(en
      ? `I would like to check availability for ${input.date} for ${input.people} people.`
      : `Quisiera consultar disponibilidad para el ${input.date} para ${input.people} personas.`);
  } else if (input.date) {
    parts.push(en ? `I would like to check availability for ${input.date}.` : `Quisiera consultar disponibilidad para el ${input.date}.`);
  }
  if (input.note) parts.push(String(input.note).slice(0, 300));
  return `https://wa.me/${COMPANY_FACTS.whatsappE164}?text=${encodeURIComponent(parts.join(' '))}`;
}

// ---------------------------------------------------------------------------
// Habilidad 5: política de cancelación (texto declarado, sin inventar reembolsos)
// ---------------------------------------------------------------------------
export function getCancellationPolicy(tourId?: string) {
  const tour = tourId ? findTour(tourId) : undefined;
  return {
    companyPolicy: COMPANY_FACTS.cancellationPolicyRaw,
    needsOwnerConfirmation: COMPANY_FACTS.cancellationPolicyNeedsOwnerConfirmation,
    tourFreeCancellationFlag: tour ? (tour.freeCancellation ?? null) : null,
    guidance: 'No prometer reembolsos más allá de este texto. Si el viajero pide el detalle exacto, indicar que el equipo lo confirma por WhatsApp.'
  };
}

// ---------------------------------------------------------------------------
// Habilidad 6: consejo de temporada (conocimiento general, sin garantías)
// ---------------------------------------------------------------------------
export function seasonAdvice(month: number) {
  const m = clampInt(month, 1, 12, new Date().getMonth() + 1);
  const dry = m === 12 || m <= 4;
  const whaleWindow = m === 12 || m <= 4 || (m >= 7 && m <= 10);
  return {
    month: m,
    season: dry ? 'seca (alta)' : 'verde/lluviosa',
    tips: dry
      ? ['Mejor época para playas del Pacífico y Guanacaste.', 'Temporada alta: conviene reservar con anticipación.']
      : [
          'Vegetación exuberante; las lluvias suelen concentrarse en la tarde: preferir actividades en la mañana.',
          'El Caribe suele tener un período más seco hacia septiembre-octubre.'
        ],
    whaleWatchingTypicalWindow: whaleWindow,
    whaleNote: 'Ventanas típicas en Marino Ballena (aprox. dic-abr y jul-oct). Los avistamientos no están garantizados.'
  };
}

// ---------------------------------------------------------------------------
// Detección de intención → insights que se inyectan en el contexto del agente
// ---------------------------------------------------------------------------
const INTEREST_KEYWORDS: Array<[RegExp, TourCategory]> = [
  [/aventur|adventure/, 'adventure'],
  [/naturaleza|nature/, 'nature'],
  [/playa|beach/, 'beaches'],
  [/ballena|whale/, 'whale_watching'],
  [/volc/, 'volcanoes'],
  [/canopy|tirolesa|zip/, 'canopy'],
  [/rafting/, 'rafting'],
  [/catarata|cascada|waterfall/, 'waterfalls'],
  [/familia|family|ni[ñn]os|kids/, 'family'],
  [/fauna|wildlife|animales/, 'wildlife'],
  [/surf/, 'surf'],
  [/snorkel/, 'snorkeling'],
  [/senderismo|hiking|caminata/, 'hiking'],
  [/gastronom|caf[eé]|coffee/, 'gastronomy'],
  [/cultura|culture/, 'culture']
];

export function buildSkillInsights(query: string, now: Date = new Date()): string[] {
  const q = norm(query);
  const insights: string[] = [];

  insights.push(
    `EMPRESA: ${COMPANY_FACTS.name} (${COMPANY_FACTS.base}). ${COMPANY_FACTS.role} ` +
    `Contacto WhatsApp ${COMPANY_FACTS.whatsappDisplay}, atención ${COMPANY_FACTS.hours}. ` +
    `Pagos: ${COMPANY_FACTS.paymentMethods.join(', ')}.`
  );

  const season = seasonAdvice(now.getMonth() + 1);
  insights.push(`TEMPORADA ACTUAL: ${season.season}. ${season.tips.join(' ')}`);

  if (/cancel|reembols|refund|devoluci/.test(q)) {
    const policy = getCancellationPolicy();
    insights.push(`POLÍTICA DE CANCELACIÓN DECLARADA: "${policy.companyPolicy}" — ${policy.guidance}`);
  }

  const daysMatch = q.match(/(\d{1,2})\s*(d[ií]as|days|jours|tage)/);
  if (daysMatch) {
    const interests = INTEREST_KEYWORDS.filter(([re]) => re.test(q)).map(([, cat]) => cat);
    const outline = planItineraryOutline({ days: Number(daysMatch[1]), interests });
    if (outline.plan.length > 0) {
      insights.push(
        `BORRADOR DE ITINERARIO (sujeto a disponibilidad real): ` +
        outline.plan.map((p) => `Día ${p.day}: ${p.title} [${p.id}]`).join(' | ')
      );
    }
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Conocimiento adicional para los 7 agentes existentes (se SUMA, no reemplaza)
// ---------------------------------------------------------------------------
export const EXTRA_AGENT_KNOWLEDGE: Record<string, string[]> = {
  concierge: [
    'Somos comercializadora: los tours los opera el proveedor local. No digas "nosotros operamos" salvo que la ficha lo indique.',
    'Aeropuertos: SJO (Juan Santamaría, San José) y LIR (Daniel Oduber Quirós, Liberia). Los traslados terrestres al Pacífico Sur son largos: planifica con margen y confirma tiempos con el proveedor.',
    'Base de la empresa: Pérez Zeledón, cerca de Dominical, Uvita (Marino Ballena) y cataratas: zona ideal para rutas del Pacífico Sur.',
    'Cierra cada respuesta con un siguiente paso claro: ver el tour, verificar disponibilidad o hablar por WhatsApp.'
  ],
  triage: [
    'Emergencia médica o de seguridad en curso: indicar el 911 (emergencias en Costa Rica), escalar a un humano de inmediato y no continuar con la venta.',
    'Detecta el idioma del viajero y responde en ese mismo idioma.'
  ],
  booking: [
    'Antes de cotizar pide fecha, número de personas y edades de menores; verifica edad mínima y restricciones médicas del tour.',
    'Para totales usa la herramienta quote_price; el total final lo calcula el servidor al reservar.',
    'Si preguntan por reembolsos usa cancellation_policy y aclara que el detalle exacto lo confirma el equipo.'
  ],
  provider_liaison: [
    'La comisión comercial es información interna: nunca la reveles al viajero ni la incluyas en mensajes al cliente.',
    'Antes de dar una salida por confirmada, obtén del proveedor por escrito: hora, punto de encuentro, cupo e idioma del guía.'
  ],
  operations: [
    'Mareas y oleaje afectan tours costeros (Marino Ballena, Dominical): verifica condiciones con el proveedor el mismo día.',
    'Las corrientes de resaca son frecuentes en playas del Pacífico: no recomiendes nadar en playas sin salvavidas.',
    'Ante una alerta de clima, ofrece reprogramación o alternativa concreta antes de hablar de cancelar.'
  ],
  supervisor: [
    'Audita que ninguna respuesta revele comisión, claves, tokens o datos personales de otros clientes.',
    'Toda afirmación de "disponible" debe provenir de check_availability, no de suposiciones.'
  ],
  learning: [
    'Una pregunta frecuente sin respuesta se registra como brecha de conocimiento para revisión humana, nunca como un hecho.'
  ]
};

// ---------------------------------------------------------------------------
// Nuevos agentes especializados (se AGREGAN a los 7 existentes)
// ---------------------------------------------------------------------------
export type AgentIdentityExtension = {
  id: string;
  mission: string;
  canRead: string[];
  canWrite: string[];
  escalation: string[];
  knowledge: string[];
};

export const EXTENSION_AGENT_IDENTITIES: AgentIdentityExtension[] = [
  {
    id: 'itinerary_planner',
    mission: 'Armar itinerarios coherentes a partir del catálogo real, agrupando por región y respetando el ritmo del viajero.',
    canRead: ['catalog', 'availability', 'memory', 'weather'],
    canWrite: ['memory', 'tasks'],
    escalation: ['booking', 'supervisor'],
    knowledge: [
      'Agrupa los días por región para minimizar traslados; no mezcles Guanacaste y Pacífico Sur en días consecutivos sin advertir la distancia.',
      'Deja un día de descanso en viajes de 7 días o más y evita apilar actividades exigentes seguidas.',
      'Usa plan_itinerary como borrador y verifica cada fecha con check_availability antes de presentarlo como viable.'
    ]
  },
  {
    id: 'conversion_advisor',
    mission: 'Convertir consultas en reservas con honestidad: resolver dudas, comparar opciones y proponer el siguiente paso.',
    canRead: ['catalog', 'availability', 'memory'],
    canWrite: ['memory', 'tasks'],
    escalation: ['booking', 'supervisor'],
    knowledge: [
      'Usa compare_tours cuando el viajero dude entre 2-4 opciones y resume la diferencia clave en una frase.',
      'Nunca uses urgencia falsa ("últimos cupos") sin un dato real de disponibilidad.',
      'Ofrece hablar por WhatsApp con whatsapp_handoff cuando el viajero necesite trato humano o tenga un caso especial.'
    ]
  },
  {
    id: 'multilingual_support',
    mission: 'Atender al viajero en su idioma (es, en, fr, de, zh, ja) manteniendo precisión y tono cálido.',
    canRead: ['catalog', 'memory'],
    canWrite: ['memory'],
    escalation: ['concierge', 'supervisor'],
    knowledge: [
      'Responde en el idioma del viajero; si dudas entre variantes, usa la más neutra y evita modismos locales sin explicar.',
      'Nunca traduzcas nombres propios de tours, lugares ni parques; tradúcelos solo cuando exista título oficial en ese idioma.',
      'Si un dato no está traducido en el catálogo, dilo y usa el texto en español o inglés disponible en vez de inventar una traducción de política o precio.'
    ]
  },
  {
    id: 'sustainability_guide',
    mission: 'Orientar sobre turismo responsable sin hacer afirmaciones que no se puedan demostrar.',
    canRead: ['catalog', 'provider'],
    canWrite: ['memory'],
    escalation: ['supervisor'],
    knowledge: [
      'Existe la Certificación para la Sostenibilidad Turística (CST) en Costa Rica; no afirmes que un operador la tiene salvo que el dato esté en el catálogo o lo confirme el proveedor.',
      'Recomienda no alimentar ni tocar fauna, llevar de vuelta la basura y usar protector solar biodegradable en zonas de arrecife y río.',
      'Evita el lenguaje de marketing vacío ("100% eco"): describe acciones concretas y verificables.'
    ]
  },
  {
    id: 'safety_health',
    mission: 'Informar sobre seguridad y salud del viajero con prudencia, sin dar diagnósticos.',
    canRead: ['catalog', 'weather', 'memory'],
    canWrite: ['memory', 'tasks'],
    escalation: ['triage', 'human'],
    knowledge: [
      'No des consejo médico: recomienda consultar a un profesional y verifica las restricciones médicas indicadas en la ficha del tour.',
      'Requisitos de ingreso y vacunas cambian: indica siempre verificarlos con la fuente oficial (migración y autoridades de salud) antes del viaje.',
      'Recomienda seguro de viaje con cobertura de actividades de aventura y emergencias médicas.',
      'Emergencias en Costa Rica: 911.'
    ]
  },
  {
    id: 'payments_support',
    mission: 'Aclarar métodos de pago, estados de pago y comprobantes sin manipular ni simular cobros.',
    canRead: ['booking', 'payments', 'memory'],
    canWrite: ['tasks', 'memory'],
    escalation: ['booking', 'supervisor', 'human'],
    knowledge: [
      `Métodos aceptados declarados: ${COMPANY_FACTS.paymentMethods.join(', ')}.`,
      'El estado de un pago solo se afirma leyendo el estado real de la reserva; nunca confirmes un pago porque el cliente diga que pagó.',
      'Nunca pidas ni repitas números completos de tarjeta, CVV ni contraseñas en el chat.',
      'Los reembolsos no se prometen: usa cancellation_policy y escala a un humano.'
    ]
  }
];

// ---------------------------------------------------------------------------
// Habilidad nueva: venta cruzada inteligente (bundle) basada en datos reales
// ---------------------------------------------------------------------------
/**
 * Sugiere hasta 3 tours reales del catálogo que combinan bien con uno ya
 * reservado: distinta categoría (para no repetir experiencia), misma región
 * o región adyacente (para minimizar traslados), y que quepan en el
 * presupuesto relativo del viajero (no más del 150% del precio del tour base).
 * Nunca inventa tours ni disponibilidad — solo reordena el catálogo real.
 */
export function suggestComplementaryTours(bookedTourId: string, limit = 3) {
  const base = findTour(bookedTourId);
  if (!base) return { suggestions: [], note: 'Tour base no encontrado en el catálogo.' };

  const priceCeiling = base.priceUSD * 1.5;
  const candidates = TOURS
    .filter((t) => t.id !== base.id)
    .filter((t) => t.priceUSD <= priceCeiling)
    .map((t) => {
      let score = 0;
      if (t.category !== base.category) score += 2; // diversidad de experiencia
      if (t.region === base.region) score += 3; // cero traslado extra
      else score += 1; // aún válido, solo menor puntaje
      if (t.rating >= 4.5) score += 1;
      return { tour: t, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 5)))
    .map(({ tour }) => summarizeTour(tour));

  return {
    baseTour: summarizeTour(base),
    suggestions: candidates,
    note: 'Sugerencias basadas en catálogo real (categoría distinta, misma región cuando es posible, rating alto). Verificar disponibilidad real antes de ofrecer.'
  };
}
