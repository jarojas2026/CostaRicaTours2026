import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  AGENT_QUOTE_COLLECTION,
  QUOTE_MIN_MARGIN_OVER_COST,
  QUOTE_VALIDITY_HOURS,
  buildQuoteNumber,
  createQuote,
  meetsMinimumMargin,
  quoteExpiresAt,
} from '../backend/agentQuote';
import { hashIdentifier } from '../backend/agentEventLog';
import { PHASE_C_DECLARATIONS, PHASE_C_TOOL_REGISTRY, executePhaseCTool, isPhaseCTool } from '../backend/agentPhaseCRegistry';
import { AGENT_TOOL_REGISTRY, GEMINI_FUNCTION_DECLARATIONS, executeAgentTool } from '../backend/agentTools';
import { COMPAT_READ_ONLY_TOOLS, selectCompatTools } from '../backend/compatConcierge';
import { isTransactionalTool } from '../backend/voiceHandoffPolicy';

const PROVIDER_ID = 'op-secreto-123';
const PROVIDER_NAME = 'Operador Secreto S.A.';
const TOUR_ID = 'tour-prueba-cotizacion';

/** Firestore falso: `tours`, `operators`/`proveedores` sembrados; registra las escrituras. */
function fakeDb(seed: { tours?: Record<string, any>; operators?: Record<string, any>; proveedores?: Record<string, any> } = {}) {
  const store: Record<string, Record<string, any>> = {
    tours: seed.tours ?? {},
    operators: seed.operators ?? {},
    proveedores: seed.proveedores ?? {},
  };
  const writes: Array<{ collection: string; doc: Record<string, any> }> = [];
  const snap = (id: string, data: any) => ({ exists: data !== undefined, id, data: () => data });
  return {
    writes,
    collection(name: string) {
      const col = store[name] ?? {};
      return {
        async add(doc: Record<string, any>) {
          writes.push({ collection: name, doc });
          return { id: `qte_${writes.length}` };
        },
        doc(id: string) {
          return { async get() { return snap(id, col[id]); } };
        },
        where(field: string, _op: '==', value: unknown) {
          return {
            limit(n: number) {
              return {
                async get() {
                  const docs = Object.entries(col).filter(([, d]) => d?.[field] === value).slice(0, n).map(([id, d]) => snap(id, d));
                  return { size: docs.length, docs };
                },
              };
            },
          };
        },
      };
    },
  };
}

function offer(overrides: Record<string, any> = {}) {
  return { id: TOUR_ID, providerId: PROVIDER_ID, operatorId: PROVIDER_ID, priceUSD: 100, childPriceUSD: 70, catalogStatus: 'bookable', isDemoData: false, ...overrides };
}
function operator(commissionRate: unknown, overrides: Record<string, any> = {}) {
  return { name: PROVIDER_NAME, email: 'ventas@secreto.example', commissionRate, verified: true, active: true, status: 'active', activeTours: [], ...overrides };
}

// 10:00 del 27-oct-2026 en Costa Rica.
const FIXED = new Date('2026-10-27T16:00:00.000Z');
const deps = (db: any, hex = 'c0de') => ({ db, now: () => FIXED, randomHex: () => hex });

test('create_quote guarda cotización quoted con hash del lead, vencimiento 48 h y costo/margen solo en internal', async () => {
  const db = fakeDb({ tours: { [TOUR_ID]: offer() }, operators: { [PROVIDER_ID]: operator(0.25) } });
  const res: any = await createQuote(
    { tourId: TOUR_ID, date: '2026-11-15', pax: 3, currency: 'usd', leadId: 'lead-777' },
    { sessionId: 'sess-xyz', channel: 'chat', language: 'es' },
    deps(db)
  );
  assert.equal(res.success, true);
  assert.equal(res.created, true);
  assert.equal(res.quoteNumber, 'QTE-20261027-C0DE');
  assert.match(res.quoteNumber, /^QTE-\d{8}-[0-9A-F]{4}$/);
  assert.equal(res.status, 'quoted');
  assert.equal(res.currency, 'USD');
  assert.equal(res.unitPrice, 100);
  assert.equal(res.totalPrice, 300);
  assert.equal(res.timestamp, FIXED.toISOString());
  assert.equal(res.expiresAt, '2026-10-29T16:00:00.000Z');

  assert.equal(db.writes.length, 1);
  const { collection, doc } = db.writes[0];
  assert.equal(collection, AGENT_QUOTE_COLLECTION);
  assert.equal(collection, 'agent_quotes');
  assert.equal(doc.status, 'quoted');
  assert.equal(doc.tourId, TOUR_ID);
  assert.equal(doc.date, '2026-11-15');
  assert.equal(doc.pax, 3);
  assert.equal(doc.currency, 'USD');
  assert.equal(doc.clientPriceUSD, 300);
  assert.equal(doc.expiresAt, res.expiresAt);
  assert.equal(doc.leadIdHash, hashIdentifier('lead', 'lead-777'));
  assert.equal(doc.sessionIdHash, hashIdentifier('session', 'sess-xyz'));
  assert.ok(doc.createdAt, 'createdAt de servidor');
  assert.equal(doc.internal.providerId, PROVIDER_ID);
  assert.equal(doc.internal.supplierCostUSD, 225);
  assert.equal(doc.internal.marginUSD, 75);
  assert.equal(doc.internal.marginOverCost, 0.3333);
  assert.equal(doc.internal.minMarginOverCost, QUOTE_MIN_MARGIN_OVER_COST);
  const json = JSON.stringify(doc);
  assert.ok(!json.includes('lead-777') && !json.includes('sess-xyz'), 'ids en claro');
  assert.ok(!json.includes(PROVIDER_NAME), 'el nombre del proveedor no se copia a la cotización');
});

test('create_quote: margen mínimo 20 % sobre costo — rechaza (sin subir precio ni escribir) si no se cumple', async () => {
  assert.equal(QUOTE_MIN_MARGIN_OVER_COST, 0.2);
  // Comisión 15 % ⇒ costo 85, margen 15/85 = 17,6 % < 20 %.
  const low = fakeDb({ tours: { [TOUR_ID]: offer() }, operators: { [PROVIDER_ID]: operator(0.15) } });
  const r1: any = await createQuote({ tourId: TOUR_ID, date: '2026-11-15', pax: 2 }, {}, deps(low));
  assert.equal(r1.success, false);
  assert.equal(r1.created, false);
  assert.equal(r1.error, 'margin_below_minimum');
  assert.equal(r1.next, 'create_ticket');
  assert.equal(low.writes.length, 0);
  assert.equal(r1.totalPrice, undefined, 'no se publica un precio ajustado');
  assert.doesNotMatch(JSON.stringify(r1), /85|0\.15|op-secreto|Secreto/);

  // Comisión 1/6 ⇒ costo 500 sobre 600: margen exactamente 20 % ⇒ se acepta.
  const edge = fakeDb({ tours: { [TOUR_ID]: offer({ priceUSD: 600 }) }, proveedores: { [PROVIDER_ID]: { nombre: PROVIDER_NAME, comision: 1 / 6, verificado: true, activo: true } } });
  const r2: any = await createQuote({ tourId: TOUR_ID, date: '2026-11-15', pax: 1 }, {}, deps(edge));
  assert.equal(r2.success, true, JSON.stringify(r2));
  assert.equal(edge.writes[0].doc.internal.supplierCostUSD, 500);
  assert.equal(edge.writes[0].doc.internal.marginOverCost, 0.2);

  assert.equal(meetsMinimumMargin(120, 100), true);
  assert.equal(meetsMinimumMargin(119.99, 100), false);
  assert.equal(meetsMinimumMargin(100, 0), false);
});

test('create_quote no inventa costo: sin proveedor verificado/activo o sin comisión explícita ⇒ supplier_cost_unavailable', async () => {
  const cases = [
    fakeDb({ tours: { [TOUR_ID]: offer() } }),
    fakeDb({ tours: { [TOUR_ID]: offer() }, operators: { [PROVIDER_ID]: operator(undefined) } }),
    fakeDb({ tours: { [TOUR_ID]: offer() }, operators: { [PROVIDER_ID]: operator(0.3, { verified: false }) } }),
    fakeDb({ tours: { [TOUR_ID]: offer() }, operators: { [PROVIDER_ID]: operator(0.3, { status: 'inactivo' }) } }),
    fakeDb({ tours: { [TOUR_ID]: offer() }, operators: { [PROVIDER_ID]: operator(0.3, { activeTours: ['otro-tour'] }) } }),
  ];
  for (const db of cases) {
    const r: any = await createQuote({ tourId: TOUR_ID, date: '2026-11-15', pax: 2 }, {}, deps(db));
    assert.equal(r.error, 'supplier_cost_unavailable');
    assert.equal(r.next, 'create_ticket');
    assert.equal(db.writes.length, 0);
  }
});

test('create_quote vence exactamente 48 h después de la marca del servidor y numera con fecha de Costa Rica', async () => {
  assert.equal(QUOTE_VALIDITY_HOURS, 48);
  const late = new Date('2026-10-28T03:00:00.000Z'); // 21:00 del 27-oct en Costa Rica.
  assert.equal(quoteExpiresAt(late), '2026-10-30T03:00:00.000Z');
  assert.equal(buildQuoteNumber(late, 'ff'), 'QTE-20261027-00FF');
  const db = fakeDb({ tours: { [TOUR_ID]: offer() }, operators: { [PROVIDER_ID]: operator(0.3) } });
  const res: any = await createQuote({ tourId: TOUR_ID, date: '2026-10-27', pax: 1 }, {}, { db, now: () => late, randomHex: () => 'ab12' });
  assert.equal(res.success, true, JSON.stringify(res));
  assert.equal(Date.parse(res.expiresAt) - Date.parse(res.timestamp), 48 * 60 * 60 * 1000);
  assert.equal(db.writes[0].doc.expiresAt, res.expiresAt);
  assert.equal(res.quoteNumber, 'QTE-20261027-AB12');
});

test('create_quote nunca devuelve nombre, id, costo, comisión ni margen del proveedor', async () => {
  const db = fakeDb({ tours: { [TOUR_ID]: offer({ operatorName: PROVIDER_NAME }) }, operators: { [PROVIDER_ID]: operator(0.3) } });
  const res: any = await createQuote({ tourId: TOUR_ID, date: '2026-12-01', pax: 4, leadId: 'lead-1' }, {}, deps(db));
  assert.equal(res.success, true);
  assert.deepEqual(Object.keys(res).sort(), [
    'created', 'currency', 'date', 'expiresAt', 'message', 'pax', 'quoteId', 'quoteNumber', 'status', 'success', 'timestamp', 'totalPrice', 'tourId', 'unitPrice',
  ].sort());
  const out = JSON.stringify(res);
  assert.doesNotMatch(out, /op-secreto|Secreto|secreto\.example|provider|operator|supplier|commission|margin|cost|internal/i);
  assert.ok(!out.includes('280'), 'costo 400×0,7 = 280 no aparece');
  assert.ok(!out.includes('lead-1'));
  // Lo mismo a través del despacho del registro.
  const dbServer = fakeDb({ tours: { [TOUR_ID]: offer() }, operators: { [PROVIDER_ID]: operator(0.3) } });
  const direct: any = await createQuote({ tourId: TOUR_ID, date: '2026-12-01', pax: 4 }, {}, deps(dbServer));
  assert.doesNotMatch(JSON.stringify(direct), /internal|supplier|providerId/);
});

test('create_quote valida entrada sin escribir', async () => {
  const db = fakeDb({ tours: { [TOUR_ID]: offer({ maxGroupSize: 6 }) }, operators: { [PROVIDER_ID]: operator(0.3) } });
  const base = { tourId: TOUR_ID, date: '2026-11-15', pax: 2 };
  const err = async (patch: Record<string, unknown>) => ((await createQuote({ ...base, ...patch }, {}, deps(db))) as any).error;
  assert.equal(await err({ currency: 'CRC' }), 'unsupported_currency');
  assert.equal(await err({ date: '2026-10-26' }), 'invalid_date');
  assert.equal(await err({ date: '15/11/2026' }), 'invalid_date');
  assert.equal(await err({ date: '2026-02-30' }), 'invalid_date');
  assert.equal(await err({ date: '2030-01-01' }), 'date_out_of_range');
  assert.equal(await err({ pax: 0 }), 'invalid_pax');
  assert.equal(await err({ pax: 2.5 }), 'invalid_pax');
  assert.equal(await err({ pax: 7 }), 'invalid_pax');
  assert.equal(await err({ tourId: 'no-existe' }), 'tour_not_found');
  assert.equal(await err({ tourId: '../x' }), 'tour_not_found');
  assert.equal(db.writes.length, 0);

  // Oferta sin precio, no publicable o de demostración ⇒ no se cotiza.
  for (const t of [offer({ priceUSD: 0 }), offer({ catalogStatus: 'inquiry' }), offer({ isDemoData: true }), offer({ providerId: '' })]) {
    const d = fakeDb({ tours: { [TOUR_ID]: t }, operators: { [PROVIDER_ID]: operator(0.3) } });
    const r: any = await createQuote(base, {}, deps(d));
    assert.equal(r.error, 'price_not_available');
    assert.equal(d.writes.length, 0);
  }
});

test('create_quote sin Firestore o con fallo de escritura no lanza', async () => {
  const res: any = await createQuote({ tourId: TOUR_ID, date: '2026-11-15', pax: 1 }, {}, { now: () => FIXED });
  assert.equal(res.success, false);
  assert.equal(res.error, 'storage_unavailable');
  const failing: any = fakeDb({ tours: { [TOUR_ID]: offer() }, operators: { [PROVIDER_ID]: operator(0.3) } });
  const origCollection = failing.collection.bind(failing);
  failing.collection = (name: string) => ({ ...origCollection(name), add: async () => { throw new Error('boom'); } });
  const res2: any = await createQuote({ tourId: TOUR_ID, date: '2026-11-15', pax: 1 }, {}, deps(failing));
  assert.equal(res2.error, 'storage_write_failed');
  const res3: any = await createQuote({ tourId: TOUR_ID, date: '2026-11-15', pax: 1 }, {}, { db: fakeDb(), now: () => { throw new Error('clock'); } });
  assert.equal(res3.error, 'storage_write_failed');
});

test('create_quote está en el registro (sideEffect ⇒ bloqueado con allowMutations:false), fuera del concierge de solo lectura y bloqueado por voz', async () => {
  assert.equal(isPhaseCTool('create_quote'), true);
  assert.equal(PHASE_C_TOOL_REGISTRY.create_quote.sideEffect, true);
  assert.equal((AGENT_TOOL_REGISTRY as any).create_quote.sideEffect, true);
  const decl: any = PHASE_C_DECLARATIONS.find(d => d.name === 'create_quote');
  assert.ok(decl);
  assert.deepEqual(decl.parameters.required, ['tourId', 'date', 'pax']);
  assert.doesNotMatch(JSON.stringify(decl), /supplier|commission|margin/i);
  assert.ok(GEMINI_FUNCTION_DECLARATIONS.some((d: any) => d.name === 'create_quote'));
  assert.ok(!(COMPAT_READ_ONLY_TOOLS as readonly string[]).includes('create_quote'));
  const selected = selectCompatTools(GEMINI_FUNCTION_DECLARATIONS as any, AGENT_TOOL_REGISTRY as any).map(d => d.name);
  assert.ok(!selected.includes('create_quote'));
  assert.equal(isTransactionalTool('create_quote'), true);
  const assistant = fs.readFileSync(new URL('../backend/aiAssistantService.ts', import.meta.url), 'utf8');
  assert.match(assistant, /filter\(\(\[, tool\]\) => tool\.sideEffect\)/);
  assert.match(assistant, /options\.allowMutations === false && mutationTools\.has\(toolName\)/);
  // Despacho: offline ⇒ no escribe y no lanza.
  const viaPhaseC: any = await executePhaseCTool('create_quote', { tourId: TOUR_ID, date: '2099-01-01', pax: 1 }, { sessionId: 's1' });
  assert.equal(viaPhaseC.success, false);
  const viaRegistry: any = await executeAgentTool('create_quote' as any, { tourId: TOUR_ID, date: 'mañana', pax: 1 });
  assert.equal(viaRegistry.error, 'invalid_date');
});

test('create_quote no cobra, no envía mensajes, no usa servicios externos y la colección cae en el deny catch-all', () => {
  const src = fs.readFileSync(new URL('../backend/agentQuote.ts', import.meta.url), 'utf8');
  const imports = [...src.matchAll(/from '([^']+)'|import\('([^']+)'\)/g)].map(m => m[1] || m[2]);
  assert.deepEqual(imports.sort(), [
    './agentEventLog', './agentProductTools', './bookingService', './commerceCatalog', './commercePolicy', './providerPayoutPolicy', 'crypto', 'firebase-admin/firestore',
  ].sort());
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /fetch\(|sendMail|nodemailer|twilio|whatsapp\.send|axios|stripe|paypal|checkout\.sessions/i);
  const rules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.doesNotMatch(rules, /agent_quotes/);
});
