import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Language } from '../types';
import { X } from 'lucide-react';
import { NATIONAL_POI_GROUPS, NationalPoiGroupId, getPoiTypeLabel } from '../data/nationalPoiLayers';
import { clusterByGrid, groupByCoordinate, limitNearestToCenter, toLeafletLatLng } from '../utils/mapMarkerLayout';

/**
 * Capa nacional de puntos de interés de la Ciudad Digital.
 *
 * - Carga cada GeoJSON solo cuando el usuario activa la capa (lazy fetch + caché en memoria).
 * - Sin dependencias nuevas: agrupación por cuadrícula hecha a mano a zoom bajo
 *   y marcadores en canvas (L.canvas) a zoom alto, para manejar >20.000 puntos con fluidez.
 * - Solo dibuja lo que está dentro del área visible.
 */

interface PoiProps {
  id: string;
  grupo: NationalPoiGroupId;
  tipo: string;
  nombre?: string;
  telefono?: string;
  web?: string;
  horario?: string;
  direccion?: string;
  reserva?: string;
  aprox?: boolean;
  fuente?: string;
  detalles?: { es: string; en: string; v: string }[];
}

interface PoiFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: PoiProps;
}

interface NationalPoiLayerProps {
  map: L.Map | null;
  language: Language;
}

/** Window event other map controls dispatch to open this layer panel. */
export const OPEN_NATIONAL_LAYERS_EVENT = 'crt:open-national-layers';

const CLUSTER_UNTIL_ZOOM = 13; // por debajo de este zoom se agrupa
const CLUSTER_CELL_PX = 64;
const MAX_POINTS_RENDERED = 5000;
const MAX_STACK_IN_POPUP = 10;

const featureLatLng = (f: PoiFeature) => toLeafletLatLng(f.geometry.coordinates);

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const safeUrl = (value?: string): string | null => {
  if (!value) return null;
  const url = value.startsWith('http') ? value : `https://${value}`;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const dataCache = new Map<NationalPoiGroupId, PoiFeature[]>();

export const NationalPoiLayer: React.FC<NationalPoiLayerProps> = ({ map, language }) => {
  const isEs = language === 'es';
  const [enabled, setEnabled] = useState<Record<NationalPoiGroupId, boolean>>(() =>
    NATIONAL_POI_GROUPS.reduce((acc, g) => ({ ...acc, [g.id]: g.defaultOn }), {} as Record<NationalPoiGroupId, boolean>)
  );
  const [loaded, setLoaded] = useState<Partial<Record<NationalPoiGroupId, PoiFeature[]>>>({});
  const [loading, setLoading] = useState<Partial<Record<NationalPoiGroupId, boolean>>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const layerRef = useRef<L.LayerGroup | null>(null);
  const rendererRef = useRef<L.Canvas | null>(null);

  // Other controls (e.g. the main "Layers" bar) can open this panel.
  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener(OPEN_NATIONAL_LAYERS_EVENT, open);
    return () => window.removeEventListener(OPEN_NATIONAL_LAYERS_EVENT, open);
  }, []);

  // Cierre con Escape (rescatado de #228), además del botón X visible.
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  // Carga diferida de cada capa activada
  useEffect(() => {
    NATIONAL_POI_GROUPS.forEach((group) => {
      if (!enabled[group.id] || loaded[group.id] || loading[group.id]) return;
      const cached = dataCache.get(group.id);
      if (cached) {
        setLoaded((prev) => ({ ...prev, [group.id]: cached }));
        return;
      }
      setLoading((prev) => ({ ...prev, [group.id]: true }));
      fetch(group.file)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((json) => {
          const features: PoiFeature[] = Array.isArray(json?.features) ? json.features : [];
          dataCache.set(group.id, features);
          setLoaded((prev) => ({ ...prev, [group.id]: features }));
        })
        .catch((err) => console.warn(`No se pudo cargar la capa ${group.id}:`, err))
        .finally(() => setLoading((prev) => ({ ...prev, [group.id]: false })));
    });
  }, [enabled, loaded, loading]);

  const activeFeatures = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: PoiFeature[] = [];
    NATIONAL_POI_GROUPS.forEach((g) => {
      if (!enabled[g.id]) return;
      (loaded[g.id] || []).forEach((f) => {
        if (q && !(`${f.properties.nombre || ''} ${f.properties.tipo}`.toLowerCase().includes(q))) return;
        list.push(f);
      });
    });
    return list;
  }, [enabled, loaded, query]);

  const buildPopup = useCallback(
    (p: PoiProps, lat: number, lng: number): string => {
      const group = NATIONAL_POI_GROUPS.find((g) => g.id === p.grupo);
      const name = escapeHtml(p.nombre || getPoiTypeLabel(p.tipo, language));
      const type = escapeHtml(getPoiTypeLabel(p.tipo, language));
      const web = safeUrl(p.web);
      const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const rows: string[] = [];
      if (p.direccion) rows.push(`<div>📍 ${escapeHtml(p.direccion)}</div>`);
      if (p.telefono) rows.push(`<div>📞 <a href="tel:${escapeHtml(p.telefono.replace(/[^+\d]/g, ''))}">${escapeHtml(p.telefono)}</a></div>`);
      if (p.horario) rows.push(`<div>🕒 ${escapeHtml(p.horario)}</div>`);
      (p.detalles || []).forEach((d) => {
        rows.push(`<div><strong>${escapeHtml(isEs ? d.es : d.en)}:</strong> ${escapeHtml(d.v)}</div>`);
      });
      const booking = safeUrl(p.reserva);
      if (booking) rows.push(`<div style="margin-top:4px;"><a href="${escapeHtml(booking)}" target="_blank" rel="noopener noreferrer" style="font-weight:800;">🎟️ ${isEs ? 'Comprar entrada en el sitio oficial del SINAC' : 'Buy your ticket on the official SINAC website'}</a><div style="font-size:10px;opacity:.75;">${isEs ? 'La tarifa se paga directamente al SINAC.' : 'The fee is paid directly to SINAC.'}</div></div>`);
      if (p.aprox) rows.push(`<div style="opacity:.7;font-size:10px;">⚠️ ${isEs ? 'Ubicación aproximada' : 'Approximate location'}</div>`);
      if (web) rows.push(`<div>🌐 <a href="${escapeHtml(web)}" target="_blank" rel="noopener noreferrer">${isEs ? 'Sitio web' : 'Website'}</a></div>`);
      rows.push(`<div><a href="${directions}" target="_blank" rel="noopener noreferrer">🧭 ${isEs ? 'Cómo llegar' : 'Directions'}</a></div>`);
      return `
        <div style="min-width:200px;max-width:280px;max-height:320px;overflow-y:auto;line-height:1.35;font-size:12px;">
          <div style="font-size:10px;font-weight:800;color:${group?.color || '#10b981'};text-transform:uppercase;">${group?.emoji || ''} ${type}</div>
          <div style="font-weight:800;font-size:13px;margin:2px 0 6px;">${name}</div>
          ${rows.join('')}
          <div style="margin-top:6px;font-size:9px;opacity:.6;">${escapeHtml(group?.attribution || '© OpenStreetMap (ODbL)')}</div>
        </div>`;
    },
    [language, isEs]
  );

  const [renderInfo, setRenderInfo] = useState<{ shown: number; total: number; truncated: boolean }>({ shown: 0, total: 0, truncated: false });

  // Dibujo según vista: agrupaciones a zoom bajo, puntos en canvas a zoom alto.
  // Coordenadas: GeoJSON [lng, lat] → Leaflet [lat, lng] solo vía toLeafletLatLng.
  const redraw = useCallback(() => {
    if (!map) return;
    if (!layerRef.current) layerRef.current = L.layerGroup().addTo(map);
    if (!rendererRef.current) rendererRef.current = L.canvas({ padding: 0.3 });
    const layer = layerRef.current;
    layer.clearLayers();
    if (activeFeatures.length === 0) {
      setRenderInfo({ shown: 0, total: 0, truncated: false });
      return;
    }

    const bounds = map.getBounds().pad(0.25);
    const zoom = map.getZoom();
    const visible = activeFeatures.filter((f) => {
      const ll = featureLatLng(f);
      return !!ll && bounds.contains(ll);
    });

    const addPoint = (f: PoiFeature, ll: [number, number], radius: number, withTooltip: boolean) => {
      const g = NATIONAL_POI_GROUPS.find((x) => x.id === f.properties.grupo);
      const approx = !!f.properties.aprox;
      // Ubicación aproximada: anillo punteado y relleno tenue, para no parecer un punto exacto.
      const marker = L.circleMarker(ll, {
        renderer: rendererRef.current!,
        radius,
        color: approx ? g?.color || '#10b981' : '#fff',
        weight: approx ? 2 : 1.5,
        dashArray: approx ? '3 3' : undefined,
        fillColor: g?.color,
        fillOpacity: approx ? 0.35 : 0.95,
      });
      if (withTooltip) {
        const label = escapeHtml(f.properties.nombre || getPoiTypeLabel(f.properties.tipo, language));
        marker.bindTooltip(approx ? `${label} · ${isEs ? 'ubicación aproximada' : 'approximate location'}` : label, { direction: 'top', offset: [0, -6] });
      }
      marker.bindPopup(buildPopup(f.properties, ll[0], ll[1])).addTo(layer);
    };

    if (zoom < CLUSTER_UNTIL_ZOOM) {
      const clusters = clusterByGrid(visible, featureLatLng, (lat, lng) => map.project([lat, lng], zoom), CLUSTER_CELL_PX);
      clusters.forEach((cluster) => {
        if (!cluster.isCluster) {
          addPoint(cluster.items[0], [cluster.lat, cluster.lng], 5, false);
          return;
        }
        const groups = new Set(cluster.items.map((f) => f.properties.grupo));
        const color = groups.size === 1 ? NATIONAL_POI_GROUPS.find((x) => x.id === [...groups][0])?.color || '#10b981' : '#0f766e';
        const size = cluster.count < 10 ? 28 : cluster.count < 100 ? 34 : cluster.count < 1000 ? 40 : 46;
        const label = cluster.count >= 1000 ? `${(cluster.count / 1000).toFixed(1)}k` : String(cluster.count);
        const title = isEs ? `Grupo de ${cluster.count} puntos (no es un lugar). Clic para acercar.` : `Group of ${cluster.count} points (not a place). Click to zoom in.`;
        // Agrupación: anillo de color con centro oscuro y conteo. iconSize = tamaño real
        // del nodo raíz y ancla en su centro, así la marca no se corre al hacer zoom.
        const icon = L.divIcon({
          className: 'national-poi-cluster',
          html: `<div role="img" aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}" style="box-sizing:border-box;width:${size}px;height:${size}px;border-radius:9999px;background:rgba(4,23,17,.82);color:#fff;border:3px solid ${color};outline:2px dashed rgba(255,255,255,.7);outline-offset:1px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,.35);">${label}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        L.marker([cluster.lat, cluster.lng], { icon, keyboard: false, title })
          .on('click', () => map.flyTo([cluster.lat, cluster.lng], Math.min(zoom + 2, 18), { duration: 0.6 }))
          .addTo(layer);
      });
      setRenderInfo({ shown: visible.length, total: visible.length, truncated: false });
      return;
    }

    const center = map.getCenter();
    const { shown, total, truncated } = limitNearestToCenter(visible, featureLatLng, [center.lat, center.lng], MAX_POINTS_RENDERED);
    groupByCoordinate(shown, featureLatLng).forEach((group) => {
      if (group.items.length === 1) {
        addPoint(group.items[0], [group.lat, group.lng], 7, true);
        return;
      }
      // Varias fichas en la misma coordenada: una sola marca con conteo y ficha con la lista.
      const g = NATIONAL_POI_GROUPS.find((x) => x.id === group.items[0].properties.grupo);
      const allApprox = group.items.every((f) => f.properties.aprox);
      const size = 26;
      const title = isEs ? `${group.items.length} puntos en esta ubicación${allApprox ? ' (aproximada)' : ''}` : `${group.items.length} points at this location${allApprox ? ' (approximate)' : ''}`;
      const icon = L.divIcon({
        className: 'national-poi-stack',
        html: `<div role="img" aria-label="${escapeHtml(title)}" style="box-sizing:border-box;width:${size}px;height:${size}px;border-radius:9999px;background:${g?.color || '#10b981'};color:#fff;border:2px ${allApprox ? 'dashed' : 'solid'} #fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,.35);">${group.items.length}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const list = group.items.slice(0, MAX_STACK_IN_POPUP).map((f) => buildPopup(f.properties, group.lat, group.lng)).join('<hr style="margin:6px 0;opacity:.3;" />');
      const more = group.items.length > MAX_STACK_IN_POPUP ? `<div style="font-size:11px;opacity:.75;">${isEs ? `y ${group.items.length - MAX_STACK_IN_POPUP} más` : `and ${group.items.length - MAX_STACK_IN_POPUP} more`}</div>` : '';
      L.marker([group.lat, group.lng], { icon, keyboard: false, title })
        .bindPopup(`<div style="max-height:320px;overflow-y:auto;"><div style="font-weight:800;font-size:12px;margin-bottom:4px;">${escapeHtml(title)}</div>${list}${more}</div>`)
        .addTo(layer);
    });
    setRenderInfo({ shown: shown.length, total, truncated });
  }, [map, activeFeatures, buildPopup, language, isEs]);

  useEffect(() => {
    if (!map) return;
    redraw();
    // 'moveend' también se emite al terminar un zoom: un solo listener evita el doble redibujo.
    map.on('moveend', redraw);
    return () => {
      map.off('moveend', redraw);
    };
  }, [map, redraw]);

  // Limpieza cuando el mapa se destruye
  useEffect(() => {
    return () => {
      layerRef.current?.remove();
      layerRef.current = null;
      rendererRef.current = null;
    };
  }, [map]);

  if (!map) return null;

  const totalLoaded = activeFeatures.length;

  return (
    <div className="absolute left-4 bottom-20 z-30 pointer-events-auto max-w-[92vw]">
      <button
        type="button"
        id="national-poi-layers-toggle"
        aria-label={isEs ? 'Capas nacionales de Costa Rica (salud CCSS, parques SINAC, fauna, patrimonio y más)' : 'Costa Rica national layers (CCSS health, SINAC parks, wildlife, heritage and more)'}
        aria-expanded={isOpen}
        aria-controls="national-poi-layers-panel"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-[#051c14]/95 border border-emerald-500/40 px-4 py-2 text-sm font-bold text-emerald-50 shadow-lg hover:border-amber-400 active:scale-95 transition"
      >
        🗺️ {isEs ? 'Capas nacionales' : 'National layers'}
        <span className="hidden sm:inline text-[11px] font-semibold text-emerald-200/80">
          {isEs ? 'CCSS · SINAC · fauna · patrimonio' : 'CCSS · SINAC · wildlife · heritage'}
        </span>
        {totalLoaded > 0 && <span className="rounded-full bg-amber-500 px-2 text-xs text-[#041711]">{totalLoaded.toLocaleString(isEs ? 'es-CR' : 'en-US')}</span>}
      </button>

      {isOpen && (
        <div
          id="national-poi-layers-panel"
          role="region"
          aria-label={isEs ? 'Selector de capas nacionales' : 'National layers selector'}
          className="mt-2 w-80 max-w-[92vw] max-h-[60vh] overflow-y-auto overscroll-contain rounded-2xl bg-[#041711]/97 border border-emerald-500/30 p-3 text-emerald-50 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              {isEs ? `${NATIONAL_POI_GROUPS.length} capas nacionales` : `${NATIONAL_POI_GROUPS.length} national layers`}
            </p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={isEs ? 'Cerrar selector de capas' : 'Close layers selector'}
              className="min-h-[44px] min-w-[44px] shrink-0 rounded-full border border-emerald-500/30 bg-emerald-950/80 text-emerald-100 hover:border-amber-400 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isEs ? 'Buscar: soda, hospital, museo…' : 'Search: soda, hospital, museum…'}
            aria-label={isEs ? 'Buscar puntos en el mapa' : 'Search map points'}
            className="mb-3 w-full rounded-lg bg-[#051c14] border border-emerald-700/60 px-3 py-2 text-sm placeholder:text-emerald-200/50 focus:outline-none focus:border-amber-400"
          />
          {renderInfo.truncated && (
            <p role="status" className="mb-2 rounded-lg border border-amber-500/40 bg-amber-950/40 px-2 py-1 text-[11px] text-amber-100">
              {isEs
                ? `Se muestran los ${renderInfo.shown.toLocaleString('es-CR')} puntos más cercanos al centro de ${renderInfo.total.toLocaleString('es-CR')} en pantalla. Acerque o filtre para ver el resto.`
                : `Showing the ${renderInfo.shown.toLocaleString('en-US')} points nearest the centre out of ${renderInfo.total.toLocaleString('en-US')} on screen. Zoom in or filter to see the rest.`}
            </p>
          )}
          <p className="mb-2 text-[10px] text-emerald-200/70">
            {isEs
              ? 'Círculos con número y borde punteado = grupo de puntos (no es un lugar). Borde punteado en un punto = ubicación aproximada.'
              : 'Numbered circles with a dashed edge = group of points (not a place). Dashed edge on a point = approximate location.'}
          </p>
          <ul className="space-y-1">
            {NATIONAL_POI_GROUPS.map((g) => {
              const count = loaded[g.id]?.length;
              return (
                <li key={g.id}>
                  <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-emerald-900/40 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={!!enabled[g.id]}
                      onChange={() => setEnabled((prev) => ({ ...prev, [g.id]: !prev[g.id] }))}
                      className="accent-amber-500"
                    />
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: g.color }} />
                    <span className="flex-1">{g.emoji} {isEs ? g.label.es : g.label.en}</span>
                    <span className="text-xs text-emerald-200/70">
                      {loading[g.id] ? '…' : typeof count === 'number' ? count.toLocaleString(isEs ? 'es-CR' : 'en-US') : ''}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[10px] leading-snug text-emerald-200/60">
            {isEs
              ? 'Datos: © colaboradores de OpenStreetMap (ODbL), SINAC, CCSS, MCJ, MOPT/CONAVI y fuentes oficiales de cada proyecto. Verifique horarios, tarifas y teléfonos antes de viajar.'
              : 'Data: © OpenStreetMap contributors (ODbL), SINAC, CCSS, MCJ, MOPT/CONAVI and each project\'s official sources. Check hours, fees and phone numbers before you travel.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default NationalPoiLayer;
