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
let cloudRunTokenRefresh: Promise<string> | null = null;

type ProviderEvidenceState = 'pending' | 'confirmed' | 'unavailable' | 'not_found' | 'error';
type ProviderEvidence = {
  state: ProviderEvidenceState;
  statusCode: number;
  providerConfirmedAt?: string | null;
};

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

const RETIRED_PUBLIC_PATHS = [
  '/api/pagos/solicitud',
  '/api/reservas/confirmar',
  '/api/payouts/run-batch',
];
const RETIRED_PUBLIC_PREFIXES = [
  '/api/workflows/',
];
const RETIRED_PUBLIC_PATTERNS = [
  /^\/api\/bookings\/[^/]+\/customer-confirm$/,
];

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
  '/api/providers',
  '/api/provider/status',
  '/api/operators/status',
];

const PAYMENT_CREATION_PATHS = new Set([
  '/api/stripe/create-checkout-session',
  '/api/paypal/create-order',
]);

const CUSTOMER_READINESS_PREFIX = '/api/customer/booking-readiness/';

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
    || RETIRED_PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
    || RETIRED_PUBLIC_PATTERNS.some(pattern => pattern.test(pathname));
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

  // Concurrent cold-start requests share only the infrastructure identity.
  // Customer Authorization remains request-scoped in the forwarding code.
  if (!cloudRunTokenRefresh) {
    cloudRunTokenRefresh = (async () => {
      const accessToken = await exchangeVercelOidcForGoogleAccessToken(getRuntimeOidcToken(req));
      const token = await generateCloudRunIdToken(accessToken);
      cloudRunTokenCache = { token, expiresAt: now + 50 * 60_000 };
      return token;
    })();
  }
  try {
    return await cloudRunTokenRefresh;
  } finally {
    // Rejected exchanges must not poison subsequent requests.
    cloudRunTokenRefresh = null;
  }
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

function customerReadinessBookingId(pathname: string): string | null {
  if (!pathname.startsWith(CUSTOMER_READINESS_PREFIX)) return null;
  const bookingId = decodeURIComponent(pathname.slice(CUSTOMER_READINESS_PREFIX.length)).trim();
  return /^CR-PV-[0-9a-f-]{30,}$/i.test(bookingId) ? bookingId : null;
}

async function readProviderEvidence(bookingId: string, cloudRunIdToken: string): Promise<ProviderEvidence> {
  const backend = requireEnv('CLOUD_RUN_BACKEND_URL').replace(/\/$/, '');
  const statusResponse = await fetch(`${backend}/api/provider/status/${encodeURIComponent(bookingId)}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-serverless-authorization': `Bearer ${cloudRunIdToken}`,
      'x-crt-gateway': 'vercel-oidc-wif-provider-evidence',
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  });
  const data = await statusResponse.json().catch(() => ({})) as any;
  if (statusResponse.status === 404) return { state: 'not_found', statusCode: 404 };
  if (!statusResponse.ok) return { state: 'error', statusCode: 502 };

  const providerStatus = String(data.providerStatus || '').toLowerCase();
  if (data.providerConfirmedAt || ['confirmed', 'confirmada', 'available', 'accepted'].includes(providerStatus)) {
    return { state: 'confirmed', statusCode: 200, providerConfirmedAt: data.providerConfirmedAt || null };
  }
  if (['rejected', 'declined', 'unavailable', 'cancelled', 'canceled'].includes(providerStatus)) {
    return { state: 'unavailable', statusCode: 200 };
  }
  return { state: 'pending', statusCode: 200 };
}

async function assertProviderEvidenceBeforePayment(bookingId: string, cloudRunIdToken: string) {
  if (!bookingId) {
    return { ok: false as const, status: 400, error: 'booking_id_required', message: 'Se requiere una reserva válida antes de crear un pago.' };
  }

  const evidence = await readProviderEvidence(bookingId, cloudRunIdToken);
  if (evidence.state !== 'confirmed') {
    return {
      ok: false as const,
      status: evidence.statusCode === 404 ? 404 : 409,
      error: evidence.state === 'not_found' ? 'booking_not_found' : 'provider_confirmation_required',
      message: evidence.state === 'not_found'
        ? 'La solicitud de reserva no existe.'
        : 'El proveedor todavía no ha confirmado disponibilidad. No se generó ningún cobro.'
    };
  }

  return { ok: true as const };
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
    const readinessBookingId = customerReadinessBookingId(pathname);

    if (pathname.startsWith(CUSTOMER_READINESS_PREFIX)) {
      if (!readinessBookingId) {
        return res.status(400).json({ success: false, error: 'invalid_booking_id', state: 'error', readyForPayment: false });
      }
      const evidence = await readProviderEvidence(readinessBookingId, cloudRunIdToken);
      if (evidence.state === 'not_found') {
        return res.status(404).json({ success: false, error: 'booking_not_found', state: 'not_found', readyForPayment: false });
      }
      if (evidence.state === 'error') {
        return res.status(502).json({ success: false, error: 'provider_evidence_unavailable', state: 'error', readyForPayment: false });
      }
      return res.status(200).json({
        success: true,
        bookingId: readinessBookingId,
        state: evidence.state,
        readyForPayment: evidence.state === 'confirmed',
        providerConfirmedAt: evidence.state === 'confirmed' ? evidence.providerConfirmedAt || null : null,
      });
    }

    if (PAYMENT_CREATION_PATHS.has(pathname)) {
      const bookingId = String(req.body?.bookingId || '').trim();
      const providerGate = await assertProviderEvidenceBeforePayment(bookingId, cloudRunIdToken);
      if (!providerGate.ok) {
        return res.status(providerGate.status).json({
          success: false,
          error: providerGate.error,
          message: providerGate.message,
        });
      }
    }

    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      const lower = name.toLowerCase();
      if (HOP_BY_HOP.has(lower) || lower === 'x-vercel-oidc-token' || value === undefined) continue;
      headers.set(name, Array.isArray(value) ? value.join(',') : String(value));
    }

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
