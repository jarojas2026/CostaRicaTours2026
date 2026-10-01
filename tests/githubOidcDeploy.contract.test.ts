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
