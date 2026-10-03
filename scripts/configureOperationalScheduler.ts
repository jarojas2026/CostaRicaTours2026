import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

type Environment = Record<string, string | undefined>;

export function schedulerPlan(env: Environment) {
  const required = (name: string) => {
    const value = String(env[name] || '').trim();
    if (!value) throw new Error(`Missing configuration: ${name}`);
    return value;
  };

  const project = required('GOOGLE_CLOUD_PROJECT');
  const location = required('SCHEDULER_REGION');
  const serviceAccount = required('SCHEDULER_SERVICE_ACCOUNT');
  const base = new URL(required('CLOUD_RUN_BACKEND_URL'));
  if (
    base.protocol !== 'https:' ||
    !base.hostname.endsWith('.run.app') ||
    base.username || base.password || base.search || base.hash || base.pathname !== '/'
  ) {
    throw new Error('CLOUD_RUN_BACKEND_URL must be the canonical HTTPS Cloud Run service origin.');
  }
  if (!serviceAccount.endsWith(`@${project}.iam.gserviceaccount.com`)) {
    throw new Error('Scheduler identity must be an explicit service account in the configured project.');
  }

  const origin = base.origin;
  const definitions = [
    ['crt-customer-intake', '/api/internal/customer-intake/process', 'CUSTOMER_INTAKE_JOB_TOKEN'],
    ['crt-reservation-lifecycle', '/api/internal/reservation-lifecycle/sweep', 'AGENT_INTERNAL_TOKEN'],
    ['crt-provider-inbox', '/api/internal/provider-inbox/sweep', 'AGENT_INTERNAL_TOKEN'],
    ['crt-email-operations', '/api/internal/email-operations/sweep', 'AGENT_INTERNAL_TOKEN'],
  ] as const;

  return definitions.map(([name, path, tokenName]) => {
    const token = required(tokenName);
    if (/[\r\n,]/.test(token)) throw new Error(`Invalid HTTP header characters in ${tokenName}`);
    return {
      name,
      project,
      location,
      uri: origin + path,
      origin,
      serviceAccount,
      token,
      tokenName,
      schedule: '* * * * *',
    };
  });
}

export function schedulerArgs(job: ReturnType<typeof schedulerPlan>[number], update: boolean) {
  return [
    'scheduler', 'jobs', update ? 'update' : 'create', 'http', job.name,
    '--project', job.project,
    '--location', job.location,
    '--schedule', job.schedule,
    '--time-zone', 'America/Costa_Rica',
    '--uri', job.uri,
    '--http-method', 'POST',
    update ? '--update-headers' : '--headers',
    `Content-Type=application/json,X-CRT-Internal-Token=${job.token}`,
    '--message-body', '{"limit":10}',
    '--oidc-service-account-email', job.serviceAccount,
    '--oidc-token-audience', job.origin,
    '--attempt-deadline', '180s',
    '--max-retry-attempts', '2',
    '--min-backoff', '10s',
    '--max-backoff', '60s',
    '--quiet',
    '--format=none',
  ];
}

type SchedulerJob = ReturnType<typeof schedulerPlan>[number];
type DescribeResult = { status: number | null; stderr: string; stdout: string; error?: Error };

/** Inspect every existing target before the caller is allowed to mutate any job. */
export function preflightSchedulerJobs(
  jobs: SchedulerJob[],
  describe: (job: SchedulerJob) => DescribeResult
): Array<{ job: SchedulerJob; update: boolean }> {
  return jobs.map(job => {
    const existing = describe(job);
    if (existing.error) throw new Error('gcloud is unavailable.');
    const update = existing.status === 0;
    if (!update && !/NOT_FOUND|not found/i.test(existing.stderr)) {
      throw new Error(`Cannot inspect scheduler job ${job.name}; check API and IAM access.`);
    }
    if (update) {
      let current: { httpTarget?: { uri?: string } };
      try {
        current = JSON.parse(existing.stdout);
      } catch {
        throw new Error(`Cannot parse scheduler job ${job.name}; no jobs were changed.`);
      }
      if (current.httpTarget?.uri !== job.uri) {
        throw new Error(`Existing job ${job.name} targets a different endpoint; review it before updating.`);
      }
    }
    return { job, update };
  });
}

function main() {
  const jobs = schedulerPlan(process.env);
  const apply = process.argv.includes('--apply');
  console.log(JSON.stringify({
    apply,
    jobs: jobs.map(({ token, ...job }) => job),
  }, null, 2));
  if (!apply) return;

  const operations = preflightSchedulerJobs(jobs, job => spawnSync('gcloud', [
      'scheduler', 'jobs', 'describe', job.name,
      '--project', job.project,
      '--location', job.location,
      '--format=json',
    ], { encoding: 'utf8' }));

  for (const { job, update } of operations) {
    const result = spawnSync('gcloud', schedulerArgs(job, update), { encoding: 'utf8' });
    if (result.error || result.status !== 0) {
      throw new Error(`Failed to configure ${job.name}; check Cloud Scheduler/IAM audit logs. No secret output was printed.`);
    }
    console.log(`Configured ${job.name}; verify executions and Cloud Run logs before declaring it operational.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : 'Scheduler configuration failed');
    process.exitCode = 1;
  }
}

