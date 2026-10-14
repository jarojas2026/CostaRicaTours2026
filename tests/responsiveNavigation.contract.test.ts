import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('app shell uses viewport scrolling and exposes a focusable main target', () => {
  const app = read('src/App.tsx');
  assert.match(app, /min-h-\[100dvh\]/);
  assert.doesNotMatch(app, /max-h-screen overflow-y-auto/);
  assert.match(app, /id="main-content" tabIndex=\{-1\}/);
  assert.match(app, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)/);
});

test('responsive CSS constrains root, media and form controls to the viewport', () => {
  const css = read('src/index.css');
  assert.match(css, /#root \{[\s\S]*overflow-x: clip/);
  assert.match(css, /img, picture, video, iframe \{[\s\S]*max-width: 100%/);
  assert.match(css, /input, select, textarea \{[\s\S]*max-width: 100%/);
  assert.match(css, /\.comparison-row/);
});

test('national layer panel has an explicit close control and keyboard dismissal', () => {
  const layer = read('src/components/NationalPoiLayer.tsx');
  assert.match(layer, /id="national-poi-layers-panel"/);
  assert.match(layer, /aria-label=\{isEs \? 'Cerrar selector de capas' : 'Close layers selector'\}/);
  assert.match(layer, /event\.key === 'Escape'/);
  assert.match(layer, /setIsOpen\(false\)/);
});
