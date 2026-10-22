import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildEvidenceBasedOwnerBriefing } from '../backend/ownerExecutiveBriefingService';

test('no sources means null metrics and financial evidence not certified', () => {
  const brief = buildEvidenceBasedOwnerBriefing({});
  assert.equal(brief.execution, 'none');
  assert.equal(brief.method, 'deterministic_evidence_review');
  assert.equal(brief.metrics.alerts.value, null);
  assert.equal(brief.metrics.pending.value, null);
  assert.equal(brief.workforceSample, null);
  assert.ok(brief.factsNotCertified.includes('profit/margin'));
  assert.ok(brief.recommendations.every(item => item.execution === 'proposal_only' && item.approvalRequiredForAnyMutation));
});

test('critical alerts are prioritized with a concrete evidence path, without executing', () => {
  const brief = buildEvidenceBasedOwnerBriefing({
    alerts: { critical: 2 },
    business: { pendingBookings: 4 },
    journeyPipeline: { state: 'sample', source: 'firestore:traveler_journeys', readyToQuote: 3, recovery: 1 },
    agentOffice: { source: 'firestore_agent_registry_and_events', registered: 5, active: 1, noSignal: 2, waitingApproval: 1 },
  });
  assert.equal(brief.recommendations[0].id, 'critical-alert-review');
  assert.deepEqual(brief.recommendations[0].evidence[0], {
    path: 'alerts.critical', value: 2, quality: 'unverified',
  });
  assert.ok(brief.recommendations.some(x => x.id === 'quote-readiness-sample'));
  assert.ok(brief.recommendations.some(x => x.id === 'agent-heartbeats'));
  assert.equal(brief.workforceSample?.find(x => x.status === 'no_signal')?.count, 2);
});

test('invalid and absent counters never become global healthy zeros', () => {
  const brief = buildEvidenceBasedOwnerBriefing({
    alerts: { critical: '0' },
    business: { pendingBookings: -1 },
    journeyPipeline: { recovery: Number.NaN },
    agentOffice: { source: 'unavailable', active: 500, noSignal: 0 },
  });
  assert.equal(brief.metrics.alerts.value, null);
  assert.equal(brief.metrics.pending.value, null);
  assert.equal(brief.metrics.recovery.value, null);
  assert.equal(brief.metrics.noSignal.value, null);
  assert.equal(brief.workforceSample, null);
});

test('owner-only private GET serves proposals, never mutates agents or bookings', () => {
  const routes = readFileSync('backend/routes/admin.ts', 'utf8');
  const ui = readFileSync('src/components/OwnerExecutiveBriefingPanel.tsx', 'utf8');
  const adminPage = readFileSync('src/pages/AdminControlCenterPage.tsx', 'utf8');
  assert.match(routes, /get\('\/api\/admin\/owner-briefing', requireOwner/);
  assert.match(routes, /getOwnerExecutiveBriefing\(\)/);
  assert.match(ui, /'\.\.\.'|proposal_only|Propuesta · no ejecutada/);
  assert.match(ui, /auth\.currentUser/);
  assert.match(adminPage, /case 'gerencia'/);
});

test('failed and missing journey provenance never become healthy zero counters', () => {
  for (const journeyPipeline of [
    { state: 'unavailable', source: 'firestore:traveler_journeys', readyToQuote: 0, recovery: 0 },
    { readyToQuote: 0, recovery: 0 },
    { state: 'sample', source: 'memory:journeys', readyToQuote: 2, recovery: 1 },
  ]) {
    const brief = buildEvidenceBasedOwnerBriefing({ journeyPipeline });
    assert.deepEqual(brief.metrics.ready, { path: 'journeyPipeline.readyToQuote', value: null, quality: 'unavailable' });
    assert.deepEqual(brief.metrics.recovery, { path: 'journeyPipeline.recovery', value: null, quality: 'unavailable' });
    assert.ok(!brief.recommendations.some(item => ['quote-readiness-sample', 'journey-recovery-sample'].includes(item.id)));
  }
});

test('a successfully read empty journey sample preserves measured zero counts', () => {
  const brief = buildEvidenceBasedOwnerBriefing({
    journeyPipeline: { state: 'sample', source: 'firestore:traveler_journeys', readyToQuote: 0, recovery: 0 },
  });
  assert.deepEqual(brief.metrics.ready, { path: 'journeyPipeline.readyToQuote', value: 0, quality: 'sample' });
  assert.deepEqual(brief.metrics.recovery, { path: 'journeyPipeline.recovery', value: 0, quality: 'sample' });
});
