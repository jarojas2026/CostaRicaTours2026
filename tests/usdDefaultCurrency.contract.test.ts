import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const detect = readFileSync('src/i18n/detect.ts', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const money = readFileSync('src/utils/money.ts', 'utf8');
const header = readFileSync('src/components/Header.tsx', 'utf8');

test('first visit defaults to USD while explicit saved currency remains supported', () => {
  assert.match(detect, /return readStoredCurrency\(\) \?\? 'USD'/);
});

test('unsupported saved currency is reset to USD after live rates resolve', () => {
  assert.match(app, /availableCurrencies\(snapshot \|\| getRatesSnapshot\(\)\)/);
  assert.match(app, /if \(!supported\.includes\(currency\)\)/);
  assert.match(app, /setCurrencyState\('USD'\)/);
  assert.match(app, /rememberCurrency\('USD'\)/);
});

test('CRC is available only with a valid source-backed exchange rate', () => {
  assert.match(money, /availableCurrencies\(snapshot: RatesSnapshot\)/);
  assert.match(money, /hasRate\(c, snapshot\)/);
  assert.match(money, /if \(!snapshot\.sources\?\./);
});

test('currency selector shows unavailable currencies disabled and reflects selected currency', () => {
  assert.match(header, /value=\{currency\}/);
  assert.match(header, /disabled=\{!availableCurrencyList\.includes\(item\)\}/);
  assert.match(header, /\{language\.toUpperCase\(\)\} · \{currency\}/);
});
