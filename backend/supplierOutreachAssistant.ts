/**
 * Asistente de proveedores (solo dueño/admin): a partir del directorio de prospección
 * (`supplier_directory`, SOLO LECTURA) sugiere proveedores ordenados por prioridad y redacta un
 * BORRADOR en español (WhatsApp o correo) pidiendo tarifas netas de agencia con margen mínimo del 20 %.
 *
 * Garantías:
 *  - Nunca envía nada (ni WhatsApp, ni correo): solo devuelve borradores para revisión humana.
 *  - Nunca escribe en Firestore (no cambia `estado_contacto` ni ningún otro campo).
 *  - Al modelo (Groq, plan gratuito) solo salen nombre comercial, tipo, ubicación y productos;
 *    nunca teléfonos, correos, WhatsApp ni web.
 *  - Si Groq no está configurado o falla, se usa una plantilla determinista (costo $0).
 */
import {
  foldKey, isSupplierType, normalizeProvince,
  type CrProvince, type SupplierDirectoryEntry, type SupplierType,
} from '../shared/supplierDirectory';

export const OUTREACH_MIN_MARGIN_PCT = 20;
export const OUTREACH_PRIORITIES = ['alta', 'media', 'baja'] as const;
export type OutreachPriority = (typeof OUTREACH_PRIORITIES)[number];
export type OutreachChannel = 'whatsapp' | 'email';

export interface OutreachFilters {
  provincia?: CrProvince;
  tipo?: SupplierType;
  prioridad?: OutreachPriority;
  canal?: OutreachChannel;
  /** Sugerencias a devolver (≤ 25). */
  limit: number;
  /** Cuántas sugerencias llevan borrador (≤ 5: el plan gratuito de Groq permite 30 solicitudes/min). */
  drafts: number;
}

export type ParsedOutreachFilters = { ok: true; filters: OutreachFilters } | { ok: false; error: string };

export function parseOutreachFilters(input: Record<string, unknown>): ParsedOutreachFilters {
  const filters: OutreachFilters = {
    limit: Math.max(1, Math.min(25, Number(input.limit) || 10)),
    drafts: Math.max(0, Math.min(5, input.drafts === undefined ? 3 : Number(input.drafts) || 0)),
  };
  if (input.provincia) {
    const p = normalizeProvince(input.provincia);
    if (!p) return { ok: false, error: 'provincia_invalida' };
    filters.provincia = p;
  }
  if (input.tipo) {
    const t = foldKey(input.tipo).replace(/[\s-]+/g, '_');
    if (!isSupplierType(t)) return { ok: false, error: 'tipo_invalido' };
    filters.tipo = t;
  }
  if (input.prioridad) {
    const pr = foldKey(input.prioridad);
    if (!(OUTREACH_PRIORITIES as readonly string[]).includes(pr)) return { ok: false, error: 'prioridad_invalida' };
    filters.prioridad = pr as OutreachPriority;
  }
  if (input.canal) {
    const c = foldKey(input.canal);
    if (c !== 'whatsapp' && c !== 'email') return { ok: false, error: 'canal_invalido' };
    filters.canal = c;
  }
  return { ok: true, filters };
}

type Entry = Partial<SupplierDirectoryEntry> & { id: string };

export interface ScoredSupplier {
  id: string;
  nombre: string;
  tipo: string;
  provincia: string;
  canton: string;
  region_turistica_ict: string | null;
  productos: string[];
  estado_contacto: string;
  score: number;
  prioridad: OutreachPriority;
  razones: string[];
  canalSugerido: OutreachChannel | null;
  canalesDisponibles: { whatsapp: boolean; email: boolean };
}

const TOURISM_CORE_TYPES = new Set(['operador_tours', 'actividad_aventura', 'transporte', 'guia', 'atraccion']);

/** Puntaje transparente (0-100) con las razones que lo explican. Excluye aprobados, rechazados y ya convertidos. */
export function scoreSupplier(e: Entry): ScoredSupplier | null {
  const estado = String(e.estado_contacto || 'sin_contactar');
  if (estado === 'aprobado' || estado === 'rechazado' || e.operator_id) return null;
  const contacto = e.contacto || ({} as any);
  const hasWa = Boolean(contacto.whatsapp || contacto.telefono);
  const hasEmail = Boolean(contacto.email);
  if (!hasWa && !hasEmail) return null; // sin canal no hay borrador útil
  const razones: string[] = [];
  let score = 0;
  if (e.declaratoria_ict === true) { score += 30; razones.push('Declaratoria turística ICT indicada en la fuente'); }
  if (e.cst) { score += 15; razones.push(`Certificación de Sostenibilidad Turística (${String(e.cst).slice(0, 20)})`); }
  if (estado === 'sin_contactar') { score += 20; razones.push('Aún sin contactar'); }
  else if (estado === 'contactado') { score += 8; razones.push('Contactado sin respuesta registrada'); }
  else if (estado === 'negociando') { score += 4; razones.push('En negociación'); }
  if (TOURISM_CORE_TYPES.has(String(e.tipo))) { score += 10; razones.push('Tipo clave para el catálogo de tours'); }
  const productos = Array.isArray(e.productos) ? e.productos.map(p => String(p)).filter(Boolean).slice(0, 10) : [];
  if (productos.length) { score += Math.min(10, productos.length * 3); razones.push(`${productos.length} producto(s) listados`); }
  if (hasWa) { score += 10; razones.push('WhatsApp/teléfono disponible'); }
  if (hasEmail) score += 5;
  score = Math.min(100, score);
  const prioridad: OutreachPriority = score >= 60 ? 'alta' : score >= 35 ? 'media' : 'baja';
  return {
    id: e.id,
    nombre: String(e.nombre || e.id).slice(0, 120),
    tipo: String(e.tipo || 'otro'),
    provincia: String(e.provincia || ''),
    canton: String(e.canton || ''),
    region_turistica_ict: e.region_turistica_ict ? String(e.region_turistica_ict) : null,
    productos,
    estado_contacto: estado,
    score,
    prioridad,
    razones,
    canalSugerido: hasWa ? 'whatsapp' : 'email',
    canalesDisponibles: { whatsapp: hasWa, email: hasEmail },
  };
}

export function rankSuppliers(entries: Entry[], filters: OutreachFilters): ScoredSupplier[] {
  return entries
    .filter(e => (!filters.provincia || e.provincia === filters.provincia) && (!filters.tipo || e.tipo === filters.tipo))
    .map(scoreSupplier)
    .filter((s): s is ScoredSupplier => s !== null)
    .filter(s => !filters.prioridad || s.prioridad === filters.prioridad)
    .filter(s => !filters.canal || s.canalesDisponibles[filters.canal])
    .sort((a, b) => b.score - a.score || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, filters.limit);
}

export interface OutreachDraft { canal: OutreachChannel; asunto: string | null; mensaje: string; generadoPor: 'groq' | 'plantilla'; modelo?: string }

const productLine = (s: ScoredSupplier) => (s.productos.length ? s.productos.slice(0, 4).join(', ') : 'sus servicios turísticos');

/** Borrador determinista (sin IA). */
export function templateOutreachDraft(s: ScoredSupplier, canal: OutreachChannel): OutreachDraft {
  const lugar = [s.canton, s.provincia].filter(Boolean).join(', ');
  const cuerpo = [
    `Hola, equipo de ${s.nombre}. Le saluda [Tu nombre], de Costa Rica Tours, agencia en línea con sede en Pérez Zeledón.`,
    `Nos interesa ofrecer ${productLine(s)}${lugar ? ` en ${lugar}` : ''} a nuestros clientes.`,
    `¿Podrían compartirnos sus tarifas netas para agencia (por adulto y niño) y sus condiciones? Trabajamos con un margen mínimo del ${OUTREACH_MIN_MARGIN_PCT} % sobre el precio de venta al público, por lo que necesitamos una tarifa neta o comisión de al menos ese ${OUTREACH_MIN_MARGIN_PCT} %.`,
    'También agradeceríamos su política de cancelación, horarios y si cuentan con declaratoria turística del ICT y pólizas vigentes.',
    '¡Muchas gracias! Quedamos atentos.',
  ];
  return canal === 'email'
    ? { canal, asunto: `Solicitud de tarifas netas para agencia — ${s.nombre}`, mensaje: cuerpo.join('\n\n'), generadoPor: 'plantilla' }
    : { canal, asunto: null, mensaje: cuerpo.join(' '), generadoPor: 'plantilla' };
}

/** Mensajes para el modelo: solo campos comerciales públicos, nunca contactos. */
export function buildOutreachMessages(s: ScoredSupplier, canal: OutreachChannel) {
  const system = [
    'Eres asistente comercial de Costa Rica Tours (agencia en línea, Pérez Zeledón, Costa Rica). Escribe en español de Costa Rica, cordial y profesional.',
    `Redacta un BORRADOR de primer contacto por ${canal === 'email' ? 'correo electrónico (incluye una primera línea "Asunto: ...")' : 'WhatsApp (máximo ~90 palabras, sin asunto)'} dirigido a un proveedor turístico.`,
    `Objetivo: pedir tarifas netas para agencia (adulto/niño) y condiciones, indicando que trabajamos con un margen mínimo del ${OUTREACH_MIN_MARGIN_PCT} % sobre el precio de venta al público.`,
    'Pide también política de cancelación, horarios y si cuentan con declaratoria turística ICT y pólizas vigentes.',
    'Reglas: no inventes datos, precios, alianzas ni volúmenes; no prometas reservas; no incluyas teléfonos, correos ni enlaces; firma como "[Tu nombre] — Costa Rica Tours". Devuelve solo el texto del mensaje.',
  ].join('\n');
  const user = `Proveedor: ${s.nombre}\nTipo: ${s.tipo}\nUbicación: ${[s.canton, s.provincia].filter(Boolean).join(', ') || 'Costa Rica'}\nProductos: ${productLine(s)}`;
  return [{ role: 'system' as const, content: system }, { role: 'user' as const, content: user }];
}

function parseModelDraft(text: string, canal: OutreachChannel): { asunto: string | null; mensaje: string } {
  let mensaje = String(text || '').trim();
  let asunto: string | null = null;
  const m = mensaje.match(/^\s*asunto\s*:\s*(.+)\n+/i);
  if (m) { asunto = m[1].trim().slice(0, 160); mensaje = mensaje.slice(m[0].length).trim(); }
  if (canal === 'whatsapp') asunto = null;
  return { asunto, mensaje: mensaje.slice(0, 2500) };
}

/** Exige que el borrador mencione el margen mínimo y no contenga contactos; si no, se usa la plantilla. */
export function isAcceptableDraft(mensaje: string): boolean {
  if (mensaje.length < 60) return false;
  if (!new RegExp(`${OUTREACH_MIN_MARGIN_PCT}\\s*%`).test(mensaje)) return false;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|https?:\/\/|\+?\d[\d\s-]{7,}\d/i.test(mensaje)) return false;
  return true;
}

export type DraftChat = (messages: Array<{ role: 'system' | 'user'; content: string }>) => Promise<{ text: string; model?: string } | null>;

/** Chat Groq por defecto (vía router con breaker). Devuelve null si no está configurado o falla. */
export const groqDraftChat: DraftChat = async (messages) => {
  const { isOpenAiCompatConfigured, isBillingBlocked } = await import('./aiConfig');
  if (!isOpenAiCompatConfigured() || isBillingBlocked('openai_compat')) return null;
  const { callProvider } = await import('./aiRouter');
  const { openAiCompatChat } = await import('./openaiCompatClient');
  try {
    const res: any = await callProvider('openai_compat', 'internal', signal => openAiCompatChat({ messages, signal, maxTokens: 500 }));
    const text = String(res?.choices?.[0]?.message?.content || '').trim();
    return text ? { text, model: String(res?.model || '') } : null;
  } catch {
    return null;
  }
};

export async function generateOutreachDraft(s: ScoredSupplier, canal: OutreachChannel, chat: DraftChat = groqDraftChat): Promise<OutreachDraft> {
  try {
    const out = await chat(buildOutreachMessages(s, canal));
    if (out?.text) {
      const parsed = parseModelDraft(out.text, canal);
      if (isAcceptableDraft(parsed.mensaje)) {
        return { canal, asunto: canal === 'email' ? (parsed.asunto || `Solicitud de tarifas netas para agencia — ${s.nombre}`) : null, mensaje: parsed.mensaje, generadoPor: 'groq', modelo: out.model };
      }
    }
  } catch { /* plantilla */ }
  return templateOutreachDraft(s, canal);
}

export async function buildOutreachSuggestions(entries: Entry[], filters: OutreachFilters, chat: DraftChat = groqDraftChat) {
  const ranked = rankSuppliers(entries, filters);
  const suggestions = [];
  for (let i = 0; i < ranked.length; i++) {
    const s = ranked[i];
    const canal: OutreachChannel = filters.canal || s.canalSugerido || 'whatsapp';
    // Secuencial y acotado: respeta el límite de solicitudes por minuto del plan gratuito.
    const borrador = i < filters.drafts ? await generateOutreachDraft(s, canal, chat) : null;
    suggestions.push({ ...s, borrador });
  }
  return suggestions;
}
