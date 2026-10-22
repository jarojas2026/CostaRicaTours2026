import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  __setExchangeRateDepsForTests,
  FRANKFURTER_URL,
  HACIENDA_URL,
  RATE_CACHE_TTL_MS,
  type ExchangeRateSnapshot,
} from '../backend/exchangeRateService';
import { toursRouter } from '../backend/routes/tours';

// Contrato de /api/currency/rates sin red: Hacienda (BCCR), Frankfurter (BCE) y
// Firestore se sustituyen por dobles en memoria.

const bccrBody = { venta: { fecha: '2026-10-21', valor: 457.54 }, compra: { fecha: '2026-10-21', valor: 450.09 } };
const ecbBody = { amount: 1, base: 'USD', date: '2026-10-21', rates: { EUR: 0.89015, GBP: 0.74617, CAD: 1.4046 } };

function mockFetch(opts: { bccr?: boolean; ecb?: boolean }, calls: string[]) {
  return async (url: string) => {
    calls.push(url);
    if (url === HACIENDA_URL && opts.bccr !== false) return { ok: true, status: 200, json: async () => bccrBody };
    if (url === FRANKFURTER_URL && opts.ecb !== false) return { ok: true, status: 200, json: async () => ecbBody };
    return { ok: false, status: 503, json: async () => ({}) };
  };
}

function memoryStore(initial: ExchangeRateSnapshot | null = null) {
  const state = { value: initial, writes: 0 };
  return {
    state,
    store: {
      read: async () => state.value,
      write: async (s: ExchangeRateSnapshot) => { state.value = s; state.writes += 1; },
    },
  };
}

async function withServer(fn: (base: string) => Promise<void>) {
  const app = express();
  app.use(toursRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const { port } = server.address() as { port: number };
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

const NOW = Date.parse('2026-10-21T18:00:00Z');

test('rates: BCCR para CRC y BCE para el resto, con fecha y fuente por moneda', async (t) => {
  const calls: string[] = [];
  const mem = memoryStore();
  __setExchangeRateDepsForTests({ fetch: mockFetch({}, calls) as any, store: mem.store, now: () => NOW, configuredUsdToCrc: () => undefined });
  t.after(() => __setExchangeRateDepsForTests(null));

  await withServer(async (base) => {
    const res = await fetch(`${base}/api/currency/rates`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.base, 'USD');
    assert.equal(body.rates.USD, 1);
    assert.equal(body.rates.CRC, 457.54);
    assert.equal(body.rates.EUR, 0.89015);
    assert.equal(body.sources.CRC.provider, 'BCCR');
    assert.equal(body.sources.CRC.rateDate, '2026-10-21');
    assert.equal(body.sources.EUR.provider, 'BCE');
    assert.deepEqual(body.available, ['USD', 'CAD', 'CRC', 'EUR', 'GBP']);
    assert.deepEqual(body.unavailable, []);
    assert.equal(body.stale, false);

    // Segunda llamada: caché en memoria, sin red.
    const before = calls.length;
    await (await fetch(`${base}/api/currency/rates`)).json();
    assert.equal(calls.length, before);

    // Endpoint histórico sigue publicando usdToCrc desde la misma fuente.
    const legacy = await (await fetch(`${base}/api/currency/exchange-rate`)).json();
    assert.equal(legacy.usdToCrc, 457.54);
    assert.equal(legacy.rateDate, '2026-10-21');
  });
  await new Promise((r) => setImmediate(r));
  assert.equal(mem.state.writes, 1, 'persiste la instantánea en Firestore');
});

test('rates: sin fuentes no inventa valores (503, solo USD)', async (t) => {
  __setExchangeRateDepsForTests({ fetch: mockFetch({ bccr: false, ecb: false }, []) as any, store: memoryStore().store, now: () => NOW, configuredUsdToCrc: () => undefined });
  t.after(() => __setExchangeRateDepsForTests(null));
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/currency/rates`);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.deepEqual(body.rates, { USD: 1 });
    assert.deepEqual(body.available, ['USD']);
    assert.ok(body.unavailable.includes('CRC'));
    assert.equal((await fetch(`${base}/api/currency/exchange-rate`)).status, 503);
  });
});

test('rates: si cae el BCE, CRC sigue y el resto se declara no disponible', async (t) => {
  __setExchangeRateDepsForTests({ fetch: mockFetch({ ecb: false }, []) as any, store: memoryStore().store, now: () => NOW, configuredUsdToCrc: () => undefined });
  t.after(() => __setExchangeRateDepsForTests(null));
  await withServer(async (base) => {
    const body = await (await fetch(`${base}/api/currency/rates`)).json();
    assert.deepEqual(body.available, ['USD', 'CRC']);
    assert.equal(body.rates.EUR, undefined);
    assert.ok(body.unavailable.includes('BCE'));
  });
});

test('rates: usa la instantánea fresca de Firestore sin consultar la red', async (t) => {
  const calls: string[] = [];
  const stored: ExchangeRateSnapshot = {
    base: 'USD',
    rates: { USD: 1, CRC: 455, EUR: 0.9 },
    sources: {
      CRC: { provider: 'BCCR', rateDate: '2026-10-20', label: 'BCCR' },
      EUR: { provider: 'BCE', rateDate: '2026-10-20', label: 'BCE' },
    },
    unavailable: [],
    fetchedAt: new Date(NOW - RATE_CACHE_TTL_MS / 2).toISOString(),
    stale: false,
  };
  __setExchangeRateDepsForTests({ fetch: mockFetch({}, calls) as any, store: memoryStore(stored).store, now: () => NOW, configuredUsdToCrc: () => undefined });
  t.after(() => __setExchangeRateDepsForTests(null));
  await withServer(async (base) => {
    const body = await (await fetch(`${base}/api/currency/rates`)).json();
    assert.equal(body.rates.CRC, 455);
    assert.equal(calls.length, 0);
  });
});
