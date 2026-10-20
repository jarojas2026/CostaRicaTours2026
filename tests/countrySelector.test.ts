import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { ISO_COUNTRY_CODES, buildCountryOptions, filterCountryOptions, flagEmoji } from '../src/utils/countries';

test('country list holds unique ISO 3166-1 alpha-2 codes', () => {
  assert.ok(ISO_COUNTRY_CODES.length >= 249);
  assert.equal(new Set(ISO_COUNTRY_CODES).size, ISO_COUNTRY_CODES.length);
  for (const code of ISO_COUNTRY_CODES) assert.match(code, /^[A-Z]{2}$/);
});

test('Costa Rica and United States are the first common picks', () => {
  const options = buildCountryOptions('es');
  assert.equal(options[0].code, 'CR');
  assert.equal(options[1].code, 'US');
  assert.equal(new Set(options.map(o => o.code)).size, options.length);
});

test('names are localized and search is accent-insensitive', () => {
  const es = buildCountryOptions('es');
  const en = buildCountryOptions('en');
  assert.equal(en.find(o => o.code === 'DE')?.name, 'Germany');
  assert.equal(es.find(o => o.code === 'DE')?.name, 'Alemania');
  assert.equal(filterCountryOptions(es, 'mexico')[0].code, 'MX');
  assert.equal(filterCountryOptions(en, 'costa')[0].code, 'CR');
  assert.equal(filterCountryOptions(en, 'us')[0].code, 'US');
  assert.equal(flagEmoji('CR'), '🇨🇷');
});

test('no free-text two-letter country code inputs remain in the frontend', () => {
  for (const file of ['src/components/DigitalCityRegistrationPreflight.tsx', 'src/pages/DigitalCityJoinPage.tsx']) {
    const src = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    assert.match(src, /<CountrySelect/);
    assert.doesNotMatch(src, /setCountryCode\(e\.target\.value\.toUpperCase\(\)\)/);
    assert.doesNotMatch(src, /código de 2 letras|Código del país/);
  }
});
