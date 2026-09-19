import crypto from 'crypto';
import { getFirestoreDb } from './bookingService';

export function normalizeIdempotencyKey(raw: unknown): string | null {
  const key = String(raw || '').trim();
  if (!key) return null;
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(key)) throw new Error('Idempotency-Key inválida');
  return key;
}

export function requestFingerprint(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload, Object.keys(payload as any || {}).sort())).digest('hex');
}

export async function getIdempotentResult(key: string) {
  const db = getFirestoreDb();
  if (!db) return null;
  const doc = await db.collection('idempotency_keys').doc(crypto.createHash('sha256').update(key).digest('hex')).get();
  if (!doc.exists) return null;
  return doc.data() || null;
}

export function idempotencyDocId(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
