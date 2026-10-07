import type { Firestore } from 'firebase-admin/firestore';

/** Same collection/identity used by the browser. Never substitute discovery prices. */
export async function resolveCommerceTour(db: Firestore | null, tourId: string) {
  if (!db || !/^[a-zA-Z0-9_-]{1,160}$/.test(tourId)) return null;
  const direct = await db.collection('tours').doc(tourId).get();
  if (direct.exists) {
    const data = direct.data()!;
    if (data.id && data.id !== tourId) return null;
    return { ...data, id: tourId, catalogDocumentId: direct.id };
  }
  const matches = await db.collection('tours').where('id', '==', tourId).limit(2).get();
  if (matches.size !== 1) return null;
  return { ...matches.docs[0].data(), id: tourId, catalogDocumentId: matches.docs[0].id };
}
