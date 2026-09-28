import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('operator discovery UI does not turn catalog metadata into verification claims', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'OperatorsSection.tsx'), 'utf8');
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
