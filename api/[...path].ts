import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Zero-trust Vercel -> private Cloud Run gateway.
 *
 * Authentication chain:
 * Vercel OIDC (short lived) -> Google STS Workload Identity Federation ->
 * IAM Credentials generateIdToken -> Cloud Run X-Serverless-Authorization.
 *
 * No service-account private key is stored in Vercel or in this repository.
 * Client Authorization is preserved for application-level auth while
 * X-Serverless-Authorization is used exclusively by Cloud Run IAM.
 */

export const config = {
  maxDuration: 60,
};

type TokenCache = { token: string; expiresAt: number };
let cloudRunTokenCache: TokenCache | null = null;

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

function requireEnv(name: string): string {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Missing required gateway configuration: ${name}`);
  return value;
}

async function exchangeVercelOidcForGoogleAccessToken(vercelOidcToken: string): Promise<string> {
  const audience = requireEnv('GCP_WIF_AUDIENCE');
  const body = new URLSearchParams({
    audience,
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    subject_token: vercelOidcToken,
  });

  const response = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok || !payload.access_token) {
    throw new Error(`Google STS token exchange failed (${response.status}): ${payload.error_description || payload.error || 'unknown_error'}`);
  }
  return String(payload.access_token);
}

async function generateCloudRunIdToken(accessToken: string): Promise<string> {
  const serviceAccount = requireEnv('GCP_WIF_SERVICE_ACCOUNT');
  const cloudRunAudience = requireEnv('CLOUD_RUN_BACKEND_URL').replace(/\/$/, '');
  const url = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(serviceAccount)}:generateIdToken`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ audience: cloudRunAudience, includeEmail: true }),
    signal: AbortSignal.timeout(15_000),
  });

  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok || !payload.token) {
    throw new Error(`Google IAM ID-token generation failed (${response.status}): ${payload.error?.message || 'unknown_error'}`);
  }
  return String(payload.token);
}

async function getCloudRunIdToken(req: VercelRequest): Promise<string> {
  const now = Date.now();
  if (cloudRunTokenCache && cloudRunTokenCache.expiresAt - now > 60_000) {
    return cloudRunTokenCache.token;
  }

  // Functions receive a fresh platform token in the request header. The env
  // token is only a fallback for local development/build environments.
  const requestToken = req.headers['x-vercel-oidc-token'];
  const vercelOidcToken = (typeof requestToken === 'string' ? requestToken.trim() : '')
    || requireEnv('VERCEL_OIDC_TOKEN');
  const accessToken = await exchangeVercelOidcForGoogleAccessToken(vercelOidcToken);
  const token = await generateCloudRunIdToken(accessToken);

  // Google ID tokens are typically valid for about one hour. Cache conservatively.
  cloudRunTokenCache = { token, expiresAt: now + 50 * 60_000 };
  return token;
}

function requestBody(req: VercelRequest): BodyInit | undefined {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (req.body === undefined || req.body === null) return undefined;
  if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) return req.body as any;
  return JSON.stringify(req.body);
}

function targetUrl(req: VercelRequest): string {
  const backend = requireEnv('CLOUD_RUN_BACKEND_URL').replace(/\/$/, '');
  const original = req.url || '/api';
  const normalized = original.startsWith('/api/') || original === '/api'
    ? original
    : `/api/${original.replace(/^\//, '')}`;
  return `${backend}${normalized}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cloudRunIdToken = await getCloudRunIdToken(req);
    const headers = new Headers();

    for (const [name, value] of Object.entries(req.headers)) {
      const lower = name.toLowerCase();
      if (HOP_BY_HOP.has(lower) || lower === 'x-vercel-oidc-token' || value === undefined) continue;
      headers.set(name, Array.isArray(value) ? value.join(',') : String(value));
    }

    // Keep end-user Authorization intact. Cloud Run IAM authenticates this header instead.
    headers.set('x-serverless-authorization', `Bearer ${cloudRunIdToken}`);
    headers.set('x-forwarded-host', String(req.headers.host || ''));
    headers.set('x-forwarded-proto', 'https');
    headers.set('x-crt-gateway', 'vercel-oidc-wif');

    const body = requestBody(req);
    if (body && !headers.has('content-type')) headers.set('content-type', 'application/json');

    const upstream = await fetch(targetUrl(req), {
      method: req.method || 'GET',
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(45_000),
    });

    upstream.headers.forEach((value, name) => {
      const lower = name.toLowerCase();
      if (HOP_BY_HOP.has(lower) || lower === 'content-encoding' || lower === 'content-length') return;
      res.setHeader(name, value);
    });
    res.setHeader('x-crt-upstream-status', String(upstream.status));

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.status(upstream.status).send(buffer);
  } catch (error: any) {
    console.error('[zero-trust-gateway]', error?.message || error);
    return res.status(503).json({
      success: false,
      error: 'backend_gateway_unavailable',
      message: 'La conexión segura con el backend no está disponible en este momento.',
    });
  }
}
