import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('about page does not publish unsupported operator, commission or human-support guarantees', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'AboutSection.tsx'), 'utf8');
  const unsupported = [
    'Operadores Verificados',
    'Verified Operators',
    '100% de nuestros operadores',
    '100% of our operators',
    'Comisión Justa',
    'Soporte Humano',
    'Garantía de Calidad',
    'Quality Guarantee',
  ];

  for (const claim of unsupported) {
    assert.equal(source.includes(claim), false, `Unsupported public claim remains: ${claim}`);
  }

  assert.match(source, /Verificación Operativa/);
  assert.match(source, /antes de presentarlos como confirmados/);
});
