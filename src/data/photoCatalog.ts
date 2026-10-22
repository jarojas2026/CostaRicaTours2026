/**
 * Catálogo de fotos con etiquetas (lugar, actividad, vetos) y créditos.
 * Fuente única: ./photoManifest.json. Ver tests/photoManifest.contract.test.ts.
 *
 * Regla: la foto se elige por destino + actividad. Si no hay una adecuada se usa
 * un paisaje neutro de Costa Rica. Nunca spa/masaje/castillo/restaurante ni fotos
 * fuera de Costa Rica en tours, destinos o artículos.
 */
import manifest from './photoManifest.json';

export interface PhotoEntry {
  key: string;
  url: string;
  source: 'wikimedia-commons' | 'unsplash';
  place: string;
  regions: string[];
  subjects: string[];
  inCostaRica: boolean | 'unverified';
  author: string | null;
  license: string;
  licenseUrl: string | null;
  sourcePage: string | null;
  credit: string | null;
  note?: string;
}

export interface BlockedPhoto { match: string; reason: string; subjects: string[] }

export const PHOTO_MANIFEST = manifest as unknown as {
  version: number;
  reviewedAt: string;
  policy: { vetoedSubjectsForTours: string[]; neutralKey: string };
  photos: PhotoEntry[];
  blocked: BlockedPhoto[];
};

export const PHOTOS: PhotoEntry[] = PHOTO_MANIFEST.photos;
const BY_KEY = new Map(PHOTOS.map(p => [p.key, p]));

/** Agrupa regiones del catálogo que comparten paisaje (p. ej. Corcovado ⊂ Osa). */
const REGION_GROUP: Record<string, string> = {
  san_jose: 'sjo', cartago: 'sjo', sjo: 'sjo',
  corcovado: 'osa', golfito: 'osa', golfo_dulce: 'osa', osa: 'osa',
  marino_ballena: 'uvita', dominical: 'uvita', uvita: 'uvita',
  turrialba: 'pacuare', pacuare: 'pacuare',
  caribe: 'caribe', caribe_sur: 'caribe_sur',
};
export const regionGroup = (region: string | undefined): string =>
  (region && REGION_GROUP[region]) || region || '';

/** Clave estable de una URL: ruta sin query (`photo-<id>` en Unsplash, archivo en Commons). */
export function photoUrlKey(url: string | undefined | null): string {
  if (!url) return '';
  return url.split('?')[0].replace(/^http:/, 'https:');
}

const BY_URL = new Map(PHOTOS.map(p => [photoUrlKey(p.url), p]));

export function getPhoto(key: string): PhotoEntry {
  const p = BY_KEY.get(key);
  if (!p) throw new Error('photoManifest: clave desconocida ' + key);
  return p;
}

export function findPhotoByUrl(url: string | undefined | null): PhotoEntry | undefined {
  return BY_URL.get(photoUrlKey(url));
}

export function blockedReason(url: string | undefined | null): BlockedPhoto | undefined {
  if (!url) return undefined;
  return PHOTO_MANIFEST.blocked.find(b => url.includes(b.match));
}

/** URL lista para <img>. Unsplash recibe parámetros de recorte; Commons ya es una miniatura de 1280 px. */
export function photoSrc(p: PhotoEntry, width = 1200): string {
  return p.source === 'unsplash' ? `${p.url}?auto=format&fit=crop&w=${width}&q=85` : p.url;
}

export const NEUTRAL_PHOTO: PhotoEntry = getPhoto(PHOTO_MANIFEST.policy.neutralKey);
export const NEUTRAL_PHOTO_URL = photoSrc(NEUTRAL_PHOTO);

/** Crédito visible (solo fotos con atribución requerida/registrada). */
export function photoCredit(url: string | undefined | null): { text: string; href: string | null; licenseUrl: string | null } | null {
  const p = findPhotoByUrl(url);
  if (!p || !p.credit) return null;
  return { text: p.credit, href: p.sourcePage, licenseUrl: p.licenseUrl };
}

/** Sujetos aceptables por categoría de tour, en orden de preferencia. */
export const CATEGORY_SUBJECTS: Record<string, string[]> = {
  volcanoes: ['volcano'],
  wildlife: ['wildlife'],
  canopy: ['canopy', 'hanging-bridges'],
  beaches: ['beach'],
  rafting: ['rafting'],
  culture: ['culture', 'coffee'],
  hiking: ['hiking', 'cloud-forest'],
  waterfalls: ['waterfall'],
  surf: ['surf'],
  snorkeling: ['snorkel'],
  diving: ['snorkel', 'marine'],
  whale_watching: ['whales'],
  kayak: ['river', 'coast'],
  fishing: ['coast', 'marine'],
  rural: ['rural', 'coffee'],
  gastronomy: ['coffee'],
  adventure: ['adventure', 'waterfall'],
  nature: ['rainforest', 'hiking', 'wildlife'],
  family: ['wildlife', 'beach'],
  combos: ['landscape'],
  multiday: ['landscape'],
  services: ['transport'],
};

/** Palabras del título que precisan la actividad (tienen prioridad sobre la categoría). */
const TITLE_SUBJECTS: Array<[RegExp, string]> = [
  [/ballena|whale/i, 'whales'],
  [/termal|hot spring/i, 'hot-springs'],
  [/puente|bridge/i, 'hanging-bridges'],
  [/canopy|zip|tirolesa|superman/i, 'canopy'],
  [/rafting/i, 'rafting'],
  [/perezoso|sloth/i, 'sloth'],
  [/quetzal|aves|bird/i, 'birds'],
  [/tortuga|turtle/i, 'turtles'],
  [/caf[eé]|coffee/i, 'coffee'],
  [/catarata|waterfall|canyon|cañ[oó]n/i, 'waterfall'],
  [/surf/i, 'surf'],
  [/snorkel|buceo|dive|diving/i, 'snorkel'],
  [/volc[aá]n|volcano|cr[aá]ter/i, 'volcano'],
  [/canal|manglar|mangrove|kayak/i, 'river'],
];

/** Categorías de aventura/naturaleza: nunca spa, masaje, castillo ni restaurante. */
export function isPhotoAllowedForTour(p: PhotoEntry | undefined, tour: { region?: string }): boolean {
  if (!p) return false;
  const vetoed = PHOTO_MANIFEST.policy.vetoedSubjectsForTours;
  if (p.subjects.some(s => vetoed.includes(s))) return false;
  if (p.subjects.includes('transport')) return false;
  if (p.regions.length && !p.regions.some(r => regionGroup(r) === regionGroup(tour.region))) return false;
  return true;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function poolFor(subjects: string[], region: string | undefined): PhotoEntry[] {
  const group = regionGroup(region);
  for (const subject of subjects) {
    const matches = PHOTOS.filter(p => p.subjects.includes(subject) && isPhotoAllowedForTour(p, { region }));
    const local = matches.filter(p => p.regions.some(r => regionGroup(r) === group));
    if (local.length) return [...local, ...local, ...matches.filter(p => !p.regions.length)];
    if (matches.length) return matches;
  }
  return [];
}

/** Elige foto principal y de galería para un tour por destino + actividad. */
export function pickTourPhotos(tour: { id: string; region?: string; category?: string; title?: { es?: string; en?: string } }): [string, string] {
  const title = `${tour.title?.es || ''} ${tour.title?.en || ''}`;
  const titleSubjects = TITLE_SUBJECTS.filter(([re]) => re.test(title)).map(([, s]) => s);
  const subjects = [...titleSubjects, ...(CATEGORY_SUBJECTS[tour.category || ''] || [])];
  let pool = poolFor(subjects, tour.region);
  const landscape = poolFor(['landscape'], tour.region).filter(p => p.regions.length);
  if (!pool.length) pool = landscape.length ? landscape : [NEUTRAL_PHOTO];
  const h = hash(tour.id);
  const primary = pool[h % pool.length];
  const rest = [...new Set([...pool, ...landscape])].filter(p => p.key !== primary.key);
  const second = rest.length ? rest[(h >>> 8) % rest.length] : (primary.key === NEUTRAL_PHOTO.key ? primary : NEUTRAL_PHOTO);
  return [photoSrc(primary), photoSrc(second, 800)];
}

/** Sustituye por una foto válida toda imagen vetada, rota, ajena al destino o fuera del manifiesto. */
export function sanitizeTourImages<T extends { id: string; image: string; gallery?: string[]; region?: string; category?: string; title?: { es?: string; en?: string } }>(tour: T): T {
  const ok = (url: string) => !blockedReason(url) && isPhotoAllowedForTour(findPhotoByUrl(url), tour);
  const urls = [tour.image, ...(tour.gallery || [])];
  const g = tour.gallery || [];
  if (urls.every(ok) && (g.length < 2 || photoUrlKey(g[0]) !== photoUrlKey(g[1]))) return tour;
  const [a, b] = pickTourPhotos(tour);
  const image = ok(tour.image) ? tour.image : a;
  const gallery = [image, ...g.filter(u => ok(u) && photoUrlKey(u) !== photoUrlKey(image))].slice(0, Math.max(2, g.length));
  if (gallery.length < 2) gallery.push(photoUrlKey(b) !== photoUrlKey(image) ? b : photoUrlKey(image) !== photoUrlKey(NEUTRAL_PHOTO_URL) ? NEUTRAL_PHOTO_URL : a);
  tour.image = image;
  tour.gallery = gallery;
  return tour;
}

/** Foto de reemplazo para servicios del mapa / vuelos con imagen vetada. */
export function regionLandscapeUrl(region: string | undefined): string {
  const pool = poolFor(['landscape'], region).filter(p => p.regions.length);
  return photoSrc(pool[0] || NEUTRAL_PHOTO);
}

export function safeImageUrl(url: string, region?: string): string {
  return blockedReason(url) ? regionLandscapeUrl(region) : url;
}

/** Foto única por destino (ids de catalogMeta.REGIONS / regionsData). */
export const DESTINATION_PHOTO_KEYS: Record<string, string> = {
  arenal: 'wm-arenal-volcano',
  monteverde: 'wm-monteverde-cloud-forest',
  manuel_antonio: 'wm-manuel-antonio-coast',
  pacuare: 'wm-pacuare-river',
  guanacaste: 'wm-tamarindo-beach',
  tortuguero: 'wm-tortuguero-boat',
  osa: 'wm-corcovado-beach',
  caribe_sur: 'wm-cahuita-park',
  caribe: 'us-caribbean-coast',
  sjo: 'us-san-jose-street',
  san_jose: 'us-san-jose-street',
  sarapiqui: 'us-river-forest-aerial',
  central_pacific: 'us-coast-hills',
  los_santos: 'wm-dota-valley',
  golfito: 'us-coast-aerial',
  uvita: 'wm-marino-ballena',
};

export function destinationPhotoUrl(regionId: string): string {
  const key = DESTINATION_PHOTO_KEYS[regionId];
  return key ? photoSrc(getPhoto(key)) : NEUTRAL_PHOTO_URL;
}
