import assert from 'node:assert/strict';
import test from 'node:test';
import { hasInternalJobToken } from '../backend/internalJobAuth';
import { schedulerPlan, schedulerArgs, preflightSchedulerJobs } from '../scripts/configureOperationalScheduler';

test('internal jobs support separate OIDC and application credentials without failing open', () => {
  assert.equal(hasInternalJobToken({ authorization: 'Bearer app-token' }, 'app-token'), true);
  assert.equal(hasInternalJobToken({ authorization: 'Bearer oidc-token', 'x-crt-internal-token': 'app-token' }, 'app-token'), true);
  assert.equal(hasInternalJobToken({ authorization: 'Bearer oidc-token' }, 'app-token'), false);
  assert.equal(hasInternalJobToken({ 'x-crt-internal-token': 'app-token' }, undefined), false);
  assert.equal(hasInternalJobToken({ 'x-crt-internal-token': ['app-token'] }, 'app-token'), false);
  assert.equal(hasInternalJobToken({ authorization: 'Bearer wrong' }, 'app-token'), false);
  assert.equal(hasInternalJobToken({ authorization: 'Bearer é' }, 'a'), false);
});

test('scheduler targets only canonical private Cloud Run endpoints and bounds retries', () => {
  const env = {
    GOOGLE_CLOUD_PROJECT: 'test-project',
    SCHEDULER_REGION: 'us-central1',
    SCHEDULER_SERVICE_ACCOUNT: 'scheduler@test-project.iam.gserviceaccount.com',
    CLOUD_RUN_BACKEND_URL: 'https://test-service.run.app',
    CUSTOMER_INTAKE_JOB_TOKEN: 'intake-test',
    AGENT_INTERNAL_TOKEN: 'agent-test',
  };
  const jobs = schedulerPlan(env);
  assert.equal(jobs.length, 4);
  assert.equal(new Set(jobs.map(job => job.uri)).size, 4);
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

test('scheduler preflights all changes before any create or update can begin', () => {
  const env = {
    GOOGLE_CLOUD_PROJECT: 'test-project',
    SCHEDULER_REGION: 'us-central1',
    SCHEDULER_SERVICE_ACCOUNT: 'scheduler@test-project.iam.gserviceaccount.com',
    CLOUD_RUN_BACKEND_URL: 'https://test-service.run.app',
    CUSTOMER_INTAKE_JOB_TOKEN: 'intake-test',
    AGENT_INTERNAL_TOKEN: 'agent-test',
  };
  const jobs = schedulerPlan(env);
  const inspected: string[] = [];
  const mutations: string[] = [];

  assert.throws(() => {
    const operations = preflightSchedulerJobs(jobs, job => {
      inspected.push(job.name);
      if (job.name === jobs[0].name) {
        return { status: 1, stderr: 'NOT_FOUND', stdout: '' };
      }
      return {
        status: 0,
        stderr: '',
        stdout: JSON.stringify({ httpTarget: { uri: 'https://unexpected.run.app/wrong-target' } }),
      };
    });
    operations.forEach(({ job }) => mutations.push(job.name));
  }, /different endpoint/);

  assert.deepEqual(inspected, [jobs[0].name, jobs[1].name]);
  assert.deepEqual(mutations, []);
});

test('scheduler preflight returns create/update decisions only after every target is safe', () => {
  const env = {
    GOOGLE_CLOUD_PROJECT: 'test-project',
    SCHEDULER_REGION: 'us-central1',
    SCHEDULER_SERVICE_ACCOUNT: 'scheduler@test-project.iam.gserviceaccount.com',
    CLOUD_RUN_BACKEND_URL: 'https://test-service.run.app',
    CUSTOMER_INTAKE_JOB_TOKEN: 'intake-test',
    AGENT_INTERNAL_TOKEN: 'agent-test',
  };
  const jobs = schedulerPlan(env);
  const operations = preflightSchedulerJobs(jobs, job => ({
    status: 0,
    stderr: '',
    stdout: JSON.stringify({ httpTarget: { uri: job.uri } }),
  }));

  assert.equal(operations.length, jobs.length);
  assert.ok(operations.every(operation => operation.update));
});

