# Sales Readiness — Owner Commerce Panel (2026-10-20)

## Why
The existing CommerceOperationsPanel can register providers, offers and inventory, but only shows payment/voice configuration. It does not tell the owner **what prevents a sale**. This PR adds a source-aware preflight to the existing GET `/api/admin/commerce` and UI, without another CRM, payment, booking or agent system.

## Evidence and semantics
- Reads bounded Firestore samples: `operators`, `tours`, `availability_slots`, max 500 each.
- A **verified provider** requires `verified===true && active===true`.
- A **profile with agreement/email** also needs numeric contractual `commissionRate` and operational email; no contact details are exposed by the preflight.
- A **candidate offer** must be `catalogStatus=bookable`, have positive numeric price and departures, and belong to such a provider.
- A **candidate dated slot** must match offer/provider/departure, have valid remaining capacity, and not be in the past (Costa Rica local date).
- Configuration flags indicate credentials/transport *present*, never proven payment or email delivery. Lead auto-followup defaults off.
- `state=sample_needs_external_verification` always: neither inventory nor payment availability is confirmed by this read-only preflight.
- Counts are sample counts, **not global totals**; hitting 500 marks coverage limited. Firestore failure returns existing 503, not fabricated zeros.

## New UI
Four responsive cards and an ordered checklist with owner actions in ES/EN; no PII and no write side effects. Existing provider/product/offer/slot forms remain unchanged.

## QA
`tests/commerceSalesReadiness.test.ts`: verified/contracted providers, offers, future slots, absent rate, invalid inventory, discovery-only, scope labels, route guard. Run lint, contracts, build, E2E. Verify owner authentication separately with staging Firebase identity; coordinate PR #311 role fix before deploying.

## Not covered
- Provider live acceptance, contract authenticity, charge capture, refund reconciliation, delivery receipts, lead counts across all time, all inventory beyond sample.
- No new background agent, webhook, payment, or automatic supplier communication.
- This is a decision support projection for JARVIS and owner, not an autonomous sales confirmation.

## Rollback
Revert this PR; the route's original response fields remain backward compatible. No data migrations or Firestore writes.
