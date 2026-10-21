/**
 * #349 — executeAutonomousFullBookingLifecycle no puede afirmar que el voucher
 * se envió (ni que el proveedor fue notificado) sin evidencia. createBooking no
 * envía voucher ni despacha: eso ocurre en el ciclo de vida de la reserva.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = readFileSync('backend/nativeAutomationEngine.ts', 'utf8');
const flow = src.slice(src.indexOf('export async function executeAutonomousFullBookingLifecycle'));
const flowBody = flow.slice(0, flow.indexOf('\nexport ', 10) > 0 ? flow.indexOf('\nexport ', 10) : undefined);

test('voucherEnviado nunca es un true fijo', () => {
  assert.doesNotMatch(src, /voucherEnviado:\s*true/);
  assert.match(flowBody, /voucherEnviado:\s*false/);
  assert.match(flowBody, /estadoVoucher:\s*'pendiente_pago_y_confirmacion_proveedor'/);
});

test('el despacho al proveedor tampoco se afirma sin evidencia', () => {
  assert.doesNotMatch(flowBody, /notificacionDespachada:\s*true/);
  assert.doesNotMatch(flowBody, /estado:\s*'confirmada'/);
  assert.doesNotMatch(flowBody, /\) notificados\./);
});

test('createBooking no envía el voucher (la premisa del flujo sigue siendo cierta)', () => {
  const booking = readFileSync('backend/bookingService.ts', 'utf8');
  const create = booking.slice(booking.indexOf('export async function createBooking'));
  const body = create.slice(0, create.indexOf('\nexport ', 10));
  assert.doesNotMatch(body, /executeCustomerBookingConfirmation|sendEmail\(/);
});

test('autonomous admin shortcut cannot invent traveler, tour, date, price or payment', () => {
  assert.doesNotMatch(flowBody, /TOURS\[0\]|unitPrice\s*\|\|\s*145|paymentStatus:\s*'confirmed'/);
  assert.doesNotMatch(flowBody, /new Date\(Date\.now\(\)\s*\+\s*3/);
  assert.doesNotMatch(flowBody, /ADMIN_EMAIL\s*\|\|/);
  assert.match(flowBody, /Indique fecha y horario publicados/);
  assert.match(flowBody, /Indique el nombre y correo auténticos/);
  assert.match(flowBody, /idempotencyKey: payload\.idempotencyKey/);
  assert.match(flowBody, /const bookingResult = await createBooking\(/);
});

test('no invented QR, voucher URLs, provider details or cron jobs', () => {
  assert.match(flowBody, /voucherUrl:\s*null/);
  assert.match(flowBody, /qrToken:\s*null/);
  assert.match(flowBody, /automatizacionesProgramadas:\s*\[\]/);
  assert.doesNotMatch(flowBody, /alsama-tours-cr|PASS-\$\{/);
  assert.match(flowBody, /operadorAsignado:\s*\{/);
});
