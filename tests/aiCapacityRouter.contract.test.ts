import assert from 'node:assert/strict';
import test from 'node:test';
import { capacityChat, capacitySlots, capacityStatus, cooldownMs, capacityConfig, resetCapacityState } from '../backend/aiCapacityRouter';

const K = 'fake-key-not-real-0123456789abcdef';
const PRIMARY = { OPENAI_COMPAT_BASE_URL: 'https://primary.invalid/v1', OPENAI_COMPAT_API_KEY: K };
const FREE = { AI_FREE_FALLBACK_API_KEY: K, AI_FREE_FALLBACK_MODEL: 'some/model:free', AI_FREE_FALLBACK_BASE_URL: 'https://free.invalid/v1' };
const PAID = { AI_PAID_SLOT_ENABLED: 'true', AI_PAID_SLOT_BASE_URL: 'https://paid.invalid/v1', AI_PAID_SLOT_API_KEY: K, AI_PAID_SLOT_MODEL: 'paid/model' };
const msg = { messages: [{ role: 'user' as const, content: 'Hola' }] };
const err = (status: number) => Object.assign(new Error(`http_${status}`), { status });

test('no slots configured → nothing called, 401 so caller uses deterministic reply', async () => {
  resetCapacityState();
  let calls = 0;
  await assert.rejects(capacityChat(msg, { env: {}, chat: async () => { calls++; } }), (e: any) => e.status === 401);
  assert.equal(calls, 0);
});

test('free slot requires a ":free" model (guarantees $0)', () => {
  assert.deepEqual(capacitySlots({ ...FREE, AI_FREE_FALLBACK_MODEL: 'paid/model' }).map(s => s.name), []);
  assert.deepEqual(capacitySlots(FREE).map(s => s.name), ['free']);
});

test('paid slot stays off by default and with AI_MAX_COST_USD=0 even if enabled', () => {
  assert.deepEqual(capacitySlots({ ...PRIMARY, ...PAID }).map(s => s.name), ['primary']);
  assert.deepEqual(capacitySlots({ ...PRIMARY, ...PAID, AI_MAX_COST_USD: '0' }).map(s => s.name), ['primary']);
  assert.deepEqual(capacitySlots({ ...PRIMARY, ...PAID, AI_MAX_COST_USD: '20' }).map(s => s.name), ['primary', 'paid']);
  assert.deepEqual(capacitySlots({ ...PRIMARY, ...PAID, AI_PAID_SLOT_ENABLED: 'false', AI_MAX_COST_USD: '20' }).map(s => s.name), ['primary']);
});

test('429 on primary falls through to free slot, then primary cools down', async () => {
  resetCapacityState();
  const seen: string[] = [];
  let t = 1_000;
  const chat = async (_p: any, env: any) => {
    seen.push(env.OPENAI_COMPAT_BASE_URL);
    if (env.OPENAI_COMPAT_BASE_URL.includes('primary')) throw err(429);
    return { choices: [{ message: { content: 'ok' } }] };
  };
  const env = { ...PRIMARY, ...FREE };
  const r = await capacityChat(msg, { env, chat, now: () => t, random: () => 0.5 });
  assert.equal(r._capacitySlot, 'free');
  assert.equal(capacityStatus(env, t).slots[0].coolingDown, true);
  seen.length = 0;
  await capacityChat(msg, { env, chat, now: () => t, random: () => 0.5 });
  assert.deepEqual(seen, ['https://free.invalid/v1'], 'cooling slot skipped');
  t += 2_500;
  seen.length = 0;
  await capacityChat(msg, { env, chat, now: () => t, random: () => 0.5 });
  assert.equal(seen[0], 'https://primary.invalid/v1', 'primary retried after cooldown');
});

test('400 is not retried on another slot', async () => {
  resetCapacityState();
  let calls = 0;
  await assert.rejects(capacityChat(msg, { env: { ...PRIMARY, ...FREE }, chat: async () => { calls++; throw err(400); } }), (e: any) => e.status === 400);
  assert.equal(calls, 1);
});

test('all slots failing → 429 so caller degrades gracefully', async () => {
  resetCapacityState();
  await assert.rejects(capacityChat(msg, { env: { ...PRIMARY, ...FREE }, chat: async () => { throw err(503); } }), (e: any) => e.status === 503 || e.status === 429);
  await assert.rejects(capacityChat(msg, { env: { ...PRIMARY, ...FREE }, chat: async () => ({}) }), (e: any) => e.status === 429);
});

test('bounded concurrency: excess waits in queue, overflow rejected with 429', async () => {
  resetCapacityState();
  const env = { ...PRIMARY, AI_CAPACITY_MAX_CONCURRENCY: '1', AI_CAPACITY_MAX_QUEUE: '1', AI_CAPACITY_QUEUE_TIMEOUT_MS: '5000' };
  let release!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  let active = 0, peak = 0;
  const chat = async () => { active++; peak = Math.max(peak, active); await gate; active--; return {}; };
  const a = capacityChat(msg, { env, chat });
  const b = capacityChat(msg, { env, chat });
  await assert.rejects(capacityChat(msg, { env, chat }), (e: any) => e.code === 'queue_full');
  release();
  await Promise.all([a, b]);
  assert.equal(peak, 1);
  assert.equal(capacityStatus(env).inFlight, 0);
});

test('cooldown grows exponentially and is capped', () => {
  const cfg = capacityConfig({});
  assert.equal(cooldownMs(1, cfg, () => 0.5), 2_000);
  assert.equal(cooldownMs(2, cfg, () => 0.5), 4_000);
  assert.equal(cooldownMs(20, cfg, () => 0.5), 60_000);
});

test('status never exposes keys or urls', () => {
  const s = JSON.stringify(capacityStatus({ ...PRIMARY, ...FREE }));
  assert.ok(!s.includes(K) && !s.includes('invalid'));
});
