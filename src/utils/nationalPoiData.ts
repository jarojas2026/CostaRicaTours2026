import { NATIONAL_POI_GROUPS, type NationalPoiGroupId } from '../data/nationalPoiLayers';
import { toLeafletLatLng } from './mapMarkerLayout';
import type { NationalPoiFeature } from './mapExplorerFilters';
const dataCache = new Map<NationalPoiGroupId, NationalPoiFeature[]>();
const inFlight = new Map<NationalPoiGroupId, Promise<NationalPoiFeature[]>>();
export async function loadNationalPoiData(id: NationalPoiGroupId): Promise<NationalPoiFeature[]> {
  if (dataCache.has(id)) return dataCache.get(id)!;
  if (inFlight.has(id)) return inFlight.get(id)!;
  const group = NATIONAL_POI_GROUPS.find(g => g.id === id)!;
  const pending = fetch(group.file).then(async response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    if (json?.type !== 'FeatureCollection' || !Array.isArray(json.features)) throw new Error('Invalid map data');
    const features = json.features.filter((f: NationalPoiFeature) => f?.geometry?.type === 'Point' && f.properties?.grupo === id && Array.isArray(f.geometry.coordinates) && toLeafletLatLng(f.geometry.coordinates));
    dataCache.set(id, features);
    return features;
  }).finally(() => inFlight.delete(id));
  inFlight.set(id, pending);
  return pending;
}
