# Production recovery — 30 September 2026

## Verified state and scope

- PR #118 fixed nullable provider response samples. Its security/contract/type/build checks passed before merge, producing main commit 0ad8459cff895504cb149c1e3222897ce622d0ef.
- This recovery branch reconciles the payment HTTP bridge from #116 and the exact GenAI 2.24.0 dependency update from #72 with current main. Preserve all other branches; an absent commit does not establish absent functionality.
- Stripe and PayPal HTTP handlers reuse paymentWebhookService signature verification, amount/currency validation, durable idempotency and payment persistence. They do not confirm provider fulfillment. The existing reservation lifecycle and its sweep remain authoritative.
- Operational payment signals use the existing event payload contract. Telemetry failure does not reject an already persisted payment; lifecycle recovery reads durable bookings independently.
- The Vercel Web handler forwards original JSON and form bytes, preserving signatures. Request bodies are limited to 256 KiB. Existing public concierge facades continue to use the named Node adapter.
- Vercel now installs from package-lock.json and runs the release security/contract/type checks before building. Cloud Run automatic deployment accepts only successful push builds from this repository's main branch. Manual recovery also requires main and Node 22.
- Internal sweep routes share distributed locks with their corresponding in-process jobs. A separate application credential header supports Cloud Scheduler OIDC without replacing application authentication.

## External blockers: do not claim production ready

At 19:09 UTC, the public /api/health endpoint returned 503. Vercel runtime logs for that request reported missing GCP_WIF_AUDIENCE.

A subsequent GitHub WIF workflow (run 36764192424) returned a green result even though its log explicitly reported PERMISSION_DENIED for iam.workloadIdentityPools.create. This change makes incomplete provisioning fail visibly. A green frontend deployment or health check against Cloud Run alone is insufficient.

1. A Google Cloud IAM administrator must inspect/create the vercel pool and vercel-production provider in gen-lang-client-0782739149, verify the production-only Vercel subject and grant the required account impersonation/invocation permissions. Do not make Cloud Run public or grant project-wide admin rights as a workaround.
2. Set GCP_WIF_AUDIENCE, GCP_WIF_SERVICE_ACCOUNT and CLOUD_RUN_BACKEND_URL in the Vercel production environment using values verified from Google Cloud. Redeploy and check public /api/health and /api/tours. The connected Vercel tools used in this session did not expose an environment-variable write operation.
3. Require application CI on main using a repository ruleset/branch protection. The GitHub app exposed no protection-write operation. Do not mistake a documented rule for enforced protection.
4. Verify Gmail/Outlook OAuth, outbound notification credentials, payment sandbox credentials/webhook registration, provider records and telephony provisioning. No real email, call, booking or payment was sent during these tests.
5. The earlier audit documents an exposed service-account key. Rotation/revocation and dependent secret updates require the cloud administrator; their completion was not verified.

## External scheduler deployment

The code and dry-run plan are provided in scripts/configureOperationalScheduler.ts. This script is not automatically executed by merging.

Prerequisites:
- Cloud Scheduler API enabled.
- A dedicated, existing scheduler service account with roles/run.invoker on the canonical private Cloud Run service.
- The provisioning operator can manage Scheduler jobs and act as that service account; preserve the Cloud Scheduler service agent's standard role.
- GOOGLE_CLOUD_PROJECT, SCHEDULER_REGION, SCHEDULER_SERVICE_ACCOUNT and CLOUD_RUN_BACKEND_URL are explicit verified values.
- CUSTOMER_INTAKE_JOB_TOKEN and AGENT_INTERNAL_TOKEN match the backend secrets. Supply them through a secret manager or secure shell environment; never commit them.

Run the redacted dry-run plan:

```sh
npx tsx scripts/configureOperationalScheduler.ts
```

Then provision/update the four protected minute-based jobs:

```sh
npx tsx scripts/configureOperationalScheduler.ts --apply
```

The script uses OIDC for Cloud Run and X-CRT-Internal-Token for application authentication, limits retries to two, refuses unrelated existing job targets, and never prints the token-bearing command. Job metadata contains authentication headers: restrict scheduler-job read access accordingly.

Provisioning alone is not verification. Inspect successful executions, backlog reduction, retry behavior and distributed lock contention. QUEUE-001 remains a runtime deployment requirement until these jobs are active and observed.

## Release acceptance

- Application CI and Vercel build pass on the same approved code.
- Record actual Cloud Run ready revision, image/source SHA and traffic; compare with frontend SHA.
- Public gateway health and live catalog succeed without anonymous Cloud Run access.
- A separately authorized sandbox transaction proves persisted intake, canonical price/capacity, idempotent payment processing, provider response and correct customer-visible status.
- OAuth email and real voice tests require authorized test recipients/numbers. Build success does not certify those integrations.

References: https://vercel.com/docs/functions/runtimes/node-js and https://docs.cloud.google.com/scheduler/docs/http-target-auth
