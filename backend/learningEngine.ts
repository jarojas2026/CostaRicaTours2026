import { getFirestoreDb } from './bookingService';
import { GoogleGenAI } from '@google/genai';

export type LearningEvent = {
  sessionId?: string;
  agentId: string;
  input: string;
  output?: string;
  outcome: 'success' | 'partial' | 'failure' | 'human_corrected';
  reward: number;
  feedback?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
};

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

export async function recordLearningEvent(event: LearningEvent) {
  const db = getFirestoreDb();
  const normalized = { ...event, reward: clamp(Number(event.reward || 0), -1, 1), createdAt: event.createdAt || new Date().toISOString() };
  if (db) await db.collection('ai_learning_events').add(normalized);
  return normalized;
}

export async function buildTrainingExamples(limit = 100) {
  const db = getFirestoreDb();
  if (!db) return [];
  const snap = await db.collection('ai_learning_events').orderBy('createdAt', 'desc').limit(Math.min(limit, 500)).get();
  return snap.docs.map(d => {
    const x = d.data() as any;
    return {
      instruction: x.input || '',
      response: x.output || '',
      reward: Number(x.reward || 0),
      outcome: x.outcome || 'unknown',
      feedback: x.feedback || ''
    };
  });
}

export async function runLearningReflection(limit = 40) {
  const examples = await buildTrainingExamples(limit);
  if (!examples.length) return { learned: false, lessons: [], examples: 0 };
  if (!process.env.GEMINI_API_KEY) return { learned: true, lessons: ['Datos de aprendizaje recopilados; falta GEMINI_API_KEY para reflexión semántica.'], examples: examples.length };

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Analiza estos ejemplos operativos de un sistema de agentes turísticos. No inventes hechos. Devuelve JSON con lessons (máximo 8), failurePatterns (máximo 8), recommendedGuardrails (máximo 8) y highValueExamples (máximo 5). Las lecciones deben ser accionables, verificables y no contener PII innecesaria.\n\n${JSON.stringify(examples).slice(0, 50000)}`;
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  const text = response.text || '{}';
  let parsed: any = {};
  try { parsed = JSON.parse(text.replace(/^\`\`\`json\s*|\s*\`\`\`$/g, '')); } catch { parsed = { lessons: [text.slice(0, 1500)] }; }
  const db = getFirestoreDb();
  if (db) await db.collection('ai_learning_lessons').add({ ...parsed, examples: examples.length, createdAt: new Date().toISOString(), model: 'gemini-2.5-flash' });
  return { learned: true, examples: examples.length, ...parsed };
}
