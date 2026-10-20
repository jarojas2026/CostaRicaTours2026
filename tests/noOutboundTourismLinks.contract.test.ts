import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Decisión del dueño (2026-10-19): el sitio público no envía al cliente a otros sitios
// turísticos (ICT / Visit Costa Rica / Esencial Costa Rica, etc.). La plataforma gestiona
// la solicitud. El texto "verificamos su declaratoria turística del ICT" se mantiene sin enlace.
const FORBIDDEN = /(visitcostarica\.com|ict\.go\.cr|esencialcostarica\.com|tripadvisor\.(com|co)\b|lonelyplanet\.com)/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full.includes(path.join('public', 'data', 'mapa'))) continue; // cubierto por publicBusinessContacts
      walk(full, out);
    } else if (/\.(tsx?|jsx?|json|html|xml|txt|md)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test('public site ships no outbound links to ICT / Visit Costa Rica or other tourism sites', () => {
  const root = process.cwd();
  const offenders = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'public'))]
    .filter((file) => FORBIDDEN.test(fs.readFileSync(file, 'utf8')))
    .map((file) => path.relative(root, file));
  assert.deepEqual(offenders, []);
});

test('grounded-search fallback does not cite or redirect to third-party tourism portals', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'backend/groundedSearchService.ts'), 'utf8');
  assert.doesNotMatch(src, FORBIDDEN);
  assert.doesNotMatch(src, /verifique el estado en Naviera Tambor|check Naviera Tambor/);
});

test('the internal ICT verification text stays, without a link', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/utils/operatorPrivacy.ts'), 'utf8');
  assert.match(src, /verificamos su declaratoria turística del ICT/);
});
