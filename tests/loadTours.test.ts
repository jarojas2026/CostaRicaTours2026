import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTours, peekTours } from '../src/data/loadTours';
import { TOURS } from '../src/data/toursData';

test('loadTours resolves the full catalog once and caches it', async () => {
  assert.equal(peekTours(), null);
  const [first, second] = await Promise.all([loadTours(), loadTours()]);
  assert.equal(first, second);
  assert.equal(first, TOURS, 'lazy and static entry points share the same module instance');
  assert.ok(first.length > 0);
  assert.equal(peekTours(), first);
  assert.equal(await loadTours(), first);
});
