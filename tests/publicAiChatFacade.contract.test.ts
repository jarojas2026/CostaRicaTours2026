import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const facade = fs.readFileSync(path.join(root, 'api/ai/chat.ts'), 'utf8');
const floating = fs.readFileSync(path.join(root, 'src/components/FloatingWhatsApp.tsx'), 'utf8');

test('floating traveler assistant has a real serverless API facade', () => {
  assert.match(floating, /fetch\('\/api\/ai\/chat'/);
  assert.match(facade, /gatewayHandler/);
});

test('public AI chat delegates to the canonical concierge loop', () => {
  assert.match(facade, /url:\s*'\/api\/gemini\/concierge'/);
  assert.match(facade, /agentId:\s*'concierge'/);
  assert.match(facade, /engine:\s*'auto'/);
  assert.match(facade, /history\.slice\(-12\)/);
});

test('public AI chat fails closed for invalid methods and empty messages', () => {
  assert.match(facade, /req\.method !== 'POST'/);
  assert.match(facade, /status\(405\)/);
  assert.match(facade, /message_required/);
  assert.match(facade, /status\(400\)/);
});

test('public AI chat does not expose retired booking or synthetic payment paths', () => {
  assert.doesNotMatch(facade, /\/api\/pagos\/solicitud/);
  assert.doesNotMatch(facade, /\/api\/reservas\/confirmar/);
  assert.doesNotMatch(facade, /executeSolicitudPago/);
  assert.doesNotMatch(facade, /executeConfirmacionReserva/);
});
