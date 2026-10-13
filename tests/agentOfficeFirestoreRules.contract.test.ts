import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');

test('agent office collections remain server-owned under Firestore Default Deny', () => {
  assert.match(rules, /match \/agents\/\{agentId\}/);
  assert.match(rules, /match \/agentRuns\/\{runId\}/);
  assert.match(rules, /match \/steps\/\{stepId\}/);
  const agentsBlock = rules.match(/match \/agents\/\{agentId\} \{[\s\S]*?\n    \}/)?.[0] || '';
  assert.match(agentsBlock, /allow read: if isAdmin\(\)/);
  assert.match(agentsBlock, /allow create, update, delete: if false/);
  const runsBlockStart = rules.indexOf('match /agentRuns/{runId}');
  const memoryBlockStart = rules.indexOf('match /agent_memory/{sessionId}');
  const runsBlock = rules.slice(runsBlockStart, memoryBlockStart);
  assert.ok(runsBlockStart >= 0);
  assert.match(runsBlock, /allow create, update, delete: if false/);
  assert.match(runsBlock, /match \/steps\/\{stepId\}/);
});

test('global default deny is preserved', () => {
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
});
