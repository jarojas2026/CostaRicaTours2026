/**
 * Short-lived customer capability tokens.
 *
 * Booking IDs are identifiers, not authorizers. These signed tokens let a
 * customer view a voucher or approve/reject a proforma without exposing the
 * entire booking record to anyone who guesses an ID.
 */
import crypto from 'crypto';

const SECRET = () => {
  if (process.env.NODE_ENV === 'production') {
    return String(process.env.CUSTOMER_ACTION_SECRET || '');
  }
  return String(
    process.env.CUSTOMER_ACTION_SECRET ||
    process.env.WEBHOOK_SECRET ||
    process.env.OPERATOR_API_KEY ||
    ''
  );
};

type CustomerCapabilityAction = 'view_pdf' | 'decide';

type CustomerCapability = {
  v: 1;
  bookingId: string;
  action: CustomerCapabilityAction;
  exp: number;
};

function sign(payload: string): string {
  const secret = SECRET();
  if (!secret) throw new Error('CUSTOMER_ACTION_SECRET no está configurado.');
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createCustomerActionToken(input: {
  bookingId: string;
  action: CustomerCapabilityAction;
  ttlMinutes?: number;
}): string {
  const ttl = Math.max(5, Math.min(Number(input.ttlMinutes) || 10080, 43200));
  const capability: CustomerCapability = {
    v: 1,
    bookingId: String(input.bookingId),
    action: input.action,
    exp: Date.now() + ttl * 60_000
  };
  const payload = Buffer.from(JSON.stringify(capability), 'utf8').toString('base64url');
  return payload + '.' + sign(payload);
}

export function verifyCustomerActionToken(
  token: string,
  expectedBookingId: string,
  expectedAction: CustomerCapabilityAction
): boolean {
  const raw = String(token || '').trim();
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return false;

  const secret = SECRET();
  if (!secret) return false;

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as CustomerCapability;
    return parsed.v === 1
      && parsed.bookingId === expectedBookingId
      && parsed.action === expectedAction
      && Number.isFinite(parsed.exp)
      && Date.now() <= parsed.exp;
  } catch {
    return false;
  }
}
