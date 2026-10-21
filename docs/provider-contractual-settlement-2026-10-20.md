# Service-order contractual settlement — 20 October 2026

## Main branch defect (verified in code)
`backend/providerCommunicationService.ts` generated service orders with **85% provider / 15% platform**, even when no contractual rate existed. The canonical payout service `backend/providerPayoutService.ts` instead uses an explicit `commissionRate` on a verified Firestore `operators` or `proveedores` document. This discrepancy could misstate a provider's expected payment and the platform's margin.

## Patch
- Reuse `isValidCommissionRate` and add pure `calculateContractualSettlementUSD` to `providerPayoutPolicy.ts`.
- Read `commissionRate` from the verified Firestore provider profile, matching the payout service's `operators.commissionRate` or `proveedores.comision/commissionRate` logic.
- Block service-order creation if no verified contractual commission or positive USD amount exists; do **not** assume 15%.
- Persist `commissionRate` and `settlementSource='verified_provider_profile'` with the service order.
- No changes to PayPal payout execution, payment verification, provider acceptance or booking state machine.

## Operational prerequisites
Admin must verify the provider, attach evidence of the negotiated agreement, and record a valid commission rate in Firestore through existing `commerceAdminRouter`. No agreement = no financial settlement or provider order. This is an intentional fail-closed business control, **not** proof the supplier is available.

## Remaining risks
- Provider email may be unconfigured or undelivered; PR #308 removes simulated success, but dispatch and lifecycle still need a durable delivery-state and retry mechanism.
- USD-to-CRC conversion uses `USD_TO_CRC_RATE` without verified timestamp; needs separate evidence/freshness design.
- `REGISTERED_PROVIDERS` contains a legacy illustrative directory and cannot be treated as a real operator network.
- Service-order dispatch currently swallows some persistence and email errors; follow-up work required.

## QA
`tests/providerContractualSettlement.test.ts` covers 12%/20%/0%, rounding, invalid rates, no default. Run `npm run lint`, `npm run test:contracts`, `npm run build` and sandbox provider order tests. Do not merge red checks or claim a provider was contacted.

## Rollback
Revert PR only after reviewing existing service orders that may have used synthetic 15% rates; never use those amounts as authoritative payout evidence.
