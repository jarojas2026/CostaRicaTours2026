import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { AFFILIATE_LINK_REL, AFFILIATE_PARTNERS } from '../src/config/affiliatePartners';
import { translate } from '../src/i18n';

const component = readFileSync('src/components/AffiliatePartners.tsx', 'utf8');

test('affiliate links are sponsored, open in a new tab and live in one config file', () => {
  assert.ok(AFFILIATE_LINK_REL.split(' ').includes('sponsored'));
  assert.ok(AFFILIATE_LINK_REL.split(' ').includes('noopener'));
  assert.match(component, /rel=\{AFFILIATE_LINK_REL\}/);
  assert.match(component, /target="_blank"/);
  assert.equal(AFFILIATE_PARTNERS.length, 5);
  for (const p of AFFILIATE_PARTNERS) assert.match(p.url, /^https:\/\/([a-z]+\.)?tpk\.lu\//);
  assert.equal(/<script|dangerouslySetInnerHTML/.test(component), false, 'no third-party scripts');
});

test('affiliate disclosure is shown in ES and EN', () => {
  assert.match(component, /t\('partners\.disclosure'\)/);
  assert.match(translate('es', 'partners.disclosure'), /comisión sin costo extra para vos/);
  assert.match(translate('en', 'partners.disclosure'), /commission at no extra cost/);
  assert.equal(translate('es', 'partners.title'), 'Reservá también con socios');
  assert.equal(translate('en', 'partners.title'), 'Book with partners');
});

test('tours page renders partners section', () => {
  assert.match(readFileSync('src/pages/ToursPage.tsx', 'utf8'), /<AffiliatePartners language=\{language\} \/>/);
});
