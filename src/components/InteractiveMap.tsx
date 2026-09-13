import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap as useGoogleMap } from '@vis.gl/react-google-maps';
import { 
  MAP_TOURISM_SERVICES, 
  MapTourismService, 
  MapServiceType, 
  calculateDistanceKm, 
  estimateTravelTime 
} from '../data/mapServicesData';
import { MapServiceBookingModal } from './MapServiceBookingModal';

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
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, USGS',
    maxZoom: 18,
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

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const itineraryMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  // Selection states
  const [selectedMapTour, setSelectedMapTour] = useState<Tour | null>(null);
  const [selectedMapService, setSelectedMapService] = useState<MapTourismService | null>(null);
  const [activeBookingService, setActiveBookingService] = useState<MapTourismService | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Layer & UI states
  const [activeLayer, setActiveLayer] = useState<TileLayerKey>('voyager');
  const [currentZoom, setCurrentZoom] = useState<number>(8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [showRegionPills, setShowRegionPills] = useState<boolean>(false);
  const [showItineraryDrawer, setShowItineraryDrawer] = useState<boolean>(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState<boolean>(false);

  // Service Layer Filters Toggles
  const [layerFilters, setLayerFilters] = useState<{
    tours: boolean;
    hotels: boolean;
    parks: boolean;
    buses: boolean;
    trains: boolean;
    taxis: boolean;
    airports: boolean;
    airstrips: boolean;
  }>({
    tours: true,
    hotels: true,
    parks: true,
    buses: true,
    trains: true,
    taxis: true,
    airports: true,
    airstrips: true
  });

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TourCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);

  // Itinerary Builder State
  const [itineraryStops, setItineraryStops] = useState<ItineraryStopItem[]>(() => {
    try {
      const saved = localStorage.getItem('costa_rica_map_itinerary_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save itinerary to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('costa_rica_map_itinerary_v1', JSON.stringify(itineraryStops));
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = getLangText(tour.title, language).toLowerCase();
        const subtitle = getLangText(tour.subtitle || { es: '', en: '' }, language).toLowerCase();
        const desc = getLangText(tour.description || { es: '', en: '' }, language).toLowerCase();
        const place = (tour.location?.placeName || (tour.location as any)?.name || '').toLowerCase();
        if (!title.includes(q) && !subtitle.includes(q) && !desc.includes(q) && !place.includes(q)) {
          return false;
        }
      }

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
  }, [tours, searchQuery, selectedRegion, selectedCategory, selectedDifficulty, language, layerFilters.tours]);

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

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = getLangText(srv.name, language).toLowerCase();
        const subtitle = getLangText(srv.subtitle, language).toLowerCase();
        const address = getLangText(srv.address, language).toLowerCase();
        const desc = getLangText(srv.description, language).toLowerCase();
        if (!name.includes(q) && !subtitle.includes(q) && !address.includes(q) && !desc.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [layerFilters, selectedRegion, searchQuery, language]);

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
      [6.5, -88.5],
      [12.5, -80.5]
    ]);

    const layerConfig = TILE_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom
    }).addTo(map);

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
    }).addTo(map);

    geoJsonLayerRef.current = geoJsonLayer;

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    leafletMapRef.current = map;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
      map.remove();
      leafletMapRef.current = null;
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

  // Update Tile Layer
  useEffect(() => {
    if (!leafletMapRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.remove();

    const layerConfig = TILE_LAYERS[activeLayer];
    const newTileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom
    }).addTo(leafletMapRef.current);

    tileLayerRef.current = newTileLayer;
  }, [activeLayer]);

  // =========================================================
  // RENDER PINS ON LEAFLET MAP (TOURS + ALL TOURISM SERVICES)
  // =========================================================
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // 1. Render Tours Pins
    effectiveTours.forEach((tour) => {
      if (!tour.location?.lat || !tour.location?.lng) return;

      const isSelected = selectedMapTour?.id === tour.id;
      const { emoji } = getCategoryColorAndEmoji(tour.category);
      const priceFormatted = formatCurrency(tour.priceUSD, currency);

      const htmlString = `
        <div class="relative cursor-pointer transition-transform duration-300 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-20'}">
          ${isSelected ? '<div class="absolute -inset-2 bg-emerald-400/50 rounded-full animate-ping"></div>' : ''}
          <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-2xl border-2 ${
            isSelected 
              ? 'bg-emerald-500 border-white text-stone-950 font-black ring-4 ring-emerald-400/40' 
              : 'bg-stone-900/95 border-emerald-500/80 text-white hover:bg-stone-900'
          }">
            <span class="text-xs leading-none">${emoji}</span>
            <span class="text-[11px] font-bold tracking-tight whitespace-nowrap">${priceFormatted}</span>
          </div>
          <div class="w-2 h-2 mx-auto rotate-45 -mt-1 ${isSelected ? 'bg-emerald-500 border-r-2 border-b-2 border-white' : 'bg-stone-900'}"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-tour-pin',
        html: htmlString,
        iconSize: [80, 42],
        iconAnchor: [40, 42],
        popupAnchor: [0, -42]
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

      const tourTitle = getLangText(tour.title, language);
      const tourLocation = tour.location.placeName || (tour.location as any).name || '';
      marker.bindTooltip(`
        <div style="min-width: 160px; max-width: 220px; line-height: 1.3;">
          <div style="font-weight: 800; font-size: 11px; color: #10b981; margin-bottom: 2px;">📍 ${tourLocation}</div>
          <div style="font-weight: 700; font-size: 12px; color: #F8FAFC;">${tourTitle}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 11px; color: #A7F3D0;">
            <span>★ ${tour.rating}</span>
            <span>${getLangText(tour.durationLabel, language)}</span>
          </div>
        </div>
      `, {
        direction: 'top',
        offset: [0, -36],
        className: 'leaflet-tour-tooltip'
      });

      marker.addTo(markersLayerRef.current!);
    });

    // 2. Render Tourism Services Pins (Hotels, Parks, Buses, Trains, Taxis, Airstrips)
    effectiveServices.forEach((srv) => {
      const isSelected = selectedMapService?.id === srv.id;
      const meta = getServiceIconAndColor(srv.type);

      let badgeContent = '';
      if (srv.type === 'hotel') {
        badgeContent = `$${srv.pricePerNightUSD || 150}/n`;
      } else if (srv.type === 'national_park') {
        badgeContent = `SINAC $${srv.officialPriceUSD?.toFixed(0)}`;
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
        <div class="relative cursor-pointer transition-transform duration-300 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-25'}">
          ${isSelected ? '<div class="absolute -inset-2 bg-amber-400/60 rounded-full animate-ping"></div>' : ''}
          <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-2xl border-2 ${
            isSelected 
              ? 'bg-amber-400 border-white text-stone-950 font-black ring-4 ring-amber-400/40' 
              : 'bg-stone-950/95 ' + meta.border + ' text-white hover:bg-stone-900'
          }">
            <span class="text-xs leading-none">${meta.emoji}</span>
            <span class="text-[10px] font-bold tracking-tight whitespace-nowrap">${badgeContent}</span>
          </div>
          <div class="w-2 h-2 mx-auto rotate-45 -mt-1 ${isSelected ? 'bg-amber-400 border-r-2 border-b-2 border-white' : 'bg-stone-950'}"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: `custom-srv-pin custom-${srv.type}-pin`,
        html: htmlString,
        iconSize: [84, 42],
        iconAnchor: [42, 42],
        popupAnchor: [0, -42]
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

      const srvName = getLangText(srv.name, language);
      const srvSub = getLangText(srv.subtitle, language);
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
    });
  }, [effectiveTours, effectiveServices, selectedMapTour, selectedMapService, language, currency]);

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
    setShowItineraryDrawer(true);
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
    leafletMapRef.current?.flyTo([9.7489, -83.7534], 8, { duration: 1.0 });
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
      mapContainerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
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

  return (
    <section 
      id="costa-rica-interactive-map-root"
      className="relative w-full h-[calc(100vh-64px)] flex flex-col bg-[#041711] overflow-hidden select-none"
    >
      {/* TOP HEADER CONTROLS BAR */}
      <header className="absolute top-2 left-2 right-2 z-30 pointer-events-none">
        <div className="max-w-6xl mx-auto flex flex-col gap-2 pointer-events-auto">
          {/* Collapsed State */}
          {isControlsCollapsed ? (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
              <button
                id="map-exit-min-btn"
                onClick={onExitMap}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white/95 hover:bg-white border border-slate-200/90 rounded-xl shadow-lg backdrop-blur-md transition-all active:scale-95"
                title={language === 'es' ? 'Volver al catálogo' : 'Back to catalog'}
              >
                <span>←</span>
                <span className="hidden sm:inline">{language === 'es' ? 'Volver' : 'Back'}</span>
              </button>

              <button
                id="map-expand-controls-btn"
                onClick={() => setIsControlsCollapsed(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white/95 hover:bg-white border border-slate-200/90 rounded-xl shadow-lg backdrop-blur-md transition-all active:scale-95 group"
                title={language === 'es' ? 'Mostrar herramientas y capas' : 'Show tools & layers'}
              >
                <Search className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-slate-900">
                  {searchQuery ? `"${searchQuery}"` : (language === 'es' ? 'Buscador y Capas' : 'Search & Layers')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono border border-emerald-300">
                  {effectiveTours.length + effectiveServices.length} {language === 'es' ? 'puntos' : 'pins'}
                </span>
                <Eye className="w-3.5 h-3.5 text-emerald-600 ml-1" />
              </button>

              {/* Itinerary Quick Pill if stops exist */}
              {itineraryStops.length > 0 && (
                <button
                  onClick={() => setShowItineraryDrawer(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white border border-emerald-500 shadow-xl"
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Itinerario' : 'Itinerary'} ({itineraryStops.length})</span>
                </button>
              )}
            </div>
          ) : (
            /* Expanded State: Compact, Modern Floating Card Deck */
            <div className="flex flex-col gap-2">
              <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-slate-800">
                {/* Back Button */}
                <button
                  id="map-exit-btn"
                  onClick={onExitMap}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all shrink-0"
                  title={language === 'es' ? 'Volver al catálogo' : 'Back to catalog'}
                >
                  <span>←</span>
                  <span className="hidden sm:inline">{language === 'es' ? 'Volver' : 'Back'}</span>
                </button>

                {/* Search Bar Input */}
                <div className="flex-1 min-w-[140px] relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 sm:left-3 w-3.5 sm:w-4 h-3.5 sm:h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="map-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={language === 'es' ? 'Buscar tours, hoteles, parques SINAC, buses...' : 'Search tours, hotels, national parks, buses...'}
                      className="w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Region Navigation Selector */}
                <button
                  id="map-toggle-regions-btn"
                  onClick={() => setShowRegionPills(!showRegionPills)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all shrink-0 ${
                    showRegionPills || selectedRegion !== 'all'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={language === 'es' ? 'Ver regiones de Costa Rica' : 'Explore regions'}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">
                    {selectedRegion !== 'all' 
                      ? (REGION_NAV_ITEMS.find(r => r.id === selectedRegion)?.name[language === 'es' ? 'es' : 'en'] || '📍') 
                      : (language === 'es' ? 'Regiones' : 'Regions')}
                  </span>
                  {showRegionPills ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {/* Route Calculator Tool */}
                <button
                  id="map-toggle-calculator-btn"
                  onClick={() => setShowCalculatorModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shrink-0"
                  title={language === 'es' ? 'Calculadora de rutas y tiempos (Bus, Auto, Avioneta)' : 'Route & travel time calculator'}
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden lg:inline">{language === 'es' ? 'Rutas y Tiempos' : 'Travel Times'}</span>
                </button>

                {/* Itinerary Drawer Button */}
                <button
                  id="map-toggle-itinerary-drawer-btn"
                  onClick={() => setShowItineraryDrawer(!showItineraryDrawer)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all shrink-0 ${
                    itineraryStops.length > 0 
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={language === 'es' ? 'Planificador de Itinerario en el Mapa' : 'Map Route Itinerary'}
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Itinerario' : 'Itinerary'}</span>
                  {itineraryStops.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-800 text-white text-[10px] font-bold flex items-center justify-center">
                      {itineraryStops.length}
                    </span>
                  )}
                </button>

                {/* Layer Switcher */}
                <div className="relative shrink-0">
                  <button
                    id="map-layer-selector-btn"
                    onClick={() => setShowLayerMenu(!showLayerMenu)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden xl:inline">{TILE_LAYERS[activeLayer].name[language === 'es' ? 'es' : 'en']}</span>
                  </button>

                  {showLayerMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 mb-1">
                        {language === 'es' ? 'Capas de Mapa' : 'Map Layers'}
                      </div>
                      {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((key) => {
                        const l = TILE_LAYERS[key];
                        const isActive = activeLayer === key;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              setActiveLayer(key);
                              setShowLayerMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                              isActive ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{l.icon}</span>
                              <span>{l.name[language === 'es' ? 'es' : 'en']}</span>
                            </div>
                            {isActive && <Check className="w-4 h-4" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Hide Bar Toggle */}
                <button
                  id="map-collapse-controls-btn"
                  onClick={() => setIsControlsCollapsed(true)}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all shrink-0"
                  title={language === 'es' ? 'Ocultar barra para despejar mapa' : 'Hide toolbar'}
                >
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>

              {/* SINGLE CLEAN SCROLLABLE LAYER PILLS BAR */}
              <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-1.5 shadow-lg flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 shrink-0">
                  {language === 'es' ? 'Capas:' : 'Layers:'}
                </span>

                {/* Tours */}
                <button
                  onClick={() => setLayerFilters(prev => ({ ...prev, tours: !prev.tours }))}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                    layerFilters.tours 
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'
                  }`}
                >
                  <span>📍</span>
                  <span>{language === 'es' ? 'Tours' : 'Tours'}</span>
                  <span className="text-[10px] opacity-90">({serviceCounts.tours})</span>
                </button>

                {/* Hotels */}
                <button
                  onClick={() => setLayerFilters(prev => ({ ...prev, hotels: !prev.hotels }))}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                    layerFilters.hotels 
                      ? 'bg-amber-500 text-white border-amber-400 shadow-sm' 
                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'
                  }`}
                >
                  <span>🏨</span>
                  <span>{language === 'es' ? 'Hoteles' : 'Hotels'}</span>
                  <span className="text-[10px] opacity-90">({serviceCounts.hotels})</span>
                </button>

                {/* National Parks */}
                <button
                  onClick={() => setLayerFilters(prev => ({ ...prev, parks: !prev.parks }))}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                    layerFilters.parks 
                      ? 'bg-teal-600 text-white border-teal-500 shadow-sm' 
                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'
                  }`}
                >
                  <span>🌿</span>
                  <span>{language === 'es' ? 'Parques SINAC' : 'SINAC Parks'}</span>
                  <span className="text-[10px] opacity-90">({serviceCounts.parks})</span>
                </button>

                {/* Buses */}
                <button
                  onClick={() => setLayerFilters(prev => ({ ...prev, buses: !prev.buses }))}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                    layerFilters.buses 
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm' 
                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'
                  }`}
                >
                  <span>🚌</span>
                  <span>{language === 'es' ? 'Buses' : 'Buses'}</span>
                  <span className="text-[10px] opacity-90">({serviceCounts.buses})</span>
                </button>

                {/* Trains */}
                <button
                  onClick={() => setLayerFilters(prev => ({ ...prev, trains: !prev.trains }))}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                    layerFilters.trains 
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' 
                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'
                  }`}
                >
                  <span>🚆</span>
                  <span>{language === 'es' ? 'Trenes' : 'Trains'}</span>
                  <span className="text-[10px] opacity-90">({serviceCounts.trains})</span>
                </button>

                {/* Taxis & Shuttles */}
                <button
                  onClick={() => setLayerFilters(prev => ({ ...prev, taxis: !prev.taxis }))}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                    layerFilters.taxis 
                      ? 'bg-amber-600 text-white border-amber-500 shadow-sm' 
                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'
                  }`}
                >
                  <span>🚕</span>
                  <span>{language === 'es' ? 'Shuttles' : 'Shuttles'}</span>
                  <span className="text-[10px] opacity-90">({serviceCounts.taxis})</span>
                </button>

                {/* Commercial Airports */}
                <button
                  onClick={() => setLayerFilters(prev => ({ ...prev, airports: !prev.airports }))}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                    layerFilters.airports 
                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm' 
                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'
                  }`}
                >
                  <span>✈️</span>
                  <span>{language === 'es' ? 'Aeropuertos' : 'Airports'}</span>
                  <span className="text-[10px] opacity-90">({serviceCounts.airports})</span>
                </button>
              </div>

              {/* Region Quick Navigation Pills */}
              {showRegionPills && (
                <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-2 shadow-xl animate-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-slate-100 text-[11px] font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <Compass className="w-3.5 h-3.5" />
                      {language === 'es' ? 'Seleccionar Región de Costa Rica' : 'Select Costa Rica Region'}
                    </span>
                    <button
                      onClick={() => setShowRegionPills(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                    {REGION_NAV_ITEMS.map((item) => {
                      const isSelected = selectedRegion === item.id;
                      return (
                        <button
                          key={item.id}
                          id={`region-nav-pill-${item.id}`}
                          onClick={() => handleFlyToRegion(item.id)}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
                            isSelected
                              ? 'bg-emerald-600 text-white font-bold scale-105 shadow-emerald-500/25'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          <span>{item.name[language === 'es' ? 'es' : 'en']}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* GPS Status Toast */}
      {gpsStatusMsg && (
        <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-40 bg-stone-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold px-4 py-2 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          {gpsStatusMsg}
        </div>
      )}

      {/* MAP CANVAS CONTAINER */}
      <div className="flex-1 w-full h-full relative">
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

        {/* FLOATING NAVIGATION & ZOOM TOOLBOX (Right Side) */}
        <div className="absolute right-4 bottom-8 sm:bottom-12 z-30 flex flex-col gap-2 pointer-events-auto">
          {/* Zoom In */}
          <button
            id="map-zoom-in-control"
            onClick={handleZoomIn}
            className="w-11 h-11 bg-[#06241a]/95 hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-100 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-95"
            title={language === 'es' ? 'Acercar zoom (+)' : 'Zoom In (+)'}
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Zoom Out */}
          <button
            id="map-zoom-out-control"
            onClick={handleZoomOut}
            className="w-11 h-11 bg-[#06241a]/95 hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-100 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-95"
            title={language === 'es' ? 'Alejar zoom (-)' : 'Zoom Out (-)'}
          >
            <Minus className="w-5 h-5" />
          </button>

          {/* Recenter Costa Rica */}
          <button
            id="map-recenter-control"
            onClick={handleRecenterCostaRica}
            className="w-11 h-11 bg-[#06241a]/95 hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-100 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-95"
            title={language === 'es' ? 'Centrar en Costa Rica' : 'Recenter Costa Rica'}
          >
            <Compass className="w-5 h-5 text-emerald-400" />
          </button>

          {/* Geolocation */}
          <button
            id="map-locate-gps-control"
            onClick={handleLocateMe}
            disabled={gpsLoading}
            className="w-11 h-11 bg-[#06241a]/95 hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-100 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-95 disabled:opacity-50"
            title={language === 'es' ? 'Mi ubicación GPS' : 'My GPS Location'}
          >
            <LocateFixed className={`w-5 h-5 ${gpsLoading ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="map-fullscreen-control"
            onClick={handleToggleFullscreen}
            className="w-11 h-11 bg-[#06241a]/95 hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-100 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-95"
            title={language === 'es' ? 'Pantalla completa' : 'Fullscreen toggle'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Zoom Level Badge */}
          <div className="bg-black/60 backdrop-blur-md border border-emerald-500/20 px-2 py-1 rounded-lg text-[10px] font-mono text-emerald-300 text-center">
            {currentZoom}x
          </div>
        </div>

        {/* BOTTOM LEFT: Quick Itinerary Status Pill */}
        <div className="absolute left-4 bottom-4 z-20 flex items-center gap-2">
          {itineraryStops.length > 0 ? (
            <button
              onClick={() => setShowItineraryDrawer(true)}
              className="flex items-center gap-2 bg-[#051e16]/95 hover:bg-emerald-950 backdrop-blur-md border border-emerald-400 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold text-white transition-all active:scale-95"
            >
              <Route className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>
                {language === 'es' 
                  ? `Ruta Activa: ${itineraryStops.length} paradas (${itineraryMetrics.totalKm} km)` 
                  : `Active Route: ${itineraryStops.length} stops (${itineraryMetrics.totalKm} km)`}
              </span>
              <span className="text-amber-300 font-mono">~{itineraryMetrics.driveHours}</span>
            </button>
          ) : (
            <div className="hidden md:flex items-center gap-2 bg-[#051e16]/85 backdrop-blur-md border border-emerald-500/30 px-3.5 py-2 rounded-2xl shadow-xl">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-emerald-200">
                {language === 'es' 
                  ? 'Haz clic en cualquier tour, hotel, parque o transporte para reservar o añadir a tu ruta' 
                  : 'Click any tour, hotel, national park, or transit hub to book or add to your route'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ITINERARY DRAWER / PANEL (MODERN ROUTE PLANNER) */}
      {/* ========================================================= */}
      {showItineraryDrawer && (
        <aside 
          id="map-itinerary-drawer-panel"
          className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] bg-[#051e16] border-l border-emerald-500/40 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-emerald-500/30 bg-emerald-950/80 flex items-center justify-between">
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
              className="w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Route Metrics Summary Card */}
          <div className="p-4 bg-emerald-950/40 border-b border-emerald-500/20">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-950/80 border border-emerald-500/20 p-2.5 rounded-xl">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                  {language === 'es' ? 'Distancia' : 'Distance'}
                </span>
                <span className="font-black text-base text-white">{itineraryMetrics.totalKm} km</span>
              </div>
              <div className="bg-emerald-950/80 border border-emerald-500/20 p-2.5 rounded-xl">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                  {language === 'es' ? 'En Auto / Bus' : 'Driving Time'}
                </span>
                <span className="font-black text-base text-amber-300">{itineraryMetrics.driveHours}</span>
              </div>
              <div className="bg-emerald-950/80 border border-emerald-500/20 p-2.5 rounded-xl">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                  {language === 'es' ? 'En Avioneta' : 'By Flight'}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
                    {language === 'es' ? 'Compara tiempos en bus público, auto/shuttle y avioneta' : 'Compare public bus, shuttle/drive, and flight times'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCalculatorModal(false)}
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
                  <span className="text-emerald-300 font-bold">{language === 'es' ? 'Distancia en Línea Directa / Terrestre:' : 'Estimated Distance:'}</span>
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
                      {language === 'es' ? 'Económico (~$5 - $12 USD)' : 'Budget (~$5 - $12 USD)'}
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
                      {language === 'es' ? 'Recomendado 4x4 en montaña' : 'Scenic highway route'}
                    </span>
                  </div>

                  {/* Flight */}
                  <div className="p-3 rounded-xl bg-sky-950/50 border border-sky-500/30 space-y-1">
                    <div className="flex items-center gap-1 text-xs text-sky-300 font-bold">
                      <Plane className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Avioneta Sansa' : 'Scenic Flight'}</span>
                    </div>
                    <span className="block font-black text-lg text-sky-200">
                      {routeCalcResult.flightMins || 'N/A'}
                    </span>
                    <span className="block text-[10px] text-sky-200/70">
                      {language === 'es' ? 'Ahorro de hasta 4 horas' : 'Saves up to 4+ hours'}
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
      {/* FILTER MODAL / PANEL */}
      {/* ========================================================= */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#051e16] border border-emerald-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black">{language === 'es' ? 'Filtrar Tours y Aventuras' : 'Filter Adventure Tours'}</h3>
              </div>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="text-emerald-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">
                  {language === 'es' ? 'Categoría' : 'Category'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: { es: 'Todas las Categorías', en: 'All Categories' } },
                    { id: 'volcanoes', label: { es: '🌋 Volcanes & Termales', en: 'Volcanoes & Springs' } },
                    { id: 'wildlife', label: { es: '🦥 Fauna & Perezosos', en: 'Wildlife & Sloths' } },
                    { id: 'canopy', label: { es: '🪂 Canopy & Tirolesa', en: 'Canopy & Zipline' } },
                    { id: 'beaches', label: { es: '🏄 Playas & Catamarán', en: 'Beaches & Ocean' } },
                    { id: 'rafting', label: { es: '🛶 Rafting en Ríos', en: 'River Rafting' } },
                    { id: 'culture', label: { es: '☕ Café & Chocolate', en: 'Coffee & Culture' } }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border ${
                        selectedCategory === cat.id
                          ? 'bg-emerald-500 border-white text-stone-950'
                          : 'bg-emerald-950/50 border-emerald-500/20 text-emerald-100 hover:bg-emerald-900/60'
                      }`}
                    >
                      {cat.label[language === 'es' ? 'es' : 'en']}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">
                  {language === 'es' ? 'Dificultad' : 'Difficulty'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'all', label: { es: 'Todos', en: 'All' } },
                    { id: 'fácil', label: { es: 'Fácil', en: 'Easy' } },
                    { id: 'moderado', label: { es: 'Moderado', en: 'Moderate' } },
                    { id: 'exigente', label: { es: 'Exigente', en: 'Challenging' } }
                  ].map((diff) => (
                    <button
                      key={diff.id}
                      onClick={() => setSelectedDifficulty(diff.id)}
                      className={`px-2 py-1.5 rounded-xl text-xs font-bold text-center transition-all border ${
                        selectedDifficulty === diff.id
                          ? 'bg-amber-500 border-white text-stone-950'
                          : 'bg-emerald-950/50 border-emerald-500/20 text-emerald-100 hover:bg-emerald-900/60'
                      }`}
                    >
                      {diff.label[language === 'es' ? 'es' : 'en']}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-emerald-500/20">
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                  setSearchQuery('');
                }}
                className="flex-1 py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-200"
              >
                {language === 'es' ? 'Restablecer' : 'Reset'}
              </button>
              <button
                onClick={() => {
                  setShowFiltersModal(false);
                  handleFitBoundsToTours();
                }}
                className="flex-1 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black rounded-xl text-xs shadow-lg"
              >
                {language === 'es' ? `Ver ${effectiveTours.length} Tours` : `Show ${effectiveTours.length} Tours`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SELECTED TOUR DETAIL SIDE PANEL */}
      {/* ========================================================= */}
      {selectedMapTour && (
        <aside 
          id="map-selected-tour-panel"
          className="absolute bottom-0 left-0 right-0 sm:left-auto sm:top-0 sm:bottom-0 w-full sm:w-[420px] max-h-[82vh] sm:max-h-full bg-[#051e16] border-t sm:border-t-0 sm:border-l border-emerald-500/30 sm:shadow-[-15px_0_40px_rgba(0,0,0,0.6)] shadow-[0_-15px_40px_rgba(0,0,0,0.6)] pointer-events-auto flex flex-col z-40 overflow-y-auto rounded-t-3xl sm:rounded-none animate-in slide-in-from-bottom-8 sm:slide-in-from-right-8 duration-200"
        >
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
                <span className="block font-black text-white text-xl leading-none">
                  {formatCurrency(selectedMapTour.priceUSD, currency)}
                </span>
              </div>
            </div>
          </div>

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
                  ★ {selectedMapTour.rating}
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
          id="map-selected-service-panel"
          className="absolute bottom-0 left-0 right-0 sm:left-auto sm:top-0 sm:bottom-0 w-full sm:w-[420px] max-h-[85vh] sm:max-h-full bg-[#051e16] border-t sm:border-t-0 sm:border-l border-emerald-500/40 sm:shadow-[-15px_0_40px_rgba(0,0,0,0.7)] shadow-[0_-15px_40px_rgba(0,0,0,0.7)] pointer-events-auto flex flex-col z-40 overflow-y-auto rounded-t-3xl sm:rounded-none animate-in slide-in-from-bottom-8 sm:slide-in-from-right-8 duration-200"
        >
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
                  {selectedMapService.type === 'hotel' ? (language === 'es' ? 'Noche Desde' : 'Night From') : 
                   selectedMapService.type === 'national_park' ? (language === 'es' ? 'Tarifa SINAC' : 'SINAC Entry') :
                   (language === 'es' ? 'Pasaje Promedio' : 'Avg Fare')}
                </span>
                <span className="block font-black text-white text-xl leading-none">
                  {selectedMapService.type === 'hotel' ? formatCurrency(selectedMapService.pricePerNightUSD || 150, currency) :
                   selectedMapService.type === 'national_park' ? formatCurrency(selectedMapService.officialPriceUSD || 18, currency) :
                   formatCurrency(selectedMapService.averageTicketUSD || 10, currency)}
                </span>
              </div>
            </div>
          </div>

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
                  <span>Código Oficial SINAC:</span>
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
              <button
                id="book-service-from-map-btn"
                onClick={() => {
                  setActiveBookingService(selectedMapService);
                  setIsBookingModalOpen(true);
                }}
                className="w-full bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-sm uppercase tracking-wide py-3.5 px-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {selectedMapService.type === 'hotel' ? (language === 'es' ? 'Reservar Estadía en Hotel' : 'Book Eco-Lodge Stay') :
                   selectedMapService.type === 'national_park' ? (language === 'es' ? 'Comprar Entrada Oficial SINAC' : 'Buy Official SINAC Ticket') :
                   selectedMapService.type === 'airstrip' ? (language === 'es' ? 'Cotizar Vuelo en Avioneta' : 'Book Scenic Flight') :
                   (language === 'es' ? 'Reservar Traslado / Tiquete' : 'Book Transfer / Ticket')}
                </span>
              </button>

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
