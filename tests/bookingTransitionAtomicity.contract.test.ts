import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../backend/bookingService.ts', import.meta.url), 'utf8');

test('booking lifecycle and provider evidence are revalidated against the transaction snapshot', () => {
  assert.match(source, /function assertBookingUpdateAllowed\(existing: any, updates: any\): void/);
  assert.match(source, /assertBookingTransition\(fromLifecycle, toLifecycle\)/);
  assert.match(source, /toLifecycle === 'confirmed'[\s\S]{0,220}hasProviderConfirmationEvidence\(existing, updates\)/);
  assert.match(source, /runTransaction\(async \(transaction\) => \{[\s\S]{0,500}assertBookingUpdateAllowed\(current, updates\)[\s\S]{0,300}transaction\.set\(bookingRef/);
});

test('cancellation rechecks the latest lifecycle before releasing inventory', () => {
  assert.match(source, /if \(isCancelling\)[\s\S]{0,700}runTransaction\(async \(transaction\) => \{[\s\S]{0,500}assertBookingUpdateAllowed\(current, updates\)[\s\S]{0,500}availabilityReleased/);
});
