import assert from 'node:assert/strict';
import test from 'node:test';
import type { Firestore } from 'firebase-admin/firestore';
import { prepareCityApplication, submitCityApplication, triageCityApplication, resubmitCityApplication, withdrawCityApplication } from '../backend/digitalCityApplicationService';

function fakeFirestore() {
  const store = new Map<string, any>();
  let generated = 0;
  const database = {
    collection(name: string) {
      return { doc(id?: string) { return { key: name + '/' + (id ?? 'auto_' + (++generated)) }; } };
    },
    async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
      const pending: Array<() => void> = [];
      const tx = {
        async get(ref: { key: string }) {
          const value = store.get(ref.key);
          return { exists: value !== undefined, data: () => value };
        },
        create(ref: { key: string }, value: unknown) {
          pending.push(() => { if (store.has(ref.key)) throw new Error('Already exists'); store.set(ref.key, value); });
        },
        set(ref: { key: string }, value: unknown) { pending.push(() => store.set(ref.key, value)); },
        update(ref: { key: string }, value: any) { pending.push(() => store.set(ref.key, { ...store.get(ref.key), ...value })); }
      };
      const result = await fn(tx);
      for (const write of pending) write();
      return result;
    }
  };
  return { database: database as unknown as Firestore, store };
}
const valid = {
  kind: 'microbusiness', countryCode: 'CR', locality: 'Pérez Zeledón', displayName: 'Finca rural',
  representsEntity: true, consentToPublication: true,
  applicantUid: 'forged', status: 'bookable', paymentEnabled: true
};

test('validated applicant is private and cannot inject owner, payment or publication permissions', () => {
  const record = prepareCityApplication(valid, 'firebase_user_123', new Date('2026-10-11T12:00:00Z'));
  assert.equal(record.applicantUid, 'firebase_user_123');
  assert.equal(record.status, 'submitted');
  assert.equal(record.bookable, false);
  assert.equal(record.publishable, false);
  assert.equal(record.paymentEnabled, false);
  assert.equal((record as any).email, undefined);
});

test('consent and entity representation are required before storing', async () => {
  const { database } = fakeFirestore();
  await assert.rejects(submitCityApplication({ ...valid, consentToPublication: false }, 'uid', database), /Complete los requisitos/);
  await assert.rejects(submitCityApplication({ ...valid, representsEntity: false }, 'uid', database), /Complete los requisitos/);
});

test('duplicate submissions reuse the same private ID and do not consume daily quota', async () => {
  const { database, store } = fakeFirestore();
  const first = await submitCityApplication(valid, 'uidA', database);
  const second = await submitCityApplication(valid, 'uidA', database);
  assert.equal(first.idempotent, false);
  assert.equal(second.idempotent, true);
  assert.equal(second.application.id, first.application.id);
  assert.equal(store.size, 2); // one application, one daily quota
  const someoneElse = await submitCityApplication(valid, 'uidB', database);
  assert.notEqual(someoneElse.application.id, first.application.id);
});

test('at most three distinct applications per UID per day', async () => {
  const { database } = fakeFirestore();
  for (let n = 0; n < 3; n++) {
    const answer = await submitCityApplication({ ...valid, displayName: 'Finca ' + n }, 'account123', database);
    assert.equal(answer.application.status, 'submitted');
  }
  await assert.rejects(
    submitCityApplication({ ...valid, displayName: 'Fourth finca' }, 'account123', database),
    (err: any) => err.code === 'rate_limited'
  );
});

test('moderation can only record non-publishing transitions and a justification', async () => {
  const { database, store } = fakeFirestore();
  const created = await submitCityApplication(valid, 'applicant_one', database);
  await assert.rejects(triageCityApplication(created.application.id, 'admin_uid', 'published' as any, 'Do not publish', database),
    (err: any) => err.code === 'invalid_transition');
  await assert.rejects(triageCityApplication(created.application.id, 'admin_uid', 'under_review', 'short', database),
    (err: any) => err.code === 'invalid_application');
  const result = await triageCityApplication(created.application.id, 'admin_uid', 'under_review', 'Validación documental pendiente', database);
  assert.equal(result.status, 'under_review');
  const stored = store.get('digital_city_applications/' + created.application.id);
  assert.equal(stored.bookable, false);
  assert.equal(stored.publishable, false);
  assert.equal(stored.status, 'under_review');
  assert.ok([...store.keys()].some(k => k.startsWith('digital_city_application_audit/')));
  await assert.rejects(triageCityApplication(created.application.id, 'admin_uid', 'under_review', 'Revisión repetida de expediente', database),
    (err: any) => err.code === 'invalid_transition');
});


test('applicant resubmission checks owner, revision, immutable entity and stays private', async () => {
  const { database, store } = fakeFirestore();
  const initial = await submitCityApplication(valid, 'accountA', database);
  const id = initial.application.id;
  await triageCityApplication(id, 'adminA', 'needs_information', 'Completar ubicación de la finca', database);
  await assert.rejects(resubmitCityApplication(id, 'accountB', valid, 2, database),
    (err: any) => err.code === 'not_found');
  await assert.rejects(resubmitCityApplication(id, 'accountA', valid, 1, database),
    (err: any) => err.code === 'invalid_transition');
  await assert.rejects(resubmitCityApplication(id, 'accountA', { ...valid, kind: 'company' }, 2, database),
    (err: any) => err.code === 'invalid_application');
  await assert.rejects(resubmitCityApplication(id, 'accountA', { ...valid, consentToPublication: false }, 2, database),
    (err: any) => err.code === 'invalid_application');
  const resubmitted = await resubmitCityApplication(id, 'accountA', {
    ...valid, displayName: 'Finca Corregida', locality: 'San Isidro de El General'
  }, 2, database);
  assert.equal(resubmitted.status, 'submitted');
  assert.equal(resubmitted.revision, 3);
  const updated = store.get('digital_city_applications/' + id);
  assert.equal(updated.id, id);
  assert.equal(updated.displayName, 'Finca Corregida');
  assert.equal(updated.createdAt, initial.application.createdAt);
  assert.equal(updated.bookable, false);
  assert.equal(updated.paymentEnabled, false);
  assert.equal(updated.moderationReason, null);
  await assert.rejects(resubmitCityApplication(id, 'accountA', valid, 3, database),
    (err: any) => err.code === 'invalid_transition');
});

test('withdrawal clears descriptive data, remains non-public and blocks replay', async () => {
  const { database, store } = fakeFirestore();
  const created = await submitCityApplication({
    ...valid, officialSourceUrl: 'https://example.org/farm'
  }, 'owner123', database);
  const id = created.application.id;
  await assert.rejects(withdrawCityApplication(id, 'intruder', 1, database),
    (err: any) => err.code === 'not_found');
  await assert.rejects(withdrawCityApplication(id, 'owner123', 2, database),
    (err: any) => err.code === 'invalid_transition');
  const result = await withdrawCityApplication(id, 'owner123', 1, database);
  assert.equal(result.status, 'withdrawn');
  assert.equal(result.idempotent, false);
  const stored = store.get('digital_city_applications/' + id);
  assert.equal(stored.status, 'withdrawn');
  assert.equal(stored.displayName, '');
  assert.equal(stored.locality, '');
  assert.equal(stored.officialSourceUrl, '');
  assert.equal(stored.moderationReason, null);
  assert.equal(stored.publicationConsentDeclared, false);
  assert.equal(stored.revision, 2);
  assert.equal(stored.bookable, false);
  assert.equal(stored.paymentEnabled, false);
  const audit = [...store.entries()].filter(([key]) => key.startsWith('digital_city_application_audit/'));
  assert.equal(audit.length, 1);
  assert.equal(audit[0][1].action, 'applicant_withdrew');
  assert.equal(audit[0][1].displayName, undefined);
  const again = await withdrawCityApplication(id, 'owner123', 2, database);
  assert.equal(again.idempotent, true);
  await assert.rejects(submitCityApplication({ ...valid, officialSourceUrl: 'https://example.org/farm' }, 'owner123', database),
    (err: any) => err.code === 'invalid_transition');
});

test('outdated applicant correction cannot undo new administrator decision', async () => {
  const { database } = fakeFirestore();
  const { application } = await submitCityApplication(valid, 'ownerA', database);
  await triageCityApplication(application.id, 'admin', 'under_review', 'Comprobando representación comercial', database);
  await triageCityApplication(application.id, 'admin', 'needs_information', 'Actualizar datos de la propiedad', database);
  await assert.rejects(resubmitCityApplication(application.id, 'ownerA', valid, 2, database),
    (err: any) => err.code === 'invalid_transition');
  const result = await resubmitCityApplication(application.id, 'ownerA', valid, 3, database);
  assert.equal(result.revision, 4);
});
