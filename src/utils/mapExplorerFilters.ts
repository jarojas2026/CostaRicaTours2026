import type { Language, Tour } from '../types';
import type { PoiProps } from '../components/nationalPoiPopup';
import { calculateDistanceKm } from '../data/mapServicesData';
import { toLeafletLatLng, type LatLngTuple } from './mapMarkerLayout';

export interface MapViewport {
  center: LatLngTuple;
  bounds: [number, number, number, number]; // south, west, north, east
  zoom: number;
}
export interface MapSpatialFilter {
  viewport: MapViewport | null;
  onlyInView: boolean;
  radiusKm: number | null;
}
export interface NationalPoiFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: PoiProps;
}
export const normalizeMapSearch = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
export function matchesMapSearch(query: string, values: readonly unknown[]): boolean {
  const tokens = normalizeMapSearch(query).split(/\s+/).filter(Boolean);
  const haystack = normalizeMapSearch(values.filter(v => typeof v === 'string').join(' '));
  return tokens.every(token => haystack.includes(token));
}
export function matchesMapSpatialFilter(ll: LatLngTuple | null, filter: MapSpatialFilter): boolean {
  if (!ll || !ll.every(Number.isFinite)) return false;
  if (!filter.viewport) return true;
  const { bounds: [south, west, north, east], center } = filter.viewport;
  if (filter.onlyInView && (ll[0] < south || ll[0] > north || ll[1] < west || ll[1] > east)) return false;
  return filter.radiusKm === null || calculateDistanceKm(center[0], center[1], ll[0], ll[1]) <= filter.radiusKm;
}
export function matchesNationalPoi(f: NationalPoiFeature, query: string, type: string, hideApproximate: boolean, spatial: MapSpatialFilter): boolean {
  const p = f.properties;
  return (!hideApproximate || !p.aprox)
    && (type === 'all' || p.tipo === type)
    && matchesMapSearch(query, [p.nombre, p.tipo, p.direccion])
    && matchesMapSpatialFilter(toLeafletLatLng(f.geometry.coordinates), spatial);
}
export function matchesTourDuration(tour: Tour, maxHours: number | null): boolean {
  return maxHours === null || (Number.isFinite(tour.durationHours) && tour.durationHours > 0 && tour.durationHours <= maxHours);
}
export function mapReferenceLabel(language: Language): string {
  return language === 'es' ? 'Referencia del catálogo · confirmar el punto de encuentro' : 'Catalog reference · confirm the meeting point';
}
