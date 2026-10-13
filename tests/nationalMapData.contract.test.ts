import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { NATIONAL_POI_GROUPS } from '../src/data/nationalPoiLayers.ts';

// Caja envolvente amplia de Costa Rica (incluye Isla del Coco y el Área Marina Montes Submarinos).
const BBOX = { minLng: -87.6, maxLng: -82.4, minLat: 5.0, maxLat: 11.3 };

for (const group of NATIONAL_POI_GROUPS) {
  test(`map layer ${group.id} is a valid point FeatureCollection inside Costa Rica`, () => {
    const file = path.join(process.cwd(), 'public', group.file);
    assert.ok(fs.existsSync(file), `missing ${group.file}`);
    const fc = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(fc.type, 'FeatureCollection');
    assert.ok(fc.features.length > 0, 'layer is empty');
    const ids = new Set<string>();
    for (const f of fc.features) {
      assert.equal(f.geometry?.type, 'Point');
      const [lng, lat] = f.geometry.coordinates;
      assert.ok(lng >= BBOX.minLng && lng <= BBOX.maxLng && lat >= BBOX.minLat && lat <= BBOX.maxLat, `${f.properties?.id} outside Costa Rica`);
      assert.ok(typeof f.properties?.tipo === 'string' && f.properties.tipo.length > 0, `${f.properties?.id} without tipo`);
      if (f.properties?.id) {
        assert.ok(!ids.has(f.properties.id), `duplicate id ${f.properties.id}`);
        ids.add(f.properties.id);
      }
    }
  });
}

test('official SINAC layer links only to official booking systems', () => {
  const fc = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'mapa', 'parques_sinac.geojson'), 'utf8'));
  for (const f of fc.features) {
    const url: string | undefined = f.properties.reserva;
    if (url) assert.match(url, /^https:\/\/([a-z0-9-]+\.)*(sinac\.go\.cr|acguanacaste\.ac\.cr|isladelcoco\.go\.cr)\//, `unofficial booking url ${url}`);
    assert.doesNotMatch(JSON.stringify(f.properties), /sinac-cr\.com/);
  }
});
