# Organizational Agent Memory — Customer ↔ Platform ↔ Provider

## Purpose

Costa Rica Tours must treat real customer/provider interactions as durable operational knowledge, not as isolated chat or email messages. The platform should automatically continue the same Journey across web, email, WhatsApp, voice, provider portal and admin channels.

This document captures the reusable operational pattern validated by the Viviana Elizondo lodging request without storing her personal data in source control.

## Canonical flow

CUSTOMER REQUEST
→ resolve traveler identity and Journey
→ extract structured requirements with provenance
→ separate CONFIRMED facts from UNVERIFIED requirements/results
→ determine required truth planes
→ search internal catalog/provider network first
→ perform live/provider-authoritative verification when required
→ create provider service/quote requests when inventory is not directly verifiable
→ persist observations, requests and responses
→ compare only evidence-backed options
→ prepare/send customer response according to autonomy policy
→ update Journey, operational memory, audit events and next action
→ learn reusable process outcomes without memorizing unsupported claims.

## Example pattern: accommodation quote

A lodging request can contain:
- destination;
- check-in/check-out;
- adults;
- children and ages;
- nightly or total budget;
- required amenities/meals/parking;
- room preferences;
- cancellation/payment constraints.

Each extracted field must carry provenance such as `CUSTOMER_PROVIDED`, timestamp and source channel/message identifier. Customer-provided requirements are confirmed as customer intent, but they do not establish hotel availability or price.

The platform then creates a verification task. Candidate hotels discovered from public knowledge are `UNVERIFIED` until the requested dates, occupancy, rate and required conditions are checked against a live or provider-authoritative source.

## Required separation of truth

### Confirmed customer facts
Facts explicitly supplied by the customer. They may be used to search and request quotes automatically.

### Verified operational facts
Availability, rate, taxes, room configuration, child policy, breakfast, parking, cancellation and payment terms verified for the requested stay. These require live/provider-authoritative evidence and `verifiedAt`.

### Pending facts
Anything not yet verified. Pending data must never be phrased to the traveler as confirmed inventory, final price or reservation.

## Provider workflow

When direct inventory is unavailable, Provider Liaison should automatically:
1. identify eligible verified suppliers for the destination/service;
2. create an idempotent quote/service request linked to the Journey and correlation ID;
3. send the minimum necessary customer requirements;
4. persist provider response status;
5. parse the response into structured fields with `PROVIDER_PROVIDED` provenance;
6. detect missing or contradictory fields and request clarification;
7. promote facts to verified operational state only when evidence supports it;
8. return verified options to the Booking/Sales flow.

Supplier rejection or no availability triggers recovery/alternative search, never invented confirmation.

## Organizational memory model

Do not store one giant transcript as memory. Persist linked, typed records:

- `traveler_journeys`: durable business state and next action.
- traveler/operational memory: useful customer context and decisions.
- communication events: channel, external thread/message IDs, direction, timestamps and correlation IDs.
- verification observations: source, truth plane, status, `observedAt`/`verifiedAt`, expiration where relevant.
- provider/service orders: requested service, requirements, supplier, state and response.
- quote snapshots: itemized verified commercial terms and validity.
- agent/audit events: tool/action, policy decision, result, error/retry and responsible capability.
- learning records: reusable workflow lessons derived from real outcomes, without turning a single provider quote into permanent market truth.

External thread IDs (for example Gmail thread/message IDs) are references to the source conversation and should allow later events to resume the same Journey. Raw personal email content must not be committed to GitHub.

## Agent responsibilities

- **Triage**: classify lodging/tour/transport/etc. request and missing fields.
- **Concierge**: preserve customer continuity and ask only genuinely missing questions.
- **Booking**: own verification requirements, quote composition and booking transition.
- **Provider Liaison**: supplier discovery, requests, follow-ups and structured responses.
- **Supervisor**: detect contradictions, stale evidence, unsupported claims and escalation needs.
- **Operations**: continue confirmed services and recovery.
- **Learning**: learn process effectiveness from audited outcomes, not invented provider facts.

All agents operate on the same Journey and truth model; none should maintain an independent customer or booking truth store.

## Automation trigger contract

Inbound customer/provider events should invoke the canonical business-goal orchestration. A lodging quote intent with sufficient confirmed requirements should not wait for an administrator to manually repeat a web search. It should enqueue/execute the permitted search and provider-verification actions automatically.

The orchestration result must always include:
- `correlationId`;
- `journeyId`;
- `intent`;
- `confirmedFacts[]`;
- `verifiedFacts[]`;
- `pendingFacts[]`;
- `actionsExecuted[]`;
- `providerRequests[]`;
- `nextAction`;
- `customerCommunicationState`;
- provenance/evidence references.

## Idempotency and recovery

Use stable event/message IDs plus Journey ID as idempotency inputs. Reprocessing the same Gmail/webhook/provider event must not create duplicate quote requests, bookings or customer replies. External failures use bounded retry/backoff; exhausted retries create an auditable exception and human escalation when policy requires it.

## Privacy and retention

Store only data necessary to deliver and audit the service. Separate operational identifiers from source-control documentation. Never commit customer emails, phone numbers, payment data or provider credentials. Identity conflicts require verification rather than automatic merging.

## Acceptance scenario

Given an inbound accommodation request with destination, dates, party, child age, budget and required amenities:

1. requirements are extracted once and persisted with provenance;
2. the same Journey is recovered on subsequent email/provider replies;
3. automated discovery/verification starts without an owner manually re-entering requirements;
4. public candidates remain unverified until live/provider evidence exists;
5. provider requests preserve the exact requirements;
6. customer-facing output visibly separates confirmed requirements, verified offers and pending availability;
7. a provider response updates the existing Journey rather than creating a disconnected case;
8. duplicate inbound events produce no duplicate side effects;
9. every external action has a correlation/audit trail;
10. successful/failed outcomes feed organizational learning about the workflow, while time-sensitive price/availability facts expire and are never generalized as permanent truth.

## Implementation rule

Implement this additively using the existing `travelerIdentityService`, memory services, `travelJourneyOrchestrator`, `journeyVerificationService`, booking state machine/services, provider services, native automation, `agentTools`, `agentKnowledgeFabric`, `agentMeshService`, `autonomyPolicy`, Voice Agent Desk and Admin Control Center. Do not create a parallel booking or memory architecture.