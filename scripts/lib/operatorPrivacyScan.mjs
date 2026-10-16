/**
 * Escáner de privacidad de proveedores (decisión del negocio: el cliente no ve datos
 * del operador antes de reservar). Lo usan tests/publicOperatorPrivacy.contract.test.ts
 * y scripts/auditOperatorPrivacy.mjs (después de `vite build`, sobre dist/).
 *
 * Denylist: data/internal/operatorDenylist.json (generado por
 * scripts/catalog/build_operator_tours.py). Nunca se copia al bundle público.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ACCENTS = { a: '[aáàä]', e: '[eéèë]', i: '[iíìï]', o: '[oóòö]', u: '[uúùü]', n: '[nñ]' };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function loadDenylist(root = ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, 'data', 'internal', 'operatorDenylist.json'), 'utf8'));
}

function accentPattern(name) {
  const base = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  if (base.length !== name.length) return esc(name);
  return [...base].map((ch) => {
    const low = ch.toLowerCase();
    if (!ACCENTS[low]) return esc(ch);
    return ch === low ? ACCENTS[low] : ACCENTS[low].toUpperCase();
  }).join('');
}

export function buildMatchers(denylist = loadDenylist()) {
  // Sensible a mayúsculas: son nombres propios. Límites de palabra Unicode.
  const names = denylist.names.map((name) => ({ name, re: new RegExp(`(?<![\\p{L}\\p{N}_])${accentPattern(name)}(?![\\p{L}\\p{N}_])`, 'u') }));
  const domains = denylist.domains.map((domain) => ({ domain, re: new RegExp(`(?<![a-z0-9-])${esc(domain)}`, 'i') }));
  return { names, domains };
}

/** Claves JSON que identifican al proveedor y nunca deben salir hacia el cliente. */
export const OPERATOR_FIELD_KEYS = ['operator', 'operatorName', 'operatorLogo', 'operatorWebsite', 'operatorEmail', 'operatorPhone', 'operatorWhatsapp', 'sourceUrl', 'inquirySourceUrl', 'providerName', 'providerContact'];
const FIELD_RE = new RegExp(`"(?:${OPERATOR_FIELD_KEYS.join('|')})"\\s*:`);

/**
 * @param {string} text
 * @param {ReturnType<typeof buildMatchers>} matchers
 * @param {{ names?: boolean, domains?: boolean, fields?: boolean }} [options]
 * @returns {string[]}
 */
export function scanText(text, matchers, { names = true, domains = true, fields = false } = {}) {
  const hits = [];
  if (names) for (const { name, re } of matchers.names) if (re.test(text)) hits.push(`name:${name}`);
  if (domains) for (const { domain, re } of matchers.domains) if (re.test(text)) hits.push(`domain:${domain}`);
  if (fields) { const m = text.match(FIELD_RE); if (m) hits.push(`field:${m[0]}`); }
  return hits;
}

const TEXT_EXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.xml', '.txt', '.webmanifest', '.geojson', '.map', '.ts', '.tsx', '']);

/** @param {string} dir @param {(file: string) => boolean} [skip] @returns {string[]} */
export function listFiles(dir, skip = (_file) => false) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (skip(full)) continue;
    if (entry.isDirectory()) out.push(...listFiles(full, skip));
    else if (TEXT_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

/**
 * Escanea un árbol público (public/ o dist/). En las capas del mapa (*.geojson) solo se
 * exigen dominios y campos: los topónimos siguen visibles (decisión del dueño) y los puntos
 * de negocios de operadores ya se retiran en scripts/catalog/scrub_public_map_layers.py.
 * @param {string} dir
 * @param {ReturnType<typeof buildMatchers>} [matchers]
 * @param {{ skip?: (file: string) => boolean }} [options]
 * @returns {{ file: string, hits: string[] }[]}
 */
export function scanPublicTree(dir, matchers = buildMatchers(), { skip = (_file) => false } = {}) {
  const findings = [];
  for (const file of listFiles(dir, skip)) {
    const text = fs.readFileSync(file, 'utf8');
    const geo = file.endsWith('.geojson');
    const hits = scanText(text, matchers, { names: !geo, domains: true, fields: file.endsWith('.json') || geo });
    if (hits.length) findings.push({ file: path.relative(ROOT, file), hits: hits.slice(0, 8) });
  }
  return findings;
}
