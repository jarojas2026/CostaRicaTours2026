import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_EVENT_COLLECTION,
  AGENT_EVENT_DATA_MAX_KEYS,
  AGENT_EVENT_TYPES,
  hashIdentifier,
  logEvent,
  sanitizeEventData,
} from '../backend/agentEventLog';
import { PHASE_C_DECLARATIONS, PHASE_C_TOOL_REGISTRY, executePhaseCTool, isPhaseCTool } from '../backend/agentPhaseCRegistry';
import { AGENT_TOOL_REGISTRY, GEMINI_FUNCTION_DECLARATIONS, executeAgentTool } from '../backend/agentTools';
import { COMPAT_READ_ONLY_TOOLS, selectCompatTools } from '../backend/compatConcierge';
import { isTransactionalTool } from '../backend/voiceHandoffPolicy';

function fakeDb() {
  const writes: Array<{ collection: string; doc: Record<string, any> }> = [];
  return {
    writes,
    collection(name: string) {
      return {
        async add(doc: Record<string, any>) {
          writes.push({ collection: name, doc });
          return { id: `evt_${writes.length}` };
        },
      };
    },
  };
}

const FIXED = new Date('2026-10-27T12:00:00.000Z');

test('log_event guarda tipo, hash del lead, marca de tiempo del servidor y datos pequeños', async () => {
  const db = fakeDb();
  const res: any = await logEvent(
    { type: 'quote_requested', leadId: 'lead-123', data: { tourId: 'arenal-volcano', count: 2, urgent: true } },
    { sessionId: 'sess-abc', channel: 'chat', language: 'es' },
    { db, now: () => FIXED }
  );
  assert.equal(res.success, true);
  assert.equal(res.recorded, true);
  assert.equal(res.eventId, 'evt_1');
  assert.equal(db.writes.length, 1);
  const { collection, doc } = db.writes[0];
  assert.equal(collection, AGENT_EVENT_COLLECTION);
  assert.equal(doc.type, 'quote_requested');
  assert.equal(doc.timestamp, FIXED.toISOString());
  assert.equal(doc.leadIdHash, hashIdentifier('lead', 'lead-123'));
  assert.match(String(doc.leadIdHash), /^[a-f0-9]{32}$/);
  assert.equal(doc.sessionIdHash, hashIdentifier('session', 'sess-abc'));
  assert.deepEqual(doc.data, { tourId: 'arenal-volcano', count: 2, urgent: true });
  assert.equal(doc.channel, 'chat');
  assert.ok(doc.createdAt, 'createdAt de servidor');
  const json = JSON.stringify(doc);
  assert.ok(!json.includes('lead-123') && !json.includes('sess-abc'), 'ids en claro');
});

test('log_event nunca guarda nombres, correos ni teléfonos en claro', async () => {
  const db = fakeDb();
  const res: any = await logEvent(
    {
      type: 'handoff_requested',
      leadId: 'ana@example.com',
      data: {
        name: 'Ana Pérez',
        customerName: 'Ana Pérez',
        email: 'ana@example.com',
        phone: '+506 8888-7777',
        telefono: '88887777',
        whatsapp: 'wa.me/50688887777',
        note: 'escribime a ana@example.com',
        callback: '8888 7777',
        site: 'https://example.com',
        intent: 'quote',
      },
    },
    {},
    { db, now: () => FIXED }
  );
  assert.equal(res.success, true);
  const doc = db.writes[0].doc;
  assert.deepEqual(doc.data, { intent: 'quote' });
  assert.ok(doc.droppedKeys >= 9);
  const json = JSON.stringify(doc);
  assert.doesNotMatch(json, /Ana|P[ée]rez|@|8888|7777|wa\.me|https?:/i);
});

test('sanitizeEventData: solo primitivos, máximo de claves y textos cortos', () => {
  const many: Record<string, number> = {};
  for (let i = 0; i < 20; i++) many[`k${i}`] = i;
  const { data, dropped } = sanitizeEventData(many);
  assert.equal(Object.keys(data).length, AGENT_EVENT_DATA_MAX_KEYS);
  assert.equal(dropped.length, 20 - AGENT_EVENT_DATA_MAX_KEYS);
  const nested = sanitizeEventData({ obj: { a: 1 }, arr: [1], nul: null, ok: 'x'.repeat(500), 'bad key': 'v' });
  assert.deepEqual(Object.keys(nested.data), ['ok']);
  assert.ok(String(nested.data.ok).length <= 80);
  assert.deepEqual(sanitizeEventData('texto').data, {});
  assert.deepEqual(sanitizeEventData([1, 2]).data, {});
});

test('log_event rechaza tipos fuera de la lista cerrada y no escribe', async () => {
  const db = fakeDb();
  const res: any = await logEvent({ type: 'drop_database' }, {}, { db });
  assert.equal(res.success, false);
  assert.equal(res.error, 'invalid_event_type');
  assert.deepEqual(res.allowedTypes, [...AGENT_EVENT_TYPES]);
  assert.equal(db.writes.length, 0);
});

test('log_event sin Firestore (modo contrato offline) no lanza y responde recorded:false', async () => {
  const res: any = await logEvent({ type: 'conversation_started' });
  assert.equal(res.success, false);
  assert.equal(res.recorded, false);
  assert.equal(res.error, 'storage_unavailable');
  const failing = { collection: () => ({ add: async () => { throw new Error('boom'); } }) };
  const res2: any = await logEvent({ type: 'other' }, {}, { db: failing });
  assert.equal(res2.error, 'storage_write_failed');
});

test('log_event está en el registro (sideEffect), en las declaraciones y fuera del concierge de solo lectura', async () => {
  assert.equal(isPhaseCTool('log_event'), true);
  assert.equal(PHASE_C_TOOL_REGISTRY.log_event.sideEffect, true);
  assert.equal((AGENT_TOOL_REGISTRY as any).log_event.sideEffect, true);
  const decl: any = PHASE_C_DECLARATIONS.find(d => d.name === 'log_event');
  assert.ok(decl);
  assert.deepEqual(decl.parameters.required, ['type']);
  assert.ok(Object.keys(decl.parameters.properties.data.properties).length > 0, 'OBJECT con propiedades');
  assert.ok(GEMINI_FUNCTION_DECLARATIONS.some((d: any) => d.name === 'log_event'));
  assert.ok(!(COMPAT_READ_ONLY_TOOLS as readonly string[]).includes('log_event'));
  const selected = selectCompatTools(GEMINI_FUNCTION_DECLARATIONS as any, AGENT_TOOL_REGISTRY as any).map(d => d.name);
  assert.ok(!selected.includes('log_event'));
  assert.equal(isTransactionalTool('log_event'), false);
  // Despacho por el registro: offline ⇒ no escribe y no lanza.
  const viaPhaseC: any = await executePhaseCTool('log_event', { type: 'product_viewed', data: { tourId: 'x' } }, { sessionId: 's1' });
  assert.equal(viaPhaseC.error, 'storage_unavailable');
  const viaRegistry: any = await executeAgentTool('log_event' as any, { type: 'nope' });
  assert.equal(viaRegistry.error, 'invalid_event_type');
});
