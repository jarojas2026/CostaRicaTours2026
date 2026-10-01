import crypto from 'node:crypto';

/**
 * Constant-time application credential validation for internal jobs.
 * Cloud Scheduler may use Authorization for Cloud Run OIDC, so the
 * application token can travel independently in X-CRT-Internal-Token.
 */
export function hasInternalJobToken(
  headers: Record<string, string | string[] | undefined>,
  configured: string | undefined
): boolean {
  if (!configured) return false;
  const schedulerToken = headers['x-crt-internal-token'];
  const authorization = headers.authorization;
  const provided = typeof schedulerToken === 'string'
    ? schedulerToken.trim()
    : typeof authorization === 'string' && authorization.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : '';
  if (!provided) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(provided);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
