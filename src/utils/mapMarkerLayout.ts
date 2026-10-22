/**
 * Utilidades puras de posicionamiento de marcas para el mapa Leaflet.
 *
 * Sin dependencias de Leaflet ni del DOM para poder probarlas en
 * tests/mapMarkerLayout.contract.test.ts. Reglas que protegen:
 * - GeoJSON guarda [lng, lat]; Leaflet recibe [lat, lng]. Toda conversión pasa por toLeafletLatLng.
 * - Varias fichas con la misma coordenada se dibujan como UNA marca con conteo
 *   (antes quedaban apiladas y solo la de arriba era clicable).
 * - Los grupos por cuadrícula son agrupaciones, no negocios: isCluster lo distingue.
 * - El tope de puntos dibujados prioriza los más cercanos al centro de la vista.
 */

export type LatLngTuple = [number, number];

/** [lng, lat] de GeoJSON → [lat, lng] de Leaflet, validando rangos. */
export function toLeafletLatLng(coordinates: readonly number[]): LatLngTuple | null {
  const [lng, lat] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

/** Clave estable de coordenada (≈11 m con 4 decimales). */
export function coordinateKey(lat: number, lng: number, decimals = 4): string {
  return `${lat.toFixed(decimals)},${lng.toFixed(decimals)}`;
}

export interface CoordinateGroup<T> {
  key: string;
  lat: number;
  lng: number;
  items: T[];
}

/** Agrupa elementos que comparten exactamente la misma coordenada (redondeada). */
export function groupByCoordinate<T>(
  items: readonly T[],
  getLatLng: (item: T) => LatLngTuple | null,
  decimals = 4,
): CoordinateGroup<T>[] {
  const groups = new Map<string, CoordinateGroup<T>>();
  for (const item of items) {
    const ll = getLatLng(item);
    if (!ll) continue;
    const key = coordinateKey(ll[0], ll[1], decimals);
    const group = groups.get(key);
    if (group) group.items.push(item);
    else groups.set(key, { key, lat: ll[0], lng: ll[1], items: [item] });
  }
  return [...groups.values()];
}

export interface GridCluster<T> {
  /** Posición de la marca: centroide si es grupo, coordenada real si es un solo punto. */
  lat: number;
  lng: number;
  count: number;
  items: T[];
  /** true = agrupación (el centroide NO es un negocio); false = un punto real. */
  isCluster: boolean;
}

/**
 * Agrupación por cuadrícula en píxeles del mundo (no de la pantalla), así el
 * resultado no cambia al desplazar el mapa, solo al cambiar de zoom.
 */
export function clusterByGrid<T>(
  items: readonly T[],
  getLatLng: (item: T) => LatLngTuple | null,
  project: (lat: number, lng: number) => { x: number; y: number },
  cellPx: number,
): GridCluster<T>[] {
  const cells = new Map<string, { latSum: number; lngSum: number; items: T[]; first: LatLngTuple }>();
  for (const item of items) {
    const ll = getLatLng(item);
    if (!ll) continue;
    const pt = project(ll[0], ll[1]);
    const key = `${Math.floor(pt.x / cellPx)}:${Math.floor(pt.y / cellPx)}`;
    const cell = cells.get(key);
    if (cell) {
      cell.latSum += ll[0];
      cell.lngSum += ll[1];
      cell.items.push(item);
    } else {
      cells.set(key, { latSum: ll[0], lngSum: ll[1], items: [item], first: ll });
    }
  }
  return [...cells.values()].map((cell) => {
    const count = cell.items.length;
    if (count === 1) return { lat: cell.first[0], lng: cell.first[1], count, items: cell.items, isCluster: false };
    return { lat: cell.latSum / count, lng: cell.lngSum / count, count, items: cell.items, isCluster: true };
  });
}


/**
 * Zoom-dependent presentation groups. A centroid represents a cluster, not the
 * physical address of an attraction or business. At high zoom the individual
 * coordinates return, while cards intentionally sharing the *same* zone
 * reference stay grouped rather than becoming inaccessible stacked markers.
 */
export function groupMapPointsAtZoom<T>(
  items: readonly T[],
  getLatLng: (item: T) => LatLngTuple | null,
  project: (lat: number, lng: number) => { x: number; y: number },
  zoom: number,
  cellPx = 64,
): GridCluster<T>[] {
  if (zoom <= 12) return clusterByGrid(items, getLatLng, project, cellPx);
  return groupByCoordinate(items, getLatLng).map(group => ({
    lat: group.lat,
    lng: group.lng,
    count: group.items.length,
    items: group.items,
    // A shared map reference is not an actual multi-operator exact address.
    isCluster: false,
  }));
}

/** Distancia aproximada (equirectangular) suficiente para ordenar por cercanía. */
function approxDistance(a: LatLngTuple, b: LatLngTuple): number {
  const x = (b[1] - a[1]) * Math.cos(((a[0] + b[0]) / 2) * (Math.PI / 180));
  const y = b[0] - a[0];
  return x * x + y * y;
}

/**
 * Aplica el tope de puntos priorizando los más cercanos al centro de la vista,
 * en vez de cortar por el orden del archivo (que dejaba zonas vacías al azar).
 */
export function limitNearestToCenter<T>(
  items: readonly T[],
  getLatLng: (item: T) => LatLngTuple | null,
  center: LatLngTuple,
  limit: number,
): { shown: T[]; total: number; truncated: boolean } {
  const total = items.length;
  if (total <= limit) return { shown: [...items], total, truncated: false };
  const ranked = items
    .map((item) => ({ item, d: (() => { const ll = getLatLng(item); return ll ? approxDistance(center, ll) : Infinity; })() }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((r) => r.item);
  return { shown: ranked, total, truncated: true };
}
