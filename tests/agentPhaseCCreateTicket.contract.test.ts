import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  AGENT_TICKET_COLLECTION,
  AGENT_TICKET_PRIORITIES,
  AGENT_TICKET_REASONS,
  AGENT_TICKET_SUMMARY_MAX,
  buildTicketNumber,
  createTicket,
  sanitizeTicketSummary,
} from '../backend/agentSupportTicket';
import { hashIdentifier } from '../backend/agentEventLog';
import { PHASE_C_DECLARATIONS, PHASE_C_TOOL_REGISTRY, executePhaseCTool, isPhaseCTool } from '../backend/agentPhaseCRegistry';
import { AGENT_TOOL_REGISTRY, GEMINI_FUNCTION_DECLARATIONS, executeAgentTool } from '../backend/agentTools';
import { COMPAT_READ_ONLY_TOOLS, selectCompatTools } from '../backend/compatConcierge';

function fakeDb() {
  const writes: Array<{ collection: string; doc: Record<string, any> }> = [];
  return {
    writes,
    collection(name: string) {
      return {
        async add(doc: Record<string, any>) {
          writes.push({ collection: name, doc });
          return { id: `tck_${writes.length}` };
        },
      };
    },
  };
}

const FIXED = new Date('2026-10-27T12:00:00.000Z');

test('create_ticket guarda motivo, prioridad, hash del lead, resumen, hora del servidor y estado open', async () => {
  const db = fakeDb();
  const res: any = await createTicket(
    { reason: 'booking_issue', priority: 'high', leadId: 'lead-123', summary: 'Cliente no recibe confirmación de su tour', data: { tourId: 'arenal-volcano', count: 2 } },
    { sessionId: 'sess-abc', channel: 'chat', language: 'es' },
    { db, now: () => FIXED, randomHex: () => 'a1b2' }
  );
  assert.equal(res.success, true);
  assert.equal(res.created, true);
  assert.equal(res.ticketNumber, 'TCK-20261027-A1B2');
  assert.match(res.ticketNumber, /^TCK-\d{8}-[0-9A-F]{4}$/);
  assert.equal(res.status, 'open');
  assert.equal(db.writes.length, 1);
  const { collection, doc } = db.writes[0];
  assert.equal(collection, AGENT_TICKET_COLLECTION);
  assert.equal(collection, 'agent_support_tickets');
  assert.equal(doc.ticketNumber, res.ticketNumber);
  assert.equal(doc.reason, 'booking_issue');
  assert.equal(doc.priority, 'high');
  assert.equal(doc.status, 'open');
  assert.equal(doc.timestamp, FIXED.toISOString());
  assert.equal(doc.summary, 'Cliente no recibe confirmación de su tour');
  assert.equal(doc.leadIdHash, hashIdentifier('lead', 'lead-123'));
  assert.match(String(doc.leadIdHash), /^[a-f0-9]{32}$/);
  assert.equal(doc.sessionIdHash, hashIdentifier('session', 'sess-abc'));
  assert.deepEqual(doc.data, { tourId: 'arenal-volcano', count: 2 });
  assert.ok(doc.createdAt, 'createdAt de servidor');
  const json = JSON.stringify(doc);
  assert.ok(!json.includes('lead-123') && !json.includes('sess-abc'), 'ids en claro');
});

test('create_ticket: prioridad por defecto normal y fecha del número en hora de Costa Rica', async () => {
  const db = fakeDb();
  // 03:00 UTC del 28-oct = 21:00 del 27-oct en Costa Rica.
  const res: any = await createTicket(
    { reason: 'human_requested', summary: 'Quiere hablar con una persona' },
    {},
    { db, now: () => new Date('2026-10-28T03:00:00.000Z'), randomHex: () => 'ff' }
  );
  assert.equal(res.priority, 'normal');
  assert.equal(db.writes[0].doc.priority, 'normal');
  assert.equal(res.ticketNumber, 'TCK-20261027-00FF');
  assert.equal(db.writes[0].doc.leadIdHash, null);
  assert.equal(buildTicketNumber(new Date('2026-01-05T08:00:00Z'), 'abcd'), 'TCK-20260105-ABCD');
});

test('create_ticket nunca guarda correos, teléfonos, URLs ni claves de dato personal en claro', async () => {
  const db = fakeDb();
  const res: any = await createTicket(
    {
      reason: 'complaint',
      priority: 'normal',
      leadId: 'ana@example.com',
      summary: 'Reclamo: escribir a ana@example.com o al +506 8888-7777, ver https://example.com/x y wa.me/50688887777',
      data: { name: 'Ana Pérez', email: 'ana@example.com', telefono: '88887777', note: 'llamar 8888 7777', topic: 'refund' },
    },
    {},
    { db, now: () => FIXED, randomHex: () => '0001' }
  );
  assert.equal(res.success, true);
  const doc = db.writes[0].doc;
  assert.deepEqual(doc.data, { topic: 'refund' });
  assert.ok(doc.droppedKeys >= 4);
  assert.ok(doc.summaryRedactions >= 4);
  assert.match(doc.summary, /^Reclamo:/);
  assert.match(doc.summary, /\[redactado\]/);
  const json = JSON.stringify(doc);
  assert.doesNotMatch(json, /Ana|P[ée]rez|@|8888|7777|wa\.me|https?:|example\.com/i);
});

test('sanitizeTicketSummary: corta, colapsa espacios y rechaza no-texto', () => {
  const long = sanitizeTicketSummary('x'.repeat(1000));
  assert.ok(long.summary.length <= AGENT_TICKET_SUMMARY_MAX);
  assert.equal(sanitizeTicketSummary('  hola \n\t mundo  ').summary, 'hola mundo');
  assert.equal(sanitizeTicketSummary({ a: 1 }).summary, '');
  assert.equal(sanitizeTicketSummary(undefined).summary, '');
  assert.equal(sanitizeTicketSummary('Grupo de 4 personas').summary, 'Grupo de 4 personas');
  assert.equal(sanitizeTicketSummary('Cédula 1-1234-5678').summary, 'Cédula [redactado]');
});

test('create_ticket valida motivo, prioridad y resumen sin escribir', async () => {
  const db = fakeDb();
  const r1: any = await createTicket({ reason: 'drop_database', summary: 'x' }, {}, { db });
  assert.equal(r1.error, 'invalid_reason');
  assert.deepEqual(r1.allowedReasons, [...AGENT_TICKET_REASONS]);
  const r2: any = await createTicket({ reason: 'other', priority: 'urgent', summary: 'x' }, {}, { db });
  assert.equal(r2.error, 'invalid_priority');
  assert.deepEqual(r2.allowedPriorities, [...AGENT_TICKET_PRIORITIES]);
  const r3: any = await createTicket({ reason: 'other', summary: '   ' }, {}, { db });
  assert.equal(r3.error, 'summary_required');
  assert.equal(db.writes.length, 0);
  for (const r of [r1, r2, r3]) { assert.equal(r.success, false); assert.equal(r.created, false); }
});

test('create_ticket sin Firestore o con fallo de escritura no lanza', async () => {
  const res: any = await createTicket({ reason: 'other', summary: 'Duda sin resolver' });
  assert.equal(res.success, false);
  assert.equal(res.created, false);
  assert.equal(res.error, 'storage_unavailable');
  const failing = { collection: () => ({ add: async () => { throw new Error('boom'); } }) };
  const res2: any = await createTicket({ reason: 'other', summary: 'Duda' }, {}, { db: failing });
  assert.equal(res2.error, 'storage_write_failed');
  const res3: any = await createTicket({ reason: 'other', summary: 'Duda' }, {}, { db: fakeDb(), now: () => { throw new Error('clock'); } });
  assert.equal(res3.error, 'storage_write_failed');
});

test('create_ticket está en el registro (sideEffect ⇒ bloqueado con allowMutations:false) y fuera del concierge de solo lectura', async () => {
  assert.equal(isPhaseCTool('create_ticket'), true);
  assert.equal(PHASE_C_TOOL_REGISTRY.create_ticket.sideEffect, true);
  assert.equal((AGENT_TOOL_REGISTRY as any).create_ticket.sideEffect, true);
  const decl: any = PHASE_C_DECLARATIONS.find(d => d.name === 'create_ticket');
  assert.ok(decl);
  assert.deepEqual(decl.parameters.required, ['reason', 'summary']);
  assert.ok(Object.keys(decl.parameters.properties.data.properties).length > 0, 'OBJECT con propiedades');
  assert.ok(GEMINI_FUNCTION_DECLARATIONS.some((d: any) => d.name === 'create_ticket'));
  assert.ok(!(COMPAT_READ_ONLY_TOOLS as readonly string[]).includes('create_ticket'));
  const selected = selectCompatTools(GEMINI_FUNCTION_DECLARATIONS as any, AGENT_TOOL_REGISTRY as any).map(d => d.name);
  assert.ok(!selected.includes('create_ticket'));
  // El bucle del asistente bloquea toda herramienta con sideEffect cuando allowMutations === false.
  const assistant = fs.readFileSync(new URL('../backend/aiAssistantService.ts', import.meta.url), 'utf8');
  assert.match(assistant, /filter\(\(\[, tool\]\) => tool\.sideEffect\)/);
  assert.match(assistant, /options\.allowMutations === false && mutationTools\.has\(toolName\)/);
  // Despacho: offline ⇒ no escribe y no lanza.
  const viaPhaseC: any = await executePhaseCTool('create_ticket', { reason: 'other', summary: 'x' }, { sessionId: 's1' });
  assert.equal(viaPhaseC.error, 'storage_unavailable');
  const viaRegistry: any = await executeAgentTool('create_ticket' as any, { reason: 'nope', summary: 'x' });
  assert.equal(viaRegistry.error, 'invalid_reason');
});

test('create_ticket no envía mensajes ni usa servicios externos', () => {
  const src = fs.readFileSync(new URL('../backend/agentSupportTicket.ts', import.meta.url), 'utf8');
  const imports = [...src.matchAll(/from '([^']+)'|import\('([^']+)'\)/g)].map(m => m[1] || m[2]);
  assert.deepEqual(imports.sort(), ['./agentEventLog', './bookingService', 'crypto', 'firebase-admin/firestore'].sort());
  assert.doesNotMatch(src, /fetch\(|sendMail|nodemailer|twilio|whatsapp\.send|axios/i);
});
