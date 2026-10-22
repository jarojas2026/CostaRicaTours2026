import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isPublicRequestReference, requestFollowUpWhatsAppUrl, OFFICIAL_WHATSAPP_NUMBER } from '../shared/requestConfirmation';
import { leadPublicReference } from '../shared/tourQuoteRequest';

test('referencia pública: solo CRT-XXXXXXXX', () => {
  assert.equal(isPublicRequestReference('CRT-1A2B3C4D'), true);
  assert.equal(isPublicRequestReference(leadPublicReference('lead_034ed090b9b3a10b8d7fa3d8')), true);
  for (const bad of ['crt-1a2b3c4d', 'CRT-', 'CRT-12', 'CRT-1A2B3C4D5E', 'ana@example.com', null, 42]) {
    assert.equal(isPublicRequestReference(bad), false, String(bad));
  }
});

test('deep-link WhatsApp: número oficial, mensaje precargado solo con la referencia', () => {
  const es = requestFollowUpWhatsAppUrl('CRT-1A2B3C4D', 'es')!;
  const url = new URL(es);
  assert.equal(url.origin + url.pathname, `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}`);
  assert.equal(OFFICIAL_WHATSAPP_NUMBER, '50687959148');
  const text = url.searchParams.get('text')!;
  assert.match(text, /CRT-1A2B3C4D/);
  assert.doesNotMatch(text, /@|\+506|operador|proveedor/i);
  assert.match(new URL(requestFollowUpWhatsAppUrl('CRT-1A2B3C4D', 'en')!).searchParams.get('text')!, /^Hi /);
  assert.equal(requestFollowUpWhatsAppUrl('no-ref', 'es'), null);
});

test('formularios: confirmación visible con referencia y enlace opcional (sin envío automático)', () => {
  for (const file of ['src/components/TourQuoteRequestForm.tsx', 'src/components/CustomFunnelModal.tsx']) {
    const src = readFileSync(file, 'utf8');
    assert.match(src, /role="status"/, file);
    assert.match(src, /Número de referencia/, file);
    assert.match(src, /<RequestFollowUpWhatsApp\b/, file);
    assert.doesNotMatch(src, /window\.open\([^)]*wa\.me/, file);
  }
  const link = readFileSync('src/components/RequestFollowUpWhatsApp.tsx', 'utf8');
  assert.match(link, /rel="noopener noreferrer"/);
  assert.doesNotMatch(link, /fixed|useEffect/);
});
