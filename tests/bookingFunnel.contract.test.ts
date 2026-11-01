import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyUserTurn, emptyConversationState } from '../backend/conversationState';
import {
  FUNNEL_TOOLS,
  applyBookingDetails,
  detectBookingIntent,
  getFunnel,
  guardFunnelReply,
  nextMissingSlot,
  parseTourChoice,
  recommendTours,
  runFunnelTurn,
  runQuoteStep,
  shouldRunFunnel,
  withFunnel,
} from '../backend/bookingFunnel';
import { findCatalogTour } from '../backend/agentProductTools';
import { runAllScenarios } from '../scripts/eval/conciergeScenarios';

const NOW = new Date('2026-10-28T20:00:00-06:00');
const fresh = () => emptyConversationState(NOW);

test('detecta intención de reserva es/en y no arranca con preguntas generales', () => {
  for (const m of ['Quiero reservar un tour', '¿Cuánto cuesta el rafting?', 'I want to book a zipline', 'How much for 2 people?', 'Quisiera cotizar']) assert.equal(detectBookingIntent(m), true, m);
  for (const m of ['¿Qué clima hace en diciembre?', 'What should I pack?', 'Hola']) assert.equal(detectBookingIntent(m), false, m);
  const active = withFunnel(fresh(), { active: true, recommended: [] });
  assert.equal(shouldRunFunnel(active, '3 personas'), true);
  assert.equal(shouldRunFunnel(active, 'no gracias, olvídalo'), false);
});

test('pide un dato a la vez en orden fijo: zona → fecha → personas → tour', () => {
  let s = fresh();
  assert.equal(nextMissingSlot(s.slots, getFunnel(s)), 'zone');
  s = applyUserTurn(s, 'en Arenal', NOW);
  assert.equal(nextMissingSlot(s.slots, getFunnel(s)), 'date');
  s = applyUserTurn(s, 'el 15 de diciembre', NOW);
  assert.equal(nextMissingSlot(s.slots, getFunnel(s)), 'pax');
  s = applyUserTurn(s, 'somos 2', NOW);
  assert.equal(nextMissingSlot(s.slots, getFunnel(s)), 'tour');
});

test('recomienda 2-3 tours reales del catálogo, sin proveedores ni traslados', () => {
  const recs = recommendTours({ zone: 'arenal', interests: ['canopy'], pax: 2 }, 'es');
  assert.ok(recs.length >= 2 && recs.length <= 3);
  for (const r of recs) {
    const tour: any = findCatalogTour(r.id);
    assert.ok(tour, `id real: ${r.id}`);
    assert.equal(tour.region, 'arenal');
    assert.notEqual(tour.category, 'services');
    assert.ok(r.referencePriceUSD === null || r.referencePriceUSD === tour.priceUSD);
  }
  assert.deepEqual(recommendTours({ zone: 'arenal' }, 'es', []), []);
  assert.equal(parseTourChoice('2', recs), recs[1].id);
  assert.equal(parseTourChoice('la primera', recs), recs[0].id);
  assert.equal(parseTourChoice('the third one', recs), recs[2]?.id);
});

test('valida los argumentos del modelo (fechas, personas, zona, tour inexistente)', () => {
  const r = applyBookingDetails(fresh(), { date: '2020-01-01', pax: 500, zone: 'marte', tourId: 'tour-falso', interests: ['nada'] }, NOW);
  assert.deepEqual(r.saved, []);
  assert.deepEqual(r.rejected.sort(), ['date', 'interests', 'pax', 'tourId', 'zone']);
  const ok = applyBookingDetails(fresh(), { date: '2026-12-01', adults: 2, children: 1, zone: 'monteverde', tourId: 'sjo-3-in-1-combo' }, NOW);
  assert.equal(ok.state.slots.pax, 3);
  assert.equal(ok.state.slots.date, '2026-12-01');
  assert.equal(getFunnel(ok.state).selectedTourId, 'sjo-3-in-1-combo');
  // Esquema estricto para Groq: zonas e intereses son enums cerrados.
  const props: any = FUNNEL_TOOLS[0].function.parameters.properties;
  assert.ok(Array.isArray(props.zone.enum) && props.zone.enum.includes('arenal'));
});

test('create_quote usa los datos del estado, filtra campos internos y no se repite', async () => {
  let s = applyBookingDetails(fresh(), { date: '2026-12-01', pax: 2, zone: 'san_jose', tourId: 'sjo-3-in-1-combo' }, NOW).state;
  const calls: any[] = [];
  const deps = {
    createQuote: async (input: any) => { calls.push(input); return { success: true, quoteNumber: 'QTE-20261028-0001', tourId: input.tourId, date: input.date, pax: input.pax, currency: 'USD', unitPrice: 145, totalPrice: 290, expiresAt: 'x', providerName: 'Secreto S.A.', internal: { marginUSD: 9 } }; },
  };
  const a = await runQuoteStep(s, { language: 'es' }, deps);
  s = a.state;
  assert.deepEqual(calls, [{ tourId: 'sjo-3-in-1-combo', date: '2026-12-01', pax: 2, currency: 'USD' }]);
  assert.doesNotMatch(JSON.stringify(s), /Secreto|marginUSD|providerName/);
  const b = await runQuoteStep(s, { language: 'es' }, deps);
  assert.equal(calls.length, 1);
  assert.equal((b.result as any).reused, true);
});

test('sin cotización posible abre create_ticket (sin datos personales en el resumen)', async () => {
  const s = applyBookingDetails(fresh(), { date: '2026-12-01', pax: 2, zone: 'san_jose', tourId: 'sjo-3-in-1-combo' }, NOW).state;
  const tickets: any[] = [];
  const r = await runQuoteStep(s, { language: 'es' }, {
    createQuote: async () => ({ success: false, error: 'supplier_cost_unavailable', next: 'create_ticket' }),
    createTicket: async (input: any) => { tickets.push(input); return { success: true, ticketNumber: 'TCK-20261028-0001' }; },
  });
  assert.equal((r.result as any).ticketNumber, 'TCK-20261028-0001');
  assert.equal(tickets[0].reason, 'unresolved_question');
  assert.doesNotMatch(tickets[0].summary, /@|\d{7,}/);
  assert.equal(tickets[0].data.travelDate, '202612');
});

test('barrera de salida: sin precios inventados ni proveedores/contactos', () => {
  const g = guardFunnelReply('Cuesta $999 o USD 145. Lo opera Rafting Secreto S.A., tel +506 8888-1234, www.secreto.cr', ['precio de referencia USD 145 por persona'], 'es');
  assert.doesNotMatch(g.reply, /999|Secreto|8888|secreto\.cr/);
  assert.match(g.reply, /USD 145/);
  assert.match(g.reply, /precio por confirmar/);
  assert.ok(g.removedPrices >= 1);
});

test('sin modelo responde determinista en el idioma del cliente y con una sola pregunta', async () => {
  const s = applyUserTurn(fresh(), 'I want to book a tour', NOW, 'en');
  const out = await runFunnelTurn({ message: 'I want to book a tour', language: 'en', state: s }, { now: () => NOW });
  assert.match(out.reply, /Which area/);
  assert.equal((out.reply.match(/\?/g) || []).length, 1);
  assert.equal(out.modelUsed, 'booking_funnel');
  // Un modelo que falla no rompe el turno.
  const broken = await runFunnelTurn({ message: 'I want to book a tour', language: 'en', state: s }, { now: () => NOW, chat: async () => { throw new Error('429'); } });
  assert.match(broken.reply, /Which area/);
});

test('evaluación offline (Groq simulado): todos los escenarios en verde', async () => {
  const { passed, total, results } = await runAllScenarios();
  assert.ok(total >= 20, `escenarios: ${total}`);
  assert.equal(passed, total, results.filter(r => !r.passed).map(r => `${r.id}: ${r.failures.join('; ')}`).join('\n'));
});

test('cableado: el embudo no corre en voz ni en solicitudes escaladas; no toca Stripe', () => {
  const svc = readFileSync('backend/aiAssistantService.ts', 'utf8');
  assert.match(svc, /if \(!options\.voiceChannel && options\.allowMutations !== false\)/);
  assert.match(svc, /funnelMod\.shouldRunFunnel\(state, message\)/);
  const funnel = readFileSync('backend/bookingFunnel.ts', 'utf8');
  assert.doesNotMatch(funnel, /stripe|checkout|payment_link/i);
});
