import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { leadPublicReference } from '../shared/tourQuoteRequest.ts';

test('quote request reference is short, public and carries no personal data', () => {
  assert.equal(leadPublicReference('lead_1a2b3c4d5e6f7a8b9c0d1e2f'), 'CRT-1A2B3C4D');
  assert.equal(leadPublicReference(undefined), null);
  assert.equal(leadPublicReference('lead_'), null);
  const route = fs.readFileSync('backend/routes/leads.ts', 'utf8');
  assert.match(route, /reference: leadPublicReference\(lead\.id\)/);
  const form = fs.readFileSync('src/components/TourQuoteRequestForm.tsx', 'utf8');
  assert.match(form, /tour-quote-reference/);
});

test('tour breadcrumb shows the region name, not the raw region id', () => {
  const page = fs.readFileSync('src/pages/TourDetailPage.tsx', 'utf8');
  assert.doesNotMatch(page, /getLangText\(tour\.region,/);
  assert.match(page, /REGIONS\.find\(\(r\) => r\.id === tour\.region\)/);
});

test('arenal-hot-springs hero is an Arenal photo, not the generic spa image', () => {
  const catalog = fs.readFileSync('src/data/toursCatalog.ts', 'utf8');
  assert.doesNotMatch(catalog, /photo-1771223832335/);
  assert.match(catalog, /'arenal-hot-springs': \["https:\/\/images\.unsplash\.com\/photo-1651261932254/);
});
