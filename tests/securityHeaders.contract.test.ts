/**
 * #383 — Encabezados de seguridad en vercel.json (y en `vite preview`, que usa el E2E).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const rules: Array<{ source: string; headers: Array<{ key: string; value: string }> }> = vercel.headers || [];
const global = rules.find(r => r.source === '/(.*)');
const header = (name: string) => global?.headers.find(h => h.key.toLowerCase() === name.toLowerCase())?.value || '';
const directives = (csp: string) => new Map(csp.split(';').map(p => p.trim()).filter(Boolean).map(p => {
  const [name, ...values] = p.split(/\s+/);
  return [name, values] as const;
}));

test('regla global con CSP, HSTS, nosniff, Referrer-Policy y Permissions-Policy', () => {
  assert.ok(global, 'headers["/(.*)"]');
  assert.match(header('Strict-Transport-Security'), /^max-age=(\d+); includeSubDomains; preload$/);
  assert.ok(Number(header('Strict-Transport-Security').match(/max-age=(\d+)/)![1]) >= 31536000);
  assert.equal(header('X-Content-Type-Options'), 'nosniff');
  assert.equal(header('Referrer-Policy'), 'strict-origin-when-cross-origin');
  const pp = header('Permissions-Policy');
  for (const feature of ['camera=(self)', 'microphone=(self)', 'geolocation=(self)', 'usb=()', 'browsing-topics=()']) assert.ok(pp.includes(feature), feature);
});

test('CSP: base segura y sin comodines peligrosos en scripts', () => {
  const csp = directives(header('Content-Security-Policy'));
  assert.deepEqual(csp.get('default-src'), ["'self'"]);
  assert.deepEqual(csp.get('object-src'), ["'none'"]);
  assert.deepEqual(csp.get('base-uri'), ["'self'"]);
  assert.ok(csp.has('upgrade-insecure-requests'));
  const script = csp.get('script-src') || [];
  assert.ok(script.includes("'self'"));
  for (const bad of ["'unsafe-inline'", "'unsafe-eval'", '*', 'https:', 'http:', 'data:']) assert.ok(!script.includes(bad), `script-src sin ${bad}`);
  for (const d of ['connect-src', 'frame-src', 'form-action']) assert.ok(!(csp.get(d) || []).includes('*'), d);
});

test('CSP compatible con lo que ya usa el sitio', () => {
  const csp = directives(header('Content-Security-Policy'));
  const has = (d: string, v: string) => assert.ok((csp.get(d) || []).includes(v), `${d} ${v}`);
  has('style-src', 'https://fonts.googleapis.com'); has('style-src', 'https://unpkg.com'); has('style-src', "'unsafe-inline'");
  has('font-src', 'https://fonts.gstatic.com');
  has('img-src', 'https:'); has('img-src', 'data:'); has('img-src', 'blob:');
  has('connect-src', "'self'"); has('connect-src', 'https://*.googleapis.com'); has('connect-src', 'https://*.tile.openstreetmap.org'); has('connect-src', 'https://server.arcgisonline.com');
  has('script-src', 'https://apis.google.com'); has('frame-src', 'https://*.firebaseapp.com'); has('frame-src', 'https://maps.google.com');
  has('worker-src', 'blob:');
  for (const host of ['https://checkout.stripe.com', 'https://www.paypal.com']) has('form-action', host);
  // index.html: Leaflet CSS en unpkg y Google Fonts.
  const index = fs.readFileSync('index.html', 'utf8');
  assert.match(index, /https:\/\/unpkg\.com\/leaflet/);
  assert.match(index, /https:\/\/fonts\.googleapis\.com/);
  // Destinos de pago permitidos = los que valida el cliente antes de redirigir.
  const attempt = fs.readFileSync('src/utils/bookingAttempt.ts', 'utf8');
  for (const host of ['checkout.stripe.com', 'www.paypal.com']) assert.ok(attempt.includes(host));
});

test('anti-clickjacking en todo excepto el widget embebible', () => {
  const frame = rules.find(r => /frame-ancestors/.test(r.headers.map(h => h.value).join(' ')));
  assert.ok(frame, 'regla frame-ancestors');
  assert.equal(frame!.headers[0].value, "frame-ancestors 'self'");
  const re = new RegExp(`^${frame!.source}$`);
  for (const p of ['/', '/tours', '/admin', '/tour/x', '/provider/portal']) assert.match(p, re, p);
  for (const p of ['/counter-widget.html', '/counter-widget.js', '/counter']) assert.doesNotMatch(p, re, p);
});

test('vite preview aplica los mismos encabezados (el E2E ejercita la CSP real)', () => {
  const config = fs.readFileSync('vite.config.ts', 'utf8');
  assert.match(config, /preview: \{ headers: previewSecurityHeaders\(\) \}/);
  assert.match(config, /vercel\.json/);
});
