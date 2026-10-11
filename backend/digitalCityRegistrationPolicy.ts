/**
 * Digital city global onboarding preflight.
 * Pure, read-only and fail-closed. This is NOT an identity-verification,
 * publication or payment entitlement service.
 */
export const DIGITAL_CITY_ENTITY_KINDS = [
  'individual', 'freelancer', 'microbusiness', 'company', 'community',
  'association', 'institution', 'public_place', 'private_place', 'event_organizer'
] as const;

export type DigitalCityEntityKind = typeof DIGITAL_CITY_ENTITY_KINDS[number];
export type RegistrationPreflightInput = {
  kind?: unknown;
  countryCode?: unknown;
  locality?: unknown;
  displayName?: unknown;
  consentToPublication?: unknown;
  representsEntity?: unknown;
  officialSourceUrl?: unknown;
};
export type RegistrationPreflight = {
  status: 'invalid' | 'needs_information' | 'ready_for_moderation';
  kind: DigitalCityEntityKind | null;
  countryCode: string | null;
  requirements: string[];
  publishable: false;
  bookable: false;
  paymentEnabled: false;
  persisted: false;
  requiresHumanReview: true;
};

const ENTITY_KINDS = new Set<string>(DIGITAL_CITY_ENTITY_KINDS);
const REPRESENTED_KINDS: Set<DigitalCityEntityKind> = new Set([
  'microbusiness', 'company', 'community', 'association',
  'institution', 'private_place', 'event_organizer'
]);
const trim = (value: unknown, max = 160): string =>
  typeof value === 'string' ? value.trim().slice(0, max + 1) : '';

export function evaluateDigitalCityRegistration(input: unknown): RegistrationPreflight {
  const data: RegistrationPreflightInput =
    input && typeof input === 'object' && !Array.isArray(input) ? input as RegistrationPreflightInput : {};
  const kind = typeof data.kind === 'string' && ENTITY_KINDS.has(data.kind)
    ? data.kind as DigitalCityEntityKind : null;
  const countryCode = trim(data.countryCode, 10).toUpperCase();
  const locality = trim(data.locality);
  const displayName = trim(data.displayName);
  const officialSourceUrl = trim(data.officialSourceUrl, 600);
  const requirements: string[] = [];
  const invalid = !kind ||
    !/^[A-Z]{2}$/.test(countryCode) ||
    displayName.length > 160 ||
    locality.length > 160 ||
    officialSourceUrl.length > 600;

  if (!kind) requirements.push('entity_kind_invalid');
  if (!/^[A-Z]{2}$/.test(countryCode)) requirements.push('country_code_invalid');
  // ISO 3166-1 alpha-2 syntax is checked here; country legitimacy is
  // verified during moderation. Never interpret this as government authority.
  if (!displayName || displayName.length > 160) requirements.push('display_name_required');
  if (!locality || locality.length > 160) requirements.push('locality_required');
  if (data.consentToPublication !== true) requirements.push('publication_consent_required');
  if (kind && REPRESENTED_KINDS.has(kind) && data.representsEntity !== true) {
    requirements.push('representation_evidence_required');
  }
  if (kind === 'public_place') {
    if (!/^https:\/\/[^\s@]+$/i.test(officialSourceUrl)) requirements.push('public_source_required');
    // Editorial listing, never official representation or a ticketing entitlement.
  } else if (officialSourceUrl && !/^https:\/\/[^\s@]+$/i.test(officialSourceUrl)) {
    requirements.push('source_url_invalid');
  }
  return {
    status: invalid ? 'invalid' : requirements.length ? 'needs_information' : 'ready_for_moderation',
    kind,
    countryCode: /^[A-Z]{2}$/.test(countryCode) ? countryCode : null,
    requirements,
    publishable: false,
    bookable: false,
    paymentEnabled: false,
    persisted: false,
    requiresHumanReview: true
  };
}
