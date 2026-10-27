import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/deploy-cloud-run.yml'), 'utf8');

test('Cloud Run workflow stays disabled during zero-cost development', () => {
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /if:\s*false/);
  assert.doesNotMatch(workflow, /workflow_run:/);
  assert.doesNotMatch(workflow, /id-token:\s*write/);
  assert.doesNotMatch(workflow, /google-github-actions\/auth/);
  assert.doesNotMatch(workflow, /gcloud\s+run\s+deploy/i);
});

test('disabled workflow cannot authenticate, build or deploy to Google Cloud', () => {
  assert.doesNotMatch(workflow, /workload_identity_provider:/);
  assert.doesNotMatch(workflow, /setup-gcloud/);
  assert.doesNotMatch(workflow, /CLOUD_RUN_DEPLOY_ENABLED\s*==\s*'true'/);
  assert.match(workflow, /No se ejecutó autenticación, build ni despliegue/);
});

test('no workflow can deploy Cloud Run while the zero-cost policy is active', () => {
  const workflowsDirectory = path.join(process.cwd(), '.github', 'workflows');
  const workflowFiles = fs.readdirSync(workflowsDirectory).filter((file) => /\.ya?ml$/i.test(file));
  const executableDeployWorkflows = workflowFiles.filter((file) => {
    const source = fs.readFileSync(path.join(workflowsDirectory, file), 'utf8');
    return /gcloud\s+run\s+deploy/i.test(source) || /google-github-actions\/deploy-cloudrun/i.test(source);
  });
  assert.deepEqual(executableDeployWorkflows, []);
});
