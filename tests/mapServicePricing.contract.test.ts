import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { PRICE_ON_REQUEST, REFERENCE_PRICE_NOTE, estimateMapServiceTotalUSD, getMapServiceUnitPriceUSD } from '../src/utils/mapServicePricing.ts';

// Nunca un precio inventado: sin tarifa real → "Precio a consultar" y sin total.

test('hotel without a real nightly price is price-on-request with no total', () => {
  for (const pricePerNightUSD of [undefined, 0, -5, Number.NaN]) {
    const hotel = { type: 'hotel', pricePerNightUSD } as any;
    assert.equal(getMapServiceUnitPriceUSD(hotel), null);
    assert.equal(estimateMapServiceTotalUSD(hotel, { checkIn: '2027-01-10', checkOut: '2027-01-12', adults: 2, children: 0 }), null);
  }
});

test('hotel with a real nightly price multiplies by nights', () => {
  const hotel = { type: 'hotel', pricePerNightUSD: 200 } as any;
  assert.equal(estimateMapServiceTotalUSD(hotel, { checkIn: '2027-01-10', checkOut: '2027-01-13', adults: 2, children: 0 }), 600);
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
