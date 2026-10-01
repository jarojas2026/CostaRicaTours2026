import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { directWhatsAppUrl } from '../src/utils/directWhatsApp';

test('direct WhatsApp preserves the context of 1000 inquiry combinations', () => {
  let combinations = 0;
  for (const profile of ['familia', 'pareja', 'solo', 'grupo', 'accesibilidad']) {
    for (const activity of ['playa', 'bosque nuboso', 'aventura', 'fauna', 'cultura']) {
      for (const travelers of [1, 2, 5, 12]) {
        for (const day of Array.from({ length: 10 }, (_, i) => i + 1)) {
          const message = `Consulta de prueba: ${profile}, ${activity}, ${travelers} personas, ${day}/12/2026. ¿Edades, transporte & disponibilidad? Sin confirmar reserva.`;
          const url = new URL(directWhatsAppUrl(message));
          assert.equal(url.origin, 'https://wa.me');
          assert.equal(url.pathname, '/50687959148');
          assert.equal(url.searchParams.get('text'), message);
          assert.equal([...url.searchParams].length, 1);
          combinations++;
        }
      }
    }
  }
  assert.equal(combinations, 1000);
});

test('support routes do not intercept WhatsApp or report an unverified notification', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  const floating = readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');
  assert.doesNotMatch(app, /handleBusinessWhatsAppClick/);
  assert.doesNotMatch(app, /Ya se registró y notificó al equipo/);
  assert.doesNotMatch(floating, /requestCustomerIntake/);
  assert.match(floating, /window\.open\(directWhatsAppUrl\(contextualMessage\)/);
  assert.match(app, /const handoffUrl = directWhatsAppUrl\(message\)/);
});

test('contact inquiries report delivery only after the customer-intake request resolves', () => {
  const contact = readFileSync('src/components/ContactSection.tsx', 'utf8');
  assert.match(contact, /onResult:\s*result\s*=>\s*setStatus/);
  assert.match(contact, /No se pudo enviar la consulta/);
  assert.match(contact, /required=\{!phone\.trim\(\)\}/);
  assert.match(contact, /required=\{!email\.trim\(\)\}/);
  assert.match(contact, /id="contact-message"[\s\S]*?required/);
});
