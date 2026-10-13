import { Language } from '../types';

/**
 * Capas nacionales de puntos de interés (POI) para el mapa de la Ciudad Digital.
 *
 * Fuente base: OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL),
 * extracto Geofabrik de Costa Rica. Archivos en /public/data/mapa/*.geojson,
 * generados con scripts/export_osm_layers.py. Se cargan bajo demanda (lazy)
 * cuando el usuario activa cada capa, para no penalizar la carga inicial.
 */
export type NationalPoiGroupId =
  | 'alimentacion'
  | 'hospedaje'
  | 'transporte'
  | 'salud'
  | 'emergencia'
  | 'naturaleza'
  | 'cultura'
  | 'atracciones'
  | 'servicios';

export interface NationalPoiGroup {
  id: NationalPoiGroupId;
  label: { es: string; en: string };
  emoji: string;
  color: string;
  file: string;
  /** Activa por defecto al abrir el panel */
  defaultOn: boolean;
}

export const NATIONAL_POI_GROUPS: NationalPoiGroup[] = [
  { id: 'naturaleza', label: { es: 'Parques, áreas protegidas y naturaleza', en: 'Parks, protected areas & nature' }, emoji: '🌳', color: '#10b981', file: '/data/mapa/naturaleza.geojson', defaultOn: true },
  { id: 'emergencia', label: { es: 'Emergencias (Cruz Roja, bomberos, policía)', en: 'Emergency (Red Cross, fire, police)' }, emoji: '🚑', color: '#ef4444', file: '/data/mapa/emergencia.geojson', defaultOn: false },
  { id: 'salud', label: { es: 'Salud (hospitales, EBAIS, farmacias)', en: 'Health (hospitals, clinics, pharmacies)' }, emoji: '🏥', color: '#f43f5e', file: '/data/mapa/salud.geojson', defaultOn: false },
  { id: 'alimentacion', label: { es: 'Sodas, restaurantes y cafés', en: 'Sodas, restaurants & cafés' }, emoji: '🍽️', color: '#f59e0b', file: '/data/mapa/alimentacion.geojson', defaultOn: false },
  { id: 'hospedaje', label: { es: 'Hospedaje (hoteles, cabinas, hostales, camping)', en: 'Lodging (hotels, cabins, hostels, camping)' }, emoji: '🛏️', color: '#8b5cf6', file: '/data/mapa/hospedaje.geojson', defaultOn: false },
  { id: 'transporte', label: { es: 'Transporte (buses, terminales, aeropuertos)', en: 'Transport (buses, terminals, airports)' }, emoji: '🚌', color: '#0ea5e9', file: '/data/mapa/transporte.geojson', defaultOn: false },
  { id: 'cultura', label: { es: 'Cultura (museos, teatros, sitios históricos)', en: 'Culture (museums, theatres, heritage)' }, emoji: '🏛️', color: '#d97706', file: '/data/mapa/cultura.geojson', defaultOn: false },
  { id: 'atracciones', label: { es: 'Atracciones turísticas', en: 'Tourist attractions' }, emoji: '📸', color: '#14b8a6', file: '/data/mapa/atracciones.geojson', defaultOn: false },
  { id: 'servicios', label: { es: 'Servicios (gasolineras, bancos, info turística)', en: 'Services (fuel, banks, tourist info)' }, emoji: '⛽', color: '#64748b', file: '/data/mapa/servicios.geojson', defaultOn: false },
];

const TYPE_LABELS_EN: Record<string, string> = {
  'Cruz Roja': 'Red Cross',
  'Hospital': 'Hospital',
  'Clínica / EBAIS': 'Clinic / EBAIS',
  'Farmacia': 'Pharmacy',
  'Bomberos': 'Fire station',
  'Policía': 'Police',
  'Área protegida': 'Protected area',
  'Volcán': 'Volcano',
  'Catarata': 'Waterfall',
  'Playa': 'Beach',
  'Mirador': 'Viewpoint',
  'Museo': 'Museum',
  'Teatro': 'Theatre',
  'Sitio histórico': 'Historic site',
  'Arte / galería': 'Art / gallery',
  'Atracción': 'Attraction',
  'Información turística': 'Tourist information',
  'Soda': 'Soda (local diner)',
  'Restaurante / café': 'Restaurant / café',
  'Terminal de bus': 'Bus terminal',
  'Aeropuerto / pista': 'Airport / airstrip',
  'Gasolinera': 'Gas station',
  'Banco / cajero': 'Bank / ATM',
  'Parada de bus': 'Bus stop',
};

const LODGING_LABELS: Record<string, { es: string; en: string }> = {
  hotel: { es: 'Hotel', en: 'Hotel' },
  motel: { es: 'Motel', en: 'Motel' },
  guest_house: { es: 'Cabinas / casa de huéspedes', en: 'Guest house / cabins' },
  hostel: { es: 'Hostal', en: 'Hostel' },
  apartment: { es: 'Apartamento turístico', en: 'Holiday apartment' },
  chalet: { es: 'Chalet', en: 'Chalet' },
  camp_site: { es: 'Camping', en: 'Campsite' },
  resort: { es: 'Resort', en: 'Resort' },
};

export const getPoiTypeLabel = (tipo: string, language: Language): string => {
  if (LODGING_LABELS[tipo]) return language === 'es' ? LODGING_LABELS[tipo].es : LODGING_LABELS[tipo].en;
  if (language === 'es') return tipo;
  return TYPE_LABELS_EN[tipo] || tipo;
};
