import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('autonomous booking permits newly published Firestore offers to reach canonical validation', () => {
  const src = readFileSync('backend/nativeAutomationEngine.ts', 'utf8');
  const flow = src.slice(src.indexOf('export async function executeAutonomousFullBookingLifecycle'));
  assert.doesNotMatch(flow, /TOURS\.some\(tour => tour\.id === tourId\)/);
  assert.match(flow, /\/\^\[a-zA-Z0-9_-\]\{1,160\}\$\//);
  assert.match(flow, /const bookingResult = await createBooking\(/);
  assert.match(flow, /tourId,/);
  assert.doesNotMatch(flow, /resolvedTour = TOURS\[0\]/);
});
