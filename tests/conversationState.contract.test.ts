import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CONVERSATION_RECENT_TURNS,
  CONVERSATION_STATE_COLLECTION,
  MEMORY_CONTEXT_MAX_CHARS,
  applyAssistantTurn,
  applyUserTurn,
  buildMemoryContext,
  conversationDocId,
  detectLanguage,
  emptyConversationState,
  estimateTokens,
  extractSlots,
  firestoreConversationStore,
  fitHistoryToBudget,
  loadConversationState,
  memoryConversationStore,
  recentHistory,
  redactConversationText,
  saveConversationState,
} from '../backend/conversationState';

const NOW = new Date('2026-10-28T20:00:00-06:00');

test('extrae fechas, personas, zona, intereses, presupuesto e idioma (es)', () => {
  const s = extractSlots('Hola, somos 2 adultos y 1 niño, queremos ir a La Fortuna del 10 al 15 de diciembre, presupuesto de $150 por persona, nos gusta el canopy', NOW);
  assert.deepEqual(s.dateRange, { from: '2026-12-10', to: '2026-12-15' });
  assert.equal(s.adults, 2);
  assert.equal(s.children, 1);
  assert.equal(s.pax, 3);
  assert.equal(s.zone, 'arenal');
  assert.deepEqual(s.interests, ['canopy']);
  assert.deepEqual(s.budget, { amount: 150, currency: 'USD', per: 'person' });
  assert.equal(s.language, 'es');
});

test('extrae preferencias en inglés y fechas relativas/sin año', () => {
  const s = extractSlots('Hi! We are 4 people going to Manuel Antonio on November 20, interested in zipline and wildlife', NOW);
  assert.equal(s.date, '2026-11-20');
  assert.equal(s.pax, 4);
  assert.equal(s.zone, 'manuel_antonio');
  assert.deepEqual(s.interests, ['canopy', 'wildlife']);
  assert.equal(s.language, 'en');
  assert.equal(extractSlots('para mañana, mi esposa y yo', NOW).date, '2026-10-29');
  assert.equal(extractSlots('mi esposa y yo', NOW).pax, 2);
  // Fecha ya pasada sin año ⇒ el año siguiente; "3 days" no son personas.
  assert.equal(extractSlots('el 15 de enero', NOW).date, '2027-01-15');
  assert.equal(extractSlots('we want to book for 3 days', NOW).pax, undefined);
  assert.equal(detectLanguage('¿Cuánto cuesta el tour?'), 'es');
  assert.equal(detectLanguage('How much is the tour?'), 'en');
});

test('el texto guardado no tiene correos, teléfonos, URLs ni nombres presentados; conserva fechas', () => {
  const t = redactConversationText('Me llamo Juan Pérez, correo juan@example.com, tel +506 8888-7777, https://x.co, fecha 2026-12-03');
  assert.doesNotMatch(t, /Juan|P[ée]rez|example\.com|8888|x\.co/);
  assert.match(t, /2026-12-03/);
});

test('ventana de turnos + resumen determinista de los viejos, con presupuesto de tokens', () => {
  let s = emptyConversationState(NOW);
  for (let i = 0; i < 15; i++) {
    s = applyUserTurn(s, `mensaje ${i} sobre playa en Guanacaste`, NOW);
    s = applyAssistantTurn(s, `respuesta ${i}`, NOW);
  }
  assert.equal(s.turns.length, CONVERSATION_RECENT_TURNS);
  assert.match(s.summary, /mensaje \d+ sobre playa/);
  assert.equal(s.slots.zone, 'guanacaste');
  const ctx = buildMemoryContext(s, 'es');
  assert.ok(ctx.length <= MEMORY_CONTEXT_MAX_CHARS);
  assert.match(ctx, /no vuelvas a preguntar/);
  const hist = recentHistory(applyUserTurn(s, 'último', NOW), { excludeLastUser: true });
  assert.ok(hist.length > 0 && hist[hist.length - 1].text !== 'último');
  // Memoria + historial se mantienen muy por debajo de 8K tokens/min de Groq Free.
  assert.ok(estimateTokens(ctx) + estimateTokens(hist.map(h => h.text).join(' ')) < 1200);
  const long = Array.from({ length: 20 }, (_, i) => ({ role: 'user', text: 'x'.repeat(500) + i }));
  assert.ok(fitHistoryToBudget(long).reduce((n, h) => n + h.text.length, 0) <= 2400);
});

test('las preferencias se recuerdan entre turnos (lo nuevo reemplaza, intereses se acumulan)', () => {
  let s = applyUserTurn(emptyConversationState(NOW), 'Queremos ir a Monteverde, somos 3 personas', NOW);
  s = applyUserTurn(s, 'nos interesa el canopy', NOW);
  s = applyUserTurn(s, 'mejor somos 4 personas y también fauna', NOW);
  assert.equal(s.slots.zone, 'monteverde');
  assert.equal(s.slots.pax, 4);
  assert.deepEqual(s.slots.interests, ['canopy', 'wildlife']);
});

test('almacén: id con hash (nunca la sesión en claro), vencimiento y respaldo en memoria', async () => {
  const store = memoryConversationStore();
  const session = 'web_session_abc123';
  const s = applyUserTurn(emptyConversationState(NOW), 'somos 2 en Tortuguero, mi correo es a@b.com', NOW);
  assert.equal(await saveConversationState(session, s, { store }), true);
  const id = conversationDocId(session)!;
  assert.match(id, /^[a-f0-9]{32}$/);
  const raw = await store.get(id);
  assert.ok(raw);
  assert.doesNotMatch(JSON.stringify(raw), /web_session_abc123|a@b\.com/);
  assert.equal(raw!.sessionIdHash, id);
  const loaded = await loadConversationState(session, { store, now: () => NOW });
  assert.equal(loaded.slots.zone, 'tortuguero');
  // Vencido ⇒ estado nuevo.
  const later = new Date(NOW.getTime() + 8 * 86_400_000);
  assert.deepEqual((await loadConversationState(session, { store, now: () => later })).slots, {});
  // Sin sesión ⇒ no se guarda.
  assert.equal(await saveConversationState('', s, { store }), false);
});

test('almacén Firestore: colección solo servidor, Timestamp para TTL y sin undefined', async () => {
  const writes: Array<{ col: string; id: string; data: any }> = [];
  const db = { collection: (col: string) => ({ doc: (id: string) => ({
    get: async () => ({ exists: false, data: () => undefined }),
    set: async (data: any) => { writes.push({ col, id, data }); },
  }) }) };
  const store = firestoreConversationStore(db);
  await store.set('abc', { expiresAt: NOW.toISOString(), slots: { zone: undefined, pax: 2 } });
  assert.equal(writes[0].col, CONVERSATION_STATE_COLLECTION);
  assert.ok(writes[0].data.expiresAtTs instanceof Date);
  assert.equal('zone' in writes[0].data.slots, false);
});

test('un fallo del almacén nunca rompe el chat', async () => {
  const broken = { get: async () => { throw new Error('down'); }, set: async () => { throw new Error('down'); } };
  const st = await loadConversationState('s1', { store: broken, now: () => NOW });
  assert.deepEqual(st.slots, {});
  assert.equal(await saveConversationState('s1', st, { store: broken }), false);
});

test('cableado: solo sesiones verificadas usan memoria; reglas Firestore intactas (Default Deny)', () => {
  const route = readFileSync('backend/routes/agents.ts', 'utf8');
  assert.match(route, /conversationMemory: Boolean\(memorySessionId\)/);
  const svc = readFileSync('backend/aiAssistantService.ts', 'utf8');
  assert.match(svc, /if \(!options\.conversationMemory \|\| !sessionId\) return processChatInquiryCore/);
  assert.match(svc, /options\.memoryContext/);
  const rules = readFileSync('firestore.rules', 'utf8');
  assert.doesNotMatch(rules, /agent_conversation_state/);
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
});
