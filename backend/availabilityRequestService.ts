import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreDb, getOperatorById } from './bookingService';

export type AvailabilityRequestStatus =
  | 'provider_pending'
  | 'available'
  | 'unavailable'
  | 'alternative_offered'
  | 'expired'
  | 'cancelled';

export interface AvailabilityRequestInput {
  tourId: string;
  providerId: string;
  date: string;
  time?: string;
  adults: number;
  children?: number;
  hotel?: string;
  pickupLocation?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  language?: 'es' | 'en';
  source?: 'web' | 'whatsapp' | 'voice' | 'counter' | 'admin';
  sessionId?: string;
}

export interface ProviderAvailabilityResponse {
  available: boolean;
  remainingSeats?: number;
  alternativeDate?: string;
  alternativeTime?: string;
  providerNetPriceUsd?: number;
  note?: string;
  responseChannel?: 'portal' | 'email' | 'whatsapp' | 'api' | 'admin';
}

function validateIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function normalizeInput(input: AvailabilityRequestInput): AvailabilityRequestInput {
  const adults = Number(input.adults);
  const children = Number(input.children || 0);
  if (!input.tourId?.trim()) throw new Error('tourId es obligatorio.');
  if (!input.providerId?.trim()) throw new Error('providerId es obligatorio.');
  if (!validateIsoDate(input.date)) throw new Error('date debe usar YYYY-MM-DD.');
  if (!Number.isInteger(adults) || adults < 1) throw new Error('Debe existir al menos un adulto.');
  if (!Number.isInteger(children) || children < 0) throw new Error('children inválido.');
  if (adults + children > 50) throw new Error('La solicitud supera el máximo de 50 pasajeros.');
  return {
    ...input,
    tourId: input.tourId.trim(),
    providerId: input.providerId.trim(),
    adults,
    children,
    time: input.time?.trim() || undefined,
    hotel: input.hotel?.trim() || undefined,
    pickupLocation: input.pickupLocation?.trim() || undefined,
    customerName: input.customerName?.trim() || undefined,
    customerEmail: input.customerEmail?.trim().toLowerCase() || undefined,
    customerPhone: input.customerPhone?.trim() || undefined,
    language: input.language === 'en' ? 'en' : 'es',
    source: input.source || 'web'
  };
}

function requestFingerprint(input: AvailabilityRequestInput): string {
  return crypto.createHash('sha256').update(JSON.stringify({
    tourId: input.tourId,
    providerId: input.providerId,
    date: input.date,
    time: input.time || '',
    adults: input.adults,
    children: input.children || 0,
    sessionId: input.sessionId || '',
    customerEmail: input.customerEmail || '',
    customerPhone: input.customerPhone || ''
  })).digest('hex');
}

/**
 * Creates a durable provider-backed availability inquiry.
 * This does NOT claim that inventory is available. Only a provider response or
 * a trusted provider API may move the request to `available`.
 */
export async function createAvailabilityRequest(raw: AvailabilityRequestInput) {
  const input = normalizeInput(raw);
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no está disponible; no se puede crear una consulta verificable.');

  const provider = await getOperatorById(input.providerId);
  if (!provider.verified || !provider.active) {
    throw new Error('El proveedor no está verificado o activo para recibir consultas.');
  }

  const fingerprint = requestFingerprint(input);
  const deterministicId = `avr_${fingerprint.slice(0, 28)}`;
  const ref = db.collection('availability_requests').doc(deterministicId);
  const existing = await ref.get();
  if (existing.exists) return { id: ref.id, deduplicated: true, ...existing.data() };

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const payload = {
    ...input,
    fingerprint,
    status: 'provider_pending' as AvailabilityRequestStatus,
    requestedSeats: input.adults + Number(input.children || 0),
    providerSnapshot: {
      id: provider.id,
      name: provider.name,
      phone: provider.phone || '',
      verified: provider.verified
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    expiresAt,
    audit: [{ type: 'availability_requested', at: new Date().toISOString(), source: input.source }]
  };

  await ref.create(payload);
  return { id: ref.id, deduplicated: false, ...payload };
}

/** Provider/admin/API acknowledgement. The state is persisted atomically. */
export async function recordProviderAvailabilityResponse(
  requestId: string,
  response: ProviderAvailabilityResponse,
  actor: { providerId: string; actorId?: string }
) {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no está disponible.');
  if (!requestId?.trim()) throw new Error('requestId es obligatorio.');

  const ref = db.collection('availability_requests').doc(requestId.trim());
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('Consulta de disponibilidad inexistente.');
    const current = snap.data() || {};
    if (current.providerId !== actor.providerId) throw new Error('El proveedor no corresponde a esta consulta.');
    if (['cancelled', 'expired'].includes(String(current.status))) throw new Error('La consulta ya no está activa.');

    let status: AvailabilityRequestStatus = response.available ? 'available' : 'unavailable';
    if (!response.available && (response.alternativeDate || response.alternativeTime)) status = 'alternative_offered';
    const remainingSeats = response.remainingSeats == null ? null : Math.max(0, Number(response.remainingSeats));
    if (response.available && remainingSeats != null && remainingSeats < Number(current.requestedSeats || 1)) {
      status = response.alternativeDate || response.alternativeTime ? 'alternative_offered' : 'unavailable';
    }

    const event = {
      type: 'provider_availability_response',
      at: new Date().toISOString(),
      providerId: actor.providerId,
      actorId: actor.actorId || actor.providerId,
      status,
      channel: response.responseChannel || 'portal'
    };

    tx.update(ref, {
      status,
      providerResponse: {
        ...response,
        remainingSeats,
        receivedAt: new Date().toISOString()
      },
      updatedAt: FieldValue.serverTimestamp(),
      audit: FieldValue.arrayUnion(event)
    });

    return { id: ref.id, status, requestedSeats: current.requestedSeats, ...response, remainingSeats };
  });
}
