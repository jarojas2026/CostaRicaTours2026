#!/usr/bin/env node
/**
 * Auditoría post-build: falla si el bundle público (dist/, sin el servidor) contiene
 * nombres, dominios o campos de operadores. Uso: node scripts/auditOperatorPrivacy.mjs [dist]
 */
import path from 'node:path';
import { scanPublicTree } from './lib/operatorPrivacyScan.mjs';

const dir = path.resolve(process.argv[2] || 'dist');
// dist/server.cjs es el backend (solo servidor): puede contener el archivo interno.
const findings = scanPublicTree(dir, undefined, { skip: (file) => /server\.cjs(\.map)?$/.test(file) });
if (findings.length) {
  console.error(`✖ El bundle público expone datos de operadores (${findings.length} archivos):`);
  for (const f of findings.slice(0, 40)) console.error(`  ${f.file}: ${f.hits.join(', ')}`);
  process.exit(1);
}
console.log(`✓ Bundle público sin datos de operadores (${dir}).`);
