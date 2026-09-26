# Cloud Run deployment prerequisites

The GitHub Actions deployment uses `gcloud run deploy --source .`. Google Cloud documents source deployment as a Cloud Run deployment that uses Cloud Build and Artifact Registry, and it requires specific IAM roles.

## What the repository workflow does

The workflow now performs a preflight against the existing Cloud Run service before starting a deployment. It deliberately does **not** try to grant or enable project APIs from GitHub Actions. This avoids masking an IAM failure with `|| true` and produces an actionable error.

The source deployment remains the existing architecture: GitHub Actions → Google Cloud authentication → `gcloud run deploy --source .`.

## IAM that must exist

For the GitHub deployer account, Google Cloud documents:

- Cloud Run Source Developer (`roles/run.sourceDeveloper`) on the project.
- Service Usage Consumer (`roles/serviceusage.serviceUsageConsumer`) on the project.
- Service Account User (`roles/iam.serviceAccountUser`) on the Cloud Run service identity.

For the Cloud Build service account used by source deployment, Google Cloud documents Cloud Run Builder (`roles/run.builder`) on the project.

The APIs required for source deployment must already be enabled. Enabling APIs itself requires `serviceusage.services.enable`, commonly provided through Service Usage Admin (`roles/serviceusage.serviceUsageAdmin`). The GitHub deploy workflow therefore treats API enablement as infrastructure provisioning rather than something to hide inside every deployment.

## Current repository diagnosis

The historical Cloud Run failures on `main` are not caused by the application compiler. The deploy job authenticates successfully and then fails on Cloud Run IAM with `run.services.get` denied. The old workflow also attempted to enable APIs and received `serviceusage.services.enable` denied, then continued because the command was suppressed.

After IAM is corrected in Google Cloud, rerun the failed Cloud Run workflow from GitHub Actions.

References:
- https://docs.cloud.google.com/run/docs/deploying-source-code
- https://docs.cloud.google.com/run/docs/reference/iam/permissions
