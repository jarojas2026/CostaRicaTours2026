/**
 * Persistent operational memory for the Costa Rica Tours AI agents.
 * Server-side only: clients never receive direct Firestore access.
 */
import crypto from 'crypto';
import { getFirestoreDb } from './bookingService';

export type MemoryTurn = {
  role: 'user' | 'assistant';
  text: string;
  agentId?: string;
  timestamp: string;
};

export type OperationalMemory = {
  sessionId: string;
  summary: string;
  facts: Record<string, string>;
  preferences: string[];
  activeGoals: string[];
  decisions: string[];
  lastAgent?: string;
  lastUpdatedAt: string;
  turns: MemoryTurn[];
};

const MAX_TURNS = 80;
const MAX_TEXT = 4000;
const MAX_FACTS = 40;
const MAX_LIST = 30;

function safeSessionId(raw: string): string {
  const value = String(raw || '').trim().slice(0, 160);
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('sessionId inválido');
  }
  return value;
}

function cleanText(value: unknown, max = MAX_TEXT): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function tokenize(text: string): Set<string> {
  return new Set(
    cleanText(text, 10000)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3)
  );
}

function emptyMemory(sessionId: string): OperationalMemory {
  return {
    sessionId,
    summary: '',
    facts: {},
    preferences: [],
    activeGoals: [],
    decisions: [],
    lastUpdatedAt: new Date(0).toISOString(),
    turns: []
  };
}

export async function getOperationalMemory(rawSessionId: string): Promise<OperationalMemory> {
  const sessionId = safeSessionId(rawSessionId);
  const db = getFirestoreDb();
  if (!db) return emptyMemory(sessionId);

  const doc = await db.collection('agent_memory').doc(sessionId).get();
  if (!doc.exists) return emptyMemory(sessionId);

  const data = doc.data() || {};
  return {
    ...emptyMemory(sessionId),
    ...data,
    sessionId,
    facts: typeof data.facts === 'object' && data.facts ? data.facts : {},
    preferences: Array.isArray(data.preferences) ? data.preferences.slice(0, MAX_LIST) : [],
    activeGoals: Array.isArray(data.activeGoals) ? data.activeGoals.slice(0, MAX_LIST) : [],
    decisions: Array.isArray(data.decisions) ? data.decisions.slice(0, MAX_LIST) : [],
    turns: Array.isArray(data.turns) ? data.turns.slice(-MAX_TURNS) : []
  } as OperationalMemory;
}

function extractFacts(text: string, facts: Record<string, string>) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/i)?.[0];
  if (email) facts.email = email.toLowerCase();

  const phone = text.match(/(?:\\+?506[ -]?)?[0-9]{4}[ -]?[0-9]{4}/)?.[0];
  if (phone) facts.phone = phone;

  const date = text.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];
  if (date) facts.date = date;

  const pax = text.match(/\b(\d{1,2})\s*/(?:personas|pax|viajeros|people|passengers)\\b/i)?.[1];
  if (pax) facts.pax = pax;

  const name = text.match(/(?:me llamo|mi nombre es|soy|nombre(?: completo)? es)\\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+(?:\\s+[A-Za-zÁÉÍÓÚáéíóúñÑ]+){1,3})/i)?.[1];
  if (name) facts.customerName = cleanText(name, 160);

  const booking = text.match(/\\b(?:CRT-[A-Z0-9-]+|CR-PV-\\d+|CR-HLD-\\d+)\\b/i)?.[0];
  if (booking) facts.bookingId = booking.toUpperCase();

  const lower = text.toLowerCase();
  const prefs: string[] = [];
  if (/\\b(familia|familiar|niñ|bebe|bebé|children)\\b/i.test(lower)) prefs.push('viaje familiar');
  if (/\\b(privado|private|exclusivo)\\b/i.test(lower)) prefs.push('transporte privado');
  if (/\\b(aventura|adventure|rafting|canopy)\\b/i.test(lower)) prefs.push('aventura');
  if (/\\b(relaj|spa|termal|hot spring)\\b/i.test(lower)) prefs.push('relax/termales');
  if (/\\b(playa|beach)\\b/i.test(lower)) prefs.push('playa');
  if (/\\b(naturaleza|nature|bosque|wildlife)\\b/i.test(lower)) prefs.push('naturaleza');
  return prefs;
}

function deriveSummary(memory: OperationalMemory): string {
  const facts = Object.entries(memory.facts).map(([k, v]) => `${k}: ${v}`);
  const prefs = memory.preferences.slice(0, 8).join(', ');
  const goals = memory.activeGoals.slice(0, 5).join(', ');
  return [
    facts.length ? `Datos: ${facts.join('; ')}.` : '',
    prefs ? `Preferencias: ${prefs}.` : '',
    goals ? `Objetivos: ${goals}.` : ''
  ].filter(Boolean).join(' ');
}

export async function rememberTurn(
  rawSessionId: string,
  turn: Omit<MemoryTurn, 'timestamp'>,
  options: { agentId?: string; activeGoal?: string; decision?: string } = {}
): Promise<OperationalMemory> {
  const sessionId = safeSessionId(rawSessionId);
  const db = getFirestoreDb();
  const memory = await getOperationalMemory(sessionId);
  const text = cleanText(turn.text);
  const facts = { ...memory.facts };
  extractFacts(text, facts);

  const preferences = Array.from(new Set([
    ...memory.preferences,
    ...extractFacts(text, {}).filter((p) => p)
  ])).slice(-MAX_LIST);

  const activeGoals = options.activeGoal
    ? Array.from(new Set([...memory.activeGoals, cleanText(options.activeGoal, 300)])).slice(-MAX_LIST)
    : memory.activeGoals;

  const decisions = options.decision
    ? Array.from(new Set([...memory.decisions, cleanText(options.decision, 300)])).slice(-MAX_LIST)
    : memory.decisions;

  const updated: OperationalMemory = {
    ...memory,
    facts: Object.fromEntries(Object.entries(facts).slice(-MAX_FACTS)),
    preferences,
    activeGoals,
    decisions,
    lastAgent: options.agentId || turn.agentId || memory.lastAgent,
    lastUpdatedAt: new Date().toISOString(),
    turns: [...memory.turns, { ...turn, text, timestamp: new Date().toISOString() }].slice(-MAX_TURNS)
  };
  updated.summary = deriveSummary(updated);

  if (db) {
    await db.collection('agent_memory').doc(sessionId).set(updated, { merge: true });
  }
  return updated;
}

export async function saveChatHistory(
  rawSessionId: string,
  history: Array<{ role?: string; sender?: string; text?: string; agentId?: string }>
): Promise<OperationalMemory> {
  const sessionId = safeSessionId(rawSessionId);
  const normalized = history
    .filter((h) => typeof h?.text === 'string')
    .slice(-MAX_TURNS)
    .map((h) => ({
      role: h.role === 'user' || h.sender === 'user' ? 'user' as const : 'assistant' as const,
      text: cleanText(h.text),
      agentId: h.agentId,
      timestamp: new Date().toISOString()
    }));

  let memory = emptyMemory(sessionId);
  for (const turn of normalized) {
    memory = await rememberTurn(sessionId, turn);
  }
  return memory;
}

export async function retrieveRelevantMemory(
  rawSessionId: string,
  query: string,
  limit = 8
): Promise<{ summary: string; facts: Record<string, string>; relevantTurns: MemoryTurn[] }> {
  const memory = await getOperationalMemory(rawSessionId);
  const queryTokens = tokenize(query);
  const scored = memory.turns
    .map((turn) => {
      const tokens = tokenize(turn.text);
      let score = 0;
      for (const token of queryTokens) if (tokens.has(token)) score++;
      return { turn, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 12)))
    .map((x) => x.turn);

  return { summary: memory.summary, facts: memory.facts, relevantTurns: scored };
}

export async function clearOperationalMemory(rawSessionId: string): Promise<void> {
  const sessionId = safeSessionId(rawSessionId);
  const db = getFirestoreDb();
  if (db) await db.collection('agent_memory').doc(sessionId).delete();
}

export function memoryFingerprint(rawSessionId: string): string {
  return crypto.createHash('sha256').update(safeSessionId(rawSessionId)).digest('hex').slice(0, 16);
}
