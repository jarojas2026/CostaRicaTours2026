import React, { useState, useEffect, useRef } from 'react';
import { REGIONS_DATA } from '../data/regionsData';
import { TourRegion, Language, Currency, Tour, TourCategory } from '../types';
import { MapPin, Navigation, ArrowRight, ShieldCheck, Compass, ArrowLeft, Grid, X, WifiOff, DownloadCloud, CheckCircle2, RefreshCw, Search, SlidersHorizontal, Map, Thermometer, Cloud, Sun, CloudRain } from 'lucide-react';
import { formatCurrency, getLangText, UI_TRANSLATIONS } from '../utils/i18n';

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// Leaflet defaults
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const customMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const activeMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const regionIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const OFFLINE_CACHE_KEY = 'pura_vida_offline_map_tours_v1';
const OFFLINE_REGIONS_KEY = 'pura_vida_offline_map_regions_v1';

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

// Component to dynamically change map view
function MapViewUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

// Component for bounds and map events
function MapEvents({ onBoundsChange, onMapMove }: { onBoundsChange: (bounds: L.LatLngBounds) => void, onMapMove: () => void }) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    },
    dragend: () => {
      onMapMove();
    },
    zoomend: () => {
      onMapMove();
    }
  });
  
  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, [map]);
  
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
  const [selectedMapTour, setSelectedMapTour] = useState<Tour | null>(null);
  
  // Offline functionality state
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [cachedToursList, setCachedToursList] = useState<Tour[]>([]);
  const [isMapCached, setIsMapCached] = useState(false);
  const [cachedTourCount, setCachedTourCount] = useState(0);

  // Advanced Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TourCategory | 'all'>('all');
  const [activeClimate, setActiveClimate] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Bounds tracking
  const [currentBounds, setCurrentBounds] = useState<L.LatLngBounds | null>(null);
  const [searchAreaActive, setSearchAreaActive] = useState(false);
  const [showSearchThisAreaBtn, setShowSearchThisAreaBtn] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const savedMapTours = localStorage.getItem(OFFLINE_CACHE_KEY);
    if (savedMapTours) {
      try {
        const parsed = JSON.parse(savedMapTours);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCachedToursList(parsed);
          setCachedTourCount(parsed.length);
          setIsMapCached(true);
        }
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualCache = () => {
    if (!isOnline) {
      alert(language === 'es' ? 'No puedes guardar el mapa sin conexión a internet.' : 'Cannot save map without internet connection.');
      return;
    }
    
    try {
      const toursToSave = tours.length > 0 ? tours : cachedToursList;
      localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(toursToSave));
      localStorage.setItem(OFFLINE_REGIONS_KEY, JSON.stringify(REGIONS_DATA));
      
      setCachedToursList(toursToSave);
      setCachedTourCount(toursToSave.length);
      setIsMapCached(true);
      
      const msg = language === 'es' 
        ? `¡Mapa y ${toursToSave.length} tours guardados! Ahora puedes usar el mapa sin conexión a internet.`
        : `Map and ${toursToSave.length} tours saved! You can now use the map without internet connection.`;
      
      alert(msg);
    } catch (error) {
      alert(language === 'es' ? 'Error al guardar datos offline.' : 'Error saving offline data.');
    }
  };

  const baseTours = tours.length > 0 ? tours : cachedToursList;
  
  // Climate mapping helper
  const getTourClimate = (region: TourRegion) => {
    if (region === 'caribe') return 'tropical';
    if (region === 'guanacaste') return 'dryforest';
    if (region === 'monteverde') return 'cloudforest';
    return 'rainforest';
  };

  // Filter Tours
  const effectiveTours = baseTours.filter(tour => {
    // 1. Text Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const title = getLangText(tour.title, language).toLowerCase();
      const desc = getLangText(tour.description || {es:'',en:''}, language).toLowerCase();
      if (!title.includes(query) && !desc.includes(query)) return false;
    }

    // 2. Category Filter
    if (activeCategory !== 'all' && tour.category !== activeCategory) return false;

    // 3. Climate/Temp Filter
    if (activeClimate !== 'all' && getTourClimate(tour.region) !== activeClimate) return false;

    // 4. Bounds Filter (Search this area)
    if (searchAreaActive && currentBounds) {
      const pt = L.latLng(tour.location.lat, tour.location.lng);
      if (!currentBounds.contains(pt)) return false;
    }

    return true;
  });

  const activeRegionObj = REGIONS_DATA.find(r => r.id === selectedRegion) || REGIONS_DATA[0];

  const handleExit = () => {
    if (onExitMap) {
      onExitMap();
    } else if (onExploreRegionTours) {
      onExploreRegionTours('all' as TourRegion);
    }
  };

  const handleSearchThisArea = () => {
    setSearchAreaActive(true);
    setShowSearchThisAreaBtn(false);
  };

  const handleMapMove = () => {
    // Show "Search this area" button when user pans
    if (!showSearchThisAreaBtn) {
      setShowSearchThisAreaBtn(true);
    }
    // Automatically turn off the strict bound filter when they move significantly so they don't lose all pins, or leave it and let them click search again
    if (searchAreaActive) {
      setSearchAreaActive(false); 
    }
  };

  const handleBoundsChange = (bounds: L.LatLngBounds) => {
    setCurrentBounds(bounds);
  };

  // Determine map center and zoom
  let mapCenter: [number, number] = [9.7489, -83.7534]; // Default Costa Rica center
  let mapZoom = 7;

  if (selectedMapTour) {
    mapCenter = [selectedMapTour.location.lat, selectedMapTour.location.lng];
    mapZoom = 12;
  } else if (selectedRegion !== 'all' && activeRegionObj) {
    const regionTours = baseTours.filter(t => t.region === selectedRegion);
    if (regionTours.length > 0) {
      mapCenter = [regionTours[0].location.lat, regionTours[0].location.lng];
      mapZoom = 9;
    }
  }

  return (
    <section className="bg-stone-900 text-white h-[calc(100vh-80px)] min-h-[600px] flex flex-col relative overflow-hidden">
      {/* Map Container takes full space */}
      <div className="absolute inset-0 z-0">
        <MapContainer 
          center={[9.7489, -83.7534]} 
          zoom={7} 
          style={{ height: '100%', width: '100%', zIndex: 0, touchAction: 'none' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          <MapViewUpdater center={mapCenter} zoom={mapZoom} />
          <MapEvents onBoundsChange={handleBoundsChange} onMapMove={handleMapMove} />

          {/* Render effective tours */}
          {effectiveTours.map(tour => {
            const isSelected = selectedMapTour?.id === tour.id;
            
            return (
              <Marker 
                key={tour.id} 
                position={[tour.location.lat, tour.location.lng]}
                icon={isSelected ? activeMarkerIcon : customMarkerIcon}
                eventHandlers={{
                  click: () => {
                    setSelectedMapTour(tour);
                  }
                }}
              >
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* FLOATING UI OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
        
        {/* Top UI Area (Compact) */}
        <div className="p-3 sm:p-6 flex flex-col gap-2 sm:gap-4 max-w-7xl mx-auto w-full relative">
          
          <div className="flex gap-2 items-center pointer-events-auto max-w-3xl">
            {/* Back Button */}
            <button 
              onClick={handleExit}
              className="bg-white/95 backdrop-blur-md text-stone-900 hover:bg-white p-3 sm:px-4 sm:py-3 rounded-xl sm:rounded-full font-bold shadow-lg transition-colors flex shrink-0 items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{language === 'es' ? 'Volver' : 'Back'}</span>
            </button>
            
            {/* Search Box */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500" />
              </div>
              <input 
                type="text" 
                placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/95 backdrop-blur-md text-stone-900 pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-lg font-bold placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>
            
            {/* Filter Toggle */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-lg font-bold transition-colors shrink-0 flex items-center gap-2 ${showFilters ? 'bg-orange-500 text-white' : 'bg-white/95 text-stone-900 hover:bg-neutral-50'}`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="hidden sm:inline">{language === 'es' ? 'Filtros' : 'Filters'}</span>
            </button>
          </div>

          {/* Offline Banner */}
          {!isOnline && (
            <div className="bg-orange-500 text-white px-4 py-2 rounded-xl sm:rounded-full font-bold shadow-lg flex items-center gap-2 text-xs sm:text-sm self-start pointer-events-auto">
              <WifiOff className="w-4 h-4" />
              <span>{language === 'es' ? 'Modo Sin Conexión' : 'Offline Mode'}</span>
            </div>
          )}

          {/* Expanded Filters Panel */}
          {showFilters && (
            <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl pointer-events-auto max-w-3xl flex flex-col gap-5 border border-neutral-100">
              
              <div className="flex flex-wrap gap-4">
                {/* Category Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">
                    {language === 'es' ? 'Tipo de Turismo' : 'Tourism Type'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', icon: '🌍', label: { es: 'Todos', en: 'All' } },
                      { id: 'aventura', icon: '🚣', label: { es: 'Aventura Extrema', en: 'Extreme Adventure' } },
                      { id: 'naturaleza', icon: '🦥', label: { es: 'Naturaleza y Vida', en: 'Nature & Wildlife' } },
                      { id: 'cultura', icon: '☕', label: { es: 'Cultura Local', en: 'Local Culture' } }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id as TourCategory | 'all')}
                        className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-colors flex items-center gap-1.5 ${activeCategory === cat.id ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-white text-stone-600 border-neutral-200 hover:bg-neutral-50'}`}
                      >
                        <span>{cat.icon}</span>
                        {cat.label[language]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Climate/Temperature Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">
                    {language === 'es' ? 'Clima / Microclima' : 'Climate / Microclimate'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', icon: <Thermometer className="w-3.5 h-3.5" />, label: { es: 'Cualquiera', en: 'Any' } },
                      { id: 'tropical', icon: <Sun className="w-3.5 h-3.5" />, label: { es: 'Tropical Húmedo', en: 'Humid Tropical' } },
                      { id: 'dryforest', icon: <Sun className="w-3.5 h-3.5 text-orange-500" />, label: { es: 'Bosque Seco', en: 'Dry Forest' } },
                      { id: 'cloudforest', icon: <Cloud className="w-3.5 h-3.5" />, label: { es: 'Bosque Nuboso', en: 'Cloud Forest' } },
                      { id: 'rainforest', icon: <CloudRain className="w-3.5 h-3.5 text-blue-500" />, label: { es: 'Selva Lluviosa', en: 'Rainforest' } }
                    ].map(clim => (
                      <button
                        key={clim.id}
                        onClick={() => setActiveClimate(clim.id)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-colors flex items-center gap-1.5 ${activeClimate === clim.id ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-white text-stone-600 border-neutral-200 hover:bg-neutral-50'}`}
                      >
                        {clim.icon}
                        <span>{clim.label[language]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="border-t border-neutral-100 pt-3 flex justify-between items-center text-sm font-bold">
                <span className="text-neutral-500">
                  {effectiveTours.length} {language === 'es' ? 'resultados' : 'results'}
                </span>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="text-orange-500 hover:text-orange-600 uppercase tracking-wide"
                >
                  {language === 'es' ? 'Aplicar' : 'Apply'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search this area button */}
        <div className="flex-1 flex justify-center pointer-events-none pt-4">
          <div className={`transition-all duration-300 transform ${showSearchThisAreaBtn ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
            <button 
              onClick={handleSearchThisArea}
              className="pointer-events-auto bg-white text-orange-600 px-6 py-2.5 rounded-full font-black uppercase text-sm shadow-xl hover:bg-neutral-50 transition-colors border border-orange-100 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {language === 'es' ? 'Buscar en esta zona' : 'Search this area'}
            </button>
          </div>
        </div>

        {/* Selected Tour Side Panel (Or Bottom Sheet on Mobile) */}
        {selectedMapTour && (
          <div className="absolute bottom-0 left-0 right-0 sm:left-auto sm:top-0 sm:bottom-0 w-full sm:w-[400px] max-h-[80vh] sm:max-h-full bg-white sm:shadow-[-10px_0_30px_rgba(0,0,0,0.1)] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pointer-events-auto flex flex-col z-20 animate-fade-in-up sm:animate-fade-in-right overflow-y-auto rounded-t-3xl sm:rounded-none">
            <div className="relative h-56 sm:h-64 flex-shrink-0">
              <img 
                src={selectedMapTour.image} 
                alt={selectedMapTour.title.en} 
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setSelectedMapTour(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <span className="bg-orange-500 text-white text-[11px] font-black uppercase px-3 py-1.5 rounded-md shadow-lg">
                  {getLangText(selectedMapTour.durationLabel, language)}
                </span>
                <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20 text-right">
                  <span className="block text-[9px] font-bold text-neutral-300 uppercase tracking-widest leading-none mb-0.5">
                    {language === 'es' ? 'Precio' : 'Price'}
                  </span>
                  <span className="block font-black text-white leading-none text-lg">
                    {formatCurrency(selectedMapTour.priceUSD, currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-center gap-2 text-orange-500 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-bold tracking-widest uppercase">
                  {selectedMapTour.location.name}
                </span>
              </div>

              <h3 className="text-2xl font-black text-stone-900 leading-tight mb-4">
                {getLangText(selectedMapTour.title, language)}
              </h3>
              
              <div className="flex gap-4 mb-6 border-y border-neutral-100 py-3">
                <div className="text-center">
                  <span className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">{language === 'es' ? 'Dificultad' : 'Difficulty'}</span>
                  <span className="text-xs font-black text-stone-700 uppercase bg-neutral-100 px-2 py-1 rounded">{selectedMapTour.difficulty}</span>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">{language === 'es' ? 'Rating' : 'Rating'}</span>
                  <span className="text-xs font-black text-orange-500">{selectedMapTour.rating} ★</span>
                </div>
              </div>

              <p className="text-sm text-neutral-600 leading-relaxed mb-6">
                {getLangText(selectedMapTour.description, language)}
              </p>

              <div className="mt-auto space-y-3 pt-4">
                {onSelectTour && (
                  <button 
                    onClick={() => onSelectTour(selectedMapTour)}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black text-sm uppercase py-4 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>{language === 'es' ? 'Ver Detalles y Reservar' : 'View Details & Book'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </section>
  );
};
