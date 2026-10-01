import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const facades = [
  'api/ai/chat.ts',
  'api/gemini/concierge.ts',
  'api/agent/counter.ts',
];

test('public Vercel facades import the gateway with an explicit emitted JS suffix', () => {
  for (const relativePath of facades) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(source, /from '\.\.\/\[\.\.\.path\]\.js'/, relativePath);
    assert.doesNotMatch(source, /from '\.\.\/\[\.\.\.path\]';/, relativePath);
  }
});
