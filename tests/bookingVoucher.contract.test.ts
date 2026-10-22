import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildVoucherContent, generateVoucherPdf, voucherEligibility } from '../backend/bookingVoucherService';

const paid = {
  bookingId: 'CRT-AB12CD34', tourName: 'Caminata Volcán Arenal', date: '2026-12-10', time: '08:00',
  meetingPoint: 'Recepción del hotel', adults: 2, children: 1, totalUSD: 189.5,
  status: 'paid', paymentStatus: 'completed', paymentVerifiedAt: '2026-11-01T15:00:00Z',
  providerName: 'Operador Ejemplo SA', providerPhone: '+506 0000 0000', providerEmail: 'op@example.com',
};

test('solo reservas pagadas/confirmadas con pago verificado por el servidor', () => {
  assert.equal(voucherEligibility({ ...paid, status: 'payment_pending', paymentStatus: 'pending' }).ok, false);
  assert.deepEqual(voucherEligibility({ ...paid, paymentVerifiedAt: undefined }), { ok: false, reason: 'pago_no_verificado' });
  assert.deepEqual(voucherEligibility({ ...paid, status: 'cancelled' }), { ok: false, reason: 'estado_no_pagado' });
  assert.equal(buildVoucherContent({ ...paid, status: 'hold', paymentStatus: 'pending' }), null);
  assert.equal(voucherEligibility(paid).ok, true);
});

test('contenido: fecha, hora, punto de encuentro, pax, monto verificado, cancelación y emergencias', () => {
  const c = buildVoucherContent(paid)!;
  const rows = Object.fromEntries(c.rows);
  assert.equal(rows['Fecha'], '2026-12-10');
  assert.equal(rows['Hora'], '08:00');
  assert.equal(rows['Punto de encuentro'], 'Recepción del hotel');
  assert.equal(rows['Personas (pax)'], '3');
  assert.equal(rows['Monto pagado (verificado)'], '189.50 USD');
  assert.match(c.cancellationPolicy, /cancelación/);
  assert.deepEqual(c.emergency.map(e => e.phone), ['911', '118', '128']);
});

test('operador: oculto si no está confirmado por el proveedor; nunca sus contactos', () => {
  assert.equal(buildVoucherContent(paid)!.operatorName, null);
  const confirmed = buildVoucherContent({ ...paid, status: 'confirmed', providerConfirmedAt: '2026-11-02T10:00:00Z', providerStatus: 'accepted' })!;
  assert.equal(confirmed.operatorName, 'Operador Ejemplo SA');
  assert.equal(confirmed.status, 'CONFIRMADA');
  const all = JSON.stringify(confirmed);
  assert.doesNotMatch(all, /op@example\.com|0000 0000/);
});

test('genera un PDF real y la ruta exige elegibilidad', async () => {
  const pdf = await generateVoucherPdf(buildVoucherContent(paid)!);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const src = readFileSync('backend/bookingVoucherService.ts', 'utf8');
  assert.doesNotMatch(src, /QR|certificad|15 d[ií]as/i);
  const route = readFileSync('backend/routes/bookings.ts', 'utf8');
  assert.match(route, /buildVoucherContent\(booking\)/);
  assert.match(route, /status\(409\)/);
});
