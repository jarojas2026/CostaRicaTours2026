import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomerAckEmail } from '../backend/leadPipeline';

const base = { id: 'lead_034ed090b9b3a10b8d7fa3d8', request: { tourId: 'arenal-hot-springs', tourTitle: 'Arenal Combo', people: 2 } } as const;

test('acuse al cliente: ES por defecto, sin cargo, sin operadores', () => {
  const mail = buildCustomerAckEmail({ ...base, language: 'es', contact: { name: 'Ana', email: 'ana@example.com' } } as any);
  assert.ok(mail);
  assert.equal(mail!.to, 'ana@example.com');
  assert.match(mail!.subject, /Recibimos tu solicitud: Arenal Combo/);
  assert.match(mail!.text, /antes de cualquier pago/);
  assert.match(mail!.text, /Referencia: 0B8D7FA3D8|Referencia: [0-9A-F]{8}/);
  assert.doesNotMatch(mail!.text, /certificad/i);
});

test('acuse al cliente: EN y escapado HTML', () => {
  const mail = buildCustomerAckEmail({ ...base, language: 'en', contact: { name: '<b>Bo</b>', email: 'bo@example.com' } } as any);
  assert.match(mail!.subject, /We received your request/);
  assert.doesNotMatch(mail!.html, /<b>Bo<\/b>/);
});

test('acuse al cliente: sin correo no hay envío', () => {
  assert.equal(buildCustomerAckEmail({ ...base, language: 'es', contact: null } as any), null);
});
