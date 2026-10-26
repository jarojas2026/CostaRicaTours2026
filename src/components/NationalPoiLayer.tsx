import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { X, RefreshCw } from 'lucide-react';
import type { Language } from '../types';
import { NATIONAL_POI_GROUPS, type NationalPoiGroupId, getPoiTypeLabel } from '../data/nationalPoiLayers';
import { requestCustomerIntake } from '../utils/customerIntake';
import { buildNationalPoiPopupHtml, escapeHtml } from './nationalPoiPopup';
import { clusterByGrid, groupByCoordinate, toLeafletLatLng } from '../utils/mapMarkerLayout';
import { loadNationalPoiData } from '../utils/nationalPoiData';
import { matchesNationalPoi, type NationalPoiFeature, type MapSpatialFilter } from '../utils/mapExplorerFilters';

export const OPEN_NATIONAL_LAYERS_EVENT = 'crt:open-national-layers';
export type NationalLayerSelection = Record<NationalPoiGroupId, boolean>;
export const defaultNationalLayers = (): NationalLayerSelection => Object.fromEntries(NATIONAL_POI_GROUPS.map(g => [g.id, g.defaultOn])) as NationalLayerSelection;
const emptySpatial: MapSpatialFilter = { viewport: null, onlyInView: false, radiusKm: null };
const families: { name: { es: string; en: string }; ids: NationalPoiGroupId[] }[] = [
  { name: { es: 'Naturaleza y conservación', en: 'Nature & conservation' }, ids: ['parques_sinac','naturaleza','fauna','reforestacion'] },
  { name: { es: 'Hospedaje y alimentación', en: 'Lodging & food' }, ids: ['hospedaje','alimentacion'] },
  { name: { es: 'Cultura y lugares turísticos', en: 'Culture & attractions' }, ids: ['atracciones','cultura','patrimonio'] },
  { name: { es: 'Movilidad y servicios', en: 'Transport & services' }, ids: ['transporte','servicios'] },
  { name: { es: 'Salud y emergencias', en: 'Health & emergency' }, ids: ['ccss','salud','emergencia'] },
];

interface Props {
  map: L.Map | null;
  language: Language;
  embedded?: boolean;
  renderMarkers?: boolean;
  filterResetKey?: number;
  enabledLayers?: NationalLayerSelection;
  onEnabledLayersChange?: (value: NationalLayerSelection) => void;
  searchQuery?: string;
  hideApproximate?: boolean;
  spatialFilter?: MapSpatialFilter;
  onFeaturesChange?: (features: NationalPoiFeature[]) => void;
  onSelectPoi?: (feature: NationalPoiFeature) => void;
  onSelectGroup?: (features: NationalPoiFeature[]) => void;
}
export const NationalPoiLayer: React.FC<Props> = ({ map, language, embedded = false, renderMarkers = true, filterResetKey = 0, enabledLayers, onEnabledLayersChange, searchQuery, hideApproximate = false, spatialFilter = emptySpatial, onFeaturesChange, onSelectPoi, onSelectGroup }) => {
  const isEs = language === 'es';
  const [localEnabled, setLocalEnabled] = useState(defaultNationalLayers);
  const enabled = enabledLayers ?? localEnabled;
  const changeEnabled = onEnabledLayersChange ?? setLocalEnabled;
  const [loaded, setLoaded] = useState<Partial<Record<NationalPoiGroupId, NationalPoiFeature[]>>>({});
  const [loading, setLoading] = useState<Partial<Record<NationalPoiGroupId, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<NationalPoiGroupId, boolean>>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [poiType, setPoiType] = useState('all');
  const [page, setPage] = useState(0);
  useEffect(() => { setPoiType('all'); }, [filterResetKey]);
  const [renderInfo, setRenderInfo] = useState({ places: 0, markers: 0 });
  const layerRef = useRef<L.LayerGroup | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (embedded) return;
    const open = () => setIsOpen(true);
    window.addEventListener(OPEN_NATIONAL_LAYERS_EVENT, open);
    return () => window.removeEventListener(OPEN_NATIONAL_LAYERS_EVENT, open);
  }, [embedded]);
  useEffect(() => {
    if (!isOpen || embedded) return;
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    const outside = (e: PointerEvent) => { if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) setIsOpen(false); };
    window.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside, true);
    return () => { window.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside, true); };
  }, [isOpen, embedded]);
  useEffect(() => {
    for (const group of NATIONAL_POI_GROUPS) {
      if (!enabled[group.id] || loaded[group.id] || loading[group.id] || errors[group.id]) continue;
      setLoading(prev => ({ ...prev, [group.id]: true }));
      loadNationalPoiData(group.id).then(features => {
        if (mounted.current) setLoaded(prev => ({ ...prev, [group.id]: features }));
      }).catch(() => {
        if (mounted.current) setErrors(prev => ({ ...prev, [group.id]: true }));
      }).finally(() => {
        if (mounted.current) setLoading(prev => ({ ...prev, [group.id]: false }));
      });
    }
  }, [enabled, loaded, loading, errors]);
  const types = useMemo(() => [...new Set(NATIONAL_POI_GROUPS.flatMap(g => enabled[g.id] ? (loaded[g.id] || []).map(f => f.properties.tipo) : []))].sort((a,b) => a.localeCompare(b)), [enabled, loaded]);
  // A preset must not leave an invisible stale subtype active.
  useEffect(() => { if (poiType !== 'all' && !types.includes(poiType)) setPoiType('all'); }, [poiType, types]);
  const activeFeatures = useMemo(() => NATIONAL_POI_GROUPS.flatMap(g => enabled[g.id] ? (loaded[g.id] || []).filter(f => matchesNationalPoi(f, searchQuery ?? query, poiType, hideApproximate, spatialFilter)) : []), [enabled, loaded, searchQuery, query, poiType, hideApproximate, spatialFilter]);
  useEffect(() => { onFeaturesChange?.(activeFeatures); setPage(0); }, [activeFeatures, onFeaturesChange]);
  const select = useCallback((feature: NationalPoiFeature) => {
    if (onSelectPoi) onSelectPoi(feature);
    else {
      const ll = toLeafletLatLng(feature.geometry.coordinates);
      if (ll && map) L.popup({ maxHeight: 220, maxWidth: 280 }).setLatLng(ll).setContent(buildNationalPoiPopupHtml(feature.properties, ll[0], ll[1], language)).openOn(map);
    }
  }, [onSelectPoi, map, language]);
  useEffect(() => {
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;
    const redraw = () => {
      layer.clearLayers();
      const zoom = map.getZoom();
      const bounds = map.getBounds().pad(.15);
      // Group the complete filtered dataset in world pixels before viewport culling.
      // Panning cannot change the members/centroid of a visible grid cell.
      const groups = !renderMarkers ? [] : zoom < 18
        ? clusterByGrid(activeFeatures, f => toLeafletLatLng(f.geometry.coordinates), (lat,lng) => map.project([lat,lng],zoom), zoom < 13 ? 66 : 42)
        : groupByCoordinate(activeFeatures, f => toLeafletLatLng(f.geometry.coordinates)).map(g => ({ ...g, count: g.items.length, isCluster: false }));
      let markerCount = 0;
      for (const group of groups) {
        if (!bounds.contains([group.lat,group.lng])) continue;
        const count = group.items.length;
        const meta = NATIONAL_POI_GROUPS.find(g => g.id === group.items[0].properties.grupo)!;
        const clustered = count > 1;
        const size = clustered ? (count > 999 ? 44 : 36) : 28;
        const title = clustered ? (isEs ? `${count} lugares cercanos; acercar o ver lista` : `${count} nearby places; zoom in or view list`) : `${group.items[0].properties.nombre || getPoiTypeLabel(group.items[0].properties.tipo,language)}${group.items[0].properties.aprox ? (isEs ? ' · ubicación aproximada' : ' · approximate location') : ''}`;
        const icon = L.divIcon({ className: clustered ? 'national-poi-cluster' : 'national-poi-place', html: `<div class="crt-poi-symbol${clustered ? ' crt-poi-group' : ''}" style="width:${size}px;height:${size}px;--poi-color:${meta.color};border-style:${group.items[0].properties.aprox ? 'dashed' : 'solid'}">${clustered ? count.toLocaleString(isEs ? 'es-CR' : 'en-US') : meta.emoji}</div>`, iconSize:[size,size], iconAnchor:[size / 2,size / 2] });
        const marker = L.marker([group.lat,group.lng], { icon, title, keyboard: true });
        marker.on('click', () => {
          if (!clustered) { select(group.items[0]); return; }
          const sameCoordinate = group.items.every(f => Math.abs(f.geometry.coordinates[1] - group.lat) < .0001 && Math.abs(f.geometry.coordinates[0] - group.lng) < .0001);
          if (onSelectGroup && (zoom >= 16 || sameCoordinate)) onSelectGroup(group.items);
          else map.flyTo([group.lat,group.lng],Math.min(zoom+2,18), { duration:.35 });
        }).addTo(layer);
        const element = marker.getElement();
        element?.setAttribute('aria-label',title);
        element?.setAttribute('data-lat',String(group.lat));
        element?.setAttribute('data-lng',String(group.lng));
        marker.bindTooltip(escapeHtml(title), { direction:'top', offset:[0,-size/2] });
        markerCount++;
      }
      setRenderInfo({ places: activeFeatures.filter(f => { const ll=toLeafletLatLng(f.geometry.coordinates);return ll && map.getBounds().contains(ll); }).length, markers:markerCount });
    };
    redraw();
    map.on('moveend',redraw);
    return () => { map.off('moveend',redraw); layer.remove(); layerRef.current=null; };
  }, [map, activeFeatures, language, isEs, select, onSelectGroup, renderMarkers]);
  useEffect(() => {
    if (!map || onSelectPoi) return;
    const container = map.getContainer();
    const onClick = (e: MouseEvent) => {
      const cta=(e.target as HTMLElement)?.closest<HTMLElement>('[data-public-request-cta]');
      if (!cta) return;
      e.preventDefault();
      requestCustomerIntake({ message:isEs ? `Quisiera consultar: ${cta.dataset.poiName || ''}.` : `I would like to ask about: ${cta.dataset.poiName || ''}.`,language,source:`map:poi:${cta.dataset.poiGrupo || ''}`,context:{poiId:cta.dataset.poiId,poiGroup:cta.dataset.poiGrupo} });
    };
    container.addEventListener('click',onClick);
    return () => container.removeEventListener('click',onClick);
  }, [map, onSelectPoi, language, isEs]);
  const panel = <div id="national-poi-layers-panel" className={embedded ? 'crt-national-layers' : 'crt-standalone-layers'} role="region" aria-label={isEs ? 'Selector de capas nacionales' : 'National layers selector'}>
    {!embedded && <button type="button" onClick={() => setIsOpen(false)} aria-label={isEs ? 'Cerrar selector de capas' : 'Close layers selector'}><X size={18}/></button>}
    <p className="crt-map-help">{isEs ? '14 capas disponibles. Activa solo lo que necesitas; los datos se cargan al elegir una capa.' : '14 available layers. Enable what you need; data loads only for chosen layers.'}</p>
    {NATIONAL_POI_GROUPS.some(g => enabled[g.id] && loading[g.id]) && <p className="crt-map-help" role="status">{isEs ? 'Cargando capas activas…' : 'Loading active layers…'}</p>}
    {NATIONAL_POI_GROUPS.filter(g => enabled[g.id] && errors[g.id]).map(g => <button key={g.id} className="crt-map-secondary crt-layer-retry" type="button" onClick={() => setErrors(prev => ({...prev,[g.id]:false}))} aria-label={`${isEs ? 'Reintentar capa' : 'Retry layer'} ${isEs ? g.label.es : g.label.en}`}><RefreshCw size={14}/>{isEs ? `No se pudo cargar ${g.label.es}. Reintentar` : `Could not load ${g.label.en}. Retry`}</button>)}
    {searchQuery === undefined && <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={isEs ? 'Buscar lugares' : 'Search places'} aria-label={isEs ? 'Buscar puntos en el mapa' : 'Search map points'}/>}
    <label className="crt-map-field">{isEs ? 'Tipo de lugar' : 'Place type'}<select id="map-poi-type" value={poiType} onChange={e => setPoiType(e.target.value)}><option value="all">{isEs ? 'Todos los tipos de las capas activas' : 'All types in active layers'}</option>{types.map(t=><option key={t} value={t}>{getPoiTypeLabel(t,language)}</option>)}</select></label>
    {families.map(family => <details className="crt-layer-family" key={family.ids[0]}>
      <summary>{isEs ? family.name.es : family.name.en}<span>{family.ids.filter(id=>enabled[id]).length}/{family.ids.length}</span></summary>
      {family.ids.map(id => { const g=NATIONAL_POI_GROUPS.find(g=>g.id===id)!;return <div className="crt-layer-option" key={id}><label><input type="checkbox" checked={!!enabled[id]} onChange={()=>changeEnabled({...enabled,[id]:!enabled[id]})}/><span aria-hidden="true">{g.emoji}</span><span>{isEs ? g.label.es : g.label.en}<small>{loading[id] ? (isEs ? 'Cargando…' : 'Loading…') : loaded[id] ? `${loaded[id]!.length.toLocaleString(isEs ? 'es-CR' : 'en-US')} ${isEs ? 'registros' : 'records'}` : (isEs ? 'Se carga al activar' : 'Loads when enabled')}</small></span></label></div>; })}
    </details>)}
    <p className="crt-map-help" role="status">{renderInfo.places.toLocaleString(isEs ? 'es-CR' : 'en-US')} {isEs ? 'puntos en esta vista' : 'places in this view'}{renderMarkers && <> · {renderInfo.markers} {isEs ? 'marcas agrupadas' : 'grouped markers'}</>}</p>
    <details className="crt-layer-family"><summary>{isEs ? 'Cobertura y procedencia' : 'Coverage & provenance'}</summary><p className="crt-map-help">{isEs ? 'Inventario disponible de OpenStreetMap, SINAC, CCSS y fuentes compiladas. No es un censo exhaustivo ni confirma operación, tarifas o disponibilidad. Los datos de CCSS corresponden a 2021. Los puntos aproximados llevan borde discontinuo.' : 'Available inventory from OpenStreetMap, SINAC, CCSS and compiled sources. It is not an exhaustive census or confirmation of operation, fees or availability. CCSS data dates from 2021. Approximate points have a dashed edge.'}</p></details>
    {!embedded && <div className="crt-standalone-results">{activeFeatures.slice(page*30,(page+1)*30).map((f,i)=><button key={`${f.properties.grupo}:${f.properties.id}:${i}`} type="button" onClick={()=>select(f)}>{f.properties.nombre || getPoiTypeLabel(f.properties.tipo,language)}</button>)}{activeFeatures.length>(page+1)*30 && <button onClick={()=>setPage(p=>p+1)}>{isEs ? 'Más lugares' : 'More places'}</button>}</div>}
  </div>;
  return embedded ? panel : <div ref={drawerRef} className="crt-national-standalone" data-testid="national-poi-layers"><button id="national-poi-layers-toggle" type="button" aria-expanded={isOpen} aria-controls="national-poi-layers-panel" onClick={()=>setIsOpen(v=>!v)}>{isEs ? 'Capas nacionales' : 'National layers'}</button>{isOpen && panel}</div>;
};
export default NationalPoiLayer;
