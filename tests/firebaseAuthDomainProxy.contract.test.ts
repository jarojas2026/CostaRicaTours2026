import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const firebaseSrc = readFileSync(new URL('../src/firebase.ts', import.meta.url), 'utf8');
const FIREBASE_HOST = 'https://gen-lang-client-0782739149.firebaseapp.com';

test('vercel proxies Firebase auth handler paths to the Firebase project', () => {
  const rewrites: Array<{ source: string; destination: string }> = config.rewrites;
  assert.ok(rewrites.some(r => r.source === '/__/auth/:path*' && r.destination === `${FIREBASE_HOST}/__/auth/:path*`));
  assert.ok(rewrites.some(r => r.source === '/__/firebase/:path*' && r.destination === `${FIREBASE_HOST}/__/firebase/:path*`));
});

test('site sends COOP same-origin-allow-popups so signInWithPopup can talk to its popup', () => {
  const all = (config.headers || []).find((h: any) => h.source === '/(.*)');
  assert.ok(all?.headers.some((h: any) => h.key === 'Cross-Origin-Opener-Policy' && h.value === 'same-origin-allow-popups'));
});

test('authDomain uses the site host only where the proxy exists, with a redirect fallback', () => {
  assert.match(firebaseSrc, /PROXIED_AUTH_HOSTS = \['costaricatours2026\.vercel\.app'\]/);
  assert.match(firebaseSrc, /authDomain: resolveAuthDomain\(firebaseConfig\.authDomain\)/);
  assert.match(firebaseSrc, /signInWithRedirect\(auth, googleProvider\)/);
  assert.match(firebaseSrc, /getRedirectResult\(auth\)/);
});
