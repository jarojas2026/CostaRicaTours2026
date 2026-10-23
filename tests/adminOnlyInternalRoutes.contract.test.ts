import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Métricas de conversión y el catálogo de herramientas de agentes son internos:
// solo owner/admin autenticado, nunca públicos.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

test('GET /api/analytics/conversion-report exige requireAdmin', () => {
  assert.match(read('backend/routes/misc.ts'), /\.get\('\/api\/analytics\/conversion-report',\s*requireAdmin,/);
});

test('GET /api/agent/tools/functions exige requireAdmin', () => {
  assert.match(read('backend/routes/agents.ts'), /\.get\('\/api\/agent\/tools\/functions',\s*requireAdmin,/);
});
