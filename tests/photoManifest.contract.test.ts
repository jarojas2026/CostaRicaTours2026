import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  PHOTOS,
  PHOTO_MANIFEST,
  blockedReason,
  findPhotoByUrl,
  isPhotoAllowedForTour,
  photoUrlKey,
} from '../src/data/photoCatalog.ts';
import { TOURS_DATA } from '../src/data/toursCatalog.ts';
import { REGIONS } from '../src/data/catalogMeta.ts';
import { REGIONS_DATA } from '../src/data/regionsData.ts';
import { BLOG_POSTS } from '../src/data/blogPosts.ts';
import { MAP_TOURISM_SERVICES } from '../src/data/mapServicesData.ts';

const FREE_LICENSES = /^(CC0|Public domain|CC BY(-SA)? \d\.\d)$/;
const WELLNESS_ONLY = ['spa', 'massage'];
const ADVENTURE_CATEGORIES = ['adventure', 'canopy', 'rafting', 'hiking', 'waterfalls', 'volcanoes', 'combos', 'nature', 'wildlife', 'surf', 'snorkeling', 'diving', 'kayak', 'whale_watching'];

test('manifiesto: claves y URLs únicas; Commons con autor, licencia libre y página de origen', () => {
  const keys = new Set<string>();
  const urls = new Set<string>();
  for (const p of PHOTOS) {
    assert.ok(!keys.has(p.key), 'clave repetida ' + p.key);
    assert.ok(!urls.has(photoUrlKey(p.url)), 'URL repetida ' + p.url);
    keys.add(p.key);
    urls.add(photoUrlKey(p.url));
    assert.match(p.url, /^https:\/\//);
    assert.ok(p.subjects.length > 0, p.key + ' sin tags');
    assert.ok(!blockedReason(p.url), p.key + ' está en la lista de vetadas');
    if (p.source === 'wikimedia-commons') {
      assert.match(p.url, /^https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/commons\//, p.key);
      assert.match(p.sourcePage || '', /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, p.key);
      assert.ok(p.author && p.author.length > 1, p.key + ' sin autor');
      assert.match(p.license, FREE_LICENSES, p.key + ' licencia no libre: ' + p.license);
      if (p.license !== 'Public domain') assert.match(p.licenseUrl || '', /creativecommons\.org/, p.key);
      assert.equal(p.inCostaRica, true, p.key);
      assert.ok(p.credit && p.credit.includes(p.author!) && p.credit.includes(p.license), p.key + ' crédito incompleto');
    }
  }
});

test('ningún tour usa una foto vetada, fuera del manifiesto o de otro destino', () => {
  assert.ok(TOURS_DATA.length > 500);
  for (const tour of TOURS_DATA) {
    for (const url of [tour.image, ...(tour.gallery || [])]) {
      const reason = blockedReason(url);
      assert.ok(!reason, `${tour.id}: foto vetada (${reason?.reason})`);
      const photo = findPhotoByUrl(url);
      assert.ok(photo, `${tour.id}: foto fuera del manifiesto ${url}`);
      assert.ok(isPhotoAllowedForTour(photo, tour), `${tour.id} (${tour.region}): ${photo!.key} no corresponde al destino o está vetada`);
      if (ADVENTURE_CATEGORIES.includes(tour.category)) {
        const bad = photo!.subjects.filter(s => [...WELLNESS_ONLY, 'castle', 'restaurant', 'outside-cr'].includes(s));
        assert.deepEqual(bad, [], `${tour.id} (${tour.category}) recibe foto de categoría vetada ${photo!.key}`);
      }
    }
    if ((tour.gallery || []).length > 1) {
      assert.notEqual(photoUrlKey(tour.gallery![0]), photoUrlKey(tour.gallery![1]), tour.id + ': galería repite la misma foto');
    }
  }
});

test('el catálogo usa una variedad razonable de fotos (no una por categoría)', () => {
  const distinct = new Set(TOURS_DATA.flatMap(t => [t.image, ...(t.gallery || [])]).map(photoUrlKey));
  assert.ok(distinct.size >= 40, 'solo ' + distinct.size + ' fotos distintas');
});

test('destinos: una foto distinta por destino y nunca compartida entre destinos', () => {
  const alias = (id: string) => (id === 'san_jose' ? 'sjo' : id);
  const owner = new Map<string, string>();
  const carousel = fs.readFileSync('src/components/DestinationsCarousel.tsx', 'utf8');
  const carouselIds = [...carousel.matchAll(/img: destinationPhotoUrl\('([a-z_]+)'\)/g)].map(m => m[1]);
  assert.ok(carouselIds.length >= 6, 'el carrusel debe tomar sus fotos de destinationPhotoUrl');
  const entries: Array<[string, string]> = [
    ...REGIONS.map(r => [r.id, r.image] as [string, string]),
    ...REGIONS_DATA.map(r => [r.id, r.image] as [string, string]),
  ];
  for (const [id, url] of entries) {
    assert.ok(!blockedReason(url), id + ': foto vetada');
    const photo = findPhotoByUrl(url);
    assert.ok(photo, id + ': foto fuera del manifiesto');
    if (photo!.regions.length) assert.ok(photo!.regions.map(alias).includes(alias(id)), `${id}: ${photo!.key} es de otro lugar`);
    const key = photoUrlKey(url);
    const prev = owner.get(key);
    assert.ok(!prev || prev === alias(id), `foto ${photo!.key} reutilizada entre destinos ${prev} y ${id}`);
    owner.set(key, alias(id));
  }
});

test('artículos y servicios del mapa: sin fotos vetadas; artículos señalados con foto real y crédito', () => {
  for (const post of BLOG_POSTS) assert.ok(!blockedReason(post.image), post.slug + ': foto vetada');
  const whales = BLOG_POSTS.find(p => p.slug === 'ballenas-marino-ballena-temporadas')!;
  assert.ok(findPhotoByUrl(whales.image)?.subjects.includes('whales'));
  assert.equal(findPhotoByUrl(whales.image)?.source, 'wikimedia-commons');
  const green = BLOG_POSTS.find(p => p.slug === 'viaje-sostenible-costa-rica')!;
  assert.equal(findPhotoByUrl(green.image)?.source, 'wikimedia-commons');
  for (const s of MAP_TOURISM_SERVICES) assert.ok(!blockedReason(s.image), s.id + ': foto vetada');
  const article = fs.readFileSync('src/pages/BlogArticlePage.tsx', 'utf8');
  assert.match(article, /<PhotoCredit src=\{post\.image\}/);
});

test('ningún archivo de src referencia una foto vetada (castillo, spa, fuera de CR, rotas)', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
    }
  };
  walk('src');
  const hits: string[] = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const b of PHOTO_MANIFEST.blocked) if (text.includes(b.match)) hits.push(`${f}: ${b.match} (${b.reason})`);
  }
  assert.deepEqual(hits, []);
});

test('cultura tica / gastronomía: solo fotos reales de platos costarricenses (tag costa-rica-food) con crédito', () => {
  const culture = fs.readFileSync('src/components/TicoCultureSection.tsx', 'utf8');
  const block = culture.slice(culture.indexOf('const TICO_DISHES'), culture.indexOf('interface CoffeeRegion'));
  assert.ok(block.length > 100, 'no se encontró TICO_DISHES');
  const names = [...block.matchAll(/\n    name: '([^']+)'/g)].map(m => m[1]);
  const keys = [...block.matchAll(/photoKey: '([^']+)'/g)].map(m => m[1]);
  assert.ok(names.length >= 6, 'se esperaban al menos 6 platos');
  assert.equal(keys.length, names.length, 'cada plato debe declarar photoKey del manifiesto');
  assert.doesNotMatch(block, /https?:\/\//, 'los platos no deben llevar URLs sueltas; usar photoKey');
  assert.equal(new Set(keys).size, keys.length, 'dos platos comparten foto');
  for (const key of keys) {
    const photo = PHOTOS.find(p => p.key === key);
    assert.ok(photo, 'photoKey fuera del manifiesto: ' + key);
    assert.ok(photo!.subjects.includes('costa-rica-food'), key + ' no tiene el tag costa-rica-food');
    assert.equal(photo!.source, 'wikimedia-commons', key);
    assert.equal(photo!.inCostaRica, true, key);
    assert.ok(photo!.credit, key + ' sin crédito');
  }
  for (const p of PHOTOS.filter(p => p.subjects.includes('costa-rica-food'))) {
    assert.equal(p.source, 'wikimedia-commons', p.key + ': costa-rica-food solo para fotos verificadas en Commons');
  }
  assert.match(culture, /<PhotoCredit src=\{photoSrc\(getPhoto\(dish\.photoKey\)/, 'la tarjeta debe mostrar el crédito');
  const foreign = PHOTO_MANIFEST.blocked.filter(b => b.subjects.includes('food-foreign'));
  assert.ok(foreign.length >= 6, 'las fotos viejas de comida extranjera deben quedar vetadas');
});
