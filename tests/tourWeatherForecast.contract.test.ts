import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOpenMeteoUrl,
  clearTourForecastCache,
  getTourForecast,
  parseCostaRicaCoords,
  parseOpenMeteoDaily,
  FORECAST_CACHE_TTL_MS,
} from '../backend/tourWeatherForecast';

const SAMPLE = {
  latitude: 10.46,
  longitude: -84.7,
  timezone: 'America/Costa_Rica',
  daily: {
    time: ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'],
    weather_code: [3, 61, 80, 2, 95],
    temperature_2m_max: [27.1, 25.4, 26, 28.2, 24.9],
    temperature_2m_min: [19, 18.5, 19.2, 19.8, 18],
    precipitation_probability_max: [20, 85, 40, 10, 30],
    precipitation_sum: [0.2, 14.5, 3, 0, 2],
  },
};

test('coordinates outside Costa Rica are rejected and valid ones are rounded', () => {
  assert.equal(parseCostaRicaCoords('40.7', '-74'), null);
  assert.equal(parseCostaRicaCoords('abc', '-84'), null);
  assert.equal(parseCostaRicaCoords(undefined, undefined), null);
  assert.deepEqual(parseCostaRicaCoords('10.46312', '-84.70388'), { lat: 10.46, lon: -84.7 });
  assert.deepEqual(parseCostaRicaCoords('5.53', '-87.06'), { lat: 5.53, lon: -87.06 }, 'Isla del Coco');
});

test('Open-Meteo daily payload is parsed with a rain alert and attribution', () => {
  const forecast = parseOpenMeteoDaily(SAMPLE, '2026-10-20T00:00:00.000Z');
  assert.equal(forecast.days.length, 5);
  assert.equal(forecast.days[1].precipitationProbability, 85);
  assert.equal(forecast.rainAlert, true);
  assert.equal(forecast.source, 'open-meteo');
  assert.equal(forecast.attribution.name, 'Open-Meteo');
});

test('dry forecast does not raise a rain alert and empty payloads throw', () => {
  const dry = structuredClone(SAMPLE);
  dry.daily.precipitation_probability_max = [10, 20, 30, 10, 0];
  dry.daily.precipitation_sum = [0, 1, 2, 0, 0];
  assert.equal(parseOpenMeteoDaily(dry).rainAlert, false);
  assert.throws(() => parseOpenMeteoDaily({ daily: { time: [] } }));
});

test('request targets the free keyless Open-Meteo forecast API in Costa Rica time', () => {
  const url = buildOpenMeteoUrl(10.46, -84.7);
  assert.equal(url.origin, 'https://api.open-meteo.com');
  assert.equal(url.searchParams.get('forecast_days'), '5');
  assert.equal(url.searchParams.get('timezone'), 'America/Costa_Rica');
  assert.equal(url.searchParams.has('apikey'), false);
});

test('forecast is cached for one hour and failures return null (never fabricated data)', async () => {
  clearTourForecastCache();
  let calls = 0;
  let clock = 1_000_000;
  const okFetch = (async () => { calls += 1; return new Response(JSON.stringify(SAMPLE), { status: 200 }); }) as typeof fetch;
  const first = await getTourForecast(10.46, -84.7, okFetch, () => clock);
  const second = await getTourForecast(10.46, -84.7, okFetch, () => clock + 60_000);
  assert.ok(first && second);
  assert.equal(calls, 1);
  clock += FORECAST_CACHE_TTL_MS + 1;
  await getTourForecast(10.46, -84.7, okFetch, () => clock);
  assert.equal(calls, 2);

  clearTourForecastCache();
  const failing = (async () => new Response('down', { status: 503 })) as typeof fetch;
  assert.equal(await getTourForecast(9.39, -84.14, failing), null);
  const throwing = (async () => { throw new Error('network'); }) as typeof fetch;
  assert.equal(await getTourForecast(9.39, -84.14, throwing), null);
});
