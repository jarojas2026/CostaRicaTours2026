import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const engine = readFileSync('backend/nativeAutomationEngine.ts', 'utf8');
const admin = readFileSync('backend/adminControlCenterService.ts', 'utf8');
const page = readFileSync('src/pages/AdminControlCenterPage.tsx', 'utf8');

test('native engine health never invents global 24 workflows or healthy defaults', () => {
  assert.match(engine, /activeWorkflows: null/);
  assert.match(engine, /successRate: metrics\.successRate/);
  assert.match(engine, /averageLatencyMs: null/);
  assert.match(engine, /source: 'single_process_memory'/);
  assert.doesNotMatch(engine, /activeWorkflows:\s*24/);
  assert.doesNotMatch(engine, /successRate:[\s\S]{0,200}:\s*100,/);
});

test('admin service separates confirmed booking value from collections', () => {
  assert.match(admin, /confirmedBookingValueUSD:revenue/);
  assert.match(admin, /revenueUSD:null/);
  assert.match(admin, /verifiedCollectionsUSD:null/);
});

test('admin UI displays unknown values as em dash without replacing them with zero', () => {
  assert.match(page, /Cobros conciliados \(USD\)/);
  assert.match(page, /confirmedBookingValueUSD/);
  assert.match(page, /auto\.engine\?\.successRate == null \? '—'/);
  assert.match(page, /activeWorkflows \?\? '—'/);
  assert.doesNotMatch(page, /auto\.engine\?\.successRate \|\| 0/);
});
