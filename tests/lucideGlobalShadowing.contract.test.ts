import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Un icono de lucide-react importado como `Map`/`Set` tapa el constructor global: `new Map(...)` revienta en
// producción ("Ce is not a constructor") y el ErrorBoundary oculta toda la app. Ver ToursGrid (#510).
const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : /\.(tsx?|jsx?)$/.test(name) ? [path] : [];
});

test('no source file shadows global Map/Set with a lucide-react icon and then constructs it', () => {
  const offenders: string[] = [];
  for (const file of walk('src')) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'lucide-react'/g)) {
      const names = match[1].split(',').map((part) => part.trim()).filter(Boolean)
        .map((part) => (part.split(/\s+as\s+/)[1] || part).trim());
      for (const global of ['Map', 'Set']) {
        if (names.includes(global) && new RegExp(`new ${global}\\s*[<(]`).test(source)) offenders.push(`${file}: ${global}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('ToursGrid imports the map icon under an alias and keeps the global Map constructor', () => {
  const grid = readFileSync('src/components/ToursGrid.tsx', 'utf8');
  assert.match(grid, /Map as MapIcon/);
  assert.match(grid, /<MapIcon className=/);
  assert.match(grid, /new Map<string, number>\(/);
});
