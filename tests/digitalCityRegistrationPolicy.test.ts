import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateDigitalCityRegistration } from '../backend/digitalCityRegistrationPolicy';

test('a Costa Rican microbusiness can request moderation but cannot sell', () => {
  const result = evaluateDigitalCityRegistration({
    kind: 'microbusiness', countryCode: 'cr', displayName: 'Microempresa rural',
    locality: 'Pérez Zeledón', consentToPublication: true, representsEntity: true,
    verified: true, paymentEnabled: true
  });
  assert.equal(result.status, 'ready_for_moderation');
  assert.equal(result.countryCode, 'CR');
  assert.equal(result.publishable, false);
  assert.equal(result.bookable, false);
  assert.equal(result.paymentEnabled, false);
  assert.equal(result.persisted, false);
  assert.deepEqual(result.requirements, []);
});

test('international application stays unverified and private without consent', () => {
  const result = evaluateDigitalCityRegistration({
    kind: 'freelancer', countryCode: 'JP', displayName: 'Independent guide',
    locality: 'Kyoto', consentToPublication: false
  });
  assert.equal(result.status, 'needs_information');
  assert.ok(result.requirements.includes('publication_consent_required'));
  assert.equal(result.bookable, false);
});

test('public place requires an external HTTPS reference but no claim of official representation', () => {
  const noSource = evaluateDigitalCityRegistration({
    kind: 'public_place', countryCode: 'CR', displayName: 'Public park',
    locality: 'San José', consentToPublication: true
  });
  assert.equal(noSource.status, 'needs_information');
  assert.ok(noSource.requirements.includes('public_source_required'));
  const withSource = evaluateDigitalCityRegistration({
    kind: 'public_place', countryCode: 'CR', displayName: 'Public park',
    locality: 'San José', consentToPublication: true, officialSourceUrl: 'https://example.org/public'
  });
  assert.equal(withSource.status, 'ready_for_moderation');
  assert.equal(withSource.paymentEnabled, false);
});

test('missing representation blocks institutional and private listings', () => {
  for (const kind of ['institution', 'association', 'community', 'private_place'] as const) {
    const result = evaluateDigitalCityRegistration({
      kind, countryCode: 'CR', displayName: 'Entidad', locality: 'Cartago', consentToPublication: true
    });
    assert.equal(result.status, 'needs_information');
    assert.ok(result.requirements.includes('representation_evidence_required'));
  }
});

test('malformed requests and invalid URLs fail closed', () => {
  assert.equal(evaluateDigitalCityRegistration(null).status, 'invalid');
  assert.equal(evaluateDigitalCityRegistration({ kind: 'unknown', countryCode: 'CRI' }).status, 'invalid');
  const invalid = evaluateDigitalCityRegistration({
    kind: 'public_place', countryCode: 'CR', displayName: 'A', locality: 'B',
    consentToPublication: true, officialSourceUrl: 'https://admin@example.org/'
  });
  assert.ok(invalid.requirements.includes('public_source_required'));
  assert.equal(invalid.bookable, false);
});
