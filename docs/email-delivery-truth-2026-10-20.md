# Email delivery truth — production safety change (2026-10-20)

## Verified defect on main
`sendEmail()` returned `{ success: true, id: "sim-mail-..." }` when **no SMTP, Resend or SendGrid transport was configured**. It only printed message metadata in the server log. A caller treating `success` as delivery could wrongly report a provider or traveler notification as sent.

## Patch
- Unconfigured transport returns `{ success:false, error:'email_transport_unconfigured' }`.
- No fabricated message ID and no logging of recipient/subject as a simulated send.
- Existing successful SMTP/Resend/SendGrid paths are unchanged.
- No change to booking, payment, provider acceptance, or any permission.

## Remaining risk and next PR
Some callers ignore `sendEmail()` results, especially `dispatchServiceOrder()`. They must be upgraded to persist `delivery_pending`/`delivery_failed` and retry safely, with no false `dispatched` status. **This PR alone does not certify successful provider dispatch or customer notifications.**

## Tests
`tests/emailDeliveryTruth.test.ts` checks the no-transport result and prohibits simulation markers. CI should run `npm run lint`, `npm run test:contracts`, `npm run build`. Do not merge if red; smoke test with a controlled mailbox in staging before production.

## Rollback
Revert this PR only after identifying callers that depended on fabricated success; do not restore false-positive delivery semantics in production.
