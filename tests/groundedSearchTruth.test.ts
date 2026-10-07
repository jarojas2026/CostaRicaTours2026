import assert from 'node:assert/strict';
import test from 'node:test';
import { performGroundedSearch } from '../backend/groundedSearchService';

test('without live AI search the assistant reports unavailable, never invents park or ferry status', async () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    for (const language of ['es', 'en'] as const) {
      const result = await performGroundedSearch('Are the parks open today?', language);
      assert.equal(result.success, false);
      assert.equal(result.modelUsed, 'unavailable');
      assert.deepEqual(result.sources, []);
      assert.doesNotMatch(result.answer, /operan normalmente|are operating|regular daily/);
    }
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  }
});
