import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('src/components/CostaRicaCheckout.tsx','utf8');

test('legacy checkout cannot fabricate a booking or payment confirmation', () => {
  assert.doesNotMatch(source, /CR-PV-\$\{|paymentStatus:\s*['"]completed['"]|status:\s*['"]confirmada['"]/);
  assert.doesNotMatch(source, /fetch\(['"]\/api\/bookings['"]/);
  assert.match(source, /formulario antiguo no puede confirmar reservas ni pagos/);
});

test('legacy checkout never advertises a fabricated hold', () => {
  assert.doesNotMatch(source, /Cupo reservado temporalmente|15 minutos de reserva temporal garantizada/);
  assert.match(source, /precios mostrados son orientativos/);
});
