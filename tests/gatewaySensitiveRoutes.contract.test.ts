import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('sensitive operational route families require application auth at the Vercel gateway', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'api', '[...path].ts'), 'utf8');
  const requiredPrefixes = [
    '/api/fcm/register',
    '/api/fcm/send',
    '/api/proformas',
    '/api/bookings/send-proforma-confirmation',
    '/api/providers',
    '/api/provider/status',
    '/api/operators/status',
  ];

  for (const prefix of requiredPrefixes) {
    assert.ok(source.includes(`'${prefix}'`), `Missing privileged gateway prefix: ${prefix}`);
  }

  assert.match(source, /isPrivilegedPath\(pathname\) && !hasApplicationAuth\(req\)/);
  assert.match(source, /application_auth_required/);
});
