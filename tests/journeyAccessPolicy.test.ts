import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAccessJourney,
  hashJourneyCapability,
  issueJourneyCapability,
  type JourneyAccessControl,
} from '../backend/journeyAccessPolicy';

test('Firebase owner can access only the journey bound to the verified UID', () => {
  const control: JourneyAccessControl = { kind: 'firebase_user', ownerUid: 'uid-ana', version: 1 };
  assert.equal(canAccessJourney(control, { ownerUid: 'uid-ana' }), true);
  assert.equal(canAccessJourney(control, { ownerUid: 'uid-beto' }), false);
  assert.equal(canAccessJourney(control, {}), false);
  assert.equal(canAccessJourney(control, undefined), false);
});

test('guest capability is random, hashed at rest, and required for access', () => {
  const token = issueJourneyCapability();
  assert.ok(token.length >= 40);
  const control: JourneyAccessControl = {
    kind: 'guest_capability',
    tokenHash: hashJourneyCapability(token),
    version: 1,
  };
  assert.equal(control.tokenHash.includes(token), false);
  assert.equal(canAccessJourney(control, { capabilityToken: token }), true);
  assert.equal(canAccessJourney(control, { capabilityToken: token + 'x' }), false);
  assert.equal(canAccessJourney(control, {}), false);
});

test('legacy documents without an access policy fail closed', () => {
  assert.equal(canAccessJourney(undefined, { ownerUid: 'uid-ana' }), false);
  assert.equal(canAccessJourney(undefined, { capabilityToken: issueJourneyCapability() }), false);
});

test('malformed and short guest capabilities are rejected', () => {
  const control: JourneyAccessControl = {
    kind: 'guest_capability',
    tokenHash: hashJourneyCapability(issueJourneyCapability()),
    version: 1,
  };
  for (const token of ['', 'abc', 'x'.repeat(201)]) {
    assert.equal(canAccessJourney(control, { capabilityToken: token }), false);
  }
});
