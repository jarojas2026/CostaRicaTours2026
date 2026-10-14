import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('no namespace import of lucide-react (pulls the whole icon set into a chunk)', () => {
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : [];
  });
  for (const file of walk(path.join(process.cwd(), 'src'))) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /import \* as \w+ from ['"]lucide-react['"]/, file);
  }
});

test('heavy route sections are lazy-loaded from App.tsx', () => {
  const app = read('src/App.tsx');
  for (const name of ['InteractiveMap', 'NationalTransportSection', 'TicoCultureSection', 'AdminControlCenterPage', 'ProviderPortalPage']) {
    assert.match(app, new RegExp(`const ${name} = lazy\\(`), name);
    assert.doesNotMatch(app, new RegExp(`import \\{ ${name} \\} from`), name);
  }
});

test('index chunk stays under 650 kB when a build is present', (t) => {
  const assets = path.join(process.cwd(), 'dist', 'assets');
  if (!fs.existsSync(assets)) return t.skip('no dist/ build in this run');
  const index = fs.readdirSync(assets).filter((file) => /^index-[\w-]+\.js$/.test(file));
  for (const file of index) {
    const size = fs.statSync(path.join(assets, file)).size;
    assert.ok(size < 650 * 1024, `${file} is ${Math.round(size / 1024)} kB`);
  }
});

test('opt-in Sentry SDK never lands in the eager chunks when a build is present', (t) => {
  const assets = path.join(process.cwd(), 'dist', 'assets');
  if (!fs.existsSync(assets)) return t.skip('no dist/ build in this run');
  const eager = fs.readdirSync(assets).filter((file) => /^(index|vendor-react)-[\w-]+\.js$/.test(file));
  for (const file of eager) {
    assert.doesNotMatch(fs.readFileSync(path.join(assets, file), 'utf8'), /__SENTRY__/, `${file} bundles the Sentry SDK`);
  }
});

test('the ~180 kB tour catalog is loaded lazily by the frontend', () => {
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : [];
  });
  const dataDir = path.join(process.cwd(), 'src', 'data');
  for (const file of walk(path.join(process.cwd(), 'src'))) {
    if (file.startsWith(dataDir + path.sep)) continue;
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /from ['"][./]*(?:\.\.\/)*data\/(?:toursData|toursCatalog)['"]/, `${file} must use catalogMeta or loadTours()`);
  }
  assert.match(read('src/data/loadTours.ts'), /import\('\.\/toursCatalog'\)/);
  assert.doesNotMatch(read('src/data/catalogMeta.ts'), /from '\.\/toursCatalog'/);
  assert.match(read('src/contexts/ToursContext.tsx'), /useLocalTours\(\)/);
});

test('when a build is present the tour catalog ships in its own chunk', (t) => {
  const assets = path.join(process.cwd(), 'dist', 'assets');
  if (!fs.existsSync(assets)) return t.skip('no dist/ build in this run');
  assert.ok(fs.readdirSync(assets).some((file) => /^toursCatalog-[\w-]+\.js$/.test(file)), 'missing toursCatalog chunk');
});
