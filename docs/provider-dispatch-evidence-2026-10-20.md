# Provider dispatch evidence and retries (2026-10-20)

This PR is **stacked on #308** and requires the no-transport `sendEmail` fallback to return `success:false`. Do not merge this PR before #308.

## Main defect
`dispatchServiceOrder()` previously persisted an order as `dispatched` before submitting email, called `sendEmail` without awaiting its result, and swallowed errors. The reservation lifecycle could then announce a provider request as sent when only a Firestore record existed. The no-transport mail fallback on main compounded the issue by returning `sim-mail-*` success.

## Changes
- Require Firestore and an operational email address before creating the order.
- Persist `dispatch_pending` and `deliveryStatus:pending` before sending.
- Await `sendEmail()`; on failure retain `deliveryStatus:failed`, create alert and throw so the canonical lifecycle records an error, not a completed dispatch.
- On success set `deliveryStatus:transport_accepted`, `status:dispatched`, receipt ID, persist and update booking. **Transport accepted is not operator acceptance or confirmed availability.**
- Retry an existing pending/failed order with the same order ID; do not create a duplicate.
- Do not log provider phone or email in dispatch status.

## Known limitations
- Email submission is at-least-once, not exactly-once: if the process dies after transport acceptance but before Firestore persistence, retry could resend the same order ID. Use provider idempotency or a reconciliation workflow before declaring exactly-once.
- Legacy orders without `deliveryStatus` need review; a retry may re-send an order ID. Do not mass-retry legacy orders without a staged rollout.
- This patch does not modify the provider portal, booking payment, settlement percentages, or the automatic provider failover path. Financial contract correction is in PR #309.
- Provider email transport acceptance is not proof of receipt, reading, or acceptance by the provider.
- `updateBookingStatus` still swallows errors and should be audited in a separate transaction-safety PR.

## QA and deployment
- `tests/providerDispatchEvidence.contract.test.ts`, `npm run lint`, `npm run test:contracts`, `npm run build`.
- Sandbox: Firestore unavailable; provider not verified; no email; SMTP absent; SMTP returns failure; SMTP success; duplicate retry; crash after submission; provider response and payment remain separate.
- No real supplier contacts in CI.
