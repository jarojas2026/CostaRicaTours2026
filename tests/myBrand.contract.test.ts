import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MY_MARK_CLASS, MY_SECTIONS } from '../src/components/MyBrand';

// #399: sistema de marca "my" (solo UI).
test('labels ES/EN localizados y rutas estables', () => {
  assert.deepEqual(Object.values(MY_SECTIONS).map(s => [s.label, s.labelEs, s.to]), [
    ['My Trip', 'Mi viaje', '/trip'], ['My Planner', 'Mi planificador', '/itinerary'],
    ['My Bookings', 'Mis reservas', null], ['My Flights', 'Mis vuelos', '/flights'],
  ]);
});

test('"my" resaltado con acento existente y animación solo motion-safe', () => {
  assert.match(MY_MARK_CLASS, /text-emerald-300/);
  const animated = MY_MARK_CLASS.split(/\s+/).filter(c => /transition|translate|scale|duration/.test(c));
  assert.ok(animated.length > 0);
  for (const c of animated) assert.match(c, /^motion-safe:/, `${c} debe respetar prefers-reduced-motion`);
});

test('encabezado y command bar pasan idioma a etiquetas ES/EN', () => {
  const header = readFileSync('src/components/Header.tsx', 'utf8');
  assert.match(header, /<MyWordmark \/>/);
  for (const s of ['trip', 'planner', 'bookings', 'flights']) assert.match(header, new RegExp(`<MyLabel section="${s}"`));
  assert.doesNotMatch(header, /'Armar mi viaje'|'Build my trip'/);
  const bar = readFileSync('src/components/TravelerCommandBar.tsx', 'utf8');
  assert.match(bar, /<MyLabel section=\{item\.section\} language=\{language\} \/>/);
  assert.match(bar, /MY_SECTIONS\.trip\.label/);
  assert.match(bar, /MY_SECTIONS\.planner\.label/);
});

test('no toca dominio, canónicas ni SEO', () => {
  const brand = readFileSync('src/components/MyBrand.tsx', 'utf8');
  assert.doesNotMatch(brand, /canonical|https?:\/\/|<link|hreflang/);
});
