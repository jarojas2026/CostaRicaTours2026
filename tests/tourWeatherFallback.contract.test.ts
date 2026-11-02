import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const weather = readFileSync('src/components/TourWeather.tsx', 'utf8');

test('weather unavailable state is explicit, bilingual and never fabricates forecast values', () => {
  assert.match(weather, /forecastState, setForecastState/);
  assert.match(weather, /setForecastState\('unavailable'\)/);
  assert.match(weather, /data-testid="tour-weather-unavailable"/);
  assert.match(weather, /Pronóstico temporalmente no disponible/);
  assert.match(weather, /Forecast temporarily unavailable/);
  assert.match(weather, /No pudimos verificar el clima para esta ubicación/);
  assert.match(weather, /We could not verify weather for this location/);
  assert.match(weather, /el pronóstico no garantiza que una actividad se realice/);
  assert.match(weather, /a forecast never guarantees an activity will run/);
});

test('valid forecast still requires success and at least three real days from the API', () => {
  assert.match(weather, /data\?\.success && Array\.isArray\(data\.days\) && data\.days\.length >= 3/);
  assert.match(weather, /setDays\(data\.days\.slice\(0, 5\)\)/);
  assert.match(weather, /api\/weather\/forecast/);
});
