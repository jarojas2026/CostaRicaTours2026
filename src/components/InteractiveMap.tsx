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
  Info
} from 'lucide-react';
import { formatCurrency, getLangText } from '../utils/i18n';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap as useGoogleMap } from '@vis.gl/react-google-maps';

const OFFLINE_CACHE_KEY = 'pura_vida_offline_map_tours_v2';
const OFFLINE_REGIONS_KEY = 'pura_vida_offline_map_regions_v2';

interface InteractiveMapProps {
  language: Language;
  currency?: Currency;
  tours?: Tour[];
  selectedRegion: TourRegion | 'all';
  onSelectRegion: (r: TourRegion | 'all') => void;
  onExploreRegionTours?: (r: TourRegion) => void;
  onSelectTour?: (tour: Tour) => void;
  onExitMap?: () => void;
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
  satellite: {
    name: { es: 'Satélite Natural HD', en: 'HD Natural Satellite' },
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
    icon: '🛰️'
  },
  voyager: {
    name: { es: 'Explorador Ecoturismo', en: 'Ecotourism Explorer' },
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
    maxZoom: 19,
    icon: '🗺️'
  },
  topo: {
    name: { es: 'Topográfico & Relieve', en: 'Topography & Relief' },
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, SRTM | OpenTopoMap',
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
  onExitMap
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  const [selectedMapTour, setSelectedMapTour] = useState<Tour | null>(null);
  const [activeLayer, setActiveLayer] = useState<TileLayerKey>('voyager');
  const [currentZoom, setCurrentZoom] = useState<number>(8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TourCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);

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
      setIsCached(true);
      setCachedTourCount(tours.length);
      const msg = language === 'es'
        ? `¡Mapa y ${tours.length} tours guardados exitosamente para consulta sin conexión!`
        : `Map and ${tours.length} tours saved successfully for offline access!`;
      alert(msg);
    } catch (err) {
      alert(language === 'es' ? 'No se pudo guardar la memoria local.' : 'Could not save to local storage.');
    }
  };

  // Filtered tours
  const effectiveTours = useMemo(() => {
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
  }, [tours, searchQuery, selectedRegion, selectedCategory, selectedDifficulty, language]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (useGoogleMapsMode) return;
    if (!mapContainerRef.current) return;
    if (leafletMapRef.current) return;

    // Determine initial center
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
      zoomControl: false, // We have modern custom zoom controls
      attributionControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: true,
      keyboard: true,
      maxBoundsViscosity: 0.8
    });

    // Restrict pan bounds to Costa Rica + immediate maritime zones
    map.setMaxBounds([
      [6.5, -88.5],
      [12.5, -80.5]
    ]);

    // Initial tile layer
    const layerConfig = TILE_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Markers layer group
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

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
          fillOpacity: isSelected ? 0.4 : 0.15
        };
      },
      onEachFeature: (feature, layer) => {
        const id = feature.properties?.id;
        const name = feature.properties?.name;
        
        layer.bindTooltip(`<b>${name}</b><br/>${language === 'es' ? 'Haz clic para filtrar región' : 'Click to filter region'}`, {
          direction: 'top'
        });

        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({
              weight: 3,
              fillOpacity: 0.35
            });
          },
          mouseout: (e) => {
            const l = e.target;
            const isSelected = selectedRegion === id;
            l.setStyle({
              weight: isSelected ? 3 : 1.5,
              fillOpacity: isSelected ? 0.4 : 0.15
            });
          },
          click: () => {
            onSelectRegion(id as TourRegion);
            const target = REGION_NAV_ITEMS.find((r) => r.id === id);
            if (target && leafletMapRef.current) {
              leafletMapRef.current.flyTo([target.lat, target.lng], target.zoom, {
                duration: 1.2
              });
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
    };
  }, [useGoogleMapsMode]);

  // Reactive Fly to Region when selectedRegion changes externally & update GeoJSON styling
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
          fillOpacity: isActuallySelected ? 0.4 : (selectedRegion === 'all' ? 0.15 : 0.05)
        });
      });
    }
  }, [selectedRegion]);

  // Update Tile Layer when user switches
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

  // Update Markers when tours, region, or selection changes
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    effectiveTours.forEach((tour) => {
      if (!tour.location?.lat || !tour.location?.lng) return;

      const isSelected = selectedMapTour?.id === tour.id;
      const { emoji, bg } = getCategoryColorAndEmoji(tour.category);
      const priceFormatted = formatCurrency(tour.priceUSD, currency);

      // Custom HTML Marker using L.divIcon
      const htmlString = `
        <div class="relative cursor-pointer transition-transform duration-300 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-20'}">
          ${isSelected ? '<div class="absolute -inset-2 bg-emerald-400/50 rounded-full animate-ping"></div>' : ''}
          <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-2xl border-2 ${
            isSelected 
              ? 'bg-emerald-500 border-white text-stone-950 font-black ring-4 ring-emerald-400/40' 
              : 'bg-stone-900/90 border-emerald-500/80 text-white hover:bg-stone-900'
          }">
            <span class="text-xs leading-none">${emoji}</span>
            <span class="text-[11px] font-bold tracking-tight whitespace-nowrap">${priceFormatted}</span>
          </div>
          <div class="w-2 h-2 mx-auto rotate-45 -mt-1 ${isSelected ? 'bg-emerald-500 border-r-2 border-b-2 border-white' : 'bg-stone-900'}"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
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
        leafletMapRef.current?.flyTo(
          [tour.location.lat, tour.location.lng],
          Math.max(leafletMapRef.current.getZoom(), 12),
          { duration: 0.8 }
        );
      });

      // Interactive tooltip preview
      const tourTitle = getLangText(tour.title, language);
      const tourLocation = tour.location.placeName || (tour.location as any).name || '';
      marker.bindTooltip(`
        <div style="min-width: 160px; max-width: 220px; line-height: 1.3;">
          <div style="font-weight: 800; font-size: 12px; color: #10b981; margin-bottom: 2px;">${tourLocation}</div>
          <div style="font-weight: 700; font-size: 13px; color: #F8FAFC;">${tourTitle}</div>
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

      marker.addTo(markersLayerRef.current);
    });
  }, [effectiveTours, selectedMapTour, language, currency]);

  // Handle flying to a region
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

  // Zoom In / Out Handlers
  const handleZoomIn = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  // Recenter Costa Rica
  const handleRecenterCostaRica = () => {
    onSelectRegion('all');
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([9.7489, -83.7534], 8, { duration: 1.0 });
    }
  };

  // Fit bounds to filtered tours
  const handleFitBoundsToTours = () => {
    if (!leafletMapRef.current || effectiveTours.length === 0) return;
    const latLngs = effectiveTours
      .filter((t) => t.location?.lat && t.location?.lng)
      .map((t) => [t.location.lat, t.location.lng] as [number, number]);

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      leafletMapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
    }
  };

  // Geolocation Handler
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

        // Check if inside Costa Rica bounding box
        const inCR = latitude >= 8.0 && latitude <= 11.5 && longitude >= -86.0 && longitude <= -82.5;

        if (inCR && leafletMapRef.current) {
          leafletMapRef.current.flyTo([latitude, longitude], 13, { duration: 1.2 });
          setGpsStatusMsg(language === 'es' ? '¡Ubicación encontrada en Costa Rica!' : 'Location found in Costa Rica!');
        } else {
          // Outside Costa Rica: Show feedback and fly to closest hub (San Jose)
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

  // Fullscreen Toggle
  const handleToggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <section 
      id="costa-rica-interactive-map-root"
      className="relative w-full h-[calc(100vh-64px)] flex flex-col bg-[#041711] overflow-hidden select-none"
    >
      {/* TOP HEADER CONTROLS BAR */}
      <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-2 sm:p-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-2 pointer-events-auto">
          {/* Main Top Bar */}
          <div className="bg-[#051e16]/90 backdrop-blur-md border border-emerald-500/30 rounded-2xl shadow-2xl p-2 sm:p-2.5 flex items-center justify-between gap-2">
            {/* Back Button & Count */}
            <div className="flex items-center gap-2">
              <button
                id="map-exit-btn"
                onClick={onExitMap}
                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-emerald-100 hover:text-white bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-500/40 rounded-xl transition-all shadow"
                title={language === 'es' ? 'Volver al catálogo de tours' : 'Back to tours list'}
              >
                <span>←</span>
                <span className="hidden sm:inline">{language === 'es' ? 'Volver a Tours' : 'Back to Tours'}</span>
              </button>

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold">
                  {effectiveTours.length} {language === 'es' ? 'Tours Visibles' : 'Visible Tours'}
                </span>
              </div>
            </div>

            {/* Center: Live Tour Search Input */}
            <div className="flex-1 max-w-md relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-emerald-400 pointer-events-none" />
                <input
                  id="map-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'es' ? 'Buscar volcán, playa, tirolesa, rafting...' : 'Search volcano, beach, zipline, rafting...'}
                  className="w-full pl-9 pr-8 py-2 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-xs sm:text-sm text-emerald-100 placeholder-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 text-emerald-400/70 hover:text-emerald-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Actions (Layers, Filters, Offline) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Fit Bounds Button */}
              {effectiveTours.length > 0 && (
                <button
                  id="map-fit-bounds-btn"
                  onClick={handleFitBoundsToTours}
                  className="hidden lg:flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 rounded-xl transition-all"
                  title={language === 'es' ? 'Encuadrar tours en pantalla' : 'Fit tours in view'}
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'es' ? 'Encuadrar' : 'Fit View'}</span>
                </button>
              )}

              {/* Filters Toggle */}
              <button
                id="map-toggle-filters-btn"
                onClick={() => setShowFiltersModal(!showFiltersModal)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl border transition-all ${
                  selectedCategory !== 'all' || selectedDifficulty !== 'all'
                    ? 'bg-amber-500 border-amber-400 text-stone-950 shadow-md'
                    : 'bg-emerald-950/70 border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/90'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'es' ? 'Filtros' : 'Filters'}</span>
                {(selectedCategory !== 'all' || selectedDifficulty !== 'all') && (
                  <span className="w-2 h-2 rounded-full bg-stone-950"></span>
                )}
              </button>

              {/* Layer Switcher Button */}
              <div className="relative">
                <button
                  id="map-layer-selector-btn"
                  onClick={() => setShowLayerMenu(!showLayerMenu)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-emerald-100 bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-500/30 rounded-xl transition-all"
                  title={language === 'es' ? 'Cambiar estilo de mapa' : 'Change map style'}
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline">{TILE_LAYERS[activeLayer].name[language === 'es' ? 'es' : 'en']}</span>
                </button>

                {/* Layer Dropdown */}
                {showLayerMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#06241a] border border-emerald-500/40 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-3 py-1 mb-1">
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
                            isActive 
                              ? 'bg-emerald-500 text-stone-950 font-bold' 
                              : 'text-emerald-100 hover:bg-emerald-900/60'
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

                    {/* Google Maps toggle if key present */}
                    {GOOGLE_MAPS_API_KEY && (
                      <div className="mt-2 pt-2 border-t border-emerald-500/20">
                        <button
                          onClick={() => {
                            setUseGoogleMapsMode(!useGoogleMapsMode);
                            setShowLayerMenu(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:bg-emerald-900/50"
                        >
                          <span>🗺️ Google Maps Vector</span>
                          <span>{useGoogleMapsMode ? 'ON' : 'OFF'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Offline Download Button */}
              <button
                id="map-download-offline-btn"
                onClick={handleDownloadOffline}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow"
                title={language === 'es' ? 'Descargar mapa para uso offline' : 'Download map for offline use'}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{isCached ? (language === 'es' ? 'Guardado' : 'Cached') : (language === 'es' ? 'Offline' : 'Offline')}</span>
              </button>
            </div>
          </div>

          {/* Region Quick Navigation Pills (Horizontal Scroll) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {REGION_NAV_ITEMS.map((item) => {
              const isSelected = selectedRegion === item.id;
              return (
                <button
                  key={item.id}
                  id={`region-nav-pill-${item.id}`}
                  onClick={() => handleFlyToRegion(item.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all backdrop-blur-md shadow-md ${
                    isSelected
                      ? 'bg-emerald-500 text-stone-950 border-2 border-white scale-105 shadow-emerald-500/20'
                      : 'bg-[#06241a]/85 text-emerald-100 hover:bg-emerald-900/90 border border-emerald-500/30 hover:border-emerald-400'
                  }`}
                >
                  <span>{item.name[language === 'es' ? 'es' : 'en']}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* GPS Status Toast */}
      {gpsStatusMsg && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-40 bg-stone-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold px-4 py-2 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
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
              {effectiveTours.map((tour) => {
                const isSelected = selectedMapTour?.id === tour.id;
                return (
                  <AdvancedMarker
                    key={tour.id}
                    position={{ lat: tour.location.lat, lng: tour.location.lng }}
                    onClick={() => setSelectedMapTour(tour)}
                    title={getLangText(tour.title, language)}
                  >
                    <div className={`px-2.5 py-1.5 rounded-full border-2 border-white text-xs font-bold text-white shadow-xl ${
                      isSelected ? 'bg-red-500 scale-125' : 'bg-emerald-600'
                    }`}>
                      {formatCurrency(tour.priceUSD, currency)}
                    </div>
                  </AdvancedMarker>
                );
              })}
            </GoogleMap>
          </APIProvider>
        ) : (
          /* LEAFLET ULTRA-SMOOTH MAP CONTAINER */
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

        {/* BOTTOM LEFT: Quick Tours Carousel / Summary Pill */}
        <div className="absolute left-4 bottom-4 z-20 hidden md:flex items-center gap-2 bg-[#051e16]/85 backdrop-blur-md border border-emerald-500/30 px-3.5 py-2 rounded-2xl shadow-xl">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-emerald-200">
            {language === 'es' 
              ? 'Haz clic en cualquier tour para ver itinerario y reservar' 
              : 'Click any tour pin on the map to view itinerary and book'}
          </span>
        </div>
      </div>

      {/* FILTER MODAL / PANEL */}
      {showFiltersModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#051e16] border border-emerald-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black">{language === 'es' ? 'Filtrar Tours en el Mapa' : 'Filter Tours on Map'}</h3>
              </div>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="text-emerald-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* Category Filter */}
              <div>
                <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">
                  {language === 'es' ? 'Categoría de Aventura' : 'Adventure Category'}
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

              {/* Difficulty Filter */}
              <div>
                <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">
                  {language === 'es' ? 'Nivel de Dificultad' : 'Difficulty Level'}
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

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-emerald-500/20">
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                  setSearchQuery('');
                }}
                className="flex-1 py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-200"
              >
                {language === 'es' ? 'Restablecer' : 'Reset Filters'}
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

      {/* SELECTED TOUR DETAIL SIDE PANEL */}
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

            {/* Quick Metrics */}
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

            {/* Highlights bullet points if present */}
            {selectedMapTour.highlights && selectedMapTour.highlights[language === 'es' ? 'es' : 'en'] && (
              <div className="mb-6 space-y-1.5">
                <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider mb-2">
                  {language === 'es' ? 'Puntos Destacados' : 'Tour Highlights'}
                </h4>
                {selectedMapTour.highlights[language === 'es' ? 'es' : 'en']?.slice(0, 3).map((hl: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-emerald-200">
                    <span className="text-emerald-400">✓</span>
                    <span>{hl}</span>
                  </div>
                ))}
              </div>
            )}

            {/* CTA Button */}
            <div className="mt-auto pt-4 space-y-2">
              {onSelectTour && (
                <button
                  id="book-tour-from-map-btn"
                  onClick={() => onSelectTour(selectedMapTour)}
                  className="w-full bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-sm uppercase tracking-wide py-4 px-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{language === 'es' ? 'Ver Detalles y Reservar' : 'View Details & Book'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (leafletMapRef.current) {
                    leafletMapRef.current.flyTo(
                      [selectedMapTour.location.lat, selectedMapTour.location.lng],
                      14,
                      { duration: 1.0 }
                    );
                  }
                }}
                className="w-full bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-all"
              >
                {language === 'es' ? '🔍 Acercar al Máximo en el Mapa' : '🔍 Zoom Closer on Map'}
              </button>
            </div>
          </div>
        </aside>
      )}
    </section>
  );
};
