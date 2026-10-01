import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'));

test('automatic Vercel builds are reserved for production while feature branches use GitHub CI', () => {
  assert.equal(typeof config.ignoreCommand, 'string');
  assert.match(config.ignoreCommand, /VERCEL_ENV/);
  assert.match(config.ignoreCommand, /production/);
  assert.match(config.ignoreCommand, /exit 1/);
  assert.match(config.ignoreCommand, /exit 0/);
});

test('zero-trust API gateway rewrite remains ahead of SPA routes', () => {
  assert.equal(config.rewrites[0]?.source, '/api/:path((?!gateway$).*)');
  assert.equal(config.rewrites[0]?.destination, '/api/gateway?__crt_path=:path');
});
