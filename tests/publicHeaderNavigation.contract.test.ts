import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const header = readFileSync('src/components/Header.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');

test('header keeps a short primary nav plus a highlighted quote action', () => {
  for (const path of ["to: '/tours'", "to: '/destinations'", "to: '/map'", "to: '/ai'"]) assert.ok(header.includes(path), path);
  assert.match(header, /'Cotizar' : 'Get a quote'/);
  assert.match(header, /aria-current=\{active \? 'page' : undefined\}/);
});

test('account menu is reachable at every width and accessible', () => {
  assert.doesNotMatch(header, /min-\[1680px\]/, 'no controls hidden until 1680px');
  assert.match(header, /aria-expanded=\{isMenuOpen\}/);
  assert.match(header, /aria-controls=\{menuPanelId\}/);
  assert.match(header, /event\.key === 'Escape'/);
  assert.match(header, /t\('signIn'\)/);
  assert.match(header, /<PWAInstallButton/);
});

test('smart travel hub only on home and no duplicate Back to Home button', () => {
  assert.match(app, /activeTab === 'home' && \(\s*<div className="pt-4 sm:pt-5">\s*<TravelerCommandBar/);
  assert.doesNotMatch(app, /Back to Home/);
});
