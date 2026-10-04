import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const services = read('src/components/ServicesSection.tsx');
const home = read('src/pages/Home.tsx');
const footer = read('src/components/Footer.tsx');

test('diverse services are reachable from home and connect to existing customer flows', () => {
  assert.match(home, /<ServicesSection/);
  assert.ok(home.includes('setSelectedCategory={setSelectedCategory}'));
  assert.match(home, /onOpenCustomFunnel=/);
  assert.match(services, /requestCustomerIntake\(\{/);
  assert.match(services, /onNavigateTab\('tours'\)/);
  assert.match(services, /onOpenCustomFunnel\(\)/);
  assert.match(services, /source: 'service-inquiry:' \+ service\.id/);
});

test('catalog covers varied travel interests without inventing inventory', () => {
  const serviceIds = [
    'adventure-tours',
    'nature-birding',
    'coffee-gastronomy',
    'rural-community',
    'coastal-marine',
    'wellness-thermal',
    'family-accessible',
    'airport-ground-transport',
    'lodging-stays',
    'custom-multiday',
    'parks-attractions',
    'groups-events',
  ];
  for (const id of serviceIds) assert.ok(services.includes("id: '" + id + "'"), 'missing service: ' + id);

  assert.match(services, /providerVerificationRequired: true/);
  assert.match(services, /availabilityAndPriceMustBeConfirmed: true/);
  assert.match(services, /price, capacity, provider and terms are confirmed before booking or payment/i);
});

test('public footer does not claim that every operator is certified', () => {
  assert.doesNotMatch(footer, /best certified local operators/i);
  assert.match(footer, /credentials/i);
  assert.match(footer, /before booking/i);
});
