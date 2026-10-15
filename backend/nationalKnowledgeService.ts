/**
 * Conocimiento nacional verificable para el asistente único.
 *
 * Lee las capas oficiales/abiertas ya publicadas en public/data/mapa (SINAC, CCSS, OSM)
 * y el listado oficial de guías del ICT (data/guides/guidesIct.json, sin contactos
 * individuales). Toda respuesta incluye fuente y fecha para que el agente nunca
 * presente un dato como confirmado si no lo es.
 */
import fs from 'node:fs';
import path from 'node:path';
import { TOURS } from '../src/data/toursData';
import guidesIct from '../data/guides/guidesIct.json';

type Feature = { geometry?: { coordinates?: [number, number] }; properties: Record<string, any> };

const cache = new Map<string, Feature[]>();
const roots = () => [path.join(process.cwd(), 'public', 'data', 'mapa'), path.join(process.cwd(), 'dist', 'data', 'mapa')];

export function loadLayer(group: string): Feature[] {
  if (!/^[a-z_]+$/.test(group)) return [];
  if (cache.has(group)) return cache.get(group)!;
  for (const root of roots()) {
    const file = path.join(root, `${group}.geojson`);
    if (fs.existsSync(file)) {
      const features = (JSON.parse(fs.readFileSync(file, 'utf8')).features ?? []) as Feature[];
      cache.set(group, features);
      return features;
    }
  }
  cache.set(group, []);
  return [];
}

const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const detail = (p: Record<string, any>, key: string) =>
  (p.detalles as { es: string; v: string }[] | undefined)?.find((d) => norm(d.es).includes(norm(key)))?.v;

/** Parques y áreas SINAC: horario, tarifas, teléfono y enlace oficial de reserva. */
export function getParkInfo(query: string, limit = 3) {
  const q = norm(query);
  if (!q) return { success: false, error: 'query requerido' };
  const matches = loadLayer('parques_sinac')
    .filter((f) => norm(f.properties.nombre).includes(q) || norm(f.properties.tipo).includes(q))
    .slice(0, Math.min(Math.max(limit, 1), 8))
    .map((f) => ({
      name: f.properties.nombre,
      type: f.properties.tipo,
      hours: f.properties.horario ?? null,
      phone: f.properties.telefono ?? null,
      foreignFee: detail(f.properties, 'tarifa extranjero') ?? null,
      residentFee: detail(f.properties, 'tarifa nacional') ?? null,
      booking: f.properties.reserva ?? null,
      notes: detail(f.properties, 'notas') ?? null,
      source: f.properties.fuente ?? 'https://www.sinac.go.cr',
      location: f.geometry?.coordinates ? { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] } : null,
    }));
  return {
    success: matches.length > 0,
    results: matches,
    verification: 'Datos SINAC recopilados en 2026; confirmar tarifas y cupos en el sistema oficial de reservas antes de prometerlos.',
  };
}

const SERVICE_GROUPS: Record<string, string> = {
  hospital: 'ccss', salud_publica: 'ccss', ccss: 'ccss',
  farmacia: 'salud', salud: 'salud',
  policia: 'emergencia', bomberos: 'emergencia', cruz_roja: 'emergencia', emergencia: 'emergencia',
  transporte: 'transporte', bus: 'transporte',
  hospedaje: 'hospedaje', hotel: 'hospedaje',
  comida: 'alimentacion', alimentacion: 'alimentacion', soda: 'alimentacion',
};

/** Servicios más cercanos a una coordenada (salud, emergencia, transporte, hospedaje, comida). */
export function findNearestServices(lat: number, lng: number, kind = 'emergencia', limit = 5, typeFilter?: string) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 5 || lat > 11.5 || lng < -87.5 || lng > -82.5) {
    return { success: false, error: 'Coordenadas fuera de Costa Rica' };
  }
  const group = SERVICE_GROUPS[norm(kind).replace(/\s+/g, '_')] ?? 'emergencia';
  const t = norm(typeFilter);
  const results = loadLayer(group)
    .filter((f) => f.geometry?.coordinates && (!t || norm(f.properties.tipo).includes(t) || norm(f.properties.nombre).includes(t)))
    .map((f) => {
      const [fLng, fLat] = f.geometry!.coordinates!;
      return { f, km: haversineKm(lat, lng, fLat, fLng) };
    })
    .sort((a, b) => a.km - b.km)
    .slice(0, Math.min(Math.max(limit, 1), 10))
    .map(({ f, km }) => ({
      name: f.properties.nombre ?? f.properties.tipo,
      type: f.properties.tipo,
      address: f.properties.direccion ?? null,
      distanceKm: Math.round(km * 10) / 10,
      location: { lat: f.geometry!.coordinates![1], lng: f.geometry!.coordinates![0] },
    }));
  return {
    success: results.length > 0,
    group,
    results,
    emergencyNumber: '911',
    verification: group === 'ccss' ? 'Red CCSS (SGIS, datos 2021).' : 'OpenStreetMap (Geofabrik 2026); puede estar incompleto.',
  };
}

interface GuideRow { n: string; r: string[]; s: string[]; l: string[]; c: string[] }
interface GuideData { source: string; asOf: string; associations: { name: string; zone: string; email: string; phone: string; source: string }[]; guides: GuideRow[] }
// Importado estáticamente para que esbuild lo incluya en dist/server.cjs (data/ no se copia al contenedor).
const guideData = guidesIct as GuideData;
function loadGuides(): GuideData {
  return guideData;
}

const LANG_ALIASES: Record<string, string> = {
  english: 'ingles', ingles: 'ingles', en: 'ingles', german: 'aleman', deutsch: 'aleman', de: 'aleman', aleman: 'aleman',
  french: 'frances', francais: 'frances', fr: 'frances', frances: 'frances', italian: 'italiano', it: 'italiano', italiano: 'italiano',
  portuguese: 'portugues', pt: 'portugues', portugues: 'portugues', dutch: 'holandes', nl: 'holandes', holandes: 'holandes',
  russian: 'ruso', ru: 'ruso', ruso: 'ruso', japanese: 'japones', ja: 'japones', japones: 'japones', chinese: 'chino', zh: 'chino', chino: 'chino',
  spanish: 'espanol', es: 'espanol', espanol: 'espanol',
};

/** Guías acreditados por el ICT, filtrados por zona, idioma y especialidad (sin contactos personales). */
export function findGuides(opts: { region?: string; language?: string; specialty?: string; limit?: number }) {
  const data = loadGuides();
  const region = norm(opts.region);
  const lang = LANG_ALIASES[norm(opts.language)] ?? norm(opts.language);
  const spec = norm(opts.specialty);
  const filtered = data.guides.filter((g) =>
    (!region || g.r.some((r) => norm(r).includes(region))) &&
    (!lang || g.l.some((l) => norm(l).includes(lang))) &&
    (!spec || g.s.some((s) => norm(s).includes(spec))),
  );
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 20);
  return {
    success: filtered.length > 0,
    totalMatches: filtered.length,
    guides: filtered.slice(0, limit).map((g) => ({ name: g.n, zones: g.r, specialties: g.s, languages: g.l, ictCredentials: g.c })),
    associations: data.associations.filter((a) => !region || norm(a.zone).includes(region) || a.zone === 'Nacional'),
    contactPolicy: 'No compartir teléfonos personales: coordinar el guía mediante la plataforma o la asociación. Disponibilidad y tarifa siempre por confirmar.',
    source: data.source,
    asOf: data.asOf,
  };
}

/** Busca tours de operadores con precio publicado, filtrando por presupuesto y operador. */
export function searchOperatorTours(opts: { query?: string; region?: string; maxPriceUSD?: number; operator?: string; limit?: number }) {
  const q = norm(opts.query);
  const region = norm(opts.region);
  const op = norm(opts.operator);
  const max = Number(opts.maxPriceUSD);
  const list = TOURS.filter((t) => t.priceSource === 'publicado_por_operador').filter((t) => {
    const hay = norm([t.title.es, t.title.en, t.description.es, t.location.placeName, t.category, t.operatorName].join(' '));
    return (!q || q.split(/\s+/).every((w) => hay.includes(w))) &&
      (!region || norm(t.region).includes(region) || norm(t.location.placeName).includes(region)) &&
      (!op || norm(t.operatorName).includes(op)) &&
      (!Number.isFinite(max) || max <= 0 || (t.priceUSD > 0 && t.priceUSD <= max));
  });
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 15);
  return {
    success: list.length > 0,
    totalMatches: list.length,
    tours: list.slice(0, limit).map((t) => ({
      id: t.id, title: t.title.es, titleEn: t.title.en, operator: t.operatorName, place: t.location.placeName,
      region: t.region, category: t.category, priceUSD: t.priceUSD > 0 ? t.priceUSD : null,
      childPriceUSD: t.childPriceUSD ?? null, durationHours: t.durationHours || null,
      priceStatus: t.priceUSD > 0 ? 'publicado_por_operador' : 'consulta_requerida',
      priceCheckedAt: t.priceCheckedAt, sourceUrl: t.sourceUrl,
    })),
    rule: 'Precio publicado por el operador (no es cotización). Disponibilidad se confirma con el operador antes de cobrar.',
  };
}
