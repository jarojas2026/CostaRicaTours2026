import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const publicInquirySurfaces = [
  'src/components/Header.tsx',
  'src/components/Footer.tsx',
  'src/components/HomeTrustSections.tsx',
  'src/components/FeaturedToursSection.tsx',
  'src/components/RegionalExperienceGuides.tsx',
  'src/components/OperatorsSection.tsx',
  'src/pages/TourDetailPage.tsx',
  'src/components/LocalBusesModal.tsx',
  'src/components/NationalTransportSection.tsx'
];

test('public first-contact entry points do not bypass customer-intake via direct WhatsApp anchors', () => {
  for (const path of publicInquirySurfaces) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /requestCustomerIntake\(/, path + ': use existing AI triage');
    assert.doesNotMatch(source,
      /href\s*=\s*(?:["']https:\/\/wa\.me\/50687959148|\{`https:\/\/wa\.me\/50687959148|\{whatsappInquiryUrl\})/i,
      path + ': direct WhatsApp anchor bypassed AI triage');
  }
});

test('human WhatsApp handoff is still available after AI triage response or failure', () => {
  const source = readFileSync('src/App.tsx', 'utf8');
  assert.match(source, /addEventListener\('customer-intake-request'/);
  assert.match(source, /fetch\('\/api\/customer-intake'/);
  assert.match(source, /setIntakeHandoffUrl\(data\.customer\?\.handoffUrl\)/);
  assert.match(source, /setIntakeHandoffUrl\(handoffUrl\)/);
  assert.match(source, /data-human-handoff="true"/);
});

test('transport quotations carry their context to the AI, not directly to a supplier', () => {
  const source = readFileSync('src/components/NationalTransportSection.tsx', 'utf8');
  const aiCalls = source.match(/requestCustomerIntake\(/g) || [];
  assert.ok(aiCalls.length >= 9, 'eight quotation categories and route-specific quote reach AI');
  assert.doesNotMatch(source, /<a\s+[\s\S]*?href=\{`https:\/\/wa\.me\/50687959148/i);
});
