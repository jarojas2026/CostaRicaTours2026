import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const readComponent = (name: string) =>
  fs.readFileSync(path.join(process.cwd(), 'src', 'components', name), 'utf8');

test('operator discovery UI does not turn catalog metadata into verification claims', () => {
  const source = readComponent('OperatorsSection.tsx');
  const unsupported = [
    'Red de Operadores Locales Certificados',
    'Certified Local Operator Network',
    'Nuestros Operadores Turísticos de Confianza',
    'Our Trusted Tour Operators',
    'canal oficial de comercialización',
    'official booking and customer support channel',
    'Modelo Comercial 100% Transparente',
    '100% Transparent Marketplace',
    "'Verificado'",
    "'Verified'",
  ];

  for (const claim of unsupported) {
    assert.equal(source.includes(claim), false, `Unsupported operator claim remains: ${claim}`);
  }

  assert.match(source, /Catálogo ≠ confirmación operativa/);
  assert.match(source, /verificar disponibilidad real, proveedor asignado y condiciones/);
});

test('story section does not present catalog metadata as verified commercial facts', () => {
  const source = readComponent('OurStory.tsx');
  const unsupported = [
    'tarifas oficiales garantizadas',
    'direct official rates',
    'Operadores Certificados',
    'Certified Operators',
    'Precios Oficiales',
    'Official Prices',
    'Agencias Locales Verificadas en Nuestra Red',
    'Verified Local Agencies in Our Network',
    '+100',
  ];

  for (const claim of unsupported) {
    assert.equal(source.includes(claim), false, `Unsupported story claim remains: ${claim}`);
  }

  assert.match(source, /La disponibilidad real, el proveedor asignado, el precio aplicable y las condiciones/);
  assert.match(source, /verifican antes de confirmar el pago o emitir un voucher/);
});
