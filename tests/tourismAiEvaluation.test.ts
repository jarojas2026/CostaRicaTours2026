import test from 'node:test';
import assert from 'node:assert/strict';
import { runTourismAiOfflineEvaluation } from '../backend/tourismAiEvaluation';

test('offline tourism AI evaluation passes every deterministic safety contract', () => {
  const report = runTourismAiOfflineEvaluation(1_000_000);
  assert.equal(report.mode, 'offline-deterministic');
  assert.equal(report.externalModelCalls, 0);
  assert.equal(report.externalNetworkCalls, 0);
  assert.equal(report.total, 7);
  assert.equal(report.failed, 0, JSON.stringify(report.cases.filter(item => !item.passed)));
  assert.equal(report.passed, report.total);
  assert.equal(report.passRate, 100);
});

test('offline evaluation is deterministic for a fixed clock', () => {
  const first = runTourismAiOfflineEvaluation(1_000_000);
  const second = runTourismAiOfflineEvaluation(1_000_000);
  assert.deepEqual(first, second);
});

test('offline evaluation identifies cases by stable unique identifiers', () => {
  const report = runTourismAiOfflineEvaluation(1_000_000);
  const ids = report.cases.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('availability_missing_timestamp_is_unknown'));
  assert.ok(ids.includes('medical_constraint_requires_human_review'));
});
