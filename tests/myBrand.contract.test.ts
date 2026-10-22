import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MY_MARK_CLASS, MY_SECTIONS } from '../src/components/MyBrand';

// #399: sistema de marca "my" (solo UI).
test('nombres fijos ES/EN y rutas', () => {
  assert.deepEqual(
    Object.values(MY_SECTIONS).map(s => [s.label, s.to]),
    [['My Trip', '/trip'], ['My Planner', '/itinerary'], ['My Bookings', null], ['My Flights', '/flights']],
  );
});

test('"my" resaltado con acento existente y animación solo motion-safe', () => {
  assert.match(MY_MARK_CLASS, /text-emerald-300/);
  const animated = MY_MARK_CLASS.split(/\s+/).filter(c => /transition|translate|scale|duration/.test(c));
  assert.ok(animated.length > 0);
  for (const c of animated) assert.match(c, /^motion-safe:/, `${c} debe respetar prefers-reduced-motion`);
});

test('encabezado y menú de cuenta usan la marca; el idioma no cambia los nombres', () => {
  const header = readFileSync('src/components/Header.tsx', 'utf8');
  assert.match(header, /<MyWordmark \/>/);
  for (const s of ['trip', 'planner', 'bookings', 'flights']) assert.match(header, new RegExp(`<MyLabel section="${s}" />`));
  assert.doesNotMatch(header, /'Armar mi viaje'|'Build my trip'/);
  const bar = readFileSync('src/components/TravelerCommandBar.tsx', 'utf8');
  assert.match(bar, /MY_SECTIONS\.trip\.label/);
  assert.match(bar, /MY_SECTIONS\.planner\.label/);
});

test('no toca dominio, canónicas ni SEO', () => {
  const brand = readFileSync('src/components/MyBrand.tsx', 'utf8');
  assert.doesNotMatch(brand, /canonical|https?:\/\/|<link|hreflang/);
});
