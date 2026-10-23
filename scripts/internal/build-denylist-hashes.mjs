#!/usr/bin/env node
/**
 * Regenera scripts/lib/operatorDenylist.hashes.json desde el denylist en claro
 * (OPERATOR_DENYLIST_JSON o data/internal/operatorDenylist.json). Conserva la sal
 * existente para que el archivo solo cambie cuando cambian los nombres.
 * Uso: node scripts/internal/build-denylist-hashes.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildDenylistHashes, loadDenylist, loadDenylistHashes, HASHES_FILE } from '../lib/operatorPrivacyScan.mjs';

const denylist = loadDenylist();
if (!denylist) { console.error('✖ Sin denylist en claro (OPERATOR_DENYLIST_JSON o data/internal/operatorDenylist.json).'); process.exit(1); }
const current = loadDenylistHashes();
const next = buildDenylistHashes(denylist, current?.salt);
const text = `${JSON.stringify(next, null, 1)}\n`;
const file = path.join(process.cwd(), HASHES_FILE);
if (process.argv.includes('--check')) {
  const same = fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text;
  console.log(same ? '✓ Hashes al día.' : '✖ Hashes desactualizados: corre node scripts/internal/build-denylist-hashes.mjs');
  process.exit(same ? 0 : 1);
}
fs.writeFileSync(file, text);
console.log(`✓ ${HASHES_FILE}: ${next.names.length} nombres, ${next.domains.length} dominios.`);
