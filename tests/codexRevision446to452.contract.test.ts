/**
 * Revisión de los comentarios de Codex sobre #446–#452 (y la regresión que Codex marcó en #453).
 * Los 10 hallazgos originales ya están corregidos en main (#453–#456, con sus propios tests);
 * aquí se cubren solo los dos residuos que seguían vigentes:
 *   1) Libro supplierPayouts: además de no poder escribirse desde el navegador, no viaja en
 *      las respuestas de las rutas de operador (solo por /supplier-payouts con requireOwner).
 *   2) customer-intake (P2 Codex #453): una respuesta descartada por cambio de identidad no
 *      limpia ni pisa el panel de una consulta más nueva.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { withoutSupplierPayouts } from '../backend/leadSupplierPayouts';
import type { LeadRecord } from '../backend/leadPipeline';
import { createIntakeOwnership } from '../src/utils/intakeOwnership';

const routes = () => fs.readFileSync('backend/routes/leads.ts', 'utf8');
const routeBlock = (src: string, signature: string) => {
  const start = src.indexOf(signature);
  assert.ok(start >= 0, `no se encontró la ruta ${signature}`);
  const end = src.indexOf('\nleadsRouter.', start + signature.length);
  return src.slice(start, end < 0 ? undefined : end);
};

test('withoutSupplierPayouts omite el libro sin tocar el resto ni el original', () => {
  const lead = {
    id: 'lead_abcdefgh12', status: 'nuevo', bookingId: 'BK_1',
    supplierPayouts: [{ id: 'sp_1', proveedor: 'Operador local A', montoCRC: 25000, estado: 'aprobado' }],
  } as unknown as LeadRecord;
  const out = withoutSupplierPayouts(lead) as Record<string, unknown>;
  assert.equal('supplierPayouts' in out, false);
  assert.equal(out.id, 'lead_abcdefgh12');
  assert.equal(out.bookingId, 'BK_1');
  // No se borra nada guardado: el objeto original queda intacto.
  assert.equal((lead as any).supplierPayouts.length, 1);
  // Un lead sin libro se devuelve tal cual.
  const plain = { id: 'lead_zzzzzzzz00', status: 'nuevo' } as unknown as LeadRecord;
  assert.equal(withoutSupplierPayouts(plain), plain);
});

test('rutas de operador no devuelven supplierPayouts; el libro sigue solo para el dueño', () => {
  const src = routes();
  const list = routeBlock(src, "leadsRouter.get('/api/admin/leads', requireOperator");
  assert.match(list, /leads: leads\.map\(withoutSupplierPayouts\)/);
  const one = routeBlock(src, "leadsRouter.get('/api/admin/leads/:id', requireOperator");
  assert.match(one, /lead: withoutSupplierPayouts\(lead\)/);
  const status = routeBlock(src, "leadsRouter.patch('/api/admin/leads/:id/status', requireOperator");
  assert.match(status, /lead: withoutSupplierPayouts\(result\.lead\)/);
  // Ninguna respuesta de operador devuelve el lead crudo.
  for (const block of [list, one, status]) assert.doesNotMatch(block, /json\(\{ success: true, lead \}\)|lead: result\.lead \}/);
  // Las rutas del libro siguen exigiendo dueño.
  const payoutRoutes = src.match(/leadsRouter\.(get|post)\('\/api\/admin\/leads\/:id\/supplier-payouts[^']*', (\w+)/g) || [];
  assert.ok(payoutRoutes.length >= 4, 'faltan rutas del libro');
  for (const r of payoutRoutes) assert.match(r, /requireOwner$/);
});

test('firestore.rules: /leads sin lectura de clientes ni proveedores y libro solo-servidor', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  // Denegación global por defecto intacta.
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
  const block = rules.slice(rules.indexOf('match /leads/{leadId}'), rules.indexOf('match /reviews/{reviewId}'));
  // Lectura solo personal interno (admin/dueño u operador); nunca viajero ni proveedor.
  assert.match(block, /allow read: if isAdmin\(\) \|\| isOperatorRole\(\);/);
  assert.doesNotMatch(block, /request\.auth\.uid|'provider'|if true|isSignedIn\(\)\s*;/);
  // Escrituras del navegador nunca tocan supplierPayouts (create/update/delete).
  assert.match(block, /allow create: if isAdmin\(\) && !\('supplierPayouts' in incoming\(\)\);/);
  assert.match(block, /affectedKeys\(\)\.hasAny\(\['supplierPayouts'\]\)/);
  assert.match(block, /allow delete: if isAdmin\(\) && !\('supplierPayouts' in existing\(\)\);/);
  assert.doesNotMatch(block, /allow write/);
  // Ninguna otra regla abre /leads (p. ej. a proveedores).
  assert.equal((rules.match(/match \/leads\//g) || []).length, 1);
});

test('intakeOwnership: solo el turno más reciente es dueño del panel', () => {
  const own = createIntakeOwnership();
  const oldToken = own.begin();
  assert.equal(own.owns(oldToken), true);
  const newToken = own.begin();
  assert.equal(own.owns(oldToken), false, 'la consulta vieja ya no es dueña');
  assert.equal(own.owns(newToken), true);
  // Los turnos de distintas instancias son independientes.
  const other = createIntakeOwnership();
  assert.equal(other.owns(newToken), false);
});

test('App: una respuesta descartada no limpia ni pisa una consulta más nueva (P2 Codex #453)', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const start = app.indexOf('const handleCustomerIntake');
  const handler = app.slice(start, app.indexOf("window.addEventListener('customer-intake-request'", start));
  assert.match(app, /const intakeOwnershipRef = React\.useRef\(createIntakeOwnership\(\)\);/);
  assert.match(handler, /const intakeToken = intakeOwnershipRef\.current\.begin\(\);/);
  const discard = handler.slice(handler.indexOf('const discardStaleIntake'), handler.indexOf('try {'));
  assert.match(discard, /if \(ownsPanel\(\)\) \{\s*setIntakeOpen\(false\);/, 'limpia solo si sigue siendo dueña');
  assert.match(discard, /detail\.onResult\?\.\(\{ ok: false, discarded: true/, 'igual avisa a quien la pidió');
  assert.match(handler, /if \(ownsPanel\(\)\) \{\s*setIntakeReply\(data\.customer\?\.reply/);
  assert.match(handler, /if \(ownsPanel\(\)\) \{\s*setIntakeReply\(failureReply\);/);
  assert.match(handler, /finally \{\s*if \(ownsPanel\(\)\) setIntakeLoading\(false\);/);
  // La protección de identidad de #453 se mantiene.
  assert.match(handler, /if \(!isStorageScopeCurrent\(scopeAtRequest\)\) \{ discardStaleIntake\(\); return; \}/);
  assert.match(handler, /setPersonalItemInScope\(scopeAtRequest, 'crt_active_journey'/);
});
