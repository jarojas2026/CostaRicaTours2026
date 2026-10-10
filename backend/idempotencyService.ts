import crypto from 'crypto';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record).sort().map((key) => [key, canonicalize(record[key])])
    );
  }
  return value;
}

export function normalizeIdempotencyKey(raw: unknown): string | null {
  const key = String(raw || '').trim();
  if (!key) return null;
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(key)) throw new Error('Idempotency-Key inválida');
  return key;
}

/**
 * Fingerprint the complete JSON-like request payload deterministically.
 * Sort object keys recursively (not just at the root), while preserving array order.
 */
export function requestFingerprint(payload: unknown): string {
  const canonicalPayload = JSON.stringify(canonicalize(payload));
  return crypto.createHash('sha256').update(canonicalPayload ?? 'undefined').digest('hex');
}

export async function getIdempotentResult(key: string) {
  const { getFirestoreDb } = await import('./bookingService');
  const db = getFirestoreDb();
  if (!db) return null;
  const doc = await db.collection('idempotency_keys').doc(crypto.createHash('sha256').update(key).digest('hex')).get();
  if (!doc.exists) return null;
  return doc.data() || null;
}

export function idempotencyDocId(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
