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

test('Digital City footer links are kept in source but hidden behind the same flag (no deletion)', () => {
  assert.match(footer, /import \{ SHOW_DIGITAL_CITY \} from '\.\.\/config\/featureFlags'/);
  assert.match(footer, /\{SHOW_DIGITAL_CITY && \([\s\S]*?to="\/ciudad"[\s\S]*?to="\/participar"[\s\S]*?\)\}/);
  assert.match(app, /path="\/ciudad"/);
  assert.match(app, /path="\/participar"/);
  assert.match(app, /DigitalCityArchitecturePage/);
  assert.match(app, /DigitalCityJoinPage/);
});

test('home Digital City sections render only with the flag on', () => {
  const home = readFileSync('src/pages/Home.tsx', 'utf8');
  assert.match(home, /\{SHOW_DIGITAL_CITY && \(\s*<>\s*<DigitalCityGateway language=\{language\} \/>\s*<DigitalCityAudienceHub language=\{language\} compact \/>\s*<DigitalCityServiceJourney language=\{language\} \/>/);
});

test('shared flag is false by default and only an explicit "true" turns it on', async () => {
  const { isFlagOn, SHOW_DIGITAL_CITY } = await import('../src/config/featureFlags');
  assert.equal(SHOW_DIGITAL_CITY, false);
  assert.equal(isFlagOn(undefined), false);
  assert.equal(isFlagOn('false'), false);
  assert.equal(isFlagOn('1'), false);
  assert.equal(isFlagOn('true'), true);
  assert.equal(isFlagOn(' TRUE '), true);
});

test('footer renders no Digital City link with the flag off', async () => {
  const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { MemoryRouter } = await import('react-router-dom');
  const { Footer } = await import('../src/components/Footer');
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Footer, { language: 'es' })));
  assert.doesNotMatch(html, /href="\/ciudad"|href="\/participar"/);
  assert.match(html, /href="\/itinerary"/);
});
