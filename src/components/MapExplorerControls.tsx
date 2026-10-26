import React from 'react';
import type { Language, TourCategory, TourRegion } from '../types';
import { CATEGORIES, REGIONS } from '../data/catalogMeta';
import { getLangText } from '../utils/i18n';
export type MapLayerFilters = Record<'tours'|'hotels'|'parks'|'buses'|'trains'|'taxis'|'airports'|'airstrips',boolean>;
export type MapPreset = 'discover'|'nature'|'stay'|'transport'|'essentials'|'all';
interface Props {
 language: Language;
 layers: MapLayerFilters;
 onLayersChange: (value: MapLayerFilters) => void;
 category: TourCategory|'all'; onCategory: (value: TourCategory|'all') => void;
 difficulty: string; onDifficulty: (value: string) => void;
 region: TourRegion|'all'; onRegion: (value: TourRegion|'all') => void;
 maxDuration: number|null; onDuration: (value:number|null)=>void;
 onlyInView:boolean; onOnlyInView:(value:boolean)=>void;
 radiusKm:number|null; onRadius:(value:number|null)=>void;
 hideApproximate:boolean; onHideApproximate:(value:boolean)=>void;
 showRegions:boolean; onShowRegions:(value:boolean)=>void;
 onPreset:(preset:MapPreset)=>void; onReset:()=>void;
 children: React.ReactNode;
}
const labels: [keyof MapLayerFilters,string,string][] = [['tours','Tours y experiencias','Tours & experiences'],['hotels','Hoteles del catálogo','Catalog hotels'],['parks','Parques destacados del catálogo','Featured catalog parks'],['buses','Terminales del catálogo','Catalog bus terminals'],['trains','Trenes del catálogo','Catalog trains'],['taxis','Shuttles del catálogo','Catalog shuttles'],['airports','Aeropuertos internacionales','International airports'],['airstrips','Pistas y aeródromos','Airstrips']];
export const MapExplorerControls: React.FC<Props> = p => {
 const es=p.language==='es';
 return <div className="crt-map-filters">
  <p className="crt-map-help">{es ? 'Elige un tema y luego afina. El mapa y los resultados cambian al instante.' : 'Choose a theme, then refine. The map and results update immediately.'}</p>
  <div className="crt-map-presets" role="group" aria-label={es?'Explorar por tema':'Explore by theme'}>{([['discover','Explorar','Discover'],['nature','Naturaleza','Nature'],['stay','Dormir y comer','Stay & eat'],['transport','Moverse','Get around'],['essentials','Servicios útiles','Essentials'],['all','Todas las capas','All layers']] as const).map(([id,a,b])=><button key={id} type="button" onClick={()=>p.onPreset(id)}>{es?a:b}</button>)}</div>
  <details className="crt-layer-family" open><summary>{es?'Área de búsqueda':'Search area'}</summary>
   <label className="crt-map-check"><input id="map-only-in-view" type="checkbox" checked={p.onlyInView} onChange={e=>p.onOnlyInView(e.target.checked)}/>{es?'Solo lo visible en el mapa':'Only places in the current view'}</label>
   <label className="crt-map-field">{es?'Distancia al centro del mapa':'Distance from map center'}<select id="map-radius" value={p.radiusKm ?? ''} onChange={e=>p.onRadius(e.target.value?Number(e.target.value):null)}><option value="">{es?'Sin límite de distancia':'Any distance'}</option>{[5,10,25,50,100].map(v=><option key={v} value={v}>{v} km</option>)}</select></label>
   <p className="crt-map-help">{es?'Al desplazar el mapa cambia el centro de referencia. La distancia es en línea recta.' : 'Panning changes the reference center. Distance is measured in a straight line.'}</p>
   <label className="crt-map-check"><input type="checkbox" checked={p.hideApproximate} onChange={e=>p.onHideApproximate(e.target.checked)}/>{es?'Ocultar POI marcados como aproximados':'Hide POI marked as approximate'}</label>
  </details>
  <details className="crt-layer-family"><summary>{es?'Tours y servicios del catálogo':'Catalog tours & services'}</summary>
   {labels.map(([id,a,b])=><label key={id} className="crt-map-check"><input type="checkbox" checked={p.layers[id]} onChange={()=>p.onLayersChange({...p.layers,[id]:!p.layers[id]})}/>{es?a:b}</label>)}
   <label className="crt-map-field">{es?'Región del catálogo':'Catalog region'}<select id="map-region-filter" value={p.region} onChange={e=>p.onRegion(e.target.value as TourRegion|'all')}><option value="all">{es?'Todas las regiones':'All regions'}</option>{REGIONS.map(r=><option key={r.id} value={r.id}>{getLangText(r.name,p.language)}</option>)}</select></label>
   <label className="crt-map-field">{es?'Categoría de tour':'Tour category'}<select id="map-tour-category" value={p.category} onChange={e=>p.onCategory(e.target.value as TourCategory|'all')}><option value="all">{es?'Todas las categorías':'All categories'}</option>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{getLangText(c.name,p.language)}</option>)}</select></label>
   <label className="crt-map-field">{es?'Duración máxima del tour':'Maximum tour duration'}<select id="map-tour-duration" value={p.maxDuration ?? ''} onChange={e=>p.onDuration(e.target.value?Number(e.target.value):null)}><option value="">{es?'Cualquier duración':'Any duration'}</option>{[4,8,12,24,72].map(h=><option key={h} value={h}>{es?'Hasta':'Up to'} {h} h</option>)}</select></label>
   <label className="crt-map-field">{es?'Dificultad del tour':'Tour difficulty'}<select id="map-tour-difficulty" value={p.difficulty} onChange={e=>p.onDifficulty(e.target.value)}>{[['all','Cualquiera','Any'],['fácil','Fácil','Easy'],['moderado','Moderado','Moderate'],['exigente','Exigente','Challenging'],['por_confirmar','Por confirmar','To be confirmed']].map(([v,a,b])=><option key={v} value={v}>{es?a:b}</option>)}</select></label>
   <p className="crt-map-help">{es?'Región, categoría, dificultad y duración filtran el catálogo. Las capas nacionales usan tipo de lugar, búsqueda y área del mapa.' : 'Region, category, difficulty and duration filter the catalog. National layers use place type, search and map area.'}</p>
  </details>
  {p.children}
  <details className="crt-layer-family"><summary>{es?'Superficies y zonas':'Surfaces & areas'}</summary><label className="crt-map-check"><input type="checkbox" checked={p.showRegions} onChange={e=>p.onShowRegions(e.target.checked)}/>{es?'Mostrar zonas turísticas orientativas':'Show approximate tourism areas'}</label><p className="crt-map-help">{es?'Son zonas de orientación; no son límites oficiales de provincias ni parques.' : 'Orientation areas, not official province or park boundaries.'}</p></details>
  <button type="button" className="crt-map-secondary" id="map-reset-filters" onClick={p.onReset}>{es?'Restablecer filtros y capas iniciales':'Reset filters and initial layers'}</button>
 </div>;
};
