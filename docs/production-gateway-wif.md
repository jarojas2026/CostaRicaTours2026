# Vercel → Cloud Run private gateway (OIDC / Workload Identity Federation)

This project keeps Cloud Run private. The public Vercel frontend reaches the backend through `api/[...path].ts`, which exchanges Vercel's short-lived OIDC identity for a Google federated access token and then requests a Google-signed ID token for the private Cloud Run service.

## Required Vercel runtime configuration

The gateway fails closed when any of these values is missing:

- `GCP_WIF_AUDIENCE`
- `GCP_WIF_SERVICE_ACCOUNT`
- `CLOUD_RUN_BACKEND_URL`

`VERCEL_OIDC_TOKEN` is only a local/build fallback. Production requests should use the fresh `x-vercel-oidc-token` request header supplied by Vercel.

## Security invariants

- Do not enable unauthenticated Cloud Run invocation to work around gateway failures.
- Do not store a Google service-account private key in Vercel.
- Preserve the end-user `Authorization` header for Firebase/application authentication.
- Use `X-Serverless-Authorization` only for Cloud Run IAM authentication.
- Restrict the Google Workload Identity Provider to this Vercel project and production environment.
- Restrict the gateway service account to `roles/run.invoker` on the `costa-rica-tours` Cloud Run service.

## Expected audience format

`GCP_WIF_AUDIENCE` should identify the Google workload identity provider, for example:

`//iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel/providers/vercel-production`

The exact project number and provider IDs must come from the deployed Google Cloud project; they must not be guessed or hardcoded from a project name.

## Production verification

After the infrastructure values are configured, verify:

1. `GET https://costaricatours2026.vercel.app/api/health` returns the authenticated Cloud Run health response.
2. Vercel runtime logs no longer report missing gateway configuration or Google STS/IAM token errors.
3. Cloud Run remains private to anonymous callers.
4. Admin/operations endpoints still enforce Firebase/operator authentication at the application layer.
