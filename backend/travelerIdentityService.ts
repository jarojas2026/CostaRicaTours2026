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
  identityConflict?: boolean;
  conflictingCanonicalIds?: string[];
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
  let identityConflict = false;
  let conflictingCanonicalIds: string[] = [];

  await db.runTransaction(async (tx: any) => {
    const snapshots = await Promise.all(aliasRefs.map(alias => tx.get(alias.ref)));
    const matchedIds = snapshots
      .filter((snapshot: any) => snapshot.exists && snapshot.data()?.canonicalId)
      .map((snapshot: any) => String(snapshot.data().canonicalId));
    conflictingCanonicalIds = [...new Set(matchedIds)];
    identityConflict = conflictingCanonicalIds.length > 1;
    if (!identityConflict && conflictingCanonicalIds.length === 1) {
      canonicalId = conflictingCanonicalIds[0];
      const matchedIndex = snapshots.findIndex((snapshot: any) => snapshot.exists && snapshot.data()?.canonicalId);
      matchedBy = matchedIndex >= 0 ? aliasRefs[matchedIndex].kind : 'new';
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

    if (identityConflict) {
      canonicalId = newCanonicalId();
      matchedBy = 'new';
      const conflictRef = db.collection('traveler_identity_conflicts').doc(crypto.randomBytes(12).toString('hex'));
      tx.set(conflictRef, {
        conflictingCanonicalIds,
        requestedAliases: aliases.map(alias => ({ kind: alias.kind, valueHash: aliasKey(alias.kind, alias.value) })),
        sessionId: fallbackSession || null,
        status: 'needs_verification',
        createdAt: new Date().toISOString()
      });
    } else if (!canonicalId) canonicalId = newCanonicalId();

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

    if (identityConflict) return;

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
    matchedBy,
    ...(identityConflict ? { identityConflict: true, conflictingCanonicalIds } : {})
  };
}
