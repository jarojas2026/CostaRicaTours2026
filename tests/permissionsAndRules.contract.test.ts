import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('requireAdmin is owner/admin only and e-mail grants require email_verified', () => {
  const auth = read('backend/authMiddleware.ts');
  assert.match(auth, /export function requireAdmin\(/);
  assert.match(auth, /role !== 'owner' && role !== 'admin'/);
  assert.match(auth, /const emailVerified = decoded\.email_verified === true/);
  assert.match(auth, /emailVerified && ownerEmail && email === ownerEmail/);
  assert.match(auth, /emailVerified && adminEmail && email === adminEmail/);
  assert.match(auth, /emailVerified && allowedEmails\.includes\(email\)/);
  const server = read('server.ts');
  assert.doesNotMatch(server, /const requireAdmin = requireOperator;/);
  assert.match(server, /const requireAdmin = requireAdminRole;/);
});

test('server.ts has no duplicate method+path registrations', () => {
  const server = read('server.ts');
  const seen = new Map<string, number>();
  server.split('\n').forEach((line, index) => {
    const match: RegExpExecArray | null = /^app\.(get|post|put|patch|delete|all)\((\[[^\]]*\]|'[^']*')/.exec(line);
    if (!match) return;
    for (const route of match[2].match(/'([^']+)'/g) || []) {
      const key: string = `${match[1]} ${route}`;
      assert.equal(seen.has(key), false, `${key} registered twice (lines ${seen.get(key)} and ${index + 1})`);
      seen.set(key, index + 1);
    }
  });
});

test('firestore rules: reviews by booking owner, strict user shape, immutable chat owner', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /data\.keys\(\)\.hasOnly\(\['userId', 'createdAt', 'email', 'displayName'\]\)/);
  assert.match(rules, /get\(\/databases\/\$\(database\)\/documents\/bookings\/\$\(incoming\(\)\.bookingId\)\)\.data\.userId == request\.auth\.uid/);
  assert.match(rules, /incoming\(\)\.userId == resource\.data\.userId/);
  assert.doesNotMatch(rules, /function isValidBooking/);
  const chat = rules.slice(rules.indexOf('match /chat_sessions/{sessionId}'), rules.indexOf('// Digital Agent Office'));
  assert.doesNotMatch(chat, /allow read, write:/);
});

test('n8n payout example requires a paid booking and carries no real Telegram chat id', () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), 'workflow_IKmmlw2wHdABsTed.json')), false);
  const workflow = read('docs/examples/n8n/provider-payouts.workflow.example.json');
  assert.doesNotMatch(workflow, /-100\d{6,}/);
  assert.match(workflow, /TELEGRAM_OPS_CHAT_ID/);
  assert.match(workflow, /\['completed', 'paid'\]\.includes\(String\(i\.json\.paymentStatus/);
  assert.equal(JSON.parse(workflow).workflow.active, false);
});

test('third-party operator prospects live outside the public bundle source tree', () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), 'src', 'data', 'operators', 'operatorProspects.json')), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), 'data', 'operators', 'operatorProspects.json')), true);
});
