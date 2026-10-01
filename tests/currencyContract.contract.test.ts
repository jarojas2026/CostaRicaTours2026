import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const client = fs.readFileSync(path.join(root, 'src/utils/currencies.ts'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');

test('server publishes the canonical USD to CRC field', () => {
  assert.match(server, /usdToCrc:\s*configuredRate/);
  assert.match(server, /source:\s*'runtime-config'/);
});

test('frontend consumes the canonical usdToCrc field before legacy aliases', () => {
  assert.match(client, /data\.usdToCrc \?\?/);
  assert.match(client, /data\.rate \?\?/);
  assert.match(client, /cache:\s*'no-store'/);
});

test('frontend never falls back to an embedded fixed CRC multiplier', () => {
  assert.doesNotMatch(client, /\b5(?:0[0-9]|1[0-9]|2[0-9])\b/);
  assert.doesNotMatch(client, /const\s+[^=]*(?:RATE|rate)[^=]*=\s*\d{3}/);
});
