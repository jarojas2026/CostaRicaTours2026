/**
 * Búsqueda léxica BM25 local, sin dependencias, sin red y sin embeddings.
 * Pensada para unos pocos miles de documentos cortos (catálogo, políticas, guías).
 */

/** Palabras vacías ES/EN que no aportan a la relevancia. */
const STOPWORDS = new Set([
  'a', 'al', 'algo', 'como', 'con', 'cual', 'cuales', 'cuando', 'de', 'del', 'donde', 'el', 'ella', 'en', 'es', 'esa', 'ese', 'esta',
  'este', 'esto', 'hay', 'la', 'las', 'le', 'lo', 'los', 'me', 'mi', 'mas', 'muy', 'no', 'o', 'para', 'pero', 'por', 'que', 'quiero',
  'se', 'si', 'sin', 'su', 'sus', 'tiene', 'un', 'una', 'uno', 'unos', 'unas', 'y', 'ya', 'yo', 'puedo', 'hola', 'gracias',
  'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'a', 'an', 'it', 'i', 'my', 'me', 'we', 'you', 'can', 'do', 'does',
  'what', 'which', 'with', 'how', 'when', 'where', 'there', 'want', 'would', 'like', 'hi', 'hello', 'please', 'thanks', 'be', 'at',
]);

/** Minúsculas, sin tildes, solo letras/dígitos; descarta palabras vacías y tokens de 1 carácter. */
export function tokenize(text: unknown): string[] {
  const folded = String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const out: string[] = [];
  for (const raw of folded.split(/[^a-z0-9ñ]+/)) {
    if (raw.length < 2 || STOPWORDS.has(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}

/** Normalización mínima de plurales ES/EN ("tours"→"tour", "volcanes"→"volcan"). */
function stem(token: string): string {
  if (token.length > 5 && token.endsWith('es') && !token.endsWith('ses')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

export interface Bm25Doc { id: string; text: string }
export interface Bm25Hit { id: string; score: number }

export class Bm25Index {
  private readonly k1: number;
  private readonly b: number;
  private readonly docIds: string[] = [];
  private readonly docLens: number[] = [];
  private readonly postings = new Map<string, Array<[number, number]>>(); // término -> [docIdx, tf]
  private avgLen = 0;

  constructor(docs: Bm25Doc[], opts: { k1?: number; b?: number } = {}) {
    this.k1 = opts.k1 ?? 1.2;
    this.b = opts.b ?? 0.75;
    let total = 0;
    docs.forEach((doc, idx) => {
      const tokens = tokenize(doc.text);
      this.docIds.push(doc.id);
      this.docLens.push(tokens.length);
      total += tokens.length;
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
      for (const [term, count] of tf) {
        const list = this.postings.get(term);
        if (list) list.push([idx, count]); else this.postings.set(term, [[idx, count]]);
      }
    });
    this.avgLen = docs.length ? total / docs.length : 0;
  }

  get size() { return this.docIds.length; }

  search(query: string, limit = 5): Bm25Hit[] {
    const terms = [...new Set(tokenize(query))];
    if (!terms.length || !this.docIds.length) return [];
    const n = this.docIds.length;
    const scores = new Map<number, number>();
    for (const term of terms) {
      const list = this.postings.get(term);
      if (!list) continue;
      const idf = Math.log(1 + (n - list.length + 0.5) / (list.length + 0.5));
      for (const [idx, tf] of list) {
        const norm = tf + this.k1 * (1 - this.b + this.b * (this.docLens[idx] / (this.avgLen || 1)));
        scores.set(idx, (scores.get(idx) || 0) + idf * ((tf * (this.k1 + 1)) / norm));
      }
    }
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, Math.max(0, limit))
      .map(([idx, score]) => ({ id: this.docIds[idx], score: Math.round(score * 1000) / 1000 }));
  }
}
