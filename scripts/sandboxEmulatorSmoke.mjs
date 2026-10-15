/**
 * Emulator-only smoke test. Refuses to run unless endpoints are localhost and
 * the Firebase project uses the reserved demo- prefix.
 */
import assert from 'node:assert/strict';

const project = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';
const firestore = process.env.FIRESTORE_EMULATOR_HOST || '';
const auth = process.env.FIREBASE_AUTH_EMULATOR_HOST || '';
assert.match(project, /^demo-[a-z0-9-]+$/, 'A demo Firebase project is required');
assert.match(firestore, /^(127\.0\.0\.1|localhost):\d+$/, 'Firestore must be local emulator');
assert.match(auth, /^(127\.0\.0\.1|localhost):\d+$/, 'Auth must be local emulator');

const id = 'scenario-smoke';
const base = 'http://' + firestore + '/v1/projects/' + project + '/databases/(default)/documents';
const payload = { fields: { marker: { stringValue: 'SIMULATED_ONLY_NOT_A_RESERVATION' }, bookingCreated: { booleanValue: false } } };
const write = await fetch(base + '/audit_sandbox?documentId=' + id, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
});
assert.equal(write.status, 200, 'Firestore emulator should accept a sandbox document' );
const read = await fetch(base + '/audit_sandbox/' + id);
assert.equal(read.status, 200);
const doc = await read.json();
assert.equal(doc.fields.marker.stringValue, 'SIMULATED_ONLY_NOT_A_RESERVATION');
assert.equal(doc.fields.bookingCreated.booleanValue, false);

const signup = await fetch('http://' + auth + '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'sandbox-tourist@example.invalid', password: 'test-password-123', returnSecureToken: true })
});
assert.equal(signup.status, 200, 'Auth emulator should create a test-only identity');
const identity = await signup.json();
assert.ok(identity.localId);
process.stdout.write('SANDBOX_OK demo project, local Auth and Firestore, simulated data only\\n');
