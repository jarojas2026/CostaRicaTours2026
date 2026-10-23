import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MemoryStateStore, UpstashStateStore, createSharedStateStore, rateLimitStoreOption, sharedStateConfig, sharedStateStatus,
} from '../backend/sharedStateStore';

const TOKEN = 'fake-token-not-real-0123456789';
const UP = { SHARED_STATE_STORE: 'upstash', UPSTASH_REDIS_REST_URL: 'https://redis.invalid', UPSTASH_REDIS_REST_TOKEN: TOKEN };

/** Redis REST falso en memoria: entiende INCR/PEXPIRE/PTTL/DECR/DEL/SET NX PX/EVAL. */
function fakeRedis(calls: any[], opts: { fail?: boolean } = {}): typeof fetch {
  const data = new Map<string, string>();
  return (async (url: any, init: any) => {
    calls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    if (opts.fail) return new Response('down', { status: 503 });
    const out = JSON.parse(init.body).map((cmd: any[]) => {
      const [op, key, ...rest] = cmd;
      switch (op) {
        case 'INCR': { const v = Number(data.get(key) || 0) + 1; data.set(key, String(v)); return { result: v }; }
        case 'DECR': { const v = Number(data.get(key) || 0) - 1; data.set(key, String(v)); return { result: v }; }
        case 'PEXPIRE': return { result: 1 };
        case 'PTTL': return { result: 60_000 };
        case 'DEL': return { result: data.delete(key) ? 1 : 0 };
        case 'SET': if (data.has(key)) return { result: null }; data.set(key, String(rest[0])); return { result: 'OK' };
        case 'EVAL': { const k = String(rest[1]); if (data.get(k) === String(rest[2])) { data.delete(k); return { result: 1 }; } return { result: 0 }; }
        default: return { error: 'unknown' };
      }
    });
    return new Response(JSON.stringify(out), { status: 200 });
  }) as typeof fetch;
}

test('default is memory (current behaviour, $0) and rate-limit option is a no-op', () => {
  assert.equal(sharedStateConfig({}).kind, 'memory');
  assert.equal(createSharedStateStore({}).kind, 'memory');
  assert.deepEqual(rateLimitStoreOption('chat', 60_000, {}), {});
  // Flag pedido sin credenciales válidas → sigue en memoria
  assert.equal(sharedStateConfig({ SHARED_STATE_STORE: 'upstash', UPSTASH_REDIS_REST_URL: 'http://x', UPSTASH_REDIS_REST_TOKEN: TOKEN }).kind, 'memory');
});

test('memory store counts per window and locks exclusively', async () => {
  let now = 1_000;
  const s = new MemoryStateStore(() => now);
  assert.equal((await s.incr('a', 1000)).count, 1);
  assert.equal((await s.incr('a', 1000)).count, 2);
  now += 1001;
  assert.equal((await s.incr('a', 1000)).count, 1);
  const t = await s.acquireLock('job', 5000);
  assert.ok(t);
  assert.equal(await s.acquireLock('job', 5000), null);
  await s.releaseLock('job', 'wrong');
  assert.equal(await s.acquireLock('job', 5000), null);
  await s.releaseLock('job', t!);
  assert.ok(await s.acquireLock('job', 5000));
});

test('upstash store shares counters and locks via REST, token only in header', async () => {
  const calls: any[] = [];
  const f = fakeRedis(calls);
  const a = createSharedStateStore(UP, f);
  assert.equal(a.kind, 'upstash');
  assert.equal((await a.incr('ip:1', 60_000)).count, 1);
  assert.equal((await a.incr('ip:1', 60_000)).count, 2);
  assert.match(calls[0].url, /\/pipeline$/);
  assert.equal(calls[0].headers.Authorization, `Bearer ${TOKEN}`);
  assert.ok(!JSON.stringify(calls.map(c => c.body)).includes(TOKEN));
  assert.equal(calls[0].body[0][1], 'crt:ip:1');
  const tok = await a.acquireLock('cron', 1000);
  assert.ok(tok);
  assert.equal(await a.acquireLock('cron', 1000), null);
  await a.releaseLock('cron', tok!);
  assert.ok(await a.acquireLock('cron', 1000));
});

test('upstash failure falls back to memory silently (never blocks traffic)', async () => {
  const calls: any[] = [];
  const s = new UpstashStateStore({ url: 'https://redis.invalid', token: TOKEN, prefix: 'crt:', timeoutMs: 200 }, new MemoryStateStore(), fakeRedis(calls, { fail: true }));
  assert.equal((await s.incr('k', 1000)).count, 1);
  assert.equal((await s.incr('k', 1000)).count, 2);
  assert.ok(await s.acquireLock('x', 1000));
  assert.equal(calls.length, 3);
  const thrower = new UpstashStateStore({ url: 'https://redis.invalid', token: TOKEN, prefix: 'crt:', timeoutMs: 200 }, new MemoryStateStore(), (async () => { throw new Error('net'); }) as any);
  assert.equal((await thrower.incr('k', 1000)).count, 1);
});

test('express-rate-limit adapter maps hits and reset time', async () => {
  const store = new MemoryStateStore();
  const { store: rl } = rateLimitStoreOption('chat', 60_000, {}, store);
  assert.ok(rl);
  const r1 = await rl!.increment('1.2.3.4');
  const r2 = await rl!.increment('1.2.3.4');
  assert.equal(r1.totalHits, 1);
  assert.equal(r2.totalHits, 2);
  assert.ok(r2.resetTime instanceof Date);
  await rl!.decrement('1.2.3.4');
  assert.equal((await rl!.increment('1.2.3.4')).totalHits, 2);
  await rl!.resetKey('1.2.3.4');
  assert.equal((await rl!.increment('1.2.3.4')).totalHits, 1);
});

test('status never exposes url or token', () => {
  const s = JSON.stringify(sharedStateStatus(UP));
  assert.ok(!s.includes(TOKEN) && !s.includes('redis.invalid'));
});
