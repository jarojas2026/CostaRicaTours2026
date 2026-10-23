import assert from 'node:assert/strict';
import test from 'node:test';
import { getJourneyPipelineSample } from '../backend/journeyPipelineEvidence';
import { buildEvidenceBasedOwnerBriefing } from '../backend/ownerExecutiveBriefingService';

test('missing database has unknown journey counts, not a measured empty sample', async () => {
  const sample = await getJourneyPipelineSample(null);
  assert.equal(sample.pipeline.state, 'unavailable');
  assert.equal(sample.pipeline.readyToQuote, null);
  assert.equal(sample.pipeline.recovery, null);
  assert.equal(sample.pipeline.total, null);
  assert.deepEqual(sample.documents, []);
  const brief = buildEvidenceBasedOwnerBriefing({ journeyPipeline: sample.pipeline });
  assert.equal(brief.metrics.ready.value, null);
  assert.equal(brief.metrics.ready.quality, 'unavailable');
});

test('query failure stays unavailable and does not expose the error or invent zeros', async () => {
  const sample = await getJourneyPipelineSample(async () => { throw new Error('private database detail'); });
  assert.equal(sample.pipeline.state, 'unavailable');
  for (const key of ['discovery', 'verification', 'readyToQuote', 'recovery', 'total'] as const) {
    assert.equal(sample.pipeline[key], null);
  }
  assert.ok(!JSON.stringify(sample).includes('private database detail'));
  const brief = buildEvidenceBasedOwnerBriefing({ journeyPipeline: sample.pipeline });
  assert.equal(brief.metrics.recovery.value, null);
  assert.equal(brief.metrics.recovery.quality, 'unavailable');
});

test('successful empty query is a sample with actual zero counts', async () => {
  const sample = await getJourneyPipelineSample(async () => ({ docs: [] }));
  assert.equal(sample.pipeline.state, 'sample');
  assert.equal(sample.pipeline.source, 'firestore:traveler_journeys');
  for (const key of ['discovery', 'verification', 'readyToQuote', 'recovery', 'total'] as const) {
    assert.equal(sample.pipeline[key], 0);
  }
  const brief = buildEvidenceBasedOwnerBriefing({ journeyPipeline: sample.pipeline });
  assert.equal(brief.metrics.ready.value, 0);
  assert.equal(brief.metrics.ready.quality, 'sample');
  assert.equal(brief.metrics.recovery.value, 0);
});

test('observed journey stages keep existing aliases and bounded numeric counts', async () => {
  const stages = ['DISCOVERY', 'PLANNING', 'VERIFICATION', 'VERIFICATION_COMPLETE', 'READY_TO_QUOTE', 'RECOVERY', 'UNKNOWN'];
  const docs = stages.map((stage, index) => ({ id: String(index), data: () => index % 2 ? { status: stage } : { sales: { stage } } }));
  const sample = await getJourneyPipelineSample(async () => ({ docs }));
  assert.deepEqual(sample.pipeline, {
    state: 'sample', source: 'firestore:traveler_journeys', limit: 100,
    discovery: 2, verification: 2, readyToQuote: 1, recovery: 1, total: 7,
  });
  assert.deepEqual(sample.documents, docs);
});
