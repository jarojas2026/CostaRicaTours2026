import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getDestinationWeather, getWeatherForRegion } from '../backend/weatherPulseService';

function observation(hour = '10', probability = 83) {
  return {
    current: {
      time: `2026-10-20T${hour}:15`,
      temperature_2m: 24,
      apparent_temperature: 26,
      relative_humidity_2m: 77,
      wind_speed_10m: 12,
      weather_code: 61,
      is_day: 1,
    },
    hourly: {
      time: ['2026-10-20T00:00', `2026-10-20T${hour}:00`],
      precipitation_probability: [1, probability],
    },
  };
}
async function mockWeather(body: unknown, code = 200, fn?: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({ ok: code === 200, status: code, json: async () => body }) as Response
  ) as typeof globalThis.fetch;
  try { await fn?.(); } finally { globalThis.fetch = original; }
}

test('weather upstream failure never produces fallback temperature, rain or fake recent observedAt', async () => {
  await mockWeather(null, 503, async () => {
    const actual = await getDestinationWeather(true);
    assert.deepEqual(actual, []);
    assert.equal(await getWeatherForRegion('arenal'), null);
  });
});

test('source-complete observations preserve local hour and labels across cache hits', async () => {
  await mockWeather(observation(), 200, async () => {
    const actual = await getDestinationWeather(true);
    assert.equal(actual.length, 5);
    assert.equal(actual[0].source, 'open-meteo');
    assert.equal(actual[0].precipitationProbability, 83);
    assert.equal(actual[0].temperatureC, 24);
    assert.equal(actual[0].labelEs, 'Lluvia');
    const cached = await getDestinationWeather(false);
    assert.deepEqual(cached, actual);
    assert.equal((await getWeatherForRegion('arenal'))?.labelEn, 'Rain');
  });
});

test('partial API weather values never inherit old synthetic fallback', async () => {
  await mockWeather({
    current: { time: '2026-10-20T10:15', temperature_2m: 22 },
    hourly: { time: ['2026-10-20T10:00'], precipitation_probability: [80] },
  }, 200, async () => {
    const actual = await getDestinationWeather(true);
    assert.deepEqual(actual, []);
  });
});

test('agent and frontend never promise fixed hold TTL or fictional weather cards', () => {
  const knowledge = readFileSync('backend/agentKnowledgeFabric.ts', 'utf8');
  const cards = readFileSync('src/components/DestinationPulse.tsx', 'utf8');
  const routes = readFileSync('backend/routes/misc.ts', 'utf8');
  const service = readFileSync('backend/weatherPulseService.ts', 'utf8');
  assert.doesNotMatch(knowledge, /soft-hold" de cupo dura 15 minutos/);
  assert.match(knowledge, /no inventes condiciones/i);
  assert.match(cards, /Clima no disponible/);
  assert.doesNotMatch(cards, /card\.tempC|card\.humidity|active\.tempC|active\.humidity/);
  assert.doesNotMatch(service, /FALLBACKS|source: 'fallback'/);
  assert.match(routes, /source: destinations.length > 0 \? 'open-meteo' : 'unavailable'/);
});
