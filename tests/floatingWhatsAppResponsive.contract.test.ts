import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const floating = readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const contactContract = readFileSync('tests/contactNavigation.test.ts', 'utf8');

test('FloatingWhatsApp component is responsive/mobile-only and remains above mobile safe area', () => {
  assert.match(floating, /data-testid="floating-whatsapp"/);
  assert.match(floating, /sm:hidden/);
  assert.match(floating, /bottom-\[calc\(9rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(floating, /data-testid="floating-whatsapp-launcher"/);
});

test('does not mount a second floating WhatsApp channel in the public shell', () => {
  assert.doesNotMatch(app, /FloatingWhatsApp/);
  assert.match(contactContract, /doesNotMatch\(app, \/DigitalCounterWidget\|FloatingWhatsApp\|whatsappMessage\/\)/);
});
