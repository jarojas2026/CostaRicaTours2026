import assert from 'node:assert/strict';
import test from 'node:test';
import { buildJarvisOwnerBrief, JARVIS_TOURISM_ADVISORIES, JARVIS_SOURCE_REGISTRY } from '../backend/jarvisTourismAdvisory';
import { TOURISM_INTELLIGENCE_RULES } from '../backend/tourismIntelligenceEngine';

test('tourism intelligence reuses Jarvis logistics and wildlife advisories', () => {
  assert.ok(JARVIS_TOURISM_ADVISORIES.length >= 10);
  for (const rule of JARVIS_TOURISM_ADVISORIES) {
    assert.ok(TOURISM_INTELLIGENCE_RULES.includes(rule.es));
    assert.ok(rule.es.length > 25 && rule.en.length > 25);
    if (rule.signal === 'verify-live') assert.ok(rule.verification?.length);
  }
  assert.ok(JARVIS_SOURCE_REGISTRY.some(s=>s.id==='sinac'));
  assert.ok(JARVIS_SOURCE_REGISTRY.some(s=>s.id==='mopt'));
});

test('owner brief never treats unverified operations as a booking', () => {
  const brief = buildJarvisOwnerBrief({
    days: 3, regions: ['Guanacaste','Arenal','Monteverde','Manuel Antonio'],
    requestedActivities: ['whale watching','night walks'],
    roadConditionVerified: false, providerConfirmed: false, liveWeatherVerified: false
  }, new Date('2026-10-12T00:00:00Z'));
  assert.equal(brief.status,'advisory-only');
  assert.equal(brief.ownerApprovalRequired,true);
  assert.equal(brief.commercialActionsExecuted,false);
  assert.ok(brief.alerts.length>=4);
  assert.match(brief.alerts.join(' '), /fauna/);
});
