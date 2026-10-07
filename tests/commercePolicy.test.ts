import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { reservationQuote, slotAvailability, assertServiceDate, checkoutQuote, checkoutOrigin } from '../backend/commercePolicy';
import { resolveCommerceTour } from '../backend/commerceCatalog';

const tour = { id: 'tour-1', catalogStatus: 'bookable', providerId: 'provider-1', priceUSD: 100.25, childPriceUSD: 55.10 };
const slot = { active: true, tourId: 'tour-1', providerId: 'provider-1', date: '2099-01-01', time: '08:00', maxCapacity: 8, bookedSeats: 5 };
test('family quote uses catalog cents, not browser totals, and honors child rates', () => {
  assert.equal(reservationQuote({ ...tour, totalUSD: 0.01 }, 2, 2).totalUSD, 310.7);
  assert.equal(reservationQuote({ ...tour, childPriceUSD: 0 }, 1, 1).totalUSD, 100.25);
});
test('invalid party sizes, inquiry listings and invalid prices cannot be booked', () => {
  for (const count of [-1, 0, 0.5, NaN, Infinity, 201]) assert.throws(() => reservationQuote(tour, count, 0));
  for (const count of [-1, 0.5, NaN]) assert.throws(() => reservationQuote(tour, 1, count));
  for (const priceUSD of [0, -1, NaN, Infinity]) assert.throws(() => reservationQuote({ ...tour, priceUSD }, 1, 0));
  assert.throws(() => reservationQuote({ ...tour, catalogStatus: 'inquiry' }, 1, 0));
  assert.throws(() => reservationQuote({ ...tour, providerId: '' }, 1, 0));
});
test('inventory is explicit, date/provider-specific and never inferred from group size', () => {
  const read = (value: any, seats = 3) => slotAvailability(value, 'tour-1', 'provider-1', '2099-01-01', '08:00', seats);
  assert.equal(read(slot).remainingSeats, 3);
  for (const value of [undefined, {}, { ...slot, active: false }, { ...slot, providerId: 'other' }, { ...slot, date: '2099-01-02' }, { ...slot, bookedSeats: -1 }, { ...slot, maxCapacity: NaN }]) assert.throws(() => read(value));
  assert.throws(() => read(slot, 4));
  assert.throws(() => read(slot, -1));
});
test('dates are calendar-valid and use Costa Rica local day', () => {
  const now = new Date('2026-10-06T01:00:00Z');
  assert.doesNotThrow(() => assertServiceDate('2026-10-05', now));
  for (const date of ['2026-10-04', '2026-02-30', '2099-13-01', 'garbage']) assert.throws(() => assertServiceDate(date, now));
});
test('payment needs a current booking with provider confirmation, never a browser price', () => {
  const booking = { date: '2099-01-01', status: 'payment_pending', paymentStatus: 'pending', providerId: 'provider-1', providerStatus: 'accepted', providerConfirmedAt: '2026-10-05', totalUSD: 310.7 };
  assert.deepEqual(checkoutQuote(booking), { totalUSD: 310.7, totalCents: 31070 });
  for (const patch of [{ providerConfirmedAt: null }, { providerId: '' }, { providerStatus: 'rejected' }, { status: 'cancelled' }, { paymentStatus: 'completed' }, { availabilityReleased: true }, { totalUSD: NaN }, { totalUSD: 0 }]) assert.throws(() => checkoutQuote({ ...booking, ...patch }));
});
test('payment return always uses a configured public HTTPS origin', () => {
  assert.equal(checkoutOrigin({ APP_URL: 'https://store.example.test/' }), 'https://store.example.test');
  for (const APP_URL of ['', 'http://example.test', 'https://user:password@example.test', 'https://example.test/path']) assert.throws(() => checkoutOrigin({ APP_URL }));
});
test('catalog resolves explicit IDs, fails closed on ambiguity and never uses local discovery price', async () => {
  assert.equal(await resolveCommerceTour(null, 'tour-1'), null);
  const fake = (docs: any[]) => ({ collection: () => ({
    doc: () => ({ get: async () => ({ exists: false }) }),
    where: () => ({ limit: () => ({ get: async () => ({ size: docs.length, docs }) }) })
  }) }) as any;
  assert.equal(await resolveCommerceTour(fake([]), 'tour-1'), null);
  const doc = { id: 'imported', data: () => tour };
  assert.equal(await resolveCommerceTour(fake([doc, doc]), 'tour-1'), null);
  assert.equal((await resolveCommerceTour(fake([doc]), 'tour-1'))?.catalogDocumentId, 'imported');
});
test('booking and admin mutations retain transaction safety, audit and admin-only boundaries', () => {
  const booking = readFileSync('backend/bookingService.ts', 'utf8');
  const admin = readFileSync('backend/commerceAdminRouter.ts', 'utf8');
  assert.match(booking, /transaction\.create\(bookingRef/);
  assert.match(booking, /slotAvailability\(slotDoc\.data\(\)/);
  assert.match(booking, /const currentQuote = reservationQuote\(product/);
  assert.doesNotMatch(booking, /if \(cached\) return cached/);
  assert.match(admin, /adminAccess\?\.role !== 'admin'/);
  assert.match(admin, /tx\.create\(auditRef/);
  assert.match(admin, /bookedSeats > maxCapacity/);
});
