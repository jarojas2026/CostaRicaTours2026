import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/deploy-cloud-run.yml'), 'utf8');

test('Cloud Run deploy is GitHub OIDC keyless-only', () => {
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /workload_identity_provider:/);
  assert.match(workflow, /github-actions\/providers\/github/);
  assert.match(workflow, /github-deployer@gen-lang-client-0782739149\.iam\.gserviceaccount\.com/);
  assert.doesNotMatch(workflow, /credentials_json/);
  assert.doesNotMatch(workflow, /GCP_SA_KEY/);
});

test('deploy remains gated by successful main Build & Type Check', () => {
  assert.match(workflow, /workflows: \["Build & Type Check"\]/);
  assert.match(workflow, /workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /workflow_run\.head_branch == 'main'/);
});

test('private Cloud Run smoke checks use an audience-bound ID token from auth@v3', () => {
  assert.match(workflow, /id: cloud_run_service[\s\S]*?echo "url=\$SERVICE_URL" >> "\$GITHUB_OUTPUT"/);
  assert.match(workflow, /id: cloud_run_id_token[\s\S]*?token_format: id_token[\s\S]*?id_token_audience: \$\{\{ steps\.cloud_run_service\.outputs\.url \}\}[\s\S]*?id_token_include_email: true/);
  assert.match(workflow, /CLOUD_RUN_ID_TOKEN: \$\{\{ steps\.cloud_run_id_token\.outputs\.id_token \}\}/);
  assert.match(workflow, /Authorization: Bearer \$CLOUD_RUN_ID_TOKEN/);
  assert.doesNotMatch(workflow, /gcloud auth print-identity-token/);
});

test('only the canonical GitHub workflow deploys the Cloud Run production service', () => {
  const workflowsDirectory = path.join(process.cwd(), '.github', 'workflows');
  const workflowFiles = fs.readdirSync(workflowsDirectory).filter((file) => /\.ya?ml$/i.test(file));
  const cloudRunDeployWorkflows = workflowFiles
    .filter((file) => /\bgcloud\s+run\s+deploy\b/i.test(
      fs.readFileSync(path.join(workflowsDirectory, file), 'utf8'),
    ))
    .sort();

  assert.deepEqual(cloudRunDeployWorkflows, ['deploy-cloud-run.yml']);
  assert.match(workflow, /^\s*SERVICE_NAME:\s*costa-rica-tours\s*$/m);
  assert.match(workflow, /^\s*REGION:\s*us-central1\s*$/m);
});
