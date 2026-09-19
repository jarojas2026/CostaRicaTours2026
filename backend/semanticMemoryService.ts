/**
 * Semantic + lexical operational memory.
 * Step 1: embeddings are optional; lexical retrieval remains the safe fallback.
 */
import { GoogleGenAI } from '@google/genai';
import { randomUUID } from 'crypto';

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const MAX_DIMENSIONS = 3072;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

async function embed(text: string): Promise<number[] | null> {
  if (!process.env.GEMINI_API_KEY || !text.trim()) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text.slice(0, 8000)
    });
    const values = (result as any)?.embeddings?.[0]?.values || (result as any)?.embedding?.values;
    return Array.isArray(values) ? values.slice(0, MAX_DIMENSIONS).map(Number) : null;
  } catch {
    return null;
  }
}

export async function indexSemanticMemory(input: {
  sessionId: string;
  text: string;
  role: 'user' | 'assistant';
  agentId?: string;
  timestamp: string;
}) {
  const { getFirestoreDb } = await import('./bookingService');
  const db = getFirestoreDb();
  if (!db) return { indexed: false, reason: 'firestore_unavailable' };
  const vector = await embed(input.text);
  if (!vector) return { indexed: false, reason: 'embedding_unavailable' };

  const id = randomUUID();
  await db.collection('agent_memory_vectors').doc(id).set({
    id,
    sessionId: input.sessionId,
    text: input.text.slice(0, 4000),
    role: input.role,
    agentId: input.agentId || null,
    timestamp: input.timestamp,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    model: EMBEDDING_MODEL,
    dimensions: vector.length,
    embedding: vector
  });
  return { indexed: true, id, dimensions: vector.length };
}

export async function retrieveSemanticMemory(sessionId: string, query: string, limit = 8) {
  const { getFirestoreDb } = await import('./bookingService');
  const db = getFirestoreDb();
  if (!db) return [];
  const q = await embed(query);
  if (!q) return [];

  const snap = await db.collection('agent_memory_vectors')
    .where('sessionId', '==', sessionId)
    .limit(250)
    .get();

  const now = Date.now();
  return snap.docs
    .map(doc => {
      const x = doc.data() as any;
      return { ...x, score: cosineSimilarity(q, Array.isArray(x.embedding) ? x.embedding : []) };
    })
    .filter(x => (!x.expiresAt || new Date(x.expiresAt).getTime() > now) && x.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(12, Math.max(1, limit)))
    .map(({ embedding, ...x }) => x);
}
