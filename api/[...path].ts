import type { IncomingMessage, ServerResponse } from 'http';

export type VercelRequest = IncomingMessage & {
  query: Record<string, string | string[]>;
  cookies?: Record<string, string>;
  body: any;
};

export type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
};

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

// Legacy compatibility endpoints that can fabricate a payment-session URL or
// bypass the canonical payment -> provider -> confirmation lifecycle. They are
// retained in the backend for migration/audit purposes but are not exposed by
// the public Vercel gateway.
const RETIRED_PUBLIC_PATHS = [
  '/api/pagos/solicitud',
  '/api/reservas/confirmar',
  '/api/payouts/run-batch',
];
const RETIRED_PUBLIC_PREFIXES = [
  '/api/workflows/',
];

// Defense in depth for operations that should never be reachable anonymously
// through the public frontend gateway, even if a backend route accidentally
// loses its Express auth middleware in a future change. Public inquiry,
// availability, itinerary-planning and booking-intake APIs are intentionally
// not included here.
const PRIVILEGED_PREFIXES = [
  '/api/admin',
  '/api/internal',
  '/api/ops',
  '/api/native',
  '/api/payouts',
  '/api/surveillance',
  '/api/reports',
  '/api/reportes',
  '/api/reviews/run-request-batch',
  '/api/reminders/run-24h',
  '/api/self-dev',
  '/api/automations',
  '/api/calendario/sincronizar',
  '/api/operadores/notificar',
  '/api/nps/despachar',
  '/api/agents/supervisor',
  '/api/agents/log_exception',
  '/api/ai/evaluation',
  '/api/ai/learning',
  '/api/ai/autonomy',
  '/api/ai/skills',
  '/api/ai/mesh',
  '/api/ai/demand-forecast',
  '/api/ai/fraud-check',
  '/api/fcm/register',
  '/api/fcm/send',
  '/api/proformas',
  '/api/bookings/send-proforma-confirmation',
  '/api/provider/status',
  '/api/operators/status',
];

function env(name: string): string {
  return String(process.env[name] || '').trim();
}

function requireEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`Missing required gateway configuration: ${name}`);
  return value;
}

function getWifAudience(): string {
  const explicit = env('GCP_WIF_AUDIENCE');
  if (explicit) return explicit;

  // This optional decomposition makes configuration less error-prone while
  // still refusing to guess any Google project/provider identity.
  const projectNumber = env('GCP_PROJECT_NUMBER');
  const poolId = env('GCP_WIF_POOL_ID');
  const providerId = env('GCP_WIF_PROVIDER_ID');
  if (projectNumber && poolId && providerId) {
    return `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`;
  }

  throw new Error('Missing required gateway configuration: GCP_WIF_AUDIENCE');
}

function requestPath(req: VercelRequest): string {
  try {
    return new URL(req.url || '/api', 'https://gateway.invalid').pathname;
  } catch {
    return '/api';
  }
}

function isRetiredPublicPath(pathname: string): boolean {
  return RETIRED_PUBLIC_PATHS.includes(pathname)
    || RETIRED_PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

function isPrivilegedPath(pathname: string): boolean {
  return PRIVILEGED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function hasApplicationAuth(req: VercelRequest): boolean {
  const authorization = req.headers.authorization;
  const bearer = typeof authorization === 'string' && authorization.startsWith('Bearer ') && authorization.length > 'Bearer '.length;
  const operatorKey = req.headers['x-operator-key'];
  return bearer || (typeof operatorKey === 'string' && operatorKey.trim().length > 0);
}

function getRuntimeOidcToken(req: VercelRequest): string {
  // Vercel supplies a fresh request-scoped identity token. The environment
  // token remains only as a compatibility fallback for local/build scenarios.
  const requestToken = req.headers['x-vercel-oidc-token'];
  const runtimeToken = typeof requestToken === 'string' ? requestToken.trim() : '';
  if (runtimeToken) return runtimeToken;
  return requireEnv('VERCEL_OIDC_TOKEN');
}

async function exchangeVercelOidcForGoogleAccessToken(vercelOidcToken: string): Promise<string> {
  const body = new URLSearchParams({
    audience: getWifAudience(),
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

  const accessToken = await exchangeVercelOidcForGoogleAccessToken(getRuntimeOidcToken(req));
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
  const pathname = requestPath(req);
  res.setHeader('cache-control', 'no-store, max-age=0');

  if (isRetiredPublicPath(pathname)) {
    return res.status(410).json({
      success: false,
      error: 'legacy_route_retired',
      message: 'Esta ruta heredada ya no está disponible públicamente. Utiliza el flujo vigente de disponibilidad, reserva y pago.',
    });
  }

  if (isPrivilegedPath(pathname) && !hasApplicationAuth(req)) {
    return res.status(401).json({
      success: false,
      error: 'application_auth_required',
      message: 'Esta operación requiere autenticación de administrador u operador.',
    });
  }

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
      if (HOP_BY_HOP.has(lower) || lower === 'content-encoding' || lower === 'content-length' || lower === 'cache-control') return;
      res.setHeader(name, value);
    });
    res.setHeader('x-crt-upstream-status', String(upstream.status));
    res.setHeader('cache-control', 'no-store, max-age=0');

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
