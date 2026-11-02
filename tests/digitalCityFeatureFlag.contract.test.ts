import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/App.tsx', 'utf8');
const footer = readFileSync('src/components/Footer.tsx', 'utf8');
const envExample = readFileSync('.env.example', 'utf8');

test('Digital City stays in source but its route imports are gated by an explicit false-by-default feature flag', () => {
  assert.match(app, /VITE_SHOW_DIGITAL_CITY === 'true'/);
  assert.match(app, /SHOW_DIGITAL_CITY && DigitalCityArchitecturePage/);
  assert.match(app, /SHOW_DIGITAL_CITY && DigitalCityJoinPage/);
  assert.match(app, /<Navigate to="\/tours" replace \/>/);
  assert.match(envExample, /VITE_SHOW_DIGITAL_CITY="false"/);
  assert.match(app, /import\('\.\/pages\/DigitalCityArchitecturePage'\)/);
  assert.match(app, /import\('\.\/pages\/DigitalCityJoinPage'\)/);
});

test('Digital City footer links are hidden without deleting the pages or their route behavior', () => {
  assert.doesNotMatch(footer, /to="\/ciudad"|to="\/participar"/);
  assert.match(app, /path="\/ciudad"/);
  assert.match(app, /path="\/participar"/);
  assert.match(app, /DigitalCityArchitecturePage/);
  assert.match(app, /DigitalCityJoinPage/);
});
