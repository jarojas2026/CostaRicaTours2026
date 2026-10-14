import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readServerSource } from '../scripts/lib/serverSource';

const gate = fs.readFileSync(path.join(process.cwd(), 'backend/agentActionGate.ts'), 'utf8');
const server = readServerSource();
const cron = fs.readFileSync(path.join(process.cwd(), 'backend/cronEngine.ts'), 'utf8');
const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
const adminCommands = fs.readFileSync(path.join(process.cwd(), 'backend/adminAICommandService.ts'), 'utf8');

test('JARVIS sensitive-action gate consumes owner approval exactly once', () => {
  assert.match(gate, /consumeOwnerApproval/);
  assert.match(gate, /approvalResourceRef/);
  assert.match(gate, /basis: 'owner_approval'/);
  assert.match(gate, /assertAgentExecutionAuthorized/);
});

test('unsupported human-only actions stay blocked instead of being auto-approved', () => {
  assert.match(gate, /no tiene un canal automático de aprobación/);
});

test('JARVIS APIs are owner-only', () => {
  assert.match(server, /admin\/jarvis\/command', requireOwner/);
  assert.match(server, /admin\/jarvis\/plans', requireOwner/);
  assert.match(server, /admin\/jarvis\/plans\/:planId', requireOwner/);
  assert.match(server, /admin\/jarvis\/plans\/:planId\/reconcile', requireOwner/);
});

test('JARVIS supervision uses the existing distributed automation lock', () => {
  assert.match(cron, /withDistributedAutomationLock\('jarvis-supervision-1m'/);
  assert.match(cron, /runJarvisSupervisionSweep\(25\)/);
});

test('JARVIS plans remain server-written and owner-readable under Default Deny', () => {
  assert.match(rules, /match \/jarvis_plans\/\{planId\}/);
  assert.match(rules, /allow read: if isOwner\(\)/);
  assert.match(rules, /allow create, update, delete: if false/);
});

test('explicit owner AI commands are authorized intake but sensitive subactions remain separately governed', () => {
  assert.match(adminCommands, /const ownerIssued = params\.actor\.role === 'owner'/);
  assert.match(adminCommands, /status: ownerIssued \? 'approved' : 'pending_approval'/);
});
