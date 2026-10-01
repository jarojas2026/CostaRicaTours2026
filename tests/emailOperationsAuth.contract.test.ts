import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/EmailOperationsPage.tsx'), 'utf8');

test('email operations page obtains a Firebase ID token', () => {
  assert.match(page, /auth\.currentUser/);
  assert.match(page, /getIdToken\(\)/);
  assert.match(page, /Authorization:\s*`Bearer \$\{token\}`/);
});

test('both admin email endpoints receive the authorization header', () => {
  assert.match(page, /fetch\('\/api\/admin\/email-operations',[\s\S]*headers:\s*authorization/);
  assert.match(page, /fetch\('\/api\/admin\/email-operations\/sweep',[\s\S]*headers:\s*\{ \.\.\.authorization/);
});

test('email operations reads bypass caches', () => {
  assert.match(page, /cache:\s*'no-store'/);
});
