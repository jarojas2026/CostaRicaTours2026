import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rateLimitStoreOption, sharedStateConfig, MemoryStateStore } from '../backend/sharedStateStore';

const LIMITERS: Array<[string, string]> = [
  ['paymentLimiter', 'payment'], ['counterLimiter', 'counter'], ['chatLimiter', 'chat'],
  ['generalApiLimiter', 'general'], ['llmLimiter', 'llm'],
];

test('cada limitador de routes/shared.ts usa rateLimitStoreOption con su prefijo y ventana', () => {
  const src = readFileSync('backend/routes/shared.ts', 'utf8');
  assert.match(src, /import \{ rateLimitStoreOption \} from '\.\.\/sharedStateStore';/);
  for (const [name, prefix] of LIMITERS) {
    const re = new RegExp(`export const ${name} = rateLimit\\(\\{\\n  \\.\\.\\.rateLimitStoreOption\\('${prefix}', 60 \\* 1000\\),\\n  windowMs: 60 \\* 1000,`);
    assert.match(src, re, name);
  }
});

test('por defecto (sin SHARED_STATE_STORE) no se pasa store: express-rate-limit usa su MemoryStore de siempre', () => {
  assert.equal(sharedStateConfig({}).kind, 'memory');
  for (const [, prefix] of LIMITERS) assert.deepEqual(rateLimitStoreOption(prefix, 60_000, {}), {});
  // upstash pedido pero sin URL/token válidos → sigue en memoria
  assert.deepEqual(rateLimitStoreOption('chat', 60_000, { SHARED_STATE_STORE: 'upstash' }), {});
  assert.deepEqual(rateLimitStoreOption('chat', 60_000, { SHARED_STATE_STORE: 'upstash', UPSTASH_REDIS_REST_URL: 'http://insecure', UPSTASH_REDIS_REST_TOKEN: 'x'.repeat(30) }), {});
});

test('con store explícito el adaptador cuenta por prefijo y ventana', async () => {
  const opt = rateLimitStoreOption('chat', 60_000, {}, new MemoryStateStore());
  assert.ok(opt.store);
  const a = await opt.store!.increment('1.2.3.4');
  const b = await opt.store!.increment('1.2.3.4');
  assert.equal(a.totalHits, 1);
  assert.equal(b.totalHits, 2);
  await opt.store!.decrement('1.2.3.4');
  assert.equal((await opt.store!.increment('1.2.3.4')).totalHits, 2);
});
