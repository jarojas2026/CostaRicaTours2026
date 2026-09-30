import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/FloatingWhatsApp.tsx'), 'utf8');

test('concierge keeps one stable session id across turns', () => {
  assert.match(source, /sessionIdRef\s*=\s*useRef/);
  assert.match(source, /sessionId:\s*sessionIdRef\.current/);
  assert.doesNotMatch(source, /sessionId:\s*`whatsapp-\$\{Date\.now\(\)\}`/);
});

test('availability action opens the selected tour booking surface instead of resending the same prompt', () => {
  assert.match(source, /if \(action === 'availability'\)/);
  assert.match(source, /onSelectTour\(contextTour\)/);
  assert.match(source, /setIsSearchOpen\(true\)/);
  assert.match(source, /sin repetir la misma pregunta/);
});

test('concierge does not fabricate payment-required state when backend returns no booking status', () => {
  assert.doesNotMatch(source, /else setBookingStatus\('payment_required'\)/);
  assert.match(source, /else setBookingStatus\('pending'\)/);
});
