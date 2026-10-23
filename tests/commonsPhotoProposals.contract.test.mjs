import test from 'node:test';
import assert from 'node:assert/strict';
import { licenseFamily, toCandidate, stripHtml } from '../scripts/proposeCommonsPhotos.mjs';

test('only free licenses that allow commercial reuse are accepted', () => {
  assert.equal(licenseFamily('CC BY-SA 4.0'), 'CC BY-SA');
  assert.equal(licenseFamily('CC BY 2.0'), 'CC BY');
  assert.equal(licenseFamily('CC0'), 'CC0');
  assert.equal(licenseFamily('Public domain'), 'Public domain');
  assert.equal(licenseFamily('CC BY-NC-SA 2.0'), null);
  assert.equal(licenseFamily('CC BY-ND 4.0'), null);
  assert.equal(licenseFamily('All rights reserved'), null);
  assert.equal(licenseFamily(''), null);
});

test('candidate keeps url, author, license and a visible attribution line', () => {
  const page = {
    title: 'File:Arenal volcano.jpg',
    imageinfo: [{
      url: 'https://upload.wikimedia.org/a.jpg?utm_source=x', thumburl: 'https://upload.wikimedia.org/thumb/a.jpg?utm_source=x',
      descriptionurl: 'https://commons.wikimedia.org/wiki/File:Arenal_volcano.jpg', width: 4000, height: 3000,
      extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<a href="/wiki/User:X">Jane Doe</a>' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' } },
    }],
  };
  const c = toCandidate(page, { id: 'arenal', kind: 'destination' });
  assert.equal(c.author, 'Jane Doe');
  assert.equal(c.imageUrl, 'https://upload.wikimedia.org/a.jpg');
  assert.equal(c.attribution, 'Foto: Jane Doe · CC BY-SA 4.0 · Wikimedia Commons');
  assert.equal(c.status, 'propuesta_sin_revisar');
  const nc = structuredClone(page);
  nc.imageinfo[0].extmetadata.LicenseShortName.value = 'CC BY-NC 2.0';
  assert.equal(toCandidate(nc, { id: 'arenal', kind: 'destination' }), null);
  const small = structuredClone(page);
  small.imageinfo[0].width = 640;
  assert.equal(toCandidate(small, { id: 'arenal', kind: 'destination' }), null);
  assert.equal(stripHtml('<b>A</b> &amp; B'), 'A & B');
});
