import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('Firebase Admin runtime uses modular APIs and ADC on Google infrastructure', () => {
  const runtime = read('backend/firebaseAdminRuntime.ts');
  assert.match(runtime, /from 'firebase-admin\/app'/);
  assert.match(runtime, /applicationDefault\(\)/);
  assert.match(runtime, /getApps\(\)/);
  assert.match(runtime, /from 'firebase-admin\/auth'/);
});

test('bookingService uses the named Firestore database without silently falling back to default', () => {
  const booking = read('backend/bookingService.ts');
  assert.doesNotMatch(booking, /import admin from 'firebase-admin'/);
  assert.match(booking, /getFirestore\(app, FIRESTORE_DATABASE_ID\)/);
  assert.doesNotMatch(booking, /getFirestore\(adminAny\.app\(\)\)/);
});

test('operator authentication shares the modular Firebase Admin app', () => {
  const auth = read('backend/authMiddleware.ts');
  assert.doesNotMatch(auth, /import admin from 'firebase-admin'/);
  assert.match(auth, /getFirebaseAdminAuth\(\)\.verifyIdToken/);
});
