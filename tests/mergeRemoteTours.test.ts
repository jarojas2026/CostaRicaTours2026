import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeRemoteTours } from '../src/utils/mergeRemoteTours';
import { TOURS } from '../src/data/toursCatalog';
import { OPERATOR_TOURS } from '../src/data/operatorTours';

test('operator tours stay visible when Firestore returns the curated tours', () => {
  const remote = TOURS.filter((t) => !t.id.startsWith('op-')).slice(0, 5).map((tour) => ({ tour: { ...tour }, docId: tour.id }));
  const merged = mergeRemoteTours(remote, TOURS);
  const ids = new Set(merged.map((t) => t.id));
  for (const op of OPERATOR_TOURS) assert.ok(ids.has(op.id), op.id);
  assert.equal(new Set(merged.map((t) => t.id)).size, merged.length);
  assert.equal(merged.length, TOURS.length);
});
