# AI counter prompt — verified-source correction (2026-10-22)

## P0 risk identified
The `runCounterAgent` Gemini system prompt contained a named public persona, an unverified support email, an emergency contact mistakenly presented as a commercial WhatsApp, fixed SINPE/payment claims, specific third-party transport fares, and fixed **guaranteed refund percentages** without verified contractual evidence.

## Patch
Replace only the Gemini counter-desk system instructions with source-aware operating rules. Require real catalog/tools for prices and verification, explicit pending status for inquiries and provider approval, and no invented cancellation/refund guarantees. Remove named persona and unverified support email from the prompt and dialogue history role label.

## Not in scope
- Legacy output `agentName` values, fallback user-visible branding and other UI references to the historical agent remain; a separate UX/branding change must inventory and reconcile them.
- No new AI provider, prompt injection surface, payment path, provider, refund policy or tool permissions.
- This does not prove the generative model is configured or reachable in Cloud Run.

## Quality gates
`tests/counterPromptSourceTruth.contract.test.ts` and CI lint/contracts/build/E2E. Evaluate practical ES/EN travel questions and refund requests with mocked tools before deployment. Remove unverified business claims from other channels in follow-up work after an inventory.
