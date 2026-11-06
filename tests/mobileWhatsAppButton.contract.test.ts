import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const app = readFileSync('src/App.tsx', 'utf8');
const source = readFileSync('src/components/MobileWhatsAppButton.tsx', 'utf8');

test('mobile WhatsApp button is mounted in the app layout, outside tour detail and /ai', () => {
  assert.match(app, /import \{ MobileWhatsAppButton \} from '\.\/components\/MobileWhatsAppButton'/);
  assert.match(app, /!location\.pathname\.startsWith\('\/tour\/'\) && location\.pathname !== '\/ai' && <MobileWhatsAppButton language=\{language\} \/>/);
});

test('mobile WhatsApp button is mobile-only, sits above the BottomNav and only opens a wa.me draft', async () => {
  assert.match(source, /sm:hidden fixed/);
  assert.match(source, /bottom-\[calc\(5\.25rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.doesNotMatch(source, /fetch\(|customer-intake|stripe/i);
  const { MobileWhatsAppButton } = await import('../src/components/MobileWhatsAppButton');
  const es = renderToStaticMarkup(React.createElement(MobileWhatsAppButton, { language: 'es' }));
  assert.match(es, /href="https:\/\/wa\.me\/50687959148\?text=/);
  assert.match(es, /aria-label="Escribir por WhatsApp"/);
  assert.match(decodeURIComponent(es.match(/text=([^"]+)/)![1]), /no confirma/);
  const en = renderToStaticMarkup(React.createElement(MobileWhatsAppButton, { language: 'en' }));
  assert.match(en, /aria-label="Chat on WhatsApp"/);
});
