# JARVIS & Sales Agent Knowledge Gates (2026-10-20)

This PR extends the **existing** `agentSkillPack.ts` knowledge used by `agentKnowledgeFabric.ts`. It does not add agents, duplicate tools, create a booking engine or change authorization.

## Grounded operational rules
- Discovery tour/price is not a bookable offer or confirmed provider inventory.
- A Firestore service order, an email accepted by transport, an operator acceptance, a verified payment and a final voucher are different states.
- Provider commission comes from a verified recorded contract rate; no 85/15 default or stale CRC conversion.
- A queued run is not executed, a deterministic AI fallback is not an active generative model.
- AI-first intake, privacy and consent before optional human WhatsApp escalation.
- JARVIS owner retains final approval; blocked prerequisites become proposals, not invented completion.

## Why
These rules are based on actual architecture and defects identified in PRs #308–#312. `agentKnowledgeFabric` already injects `EXTRA_AGENT_KNOWLEDGE` and `EXTENSION_AGENT_IDENTITIES`, so this enriches the existing prompt context without a parallel skill runtime.

## Limitations
This **does not prove** that Cloud Run has a functioning model provider or that the LLM follows the rules. Validate runtime provider status, structured tool decisions, refusal/evidence evaluations and sandbox sales conversations. Frontend direct WhatsApp buttons remain a separate routing gap.

## QA
`tests/agentSalesKnowledgeGates.test.ts`, lint, contracts, build; run an ES/EN evaluation suite against actual configured model only after secrets and cost limits are verified.
