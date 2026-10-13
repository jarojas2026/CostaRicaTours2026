import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Language } from '../types';
import { NATIONAL_POI_GROUPS, NationalPoiGroupId, getPoiTypeLabel } from '../data/nationalPoiLayers';

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

const CLUSTER_UNTIL_ZOOM = 13; // por debajo de este zoom se agrupa
const CLUSTER_CELL_PX = 64;
const MAX_POINTS_RENDERED = 5000;

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
      if (web) rows.push(`<div>🌐 <a href="${escapeHtml(web)}" target="_blank" rel="noopener noreferrer">${isEs ? 'Sitio web' : 'Website'}</a></div>`);
      rows.push(`<div><a href="${directions}" target="_blank" rel="noopener noreferrer">🧭 ${isEs ? 'Cómo llegar' : 'Directions'}</a></div>`);
      return `
        <div style="min-width:180px;max-width:240px;line-height:1.35;font-size:12px;">
          <div style="font-size:10px;font-weight:800;color:${group?.color || '#10b981'};text-transform:uppercase;">${group?.emoji || ''} ${type}</div>
          <div style="font-weight:800;font-size:13px;margin:2px 0 6px;">${name}</div>
          ${rows.join('')}
          <div style="margin-top:6px;font-size:9px;opacity:.6;">© OpenStreetMap (ODbL)</div>
        </div>`;
    },
    [language, isEs]
  );

  // Dibujo según vista: clusters a zoom bajo, puntos en canvas a zoom alto
  const redraw = useCallback(() => {
    if (!map) return;
    if (!layerRef.current) layerRef.current = L.layerGroup().addTo(map);
    if (!rendererRef.current) rendererRef.current = L.canvas({ padding: 0.3 });
    const layer = layerRef.current;
    layer.clearLayers();
    if (activeFeatures.length === 0) return;

    const bounds = map.getBounds().pad(0.25);
    const zoom = map.getZoom();
    const visible = activeFeatures.filter((f) => bounds.contains([f.geometry.coordinates[1], f.geometry.coordinates[0]]));

    if (zoom < CLUSTER_UNTIL_ZOOM) {
      const cells = new Map<string, { lat: number; lng: number; count: number; sample: PoiFeature; groups: Set<NationalPoiGroupId> }>();
      visible.forEach((f) => {
        const [lng, lat] = f.geometry.coordinates;
        const pt = map.project([lat, lng], zoom);
        const key = `${Math.floor(pt.x / CLUSTER_CELL_PX)}:${Math.floor(pt.y / CLUSTER_CELL_PX)}`;
        const cell = cells.get(key);
        if (cell) {
          cell.lat += lat;
          cell.lng += lng;
          cell.count += 1;
          cell.groups.add(f.properties.grupo);
        } else {
          cells.set(key, { lat, lng, count: 1, sample: f, groups: new Set([f.properties.grupo]) });
        }
      });
      cells.forEach((cell) => {
        const lat = cell.lat / cell.count;
        const lng = cell.lng / cell.count;
        if (cell.count === 1) {
          const g = NATIONAL_POI_GROUPS.find((x) => x.id === cell.sample.properties.grupo);
          L.circleMarker([lat, lng], { renderer: rendererRef.current!, radius: 5, color: '#fff', weight: 1, fillColor: g?.color, fillOpacity: 0.9 })
            .bindPopup(buildPopup(cell.sample.properties, lat, lng))
            .addTo(layer);
          return;
        }
        const color = cell.groups.size === 1 ? NATIONAL_POI_GROUPS.find((x) => x.id === [...cell.groups][0])?.color || '#10b981' : '#0f766e';
        const size = cell.count < 10 ? 28 : cell.count < 100 ? 34 : cell.count < 1000 ? 40 : 46;
        const label = cell.count >= 1000 ? `${(cell.count / 1000).toFixed(1)}k` : String(cell.count);
        const icon = L.divIcon({
          className: 'national-poi-cluster',
          html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};color:#fff;border:2px solid rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,.35);">${label}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        L.marker([lat, lng], { icon, keyboard: false })
          .on('click', () => map.flyTo([lat, lng], Math.min(zoom + 2, 18), { duration: 0.6 }))
          .addTo(layer);
      });
      return;
    }

    visible.slice(0, MAX_POINTS_RENDERED).forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const g = NATIONAL_POI_GROUPS.find((x) => x.id === f.properties.grupo);
      L.circleMarker([lat, lng], { renderer: rendererRef.current!, radius: 7, color: '#fff', weight: 1.5, fillColor: g?.color, fillOpacity: 0.95 })
        .bindTooltip(escapeHtml(f.properties.nombre || getPoiTypeLabel(f.properties.tipo, language)), { direction: 'top', offset: [0, -6] })
        .bindPopup(buildPopup(f.properties, lat, lng))
        .addTo(layer);
    });
  }, [map, activeFeatures, buildPopup, language]);

  useEffect(() => {
    if (!map) return;
    redraw();
    map.on('moveend', redraw);
    map.on('zoomend', redraw);
    return () => {
      map.off('moveend', redraw);
      map.off('zoomend', redraw);
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
        aria-label={isEs ? 'Capas de todo Costa Rica' : 'All Costa Rica layers'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-[#051c14]/95 border border-emerald-500/40 px-4 py-2 text-sm font-bold text-emerald-50 shadow-lg hover:border-amber-400 active:scale-95 transition"
      >
        🗺️ {isEs ? 'Todo Costa Rica' : 'All of Costa Rica'}
        {totalLoaded > 0 && <span className="rounded-full bg-amber-500 px-2 text-xs text-[#041711]">{totalLoaded.toLocaleString(isEs ? 'es-CR' : 'en-US')}</span>}
      </button>

      {isOpen && (
        <div className="mt-2 w-80 max-w-[92vw] max-h-[60vh] overflow-y-auto rounded-2xl bg-[#041711]/97 border border-emerald-500/30 p-3 text-emerald-50 shadow-2xl">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isEs ? 'Buscar: soda, hospital, museo…' : 'Search: soda, hospital, museum…'}
            aria-label={isEs ? 'Buscar puntos en el mapa' : 'Search map points'}
            className="mb-3 w-full rounded-lg bg-[#051c14] border border-emerald-700/60 px-3 py-2 text-sm placeholder:text-emerald-200/50 focus:outline-none focus:border-amber-400"
          />
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
              ? 'Datos: © colaboradores de OpenStreetMap (ODbL). Verifique horarios y teléfonos antes de viajar.'
              : 'Data: © OpenStreetMap contributors (ODbL). Check hours and phone numbers before you travel.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default NationalPoiLayer;
