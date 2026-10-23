/**
 * #377 — Contrato: el cliente nunca ve al proveedor (nombre, correo, teléfono, WhatsApp,
 * web, dominio) en correos o WhatsApp salientes antes de la confirmación de la reserva.
 * Cubre los canales que NO pasan por `redactAssistantReplyMiddleware`:
 *  - backend/providerInboxAgent.ts (aviso tras la respuesta del proveedor),
 *  - backend/emailOperationsAgent.ts (respuesta automática por Gmail/Outlook),
 *  - backend/customerIntakeGateway.ts (respuesta reenviada por WhatsApp).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  PROVIDER_PLACEHOLDER, bookingAllowsProviderReveal, redactProviderIdentityForCustomer,
} from '../backend/customerOutboundPrivacy';
import { buildInboxCustomerMessage } from '../backend/providerInboxAgent';
import { buildProviderCustomerNotice } from '../backend/providerCustomerNotice';
// @ts-ignore módulo .mjs con JSDoc
import { buildMatchers, scanText, loadDenylist } from '../scripts/lib/operatorPrivacyScan.mjs';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const matchers = buildMatchers();
// data/internal/ saldrá del repo (segunda PR): sin esos archivos, las pruebas que los
// necesitan se omiten; la auditoría de nombres usa OPERATOR_DENYLIST_JSON o los hashes.
const LOCAL_DENYLIST = fs.existsSync(path.join(root, 'data/internal/operatorDenylist.json'));
const denylist = (loadDenylist() ?? { names: [], domains: [], publicPlaceNames: [] }) as { names: string[]; domains: string[]; publicPlaceNames?: string[] };
const NO_LOCAL = !LOCAL_DENYLIST && 'data/internal/operatorDenylist.json ausente (el backend lo lee de Firestore)';
const CONTACT_LEAK = /(\+?506[\s-]?)?\b[2-8]\d{3}[\s-]?\d{4}\b|[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z]{2,}|wa\.me|https?:\/\/(?!([a-z0-9-]+\.)*(go\.cr|costaricatours2026\.vercel\.app))/i;
const leaks = (text: string) => scanText(text, matchers, { names: true, domains: true, fields: false }) as string[];

test('redacta nombres del denylist interno, dominios y contactos del proveedor', { skip: NO_LOCAL }, () => {
  const places = new Set((denylist.publicPlaceNames || []).map((n) => n.toLowerCase()));
  const sample = denylist.names.filter((n) => !places.has(n.toLowerCase()));
  assert.ok(sample.length >= 20, 'denylist poblado');
  for (const name of sample) {
    const out = redactProviderIdentityForCustomer(`Tu tour lo opera ${name}. Escríbeles a reservas@${denylist.domains[0]} o al +506 8888-1234.`);
    assert.deepEqual(leaks(out), [], `${name} → ${out}`);
    assert.doesNotMatch(out, CONTACT_LEAK, out);
    assert.match(out, new RegExp(PROVIDER_PLACEHOLDER.es));
  }
  for (const domain of denylist.domains) {
    const bare = redactProviderIdentityForCustomer(`Más info en ${domain}`, { language: 'en' });
    assert.deepEqual(leaks(bare), [], bare);
  }
});

test('redacta nombres del registro operativo que pasa el llamador (Firestore/orden)', () => {
  const out = redactProviderIdentityForCustomer('Operadora Fantasía Selva S.A. confirmó tu cupo.', { providerNames: ['Operadora Fantasía Selva S.A.'], language: 'es' });
  assert.doesNotMatch(out, /Fantas[ií]a Selva/);
  const ci = redactProviderIdentityForCustomer('operadora fantasia selva s.a. confirmó', { providerNames: ['Operadora Fantasía Selva S.A.'] });
  assert.doesNotMatch(ci, /fantas/i, ci);
});

test('conserva emergencias, entes oficiales, lugares públicos, precios y fechas', () => {
  const text = 'En una emergencia llama al 911. Reserva oficial SINAC: https://serviciosenlinea.sinac.go.cr. Precio US$85, 2026-10-19, 4.5 h.';
  assert.equal(redactProviderIdentityForCustomer(text), text);
  for (const place of denylist.publicPlaceNames || []) {
    assert.match(redactProviderIdentityForCustomer(`Visita ${place}`), new RegExp(place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const once = redactProviderIdentityForCustomer('Opera Selvatura');
  assert.equal(redactProviderIdentityForCustomer(once), once, 'idempotente');
});

test('aviso del buzón de proveedores: neutral, sin nombre del proveedor ni notas de su correo', () => {
  const order = { bookingId: 'CRT-ABC123', providerName: 'Operadora Fantasía Selva S.A.', tourName: 'Rafting', date: '2026-11-02' };
  for (const action of ['confirm', 'reject', 'delay', 'no_show', 'complete', 'otra']) {
    for (const lang of ['es', 'en']) {
      const msg = buildInboxCustomerMessage(order, action, 'Ana', lang);
      const all = `${msg.subject}\n${msg.text}\n${msg.html}`;
      assert.doesNotMatch(all, /Fantas[ií]a Selva/i, all);
      assert.doesNotMatch(all, /Nota operativa/i);
      assert.doesNotMatch(all, CONTACT_LEAK, all);
      assert.ok(msg.text.includes(buildProviderCustomerNotice(action, lang).text), 'usa el aviso neutral');
    }
  }
  // La aceptación del proveedor no es la confirmación de la reserva.
  assert.doesNotMatch(buildInboxCustomerMessage(order, 'confirm', 'Ana', 'es').subject, /confirmada/i);
});

test('canales salientes aplican la redacción antes de enviar (contrato de código)', () => {
  const inbox = read('backend/providerInboxAgent.ts');
  const notify = inbox.slice(inbox.indexOf('async function notifyCustomer'), inbox.indexOf('export async function processProviderInboxOnce'));
  assert.doesNotMatch(notify, /providerName|operatorContact|Nota operativa/, 'notifyCustomer no interpola datos del proveedor');
  assert.match(notify, /buildInboxCustomerMessage/);

  const ops = read('backend/emailOperationsAgent.ts');
  assert.match(ops, /redactProviderIdentityForCustomer\(rawAssistant\.reply/);
  const customerFlow = ops.slice(ops.indexOf('async function processCustomerEmail'), ops.indexOf('export async function processEmailOperationsOnce'));
  const redactAt = customerFlow.indexOf('const reply = redactProviderIdentityForCustomer(');
  assert.ok(redactAt > 0 && redactAt < customerFlow.indexOf('sendGmailReply(client, mail, reply)'));
  assert.ok(redactAt < customerFlow.indexOf('sendOutlookReply(token, mail, reply)'));

  const intake = read('backend/customerIntakeGateway.ts');
  assert.match(intake, /const reply = redactProviderIdentityForCustomer\(/);
});

test('solo la reserva confirmada o pagada puede revelar al operador', () => {
  assert.equal(bookingAllowsProviderReveal(null), false);
  assert.equal(bookingAllowsProviderReveal({ status: 'pendiente_pago' }), false);
  assert.equal(bookingAllowsProviderReveal({ status: 'hold', paymentStatus: 'pending' }), false);
  assert.equal(bookingAllowsProviderReveal({ status: 'confirmada' }), true);
  assert.equal(bookingAllowsProviderReveal({ paymentStatus: 'completed' }), true);
});
