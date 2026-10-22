import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { projectMissionApproval, projectMissionRun, summarizeMissionRunSample } from '../backend/missionControlProjection';

test('Mission Control status totals describe only the provided sample', () => {
  const result = summarizeMissionRunSample([
    { status: 'queued' },
    { status: 'running' },
    { status: 'waiting_approval' },
    { status: 'completed' },
    { status: 'failed' },
  ]);
  assert.equal(result.sampled, 5);
  assert.equal(result.unfinishedInSample, 3);
  assert.equal(result.byStatus.completed, 1);
  assert.equal(result.byStatus.failed, 1);
});

test('an empty Firestore sample is empty, not an invented system-wide status', () => {
  const result = summarizeMissionRunSample([]);
  assert.equal(result.sampled, 0);
  assert.equal(result.byStatus.running, 0);
});

test('new Mission Control API is owner-protected, read-only and uses canonical ledgers', () => {
  const route = readFileSync('backend/routes/admin.ts', 'utf8');
  const service = readFileSync('backend/missionControlService.ts', 'utf8');
  assert.match(route, /get\('\/api\/admin\/mission-control', requireOwner/);
  assert.match(service, /db\.collection\('agentRuns'\)/);
  assert.match(service, /listOwnerApprovals/);
  assert.match(service, /listJarvisPlans/);
  assert.match(service, /Promise\.allSettled/);
  assert.match(service, /runs\.map\(projectMissionRun\)/);
  assert.match(service, /approvalResult\.value\.map\(projectMissionApproval\)/);
  assert.match(service, /overallState: 'unavailable'/);
});

test('Mission Control excludes private objectives, approval summaries and error details', () => {
  const secret = 'Private customer; passport TEST-123; credential=private-token';
  const run = {
    id: 'run-1', agentId: 'reservations', status: 'failed' as const,
    createdAt: '2026-10-21T00:00:00.000Z', updatedAt: '2026-10-21T00:01:00.000Z',
    durationMs: 60000, lastStepSequence: 3,
    objective: secret, error: { code: secret, message: secret }, payload: { secret },
  };
  const approval = {
    id: 'approval-1', action: 'create_booking', status: 'pending', createdAt: run.createdAt,
    summary: secret, payload: { secret },
  };
  const projectedRun = projectMissionRun(run);
  const projectedApproval = projectMissionApproval(approval);
  assert.equal(projectedRun.status, 'failed');
  assert.equal(projectedRun.lastStepSequence, 3);
  assert.equal(projectedApproval.status, 'pending');
  for (const value of [projectedRun, projectedApproval]) {
    assert.ok(!JSON.stringify(value).includes(secret));
    for (const key of ['objective', 'summary', 'error', 'errorCode', 'payload']) {
      assert.equal(Object.hasOwn(value, key), false);
    }
  }
});

test('Mission Control UI does not fake aggregate results for missing sources', () => {
  const component = readFileSync('src/components/MissionControlPanel.tsx', 'utf8');
  assert.match(component, /snapshot\.runSample\?\.sampled \?\? null/);
  assert.match(component, /owner access required|Owner access required/);
  assert.match(component, /bounded samples/);
  assert.match(component, /AbortController/);
});

