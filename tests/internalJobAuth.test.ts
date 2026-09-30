import assert from 'node:assert/strict';
import test from 'node:test';
import { hasInternalJobToken } from '../backend/internalJobAuth';
import { schedulerPlan, schedulerArgs } from '../scripts/configureOperationalScheduler';

test('internal jobs support separate OIDC and application credentials without failing open', () => {
  assert.equal(hasInternalJobToken({ authorization: 'Bearer app-token' }, 'app-token'), true);
  assert.equal(hasInternalJobToken({ authorization: 'Bearer oidc-token', 'x-crt-internal-token': 'app-token' }, 'app-token'), true);
  assert.equal(hasInternalJobToken({ authorization: 'Bearer oidc-token' }, 'app-token'), false);
  assert.equal(hasInternalJobToken({ 'x-crt-internal-token': 'app-token' }, undefined), false);
  assert.equal(hasInternalJobToken({ 'x-crt-internal-token': ['app-token'] }, 'app-token'), false);
  assert.equal(hasInternalJobToken({ authorization: 'Bearer wrong' }, 'app-token'), false);
  assert.equal(hasInternalJobToken({ authorization: 'Bearer é' }, 'a'), false);
});

test('scheduler targets only private canonical endpoints and limits retries', () => {
  const env = {
    GOOGLE_CLOUD_PROJECT: 'test-project', SCHEDULER_REGION: 'us-central1',
    SCHEDULER_SERVICE_ACCOUNT: 'scheduler@test-project.iam.gserviceaccount.com',
    CLOUD_RUN_BACKEND_URL: 'https://test-service.run.app',
    CUSTOMER_INTAKE_JOB_TOKEN: 'intake-test', AGENT_INTERNAL_TOKEN: 'agent-test'
  };
  const jobs = schedulerPlan(env);
  assert.equal(jobs.length, 4);
  assert.equal(new Set(jobs.map(j => j.uri)).size, 4);
  assert.equal(jobs[0].token, 'intake-test');
  assert.equal(jobs[1].token, 'agent-test');
  const args = schedulerArgs(jobs[0], false);
  assert.equal(args[args.indexOf('--oidc-token-audience') + 1], env.CLOUD_RUN_BACKEND_URL);
  assert.equal(args[args.indexOf('--max-retry-attempts') + 1], '2');
  assert.ok(schedulerArgs(jobs[0], true).includes('--update-headers'));
  assert.throws(() => schedulerPlan({ ...env, CLOUD_RUN_BACKEND_URL: 'https://unrelated.example' }));
  assert.throws(() => schedulerPlan({ ...env, CLOUD_RUN_BACKEND_URL: 'https://test-service.run.app/path' }));
  assert.throws(() => schedulerPlan({ ...env, AGENT_INTERNAL_TOKEN: '' }));
  assert.throws(() => schedulerPlan({ ...env, AGENT_INTERNAL_TOKEN: 'invalid,header' }));
});
