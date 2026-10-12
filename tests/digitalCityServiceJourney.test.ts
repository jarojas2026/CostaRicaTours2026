import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { CITY_SERVICE_STEPS, DigitalCityServiceJourney } from '../src/components/DigitalCityServiceJourney';

test('service journey retains distinct advisory and verification stages', () => {
  assert.deepEqual(CITY_SERVICE_STEPS.map(s => s.id), ['discover','advise','plan','verify']);
});
for (const language of ['es','en'] as const) {
  test('service journey links to existing AI, itinerary and partner paths in '+language, () => {
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(DigitalCityServiceJourney, { language })));
    for (const href of ['/ai','/itinerary','/participar']) assert.ok(html.includes('href="'+href+'"'));
    assert.match(html, /<section\b/);
    assert.match(html, /<article\b/);
    assert.doesNotMatch(html, /href="#"/);
  });
}
