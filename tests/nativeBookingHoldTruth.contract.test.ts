import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const file = readFileSync('backend/nativeAutomationEngine.ts', 'utf8');
const start = file.indexOf('export async function executeInicioReserva(');
const end = file.indexOf('// 3. SOLICITUD DE PAGO', start);
const source = file.slice(start, end);

test('native booking initiation returns only canonical persisted booking identifiers', () => {
  assert.ok(start > -1 && end > start, 'native booking initiation exists');
  assert.match(source, /bookingId\s*=\s*String\(result\.booking\.bookingId\)/);
  assert.match(source, /idReserva:\s*bookingId/);
  assert.doesNotMatch(source, /CRT-HLD-|Math\.random\(/);
});

test('native booking initiation fails closed on rejected or conflicting transactions', () => {
  assert.match(source, /catch \(error: any\)/);
  assert.match(source, /result\.conflict/);
  assert.match(source, /!result\.booking\?\.bookingId/);
  assert.match(source, /exito:\s*false/);
  assert.doesNotMatch(source, /\.catch\(\(err\) => console\.warn/);
});

test('legacy gateway does not advertise an unimplemented 15-minute expiring hold', () => {
  assert.match(source, /bloqueoActivo:\s*false/);
  assert.match(source, /expiraEnMinutos:\s*null/);
  assert.match(source, /expiresAt:\s*null/);
  assert.doesNotMatch(source, /bloqueoActivo:\s*true|expiraEnMinutos:\s*15/);
});
