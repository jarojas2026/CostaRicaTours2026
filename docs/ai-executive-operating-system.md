# AI Executive Operating System

## Purpose

Costa Rica Tours uses a layered operating model:

**Traveler experience → journey orchestration → specialized agents → domain services → live/authoritative data → executive AI governance.**

The executive layer does not replace the existing Concierge, Triage, Booking, Provider Liaison, Operations, Supervisor, Learning or specialized tourism agents. It governs them.

## Executive AI units

- **AI Owner** — strategic copilot for the business owner. Reviews the complete picture, prioritizes work, controls autonomy and approves sensitive changes.
- **AI Business Intelligence** — converts real bookings, revenue, conversion, provider and journey data into traceable insights, anomalies and experiments.
- **AI Sales** — moves qualified traveler intent toward a real quote and reservation using memory, catalog, availability, weather and next-best-action logic.
- **AI Operations** — coordinates providers, schedules, weather, routes, incidents, SLAs and recovery options.
- **AI Finance** — analyzes sales, cash collection, receivables, provider payables, fees, taxes and margin.
- **AI Accounting** — assists with journal review, reconciliation, period controls, fiscal evidence and audit completeness.
- **AI Legal / Compliance** — tracks policy, privacy, consent, provider-contract and documentation risks; it does not replace professional legal advice.
- **AI Technology** — reviews architecture, security, dependencies, performance, CI, tests and prepares reviewed pull requests; it does not push directly to main.

## Governance loop

1. Detect a signal or problem.
2. Collect evidence from authoritative systems.
3. Analyze and separate facts from inference.
4. Produce a proposal with impact, risk, affected areas and tests.
5. Simulate where possible.
6. Require explicit human approval for sensitive actions.
7. Execute only through an authorized pathway.
8. Verify the result.
9. Record an audit event.
10. Learn from the observed outcome.

## Collaboration model

The current owner can operate the entire platform alone.

Later, collaborators can receive scoped roles without changing the architecture:

- Owner / Super Admin
- Operations Admin
- Sales Admin
- Finance / Accounting
- Technology / AI Developer
- Read-only Analyst

The backend allowlist and role checks remain authoritative. Public users never need to see the administrative surfaces.

## Code-change rule

AI can inspect, explain, propose and prepare code changes. Production code changes should travel through:

**AI proposal → branch → tests/CI → pull request → human review → merge → deployment → post-deployment verification.**

This keeps AI highly productive without giving an autonomous model unrestricted write access to production.

## Product experience

The public application remains focused on the traveler:

**Discover → Compare → Plan → Verify live conditions → Reserve → Pay → Receive confirmation → Travel → Support → Learn.**

The private application is the management layer:

**Business → Sales → Operations → Finance → Accounting → Compliance → Technology → AI governance.**

This separation is intentional: public navigation stays simple while the owner retains a deep command center.