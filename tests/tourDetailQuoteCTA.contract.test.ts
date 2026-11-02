import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/pages/TourDetailPage.tsx', 'utf8');
const publication = readFileSync('src/utils/tourPublication.ts', 'utf8');
const catalog = readFileSync('src/data/toursCatalog.ts', 'utf8');

test('tour detail CTA distinguishes quote-only tours from bookable tours', () => {
  assert.match(page, /isBookable\s*\?\s*\(language === 'es' \? 'Cotizar \/ Reservar'/);
  assert.match(page, /'Solicitar cotización' : 'Request a quote'/);
  assert.match(page, /onClick=\{openQuoteForm\}/);
  assert.match(page, /TourQuoteRequestForm tourId=\{tour\.id\}/);
});

test('price and availability disclaimer is visible before payment', () => {
  assert.match(page, /Final price and availability are confirmed with the provider before any payment/);
  assert.match(page, /precio final y la disponibilidad se confirman con el proveedor antes de cualquier pago/);
});

test('Poás US$125 remains explicitly an unverified working reference, not a published price', () => {
  assert.match(catalog, /id: 'poas-volcano-coffee-waterfall'/);
  assert.match(page, /Requested working reference: US\$125; pending operator verification/);
  assert.match(page, /Referencia de trabajo solicitada: US\$125; pendiente de verificación del operador/);
  assert.match(publication, /tour\.priceSource === 'precio_referencia'/);
  assert.match(publication, /priceCheckedAt/);
});

test('quote disclaimer wraps on wider layouts instead of squeezing the CTA row', () => {
  assert.match(page, /sm:flex-row sm:flex-wrap sm:items-center sm:justify-between/);
  assert.match(page, /basis-full text-xs leading-relaxed text-stone-400/);
});
