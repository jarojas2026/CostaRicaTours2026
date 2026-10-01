import gatewayHandler, {
  config as gatewayConfig,
  type VercelRequest,
  type VercelResponse,
} from './[...path].js';
import {
  readRawRequestBody,
  translatePayPalWebhook,
  translateStripeWebhook,
  type PaymentWebhookTranslation,
} from './_paymentWebhookIngress.js';

export const config = gatewayConfig;

const INTERNAL_PATH_QUERY = '__crt_path';
const LEGACY_AGENT_AVAILABILITY_PATHS = new Set([
  'agent/check-availability',
  'agent/tools/check_calendar_availability',
]);

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

function translatedGatewayRequest(
  req: VercelRequest,
  targetPath: string,
  body: Record<string, unknown>,
  method?: string,
): VercelRequest {
  return new Proxy(req, {
    get(target, property, receiver) {
      if (property === 'url') return targetPath;
      if (property === 'body') return body;
      if (property === 'query') return {};
      if (property === 'method' && method) return method;
      return Reflect.get(target, property, receiver);
    },
  }) as VercelRequest;
}

async function handlePaymentWebhook(
  forwardedPath: string,
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  const rawBody = await readRawRequestBody(req);
  let translation: PaymentWebhookTranslation;

  if (forwardedPath === 'webhooks/stripe') {
    translation = await translateStripeWebhook(rawBody, req.headers);
  } else {
    translation = await translatePayPalWebhook(rawBody, req.headers);
  }

  res.setHeader('cache-control', 'no-store, max-age=0');
  res.setHeader('x-crt-webhook-provider', translation.provider);
  res.setHeader('x-crt-webhook-event-id', translation.eventId);

  if (translation.action === 'ack') {
    if (translation.reviewRequired) {
      console.warn('[payment-webhook-gateway] financial review required', {
        provider: translation.provider,
        eventId: translation.eventId,
        reason: translation.reason,
      });
    }
    return res.status(200).json({
      accepted: true,
      eventId: translation.eventId,
      provider: translation.provider,
      reason: translation.reason,
      reviewRequired: translation.reviewRequired === true,
    });
  }

  // The public edge validates the provider signature. The private Cloud Run
  // endpoint then independently retrieves the Stripe/PayPal record, checks the
  // booking reference, amount and currency, and performs the authoritative
  // Firestore transition. No browser or webhook payload can mark a booking paid.
  const translated = translatedGatewayRequest(req, translation.targetPath, translation.body);
  return gatewayHandler(translated, res);
}

function safeAvailabilityTarget(req: VercelRequest): { url: string } | { error: string } {
  const body = req.body || {};
  const tourId = String(body.tour_id || body.tourId || '').trim();
  const date = String(body.target_date || body.date || '').trim();
  const time = String(body.time || '').trim();
  const seatsRaw = Number(body.party_size ?? body.partySize ?? body.seats ?? 1);
  const seats = Number.isInteger(seatsRaw) ? seatsRaw : NaN;

  if (!tourId) return { error: 'tour_id_required' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'valid_target_date_required' };
  if (!Number.isInteger(seats) || seats < 1 || seats > 50) return { error: 'valid_party_size_required' };

  const params = new URLSearchParams({ date, seats: String(seats) });
  if (time) params.set('time', time);
  return { url: `/api/tours/${encodeURIComponent(tourId)}/availability?${params.toString()}` };
}

async function handleLegacyAgentAvailability(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, available: false, error: 'method_not_allowed' });
  }

  const target = safeAvailabilityTarget(req);
  if ('error' in target) {
    return res.status(400).json({ success: false, available: false, error: target.error });
  }

  res.setHeader('x-crt-availability-source', 'authoritative-booking-service');
  res.setHeader('cache-control', 'no-store, max-age=0');
  const translated = translatedGatewayRequest(req, target.url, {}, 'GET');
  return gatewayHandler(translated, res);
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
 * Payment webhooks are intentionally intercepted before the generic request
 * body helper is touched. Vercel exposes the body lazily; reading the underlying
 * IncomingMessage stream here preserves the exact bytes required by Stripe and
 * PayPal signature verification. Valid payment events are translated to the
 * existing private reconciliation endpoints, which remain the source of truth.
 *
 * Legacy agent availability aliases are translated to the same authoritative
 * Firestore-backed availability endpoint used by the customer-facing product.
 * The edge never manufactures time slots or default capacity values.
 *
 * The explicit `.js` suffix is intentional: Vercel emits ESM JavaScript at
 * runtime and Node ESM does not resolve extensionless relative imports.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const forwardedPath = normalizeForwardedPath(firstQueryValue(req.query?.[INTERNAL_PATH_QUERY]));
    const currentUrl = new URL(req.url || '/api/gateway', 'https://gateway.invalid');
    currentUrl.searchParams.delete(INTERNAL_PATH_QUERY);

    if (forwardedPath === 'webhooks/stripe' || forwardedPath === 'webhooks/paypal') {
      return await handlePaymentWebhook(forwardedPath, req, res);
    }

    // The legacy itinerary endpoint creates a synthetic fixed-price record and
    // labels it confirmed before provider/payment evidence. Keep the historical
    // implementation in Cloud Run for auditability, but do not expose it as a
    // public booking path. Journey/proforma flows must reach canonical booking.
    if (forwardedPath === 'itinerary/book') {
      return res.status(410).json({
        success: false,
        error: 'legacy_itinerary_booking_retired',
        state: 'proposal_only',
        message: 'El itinerario sigue siendo una propuesta hasta verificar precio, disponibilidad, proveedor y pago mediante el flujo de reserva vigente.',
      });
    }

    if (LEGACY_AGENT_AVAILABILITY_PATHS.has(forwardedPath)) {
      return await handleLegacyAgentAvailability(req, res);
    }

    req.url = `/api/${forwardedPath}${currentUrl.search}`;
    if (req.query && INTERNAL_PATH_QUERY in req.query) delete req.query[INTERNAL_PATH_QUERY];

    return gatewayHandler(req, res);
  } catch (error: any) {
    const message = error?.message || 'Invalid API gateway request.';
    const isWebhookError = /Stripe|PayPal|webhook|payload/i.test(message);
    if (isWebhookError) console.error('[payment-webhook-gateway]', message);

    return res.status(400).json({
      success: false,
      error: isWebhookError ? 'payment_webhook_rejected' : 'invalid_gateway_path',
      message,
    });
  }
}
