import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FLIGHT_REFERENCE_LABELS, FLIGHT_ROUTES, FLIGHT_ROUTES_ARE_REFERENCE } from '../src/data/flightsData';

// #397
test('Vuelos está en la navegación principal y no en "Más"', () => {
  const src = readFileSync('src/components/Header.tsx', 'utf8');
  const primary = src.slice(src.indexOf('const primaryNav'), src.indexOf('const moreNav'));
  const more = src.slice(src.indexOf('const moreNav'), src.indexOf('const isActive'));
  assert.match(primary, /to: '\/flights'/);
  assert.doesNotMatch(more, /\/flights/);
});

test('precios y horarios de vuelos se muestran como referencia, sin borrar datos', () => {
  assert.equal(FLIGHT_ROUTES_ARE_REFERENCE, true);
  assert.ok(FLIGHT_ROUTES.length > 0);
  assert.equal(FLIGHT_REFERENCE_LABELS.price.es, 'Precio de referencia / consultar');
  const ui = readFileSync('src/components/FlightTrackerGadget.tsx', 'utf8');
  assert.match(ui, /FLIGHT_REFERENCE_LABELS\.price/);
  assert.match(ui, /FLIGHT_REFERENCE_LABELS\.schedule/);
  assert.doesNotMatch(ui, /Tasas Incluidas|Taxes Included/);
});
