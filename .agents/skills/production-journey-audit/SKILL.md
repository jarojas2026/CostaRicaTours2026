---
name: costa-rica-tours-production-journey-audit
description: Audit Costa Rica Tours as a real traveler across mobile, tablet, desktop, booking, provider and owner journeys without risking production data.
---

# Costa Rica Tours — Browser and Journey QA Skill (Work / Hark / coding agents)

## Mandatory first reads
- `AGENTS.md` and `.agents/AGENTS.md`
- `README.md`, `docs/estado-real-del-sistema.md`, `docs/arquitectura-ciudad-digital.md`
- `playwright.config.ts`, `tests/e2e/fixtures.ts`, `scripts/auditReadOnlyNavigation.mjs`
- Existing auth/booking/payment/provider journeys and latest GitHub PRs before editing.

## Evidence labels
- LIVE_PUBLIC: browser actually loaded current public production URL and safe DOM interactions, with time + viewport.
- BUILD_MOCKED: Playwright against Vite preview with mocked /api/** and external services.
- AUTHENTICATED_SANDBOX: explicitly permitted staging identities and sandbox payments; never production money.
- CODE_INSPECTION: inferred from files, not user-visible demonstration.
- NOT_TESTED: unknown or unavailable.
Always identify environment, URL or SHA, language, viewport and evidence. CI green != live paid booking.

## Read-only live audit workflow
1. Confirm deployed SHA from Vercel project and Cloud Run GitHub pipeline; don't infer backend SHA from frontend READY.
2. Run `scripts/auditReadOnlyNavigation.mjs` only with `AUDIT_TARGET_URL` of approved public deployment; the default is production. This script may navigate and click a tightly controlled safe whitelist, **not submit** customer, booking, payment, WhatsApp/email, registration or provider actions. AI intake safe checks must use mocked responses.
3. Inspect JSON + report.md artifacts and actual screenshots. Reproduce each high/critical finding manually.
4. Test ES/EN and USD/CRC persistence and refresh; verify no sources/prices are claimed as confirmed without live evidence.
5. Check zoom, resize, overlays, accurate/approximate pins, forms, navigation, banner and sticky booking CTA.
6. For private admin: do not bypass auth. In a user-authorized Work browser session use legitimate owner sign-in; demonstrate unauthorized visitor is denied; inspect only authorized records. No private fields in reports/screenshots.

## Device matrix
Use Chromium emulated viewport matrix for automation:
- 320×568 small phone portrait, 375×812 mid phone, 390×844 modern phone
- 844×390 mobile landscape
- 768×1024 tablet portrait, 1024×768 tablet landscape
- 1280×800 laptop, 1440×900 desktop, 1920×1080 wide desktop
Then manually verify a physical phone and native Safari/WebKit/Firefox when available; Chromium emulation is not a substitute.

## Critical customer journeys
1. Home → category → tour detail → select date/people → availability request → clear pending state.
2. Search/filter and region/map → point select → correct service → quote, no fabricated price.
3. AI assistant ES/EN → suggestions → itinerary → inquiry; preserve facts, never expose direct provider contacts.
4. Mobile tour CTA → quote form → consent → submission **only in mock/sandbox** → receipt reference.
5. Flight/tool routes, favorites, modal close/ESC, navigation after scroll, broken images, button focus.
6. All protected routes: anonymous access must deny; authenticated employee access must respect least-privilege; provider/owner isolation.
7. Payment and provider confirmation only sandbox with signed callback fixtures. Confirm money/provider state separately. Never book a real provider during QA.
8. Voice/audio: simulated recognition separately from live phone call. Do not claim live voice success from mocked Web Speech.

## Business acceptance and failures
- A reservation cannot be confirmed because a client clicked pay, because payment was initiated, or without provider evidence when required.
- No synthetic weather, fake inventory, or invented real-time hours.
- Every material workflow event persisted with correlation ID; status queued != running != completed.
- An inaccessible KPI must show 'unknown', not 0/100%.
- Every image relevant to the tour and correctly attributed/licensed.
- WCAG focus, contrast, keyboard operation, responsive no horizontal overflow, CTA visible and clickable.

## Report template
- timestamp, URL, commit IDs (frontend/backend separately), evidence class, viewport + language
- scenario, steps, expected, actual, screenshot/trace ref, severity P0/P1/P2/P3
- reproducibility, likely code owner, minimal safe fix, tests added, rollback instructions
- PR number, checks, deployed SHA and manual follow-up
- label gaps NOT_TESTED, never silently fill unknowns

## Process when something fails
- Open an issue or separate PR; never rewrite the booking engine, reintroduce n8n, or merge failing checks.
- Read complete affected file and its tests, search existing function reuse, preserve contracts.
- Run lint, contracts, build, Playwright where appropriate; compare branch to main.
- Never expose API keys, account files, tokens, payment data or traveler PII.
- Owner approval required for destructive operations and critical releases.
