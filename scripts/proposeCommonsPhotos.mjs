#!/usr/bin/env node
/**
 * Propuesta de fotos con licencia libre desde Wikimedia Commons (API pública, sin clave).
 *
 * NO reemplaza fotos en producción: solo escribe una propuesta para revisión humana.
 *   node scripts/proposeCommonsPhotos.mjs            → data/photo-proposals/commons.json + docs/photo-proposals-commons.md
 *   node scripts/proposeCommonsPhotos.mjs --per=4    → candidatos por tema (por defecto 3)
 *
 * Solo acepta CC0, dominio público, CC BY y CC BY-SA (cualquier versión). Cada candidato
 * guarda URL, página del archivo, autor, licencia y una línea de atribución lista para mostrar.
 * Política de Wikimedia: se envía un User-Agent identificable y se pausa entre consultas.
 */
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'CostaRicaTours2026-photo-proposals/1.0 (https://costaricatours2026.vercel.app; jarojas800@gmail.com)';
const PER_TOPIC = Number((process.argv.find(a => a.startsWith('--per=')) || '--per=3').split('=')[1]) || 3;
const MIN_WIDTH = 1200;

/** Temas por destino y actividad (búsquedas en Commons, en inglés para más resultados). */
export const TOPICS = [
  { id: 'arenal', kind: 'destination', query: 'Arenal Volcano Costa Rica' },
  { id: 'monteverde', kind: 'destination', query: 'Monteverde cloud forest Costa Rica' },
  { id: 'manuel_antonio', kind: 'destination', query: 'Manuel Antonio National Park beach' },
  { id: 'tortuguero', kind: 'destination', query: 'Tortuguero canals Costa Rica' },
  { id: 'guanacaste', kind: 'destination', query: 'Tamarindo beach Guanacaste' },
  { id: 'rio_celeste', kind: 'destination', query: 'Rio Celeste waterfall Tenorio' },
  { id: 'corcovado', kind: 'destination', query: 'Corcovado National Park Costa Rica' },
  { id: 'caribe_sur', kind: 'destination', query: 'Cahuita National Park beach' },
  { id: 'pacuare', kind: 'destination', query: 'Pacuare River Costa Rica' },
  { id: 'san_gerardo_dota', kind: 'destination', query: 'San Gerardo de Dota Costa Rica' },
  { id: 'chirripo', kind: 'destination', query: 'Cerro Chirripo Costa Rica' },
  { id: 'uvita_marino_ballena', kind: 'destination', query: 'Marino Ballena National Park Uvita' },
  { id: 'rafting', kind: 'activity', query: 'whitewater rafting Costa Rica' },
  { id: 'canopy', kind: 'activity', query: 'zip line canopy tour Costa Rica' },
  { id: 'hanging_bridges', kind: 'activity', query: 'hanging bridge rainforest Costa Rica' },
  { id: 'coffee_tour', kind: 'activity', query: 'coffee plantation Costa Rica' },
  { id: 'birdwatching_quetzal', kind: 'activity', query: 'Resplendent Quetzal Costa Rica' },
  { id: 'sloth', kind: 'activity', query: 'sloth Costa Rica' },
  { id: 'surf', kind: 'activity', query: 'surfing Costa Rica beach' },
  { id: 'whale_watching', kind: 'activity', query: 'humpback whale Costa Rica' },
  { id: 'hot_springs', kind: 'activity', query: 'hot springs La Fortuna Costa Rica' },
  { id: 'turtles', kind: 'activity', query: 'sea turtle nesting Costa Rica' },
];

const ALLOWED = [
  { test: /^cc0/i, family: 'CC0' },
  { test: /^(public domain|pd)/i, family: 'Public domain' },
  { test: /^cc[- ]by[- ]sa/i, family: 'CC BY-SA' },
  { test: /^cc[- ]by(?![- ]?n)/i, family: 'CC BY' },
];

export function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const cleanUrl = (u) => (u ? String(u).split('?')[0] : u);

export function licenseFamily(shortName) {
  const name = String(shortName || '').trim();
  if (/\bnc\b|non[- ]?commercial|\bnd\b|noderiv/i.test(name)) return null;
  return ALLOWED.find(rule => rule.test.test(name))?.family ?? null;
}

/** Convierte una página de la API (prop=imageinfo&iiprop=url|size|extmetadata) en candidato o null. */
export function toCandidate(page, topic) {
  const info = page?.imageinfo?.[0];
  const meta = info?.extmetadata || {};
  const license = stripHtml(meta.LicenseShortName?.value);
  const family = licenseFamily(license);
  if (!info || !family) return null;
  if (!/\.(jpe?g|png|webp)$/i.test(page.title || '')) return null;
  if ((info.width || 0) < MIN_WIDTH) return null;
  const author = stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value) || 'Autor desconocido';
  const licenseUrl = stripHtml(meta.LicenseUrl?.value) || null;
  const title = String(page.title).replace(/^File:/, '');
  return {
    topicId: topic.id,
    kind: topic.kind,
    file: title,
    descriptionUrl: cleanUrl(info.descriptionurl),
    imageUrl: cleanUrl(info.url),
    thumbUrl: cleanUrl(info.thumburl || info.url),
    width: info.width,
    height: info.height,
    author,
    license,
    licenseFamily: family,
    licenseUrl,
    attribution: `Foto: ${author} · ${license} · Wikimedia Commons`,
    status: 'propuesta_sin_revisar',
  };
}

async function searchTopic(topic) {
  const url = new URL(API);
  Object.entries({
    action: 'query', format: 'json', formatversion: '2', origin: '*',
    generator: 'search', gsrnamespace: '6', gsrlimit: '20',
    gsrsearch: `${topic.query} filetype:bitmap`,
    prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '1280',
    iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Credit',
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, 'api-user-agent': USER_AGENT } });
  if (!res.ok) throw new Error(`commons_http_${res.status}`);
  const data = await res.json();
  const pages = (data?.query?.pages || []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages.map(p => toCandidate(p, topic)).filter(Boolean).slice(0, PER_TOPIC);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function markdown(result) {
  const lines = [
    '# Propuesta de fotos libres (Wikimedia Commons)',
    '',
    `Generado: ${result.generatedAt} con \`node scripts/proposeCommonsPhotos.mjs\`. **Propuesta sin revisar: no reemplaza fotos en producción.**`,
    'Solo licencias CC0, dominio público, CC BY y CC BY-SA. Si se usa una foto, mostrar su línea de atribución junto a la imagen y enlazar la página del archivo.',
    '',
  ];
  for (const topic of TOPICS) {
    const items = result.candidates.filter(c => c.topicId === topic.id);
    lines.push(`## ${topic.id} (${topic.kind === 'destination' ? 'destino' : 'actividad'}) — “${topic.query}”`, '');
    if (!items.length) { lines.push('_Sin candidatos con licencia aceptada._', ''); continue; }
    for (const c of items) {
      lines.push(`<img src="${c.thumbUrl}" alt="${c.file.replace(/"/g, '')}" width="320">`, '');
      lines.push(`- **${c.attribution}**${c.licenseUrl ? ` ([licencia](${c.licenseUrl}))` : ''}`);
      lines.push(`- Archivo: [${c.file}](${c.descriptionUrl}) · ${c.width}×${c.height}`, '');
    }
  }
  if (result.errors.length) lines.push('## Errores', '', ...result.errors.map(e => `- ${e.topicId}: ${e.error}`), '');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const candidates = [];
  const errors = [];
  for (const topic of TOPICS) {
    try {
      candidates.push(...await searchTopic(topic));
    } catch (error) {
      errors.push({ topicId: topic.id, error: String(error?.message || error) });
    }
    await sleep(400);
  }
  const result = {
    generatedAt: new Date().toISOString(),
    source: 'Wikimedia Commons API (commons.wikimedia.org/w/api.php)',
    note: 'Propuesta sin revisar. No reemplaza fotos en producción. Verificar cada archivo (que corresponda al lugar, sin personas identificables ni marcas) antes de usarlo.',
    candidates,
    errors,
  };
  const outJson = path.join(process.cwd(), 'data', 'photo-proposals', 'commons.json');
  const outMd = path.join(process.cwd(), 'docs', 'photo-proposals-commons.md');
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(outMd, markdown(result));
  console.log(`[commons] ${candidates.length} candidatos en ${TOPICS.length} temas; errores: ${errors.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
