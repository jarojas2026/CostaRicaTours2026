import test from 'node:test';
import assert from 'node:assert/strict';
import { requirementsToFacts, stableOmnichannelSession } from '../backend/omnichannelJourneyBridge';

test('same external thread resolves to the same omnichannel session', () => {
  const a = stableOmnichannelSession({ channel: 'email:gmail', threadId: 'thread-abc', messageId: 'm1' });
  const b = stableOmnichannelSession({ channel: 'email:gmail', threadId: 'thread-abc', messageId: 'm2' });
  const c = stableOmnichannelSession({ channel: 'email:gmail', threadId: 'thread-other', messageId: 'm3' });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('customer requirements are facts about intent, not verified inventory', () => {
  const facts = requirementsToFacts({
    channel: 'email:gmail',
    messageId: 'm1',
    threadId: 't1',
    actor: 'customer',
    requirements: { destination: 'Puerto Viejo', adults: 2, breakfast: true }
  });
  assert.equal(facts.length, 3);
  assert.ok(facts.every(f => f.truth === 'CUSTOMER_PROVIDED'));
  assert.ok(facts.every(f => f.sourceMessageId === 'm1'));
});

test('provider statements retain provider provenance until independently promoted', () => {
  const facts = requirementsToFacts({
    channel: 'email:gmail',
    messageId: 'provider-m1',
    actor: 'provider',
    requirements: { availability: 'available', nightlyRateUsd: 185 }
  });
  assert.ok(facts.every(f => f.truth === 'PROVIDER_PROVIDED'));
  assert.equal(facts.some(f => f.truth === 'LIVE_VERIFIED'), false);
});
