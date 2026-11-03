import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const weather = readFileSync('src/components/TourWeather.tsx', 'utf8');
const pulse = readFileSync('src/components/DestinationPulse.tsx', 'utf8');

// El hallazgo (Prompt 12d) eran las 5 tarjetas "Weather unavailable" del home (DestinationPulse).
test('home DestinationPulse shows one weather-unavailable note instead of repeating it on every card', () => {
  assert.match(pulse, /const weatherUnavailable = weatherState === 'unavailable'/);
  assert.match(pulse, /\{weatherUnavailable \? \(\s*<p data-testid="destination-pulse-weather-unavailable"/);
  assert.match(pulse, /Clima no disponible por ahora/);
  assert.match(pulse, /Weather is not available right now/);
  // Sin datos, la tarjeta muestra el ambiente del destino y no cifras vacías.
  assert.match(pulse, /: \(es \? card\.moodEs : card\.moodEn\);/);
  assert.match(pulse, /const showWeatherFigures = Boolean\(weather\) \|\| weatherState === 'available';/);
  assert.match(pulse, /\{showWeatherFigures && \(<>/);
});

test('home weather note renders nothing fabricated: no temperature values without data', async () => {
  const { DestinationPulse } = await import('../src/components/DestinationPulse');
  const html = renderToStaticMarkup(React.createElement(DestinationPulse, { language: 'es', onSelectRegion: () => {} }));
  assert.doesNotMatch(html, /\d+°/);
});

test('tour detail weather stays silent when the forecast fails (notice kept behind a false flag)', () => {
  assert.match(weather, /export const SHOW_TOUR_WEATHER_UNAVAILABLE_NOTICE = false as boolean;/);
  assert.match(weather, /if \(forecastState === 'unavailable'\) \{\s*\/\/[^\n]*\n\s*if \(!SHOW_TOUR_WEATHER_UNAVAILABLE_NOTICE\) return null;/);
  assert.match(weather, /data-testid="tour-weather-unavailable"/);
});

test('valid forecast still requires success and at least three real days from the API', () => {
  assert.match(weather, /data\?\.success && Array\.isArray\(data\.days\) && data\.days\.length >= 3/);
  assert.match(weather, /setDays\(data\.days\.slice\(0, 5\)\)/);
  assert.match(weather, /api\/weather\/forecast/);
});
