import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { summarizeMissionRunSample } from '../backend/missionControlService';

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
  assert.match(service, /scrubText/);
  assert.match(service, /overallState: 'unavailable'/);
});

test('Mission Control UI does not fake aggregate results for missing sources', () => {
  const component = readFileSync('src/components/MissionControlPanel.tsx', 'utf8');
  assert.match(component, /snapshot\.runSample\?\.sampled \?\? null/);
  assert.match(component, /owner access required|Owner access required/);
  assert.match(component, /bounded samples/);
  assert.match(component, /AbortController/);
});
