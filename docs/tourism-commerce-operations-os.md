# Costa Rica Tours 2026 — Tourism Commerce & Operations OS

## Product identity

Costa Rica Tours 2026 is not primarily a tour website with an AI chatbot. It is an AI-first Tourism Commerce & Operations Operating System, initially specialized in Costa Rica.

It connects traveler identity, memory, tourism intelligence, planning, catalog, live verification, booking, payments, suppliers, trip operations, omnichannel service, administration and learning around one persistent Journey.

The public website is one channel into the operating system. WhatsApp, email, voice, hotel/PBX Agent Desk, provider interactions and administrative workflows must converge on the same identity, Journey, domain services and sources of truth.

## North-star outcome

The system should move a traveler through the complete lifecycle without losing context:

DISCOVER → UNDERSTAND → PLAN → VERIFY → QUOTE → RESERVE → PAY → SUPPLIER CONFIRMATION → PRE-TRIP → IN-DESTINATION OPERATIONS → RECOVERY/REPLANNING → COMPLETION → POST-TRIP → RETENTION.

A response is not the product outcome. A coherent, verifiable and recoverable traveler journey is.

## Core invariant: Journey is the business aggregate

The Journey is the durable business object joining traveler intent with operational execution. Conversation threads are inputs to a Journey; they are not independent sources of business state.

A Journey may reference:
- canonical traveler identity;
- party and companions;
- preferences, constraints and decisions;
- itinerary and route strategy;
- catalog selections;
- live availability observations;
- weather/operational observations;
- quotes and proformas;
- bookings and payment state;
- supplier/service orders;
- communications and handoffs;
- incidents and adaptations;
- completion outcomes and feedback.

Confirmed choices, payment state and provider confirmations must never be silently rewritten by a planning agent.

## Traveler Digital Twin

`travelerIdentityService`, operational memory and `traveler_journeys` together form the Traveler Digital Twin. It is not a speculative profile. Every field must have provenance and should only exist when useful to service delivery.

Conceptual domains:
- Identity: canonical ID and channel aliases.
- Party: travelers and companions relevant to the Journey.
- Preferences: pace, interests, regions, accommodation/activity preferences.
- Constraints: dates, budget context, accessibility or voluntarily provided restrictions.
- Decisions: explicit choices and rejected alternatives.
- Journey state: current stage and next operational action.
- Commerce: quotes, bookings and payments linked by identifiers, never inferred.
- Operations: supplier confirmations, incidents and service completion.
- Communication: channel history and human handoffs.

Privacy rule: collect the minimum necessary. Identity conflicts require verification and must never be auto-merged.

## Unified Travel Intelligence

Customers should experience one Costa Rica Tours intelligence, even though specialized agents exist internally.

Canonical execution model:

IDENTITY → JOURNEY → MEMORY → KNOWLEDGE/TRUTH → OBSERVE → REASON/PLAN → SPECIALIST/TOOL ROUTING → AUTONOMY POLICY → EXECUTE → VERIFY RESULT → COMMUNICATE → EVENT/AUDIT → LEARN.

Specialist agents remain capabilities of the shared operating system:
- Concierge: discovery and continuity.
- Triage: intent, urgency and risk.
- Booking: availability, quote and booking coordination.
- Provider Liaison: supplier communication.
- Operations: service execution and contingencies.
- Supervisor: contradictions, policy and escalation.
- Learning: evidence-backed lessons.
- Extension agents: itinerary, conversion, multilingual, sustainability, safety/health and payments support.

No agent owns an alternative booking system, price source, availability source or traveler identity store.

## Four truth planes

Every operational claim belongs to a truth plane and must preserve provenance, verification time and confidence where relevant.

### Knowledge Truth
Stable tourism knowledge and destination intelligence. It can inform reasoning but cannot prove live conditions.

### Commercial Truth
Authoritative catalog, product configuration, policies and server-authoritative prices.

### Operational Truth
Availability, supplier state, weather observations, schedules, service orders and execution status. Live claims require a live or provider-authoritative source.

### Transactional Truth
Booking state, payment verification, refunds, payouts and vouchers. Transactional truth is established by authoritative backend/provider evidence, never by client claims.

Existing provenance vocabulary remains valid: STABLE_KNOWLEDGE, LIVE_VERIFIED, CUSTOMER_PROVIDED, PROVIDER_PROVIDED, AUTHORITATIVE_CATALOG and UNVERIFIED.

Invariant: an AI inference may not promote UNVERIFIED data into LIVE_VERIFIED, PROVIDER_PROVIDED or transactional confirmation.

## Supplier Network

Providers are not merely email recipients. They form an operational supply network. Firestore-verified provider records are authoritative; historical/static directories are metadata only.

The target provider model connects:
SERVICE/TOUR → ELIGIBLE VERIFIED SUPPLIERS → COMMERCIAL/OPERATIONAL CONSTRAINTS → AVAILABILITY → SERVICE ORDER → PROVIDER RESPONSE → EXECUTION → OUTCOME.

Provider performance must be derived only from real events. Do not seed acceptance rates, response times, rankings, certifications, licenses or commercial agreements as if verified.

Supplier matching may consider region, active services, verified/active state, operational status and observed historical outcomes. It must never fabricate a supplier when none is eligible.

## Omnichannel Counter / Agent Desk

Supported and planned channels are adapters around the same business brain:
WEB | WHATSAPP | EMAIL | VOICE | HOTEL/PBX | PROVIDER PORTAL | ADMIN.

All channels should resolve canonical traveler identity when possible, continue the same Journey and use the same domain services.

Voice/hotel operation is a portable Tourism Desk as a Service capability. A hotel can forward a room/PBX call to the Agent Desk; hotel/room context is metadata, not a separate traveler database. Human transfer remains available.

## Journey Guardian / Trip Operations

Planning does not end after payment. The Journey Guardian observes relevant operational signals and protects the active trip.

Operational windows:
- pre-trip: verification of outstanding supplier/booking requirements;
- near-service: availability/provider/pickup/operational readiness;
- in-destination: support, incidents and changes;
- recovery: alternatives after supplier rejection or operational disruption;
- completion: service outcome and post-trip transition.

Guardian rules:
- observe before mutating;
- preserve unaffected itinerary elements;
- never silently alter confirmed choices, payment state or traveler preferences;
- live weather is context unless it specifically covers the relevant service time and source;
- supplier rejection triggers recovery, not invented confirmation;
- irreversible or financially sensitive actions follow autonomy policy.

## Mission Control

The admin surface is Tour Operator Mission Control, not merely a dashboard.

It should answer three layers using real data:
- NOW: what requires attention now?
- NEXT: what may require intervention in the coming operational window?
- BUSINESS: what is happening across sales, bookings, suppliers, operations and AI quality?

Owner Copilot queries should be answerable from audited operational data: unconfirmed services, customers waiting for response, payment reconciliation needs, unresolved alerts, high-intent Journeys and provider exceptions.

No synthetic KPI is permitted.

## Graduated autonomy

Autonomy is capability- and risk-specific, not a global 'AI on/off' switch.

L0 OBSERVE — read and summarize only.
L1 RECOMMEND — propose an action with evidence.
L2 PREPARE — create reversible drafts/tasks/notifications awaiting policy gates where required.
L3 EXECUTE_REVERSIBLE — execute authorized, reversible operational actions.
L4 EXECUTE_POLICY — execute policy-approved domain actions with idempotency and audit.
L5 HUMAN_REQUIRED — money movement, refunds, destructive actions, legal/policy changes, ambiguous identity or other high-risk decisions unless a future explicit policy grants narrower authority.

Current code may expose fewer numeric levels for compatibility; new work should map those levels to this semantic model rather than bypassing existing interfaces.

## Business goal execution contract

New orchestration should converge on one conceptual `executeBusinessGoal` pipeline rather than creating isolated agent workflows. The pipeline must:
1. establish correlation ID and channel;
2. resolve identity;
3. load or create Journey context;
4. retrieve relevant memory;
5. classify requested outcome and required truth planes;
6. observe authoritative domain state;
7. plan tools/specialists;
8. evaluate autonomy/action class;
9. execute only authorized tools;
10. verify postconditions;
11. persist operational events and Journey links;
12. communicate a response distinguishing confirmed, verified and pending facts;
13. emit evidence for evaluation/learning.

## Reliability and scale

All effectful workflows must be idempotent, auditable, bounded and recoverable. Durable queues/Firestore state take precedence over in-memory-only state for business-critical work. External failures use bounded retry/backoff and then escalation. Admission control and rate limiting protect mass traffic. Observability must use correlation IDs across intake, Journey, booking, payment, provider order and notification events.

## Development rule

Do not rebuild existing capabilities. Before implementation, inspect and reuse `travelerIdentityService`, memory services, `travelJourneyOrchestrator`, `journeyVerificationService`, `bookingService`, booking state machine, `agentTools`, `agentKnowledgeFabric`, `agentMeshService`, `autonomyPolicy`, provider services, native automation, Voice Agent Desk and Admin Control Center.

Architecture changes must be additive and backward-compatible where possible. Remove or migrate legacy behavior only after proving the canonical replacement and its tests.
