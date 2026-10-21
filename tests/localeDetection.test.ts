import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { detectLanguage, detectCurrency, detectRegion, regionFromTag } from '../src/i18n/detect';
import { es } from '../src/i18n/messages/es';
import { en } from '../src/i18n/messages/en';
import { translate } from '../src/i18n';

test('language: Spanish browsers get ES, every other language gets EN', () => {
  assert.equal(detectLanguage(['es-CR', 'en']), 'es');
  assert.equal(detectLanguage(['es-419']), 'es');
  assert.equal(detectLanguage(['en-GB']), 'en');
  assert.equal(detectLanguage(['pt-BR']), 'en');
  assert.equal(detectLanguage(['de-DE', 'fr']), 'en');
  assert.equal(detectLanguage(['fr-FR', 'es']), 'es', 'first enabled language in the preference list wins');
  assert.equal(detectLanguage([]), 'en');
});

test('currency: CR→CRC, euro area→EUR, rest→USD', () => {
  assert.equal(detectCurrency(['es-CR'], 'UTC'), 'CRC');
  assert.equal(detectCurrency(['en-US'], 'America/Costa_Rica'), 'CRC', 'Costa Rica time zone wins');
  assert.equal(detectCurrency(['de-DE'], 'Europe/Berlin'), 'EUR');
  assert.equal(detectCurrency(['es-ES'], 'Europe/Madrid'), 'EUR');
  assert.equal(detectCurrency(['en'], 'Europe/Paris'), 'EUR', 'euro time zone when no explicit region');
  assert.equal(detectCurrency(['en-GB'], 'Europe/London'), 'USD');
  assert.equal(detectCurrency(['en-US'], 'America/New_York'), 'USD');
  assert.equal(detectCurrency(['es-419'], 'America/Mexico_City'), 'USD');
  assert.equal(regionFromTag('es-419'), null);
  assert.equal(detectRegion(['zh-Hant-TW'], 'Asia/Taipei'), 'TW');
});

test('ES and EN catalogs have identical keys and placeholders', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
  const vars = (text: string) => (text.match(/\{\w+\}/g) || []).sort();
  for (const key of Object.keys(es) as (keyof typeof es)[]) assert.deepEqual(vars(en[key]), vars(es[key]), key);
});

test('translate interpolates and falls back to the legacy table', () => {
  assert.equal(translate('en', 'toursGrid.countOfTotal', { processedToursLength: 3, toursLength: 9 }), '3 of 9 experiences');
  assert.equal(translate('es', 'myBookings'), 'Reservas');
  assert.equal(translate('en', 'myBookings'), 'Bookings');
});

test('footer, catalog filters and tour cards take every text from i18n', () => {
  for (const file of ['src/components/Footer.tsx', 'src/components/ToursGrid.tsx', 'src/components/TourCard.tsx']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /language === 'es' \?|isEs \?/, file);
  }
});

test('html lang and hreflang alternates are set per route', () => {
  const meta = fs.readFileSync('src/components/RouteMetadata.tsx', 'utf8');
  assert.match(meta, /document\.documentElement\.lang = htmlLang\(language\)/);
  assert.match(meta, /hreflang: 'x-default'/);
  assert.match(fs.readFileSync('index.html', 'utf8'), /hreflang="x-default"/);
});
