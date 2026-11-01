import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Bm25Index, tokenize } from '../backend/knowledge/bm25';
import { buildKnowledgeContext, knowledgeIndexSize, retrieveKnowledge } from '../backend/knowledge';
import { buildKnowledgeDocs } from '../backend/knowledge/sources';
import { buildCompatSystemPrompt } from '../backend/compatConcierge';
import { TOURS } from '../src/data/toursData';
import { LEGAL_CONTACT } from '../src/data/legalPages';

test('tokenize: sin tildes, sin palabras vacías, plurales simples', () => {
  assert.deepEqual(tokenize('¿Qué volcanes hay en Arenal?'), ['volcan', 'arenal']);
  assert.deepEqual(tokenize('The tours and the Cancelación'), ['tour', 'cancelacion']);
});

test('BM25 ordena por relevancia y respeta el límite', () => {
  const idx = new Bm25Index([
    { id: 'a', text: 'rafting rio pacuare rapidos' },
    { id: 'b', text: 'canopy monteverde bosque nuboso' },
    { id: 'c', text: 'rafting rafting balsa' },
  ]);
  const hits = idx.search('rafting', 5);
  assert.deepEqual(hits.map(h => h.id), ['c', 'a']);
  assert.equal(idx.search('rafting', 1).length, 1);
  assert.deepEqual(idx.search('zzz'), []);
  assert.deepEqual(idx.search(''), []);
});

test('el índice cubre catálogo, políticas, guías, ICT y red de proveedores', () => {
  const docs = buildKnowledgeDocs();
  const kinds = new Set(docs.map(d => d.kind));
  for (const k of ['tour', 'policy', 'guide', 'tourism_rule', 'ict', 'supplier_network']) assert.ok(kinds.has(k as any), k);
  assert.equal(docs.filter(d => d.kind === 'tour').length, TOURS.length);
  assert.equal(knowledgeIndexSize(), docs.length);
});

test('recupera lo relevante: cancelación, ICT, entrada al país y tours por actividad', () => {
  assert.equal(retrieveKnowledge('¿puedo cancelar y me devuelven el dinero?')[0].kind, 'policy');
  assert.equal(retrieveKnowledge('¿los operadores tienen declaratoria del ICT?')[0].id, 'ict:summary');
  assert.ok(retrieveKnowledge('passport entry requirements', { language: 'en' }).some(s => s.id === 'guide:entry'));
  const rafting = retrieveKnowledge('rafting en arenal');
  assert.ok(rafting.length > 0 && rafting.every(s => s.kind !== 'tour' || /rafting/i.test(s.text)));
  assert.ok(rafting.filter(s => s.kind === 'tour').length <= 3);
});

test('el contexto incluye la regla de anclaje, va acotado y vacío si no hay coincidencias', () => {
  const ctx = buildKnowledgeContext('política de cancelación', 'es');
  assert.match(ctx, /Responde SOLO con estos fragmentos/);
  assert.match(ctx, /di que no tienes esa información/);
  assert.ok(ctx.length <= 1600);
  assert.ok(buildKnowledgeContext('cancellation policy', 'en', { maxChars: 500 }).length <= 500);
  assert.match(buildKnowledgeContext('cancellation policy', 'en'), /Answer ONLY from these knowledge snippets/);
  assert.equal(buildKnowledgeContext('qqqq zzzz', 'es'), '');
});

test('ningún fragmento revela identidad de proveedores (nombres de operador ni contactos)', () => {
  const operatorNames = [...new Set(TOURS.map((t: any) => t.operatorName).filter((n: unknown): n is string => typeof n === 'string' && n.trim().length >= 4))];
  const docs = buildKnowledgeDocs();
  const shown = docs.map(d => `${d.title.es} ${d.title.en} ${d.body.es} ${d.body.en}`).join('\n');
  for (const name of operatorNames) assert.ok(!shown.includes(name), `operador expuesto: ${name}`);
  // El único correo permitido es el contacto propio publicado en la política de privacidad.
  assert.doesNotMatch(shown.split(LEGAL_CONTACT.email).join(''), /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  // Del directorio solo la forma pública: ni campos de identidad ni de contacto.
  const sources = readFileSync('backend/knowledge/sources.ts', 'utf8');
  assert.doesNotMatch(sources, /\.(nombre|razon_social|contacto|telefono|whatsapp|fuente_url)\b/);
});

test('el concierge Groq y el flujo de chat usan la base de conocimiento', () => {
  assert.match(buildCompatSystemPrompt(false), /KNOWLEDGE BASE/);
  const svc = readFileSync('backend/aiAssistantService.ts', 'utf8');
  assert.match(svc, /import\('\.\/knowledge'\)/);
  assert.match(svc, /buildKnowledgeContext\(message, language\)/);
});
