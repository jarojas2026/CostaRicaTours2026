import crypto from 'node:crypto';

export type JourneyAccessControl =
  | { kind: 'firebase_user'; ownerUid: string; version: 1 }
  | { kind: 'guest_capability'; tokenHash: string; version: 1 };

export type JourneyAccessContext = {
  ownerUid?: string;
  capabilityToken?: string;
};

export function issueJourneyCapability(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashJourneyCapability(token: string): string {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function constantTimeHexEqual(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * The document id is never an authorization factor.
 * Legacy documents without access metadata intentionally fail closed.
 */
export function canAccessJourney(
  control: JourneyAccessControl | undefined,
  access: JourneyAccessContext | undefined
): boolean {
  if (!control || control.version !== 1 || !access) return false;

  if (control.kind === 'firebase_user') {
    return Boolean(
      access.ownerUid
      && control.ownerUid
      && access.ownerUid === control.ownerUid
    );
  }

  if (control.kind === 'guest_capability') {
    const token = String(access.capabilityToken || '');
    if (token.length < 40 || token.length > 200) return false;
    return constantTimeHexEqual(control.tokenHash, hashJourneyCapability(token));
  }

  return false;
}
