import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
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

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');

test('all journey HTTP routes derive access from verified Firebase identity or guest capability', () => {
  const source = read('backend', 'routes', 'journey.ts');
  const calls = source.split('\n').filter(line => /buildTripJourney\(|getTravelerJourney\(|adaptTravelerJourney\(/.test(line) && !line.trim().startsWith('import'));
  assert.ok(calls.length >= 8, 'all route handlers are included');
  for (const call of calls) assert.match(call, /journeyAccess\(req\)/, call);
  assert.match(source, /verifyFirebaseUser\(req\)/);
  assert.match(source, /x-journey-access-token/);
});

test('public Customer Intake never adapts a saved journey from an untrusted id', () => {
  const source = read('backend', 'customerIntakeGateway.ts');
  assert.doesNotMatch(source, /adaptTravelerJourney\(/);
  assert.match(source, /Never adapt a persisted journey/);
});

test('guest capability is stored in private storage and sent only as a request header', () => {
  const storage = read('src', 'utils', 'privateStorage.ts');
  const component = read('src', 'components', 'FullTripJourneyBuilder.tsx');
  assert.match(storage, /'crt_journey_access_token'/);
  assert.match(component, /x-journey-access-token/);
  assert.match(component, /setPersonalItemInScope\(scope, 'crt_journey_access_token'/);
  assert.match(component, /Authorization = 'Bearer ' \+ await user\.getIdToken\(\)/);
});

test('public intake and trip planner require a server-signed chat session before using memory', () => {
  const intakeRoute = read('backend', 'routes', 'intake.ts');
  const journeyRoute = read('backend', 'routes', 'journey.ts');
  const app = read('src', 'App.tsx');
  const planner = read('src', 'components', 'FullTripJourneyBuilder.tsx');
  assert.match(intakeRoute, /verifyChatSessionAccess\(requestedSessionId, signedChatToken\)/);
  assert.match(intakeRoute, /sessionId: verifiedSessionId/);
  assert.match(journeyRoute, /verifyChatSessionAccess\(requestedSessionId, chatToken\)/);
  assert.match(app, /fetch\('\/api\/chat\/session', \{ method: 'POST' \}\)/);
  assert.match(app, /x-chat-session-token': sessionToken/);
  assert.match(planner, /fetch\('\/api\/chat\/session', \{ method: 'POST', signal: controller\.signal \}\)/);
  assert.match(planner, /x-chat-session-token': sessionToken/);
});

test('agent tools use server context, not model-supplied session ids or owner ids', () => {
  const tools = read('backend', 'agentTools.ts');
  assert.match(tools, /getOperationalMemory\(sessionId\)/);
  assert.match(tools, /const sessionId = String\(context\.sessionId \|\| ''\)/);
  assert.doesNotMatch(tools, /const sessionId = String\(args\.sessionId/);
  assert.match(tools, /context\.journeyAccess/);
});

test('raw guest capability is returned to the caller but only its hash is persisted', () => {
  const source = read('backend', 'travelJourneyOrchestrator.ts');
  assert.match(source, /persistJourney\(\{ \.\.\.journey, accessControl \}\)/);
  assert.match(source, /return \{ \.\.\.journey, \.\.\.\(capabilityToken \?/);
  assert.doesNotMatch(source, /accessControl: \{[^}]*capabilityToken/);
});
