import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { CITY_DISTRICTS, CITY_ACTIVE_ROUTE_PATHS } from '../src/data/digitalCityDistricts';
import { DigitalCityArchitecturePage } from '../src/pages/DigitalCityArchitecturePage';
import { DigitalCityGateway } from '../src/components/DigitalCityGateway';

test('masterplan routes are unique, grounded and bilingual', () => {
  assert.equal(CITY_DISTRICTS.length, 6);
  const ids = CITY_DISTRICTS.map(district => district.id);
  const links = CITY_DISTRICTS.map(district => district.href);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(links).size, links.length);
  assert.deepEqual(links.slice().sort(), [...CITY_ACTIVE_ROUTE_PATHS].sort());
  for (const district of CITY_DISTRICTS) {
    assert.match(district.number, /^0[1-6]$/);
    assert.ok(district.titleEs && district.titleEn && district.descriptionEs && district.descriptionEn);
    assert.ok(district.labelEs && district.labelEn);
    assert.ok(district.href.startsWith('/') && !district.href.startsWith('//'));
    assert.ok(!/\b(garantizad|confirmed booking|official partner|certified)\b/i.test(district.descriptionEs + district.descriptionEn));
  }
});

test('city plaza renders accessible landmarks and real navigable links', () => {
  const html = renderToStaticMarkup(
    React.createElement(MemoryRouter, null,
      React.createElement(DigitalCityArchitecturePage, { language: 'es' })
    )
  );
  assert.match(html, /<main\b/);
  assert.match(html, /aria-label="Ubicación en el sitio"/);
  assert.match(html, /Plano conceptual, no geográfico/);
  assert.match(html, /Distrito seleccionado/);
  assert.match(html, /aria-pressed=/);
  for (const district of CITY_DISTRICTS) {
    assert.ok(html.includes('href="' + district.href + '"'), district.id + ' should be navigable');
  }
  assert.doesNotMatch(html, /href="#"/);
});

test('homepage city gateway links to masterplan and existing opt-in onboarding', () => {
  const html = renderToStaticMarkup(
    React.createElement(MemoryRouter, null,
      React.createElement(DigitalCityGateway, { language: 'en' })
    )
  );
  assert.ok(html.includes('href="/ciudad"'));
  assert.ok(html.includes('href="/participar"'));
  assert.match(html, /digital city masterplan/i);
  assert.doesNotMatch(html, /onClick=""/);
});
