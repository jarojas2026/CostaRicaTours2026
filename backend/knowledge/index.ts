/**
 * Base de conocimiento del asistente (RAG lite): recuperación BM25 local sobre datos del
 * repositorio, sin servicios de pago, sin embeddings y sin red. El índice se construye
 * perezosamente una vez por proceso.
 *
 * Uso: buildKnowledgeContext(mensaje, idioma) devuelve un bloque de texto acotado con los
 * fragmentos relevantes y la instrucción de responder solo con esos datos. Ningún fragmento
 * contiene identidad de proveedores (ver sources.ts).
 */
import { Bm25Index } from './bm25';
import { buildKnowledgeDocs, type KnowledgeDoc, type KnowledgeKind } from './sources';

export type { KnowledgeDoc, KnowledgeKind } from './sources';
export { tokenize, Bm25Index } from './bm25';

export interface KnowledgeSnippet { id: string; kind: KnowledgeKind; title: string; text: string; source: string; score: number }

let cache: { docs: Map<string, KnowledgeDoc>; index: Bm25Index } | null = null;

function ensureIndex() {
  if (cache) return cache;
  const docs = buildKnowledgeDocs();
  const index = new Bm25Index(docs.map(d => ({
    // El título pesa doble; se indexan ambos idiomas para consultas mixtas.
    id: d.id, text: `${d.title.es} ${d.title.es} ${d.title.en} ${d.title.en} ${d.body.es} ${d.body.en} ${d.keywords || ''}`,
  })));
  cache = { docs: new Map(docs.map(d => [d.id, d])), index };
  return cache;
}

/** Solo para pruebas: fuerza la reconstrucción del índice. */
export function resetKnowledgeIndex() { cache = null; }

export function knowledgeIndexSize() { return ensureIndex().index.size; }

export function retrieveKnowledge(query: string, opts: { language?: string; limit?: number; maxTours?: number; minScore?: number } = {}): KnowledgeSnippet[] {
  const lang = opts.language === 'en' ? 'en' : 'es';
  const limit = Math.max(1, Math.min(10, opts.limit ?? 5));
  const maxTours = Math.max(0, opts.maxTours ?? 3);
  const minScore = opts.minScore ?? 1;
  const { docs, index } = ensureIndex();
  const out: KnowledgeSnippet[] = [];
  let tours = 0;
  for (const hit of index.search(String(query || '').slice(0, 500), limit * 4)) {
    if (hit.score < minScore) break;
    const doc = docs.get(hit.id);
    if (!doc) continue;
    // Variedad: sin limitar tours, el catálogo (~590) taparía políticas y guías.
    if (doc.kind === 'tour') { if (tours >= maxTours) continue; tours++; }
    out.push({ id: doc.id, kind: doc.kind, title: doc.title[lang], text: doc.body[lang], source: doc.source, score: hit.score });
    if (out.length >= limit) break;
  }
  return out;
}

/** Instrucción de anclaje que acompaña siempre a los fragmentos. */
export function knowledgeGroundingRule(language?: string) {
  return language === 'en'
    ? 'Answer ONLY from these knowledge snippets, tool results and verified context. If the answer is not there, say you do not have that information and offer a quote or a human follow-up. Never name or describe suppliers/operators.'
    : 'Responde SOLO con estos fragmentos, los resultados de herramientas y el contexto verificado. Si la respuesta no está ahí, di que no tienes esa información y ofrece cotización o seguimiento humano. Nunca nombres ni describas proveedores/operadores.';
}

/**
 * Bloque de contexto para inyectar antes de llamar al modelo. Acotado en caracteres
 * (el plan gratuito de Groq limita tokens por minuto). Cadena vacía si no hay coincidencias.
 */
export function buildKnowledgeContext(query: string, language?: string, opts: { maxChars?: number; limit?: number } = {}): string {
  const maxChars = Math.max(300, Math.min(6000, opts.maxChars ?? 1600));
  let snippets: KnowledgeSnippet[];
  try { snippets = retrieveKnowledge(query, { language, limit: opts.limit ?? 5 }); } catch { return ''; }
  if (!snippets.length) return '';
  const header = `${language === 'en' ? 'KNOWLEDGE BASE (internal, verified)' : 'BASE DE CONOCIMIENTO (interna, verificada)'}:\n${knowledgeGroundingRule(language)}\n`;
  let body = '';
  for (const s of snippets) {
    const line = `- [${s.kind}] ${s.title}: ${s.text}\n`;
    if (header.length + body.length + line.length > maxChars) {
      const room = maxChars - header.length - body.length;
      if (room > 120) body += `${line.slice(0, room - 2)}…\n`;
      break;
    }
    body += line;
  }
  return body ? `${header}${body}`.trimEnd() : '';
}
