import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// El nombre, sitio web y contacto del proveedor de traslados nunca deben llegar al cliente.
// Los identificadores internos (ids, nombres de variables/archivo) y la detección de la
// palabra clave escrita por el cliente (enrutamiento a logística) sí se permiten.
const CUSTOMER_REACHABLE = [
  'backend/claudeService.ts',
  'backend/itineraryService.ts',
  'backend/nativeAutomationEngine.ts',
  'backend/nativeWorkflows.ts',
  'src/data/alsamaTransportData.ts',
  'src/components/NationalTransportSection.tsx',
];

test('transfer supplier name, website and contact never appear in customer-reachable text', () => {
  for (const file of CUSTOMER_REACHABLE) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /Alsama Tours/i, file);
    assert.doesNotMatch(source, /alsamatourscr/i, file);
    assert.doesNotMatch(source, /['"`][^'"`\n]*\bAlsama\b[^'"`\n]*['"`]/, `${file}: string literal con el nombre del proveedor`);
  }
});

test('transfer prices stay labeled as reference rates subject to confirmation', () => {
  const prompt = readFileSync('backend/claudeService.ts', 'utf8');
  assert.match(prompt, /tarifa de referencia, sujeta a confirmación/);
  assert.match(prompt, /coordinados por nuestra agencia/);
});
