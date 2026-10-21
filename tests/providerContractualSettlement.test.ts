import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateContractualSettlementUSD } from '../backend/providerPayoutPolicy';

test('contractual settlement uses the actual verified commission, never a default 15%', () => {
  assert.deepEqual(calculateContractualSettlementUSD(200, 0.12), {
    payoutAmountUSD: 176,
    platformFeeUSD: 24,
  });
  assert.deepEqual(calculateContractualSettlementUSD(199.99, 0.2), {
    payoutAmountUSD: 159.99,
    platformFeeUSD: 40,
  });
  assert.deepEqual(calculateContractualSettlementUSD(250, 0), {
    payoutAmountUSD: 250,
    platformFeeUSD: 0,
  });
});

test('missing, invalid and invented commissions fail closed', () => {
  for (const rate of [undefined, null, '', '0.15', -0.01, 1, Number.NaN]) {
    assert.equal(calculateContractualSettlementUSD(200, rate), null);
  }
  for (const amount of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(calculateContractualSettlementUSD(amount, 0.1), null);
  }
});

test('service orders read the rate from verified Firestore provider profiles', () => {
  const service = readFileSync('backend/providerCommunicationService.ts', 'utf8');
  assert.match(service, /calculateContractualSettlementUSD\(params\.totalUSD, provider\.commissionRate\)/);
  assert.match(service, /commissionRate: isValidCommissionRate\(/);
  assert.match(service, /settlementSource: 'verified_provider_profile'/);
  assert.doesNotMatch(service, /totalUSD \* 0\.85/);
  assert.doesNotMatch(service, /totalUSD \* 0\.15/);
});
