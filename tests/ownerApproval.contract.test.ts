import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { OWNER_APPROVAL_ACTIONS } from '../shared/ownerApprovalTypes';

test('owner approval queue covers every required sensitive action', () => {
  const actions = new Set(OWNER_APPROVAL_ACTIONS);
  for (const action of [
    'payment',
    'refund',
    'payout',
    'customer_message',
    'mass_message',
    'price_change',
    'publication',
  ]) {
    assert.equal(actions.has(action as any), true, `missing approval action ${action}`);
  }
});

test('Firestore keeps approvals and audit read-only to owner clients', () => {
  const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
  assert.match(rules, /function isOwner\(\)/);
  assert.match(rules, /match \/agent_approvals\/\{approvalId\}/);
  assert.match(rules, /allow read: if isOwner\(\)/);
  assert.match(rules, /match \/agent_audit_log\/\{auditId\}/);
  assert.match(rules, /allow create, update, delete: if false/);
});

test('approval consumption is one-time and requires exact action plus resource', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'backend/ownerApprovalService.ts'), 'utf8');
  assert.match(source, /current\.status !== 'approved'/);
  assert.match(source, /current\.action !== input\.action \|\| current\.resourceRef !== resourceRef/);
  assert.match(source, /status: 'consumed'/);
});

test('owner middleware does not grant owner authority to the operator key', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'backend/authMiddleware.ts'), 'utf8');
  assert.match(source, /role: 'operator'/);
  assert.match(source, /adminAccess\?\.role !== 'owner'/);
  assert.match(source, /OWNER_EMAIL/);
});
