# Booking & Provider Transaction Loop v1

## Goal

Every customer action must either advance a durable workflow, request missing information, or show an explicit recoverable error. No booking/availability CTA may silently do nothing or loop through generic chat prompts.

## Canonical lifecycle

`collecting_details -> availability_requested -> provider_pending -> available|alternative_offered|unavailable -> customer_acceptance -> payment_pending -> payment_verified -> provider_confirmation_pending -> confirmed -> service_delivered -> provider_payable -> provider_paid -> closed`

Terminal/exception states: `cancelled`, `expired`, `refunded`, `disputed`, `failed`.

## Availability truth model

1. Local Firestore booking counts are capacity protection, not proof of provider inventory.
2. `available` may only be asserted after a trusted provider API response or an authenticated provider response.
3. If the provider is not configured, verified and active, fail closed and explain the next action.
4. A quick availability request creates `availability_requests/{id}` and returns a durable request id immediately.
5. Duplicate clicks with the same customer/session/tour/date/time/passengers/provider deduplicate to the same request.

## Required customer data

Before provider dispatch: tour/service, date, passengers and provider assignment. Time, hotel/pickup, language and customer contact are collected when required by the service/provider.

## Provider response contract

A response can be: available, unavailable, partial capacity, alternative date/time, or changed provider net price. Responses must be correlated to the request id and provider id. Free-form email/WhatsApp can be interpreted by AI, but the state machine validates the structured event before any booking/payment transition.

## Payment safety

Do not charge before the customer accepts the provider-confirmed option and price. Payment success never means provider confirmation. Provider payout remains fail-closed and is eligible only after verified payment, provider confirmation, service policy conditions and settlement checks.

## UI acceptance criteria

- `Check availability` opens/selects a real date and creates a durable request; it must not re-send the same generic AI prompt.
- `Book` collects missing required fields and then advances the canonical lifecycle.
- Every loading state has success, validation, timeout and retry behavior.
- A CTA that cannot execute is disabled with a reason; it is never a dead click.
- WhatsApp is a channel/fallback, not the booking state machine.
- Customer sees the request/booking id and current state.
- Admin sees pending provider requests, aging, retries, failures and conversion funnel.
- Provider sees only assigned requests and may respond, suggest an alternative, or request a change; catalog master changes require approval.

## Firestore collections

- `availability_requests`: provider-backed availability inquiries.
- `bookings`: commercial booking record.
- `service_orders`: provider fulfillment record.
- `payment_events`: immutable payment facts.
- `provider_settlements`: payout ledger/batches.
- `audit_events`: operational audit trail where a dedicated event stream is required.

All client access must be protected by Firebase Authentication and Firestore Security Rules. Server SDK access is governed by IAM. App Check should be enforced after metrics/staging validation.
