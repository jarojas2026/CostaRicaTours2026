import crypto from 'crypto';
import { getFirestoreDb } from './bookingService';

export interface TravelerIdentityInput {
  phone?: string;
  email?: string;
  sessionId?: string;
  channel?: string;
  name?: string;
}

export interface TravelerIdentity {
  canonicalId: string;
  sessionId: string;
  matchedBy: 'phone' | 'email' | 'session' | 'new';
}

function normalizePhone(value?: string): string {
  return String(value || '').replace(/[^0-9]/g, '').slice(-20);
}

function normalizeEmail(value?: string): string {
  return String(value || '').trim().toLowerCase().slice(0, 254);
}

function aliasKey(kind: 'phone' | 'email', value: string): string {
  return crypto.createHash('sha256').update(`${kind}:${value}`).digest('hex');
}

function newCanonicalId(): string {
  return `trav_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
}

/**
 * Resolves web/WhatsApp/voice/email identities to one operational traveler ID.
 * Alias documents contain only hashes; contact data stays on the canonical record.
 */
export async function resolveTravelerIdentity(input: TravelerIdentityInput): Promise<TravelerIdentity> {
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const fallbackSession = String(input.sessionId || '').trim().slice(0, 160);
  const db = getFirestoreDb();

  if (!db) {
    const sessionId = fallbackSession || newCanonicalId();
    return { canonicalId: sessionId, sessionId, matchedBy: fallbackSession ? 'session' : 'new' };
  }

  const aliases = [
    phone ? { kind: 'phone' as const, value: phone } : null,
    email ? { kind: 'email' as const, value: email } : null
  ].filter(Boolean) as Array<{ kind: 'phone' | 'email'; value: string }>;

  const aliasRefs = aliases.map(alias => ({
    ...alias,
    ref: db.collection('traveler_identity_aliases').doc(aliasKey(alias.kind, alias.value))
  }));

  let matchedBy: TravelerIdentity['matchedBy'] = 'new';
  let canonicalId = '';

  await db.runTransaction(async (tx: any) => {
    const snapshots = await Promise.all(aliasRefs.map(alias => tx.get(alias.ref)));
    for (let i = 0; i < snapshots.length; i++) {
      if (snapshots[i].exists && snapshots[i].data()?.canonicalId) {
        canonicalId = String(snapshots[i].data().canonicalId);
        matchedBy = aliasRefs[i].kind;
        break;
      }
    }

    if (!canonicalId && fallbackSession) {
      const sessionRef = db.collection('traveler_identity_aliases').doc(aliasKey('email', `session:${fallbackSession}`));
      const sessionSnapshot = await tx.get(sessionRef);
      if (sessionSnapshot.exists && sessionSnapshot.data()?.canonicalId) {
        canonicalId = String(sessionSnapshot.data().canonicalId);
        matchedBy = 'session';
        aliasRefs.push({ kind: 'email', value: `session:${fallbackSession}`, ref: sessionRef });
      }
    }

    if (!canonicalId) canonicalId = newCanonicalId();

    const now = new Date().toISOString();
    const canonicalRef = db.collection('traveler_identities').doc(canonicalId);
    tx.set(canonicalRef, {
      canonicalId,
      name: input.name || null,
      phone: phone || null,
      email: email || null,
      lastChannel: input.channel || null,
      lastSeenAt: now,
      updatedAt: now
    }, { merge: true });

    for (const alias of aliasRefs) {
      tx.set(alias.ref, {
        canonicalId,
        kind: alias.kind,
        updatedAt: now
      }, { merge: true });
    }
  });

  return {
    canonicalId,
    sessionId: canonicalId,
    matchedBy
  };
}
