/**
 * Secure provider portal tokens.
 *
 * The provider receives a short-lived, signed capability token tied to one
 * service order and one provider. No booking id alone is sufficient to mutate
 * an order.
 */
import crypto from 'crypto';

const SECRET = () =>
  process.env.PROVIDER_ACTION_SECRET ||
  process.env.WEBHOOK_SECRET ||
  process.env.OPERATOR_API_KEY ||
  '';

type ProviderCapability = {
  v: 1;
  orderId: string;
  providerId: string;
  exp: number;
};

function b64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(payload: string): string {
  const secret = SECRET();
  if (!secret) throw new Error('PROVIDER_ACTION_SECRET no está configurado.');
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createProviderPortalToken(input: {
  orderId: string;
  providerId: string;
  ttlMinutes?: number;
}): string {
  const ttl = Math.max(5, Math.min(Number(input.ttlMinutes) || 1440, 10080));
  const capability: ProviderCapability = {
    v: 1,
    orderId: String(input.orderId),
    providerId: String(input.providerId),
    exp: Date.now() + ttl * 60_000
  };
  const payload = b64(JSON.stringify(capability));
  return payload + '.' + sign(payload);
}

export function verifyProviderPortalToken(token: string): ProviderCapability | null {
  const raw = String(token || '').trim();
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;

  const secret = SECRET();
  if (!secret) return null;

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ProviderCapability;
    if (parsed.v !== 1 || !parsed.orderId || !parsed.providerId || !Number.isFinite(parsed.exp)) return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function providerPortalConfigured(): boolean {
  return Boolean(SECRET());
}
