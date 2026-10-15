# Digital City — safe integration gates (2026-10-14)

This is a **review checklist**, not evidence that the pending features are deployed or that external providers, payments, voice, or live availability were tested.

## Canonical baseline

- Source of truth: `main`; do not replace existing booking, provider, AI, Firestore, or workflow services with parallel implementations.
- Frontend: React/Vite; backend: Express/Cloud Run; Firebase; Vercel gateway; Stripe. Preserve private Cloud Run authentication and WIF.
- Keep n8n and Telegram outside the application architecture. Preserve existing supported customer communication channels until a separate reviewed migration.
- Never claim an unverified booking hold, payment, provider acknowledgment, cancellation policy, exchange rate, or live availability.

## Pull request integration order

1. **Responsive navigation**: compare [#216](https://github.com/jarojas2026/CostaRicaTours2026/pull/216) with consolidated [#228](https://github.com/jarojas2026/CostaRicaTours2026/pull/228). They overlap. Choose a single reviewed integration path, verify latest `main`, and do not merge both blindly.
2. **Isolated sandbox**: review [#200](https://github.com/jarojas2026/CostaRicaTours2026/pull/200). Verify emulator hosts are loopback-only, project IDs use `demo-*`, and all simulated outputs are clearly marked. No production credentials.
3. **Browser endurance**: review [#201](https://github.com/jarojas2026/CostaRicaTours2026/pull/201). Its 10,000 inputs are not 10,000 unique functional journeys; block all non-GET requests and review screenshots and errors.
4. **Tourism intelligence**: review [#202](https://github.com/jarojas2026/CostaRicaTours2026/pull/202). Treat references to MOPT, CONAVI, SINAC and ICT as documented sources, not live API integrations. Keep JARVIS advisory-only unless authorized operational tools validate data.

## Required gates for each PR

- [ ] Review diff against current `main`, conflicts, existing ownership of services, and security boundaries.
- [ ] CI green: `npm run audit:system`, `npm run test:contracts`, `npm run lint`, `npm run build`, plus relevant Playwright workflow.
- [ ] Confirm no secrets, synthetic operational providers, fake confirmations, unverified inventory, or client-side privileged mutations.
- [ ] For responsive changes: verify 320px phone through desktop, keyboard focus, modal dismissal, route scroll reset, and horizontal overflow.
- [ ] For booking changes: confirm state transitions, idempotency, concurrent capacity handling, payment webhook verification, and rollback on failure; never assert 15-minute holds without real TTL enforcement.
- [ ] Confirm production preview, Cloud Run backend routing, and authentication separately from successful compilation.
- [ ] Require human review before merge and production deployment. Do not force-push `main`.

## Evidence log

| Item | Verified in this review | Still required |
| --- | --- | --- |
| Repository | `jarojas2026/CostaRicaTours2026` | None |
| Stack | Read `package.json` on `main` | Runtime validation |
| Project safety rules | Read `README.md` and `docs/estado-real-del-sistema.md` | Full domain review |
| Responsive PRs | #216 and #228 are open | CI, diff comparison, visual tests |
| Sandbox / browser / JARVIS | #200, #201 and #202 are open | CI, review, integration |
| Production bookings and payments | Not tested | Authenticated end-to-end verification |

Do not mark any gate complete based solely on a PR description. This document does not modify runtime behavior.
