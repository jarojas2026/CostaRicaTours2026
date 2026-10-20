import type { Language } from '../types';
import { NATIONAL_POI_GROUPS, NationalPoiGroupId, getPoiTypeLabel } from '../data/nationalPoiLayers';
import { BUSINESS_POI_LAYERS, PUBLIC_REQUEST_HINT, PUBLIC_REQUEST_LABEL, PUBLIC_REQUEST_PATH, isPublicEmergencyPoi } from '../data/publicContactPolicy';

/** Ficha pública de un punto de las capas nacionales (sin Leaflet, para poder probarla en Node). */
export interface PoiProps {
  id: string;
  grupo: NationalPoiGroupId;
  tipo: string;
  nombre?: string;
  /** Solo servicios públicos de emergencia lo traen en los datos públicos. */
  telefono?: string;
  horario?: string;
  /** Solo en capas que no son de negocios (o emergencias). */
  direccion?: string;
  aprox?: boolean;
  fuente?: string;
  detalles?: { es: string; en: string; v: string }[];
}


export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Ficha pública (HTML) de un punto de las capas nacionales. Exportada para el test de contrato. */
export const buildNationalPoiPopupHtml = (p: PoiProps, lat: number, lng: number, language: Language): string => {
  const isEs = language === 'es';
  const group = NATIONAL_POI_GROUPS.find((g) => g.id === p.grupo);
  const name = escapeHtml(p.nombre || getPoiTypeLabel(p.tipo, language));
  const type = escapeHtml(getPoiTypeLabel(p.tipo, language));
  const emergency = isPublicEmergencyPoi(p.grupo, p.tipo);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const rows: string[] = [];
  // Política pública: sin teléfono, web, correo, enlaces de reserva externos ni dirección
  // exacta de negocios. Solo los servicios públicos de emergencia muestran su teléfono oficial.
  if (p.direccion && (emergency || !BUSINESS_POI_LAYERS.has(p.grupo))) rows.push(`<div>📍 ${escapeHtml(p.direccion)}</div>`);
  if (emergency && p.telefono) rows.push(`<div>📞 <a href="tel:${escapeHtml(p.telefono.replace(/[^+\d]/g, ''))}">${escapeHtml(p.telefono)}</a></div>`);
  if (p.horario) rows.push(`<div>🕒 ${escapeHtml(p.horario)}</div>`);
  (p.detalles || []).forEach((d) => {
    rows.push(`<div><strong>${escapeHtml(isEs ? d.es : d.en)}:</strong> ${escapeHtml(d.v)}</div>`);
  });
  if (p.aprox) rows.push(`<div style="opacity:.7;font-size:10px;">⚠️ ${isEs ? 'Ubicación aproximada' : 'Approximate location'}</div>`);
  if (!emergency) rows.push(`<div style="margin-top:6px;"><a href="${PUBLIC_REQUEST_PATH}" data-public-request-cta="1" data-poi-id="${escapeHtml(String(p.id || ''))}" data-poi-grupo="${escapeHtml(String(p.grupo))}" data-poi-name="${name}" data-poi-type="${type}" style="display:inline-block;font-weight:800;padding:4px 8px;border-radius:9999px;background:#10b981;color:#041711;text-decoration:none;">💬 ${isEs ? PUBLIC_REQUEST_LABEL.es : PUBLIC_REQUEST_LABEL.en}</a><div style="font-size:10px;opacity:.75;margin-top:2px;">${isEs ? PUBLIC_REQUEST_HINT.es : PUBLIC_REQUEST_HINT.en}</div></div>`);
  rows.push(`<div><a href="${directions}" target="_blank" rel="noopener noreferrer">🧭 ${isEs ? 'Cómo llegar' : 'Directions'}</a></div>`);
  return `
    <div style="min-width:200px;max-width:280px;max-height:320px;overflow-y:auto;line-height:1.35;font-size:12px;">
      <div style="font-size:10px;font-weight:800;color:${group?.color || '#10b981'};text-transform:uppercase;">${group?.emoji || ''} ${type}</div>
      <div style="font-weight:800;font-size:13px;margin:2px 0 6px;">${name}</div>
      ${rows.join('')}
      <div style="margin-top:6px;font-size:9px;opacity:.6;">${escapeHtml(group?.attribution || '© OpenStreetMap (ODbL)')}</div>
    </div>`;
};

