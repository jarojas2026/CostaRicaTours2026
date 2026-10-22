import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// #395: el modal de reservas del cliente no ofrece acceso a la administración.
test('MyBookingsModal no enlaza a /admin ni muestra acceso del propietario', () => {
  const src = readFileSync('src/components/MyBookingsModal.tsx', 'utf8');
  assert.doesNotMatch(src, /to=["'{`]\/admin/);
  assert.doesNotMatch(src, /href=["'{`]\/admin/);
  assert.doesNotMatch(src, /Acceso del propietario|Owner access|Administración ·/);
});

test('/admin sigue protegido por AdminRouteGuard', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /AdminRouteGuard/);
});
