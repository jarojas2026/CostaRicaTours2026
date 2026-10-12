import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const nav = readFileSync('src/components/HomeQuickNav.tsx', 'utf8');
const home = readFileSync('src/pages/Home.tsx', 'utf8');

test('home quick navigation has real keyboard-operable links for existing destinations', () => {
  assert.match(nav, /import \{ Link, useNavigate \} from 'react-router-dom'/);
  assert.match(nav, /<Link key=\{card\.id\} to=\{\x60\/\$\{card\.tab\}\x60\}/);
  assert.match(nav, /focus-visible:outline/);
  assert.doesNotMatch(nav, /onClick=\{\(\) => navigate\(\x60\/\$\{card\.tab\}\x60\)\}/);
});

test('tailored trip card opens the existing funnel instead of routing to tours', () => {
  assert.match(nav, /card\.id === 'vip' \?/);
  assert.match(nav, /<button key=\{card\.id\} type="button" onClick=\{onOpenCustomFunnel\}/);
  assert.match(home, /<HomeQuickNav/);
  assert.match(home, /onOpenCustomFunnel=\{\(\) => setIsCustomFunnelOpen\(true\)\}/);
});

test('curated tours have semantic links to actual detail routes', () => {
  assert.match(nav, /<Link key=\{tour\.id\} to=\{\x60\/tour\/\$\{tour\.id\}\x60\}/);
  assert.doesNotMatch(nav, /onClick=\{\(\) => navigate\(\x60\/tour\/\$\{tour\.id\}\x60\)\}/);
});
