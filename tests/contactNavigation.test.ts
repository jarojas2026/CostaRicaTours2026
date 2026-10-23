import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { whatsappInquiryUrl } from '../src/utils/directWhatsApp';
import { translate } from '../src/i18n';

test('public shell has no floating contact widgets; quote and AI routes remain', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.doesNotMatch(app, /DigitalCounterWidget|FloatingWhatsApp|whatsappMessage/);
  assert.match(app, /<CustomFunnelModal/);
  assert.match(app, /<AIAssistant/);
  assert.match(app, /<BottomNav/);
  assert.match(app, /<AdminDashboard/);
});

test('explicit WhatsApp help uses plain, safe links instead of an AI intake action', () => {
  for (const file of ['src/components/Footer.tsx', 'src/pages/TourDetailPage.tsx']) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /requestCustomerIntake|requestTourAssistance/);
    assert.match(source, /whatsappInquiryUrl\(/);
    assert.match(source, /target="_blank"/);
    assert.match(source, /rel="noopener noreferrer"/);
    assert.match(source, /aria-describedby=/);
  }
  const header = readFileSync('src/components/Header.tsx', 'utf8');
  assert.match(header, /href=\{whatsappInquiryUrl\(/);
  assert.doesNotMatch(header, /Consulta por IA → WhatsApp|AI inquiry → WhatsApp/);
});

for (const language of ['es', 'en'] as const) {
  test(`WhatsApp draft is encoded, truthful and localized (${language})`, () => {
    const message = '  Café & bosque: ¿2 adultos? + niño #1\nArenal / playa  ';
    const url = new URL(whatsappInquiryUrl(message, language));
    assert.equal(url.origin, 'https://wa.me');
    assert.deepEqual([...url.searchParams.keys()], ['text']);
    assert.equal(url.hash, '');
    assert.ok(url.searchParams.get('text')!.startsWith(message.trim() + '\n\n'));
    assert.match(url.searchParams.get('text')!, language === 'es' ? /no confirma disponibilidad ni reserva/ : /does not confirm availability or a booking/);
    assert.equal(translate(language, 'footer.contactWhatsapp'), language === 'es' ? 'Consultar por WhatsApp' : 'Ask on WhatsApp');
    assert.match(translate(language, 'footer.whatsappDraftHint'), language === 'es' ? /Tú decides/ : /You decide/);
  });
}
