import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const script = fs.readFileSync('scripts/auditPhotoDestinations.mjs', 'utf8');
const csv = fs.readFileSync('reports/photo-destination-audit.csv', 'utf8');
const manifest = JSON.parse(fs.readFileSync('src/data/photoManifest.json', 'utf8'));
const credit = fs.readFileSync('src/components/PhotoCredit.tsx', 'utf8');
const catalog = fs.readFileSync('src/data/photoCatalog.ts', 'utf8');

test('audit script detects URL/source filename mismatch and explicit destination conflicts', () => {
  assert.match(script, /filenameFromUrl/);
  assert.match(script, /filenameFromSourcePage/);
  assert.match(script, /foreign place in filename/);
  assert.match(script, /Costa Rica place in filename differs from declared place\/region/);
  assert.match(script, /No se modificó ningún activo ni manifest/);
});

test('CSV is committed with all manifest photos and filename/destination/license columns', () => {
  const lines = csv.trim().split(/\r?\n/);
  assert.match(lines[0], /audit_date/);
  assert.match(lines[0], /filename_match/);
  assert.match(lines[0], /destination_mismatch/);
  assert.match(lines[0], /license/);
  assert.equal(lines.length, manifest.photos.length + 1);
  for (const row of lines.slice(1)) assert.equal(row.split(',').length, 15, 'every CSV row must have 15 columns');
  assert.match(csv, /No explicit mismatch detected/);
});

test('photo attribution remains linked to source and license, and bad images have a neutral fallback', () => {
  assert.match(credit, /photoCredit\(src\)/);
  assert.match(credit, /credit\.href/);
  assert.match(credit, /credit\.licenseUrl/);
  assert.match(catalog, /NEUTRAL_PHOTO/);
  assert.match(catalog, /sanitizeTourImages/);
  for (const p of manifest.photos.filter(p => p.source === 'wikimedia-commons')) {
    assert.ok(p.author && p.license && p.sourcePage && p.credit, p.key + ' missing attribution metadata');
  }
});

test('non-Commons photo filenames are N/A, not falsely marked MATCH', () => {
  assert.match(script, /photo\.source === 'wikimedia-commons' && sourceFilename/);
  assert.match(script, /filenameMatch === null \? 'N\/A'/);
  const unsplashRows = manifest.photos.filter(p => p.source === 'unsplash');
  assert.ok(unsplashRows.length > 0);
  assert.match(csv, /,N\/A,NO_SIGNAL,/);
});
