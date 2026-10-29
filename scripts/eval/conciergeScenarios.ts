/**
 * Evaluación offline del concierge (memoria + embudo de reserva) con Groq SIMULADO.
 * Sin red, sin Firestore, sin costo: create_quote / create_ticket y el modelo son dobles de prueba.
 *
 * Cada escenario es una conversación es/en. Se verifica:
 *  - llenado de slots (pide un dato a la vez y en orden; recuerda lo ya dicho),
 *  - ningún proveedor ni contacto de proveedor en las respuestas,
 *  - ningún precio inventado (todo monto debe venir del catálogo, la cotización o el cliente),
 *  - idioma de respuesta, y cotización o tiquete según corresponda.
 *
 * Uso: node --import tsx scripts/eval/concierge-eval.mjs  (o la prueba de contrato conciergeEval).
 */
import { applyAssistantTurn, applyUserTurn, detectLanguage, emptyConversationState, type ConversationState } from '../../backend/conversationState';
import { PRICE_TOKEN_FOR_EVAL, allowedAmounts, getFunnel, runFunnelTurn, shouldRunFunnel, type FunnelChat } from '../../backend/bookingFunnel';

export const EVAL_NOW = new Date('2026-10-28T20:00:00-06:00');
export const FAKE_SUPPLIERS = ['Rafting Secreto S.A.', 'Operadora Volcán Escondido', 'Canopy Oculto Ltda.'];

type Mode = 'deterministic' | 'llm';
type Adversary = 'none' | 'invent_price' | 'leak_supplier' | 'bad_quote_args' | 'save_details' | 'wrong_language';

export interface Scenario {
  id: string;
  lang: 'es' | 'en';
  mode: Mode;
  adversary?: Adversary;
  /** Para 'save_details': argumentos que el modelo simulado envía en el turno indicado (0-based). */
  saveOnTurn?: { turn: number; args: Record<string, unknown> };
  quoteBehavior?: 'ok' | 'unavailable' | 'leaky_ok';
  turns: string[];
  expect: {
    askedSequence?: Array<string | null>;
    finalSlots?: Partial<Record<'date' | 'pax' | 'zone' | 'adults' | 'children', unknown>>;
    quote?: boolean;
    ticket?: boolean;
    funnelNotStarted?: boolean;
  };
}

const qte = (n: number) => `QTE-20261028-${String(1000 + n).slice(-4)}`;

function makeTools(behavior: Scenario['quoteBehavior'], calls: string[]) {
  let n = 0;
  return {
    createQuote: async (input: any) => {
      calls.push(`quote:${input.tourId}:${input.date}:${input.pax}`);
      if (behavior === 'unavailable') return { success: false, created: false, error: 'price_not_available', next: 'create_ticket' };
      const { findCatalogTour } = await import('../../backend/agentProductTools');
      const unit = Number((findCatalogTour(input.tourId) as any)?.priceUSD) || 80;
      const base = { success: true, created: true, quoteNumber: qte(++n), tourId: input.tourId, date: input.date, pax: input.pax, currency: 'USD', unitPrice: unit, totalPrice: unit * input.pax, expiresAt: '2026-10-30T20:00:00.000Z' };
      // Un servicio defectuoso que filtrara datos internos no debe llegar al cliente (lista blanca).
      return behavior === 'leaky_ok' ? { ...base, providerName: FAKE_SUPPLIERS[0], supplierCostUSD: 1, internal: { marginUSD: 999 } } : base;
    },
    createTicket: async (input: any) => {
      calls.push(`ticket:${input.reason}`);
      return { success: true, created: true, ticketNumber: 'TCK-20261028-AB12' };
    },
  };
}

/** Groq simulado: lee el prompt del sistema y responde como lo haría un modelo con herramientas. */
function mockGroq(scenario: Scenario, turnRef: { i: number }): FunnelChat {
  return async ({ messages, tools }) => {
    const system = String(messages[0]?.content || '');
    const en = /Reply ONLY in English/.test(system);
    const last = messages[messages.length - 1];
    const model = 'openai/gpt-oss-120b';
    const toolCall = (name: string, args: Record<string, unknown>) => ({ model, choices: [{ message: { content: null, tool_calls: [{ id: `call_${name}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }] } }] });
    const say = (content: string) => ({ model, choices: [{ message: { content } }] });

    if (last.role === 'user' && tools) {
      if (scenario.adversary === 'save_details' && scenario.saveOnTurn?.turn === turnRef.i) return toolCall('save_booking_details', scenario.saveOnTurn.args);
      if (scenario.adversary === 'bad_quote_args' && turnRef.i === scenario.turns.length - 1) return toolCall('create_quote', { tourId: 'tour-inventado-xyz', pax: 99, date: '1999-01-01' });
    }
    if (last.role === 'tool') {
      const res = JSON.parse(last.content);
      if (res.quote) return say(en ? `Your quote ${res.quote.quoteNumber} is ready: total USD ${res.quote.totalPrice}.` : `Tu cotización ${res.quote.quoteNumber} está lista: total USD ${res.quote.totalPrice}.`);
      if (res.ticketNumber) return say(en ? `Our team will quote it; your request is ${res.ticketNumber}.` : `Nuestro equipo lo cotizará; tu solicitud es ${res.ticketNumber}.`);
    }
    // Tras save_booking_details el prompt del sistema ya trae el estado validado nuevo.
    const missing = system.match(/Missing next: (\w+)/)?.[1];
    const recs = system.match(/Recommended tours[^\n]*\n([\s\S]*?)\n(?:When the customer|RULES)/)?.[1] || '';
    const serverQuote = String(last.content || '').match(/\[SERVER create_quote result: (.*)\]$/)?.[1];
    let text: string;
    if (serverQuote) {
      const r = JSON.parse(serverQuote);
      text = r.quote ? (en ? `Quote ${r.quote.quoteNumber}: total USD ${r.quote.totalPrice}, valid 48 hours.` : `Cotización ${r.quote.quoteNumber}: total USD ${r.quote.totalPrice}, válida 48 horas.`)
        : r.ticketNumber ? (en ? `Our team will quote it (request ${r.ticketNumber}).` : `Nuestro equipo te lo cotizará (solicitud ${r.ticketNumber}).`)
          : (en ? 'I could not create the quote.' : 'No pude crear la cotización.');
    } else if (missing === 'zone') text = en ? 'Which area or activity would you like?' : '¿Qué zona o actividad te interesa?';
    else if (missing === 'date') text = en ? 'What date would you like?' : '¿Para qué fecha?';
    else if (missing === 'pax') text = en ? 'How many people?' : '¿Cuántas personas?';
    else if (missing === 'tour') text = `${en ? 'Options:' : 'Opciones:'}\n${recs}\n${en ? 'Which one?' : '¿Cuál prefieres?'}`;
    else text = en ? 'Let me prepare your quote.' : 'Preparo tu cotización.';

    if (scenario.adversary === 'invent_price') text += en ? ' It usually costs $999 per person, and there is a $45 park fee.' : ' Normalmente cuesta $999 por persona y hay una entrada de 45 dólares.';
    if (scenario.adversary === 'leak_supplier') text += en ? ` We book it with ${FAKE_SUPPLIERS[0]}, call +506 8888-1234 or visit www.rafting-secreto.cr.` : ` Lo hacemos con ${FAKE_SUPPLIERS[0]}, llama al +506 8888-1234 o visita www.rafting-secreto.cr.`;
    // Modelo que ignora el idioma pedido: el embudo debe responder igual en el idioma del cliente.
    if (scenario.adversary === 'wrong_language') text = en ? '¿Para qué fecha quieres el tour? Gracias por escribirnos.' : text;
    return say(text);
  };
}

export const SCENARIOS: Scenario[] = [
  { id: 'es-paso-a-paso', lang: 'es', mode: 'deterministic', turns: ['Quiero reservar un tour', 'En La Fortuna', 'el 15 de diciembre', 'somos 2 adultos', '1'],
    expect: { askedSequence: ['zone', 'date', 'pax', 'tour', 'done'], finalSlots: { zone: 'arenal', date: '2026-12-15', pax: 2 }, quote: true } },
  { id: 'en-step-by-step', lang: 'en', mode: 'deterministic', turns: ['I want to book a tour', 'Manuel Antonio please', 'November 20', 'we are 4 people', '2'],
    expect: { askedSequence: ['zone', 'date', 'pax', 'tour', 'done'], finalSlots: { zone: 'manuel_antonio', date: '2026-11-20', pax: 4 }, quote: true } },
  { id: 'es-todo-en-un-mensaje', lang: 'es', mode: 'deterministic', turns: ['Quiero reservar rafting en Turrialba para el 10 de enero, somos 3 personas', 'la primera'],
    expect: { askedSequence: ['tour', 'done'], finalSlots: { zone: 'turrialba', date: '2027-01-10', pax: 3 }, quote: true } },
  { id: 'en-all-in-one', lang: 'en', mode: 'deterministic', turns: ['Can I book a zipline tour in Monteverde on December 3 for 2 adults and 1 child?', '1'],
    expect: { askedSequence: ['tour', 'done'], finalSlots: { zone: 'monteverde', date: '2026-12-03', pax: 3, adults: 2, children: 1 }, quote: true } },
  { id: 'es-recuerda-y-no-repite', lang: 'es', mode: 'deterministic', turns: ['¿Cuánto cuesta un tour en Guanacaste?', 'somos 5 personas', 'el 2 de febrero', '3'],
    expect: { askedSequence: ['date', 'date', 'tour', 'done'], finalSlots: { zone: 'guanacaste', pax: 5, date: '2027-02-02' }, quote: true } },
  { id: 'es-sin-precio-abre-tiquete', lang: 'es', mode: 'deterministic', quoteBehavior: 'unavailable', turns: ['Quiero reservar en Tortuguero el 20 de diciembre para 2 personas', '1'],
    expect: { askedSequence: ['tour', 'done'], ticket: true, quote: false } },
  { id: 'en-no-price-ticket', lang: 'en', mode: 'deterministic', quoteBehavior: 'unavailable', turns: ['I would like to book something in the Osa Peninsula, December 12, 2 people', '2'],
    expect: { askedSequence: ['tour', 'done'], ticket: true, quote: false } },
  { id: 'es-servicio-filtra-proveedor', lang: 'es', mode: 'deterministic', quoteBehavior: 'leaky_ok', turns: ['Quiero cotizar canopy en Arenal para mañana, somos 2', '1'],
    expect: { askedSequence: ['tour', 'done'], quote: true } },
  { id: 'es-pregunta-general-no-embudo', lang: 'es', mode: 'deterministic', turns: ['¿Qué clima hace en Monteverde en diciembre?'],
    expect: { funnelNotStarted: true } },
  { id: 'en-general-question-no-funnel', lang: 'en', mode: 'deterministic', turns: ['What should I pack for the rainforest?'],
    expect: { funnelNotStarted: true } },
  { id: 'es-llm-paso-a-paso', lang: 'es', mode: 'llm', turns: ['Hola, quiero reservar', 'Arenal', 'el 5 de enero', 'dos adultos', '2'],
    expect: { askedSequence: ['zone', 'date', 'pax', 'tour', 'done'], finalSlots: { zone: 'arenal', date: '2027-01-05', pax: 2 }, quote: true } },
  { id: 'en-llm-step-by-step', lang: 'en', mode: 'llm', turns: ['Hi, I want to book a tour', 'Guanacaste', 'December 28', 'six people', 'the first one'],
    expect: { askedSequence: ['zone', 'date', 'pax', 'tour', 'done'], finalSlots: { zone: 'guanacaste', date: '2026-12-28', pax: 6 }, quote: true } },
  { id: 'es-llm-inventa-precio', lang: 'es', mode: 'llm', adversary: 'invent_price', turns: ['Quiero reservar en Monteverde', 'el 8 de diciembre', '3 personas', '1'],
    expect: { askedSequence: ['date', 'pax', 'tour', 'done'], quote: true } },
  { id: 'en-llm-invents-price', lang: 'en', mode: 'llm', adversary: 'invent_price', turns: ['I want to book in Manuel Antonio on December 1 for 2 people', '1'],
    expect: { askedSequence: ['tour', 'done'], quote: true } },
  { id: 'es-llm-filtra-proveedor', lang: 'es', mode: 'llm', adversary: 'leak_supplier', turns: ['Quiero reservar rafting en Turrialba', 'el 14 de enero', 'somos 4', '1'],
    expect: { askedSequence: ['date', 'pax', 'tour', 'done'], quote: true } },
  { id: 'en-llm-leaks-supplier', lang: 'en', mode: 'llm', adversary: 'leak_supplier', turns: ['Book a tour in Arenal for December 9, we are 2', '2'],
    expect: { askedSequence: ['tour', 'done'], quote: true } },
  { id: 'es-llm-argumentos-malos', lang: 'es', mode: 'llm', adversary: 'bad_quote_args', turns: ['Quiero reservar en Guanacaste el 3 de marzo para 2 personas', '1'],
    expect: { askedSequence: ['tour', 'done'], finalSlots: { pax: 2, date: '2027-03-03' }, quote: true } },
  { id: 'en-llm-structured-slots', lang: 'en', mode: 'llm', adversary: 'save_details', saveOnTurn: { turn: 2, args: { pax: 3, date: '2026-12-19' } },
    turns: ['I want to book a tour in Monteverde', 'next month sometime', 'the three of us on the 19th of December', '1'],
    expect: { askedSequence: ['date', 'date', 'tour', 'done'], finalSlots: { pax: 3, date: '2026-12-19' }, quote: true } },
  { id: 'es-llm-slots-invalidos', lang: 'es', mode: 'llm', adversary: 'save_details', saveOnTurn: { turn: 1, args: { pax: 500, date: '2020-01-01', zone: 'marte', tourId: 'tour-falso' } },
    turns: ['Quiero reservar en Arenal', 'para muchísimas personas el año pasado'],
    expect: { askedSequence: ['date', 'date'], finalSlots: { zone: 'arenal', pax: undefined, date: undefined } } },
  { id: 'es-llm-sin-tiquete-ok', lang: 'es', mode: 'llm', quoteBehavior: 'unavailable', turns: ['Quiero reservar en Tortuguero para el 22 de diciembre, somos 2', '1'],
    expect: { askedSequence: ['tour', 'done'], ticket: true, quote: false } },
  { id: 'en-llm-language-kept', lang: 'en', mode: 'llm', adversary: 'wrong_language', turns: ['Hello, I would like to book a tour', 'Arenal', 'January 7', '2 adults', '1'],
    expect: { askedSequence: ['zone', 'date', 'pax', 'tour', 'done'], quote: true } },
];

export interface ScenarioResult { id: string; passed: boolean; failures: string[]; replies: string[] }

const CONTACT = /(\+?506[\s-]?)?\b\d{4}[\s-]?\d{4}\b|@[a-z0-9-]+\.[a-z]{2,}|www\.|https?:\/\//i;

export async function runScenario(s: Scenario): Promise<ScenarioResult> {
  const failures: string[] = [];
  const replies: string[] = [];
  const calls: string[] = [];
  const tools = makeTools(s.quoteBehavior ?? 'ok', calls);
  const turnRef = { i: 0 };
  const chat = s.mode === 'llm' ? mockGroq(s, turnRef) : undefined;
  let state: ConversationState = emptyConversationState(EVAL_NOW);
  const asked: Array<string | null> = [];
  let funnelStarted = false;
  const groundTexts: string[] = [];
  for (let i = 0; i < s.turns.length; i++) {
    turnRef.i = i;
    const msg = s.turns[i];
    state = applyUserTurn(state, msg, EVAL_NOW, s.lang);
    if (!shouldRunFunnel(state, msg)) {
      asked.push(null);
      state = applyAssistantTurn(state, '(concierge normal)', EVAL_NOW);
      continue;
    }
    funnelStarted = true;
    const out = await runFunnelTurn({ message: msg, language: s.lang, state, sessionId: `eval_${s.id}` }, { ...tools, chat, now: () => EVAL_NOW, providerNames: FAKE_SUPPLIERS.slice(1) });
    state = applyAssistantTurn(out.state, out.reply, EVAL_NOW);
    const f = getFunnel(state);
    asked.push(f.lastAsked ?? null);
    replies.push(out.reply);
    groundTexts.push(...f.recommended.map(r => (r.referencePriceUSD !== null ? `USD ${r.referencePriceUSD}` : '')));
    if (f.quote) groundTexts.push(`USD ${f.quote.totalPrice} USD ${f.quote.unitPrice}`);
    if (state.slots.budget) groundTexts.push(`USD ${state.slots.budget.amount}`);

    // Sin proveedores ni contactos.
    for (const name of FAKE_SUPPLIERS) if (out.reply.includes(name)) failures.push(`turno ${i}: proveedor visible "${name}"`);
    if (CONTACT.test(out.reply.replace(/QTE-\d{8}-\w{4}|TCK-\d{8}-\w{4}|\d{4}-\d{2}-\d{2}/g, ''))) failures.push(`turno ${i}: contacto visible`);
    if (/S\.\s?A\.|Ltda/.test(out.reply)) failures.push(`turno ${i}: entidad legal visible`);
    // Sin precios inventados.
    const allowed = allowedAmounts(groundTexts);
    for (const tok of out.reply.match(PRICE_TOKEN_FOR_EVAL) || []) {
      const n = Number((tok.match(/\d[\d.,]*/) || [''])[0].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
      if (!allowed.has(Number(n.toFixed(2)))) failures.push(`turno ${i}: precio no anclado "${tok}"`);
    }
    // Idioma.
    const detected = detectLanguage(out.reply);
    if (detected && detected !== s.lang) failures.push(`turno ${i}: idioma ${detected} (esperado ${s.lang})`);
    // Una sola pregunta por turno mientras falten datos.
    if (f.lastAsked && f.lastAsked !== 'done' && (out.reply.match(/\?/g) || []).length > 1) failures.push(`turno ${i}: más de una pregunta`);
  }

  const e = s.expect;
  if (e.funnelNotStarted && funnelStarted) failures.push('el embudo arrancó sin intención de reserva');
  if (e.askedSequence && JSON.stringify(asked) !== JSON.stringify(e.askedSequence)) failures.push(`secuencia ${JSON.stringify(asked)} ≠ ${JSON.stringify(e.askedSequence)}`);
  for (const [k, v] of Object.entries(e.finalSlots || {})) {
    if ((state.slots as any)[k] !== v) failures.push(`slot ${k}=${JSON.stringify((state.slots as any)[k])} ≠ ${JSON.stringify(v)}`);
  }
  const f = getFunnel(state);
  if (e.quote === true && !f.quote) failures.push('no se creó la cotización');
  if (e.quote === false && f.quote) failures.push('cotización inesperada');
  if (e.ticket === true && !f.ticket) failures.push('no se abrió el tiquete');
  if (calls.filter(c => c.startsWith('quote:')).some(c => /tour-inventado|:99$|1999-01-01/.test(c))) failures.push('create_quote recibió argumentos del modelo sin validar');
  if (calls.filter(c => c.startsWith('quote:')).length > 1) failures.push('create_quote se llamó más de una vez');
  if (JSON.stringify(state).includes(FAKE_SUPPLIERS[0])) failures.push('el estado guardado contiene un proveedor');
  return { id: s.id, passed: failures.length === 0, failures, replies };
}

export async function runAllScenarios(): Promise<{ passed: number; total: number; results: ScenarioResult[] }> {
  const results: ScenarioResult[] = [];
  for (const s of SCENARIOS) results.push(await runScenario(s));
  return { passed: results.filter(r => r.passed).length, total: results.length, results };
}
