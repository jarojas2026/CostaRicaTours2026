/**
 * Private application intake for Costa Rica Tours' digital city.
 * Applications are NOT organizations, memberships, public profiles,
 * official affiliations, provider approvals or sales entitlements.
 */
import { createHash } from 'node:crypto';
import { getFirestoreDb } from './bookingService';
import { evaluateDigitalCityRegistration, type DigitalCityEntityKind, type RegistrationPreflightInput } from './digitalCityRegistrationPolicy';

const COLLECTION = 'digital_city_applications';
const QUOTA_COLLECTION = 'digital_city_application_quotas';
const AUDIT_COLLECTION = 'digital_city_application_audit';
const MAX_DAILY_NEW_APPLICATIONS = 3;

export type CityApplicationStatus = 'submitted' | 'under_review' | 'needs_information' | 'rejected';
export type CityApplicationRecord = {
  id: string;
  applicantUid: string;
  kind: DigitalCityEntityKind;
  countryCode: string;
  locality: string;
  displayName: string;
  officialSourceUrl: string;
  representationDeclared: boolean;
  publicationConsentDeclared: true;
  status: CityApplicationStatus;
  createdAt: string;
  updatedAt: string;
  moderationReason: string | null;
  publishable: false;
  bookable: false;
  paymentEnabled: false;
};

export class CityApplicationError extends Error {
  constructor(public code: 'invalid_application' | 'rate_limited' | 'storage_unavailable' | 'not_found' | 'invalid_transition', message: string) {
    super(message);
    this.name = 'CityApplicationError';
  }
}
const hash = (raw: string) => createHash('sha256').update(raw).digest('hex');

export function prepareCityApplication(input: RegistrationPreflightInput, applicantUid: string, now = new Date()): CityApplicationRecord {
  const verification = evaluateDigitalCityRegistration(input);
  if (verification.status !== 'ready_for_moderation' || !verification.kind || !verification.countryCode) {
    throw new CityApplicationError('invalid_application', 'Complete los requisitos de inscripción antes de enviarla.');
  }
  if (typeof applicantUid !== 'string' || !/^[a-zA-Z0-9:_-]{1,128}$/.test(applicantUid)) {
    throw new CityApplicationError('invalid_application', 'Identidad de solicitante inválida.');
  }
  const displayName = String(input.displayName || '').trim();
  const locality = String(input.locality || '').trim();
  const officialSourceUrl = String(input.officialSourceUrl || '').trim();
  const identityKey = JSON.stringify([applicantUid, verification.kind, verification.countryCode, displayName.toLowerCase(), locality.toLowerCase()]);
  const at = now.toISOString();
  return {
    id: 'dca_' + hash(identityKey).slice(0, 40),
    applicantUid,
    kind: verification.kind,
    countryCode: verification.countryCode,
    locality,
    displayName,
    officialSourceUrl,
    representationDeclared: input.representsEntity === true,
    publicationConsentDeclared: true,
    status: 'submitted',
    createdAt: at,
    updatedAt: at,
    moderationReason: null,
    publishable: false,
    bookable: false,
    paymentEnabled: false
  };
}

function requireDb() {
  const db = getFirestoreDb();
  if (!db) throw new CityApplicationError('storage_unavailable', 'No se pudo guardar la solicitud: base de datos no disponible.');
  return db;
}

/** Idempotent by actor + normalized entity identity, quota enforced transactionally. */
export async function submitCityApplication(input: RegistrationPreflightInput, uid: string, database?: NonNullable<ReturnType<typeof getFirestoreDb>>) {
  const db = database ?? requireDb();
  const candidate = prepareCityApplication(input, uid);
  const docRef = db.collection(COLLECTION).doc(candidate.id);
  const day = candidate.createdAt.slice(0, 10);
  const quotaRef = db.collection(QUOTA_COLLECTION).doc(hash(uid + ':' + day));
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(docRef);
    if (existing.exists) {
      const stored = existing.data() as CityApplicationRecord;
      if (stored.applicantUid !== uid) throw new CityApplicationError('invalid_application', 'Expediente no autorizado.');
      return { application: stored, idempotent: true };
    }
    const quota = await tx.get(quotaRef);
    const count = Number(quota.data()?.count ?? 0);
    if (!Number.isSafeInteger(count) || count < 0 || count >= MAX_DAILY_NEW_APPLICATIONS) {
      throw new CityApplicationError('rate_limited', 'Límite diario de solicitudes alcanzado.');
    }
    tx.create(docRef, candidate);
    tx.set(quotaRef, { applicantUid: uid, date: day, count: count + 1, updatedAt: candidate.createdAt });
    return { application: candidate, idempotent: false };
  });
}

export async function listMyCityApplications(uid: string) {
  const db = requireDb();
  const snapshot = await db.collection(COLLECTION).where('applicantUid', '==', uid).limit(30).get();
  return snapshot.docs
    .map(doc => doc.data() as CityApplicationRecord)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);
}

export async function listCityApplicationsForReview() {
  const db = requireDb();
  const results = await Promise.all([
    db.collection(COLLECTION).where('status', '==', 'submitted').limit(30).get(),
    db.collection(COLLECTION).where('status', '==', 'under_review').limit(30).get()
  ]);
  return results.flatMap(snapshot => snapshot.docs.map(doc => doc.data() as CityApplicationRecord))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 50);
}

const MODERATION_TRANSITIONS: Record<CityApplicationStatus, CityApplicationStatus[]> = {
  submitted: ['under_review', 'needs_information', 'rejected'],
  under_review: ['needs_information', 'rejected'],
  needs_information: [],
  rejected: []
};

/** Human triage only. Never publishes, activates a provider, or grants any permissions. */
export async function triageCityApplication(id: string, actorUid: string, to: CityApplicationStatus, reason: string, database?: NonNullable<ReturnType<typeof getFirestoreDb>>) {
  if (!/^dca_[a-f0-9]{40}$/.test(id)) throw new CityApplicationError('invalid_application', 'Expediente inválido.');
  if (typeof actorUid !== 'string' || !actorUid) throw new CityApplicationError('invalid_application', 'Revisor no autorizado.');
  if (!['under_review', 'needs_information', 'rejected'].includes(to)) {
    throw new CityApplicationError('invalid_transition', 'No se permite aprobar ni publicar desde este proceso.');
  }
  const cleanReason = String(reason || '').trim().slice(0, 601);
  if (cleanReason.length < 10 || cleanReason.length > 600) {
    throw new CityApplicationError('invalid_application', 'Incluya una justificación de 10 a 600 caracteres.');
  }
  const db = database ?? requireDb();
  const ref = db.collection(COLLECTION).doc(id);
  const auditRef = db.collection(AUDIT_COLLECTION).doc();
  return db.runTransaction(async (tx) => {
    const old = await tx.get(ref);
    if (!old.exists) throw new CityApplicationError('not_found', 'Expediente no encontrado.');
    const current = old.data() as CityApplicationRecord;
    if (!MODERATION_TRANSITIONS[current.status]?.includes(to)) {
      throw new CityApplicationError('invalid_transition', 'La transición ya no es válida; actualice el expediente.');
    }
    const now = new Date().toISOString();
    tx.update(ref, { status: to, moderationReason: cleanReason, updatedAt: now });
    tx.create(auditRef, { applicationId: id, from: current.status, to, actorUid, reason: cleanReason, createdAt: now });
    return { id, status: to, updatedAt: now };
  });
}
