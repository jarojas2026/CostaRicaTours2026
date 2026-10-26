import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { REGIONS_DATA } from '../data/regionsData';
import { REGIONS_GEOJSON } from '../data/regionsGeoJson';
import { TourRegion, Language, Currency, Tour, TourCategory } from '../types';
import { 
  MapPin, 
  Navigation, 
  X, 
  RefreshCw, 
  Plus, 
  Minus, 
  LocateFixed, 
  Maximize2, 
  Minimize2, 
  Layers, 
  Search, 
  Filter, 
  Compass, 
  Download, 
  Check, 
  Flame, 
  Trees, 
  Zap, 
  Sun, 
  Waves, 
  Coffee, 
  Sparkles,
  Info,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Building2,
  Bus,
  Car,
  Plane,
  ExternalLink,
  Route,
  Trash2,
  ArrowRight,
  Clock,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { formatCurrency, getLangText } from '../utils/i18n';
import { useMoney } from '../hooks/useMoney';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap as useGoogleMap } from '@vis.gl/react-google-maps';
import { 
  MAP_TOURISM_SERVICES, 
  MapTourismService, 
  MapServiceType, 
  calculateDistanceKm, 
  estimateTravelTime 
} from '../data/mapServicesData';
import { MapServiceBookingModal } from './MapServiceBookingModal';
import { NationalPoiLayer, OPEN_NATIONAL_LAYERS_EVENT, defaultNationalLayers, type NationalLayerSelection } from './NationalPoiLayer';
import { MapExplorerControls, type MapLayerFilters, type MapPreset } from './MapExplorerControls';
import { NATIONAL_POI_GROUPS, getPoiTypeLabel } from '../data/nationalPoiLayers';
import { matchesMapSearch, matchesMapSpatialFilter, matchesTourDuration, mapReferenceLabel, type MapViewport, type MapSpatialFilter, type NationalPoiFeature } from '../utils/mapExplorerFilters';
import { buildNationalPoiPopupHtml, escapeHtml } from './nationalPoiPopup';
import { requestCustomerIntake } from '../utils/customerIntake';
import './MapExplorer.css';
import { groupMapPointsAtZoom } from '../utils/mapMarkerLayout';
import { PRICE_ON_REQUEST, REFERENCE_PRICE_NOTE, getMapServiceUnitPriceUSD } from '../utils/mapServicePricing';
import { PUBLIC_REQUEST_LABEL } from '../data/publicContactPolicy';
import { withStorageScope } from '../hooks/useStorageScope';
import { getPersonalItem, setPersonalItem } from '../utils/privateStorage';


const OFFLINE_CACHE_KEY = 'pura_vida_offline_map_tours_v3';
const OFFLINE_REGIONS_KEY = 'pura_vida_offline_map_regions_v3';

export interface ItineraryStopItem {
  id: string;
  name: string;
  type: 'tour' | MapServiceType;
  lat: number;
  lng: number;
  icon: string;
  locationName: string;
  priceUSD?: number;
  originalObject?: Tour | MapTourismService;
}

interface InteractiveMapProps {
  language: Language;
  currency?: Currency;
  tours?: Tour[];
  selectedRegion: TourRegion | 'all';
  onSelectRegion: (r: TourRegion | 'all') => void;
  onExploreRegionTours?: (r: TourRegion) => void;
  onSelectTour?: (tour: Tour) => void;
  onExitMap?: () => void;
  onOpenItineraryTab?: () => void;
  onOpenLocalBusesModal?: () => void;
}

type TileLayerKey = 'satellite' | 'voyager' | 'topo';

interface TileLayerConfig {
  name: { es: string; en: string };
  url: string;
  attribution: string;
  maxZoom: number;
  icon: string;
}

const TILE_LAYERS: Record<TileLayerKey, TileLayerConfig> = {
  voyager: {
    name: { es: 'Explorador Ecoturismo', en: 'Ecotourism Explorer' },
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    icon: '🗺️'
  },
  satellite: {
    name: { es: 'Satélite Natural HD', en: 'HD Natural Satellite' },
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
    icon: '🛰️'
  },
  topo: {
    name: { es: 'Topográfico & Relieve', en: 'Topography & Relief' },
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data &copy; OpenStreetMap, SRTM | Map style &copy; OpenTopoMap (CC BY-SA)',
    maxZoom: 17,
    icon: '⛰️'
  }
};

interface RegionNavOption {
  id: TourRegion | 'all';
  name: { es: string; en: string };
  icon: string;
  lat: number;
  lng: number;
  zoom: number;
}

const REGION_NAV_ITEMS: RegionNavOption[] = [
  { id: 'all', name: { es: '🇨🇷 Todo Costa Rica', en: '🇨🇷 All Costa Rica' }, icon: '🇨🇷', lat: 9.7489, lng: -83.7534, zoom: 8 },
  { id: 'arenal', name: { es: '🌋 La Fortuna / Arenal', en: '🌋 Arenal Volcano' }, icon: '🌋', lat: 10.4678, lng: -84.6427, zoom: 12 },
  { id: 'monteverde', name: { es: '🌿 Monteverde (Nuboso)', en: '🌿 Monteverde' }, icon: '🌿', lat: 10.3015, lng: -84.8142, zoom: 12 },
  { id: 'manuel_antonio', name: { es: '🐒 Manuel Antonio', en: '🐒 Manuel Antonio' }, icon: '🐒', lat: 9.3891, lng: -84.1416, zoom: 12 },
  { id: 'guanacaste', name: { es: '🏖️ Guanacaste & Tamarindo', en: '🏖️ Guanacaste' }, icon: '🏖️', lat: 10.5960, lng: -85.5414, zoom: 10 },
  { id: 'tortuguero', name: { es: '🐢 Tortuguero (Caribe N.)', en: '🐢 Tortuguero' }, icon: '🐢', lat: 10.5415, lng: -83.5020, zoom: 12 },
  { id: 'osa', name: { es: '🐆 Corcovado / Osa', en: '🐆 Corcovado / Osa' }, icon: '🐆', lat: 8.5379, lng: -83.5641, zoom: 11 },
  { id: 'caribe', name: { es: '🏄 Caribe Sur / Puerto Viejo', en: '🏄 South Caribbean' }, icon: '🏄', lat: 9.6560, lng: -82.7535, zoom: 12 },
  { id: 'pacuare', name: { es: '🌊 Río Pacuare', en: '🌊 Pacuare River' }, icon: '🌊', lat: 9.8656, lng: -83.5658, zoom: 12 },
  { id: 'san_jose', name: { es: '☕ San José / Valle Central', en: '☕ Central Valley' }, icon: '☕', lat: 9.9281, lng: -84.0907, zoom: 11 }
];

function getCategoryColorAndEmoji(category: string): { bg: string; text: string; emoji: string } {
  switch (category) {
    case 'volcanoes':
      return { bg: 'bg-amber-500', text: 'text-amber-950', emoji: '🌋' };
    case 'canopy':
      return { bg: 'bg-emerald-500', text: 'text-emerald-950', emoji: '🪂' };
    case 'wildlife':
      return { bg: 'bg-teal-500', text: 'text-teal-950', emoji: '🦥' };
    case 'beaches':
      return { bg: 'bg-cyan-500', text: 'text-cyan-950', emoji: '🏄' };
    case 'rafting':
      return { bg: 'bg-blue-500', text: 'text-blue-950', emoji: '🛶' };
    case 'culture':
      return { bg: 'bg-orange-500', text: 'text-orange-950', emoji: '☕' };
    default:
      return { bg: 'bg-emerald-500', text: 'text-emerald-950', emoji: '📍' };
  }
}

function getServiceIconAndColor(type: MapServiceType): { emoji: string; bg: string; border: string; label: { es: string; en: string } } {
  switch (type) {
    case 'hotel':
      return { emoji: '🏨', bg: 'bg-amber-500', border: 'border-amber-300', label: { es: 'Hotel / Lodge', en: 'Hotel / Lodge' } };
    case 'national_park':
      return { emoji: '🌿', bg: 'bg-emerald-600', border: 'border-emerald-300', label: { es: 'Parque SINAC', en: 'SINAC Park' } };
    case 'bus_station':
      return { emoji: '🚌', bg: 'bg-blue-600', border: 'border-blue-300', label: { es: 'Estación de Bus', en: 'Bus Station' } };
    case 'train_station':
      return { emoji: '🚆', bg: 'bg-teal-600', border: 'border-teal-300', label: { es: 'Tren INCOFER', en: 'INCOFER Train' } };
    case 'taxi_stand':
      return { emoji: '🚕', bg: 'bg-yellow-500', border: 'border-yellow-300', label: { es: 'Taxi / Shuttle', en: 'Taxi / Shuttle' } };
    case 'airport':
      return { emoji: '✈️', bg: 'bg-purple-600', border: 'border-purple-300', label: { es: 'Aeropuerto Int.', en: 'Intl Airport' } };
    case 'airstrip':
      return { emoji: '🛩️', bg: 'bg-sky-500', border: 'border-sky-300', label: { es: 'Pista Avioneta', en: 'Airstrip' } };
    default:
      return { emoji: '📍', bg: 'bg-emerald-500', border: 'border-emerald-300', label: { es: 'Punto Turístico', en: 'Tourism Point' } };
  }
}

// Sub-component for Google Maps view if user has key
function GoogleMapViewController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useGoogleMap();
  useEffect(() => {
    if (map) {
      map.panTo({ lat: center[0], lng: center[1] });
      map.setZoom(zoom);
    }
  }, [center, zoom, map]);
  return null;
}

const InteractiveMapComponent: React.FC<InteractiveMapProps> = ({
  language,
  currency = 'USD',
  tours = [],
  selectedRegion,
  onSelectRegion,
  onExploreRegionTours,
  onSelectTour,
  onExitMap,
  onOpenItineraryTab,
  onOpenLocalBusesModal
}) => {
  const money = useMoney(currency, language);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  // Instancia reactiva del mapa para capas hijas (capas nacionales de POI)
  const [leafletMapInstance, setLeafletMapInstance] = useState<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const itineraryMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  // Selection states
  const [selectedMapTour, setSelectedMapTourState] = useState<Tour | null>(null);
  const [selectedMapService, setSelectedMapServiceState] = useState<MapTourismService | null>(null);
  const [activeBookingService, setActiveBookingService] = useState<MapTourismService | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Layer & UI states
  const [activeLayer, setActiveLayer] = useState<TileLayerKey>('topo');
  const [currentZoom, setCurrentZoom] = useState<number>(8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [showRegionPills, setShowRegionPills] = useState<boolean>(false);
  const [showItineraryDrawer, setShowItineraryDrawer] = useState<boolean>(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState<boolean>(false);

  // Service Layer Filters Toggles
  const initialCatalogLayers: MapLayerFilters = { tours:true, hotels:false, parks:false, buses:false, trains:false, taxis:false, airports:false, airstrips:false };
  const [layerFilters, setLayerFilters] = useState<MapLayerFilters>(initialCatalogLayers);
  const [nationalLayers, setNationalLayers] = useState<NationalLayerSelection>(defaultNationalLayers);
  const [nationalFilterReset, setNationalFilterReset] = useState(0);
  const [dockTab, setDockTab] = useState<'layers'|'results'|'tools'|null>(null);
  const [selectedPoi, setSelectedPoi] = useState<NationalPoiFeature|null>(null);
  type ResultItem = { id:string; title:string; subtitle:string; icon:string; ll:[number,number]; tour?:Tour; service?:MapTourismService; poi?:NationalPoiFeature };
  const [selectedGroup, setSelectedGroup] = useState<ResultItem[]|null>(null);
  const [poiResults, setPoiResults] = useState<NationalPoiFeature[]>([]);
  const [viewport, setViewport] = useState<MapViewport|null>(null);
  const [onlyInView, setOnlyInView] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number|null>(null);
  const [hideApproximate, setHideApproximate] = useState(false);
  const [maxDuration, setMaxDuration] = useState<number|null>(null);
  const [showRegionAreas, setShowRegionAreas] = useState(false);
  const [resultPage, setResultPage] = useState(0);
  const [tileError, setTileError] = useState(false);
  const spatialFilter = useMemo<MapSpatialFilter>(() => ({ viewport: onlyInView || radiusKm !== null ? viewport : null, onlyInView, radiusKm }), [viewport, onlyInView, radiusKm]);
  const openDock = useCallback((tab:'layers'|'results'|'tools'|'itinerary'|'calculator'|null) => {
    setSelectedMapTourState(null); setSelectedMapServiceState(null); setSelectedPoi(null); setSelectedGroup(null);
    setShowItineraryDrawer(tab==='itinerary'); setShowCalculatorModal(tab==='calculator');
    setDockTab(tab==='layers'||tab==='results'||tab==='tools' ? tab : null);
  }, []);
  const setSelectedMapTour = useCallback((tour:Tour|null) => {
    setSelectedMapTourState(tour);
    if(tour){setSelectedMapServiceState(null);setSelectedPoi(null);setSelectedGroup(null);setShowItineraryDrawer(false);setShowCalculatorModal(false);setDockTab(null);}
  }, []);
  const setSelectedMapService = useCallback((service:MapTourismService|null) => {
    setSelectedMapServiceState(service);
    if(service){setSelectedMapTourState(null);setSelectedPoi(null);setSelectedGroup(null);setShowItineraryDrawer(false);setShowCalculatorModal(false);setDockTab(null);}
  }, []);
  const selectPoi = useCallback((poi:NationalPoiFeature) => {
    openDock(null); setSelectedPoi(poi);
    const [lng,lat]=poi.geometry.coordinates;
    leafletMapRef.current?.flyTo([lat,lng],Math.max(leafletMapRef.current.getZoom(),14),{duration:.4});
  }, [openDock]);
  const selectPoiGroup = useCallback((features:NationalPoiFeature[]) => {
    openDock(null); setSelectedGroup(features.map(poi=>({id:`poi:${poi.properties.grupo}:${poi.properties.id}`,title:poi.properties.nombre||getPoiTypeLabel(poi.properties.tipo,language),subtitle:getPoiTypeLabel(poi.properties.tipo,language),icon:NATIONAL_POI_GROUPS.find(g=>g.id===poi.properties.grupo)?.emoji||'📍',ll:[poi.geometry.coordinates[1],poi.geometry.coordinates[0]],poi})));
  }, [openDock,language]);
  const activePanel = selectedPoi ? 'poi' : selectedGroup ? 'group' : selectedMapTour ? 'tour' : selectedMapService ? 'service' : showItineraryDrawer ? 'itinerary' : showCalculatorModal ? 'calculator' : dockTab;
  useEffect(() => {
    const open=()=>openDock('layers');
    window.addEventListener(OPEN_NATIONAL_LAYERS_EVENT,open);
    return()=>window.removeEventListener(OPEN_NATIONAL_LAYERS_EVENT,open);
  },[openDock]);
  useEffect(()=>{const map=leafletMapInstance;if(!map)return;const close=()=>openDock(null);map.on('click',close);return()=>{map.off('click',close);};},[leafletMapInstance,openDock]);
  useEffect(() => {
    if (!leafletMapInstance) return;
    const canvas = leafletMapInstance.getContainer();
    let start: { id: number; x: number; y: number } | null = null;
    const down = (event: PointerEvent) => { start = { id: event.pointerId, x: event.clientX, y: event.clientY }; };
    const cancel = () => { start = null; };
    const up = (event: PointerEvent) => {
      const origin = start; start = null;
      if (!origin || origin.id !== event.pointerId || Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>8) return;
      if ((event.target as Element).closest('.leaflet-marker-icon,.leaflet-control,.leaflet-tooltip')) return;
      openDock(null);
    };
    // Capture a genuine background tap even when Leaflet suppresses a mobile click.
    canvas.addEventListener('pointerdown',down,{passive:true});
    canvas.addEventListener('pointerup',up,{passive:true});
    canvas.addEventListener('pointercancel',cancel,{passive:true});
    return () => { canvas.removeEventListener('pointerdown',down); canvas.removeEventListener('pointerup',up); canvas.removeEventListener('pointercancel',cancel); };
  }, [leafletMapInstance,openDock]);
  useEffect(() => {
    if(!activePanel)return;
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){openDock(null);document.getElementById('national-poi-layers-toggle')?.focus();}};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[activePanel,openDock]);
  useEffect(() => {
    const map=leafletMapInstance;if(!map)return;
    const publish=()=>{const center=map.getCenter(),b=map.getBounds();setViewport({center:[center.lat,center.lng],bounds:[b.getSouth(),b.getWest(),b.getNorth(),b.getEast()],zoom:map.getZoom()});};
    publish();map.on('moveend',publish);return()=>{map.off('moveend',publish);};
  },[leafletMapInstance]);
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState<TourCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);

  // Itinerary Builder State
  const [itineraryStops, setItineraryStops] = useState<ItineraryStopItem[]>(() => {
    try {
      const saved = getPersonalItem('costa_rica_map_itinerary_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Itinerario personal: sessionStorage para visitantes, clave con uid para usuarios
  useEffect(() => {
    try {
      setPersonalItem('costa_rica_map_itinerary_v1', JSON.stringify(itineraryStops));
    } catch (e) {
      console.warn('Could not save itinerary to storage:', e);
    }
  }, [itineraryStops]);

  // Route Calculator Selection State
  const [calcOrigin, setCalcOrigin] = useState<string>('airport-sjo');
  const [calcDestination, setCalcDestination] = useState<string>('park-volcan-arenal');

  // Offline caching
  const [isCached, setIsCached] = useState(false);
  const [cachedTourCount, setCachedTourCount] = useState(0);

  // Optional Google Maps mode
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [useGoogleMapsMode, setUseGoogleMapsMode] = useState<boolean>(false);

  // Load offline data if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIsCached(true);
          setCachedTourCount(parsed.length);
        }
      }
    } catch (e) {
      console.warn('Error reading offline cache:', e);
    }
  }, []);

  const handleDownloadOffline = () => {
    try {
      localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(tours));
      localStorage.setItem(OFFLINE_REGIONS_KEY, JSON.stringify(REGIONS_DATA));
      localStorage.setItem('map_services_offline_v3', JSON.stringify(MAP_TOURISM_SERVICES));
      setIsCached(true);
      setCachedTourCount(tours.length + MAP_TOURISM_SERVICES.length);
      const msg = language === 'es'
        ? `¡Mapa, ${tours.length} tours y ${MAP_TOURISM_SERVICES.length} servicios turísticos (hoteles, parques, buses, trenes y aeródromos) guardados para consulta sin conexión!`
        : `Map, ${tours.length} tours, and ${MAP_TOURISM_SERVICES.length} tourism services (hotels, parks, buses, trains & airstrips) saved for offline use!`;
      alert(msg);
    } catch (err) {
      alert(language === 'es' ? 'No se pudo guardar la memoria local.' : 'Could not save to local storage.');
    }
  };

  // Filtered tours
  const effectiveTours = useMemo(() => {
    if (!layerFilters.tours) return [];
    return tours.filter((tour) => {
      if (!matchesMapSearch(deferredSearch,[getLangText(tour.title,language),getLangText(tour.subtitle,language),getLangText(tour.description,language),tour.location?.placeName])) return false;
      if (!matchesTourDuration(tour,maxDuration)) return false;
      if (!matchesMapSpatialFilter(tour.location ? [tour.location.lat,tour.location.lng] : null,spatialFilter)) return false;
      if (selectedRegion !== 'all' && tour.region !== selectedRegion) {
        return false;
      }

      if (selectedCategory !== 'all' && tour.category !== selectedCategory) {
        return false;
      }

      if (selectedDifficulty !== 'all' && tour.difficulty !== selectedDifficulty) {
        return false;
      }

      return true;
    });
  }, [tours, deferredSearch, maxDuration, spatialFilter, selectedRegion, selectedCategory, selectedDifficulty, language, layerFilters.tours]);

  // Filtered tourism services (hotels, parks, transport, etc.)
  const effectiveServices = useMemo(() => {
    return MAP_TOURISM_SERVICES.filter((srv) => {
      // Check category layer toggle
      if (srv.type === 'hotel' && !layerFilters.hotels) return false;
      if (srv.type === 'national_park' && !layerFilters.parks) return false;
      if (srv.type === 'bus_station' && !layerFilters.buses) return false;
      if (srv.type === 'train_station' && !layerFilters.trains) return false;
      if (srv.type === 'taxi_stand' && !layerFilters.taxis) return false;
      if (srv.type === 'airport' && !layerFilters.airports) return false;
      if (srv.type === 'airstrip' && !layerFilters.airstrips) return false;

      // Region filter
      if (selectedRegion !== 'all' && srv.region !== selectedRegion) {
        return false;
      }

      if (!matchesMapSearch(deferredSearch,[getLangText(srv.name,language),getLangText(srv.subtitle,language),getLangText(srv.address,language),getLangText(srv.description,language)])) return false;
      if (!matchesMapSpatialFilter([srv.coordinates.lat,srv.coordinates.lng],spatialFilter)) return false;

      return true;
    });
  }, [layerFilters, selectedRegion, deferredSearch, spatialFilter, language]);

  // Counts for each category
  const serviceCounts = useMemo(() => {
    const counts = {
      tours: effectiveTours.length,
      hotels: MAP_TOURISM_SERVICES.filter(s => s.type === 'hotel').length,
      parks: MAP_TOURISM_SERVICES.filter(s => s.type === 'national_park').length,
      buses: MAP_TOURISM_SERVICES.filter(s => s.type === 'bus_station').length,
      trains: MAP_TOURISM_SERVICES.filter(s => s.type === 'train_station').length,
      taxis: MAP_TOURISM_SERVICES.filter(s => s.type === 'taxi_stand').length,
      airports: MAP_TOURISM_SERVICES.filter(s => s.type === 'airport').length,
      airstrips: MAP_TOURISM_SERVICES.filter(s => s.type === 'airstrip').length
    };
    return counts;
  }, [effectiveTours.length]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (useGoogleMapsMode) return;
    if (!mapContainerRef.current) return;
    if (leafletMapRef.current) return;

    let initialLat = 9.7489;
    let initialLng = -83.7534;
    let initialZoom = 8;

    if (selectedRegion !== 'all') {
      const regionNav = REGION_NAV_ITEMS.find((r) => r.id === selectedRegion);
      if (regionNav) {
        initialLat = regionNav.lat;
        initialLng = regionNav.lng;
        initialZoom = regionNav.zoom;
      }
    }

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: true,
      keyboard: true,
      maxBoundsViscosity: 0.8
    });

    map.setMaxBounds([
      [2, -92],
      [18, -77]
    ]);
    // Fit the mainland to the actual canvas, including narrow mobile screens.
    // Cocos Island stays reachable through its dedicated navigation action.
    if (selectedRegion === 'all') map.fitBounds([[8.0, -86.0], [11.3, -82.5]], { padding: [20, 30], maxZoom: 8 });

    const layerConfig = TILE_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: 18,
      maxNativeZoom: layerConfig.maxZoom
    }).addTo(map);

    tileLayer.on('tileerror',()=>setTileError(true));
    tileLayer.on('tileload',()=>setTileError(false));
    tileLayerRef.current = tileLayer;

    // Markers layer group
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    // Itinerary markers & polyline group
    const itineraryGroup = L.layerGroup().addTo(map);
    itineraryMarkersLayerRef.current = itineraryGroup;

    // GeoJSON region layer
    const geoJsonLayer = L.geoJSON(REGIONS_GEOJSON as any, {
      style: (feature) => {
        const id = feature?.properties?.id;
        const isSelected = selectedRegion === id;
        return {
          color: feature?.properties?.color || '#10b981',
          weight: isSelected ? 3 : 1.5,
          opacity: 0.8,
          fillColor: feature?.properties?.color || '#10b981',
          fillOpacity: isSelected ? 0.35 : 0.12
        };
      },
      onEachFeature: (feature, layer) => {
        const id = feature.properties?.id;
        const name = feature.properties?.name;
        
        layer.bindTooltip(`<b>${name}</b><br/>${language === 'es' ? 'Clic para filtrar región' : 'Click to filter region'}`, {
          direction: 'top'
        });

        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({ weight: 3, fillOpacity: 0.3 });
          },
          mouseout: (e) => {
            const l = e.target;
            const isSelected = selectedRegion === id;
            l.setStyle({
              weight: isSelected ? 3 : 1.5,
              fillOpacity: isSelected ? 0.35 : 0.12
            });
          },
          click: () => {
            onSelectRegion(id as TourRegion);
            const target = REGION_NAV_ITEMS.find((r) => r.id === id);
            if (target && leafletMapRef.current) {
              leafletMapRef.current.flyTo([target.lat, target.lng], target.zoom, { duration: 1.2 });
            }
          }
        });
      }
    });

    geoJsonLayerRef.current = geoJsonLayer;

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });
    setCurrentZoom(map.getZoom());

    leafletMapRef.current = map;
    setLeafletMapInstance(map);

    // Estado de la vista expuesto como atributos data-* (lo usan los e2e de regresión de posición).
    const container = mapContainerRef.current;
    const publishView = () => {
      const c = map.getCenter();
      container.dataset.zoom = String(map.getZoom());
      container.dataset.centerLat = String(c.lat);
      container.dataset.centerLng = String(c.lng);
    };
    publishView();
    map.on('moveend', publishView);

    // El contenedor cambia de tamaño sin que cambie la ventana (cabecera que se pliega,
    // paneles, pantalla completa, barra del navegador móvil). Sin invalidateSize Leaflet
    // conserva el tamaño viejo: el zoom se ancla en un centro falso y las marcas parecen
    // desplazarse respecto a lo que el usuario ve. ResizeObserver lo corrige en cada cambio.
    let resizeFrame = 0;
    let initialFitPending = selectedRegion === 'all';
    const preserveUserView = () => { initialFitPending = false; };
    map.on('dragstart zoomstart', preserveUserView);
    const handleResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const center = map.getCenter();
        map.invalidateSize({ pan: false, debounceMoveend: true });
        // Keep the chosen geographic center when a dock changes canvas size.
        map.setView(center, map.getZoom(), { animate: false });
        if (initialFitPending) {
          initialFitPending = false;
          map.fitBounds([[8.0, -86.0], [11.3, -82.5]], { padding: [20, 30], maxZoom: 8, animate: false });
        }
        publishView();
      });
    };
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    const resizeTimer = setTimeout(handleResize, 250);

    return () => {
      resizeObserver?.disconnect();
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      clearTimeout(resizeTimer);
      map.off('dragstart zoomstart', preserveUserView);
      map.off('moveend', publishView);
      map.remove();
      leafletMapRef.current = null;
      setLeafletMapInstance(null);
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      itineraryMarkersLayerRef.current = null;
    };
  }, [useGoogleMapsMode]);

  // Reactive Fly to Region
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const target = REGION_NAV_ITEMS.find((r) => r.id === selectedRegion);
    if (target) {
      leafletMapRef.current.flyTo([target.lat, target.lng], target.zoom, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }

    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.eachLayer((layer: any) => {
        const id = layer.feature?.properties?.id;
        const isActuallySelected = selectedRegion === id;
        layer.setStyle({
          weight: isActuallySelected ? 3 : 1.5,
          fillOpacity: isActuallySelected ? 0.35 : (selectedRegion === 'all' ? 0.12 : 0.05)
        });
      });
    }
  }, [selectedRegion]);

  useEffect(()=>{const map=leafletMapInstance,layer=geoJsonLayerRef.current;if(!map||!layer)return;if(showRegionAreas)layer.addTo(map);else layer.remove();},[leafletMapInstance,showRegionAreas]);

  // Update Tile Layer
  useEffect(() => {
    if (!leafletMapRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.remove();

    const layerConfig = TILE_LAYERS[activeLayer];
    const newTileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: 18,
      maxNativeZoom: layerConfig.maxZoom
    }).addTo(leafletMapRef.current);

    setTileError(false);
    newTileLayer.on('tileerror',()=>setTileError(true));
    newTileLayer.on('tileload',()=>setTileError(false));
    tileLayerRef.current = newTileLayer;
  }, [activeLayer]);

  // =========================================================
  // RENDER PINS ON LEAFLET MAP (TOURS + ALL TOURISM SERVICES)
  // =========================================================
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // 1. Render Tours Pins
    // Muchos tours comparten la coordenada de referencia de su zona (p. ej. 17 en Caño Negro).
    // Apilados, solo el de arriba era clicable y parecían un único negocio: se agrupan en una
    // marca con conteo, marcada como ubicación aproximada de la zona.
    const map = leafletMapRef.current;
    const zoom = map.getZoom();
    // Use geographic world pixels, not screen-relative pixels; panning must
    // not move the grouping centroid. On close zoom we keep original anchors.
    const projectPoint = (lat: number, lng: number) => {
      const point = map.project([lat, lng], zoom);
      return { x: point.x, y: point.y };
    };
    const tourGroups = groupMapPointsAtZoom(effectiveTours, (tour) =>
      Number.isFinite(tour.location?.lat) && Number.isFinite(tour.location?.lng)
        ? [tour.location.lat, tour.location.lng] : null,
      projectPoint, zoom
    );
    tourGroups.forEach((group) => {
      if (group.items.length > 1) {
        const groupTours = group.items;
        const hasSelected = groupTours.some((t) => t.id === selectedMapTour?.id);
        const zoneName = groupTours[0].location.placeName || (groupTours[0].location as any).name || '';
        const stackHtml = `
          <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer">
            <div class="relative bg-white border-2 border-dashed ${hasSelected ? 'border-emerald-700 shadow-lg' : 'border-emerald-500 shadow-sm'} rounded-full w-full h-full flex items-center justify-center">
              <span class="text-[12px] font-black text-emerald-800 leading-none">${groupTours.length}</span>
            </div>
          </div>
        `;
        const stackIcon = L.divIcon({
          className: 'custom-tour-pin custom-tour-stack',
          html: stackHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });
        const stackMarker = L.marker([group.lat, group.lng], { icon: stackIcon, zIndexOffset: hasSelected ? 1000 : 15 });

        stackMarker.on('click',()=>{
          if(group.isCluster && zoom<18){map.flyTo([group.lat,group.lng],Math.min(zoom+2,18),{duration:.35});return;}
          openDock(null);setSelectedGroup(groupTours.map(tour=>({id:`tour:${tour.id}`,title:getLangText(tour.title,language),subtitle:mapReferenceLabel(language),icon:getCategoryColorAndEmoji(tour.category).emoji,ll:[tour.location.lat,tour.location.lng],tour})));
        });
        stackMarker.bindTooltip(
          group.isCluster
            ? (language === 'es' ? `${groupTours.length} tours cercanos · grupo aproximado` : `${groupTours.length} nearby tours · approximate cluster`)
            : (language === 'es' ? `${groupTours.length} tours · ${zoneName} (ubicación aproximada)` : `${groupTours.length} tours · ${zoneName} (approximate location)`),
          { direction: 'top', offset: [0, -18], className: 'leaflet-tour-tooltip' }
        );
        stackMarker.addTo(markersLayerRef.current!);
        stackMarker.getElement()?.setAttribute('aria-label',language==='es'?`${groupTours.length} tours agrupados · acercar o ver lista`:`${groupTours.length} grouped tours · zoom in or view list`);
        stackMarker.getElement()?.setAttribute('data-lat', String(group.lat));
        stackMarker.getElement()?.setAttribute('data-lng', String(group.lng));
        return;
      }

      const tour = group.items[0];
        const isSelected = selectedMapTour?.id === tour.id;
        const { emoji } = getCategoryColorAndEmoji(tour.category);
        const priceFormatted = formatCurrency(tour.priceUSD, currency);

        const htmlString = `
          <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer transition-transform duration-300 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-20'}">
            ${isSelected ? '<div class="absolute -inset-2 bg-emerald-500/40 rounded-full animate-ping"></div>' : ''}
            <div class="relative bg-white border-2 ${isSelected ? 'border-emerald-600 shadow-emerald-500/50 shadow-lg' : 'border-emerald-500 shadow-sm'} rounded-full w-full h-full flex items-center justify-center">
              <span class="text-[13px] leading-none">${emoji}</span>
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-tour-pin',
          html: htmlString,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        const marker = L.marker([tour.location.lat, tour.location.lng], {
          icon: customIcon,
          zIndexOffset: isSelected ? 1000 : 10
        });

        marker.on('click', () => {
          setSelectedMapTour(tour);
          setSelectedMapService(null);
          leafletMapRef.current?.flyTo(
            [tour.location.lat, tour.location.lng],
            Math.max(leafletMapRef.current.getZoom(), 12),
            { duration: 0.8 }
          );
        });

        const tourTitle = escapeHtml(getLangText(tour.title, language));
        const tourLocation = escapeHtml(tour.location.placeName || (tour.location as any).name || '');
        marker.bindTooltip(`
          <div style="min-width: 160px; max-width: 220px; line-height: 1.3;">
            <div style="font-weight: 800; font-size: 11px; color: #10b981; margin-bottom: 2px;">📍 ${tourLocation}</div>
            <div style="font-weight: 700; font-size: 12px; color: #F8FAFC;">${tourTitle}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 11px; color: #A7F3D0;">
              <span>${language === 'es' ? 'Referencia de zona' : 'Area reference'}</span>
              <span>${getLangText(tour.durationLabel, language)}</span>
            </div>
          </div>
        `, {
          direction: 'top',
          offset: [0, -36],
          className: 'leaflet-tour-tooltip'
        });

        marker.addTo(markersLayerRef.current!);
      marker.getElement()?.setAttribute('aria-label',getLangText(tour.title,language));
      marker.getElement()?.setAttribute('data-lat', String(tour.location.lat));
      marker.getElement()?.setAttribute('data-lng', String(tour.location.lng));
    });

    // 2. Render Tourism Services Pins (Hotels, Parks, Buses, Trains, Taxis, Airstrips)
    // Keep each service's original geolocation; clusters are only UI groups.
    const serviceGroups = groupMapPointsAtZoom(effectiveServices, srv =>
      Number.isFinite(srv.coordinates?.lat) && Number.isFinite(srv.coordinates?.lng)
        ? [srv.coordinates.lat, srv.coordinates.lng] : null,
      projectPoint, zoom
    );
    serviceGroups.forEach(group => {
      if (group.count > 1) {
        const clusteredIcon = L.divIcon({
          className: 'custom-srv-pin custom-service-stack',
          html: `<div class="flex items-center justify-center w-8 h-8 bg-slate-50 text-slate-800 rounded-full border-2 border-dashed border-sky-600 shadow-sm"><span class="text-xs font-black">${group.count}</span></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });
        const marker = L.marker([group.lat, group.lng], { icon: clusteredIcon, zIndexOffset: 17 });
        marker.on('click',()=>{
          if(group.isCluster && zoom<18){map.flyTo([group.lat,group.lng],Math.min(zoom+2,18),{duration:.35});return;}
          openDock(null);setSelectedGroup(group.items.map(service=>({id:`service:${service.id}`,title:getLangText(service.name,language),subtitle:mapReferenceLabel(language),icon:getServiceIconAndColor(service.type).emoji,ll:[service.coordinates.lat,service.coordinates.lng],service})));
        });
        marker.addTo(markersLayerRef.current!);
        marker.getElement()?.setAttribute('aria-label',language==='es'?`${group.items.length} servicios agrupados · acercar o ver lista`:`${group.items.length} grouped services · zoom in or view list`);
        marker.getElement()?.setAttribute('data-lat',String(group.lat));
        marker.getElement()?.setAttribute('data-lng',String(group.lng));
        return;
      }
      const srv = group.items[0];
      const isSelected = selectedMapService?.id === srv.id;
      const meta = getServiceIconAndColor(srv.type);

      let badgeContent = '';
      if (srv.type === 'hotel') {
        const nightly = getMapServiceUnitPriceUSD(srv);
        badgeContent = nightly === null ? (language === 'es' ? 'Consultar' : 'Ask') : `${nightly}/n`;
      } else if (srv.type === 'national_park') {
        badgeContent = 'SINAC';
      } else if (srv.type === 'airstrip' || srv.type === 'airport') {
        badgeContent = srv.flightCode?.split(' ')[0] || 'AÉREO';
      } else if (srv.type === 'bus_station') {
        badgeContent = 'BUS';
      } else if (srv.type === 'train_station') {
        badgeContent = 'TREN';
      } else if (srv.type === 'taxi_stand') {
        badgeContent = 'TAXI';
      }

      const htmlString = `
        <div class="relative flex items-center justify-center w-7 h-7 cursor-pointer transition-transform duration-300 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-20'}">
          ${isSelected ? '<div class="absolute -inset-2 bg-slate-400/40 rounded-full animate-ping"></div>' : ''}
          <div class="relative bg-white border-2 ${isSelected ? 'border-slate-800 shadow-slate-500/50 shadow-lg' : meta.border + ' shadow-sm'} rounded-full w-full h-full flex items-center justify-center">
            <span class="text-[11px] leading-none">${meta.emoji}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: `custom-srv-pin custom-${srv.type}-pin`,
        html: htmlString,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
      });

      const marker = L.marker([srv.coordinates.lat, srv.coordinates.lng], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 20
      });

      marker.on('click', () => {
        setSelectedMapService(srv);
        setSelectedMapTour(null);
        leafletMapRef.current?.flyTo(
          [srv.coordinates.lat, srv.coordinates.lng],
          Math.max(leafletMapRef.current.getZoom(), 13),
          { duration: 0.8 }
        );
      });

      const srvName = escapeHtml(getLangText(srv.name, language));
      const srvSub = escapeHtml(getLangText(srv.subtitle, language));
      marker.bindTooltip(`
        <div style="min-width: 170px; max-width: 240px; line-height: 1.3;">
          <div style="font-weight: 800; font-size: 11px; color: #34d399; margin-bottom: 2px;">${meta.emoji} ${meta.label[language === 'es' ? 'es' : 'en']}</div>
          <div style="font-weight: 700; font-size: 12px; color: #F8FAFC;">${srvName}</div>
          <div style="font-size: 11px; color: #CBD5E1; margin-top: 3px;">${srvSub}</div>
        </div>
      `, {
        direction: 'top',
        offset: [0, -36],
        className: 'leaflet-tour-tooltip'
      });

      marker.addTo(markersLayerRef.current!);
      marker.getElement()?.setAttribute('aria-label',getLangText(srv.name,language));
      marker.getElement()?.setAttribute('data-lat', String(srv.coordinates.lat));
      marker.getElement()?.setAttribute('data-lng', String(srv.coordinates.lng));
    });
  }, [effectiveTours, effectiveServices, selectedMapTour, selectedMapService, language, currency, currentZoom]);

  // =========================================================
  // ITINERARY POLYLINE & NUMBERED WAYPOINTS ON LEAFLET
  // =========================================================
  useEffect(() => {
    if (!leafletMapRef.current || !itineraryMarkersLayerRef.current) return;
    itineraryMarkersLayerRef.current.clearLayers();

    if (polylineLayerRef.current) {
      polylineLayerRef.current.remove();
      polylineLayerRef.current = null;
    }

    if (itineraryStops.length < 2) {
      // If only 1 stop, just place a single waypoint pin
      if (itineraryStops.length === 1) {
        const stop = itineraryStops[0];
        const singleHtml = `
          <div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white text-stone-950 flex items-center justify-center font-black text-xs shadow-2xl ring-4 ring-emerald-400/40">
            1
          </div>
        `;
        const icon = L.divIcon({ className: 'itin-pin', html: singleHtml, iconSize: [32, 32], iconAnchor: [16, 16] });
        L.marker([stop.lat, stop.lng], { icon }).addTo(itineraryMarkersLayerRef.current);
      }
      return;
    }

    // Connect all points with polyline
    const latLngs: [number, number][] = itineraryStops.map(s => [s.lat, s.lng]);

    const polyline = L.polyline(latLngs, {
      color: '#10b981',
      weight: 5,
      opacity: 0.9,
      dashArray: '8, 8',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(leafletMapRef.current);

    polylineLayerRef.current = polyline;

    // Numbered waypoint markers
    itineraryStops.forEach((stop, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === itineraryStops.length - 1;
      const bg = isStart ? 'bg-emerald-500' : (isEnd ? 'bg-amber-400' : 'bg-stone-900');
      const text = isStart || isEnd ? 'text-stone-950 font-black' : 'text-emerald-200 font-bold';

      const waypointHtml = `
        <div class="relative group cursor-pointer animate-in zoom-in duration-150">
          <div class="w-7 h-7 rounded-full ${bg} border-2 border-white ${text} flex items-center justify-center text-xs shadow-2xl ring-2 ring-emerald-400/40">
            ${idx + 1}
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-950/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow border border-white/20 pointer-events-none">
            ${stop.name.slice(0, 18)}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'itin-waypoint-pin',
        html: waypointHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      L.marker([stop.lat, stop.lng], { icon, zIndexOffset: 2000 })
        .addTo(itineraryMarkersLayerRef.current!);
    });
  }, [itineraryStops]);

  // Total itinerary distance & estimated time
  const itineraryMetrics = useMemo(() => {
    if (itineraryStops.length < 2) {
      return { totalKm: 0, driveHours: '0 h', busHours: '0 h', flightMins: undefined };
    }
    let totalKm = 0;
    for (let i = 0; i < itineraryStops.length - 1; i++) {
      totalKm += calculateDistanceKm(
        itineraryStops[i].lat,
        itineraryStops[i].lng,
        itineraryStops[i + 1].lat,
        itineraryStops[i + 1].lng
      );
    }
    const times = estimateTravelTime(totalKm);
    return { totalKm, ...times };
  }, [itineraryStops]);

  // Add stop to itinerary
  const handleAddToItinerary = (item: {
    id: string;
    name: string;
    type: 'tour' | MapServiceType;
    lat: number;
    lng: number;
    icon: string;
    locationName: string;
    priceUSD?: number;
    originalObject?: Tour | MapTourismService;
  }) => {
    const exists = itineraryStops.some(s => s.id === item.id);
    if (exists) {
      alert(language === 'es' ? 'Este lugar ya está agregado a tu itinerario.' : 'This location is already added to your itinerary.');
      return;
    }
    const updated = [...itineraryStops, item];
    setItineraryStops(updated);
    openDock('itinerary');
  };

  const handleRemoveStop = (id: string) => {
    setItineraryStops(prev => prev.filter(s => s.id !== id));
  };

  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === itineraryStops.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const copy = [...itineraryStops];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setItineraryStops(copy);
  };

  const handleClearItinerary = () => {
    if (window.confirm(language === 'es' ? '¿Deseas vaciar todo el itinerario actual?' : 'Clear all stops from current itinerary?')) {
      setItineraryStops([]);
    }
  };

  const handleFitBoundsToItinerary = () => {
    if (!leafletMapRef.current || itineraryStops.length === 0) return;
    const latLngs = itineraryStops.map(s => [s.lat, s.lng] as [number, number]);
    leafletMapRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [80, 80], maxZoom: 13 });
  };

  // Flying to a region
  const handleFlyToRegion = (regionId: TourRegion | 'all') => {
    onSelectRegion(regionId);
    const target = REGION_NAV_ITEMS.find((r) => r.id === regionId);
    if (target && leafletMapRef.current) {
      leafletMapRef.current.flyTo([target.lat, target.lng], target.zoom, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
  };

  // Zoom controls
  const handleZoomIn = () => leafletMapRef.current?.zoomIn();
  const handleZoomOut = () => leafletMapRef.current?.zoomOut();

  const handleRecenterCostaRica = () => {
    onSelectRegion('all');
    leafletMapRef.current?.flyToBounds([[8.0, -86.0], [11.3, -82.5]], { padding: [20, 30], maxZoom: 8, duration: .6 });
  };

  // Fit bounds to filtered pins
  const handleFitBoundsToTours = () => {
    if (!leafletMapRef.current) return;
    const tourPoints = effectiveTours
      .filter((t) => t.location?.lat && t.location?.lng)
      .map((t) => [t.location.lat, t.location.lng] as [number, number]);

    const servicePoints = effectiveServices.map((s) => [s.coordinates.lat, s.coordinates.lng] as [number, number]);

    const allPoints = [...tourPoints, ...servicePoints];

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      leafletMapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
    }
  };

  // Geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert(language === 'es' ? 'La geolocalización no está disponible en tu navegador.' : 'Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsStatusMsg(language === 'es' ? 'Obteniendo coordenadas...' : 'Locating GPS position...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const { latitude, longitude } = pos.coords;
        const inCR = latitude >= 8.0 && latitude <= 11.5 && longitude >= -86.0 && longitude <= -82.5;

        if (inCR && leafletMapRef.current) {
          leafletMapRef.current.flyTo([latitude, longitude], 13, { duration: 1.2 });
          setGpsStatusMsg(language === 'es' ? '¡Ubicación encontrada en Costa Rica!' : 'Location found in Costa Rica!');
        } else {
          if (leafletMapRef.current) {
            leafletMapRef.current.flyTo([9.9281, -84.0907], 11, { duration: 1.2 });
          }
          setGpsStatusMsg(
            language === 'es' 
              ? `Estás fuera de Costa Rica (${latitude.toFixed(2)}, ${longitude.toFixed(2)}). Centrado en San José.` 
              : `You are outside Costa Rica (${latitude.toFixed(2)}, ${longitude.toFixed(2)}). Centering in San José.`
          );
        }
        setTimeout(() => setGpsStatusMsg(null), 4000);
      },
      (err) => {
        setGpsLoading(false);
        setGpsStatusMsg(language === 'es' ? 'Permiso GPS denegado o no disponible.' : 'GPS permission denied or unavailable.');
        setTimeout(() => setGpsStatusMsg(null), 3000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Fullscreen
  const handleToggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      document.getElementById('costa-rica-interactive-map-root')?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Route calculation lookup
  const routeCalcResult = useMemo(() => {
    const originObj = MAP_TOURISM_SERVICES.find(s => s.id === calcOrigin);
    const destObj = MAP_TOURISM_SERVICES.find(s => s.id === calcDestination);
    if (!originObj || !destObj) return null;

    const km = calculateDistanceKm(
      originObj.coordinates.lat,
      originObj.coordinates.lng,
      destObj.coordinates.lat,
      destObj.coordinates.lng
    );
    const times = estimateTravelTime(km);
    return {
      origin: originObj,
      destination: destObj,
      distanceKm: km,
      ...times
    };
  }, [calcOrigin, calcDestination]);

  const results = useMemo<ResultItem[]>(()=>[
    ...effectiveTours.map(tour=>({id:`tour:${tour.id}`,title:getLangText(tour.title,language),subtitle:mapReferenceLabel(language),icon:getCategoryColorAndEmoji(tour.category).emoji,ll:[tour.location.lat,tour.location.lng] as [number,number],tour})),
    ...effectiveServices.map(service=>({id:`service:${service.id}`,title:getLangText(service.name,language),subtitle:getServiceIconAndColor(service.type).label[language==='es'?'es':'en'],icon:getServiceIconAndColor(service.type).emoji,ll:[service.coordinates.lat,service.coordinates.lng] as [number,number],service})),
    ...poiResults.map(poi=>({id:`poi:${poi.properties.grupo}:${poi.properties.id}`,title:poi.properties.nombre||getPoiTypeLabel(poi.properties.tipo,language),subtitle:getPoiTypeLabel(poi.properties.tipo,language),icon:NATIONAL_POI_GROUPS.find(g=>g.id===poi.properties.grupo)?.emoji||'📍',ll:[poi.geometry.coordinates[1],poi.geometry.coordinates[0]] as [number,number],poi}))
  ],[effectiveTours,effectiveServices,poiResults,language]);
  useEffect(()=>setResultPage(0),[results,selectedGroup]);
  const chooseResult=(item:ResultItem)=>{
    if(item.poi){selectPoi(item.poi);return;}
    if(item.tour)setSelectedMapTour(item.tour);
    if(item.service)setSelectedMapService(item.service);
    leafletMapRef.current?.flyTo(item.ll,Math.max(leafletMapRef.current.getZoom(),14),{duration:.4});
  };
  const applyPreset=(preset:MapPreset)=>{
    setNationalFilterReset(value=>value+1);
    const groups:Record<MapPreset,string[]>={discover:['parques_sinac'],nature:['parques_sinac','naturaleza','fauna','reforestacion'],stay:['hospedaje','alimentacion'],transport:['transporte'],essentials:['servicios','salud','ccss','emergencia'],all:NATIONAL_POI_GROUPS.map(g=>g.id)};
    setNationalLayers(Object.fromEntries(NATIONAL_POI_GROUPS.map(g=>[g.id,groups[preset].includes(g.id)])) as NationalLayerSelection);
    setLayerFilters({...initialCatalogLayers,tours:preset==='discover'||preset==='nature'||preset==='all',hotels:preset==='stay'||preset==='all',parks:preset==='nature'||preset==='all',buses:preset==='transport'||preset==='all',trains:preset==='transport'||preset==='all',taxis:preset==='transport'||preset==='all',airports:preset==='transport'||preset==='all',airstrips:preset==='transport'||preset==='all'});
    setSelectedCategory('all');setSelectedDifficulty('all');setMaxDuration(null);
  };
  const resetExplorer=()=>{setSearchQuery('');setSelectedCategory('all');setSelectedDifficulty('all');setMaxDuration(null);setRadiusKm(null);setOnlyInView(false);setHideApproximate(false);onSelectRegion('all');applyPreset('discover');};
  const renderResults=(items:ResultItem[])=> <>
    <p className="crt-map-search-status" role="status">{items.length.toLocaleString(language==='es'?'es-CR':'en-US')} {language==='es'?'resultados en capas activas':'results in active layers'}</p>
    {!items.length && <><p className="crt-map-help">{language==='es'?'No hay resultados con estos filtros. Activa otra capa o amplía el área de búsqueda.':'No results match these filters. Enable another layer or widen the search area.'}</p><button className="crt-map-secondary" type="button" onClick={resetExplorer}>{language==='es'?'Restablecer búsqueda':'Reset search'}</button></>}
    {items.slice(resultPage*40,(resultPage+1)*40).map(item=><button className="crt-map-result" key={item.id} type="button" onClick={()=>chooseResult(item)}><span className="crt-map-result-symbol" aria-hidden="true">{item.icon}</span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span></button>)}
    {items.length>40 && <div className="crt-map-pages"><button type="button" disabled={resultPage===0} onClick={()=>setResultPage(p=>p-1)}>{language==='es'?'Anterior':'Previous'}</button><span>{resultPage+1} / {Math.ceil(items.length/40)}</span><button type="button" disabled={(resultPage+1)*40>=items.length} onClick={()=>setResultPage(p=>p+1)}>{language==='es'?'Siguiente':'Next'}</button></div>}
  </>;
  return (
    <section 
      id="costa-rica-interactive-map-root"
      className="crt-map-explorer relative w-full bg-[#041711] overflow-hidden"
      data-dock-open={!!activePanel}
    >
      <header className="crt-map-toolbar" aria-label={language==='es'?'Herramientas del mapa':'Map tools'}>
        <button type="button" id="map-exit-btn" className="crt-map-back" onClick={onExitMap} aria-label={language==='es'?'Volver al catálogo':'Back to catalog'}>←</button>
        <span className="crt-map-top-title">{language==='es'?'Explora Costa Rica':'Explore Costa Rica'}</span>
        <label className="crt-map-search"><Search aria-hidden="true"/><input id="map-search-input" type="search" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} aria-label={language==='es'?'Buscar en capas activas':'Search active layers'} placeholder={language==='es'?'Buscar en las capas activas…':'Search active layers…'}/>{searchQuery && <button type="button" onClick={()=>setSearchQuery('')} aria-label={language==='es'?'Limpiar búsqueda':'Clear search'}><X/></button>}</label>
        <button type="button" id="national-poi-layers-toggle" className="crt-map-command" aria-expanded={activePanel==='layers'} aria-controls="map-explorer-filters" onClick={()=>openDock(activePanel==='layers'?null:'layers')}><Layers/>{language==='es'?'Capas y filtros':'Layers & filters'}</button>
        <button type="button" id="map-results-toggle" className="crt-map-command" aria-expanded={activePanel==='results'} onClick={()=>openDock(activePanel==='results'?null:'results')}><MapPin/>{language==='es'?'Lugares':'Places'} <span id="map-result-count">{results.length.toLocaleString(language==='es'?'es-CR':'en-US')}</span></button>
        <button type="button" id="map-tools-toggle" className="crt-map-command" aria-expanded={activePanel==='tools'} onClick={()=>openDock(activePanel==='tools'?null:'tools')}><Compass/>{language==='es'?'Herramientas':'Tools'}</button>
      </header>
      <aside id="map-explorer-filters" className="crt-map-dock" hidden={activePanel!=='layers'} aria-label={language==='es'?'Capas y filtros del mapa':'Map layers and filters'}>
        <div className="crt-map-dock-heading"><h2>{language==='es'?'Tu mapa, a tu manera':'Your map, your way'}</h2><button type="button" onClick={()=>openDock(null)} aria-label={language==='es'?'Cerrar selector de capas':'Close layers selector'}><X size={18}/></button></div>
        <div className="crt-map-dock-body"><MapExplorerControls language={language} layers={layerFilters} onLayersChange={setLayerFilters} category={selectedCategory} onCategory={setSelectedCategory} difficulty={selectedDifficulty} onDifficulty={setSelectedDifficulty} region={selectedRegion} onRegion={handleFlyToRegion} maxDuration={maxDuration} onDuration={setMaxDuration} onlyInView={onlyInView} onOnlyInView={setOnlyInView} radiusKm={radiusKm} onRadius={setRadiusKm} hideApproximate={hideApproximate} onHideApproximate={setHideApproximate} showRegions={showRegionAreas} onShowRegions={setShowRegionAreas} onPreset={applyPreset} onReset={resetExplorer}>
          <NationalPoiLayer map={leafletMapInstance} language={language} embedded filterResetKey={nationalFilterReset} enabledLayers={nationalLayers} onEnabledLayersChange={setNationalLayers} searchQuery={deferredSearch} spatialFilter={spatialFilter} hideApproximate={hideApproximate} onFeaturesChange={setPoiResults} onSelectPoi={selectPoi} onSelectGroup={selectPoiGroup}/>
        </MapExplorerControls></div>
      </aside>
      {(activePanel==='results'||activePanel==='group') && <aside id="map-explorer-results" className="crt-map-dock" aria-label={language==='es'?'Resultados del mapa':'Map results'}><div className="crt-map-dock-heading"><h2>{activePanel==='group'?(language==='es'?'En esta ubicación':'At this location'):(language==='es'?'Lugares por descubrir':'Places to discover')}</h2><button type="button" onClick={()=>openDock(null)} aria-label={language==='es'?'Cerrar resultados':'Close results'}><X size={18}/></button></div><div className="crt-map-dock-body">{renderResults(selectedGroup||results)}</div></aside>}
      {activePanel==='tools' && <aside id="map-explorer-tools" className="crt-map-dock"><div className="crt-map-dock-heading"><h2>{language==='es'?'Prepara tu ruta':'Plan your route'}</h2><button type="button" onClick={()=>openDock(null)} aria-label={language==='es'?'Cerrar herramientas':'Close tools'}><X size={18}/></button></div><div className="crt-map-dock-body">
        <label className="crt-map-field">{language==='es'?'Superficie del mapa':'Basemap surface'}<select id="map-base-layer" value={activeLayer} onChange={e=>setActiveLayer(e.target.value as TileLayerKey)}>{(Object.keys(TILE_LAYERS) as TileLayerKey[]).map(key=><option key={key} value={key}>{TILE_LAYERS[key].icon} {TILE_LAYERS[key].name[language==='es'?'es':'en']}</option>)}</select></label>
        <div className="crt-map-tools-grid"><button type="button" id="map-toggle-calculator-btn" onClick={()=>openDock('calculator')}>{language==='es'?'Rutas y tiempos':'Routes & travel times'}</button><button type="button" id="map-toggle-itinerary-drawer-btn" onClick={()=>openDock('itinerary')}>{language==='es'?'Mi itinerario':'My itinerary'} ({itineraryStops.length})</button><button type="button" onClick={handleFitBoundsToTours}>{language==='es'?'Ver catálogo filtrado':'Fit filtered catalog'}</button><button type="button" onClick={handleDownloadOffline}>{language==='es'?'Guardar catálogo sin conexión':'Save catalog offline'}</button><button type="button" onClick={()=>{onSelectRegion('all');leafletMapRef.current?.flyTo([5.53,-87.06],11,{duration:.5});}}>{language==='es'?'Isla del Coco':'Cocos Island'}</button><button type="button" onClick={()=>{resetExplorer();handleRecenterCostaRica();}}>{language==='es'?'Todo Costa Rica':'All Costa Rica'}</button></div>
        <p className="crt-map-help">{language==='es'?'El catálogo y las capas descargadas pueden consultarse sin conexión. Las imágenes del mapa necesitan conexión. GPS se solicita solo al tocar su botón.':'Catalog and downloaded layers can be consulted offline. Basemap imagery requires a connection. GPS is requested only when its button is pressed.'}</p>
      </div></aside>}
      {selectedPoi && <aside id="map-selected-poi-panel" className="crt-map-dock" aria-label={language==='es'?'Detalles del lugar':'Place details'}><div className="crt-map-dock-heading"><h2>{getPoiTypeLabel(selectedPoi.properties.tipo,language)}</h2><button type="button" onClick={()=>openDock(null)} aria-label={language==='es'?'Cerrar detalles del lugar':'Close place details'}><X size={18}/></button></div><div className="crt-map-dock-body crt-map-place-facts" onClick={e=>{const cta=(e.target as HTMLElement).closest<HTMLElement>('[data-public-request-cta]');if(!cta)return;e.preventDefault();requestCustomerIntake({message:language==='es'?`Quisiera consultar: ${selectedPoi.properties.nombre||selectedPoi.properties.tipo}.`:`I would like to ask about: ${selectedPoi.properties.nombre||selectedPoi.properties.tipo}.`,language,source:`map:poi:${selectedPoi.properties.grupo}`,context:{poiId:selectedPoi.properties.id,poiGroup:selectedPoi.properties.grupo}});}} dangerouslySetInnerHTML={{__html:buildNationalPoiPopupHtml(selectedPoi.properties,selectedPoi.geometry.coordinates[1],selectedPoi.geometry.coordinates[0],language)}}/><p className="crt-map-dock-body crt-map-help">{language==='es'?'Referencia cartográfica. Confirma acceso, horarios y condiciones antes de viajar.':'Map reference. Confirm access, hours and conditions before traveling.'}</p></aside>}
      {/* GPS Status Toast */}
      {gpsStatusMsg && (
        <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-40 bg-stone-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold px-4 py-2 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          {gpsStatusMsg}
        </div>
      )}

      {/* MAP CANVAS CONTAINER */}
      <div className="crt-map-canvas-area">
        {useGoogleMapsMode && GOOGLE_MAPS_API_KEY ? (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapId="b5387d230c6cf22f"
              defaultCenter={{ lat: 9.7489, lng: -83.7534 }}
              defaultZoom={8}
              gestureHandling="greedy"
              zoomControl={true}
              fullscreenControl={false}
              className="w-full h-full"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              <GoogleMapViewController center={[9.7489, -83.7534]} zoom={currentZoom} />
            </GoogleMap>
          </APIProvider>
        ) : (
          <div
            ref={mapContainerRef}
            id="costa-rica-leaflet-map-canvas"
            className="w-full h-full z-0 bg-[#020d09]"
            style={{ minHeight: '100%' }}
          />
        )}

        {/* CAPAS NACIONALES: todo Costa Rica (OpenStreetMap, carga diferida) */}


        {/* FLOATING NAVIGATION & ZOOM TOOLBOX (Right Side) */}
        <div className="crt-map-nav">
          {/* Zoom In */}
          <button
            id="map-zoom-in-control"
            aria-label={language==='es'?'Acercar zoom (+)':'Zoom In (+)'}
            disabled={currentZoom>=18}
            onClick={handleZoomIn}
            className="w-9 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95"
            title={language === 'es' ? 'Acercar zoom (+)' : 'Zoom In (+)'}
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            id="map-zoom-out-control"
            aria-label={language==='es'?'Alejar zoom (-)':'Zoom Out (-)'}
            disabled={currentZoom<=6}
            onClick={handleZoomOut}
            className="w-9 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95"
            title={language === 'es' ? 'Alejar zoom (-)' : 'Zoom Out (-)'}
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Recenter Costa Rica */}
          <button
            id="map-recenter-control"
            onClick={handleRecenterCostaRica}
            className="w-9 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95"
            title={language === 'es' ? 'Centrar en Costa Rica' : 'Recenter Costa Rica'}
          >
            <Compass className="w-5 h-5" />
          </button>

          {/* Geolocation */}
          <button
            id="map-locate-gps-control"
            onClick={handleLocateMe}
            disabled={gpsLoading}
            className="w-9 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title={language === 'es' ? 'Mi ubicación GPS' : 'My GPS Location'}
          >
            <LocateFixed className={`w-5 h-5 ${gpsLoading ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="map-fullscreen-control"
            onClick={handleToggleFullscreen}
            className="w-9 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95"
            title={language === 'es' ? 'Pantalla completa' : 'Fullscreen toggle'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>


        </div>

        {tileError && <div role="status" className="crt-map-tile-error">{language==='es'?'No se pudo cargar parte del mapa base. Puedes cambiar de superficie en Herramientas.':'Some basemap tiles could not load. Choose another surface in Tools.'}</div>}
      </div>

      {/* ========================================================= */}
      {/* ITINERARY DRAWER / PANEL (MODERN ROUTE PLANNER) */}
      {/* ========================================================= */}
      {showItineraryDrawer && (
        <aside 
          id="map-itinerary-drawer-panel"
          className="crt-map-dock absolute top-0 right-0 bottom-0 w-full sm:w-[420px] bg-[#051e16] border-l border-emerald-500/40 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div className="crt-map-heading-sticky p-4 sm:p-5 border-b border-emerald-500/30 bg-emerald-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-stone-950 flex items-center justify-center font-black">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-white text-base leading-tight">
                  {language === 'es' ? 'Mi Itinerario de Viaje' : 'My Travel Itinerary'}
                </h3>
                <span className="text-[11px] text-emerald-300 font-medium">
                  {itineraryStops.length} {language === 'es' ? 'destinos seleccionados' : 'destinations chosen'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowItineraryDrawer(false)}
              aria-label={language==='es'?'Cerrar itinerario':'Close itinerary'}
              className="w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Route Metrics Summary Card */}
          <div className="p-4 bg-emerald-950/40 border-b border-emerald-500/20">
            <p className="mb-3 text-xs text-emerald-200/80">{language === 'es' ? 'Estimaciones desde distancias en línea recta. No verifican carreteras, tráfico, conexiones ni disponibilidad de transporte.' : 'Estimates from straight-line distances. Roads, traffic, connections and transport availability are not verified.'}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-950/80 border border-emerald-500/20 p-2.5 rounded-xl">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                  {language === 'es' ? 'Línea recta' : 'Straight line'}
                </span>
                <span className="font-black text-base text-white">{itineraryMetrics.totalKm} km</span>
              </div>
              <div className="bg-emerald-950/80 border border-emerald-500/20 p-2.5 rounded-xl">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                  {language === 'es' ? 'Auto estimado' : 'Estimated drive'}
                </span>
                <span className="font-black text-base text-amber-300">{itineraryMetrics.driveHours}</span>
              </div>
              <div className="bg-emerald-950/80 border border-emerald-500/20 p-2.5 rounded-xl">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                  {language === 'es' ? 'Vuelo teórico' : 'Theoretical flight'}
                </span>
                <span className="font-black text-base text-sky-300">
                  {itineraryMetrics.flightMins || (language === 'es' ? 'N/A' : 'N/A')}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleFitBoundsToItinerary}
                disabled={itineraryStops.length === 0}
                className="flex-1 py-1.5 px-3 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-200 text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'es' ? 'Enfocar Ruta en Mapa' : 'Focus Route'}</span>
              </button>
              <button
                onClick={handleClearItinerary}
                disabled={itineraryStops.length === 0}
                className="py-1.5 px-3 bg-red-950/50 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                title={language === 'es' ? 'Vaciar lista' : 'Clear all'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Stops List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {itineraryStops.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <Compass className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-white text-sm">
                  {language === 'es' ? 'Aún no has agregado paradas' : 'No stops added yet'}
                </h4>
                <p className="text-xs text-emerald-300/70 max-w-xs mx-auto leading-relaxed">
                  {language === 'es'
                    ? 'Selecciona cualquier tour, hotel, parque o estación de transporte en el mapa y haz clic en "+ Añadir a mi Itinerario" para trazar tu viaje.'
                    : 'Click any tour, hotel, national park, or transit hub on the map and select "+ Add to Itinerary" to map your journey.'}
                </p>
              </div>
            ) : (
              itineraryStops.map((stop, idx) => (
                <div
                  key={stop.id}
                  className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3 group hover:border-emerald-400 transition-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-stone-950 flex items-center justify-center font-black text-xs shrink-0 shadow">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{stop.icon}</span>
                      <h5 className="text-xs font-bold text-white truncate">{stop.name}</h5>
                    </div>
                    <p className="text-[11px] text-emerald-300/70 truncate">{stop.locationName}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveStop(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded text-emerald-400 hover:text-white disabled:opacity-30"
                      title="Subir"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveStop(idx, 'down')}
                      disabled={idx === itineraryStops.length - 1}
                      className="p-1 rounded text-emerald-400 hover:text-white disabled:opacity-30"
                      title="Bajar"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => handleRemoveStop(stop.id)}
                      className="p-1 rounded text-red-400 hover:text-red-200"
                      title="Eliminar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          {itineraryStops.length > 0 && (
            <div className="p-4 border-t border-emerald-500/30 bg-emerald-950/80 space-y-2 shrink-0">
              {onOpenItineraryTab && (
                <button
                  onClick={onOpenItineraryTab}
                  className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{language === 'es' ? 'Optimizar con Asistente IA' : 'Optimize with AI Agent'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  const summary = itineraryStops.map((s, i) => `${i + 1}. ${s.name} (${s.locationName})`).join('\n');
                  const message = `🇨🇷 Mi Itinerario Costa Rica Tours:\n${summary}\nDistancia total: ${itineraryMetrics.totalKm} km (~${itineraryMetrics.driveHours})`;
                  navigator.clipboard?.writeText(message);
                  alert(language === 'es' ? '¡Itinerario copiado al portapapeles listo para compartir o cotizar!' : 'Itinerary copied to clipboard!');
                }}
                className="w-full py-2.5 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>📋 {language === 'es' ? 'Copiar Itinerario y Distancias' : 'Copy Itinerary Details'}</span>
              </button>
            </div>
          )}
        </aside>
      )}

      {/* ========================================================= */}
      {/* ROUTE & TRAVEL TIME CALCULATOR MODAL */}
      {/* ========================================================= */}
      {showCalculatorModal && (
        <div id="map-calculator-panel" className="crt-map-dock">
          <div className="bg-[#051e16] border-2 border-emerald-500/40 rounded-3xl max-w-xl w-full shadow-2xl p-5 sm:p-6 text-white animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {language === 'es' ? 'Calculadora de Rutas & Conectividad' : 'Route & Travel Times Calculator'}
                  </h3>
                  <p className="text-xs text-emerald-300">
                    {language === 'es' ? 'Estimaciones teóricas; verifica la ruta y el servicio antes de viajar' : 'Theoretical estimates; verify the route and service before traveling'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCalculatorModal(false)}
                aria-label={language==='es'?'Cerrar calculadora':'Close calculator'}
                className="text-emerald-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  {language === 'es' ? 'Punto de Origen' : 'Starting Point'}
                </label>
                <select
                  value={calcOrigin}
                  onChange={(e) => setCalcOrigin(e.target.value)}
                  className="w-full px-3 py-2 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {MAP_TOURISM_SERVICES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {getLangText(s.name, language)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  {language === 'es' ? 'Punto de Destino' : 'Destination Point'}
                </label>
                <select
                  value={calcDestination}
                  onChange={(e) => setCalcDestination(e.target.value)}
                  className="w-full px-3 py-2 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {MAP_TOURISM_SERVICES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {getLangText(s.name, language)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calculation Card */}
            {routeCalcResult && (
              <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 text-xs">
                  <span className="text-emerald-300 font-bold">{language === 'es' ? 'Distancia en línea recta:' : 'Straight-line distance:'}</span>
                  <span className="font-black text-amber-300 text-sm">{routeCalcResult.distanceKm} km</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Bus */}
                  <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-500/30 space-y-1">
                    <div className="flex items-center gap-1 text-xs text-blue-300 font-bold">
                      <Bus className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Bus Público' : 'Public Bus'}</span>
                    </div>
                    <span className="block font-black text-lg text-white">{routeCalcResult.busHours}</span>
                    <span className="block text-[10px] text-blue-200/70">
                      {language === 'es' ? 'Ruta, horario y tarifa por confirmar' : 'Route, schedule and fare to be confirmed'}
                    </span>
                  </div>

                  {/* Drive / Shuttle */}
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 space-y-1">
                    <div className="flex items-center gap-1 text-xs text-emerald-300 font-bold">
                      <Car className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Auto / Shuttle' : 'Drive / Shuttle'}</span>
                    </div>
                    <span className="block font-black text-lg text-emerald-200">{routeCalcResult.driveHours}</span>
                    <span className="block text-[10px] text-emerald-300/70">
                      {language === 'es' ? 'Sin ruta vial ni tráfico verificados' : 'Road route and traffic not verified'}
                    </span>
                  </div>

                  {/* Flight */}
                  <div className="p-3 rounded-xl bg-sky-950/50 border border-sky-500/30 space-y-1">
                    <div className="flex items-center gap-1 text-xs text-sky-300 font-bold">
                      <Plane className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Vuelo teórico' : 'Theoretical flight'}</span>
                    </div>
                    <span className="block font-black text-lg text-sky-200">
                      {routeCalcResult.flightMins || 'N/A'}
                    </span>
                    <span className="block text-[10px] text-sky-200/70">
                      {language === 'es' ? 'No confirma vuelos, aeropuertos ni horarios' : 'Does not confirm flights, airports or schedules'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      if (leafletMapRef.current && routeCalcResult.origin && routeCalcResult.destination) {
                        const bounds = L.latLngBounds([
                          [routeCalcResult.origin.coordinates.lat, routeCalcResult.origin.coordinates.lng],
                          [routeCalcResult.destination.coordinates.lat, routeCalcResult.destination.coordinates.lng]
                        ]);
                        leafletMapRef.current.fitBounds(bounds, { padding: [60, 60] });
                      }
                      setShowCalculatorModal(false);
                    }}
                    className="flex-1 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black rounded-xl text-xs uppercase tracking-wider"
                  >
                    {language === 'es' ? 'Ver Tramo en el Mapa' : 'Show on Map'}
                  </button>
                  <button
                    onClick={() => {
                      handleAddToItinerary({
                        id: routeCalcResult.origin.id,
                        name: getLangText(routeCalcResult.origin.name, language),
                        type: routeCalcResult.origin.type,
                        lat: routeCalcResult.origin.coordinates.lat,
                        lng: routeCalcResult.origin.coordinates.lng,
                        icon: getServiceIconAndColor(routeCalcResult.origin.type).emoji,
                        locationName: getLangText(routeCalcResult.origin.address, language),
                        originalObject: routeCalcResult.origin
                      });
                      handleAddToItinerary({
                        id: routeCalcResult.destination.id,
                        name: getLangText(routeCalcResult.destination.name, language),
                        type: routeCalcResult.destination.type,
                        lat: routeCalcResult.destination.coordinates.lat,
                        lng: routeCalcResult.destination.coordinates.lng,
                        icon: getServiceIconAndColor(routeCalcResult.destination.type).emoji,
                        locationName: getLangText(routeCalcResult.destination.address, language),
                        originalObject: routeCalcResult.destination
                      });
                      setShowCalculatorModal(false);
                    }}
                    className="flex-1 py-2.5 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 font-bold rounded-xl text-xs"
                  >
                    {language === 'es' ? '+ Agregar Ambos a mi Ruta' : '+ Add Both to Route'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SELECTED TOUR DETAIL SIDE PANEL */}
      {/* ========================================================= */}
      {selectedMapTour && (
        <aside 
          id="map-selected-tour-panel" aria-label={language==='es'?'Detalles del tour':'Tour details'}
          className="crt-map-dock absolute bottom-0 left-0 right-0 sm:left-auto sm:top-0 sm:bottom-0 w-full sm:w-[420px] max-h-[82vh] sm:max-h-full bg-[#051e16] border-t sm:border-t-0 sm:border-l border-emerald-500/30 sm:shadow-[-15px_0_40px_rgba(0,0,0,0.6)] shadow-[0_-15px_40px_rgba(0,0,0,0.6)] pointer-events-auto flex flex-col z-40 overflow-y-auto rounded-t-3xl sm:rounded-none animate-in slide-in-from-bottom-8 sm:slide-in-from-right-8 duration-200"
        >
          <div className="crt-map-dock-heading"><h2>{language==='es'?'Detalle del tour':'Tour details'}</h2><button type="button" onClick={()=>setSelectedMapTour(null)} aria-label={language==='es'?'Cerrar detalles del tour':'Close tour details'}><X size={18}/></button></div>
          {/* Cover Photo */}
          <div className="relative h-60 sm:h-72 flex-shrink-0">
            <img
              src={selectedMapTour.image}
              alt={getLangText(selectedMapTour.title, language)}
              className="w-full h-full object-cover"
            />
            <button
              id="close-selected-map-tour-btn"
              onClick={() => setSelectedMapTour(null)}
              className="absolute top-4 right-4 w-9 h-9 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 transition-all z-10"
              title={language === 'es' ? 'Cerrar panel' : 'Close panel'}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute inset-0 bg-gradient-to-t from-[#051e16] via-[#051e16]/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <span className="bg-emerald-500 text-stone-950 text-xs font-black uppercase px-3 py-1.5 rounded-lg shadow-lg">
                {getLangText(selectedMapTour.durationLabel, language)}
              </span>
              <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-emerald-500/40 text-right">
                <span className="block text-[9px] font-bold text-emerald-300 uppercase tracking-widest leading-none mb-0.5">
                  {language === 'es' ? 'Desde' : 'From'}
                </span>
                <span className="block font-black text-white text-xl leading-none" title={money(selectedMapTour.priceUSD).note || money(selectedMapTour.priceUSD).notice}>
                  {money(selectedMapTour.priceUSD).primary}
                </span>
                {(money(selectedMapTour.priceUSD).note || money(selectedMapTour.priceUSD).notice) && (
                  <span data-testid="rate-note" className="mt-1 block max-w-[12rem] text-[9px] leading-tight text-stone-300">{money(selectedMapTour.priceUSD).note || money(selectedMapTour.priceUSD).notice}</span>
                )}
              </div>
            </div>
          </div>

          <p className="crt-map-help px-4">{mapReferenceLabel(language)}</p>
          {/* Content Info */}
          <div className="p-6 flex flex-col flex-1 text-white">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black tracking-widest uppercase">
                {selectedMapTour.location.placeName || (selectedMapTour.location as any).name}
              </span>
            </div>

            <h3 className="text-2xl font-black leading-snug mb-4 text-white">
              {getLangText(selectedMapTour.title, language)}
            </h3>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 mb-6 bg-emerald-950/60 border border-emerald-500/20 p-3 rounded-2xl text-center">
              <div>
                <span className="block text-[10px] font-bold uppercase text-emerald-300/70 mb-0.5">
                  {language === 'es' ? 'Dificultad' : 'Difficulty'}
                </span>
                <span className="text-xs font-black text-amber-300 uppercase">
                  {selectedMapTour.difficulty}
                </span>
              </div>
              <div className="border-x border-emerald-500/20">
                <span className="block text-[10px] font-bold uppercase text-emerald-300/70 mb-0.5">
                  {language === 'es' ? 'Valoración' : 'Rating'}
                </span>
                <span className="text-xs font-black text-amber-400">
                  {selectedMapTour.reviewsVerified ? `★ ${selectedMapTour.rating}` : (language==='es'?'Por verificar':'Unverified')}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-emerald-300/70 mb-0.5">
                  {language === 'es' ? 'Categoría' : 'Category'}
                </span>
                <span className="text-xs font-black text-emerald-200 capitalize">
                  {selectedMapTour.category}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed mb-6">
              {getLangText(selectedMapTour.description, language)}
            </p>

            {/* CTA Buttons */}
            <div className="mt-auto pt-4 space-y-2">
              {onSelectTour && (
                <button
                  id="book-tour-from-map-btn"
                  onClick={() => onSelectTour(selectedMapTour)}
                  className="w-full bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-sm uppercase tracking-wide py-3.5 px-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{language === 'es' ? 'Ver Detalles y Reservar' : 'View Details & Book'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  handleAddToItinerary({
                    id: selectedMapTour.id,
                    name: getLangText(selectedMapTour.title, language),
                    type: 'tour',
                    lat: selectedMapTour.location.lat,
                    lng: selectedMapTour.location.lng,
                    icon: getCategoryColorAndEmoji(selectedMapTour.category).emoji,
                    locationName: selectedMapTour.location.placeName,
                    priceUSD: selectedMapTour.priceUSD,
                    originalObject: selectedMapTour
                  });
                }}
                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-200 font-bold text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>{language === 'es' ? 'Añadir a mi Itinerario de Mapa' : 'Add to Map Itinerary'}</span>
              </button>

              <button
                onClick={() => {
                  if (leafletMapRef.current) {
                    leafletMapRef.current.flyTo(
                      [selectedMapTour.location.lat, selectedMapTour.location.lng],
                      15,
                      { duration: 1.0 }
                    );
                  }
                }}
                className="w-full bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-200 font-bold text-xs py-2 px-4 rounded-xl transition-all"
              >
                {language === 'es' ? '🔍 Acercar al Máximo en el Mapa' : '🔍 Zoom Closer on Map'}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ========================================================= */}
      {/* SELECTED TOURISM SERVICE DETAIL SIDE PANEL (Hotels, Parks, Buses, Flights) */}
      {/* ========================================================= */}
      {selectedMapService && (
        <aside 
          id="map-selected-service-panel" aria-label={language==='es'?'Detalles del servicio':'Service details'}
          className="crt-map-dock absolute bottom-0 left-0 right-0 sm:left-auto sm:top-0 sm:bottom-0 w-full sm:w-[420px] max-h-[85vh] sm:max-h-full bg-[#051e16] border-t sm:border-t-0 sm:border-l border-emerald-500/40 sm:shadow-[-15px_0_40px_rgba(0,0,0,0.7)] shadow-[0_-15px_40px_rgba(0,0,0,0.7)] pointer-events-auto flex flex-col z-40 overflow-y-auto rounded-t-3xl sm:rounded-none animate-in slide-in-from-bottom-8 sm:slide-in-from-right-8 duration-200"
        >
          <div className="crt-map-dock-heading"><h2>{language==='es'?'Detalle del servicio':'Service details'}</h2><button type="button" onClick={()=>setSelectedMapService(null)} aria-label={language==='es'?'Cerrar detalles del servicio':'Close service details'}><X size={18}/></button></div>
          {/* Cover Photo */}
          <div className="relative h-60 sm:h-72 flex-shrink-0">
            <img
              src={selectedMapService.image}
              alt={getLangText(selectedMapService.name, language)}
              className="w-full h-full object-cover"
            />
            <button
              id="close-selected-map-service-btn"
              onClick={() => setSelectedMapService(null)}
              className="absolute top-4 right-4 w-9 h-9 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute inset-0 bg-gradient-to-t from-[#051e16] via-[#051e16]/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <span className={`text-stone-950 text-xs font-black uppercase px-3 py-1.5 rounded-lg shadow-lg ${
                getServiceIconAndColor(selectedMapService.type).bg
              }`}>
                {getServiceIconAndColor(selectedMapService.type).label[language === 'es' ? 'es' : 'en']}
              </span>

              {/* Price / Fare Badge */}
              <div className="bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-emerald-500/40 text-right">
                <span className="block text-[9px] font-bold text-emerald-300 uppercase tracking-widest leading-none mb-0.5">
                  {selectedMapService.type === 'hotel' ? (language === 'es' ? 'Noche desde (referencia)' : 'Night from (reference)') : 
                   selectedMapService.type === 'national_park' ? (language === 'es' ? 'Tarifa SINAC (se paga al SINAC)' : 'SINAC fee (paid to SINAC)') :
                   (language === 'es' ? 'Pasaje Promedio' : 'Avg Fare')}
                </span>
                <span className="block font-black text-white text-xl leading-none">
                  {(() => {
                    // Sin precio real publicado: "Precio a consultar" (nunca un valor inventado).
                    const unit = getMapServiceUnitPriceUSD(selectedMapService);
                    if (unit === null) return language === 'es' ? PRICE_ON_REQUEST.es : PRICE_ON_REQUEST.en;
                    return selectedMapService.type === 'national_park' ? `US$${unit}` : formatCurrency(unit, currency);
                  })()}
                </span>
                {getMapServiceUnitPriceUSD(selectedMapService) !== null && (
                  <span className="block text-[9px] font-semibold text-amber-200/90 mt-0.5" data-testid="map-service-reference-price-note">
                    {language === 'es' ? REFERENCE_PRICE_NOTE.es : REFERENCE_PRICE_NOTE.en}
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="crt-map-help px-4">{mapReferenceLabel(language)}</p>
          {/* Details */}
          <div className="p-6 flex flex-col flex-1 text-white space-y-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold tracking-wide">
                  {getLangText(selectedMapService.address, language)}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {getLangText(selectedMapService.name, language)}
              </h3>
              <p className="text-xs text-emerald-300/80 mt-1">
                {getLangText(selectedMapService.subtitle, language)}
              </p>
            </div>

            {/* Special Badges (CST certificate, SINAC, etc.) */}
            {selectedMapService.cstCertificate && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs text-amber-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>🌱 {selectedMapService.cstCertificate}</span>
              </div>
            )}

            {selectedMapService.sinacCode && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1 text-xs text-emerald-200">
                <div className="flex justify-between font-bold">
                  <span>{language === 'es' ? 'Código oficial SINAC:' : 'Official SINAC code:'}</span>
                  <span className="font-mono text-white">{selectedMapService.sinacCode}</span>
                </div>
                {selectedMapService.entryHours && (
                  <div className="text-[11px] text-emerald-300/80">
                    🕒 {getLangText(selectedMapService.entryHours, language)}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              {getLangText(selectedMapService.description, language)}
            </p>

            {/* Tips & Recommendations */}
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/20 rounded-2xl text-xs space-y-1">
              <span className="font-black uppercase text-[10px] tracking-wider text-emerald-400">
                💡 {language === 'es' ? 'Consejo de viaje' : 'Travel Tip'}
              </span>
              <p className="text-emerald-200/90">{getLangText(selectedMapService.tips, language)}</p>
            </div>

            {/* CTAs */}
            <div className="mt-auto pt-4 space-y-2">
              {selectedMapService.type === 'national_park' ? (
                <div className="space-y-2">
                  <button
                    id="book-service-from-map-btn"
                    type="button"
                    data-public-request-cta="1"
                    onClick={() => {
                      setActiveBookingService(selectedMapService);
                      setIsBookingModalOpen(true);
                    }}
                    className="w-full bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-sm tracking-wide py-3.5 px-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>{language === 'es' ? PUBLIC_REQUEST_LABEL.es : PUBLIC_REQUEST_LABEL.en}</span>
                  </button>
                  <p className="text-[11px] leading-snug text-emerald-200/80">
                    {language === 'es'
                      ? 'Gestionamos su solicitud de ingreso. La tarifa de entrada la fija el SINAC; tarifa de referencia, confirmamos el monto vigente antes de cualquier pago.'
                      : 'We handle your entry request. The entrance fee is set by SINAC; reference fee, we confirm the current amount before any payment.'}
                  </p>
                </div>
              ) : (
              <button
                id="book-service-from-map-btn"
                onClick={() => {
                  setActiveBookingService(selectedMapService);
                  setIsBookingModalOpen(true);
                }}
                data-public-request-cta="1"
                className="w-full bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-sm tracking-wide py-3.5 px-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {selectedMapService.type === 'airstrip' ? (language === 'es' ? 'Cotizar Vuelo en Avioneta' : 'Request a Scenic Flight Quote') :
                   (language === 'es' ? PUBLIC_REQUEST_LABEL.es : PUBLIC_REQUEST_LABEL.en)}
                </span>
              </button>
              )}

              <button
                onClick={() => {
                  handleAddToItinerary({
                    id: selectedMapService.id,
                    name: getLangText(selectedMapService.name, language),
                    type: selectedMapService.type,
                    lat: selectedMapService.coordinates.lat,
                    lng: selectedMapService.coordinates.lng,
                    icon: getServiceIconAndColor(selectedMapService.type).emoji,
                    locationName: getLangText(selectedMapService.address, language),
                    originalObject: selectedMapService
                  });
                }}
                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-200 font-bold text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>{language === 'es' ? 'Añadir a mi Itinerario de Mapa' : 'Add to Map Itinerary'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMapService.coordinates.lat},${selectedMapService.coordinates.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Google Maps' : 'Google Maps'}</span>
                </a>

                <button
                  onClick={() => {
                    if (leafletMapRef.current) {
                      leafletMapRef.current.flyTo(
                        [selectedMapService.coordinates.lat, selectedMapService.coordinates.lng],
                        15,
                        { duration: 1.0 }
                      );
                    }
                  }}
                  className="py-2.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-200 font-bold text-xs rounded-xl transition-all"
                >
                  🔍 {language === 'es' ? 'Acercar' : 'Zoom'}
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ========================================================= */}
      <footer className="crt-map-footer" aria-live="polite"><span>{results.length.toLocaleString(language==='es'?'es-CR':'en-US')} {language==='es'?'resultados · capas activas':'results · active layers'}{searchQuery!==deferredSearch?' …':''}</span><span className="crt-map-extra-status">{language==='es'?'Círculos numerados: grupos · referencias sujetas a confirmación':'Numbered circles: groups · references require confirmation'}</span><span>Zoom {currentZoom}</span></footer>
      {/* SERVICE BOOKING MODAL (HOTELS, PARKS, BUSES, FLIGHTS) */}
      {/* ========================================================= */}
      <MapServiceBookingModal
        service={activeBookingService}
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setActiveBookingService(null);
        }}
        language={language}
        currency={currency}
      />
    </section>
  );
};

// Remonta al cambiar de identidad: el estado en memoria nunca pasa a otra persona.
export const InteractiveMap = withStorageScope(InteractiveMapComponent);
