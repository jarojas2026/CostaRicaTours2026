/**
 * Escáner de privacidad de proveedores (decisión del negocio: el cliente no ve datos
 * del operador antes de reservar). Lo usan tests/publicOperatorPrivacy.contract.test.ts
 * y scripts/auditOperatorPrivacy.mjs (después de `vite build`, sobre dist/).
 *
 * Denylist (en este orden):
 *  1. variable OPERATOR_DENYLIST_JSON (JSON o base64 del JSON), p. ej. un secreto de CI;
 *  2. data/internal/operatorDenylist.json (generado por scripts/catalog/build_operator_tours.py);
 *  3. si ninguno existe: scripts/lib/operatorDenylist.hashes.json, solo hashes SHA-256 con sal
 *     de los nombres/dominios normalizados (regenerar con
 *     `node scripts/internal/build-denylist-hashes.mjs`). Así la auditoría del build sigue
 *     funcionando cuando data/internal/ salga del repo, sin publicar los nombres.
 * Nunca se copia al bundle público.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ACCENTS = { a: '[aáàä]', e: '[eéèë]', i: '[iíìï]', o: '[oóòö]', u: '[uúùü]', n: '[nñ]' };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const HASHES_FILE = path.join('scripts', 'lib', 'operatorDenylist.hashes.json');

/** @returns {{ names: string[], domains: string[], publicPlaceNames?: string[] } | null} */
export function loadDenylist(root = ROOT, env = process.env) {
  const raw = String(env.OPERATOR_DENYLIST_JSON || '').trim();
  if (raw) return JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  const file = path.join(root, 'data', 'internal', 'operatorDenylist.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

// ---- Modo hash (sin nombres en claro) ----
const stripAccents = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
const LEAD = /^[^\p{L}\p{N}_]+/u;
const TRAIL = /[^\p{L}\p{N}_]+$/u;
/** Nombre → sin tildes, espacios colapsados, sin puntuación en los extremos; conserva mayúsculas. */
export const nameKey = (name) => stripAccents(name).trim().split(/\s+/).join(' ').replace(LEAD, '').replace(TRAIL, '');
export const hashKey = (salt, key) => crypto.createHash('sha256').update(`${salt}\u0000${key}`).digest('hex').slice(0, 24);

/** Genera el archivo de hashes a partir del denylist en claro. */
export function buildDenylistHashes(denylist, salt = crypto.randomBytes(16).toString('hex')) {
  const keys = [...new Set(denylist.names.map(nameKey).filter(Boolean))];
  return {
    warning: 'Hashes SHA-256 con sal de nombres y dominios de operadores. Generado por scripts/internal/build-denylist-hashes.mjs.',
    salt,
    maxWords: Math.max(1, ...keys.map((k) => k.split(' ').length)),
    names: keys.map((k) => hashKey(salt, k)).sort(),
    firstWords: [...new Set(keys.map((k) => hashKey(salt, k.split(' ')[0])))].sort(),
    domains: [...new Set(denylist.domains.map((d) => d.toLowerCase()))].map((d) => hashKey(salt, d)).sort(),
  };
}

export function loadDenylistHashes(root = ROOT) {
  const file = path.join(root, HASHES_FILE);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

export function hashMatchers(h) {
  return { mode: 'hash', names: [], domains: [], salt: h.salt, maxWords: h.maxWords, nameSet: new Set(h.names), firstSet: new Set(h.firstWords), domainSet: new Set(h.domains), counts: { names: h.names.length, domains: h.domains.length } };
}

function scanHashed(text, m, { names, domains }) {
  const hits = [];
  if (names) {
    const chunks = stripAccents(text).split(/\s+/);
    const found = new Set();
    const add = (key) => { const h = hashKey(m.salt, key); if (m.nameSet.has(h) && !found.has(h)) { found.add(h); hits.push(`name#${h.slice(0, 8)}`); } };
    for (let i = 0; i < chunks.length; i++) {
      const head = chunks[i].replace(LEAD, '');
      const whole = head.replace(TRAIL, '');
      if (!whole || (!m.firstSet.has(hashKey(m.salt, whole)) && !m.firstSet.has(hashKey(m.salt, head)))) continue;
      add(whole);
      let key = head;
      for (let n = 1; n < m.maxWords && i + n < chunks.length; n++) {
        add(`${key} ${chunks[i + n].replace(TRAIL, '')}`);
        key = `${key} ${chunks[i + n]}`;
      }
    }
  }
  if (domains) {
    const found = new Set();
    for (const host of text.toLowerCase().match(/[a-z0-9-]+(?:\.[a-z0-9-]+)+/g) || []) {
      const labels = host.split('.');
      for (let a = 0; a < labels.length - 1; a++) for (let b = a + 2; b <= labels.length; b++) {
        const h = hashKey(m.salt, labels.slice(a, b).join('.'));
        if (m.domainSet.has(h) && !found.has(h)) { found.add(h); hits.push(`domain#${h.slice(0, 8)}`); }
      }
    }
  }
  return hits;
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
  if (!denylist) {
    const hashes = loadDenylistHashes();
    if (!hashes) throw new Error('Sin denylist: define OPERATOR_DENYLIST_JSON, data/internal/operatorDenylist.json o ' + HASHES_FILE);
    return hashMatchers(hashes);
  }
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
  const hits = matchers.mode === 'hash' ? scanHashed(text, matchers, { names, domains }) : [];
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
