import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('src/components/ErrorBoundary.tsx', 'utf8');

test('the global error screen keeps technical exception details out of the customer UI', () => {
  assert.match(source, /componentDidCatch\(error:\s*Error,\s*errorInfo:\s*ErrorInfo\)[\s\S]*?console\.error/);
  assert.doesNotMatch(source, /this\.state\.error(?:\.message)?/);
  assert.doesNotMatch(source, /Failed to fetch dynamically imported module/);
});

test('the global error screen offers accessible bilingual recovery actions', () => {
  assert.match(source, /role="alert"/);
  assert.match(source, /aria-live="assertive"/);
  assert.match(source, /No pudimos mostrar esta sección/);
  assert.match(source, /We couldn’t load this section/);
  assert.match(source, /aria-label="Recargar página \/ Reload page"/);
  assert.match(source, /aria-label="Ir al inicio \/ Go home"/);
  assert.match(source, /window\.location\.reload\(\)/);
  assert.match(source, /window\.location\.assign\('\/'\)/);
});

