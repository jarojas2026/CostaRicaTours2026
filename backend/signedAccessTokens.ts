import crypto from 'node:crypto';

/**
 * Short, purpose-bound HMAC capabilities.
 *
 * - chat sessions: the server mints a random session id and a signature; the
 *   browser must present both to read/write/delete conversational memory.
 * - booking documents: links e-mailed to the traveler carry a signature bound to
 *   exactly one booking id, so vouchers are never public by id alone.
 *
 * Secret resolution (first match wins):
 *   SESSION_SIGNING_SECRET -> derived from OPERATOR_API_KEY / AGENT_INTERNAL_TOKEN
 *   -> per-process random secret (tokens then only survive the instance; safe
 *   fallback, never a hard-coded value).
 */
let ephemeralSecret: Buffer | null = null;

function rootSecret(): Buffer {
  const explicit = String(process.env.SESSION_SIGNING_SECRET || '').trim();
  if (explicit) return Buffer.from(explicit);
  const derivedFrom = String(process.env.OPERATOR_API_KEY || process.env.AGENT_INTERNAL_TOKEN || '').trim();
  if (derivedFrom) {
    return crypto.createHmac('sha256', derivedFrom).update('crt-signed-access-tokens:v1').digest();
  }
  if (!ephemeralSecret) {
    ephemeralSecret = crypto.randomBytes(32);
    console.warn('[signedAccessTokens] SESSION_SIGNING_SECRET no configurado; usando secreto efímero por instancia.');
  }
  return ephemeralSecret;
}

export function signPurposeValue(purpose: string, value: string): string {
  return crypto.createHmac('sha256', rootSecret()).update(`${purpose}\n${value}`).digest('base64url');
}

export function verifyPurposeValue(purpose: string, value: string, signature: unknown): boolean {
  if (typeof signature !== 'string' || !signature || !value) return false;
  const expected = Buffer.from(signPurposeValue(purpose, value));
  const provided = Buffer.from(signature.trim());
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

const CHAT_SESSION_PATTERN = /^chat_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function issueChatSession(): { sessionId: string; sessionToken: string } {
  const sessionId = `chat_${crypto.randomUUID()}`;
  return { sessionId, sessionToken: signPurposeValue('chat-session', sessionId) };
}

/** Base session id for a scoped id such as `chat_<uuid>_counter_agent`. */
export function chatSessionBase(sessionId: string): string {
  const parts = String(sessionId || '').split('_');
  return parts.length >= 2 ? `${parts[0]}_${parts[1]}` : '';
}

export function verifyChatSessionAccess(sessionId: unknown, sessionToken: unknown): boolean {
  const id = String(sessionId || '').trim();
  if (!id || id.length > 180) return false;
  const base = chatSessionBase(id);
  if (!CHAT_SESSION_PATTERN.test(base)) return false;
  if (id !== base && !id.startsWith(`${base}_`)) return false;
  return verifyPurposeValue('chat-session', base, sessionToken);
}

export function bookingDocumentToken(bookingId: string): string {
  return signPurposeValue('booking-document', String(bookingId || '').trim());
}

export function verifyBookingDocumentToken(bookingId: string, token: unknown): boolean {
  return verifyPurposeValue('booking-document', String(bookingId || '').trim(), token);
}
