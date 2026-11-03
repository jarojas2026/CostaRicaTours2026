import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/App.tsx', 'utf8');
const intakeRoute = readFileSync('backend/routes/intake.ts', 'utf8');
const contact = readFileSync('src/components/ContactSection.tsx', 'utf8');
const funnel = readFileSync('src/components/CustomFunnelModal.tsx', 'utf8');
const planner = readFileSync('src/components/ItineraryPlanner.tsx', 'utf8');
const assistant = readFileSync('src/components/AIAssistant.tsx', 'utf8');

test('customer-intake forwards the customer contact of every form (no global consent filter)', () => {
  const handler = app.slice(app.indexOf('const handleCustomerIntake = async'), app.indexOf("window.addEventListener('customer-intake-request'"));
  assert.match(handler, /body: JSON\.stringify\(\{\s*\.\.\.detail,/);
  assert.doesNotMatch(handler, /delete [a-zA-Z.]*customer|customer: undefined/);
  assert.match(intakeRoute, /customer: req\.body\?\.customer\n/);
  assert.match(contact, /customer:\{name,email,phone\}/);
  assert.match(funnel, /customer: \{\s*name: customerName\.trim\(\)/);
  assert.match(planner, /customer: \{\s*name: customerName\.trim\(\)/);
});

test('lead capture recognises the consent each form actually sends (top-level or context.consent.given)', async () => {
  assert.match(intakeRoute, /consent: hasExplicitIntakeConsent\(req\.body\)/);
  const { hasExplicitIntakeConsent } = await import('../backend/routes/intake');
  assert.equal(hasExplicitIntakeConsent({ consent: true }), true);
  assert.equal(hasExplicitIntakeConsent({ privacyConsent: true }), true);
  assert.equal(hasExplicitIntakeConsent({ consent: { law: 'CR-8968', given: true } }), true);
  assert.equal(hasExplicitIntakeConsent({ context: { consent: { law: 'CR-8968', given: true } } }), true, 'CustomFunnelModal');
  assert.equal(hasExplicitIntakeConsent({ consent: 'true' }), false);
  assert.equal(hasExplicitIntakeConsent({ context: { consent: { given: false } } }), false);
  assert.equal(hasExplicitIntakeConsent({}), false);
  assert.equal(hasExplicitIntakeConsent(undefined), false);
});

test('contact form and AI fallback form send consent only when the customer ticks the box', () => {
  assert.match(contact, /data-testid="contact-consent" checked=\{consent\}/);
  assert.match(contact, /customer:\{name,email,phone\},[\s\S]*?consent,/);
  assert.match(assistant, /data-testid="ai-fallback-consent"/);
  assert.match(assistant, /if \(!message \|\| !name \|\| !email \|\| !fallbackContactConsent\) return;/);
  assert.match(assistant, /customer: \{ name, email \},\n\s*consent: true,/);
});
