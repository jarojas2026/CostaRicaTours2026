import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { CITY_AUDIENCES, DigitalCityAudienceHub } from '../src/components/DigitalCityAudienceHub';

test('audience cards are bilingual and only link to existing public journeys', () => {
  assert.deepEqual(CITY_AUDIENCES.map(a => a.href), ['/tours', '/itinerary', '/participar']);
  assert.equal(new Set(CITY_AUDIENCES.map(a => a.key)).size, 3);
  for (const audience of CITY_AUDIENCES) {
    for (const key of ['titleEs', 'titleEn', 'bodyEs', 'bodyEn', 'ctaEs', 'ctaEn'] as const) assert.ok(audience[key]);
  }
});

for (const language of ['es', 'en'] as const) {
  test('city audience hub renders semantic goals and working route links in ' + language, () => {
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, null,
      React.createElement(DigitalCityAudienceHub, { language })
    ));
    assert.match(html, /<section\b/);
    assert.match(html, /<article\b/);
    assert.match(html, /<h2\b/);
    for (const href of ['/tours', '/itinerary', '/participar', '/map', '/ai']) assert.ok(html.includes('href="' + href + '"'));
    assert.doesNotMatch(html, /href="#"/);
    assert.doesNotMatch(html, /(?:guaranteed availability|100% guaranteed|cupo confirmado)/i);
  });
}
