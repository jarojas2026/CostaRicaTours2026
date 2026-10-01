import type { IncomingHttpHeaders } from 'http';
import Stripe from 'stripe';

export type PaymentWebhookTranslation =
  | {
      action: 'forward';
      provider: 'stripe' | 'paypal';
      eventId: string;
      targetPath: '/api/payments/stripe/return' | '/api/payments/paypal/return';
      body: { sessionId: string } | { orderId: string };
    }
  | {
      action: 'ack';
      provider: 'stripe' | 'paypal';
      eventId: string;
      reason: string;
      reviewRequired?: boolean;
    };

function requiredEnv(name: string): string {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Missing required payment webhook configuration: ${name}`);
  return value;
}

function header(headers: IncomingHttpHeaders, name: string): string {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

export async function readRawRequestBody(req: AsyncIterable<unknown>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  const maxBytes = 256 * 1024;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any);
    total += buffer.length;
    if (total > maxBytes) throw new Error('Payment webhook payload exceeds 256KB.');
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

export async function translateStripeWebhook(
  rawBody: Buffer,
  headers: IncomingHttpHeaders,
): Promise<PaymentWebhookTranslation> {
  const signingSecret = requiredEnv('STRIPE_WEBHOOK_SECRET');
  const apiKey = requiredEnv('STRIPE_SECRET_KEY');
  const signature = header(headers, 'stripe-signature');
  if (!signature) throw new Error('Stripe signature header is missing.');

  const stripe = new Stripe(apiKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, signingSecret);
  } catch {
    throw new Error('Stripe webhook signature is invalid.');
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (!session.id) throw new Error('Stripe webhook does not contain a checkout session id.');
    return {
      action: 'forward',
      provider: 'stripe',
      eventId: event.id,
      targetPath: '/api/payments/stripe/return',
      body: { sessionId: session.id },
    };
  }

  if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
    return {
      action: 'ack',
      provider: 'stripe',
      eventId: event.id,
      reason: event.type,
      reviewRequired: true,
    };
  }

  return { action: 'ack', provider: 'stripe', eventId: event.id, reason: 'event_not_actionable' };
}

type PayPalAuth = { accessToken: string; baseUrl: string };

async function paypalAccessToken(): Promise<PayPalAuth> {
  const clientId = requiredEnv('PAYPAL_CLIENT_ID');
  const secret = requiredEnv('PAYPAL_SECRET');
  const baseUrl = process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
  const basic = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok || !payload.access_token) {
    throw new Error(`PayPal authentication failed (${response.status}).`);
  }
  return { accessToken: String(payload.access_token), baseUrl };
}

async function verifyPayPalSignature(
  event: any,
  headers: IncomingHttpHeaders,
  auth: PayPalAuth,
): Promise<void> {
  const webhookId = requiredEnv('PAYPAL_WEBHOOK_ID');
  const transmissionId = header(headers, 'paypal-transmission-id');
  const transmissionTime = header(headers, 'paypal-transmission-time');
  const transmissionSig = header(headers, 'paypal-transmission-sig');
  const certUrl = header(headers, 'paypal-cert-url');
  const authAlgo = header(headers, 'paypal-auth-algo');

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    throw new Error('PayPal signature headers are incomplete.');
  }

  const response = await fetch(`${auth.baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${auth.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: event,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok || payload.verification_status !== 'SUCCESS') {
    throw new Error('PayPal webhook signature is invalid.');
  }
}

async function paypalOrderIdFromCapture(event: any, auth: PayPalAuth): Promise<string> {
  const direct = String(event?.resource?.supplementary_data?.related_ids?.order_id || '').trim();
  if (direct) return direct;

  const captureId = String(event?.resource?.id || '').trim();
  if (!captureId) return '';
  const response = await fetch(`${auth.baseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}`, {
    headers: { authorization: `Bearer ${auth.accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  const capture = await response.json().catch(() => ({})) as any;
  if (!response.ok) return '';
  return String(capture?.supplementary_data?.related_ids?.order_id || '').trim();
}

export async function translatePayPalWebhook(
  rawBody: Buffer,
  headers: IncomingHttpHeaders,
): Promise<PaymentWebhookTranslation> {
  let event: any;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new Error('PayPal webhook JSON is invalid.');
  }

  const eventId = String(event?.id || '').trim();
  if (!eventId) throw new Error('PayPal webhook event id is missing.');

  const auth = await paypalAccessToken();
  await verifyPayPalSignature(event, headers, auth);

  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const orderId = await paypalOrderIdFromCapture(event, auth);
    if (!orderId) throw new Error('PayPal capture does not contain a related order id.');
    return {
      action: 'forward',
      provider: 'paypal',
      eventId,
      targetPath: '/api/payments/paypal/return',
      body: { orderId },
    };
  }

  if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED' || event.event_type === 'CUSTOMER.DISPUTE.CREATED') {
    return {
      action: 'ack',
      provider: 'paypal',
      eventId,
      reason: String(event.event_type),
      reviewRequired: true,
    };
  }

  return { action: 'ack', provider: 'paypal', eventId, reason: 'event_not_actionable' };
}
