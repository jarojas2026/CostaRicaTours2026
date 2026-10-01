import gatewayHandler, {
  config,
  type VercelRequest,
  type VercelResponse,
} from './[...path].js';

export { config };

const INTERNAL_PATH_QUERY = '__crt_path';

function firstQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function normalizeForwardedPath(value: string): string {
  const trimmed = value.trim().replace(/^\/+/, '');
  if (!trimmed) throw new Error('Missing forwarded API path.');
  if (trimmed.includes('\\') || trimmed.includes('\0') || trimmed.includes('?') || trimmed.includes('#')) {
    throw new Error('Invalid forwarded API path.');
  }

  const segments = trimmed.split('/').filter(Boolean);
  if (!segments.length || segments.some(segment => segment === '.' || segment === '..')) {
    throw new Error('Invalid forwarded API path.');
  }

  return segments.join('/');
}

/**
 * Stable one-level Vercel Function entrypoint for the private Cloud Run gateway.
 *
 * Frameworkless Vite deployments can reliably address `/api/gateway`, while
 * `vercel.json` rewrites every nested public `/api/...` request here and passes
 * the original path through `__crt_path`. Before delegating to the existing
 * zero-trust gateway we restore `req.url`, so all retired/privileged-route
 * guards continue evaluating the real public path and Cloud Run receives the
 * original API URL and query string.
 *
 * The explicit `.js` suffix is intentional: Vercel emits ESM JavaScript at
 * runtime and Node ESM does not resolve extensionless relative imports.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const forwardedPath = normalizeForwardedPath(firstQueryValue(req.query?.[INTERNAL_PATH_QUERY]));
    const currentUrl = new URL(req.url || '/api/gateway', 'https://gateway.invalid');
    currentUrl.searchParams.delete(INTERNAL_PATH_QUERY);

    req.url = `/api/${forwardedPath}${currentUrl.search}`;
    if (req.query && INTERNAL_PATH_QUERY in req.query) delete req.query[INTERNAL_PATH_QUERY];

    return gatewayHandler(req, res);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: 'invalid_gateway_path',
      message: error?.message || 'Invalid API gateway path.',
    });
  }
}
