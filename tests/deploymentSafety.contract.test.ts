import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('ephemeral Google credentials never enter tracked or uploaded build contexts', () => {
  for (const file of ['.gitignore', '.gcloudignore', '.dockerignore']) {
    const patterns = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    assert.ok(patterns.includes('gha-creds-*.json'), file);
  }
});

test('production deployment cannot be authorized by a fork or PR build', () => {
  const workflow = fs.readFileSync('.github/workflows/deploy-cloud-run.yml', 'utf8');
  assert.ok(workflow.includes("github.event.workflow_run.event == 'push'"));
  assert.ok(workflow.includes('github.event.workflow_run.head_repository.full_name == github.repository'));
  assert.ok(workflow.includes("github.event.workflow_run.head_branch == 'main'"));
  assert.ok(workflow.includes("github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'"));
  assert.match(workflow, /    concurrency:\n      group: production-cloud-run-deploy\n      cancel-in-progress: false/);
});
