import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { evaluatePayoutEligibility } from '../backend/providerPayoutPolicy';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const verifiedPastBooking = {
  bookingId: 'CRT-TEST-1',
  status: 'confirmada',
  paymentStatus: 'completed',
  providerStatus: 'confirmed',
  providerId: 'provider-real',
  totalUSD: 250,
  date: '2026-09-20'
};

test('provider payout policy requires verified payment, provider confirmation and a past service date', () => {
  assert.deepEqual(
    evaluatePayoutEligibility(verifiedPastBooking, '2026-09-27'),
    { eligible: true, totalUSD: 250, providerId: 'provider-real', tourDate: '2026-09-20' }
  );

  assert.equal(
    evaluatePayoutEligibility({ ...verifiedPastBooking, paymentStatus: 'pending' }, '2026-09-27').eligible,
    false
  );
  assert.equal(
    evaluatePayoutEligibility({ ...verifiedPastBooking, status: 'pendiente_pago' }, '2026-09-27').eligible,
    false
  );
  assert.equal(
    evaluatePayoutEligibility({ ...verifiedPastBooking, providerStatus: 'notified' }, '2026-09-27').eligible,
    false
  );
  assert.equal(
    evaluatePayoutEligibility({ ...verifiedPastBooking, date: '2026-09-27' }, '2026-09-27').eligible,
    false
  );
  assert.equal(
    evaluatePayoutEligibility({ ...verifiedPastBooking, date: '2026-10-01' }, '2026-09-27').eligible,
    false
  );
});

test('provider payout policy rejects invented financial/provider data', () => {
  assert.deepEqual(
    evaluatePayoutEligibility({ ...verifiedPastBooking, providerId: '' }, '2026-09-27'),
    { eligible: false, reason: 'provider_id_missing' }
  );
  assert.deepEqual(
    evaluatePayoutEligibility({ ...verifiedPastBooking, totalUSD: 0 }, '2026-09-27'),
    { eligible: false, reason: 'invalid_total_usd' }
  );
  assert.deepEqual(
    evaluatePayoutEligibility({ ...verifiedPastBooking, totalUSD: undefined }, '2026-09-27'),
    { eligible: false, reason: 'invalid_total_usd' }
  );
});

test('paid or processing settlements are not submitted again', () => {
  assert.deepEqual(
    evaluatePayoutEligibility({ ...verifiedPastBooking, payoutStatus: 'paid' }, '2026-09-27'),
    { eligible: false, reason: 'already_paid' }
  );
  assert.deepEqual(
    evaluatePayoutEligibility({ ...verifiedPastBooking, payoutStatus: 'processing' }, '2026-09-27'),
    { eligible: false, reason: 'payout_in_progress' }
  );
});

test('Firestore client rules cannot forge the authoritative booking ledger', () => {
  const rules = read('firestore.rules');
  const bookingBlock = rules.match(/match \/bookings\/\{bookingId\} \{([\s\S]*?)\n    \}/)?.[1] || '';
  assert.match(bookingBlock, /allow create, update, delete: if isAdmin\(\);/);
  assert.doesNotMatch(bookingBlock, /allow create: if isSignedIn/);
  assert.doesNotMatch(bookingBlock, /allow update: if isAdmin\(\) \|\|/);
});

test('scheduled payouts use the fail-closed service behind a distributed lock', () => {
  const cron = read('backend/cronEngine.ts');
  assert.match(cron, /from '\.\/providerPayoutService';/);
  assert.match(cron, /withDistributedAutomationLock\('provider-payouts-daily-6am', executeAutomatedProviderPayouts\)/);

  const nativeImport = cron.match(/import \{([\s\S]*?)\} from '\.\/nativeWorkflows';/)?.[1] || '';
  assert.doesNotMatch(nativeImport, /executeAutomatedProviderPayouts/);
});

test('payout implementation never simulates a paid accounting state', () => {
  const service = read('backend/providerPayoutService.ts');
  assert.match(service, /ENABLE_PROVIDER_PAYOUTS !== 'true'/);
  assert.match(service, /paypal_live_mode_required/);
  assert.match(service, /payoutStatus: 'processing'/);
  assert.doesNotMatch(service, /SUCCESS_SIMULATED/);
  assert.doesNotMatch(service, /totalAmount \|\| 100/);
  assert.doesNotMatch(service, /commissionRate \?\? 0\.15/);
});
