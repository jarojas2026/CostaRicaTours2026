# JARVIS Executive — Evidence-Based Owner Briefing (20 octubre 2026)

## Function
- New protected read-only endpoint `GET /api/admin/owner-briefing` with `requireOwner` and `cache-control: private, no-store`.
- New `/admin#gerencia` tab in existing admin dashboard, not a replacement dashboard.
- Deterministic, explainable proposals for critical alerts, pending bookings, quote-ready and recovery journey samples, no-signal agents, and financial evidence.
- ES/EN management UI with filters by department, count metrics, sample workload bars, provenance, uncertainty, and links to *existing* admin pages.
- Uses current `adminControlCenterService` and `agentOfficeProjection`, never duplicates bookings, finance ledger, or agent control plane.

## Trust contract
- `execution: 'none'`, each recommendation `execution:'proposal_only'`: **no actions have been executed**.
- `uncertified_bounded_sources`: `getAllBookings` may fallback to memory and journey counters are bounded.
- Journey metrics require `state: 'sample'` and `source: 'firestore:traveler_journeys'`. Missing Firestore or a failed query produces `null`/`unavailable`; a successful empty query produces sample counts of zero. Both the existing funnel and the executive briefing preserve this distinction.
- Revenue and margin are explicitly UNKNOWN; value of confirmed bookings != collected cash.
- `no_signal` means missing fresh heartbeat and cannot be interpreted as worker failure.
- All actions affecting the company must pass existing `agentActionGate`, permissions, approval and domain services.
- No emails, payloads, customer names, provider phone numbers, payments, or booking secrets are projected to UI.

## Tests and release
- `tests/ownerExecutiveBriefing.test.ts`: absent data, critical priority, malformed input, owner guard.
- Update `tests/fixtures/serverRoutes.snapshot.txt` with the new deliberate GET.
- Run `npm run lint`, `npm run test:contracts`, `npm run build`, Playwright and privileged browser QA with real owner permissions.
- **Not a live generative agent yet**; next phase adds governed structured goal planning, durable workflow ack and domain tools using `jarvisOrchestrator`.
- No production deployment or changes to Firestore schema in this PR.

## Dependencies
- PR #300 metrics source truth.
- PR #301 owner Mission Control.
- PR #284 auth-domain private account verification.
These are separate branches and need conflict review before merging; do not conflate preview status with production.

## Rollback
Revert this PR. No migration, no persistent business effect, no new agents created.

