---
name: global-city-onboarding
description: Validate onboarding designs for Costa Rica Tours' national and future global digital city. Use when adding people, freelance workers, companies, rural communities, public or private places, events, country-specific registrations, visibility permissions, or multilingual discovery without inventing commercial authorization.
metadata:
  version: "1.0"
  scope: "design-and-audit"
---

# Global city onboarding: secure evolution skill

Read `AGENTS.md`, `README.md`, `docs/ciudad-digital-ecosistema-nacional-2026.md`, and `docs/arquitectura-ciudad-digital.md` before proposing changes.

## Contract

1. Inventory the existing providers, operators, tours, journey, booking, payment and agent services. Reuse them; never create a second booking engine, authentication system, or permanent membership source without an approved migration.
2. Represent country with an explicit country code, then add local geography from a verified source. Never infer authorization, an operating country or public access from the business name, language or AI output.
3. Separate an **informational listing** from a **verified organization** from a **bookable/chargeable service**. The latter must use the existing pricing, provider, inventory, payment and booking domain functions.
4. A person or community can have multiple organization memberships; permissions must be checked per resource on the backend. Never rely on a role, consent checkbox or verified flag received from the browser as proof.
5. Personal profiles require opt-in and privacy controls. Public institutions/parks require authoritative references and cannot be described as official partners without a verified authorization. Private spaces require rights to publish and operate.
6. Begin with `backend/digitalCityRegistrationPolicy.ts` for **read-only preliminary guidance**. Its result NEVER creates or publishes a record. Check the existing admin preflight route before implementing registration writes.
7. For new country markets, perform legal, tax, consumer protection, payment eligibility, data transfer and local compliance reviews before enabling transactions. No invented local rules.
8. Use credible sources, verification timestamps, expiry, publication state and audit events. If evidence is absent, respond `unverified` and request manual moderation.
9. Keep UI ES/EN, accessible, responsive, and fail closed. Do not put credentials, identity documents or payments into prompts, telemetry or logs.
10. Any mutation requires explicit authorization plus validation, Firestore transactional consistency where appropriate, idempotency, and tests. Never introduce unsupervised production changes.

## Working procedure

- Find all related files and consumers; read whole modules before editing.
- Define one narrow deliverable with typed API contract, state model, authorization and rollback.
- Add automated cases for forged membership, absent consent, impersonated public institution, contradictory country/region, expired verification, duplicated profile, and inaccessible user data.
- Run `npm run lint`, `npm run test:contracts`, `npm run build` and CI.
- Open a reviewed PR; merge only once all required checks pass.
- Update README and status docs with what is implemented vs. proposed.

## Output format for any agent using this skill

Summarize: current reused services, exact changes, source and confidence of each published field, actual tests, permission checks, open dependencies, and clear next action. Never claim registration, integration, booking or payment exists when only a preflight or design was completed.
