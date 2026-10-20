import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { PRICE_ON_REQUEST, REFERENCE_PRICE_NOTE, estimateMapServiceTotalUSD, getMapServiceUnitPriceUSD, hasVerifiablePriceSource } from '../src/utils/mapServicePricing.ts';
import { MAP_TOURISM_SERVICES } from '../src/data/mapServicesData.ts';

// Nunca un precio inventado: sin tarifa real → "Precio a consultar" y sin total.

test('hotel without a real nightly price is price-on-request with no total', () => {
  for (const pricePerNightUSD of [undefined, 0, -5, Number.NaN]) {
    const hotel = { type: 'hotel', pricePerNightUSD } as any;
    assert.equal(getMapServiceUnitPriceUSD(hotel), null);
    assert.equal(estimateMapServiceTotalUSD(hotel, { checkIn: '2027-01-10', checkOut: '2027-01-12', adults: 2, children: 0 }), null);
  }
});

test('hotel with a real nightly price multiplies by nights', () => {
  const hotel = { type: 'hotel', pricePerNightUSD: 200, priceSource: { url: 'https://example.org/tarifas', checkedAt: '2026-10-19' } } as any;
  assert.equal(estimateMapServiceTotalUSD(hotel, { checkIn: '2027-01-10', checkOut: '2027-01-13', adults: 2, children: 0 }), 600);
});

test('a price without a verifiable source (https url + review date) is price-on-request', () => {
  for (const priceSource of [undefined, { url: '', checkedAt: '2026-10-19' }, { url: 'http://x.org', checkedAt: '2026-10-19' }, { url: 'https://x.org', checkedAt: '' }]) {
    assert.equal(getMapServiceUnitPriceUSD({ type: 'hotel', pricePerNightUSD: 550, priceSource } as any), null);
    assert.equal(getMapServiceUnitPriceUSD({ type: 'national_park', officialPriceUSD: 18, priceSource } as any), null);
  }
});

test('map data: no fixed price reappears without a source (fields or inline $/₡ amounts)', () => {
  const PRICE_FIELDS = ['pricePerNightUSD', 'pricePerNightCRC', 'officialPriceUSD', 'officialPriceCRC', 'averageTicketUSD', 'averageTicketCRC'] as const;
  for (const s of MAP_TOURISM_SERVICES) {
    const priced = PRICE_FIELDS.filter(f => (s as any)[f] !== undefined);
    if (priced.length) assert.ok(hasVerifiablePriceSource(s), `${s.id}: ${priced.join(', ')} sin priceSource verificable`);
    if (!hasVerifiablePriceSource(s)) {
      const text = JSON.stringify(s);
      assert.doesNotMatch(text, /[$₡]\s?\d/, `${s.id}: monto fijo en texto sin fuente`);
    }
  }
  const nayara = MAP_TOURISM_SERVICES.find(s => s.id === 'hotel-nayara-tented');
  assert.ok(nayara);
  assert.equal(getMapServiceUnitPriceUSD(nayara!), null, 'Nayara: Precio a consultar');
  const map = fs.readFileSync(path.join(process.cwd(), 'src/components/InteractiveMap.tsx'), 'utf8');
  assert.doesNotMatch(map, /SINAC \$\$\{|~\$\d/, 'mapa: sin tarifas fijas inventadas');
});

test('transport, trains and shuttles without published fare are price-on-request', () => {
  for (const type of ['bus_station', 'airstrip', 'airport', 'train_station', 'taxi_stand', 'national_park']) {
    assert.equal(estimateMapServiceTotalUSD({ type } as any, { adults: 2, children: 1 }), null, type);
  }
});

test('labels exist in ES and EN', () => {
  assert.equal(PRICE_ON_REQUEST.es, 'Precio a consultar');
  assert.equal(PRICE_ON_REQUEST.en, 'Price on request');
  assert.equal(REFERENCE_PRICE_NOTE.es, 'Precio de referencia, sujeto a confirmación');
});

test('map service panel marks shown prices as reference and offers the request CTA', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/components/InteractiveMap.tsx'), 'utf8');
  assert.match(src, /REFERENCE_PRICE_NOTE/);
  assert.doesNotMatch(src, /'Reservar Estadía en Hotel'|'Book Eco-Lodge Stay'/);
  assert.match(src, /PUBLIC_REQUEST_LABEL/);
});

test('map components carry no invented price fallbacks', () => {
  for (const file of ['src/components/InteractiveMap.tsx', 'src/components/MapServiceBookingModal.tsx']) {
    const src = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    assert.doesNotMatch(src, /(pricePerNightUSD|officialPriceUSD|averageTicketUSD)\s*\|\|\s*\d+/, `${file}: precio inventado`);
    assert.doesNotMatch(src, /calculatedTotalUSD\s*=\s*\d+/, `${file}: total inventado`);
  }
});
