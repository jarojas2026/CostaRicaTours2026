# Provider proforma email — end-to-end contract

This document defines the production-safe provider email flow used by Costa Rica Tours 2026.

## Test mailbox

The current acceptance-test recipient is configured outside source control. Never hardcode personal or provider email addresses in application code. Use `PROVIDER_DEV_EMAIL` or `PROVIDER_EMAILS_JSON` in non-production test environments.

## Flow

1. A traveler selects a real catalog service, date, time, passenger count and pickup/hotel details.
2. The backend persists the request/booking before any provider communication.
3. A verified provider assignment creates one durable `service_orders` record.
4. The provider receives an HTML proforma/availability request containing the operational summary and a single primary CTA: **Review and respond**.
5. The CTA opens `/provider/portal?token=...`. The capability is signed, expires, and is bound to one service order and one provider.
6. The portal is the mutation surface. Email GET clicks never confirm a booking, payment or cancellation.
7. Provider actions are recorded through `/api/provider/portal/action`: confirm, reject or propose an adjustment. Free-form notes remain available.
8. A normal email reply may also be classified by the provider inbox agent, but AI interpretation never bypasses provider identity checks or the booking state machine.
9. Customer payment is requested only after provider-backed availability/conditions are known and accepted.
10. Voucher issuance and provider payout require their existing server-side verification gates.

## Email content requirements

The provider message must include:

- TEST/PRODUCTION environment label;
- service-order and booking references;
- tour/service name;
- requested date and time;
- adults, children and total passengers;
- pickup/hotel information;
- operational customer contact only when needed;
- dietary/special requirements when relevant;
- provider settlement/proforma amount only when the commercial contract allows it;
- SLA/response deadline;
- one secure portal CTA;
- instruction that replying to the email is allowed;
- explicit statement that opening the link does not itself confirm anything.

## Acceptance test

A test is successful only when all of these are observed:

- exactly one service order is created for the booking (idempotent dispatch);
- exactly one provider email is sent to the configured test mailbox;
- the secure portal loads the same order from Firestore;
- the token cannot access an order assigned to another provider;
- confirm/reject/adjust changes the durable service-order state;
- the linked booking receives the corresponding provider state;
- repeated page loads do not repeat the action;
- no payment or voucher is created by merely opening the email/portal;
- audit timestamps identify dispatch and provider response.

## Safety

Production must fail closed when Firestore, provider identity, portal signing secret, public `APP_URL`, or operational provider assignment is unavailable. Static provider directories are development metadata only and must not authorize a production dispatch.
