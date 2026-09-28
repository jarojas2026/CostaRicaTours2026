import assert from 'node:assert/strict';
import test from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/itinerary/book';

test('generated multi-day itinerary fails closed until quote components are verified', () => {
  let statusCode = 200;
  let payload: any;
  const headers = new Map<string, unknown>();
  const res = {
    setHeader(name: string, value: unknown) { headers.set(name.toLowerCase(), value); },
    status(value: number) { statusCode = value; return this; },
    json(value: unknown) { payload = value; return this; },
  } as unknown as VercelResponse;

  handler({
    method: 'POST',
    body: {
      itineraryTitle: 'Ruta generada',
      daysCount: 7,
      travelers: 2,
      totalUSD: 2310,
      customerName: 'Traveler',
      customerEmail: 'traveler@example.com'
    }
  } as VercelRequest, res);

  assert.equal(statusCode, 409);
  assert.equal(payload.success, false);
  assert.equal(payload.error, 'custom_itinerary_requires_quote');
  assert.equal(payload.nextAction, 'request_quote');
  assert.match(payload.message, /propuesta/i);
  assert.match(payload.message, /verificar precios, cupos y logística/i);
  assert.equal(headers.get('cache-control'), 'no-store, max-age=0');
});
