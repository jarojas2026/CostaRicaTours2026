import React, { useState, useEffect } from 'react';
import { REGIONS_DATA } from '../data/regionsData';
import { TourRegion, Language, Currency, Tour, TourCategory } from '../types';
import { MapPin, Navigation, X, RefreshCw, Thermometer, Cloud, Sun, CloudRain } from 'lucide-react';
import { formatCurrency, getLangText } from '../utils/i18n';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

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

function MapController({ center, zoom, onBoundsChange, onMapMove }: { center: [number, number], zoom: number, onBoundsChange: (bounds: any) => void, onMapMove: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo({ lat: center[0], lng: center[1] });
      map.setZoom(zoom);
    }
  }, [center, zoom, map]);

  useEffect(() => {
    if (!map) return;
    const listeners = [
      map.addListener('idle', () => {
        onBoundsChange(map.getBounds() || undefined);
      }),
      map.addListener('dragend', () => {
        onMapMove();
      }),
      map.addListener('zoom_changed', () => {
        onMapMove();
      })
    ];
    return () => {
      listeners.forEach(l => (window as any).google.maps.event.removeListener(l));
    };
  }, [map, onBoundsChange, onMapMove]);
  
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
  const [currentBounds, setCurrentBounds] = useState<any>(null);
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
  
  const getTourClimate = (region: TourRegion) => {
    if (region === 'caribe') return 'tropical';
    if (region === 'guanacaste') return 'dryforest';
    if (region === 'monteverde') return 'cloudforest';
    return 'rainforest';
  };

  const effectiveTours = baseTours.filter(tour => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const title = getLangText(tour.title, language).toLowerCase();
      const desc = getLangText(tour.description || {es:'',en:''}, language).toLowerCase();
      if (!title.includes(query) && !desc.includes(query)) return false;
    }
    if (activeCategory !== 'all' && tour.category !== activeCategory) return false;
    if (activeClimate !== 'all' && getTourClimate(tour.region) !== activeClimate) return false;
    
    if (searchAreaActive && currentBounds) {
      if ((window as any)?.google?.maps?.LatLng) {
        const pt = new (window as any).google.maps.LatLng(tour.location.lat, tour.location.lng);
        if (currentBounds && typeof currentBounds.contains === 'function' && !currentBounds.contains(pt)) return false;
      }
    }
    return true;
  });

  const handleMapMove = () => {
    if (searchAreaActive) return;
    setShowSearchThisAreaBtn(true);
  };

  const handleSearchThisArea = () => {
    setShowSearchThisAreaBtn(false);
    setSearchAreaActive(true);
  };

  const handleBoundsChange = (bounds: any) => {
    setCurrentBounds(bounds);
  };

  let mapCenter: [number, number] = [9.7489, -83.7534]; // Costa Rica
  let mapZoom = 7;

  if (selectedRegion !== 'all') {
    const regionObj = REGIONS_DATA.find(r => r.id === selectedRegion);
    if (regionObj) {
      // Fallback center for region, maybe based on tours in region
      const regionTours = tours.filter(t => t.region === selectedRegion);
      if (regionTours.length > 0) {
        mapCenter = [regionTours[0].location.lat, regionTours[0].location.lng];
        mapZoom = 9;
      }
    }
  }

  // Define API key (from env)
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  return (
    <section className="h-[calc(100vh-64px)] w-full flex flex-col relative bg-neutral-100 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-2 pointer-events-auto">
          {/* Header Controls */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-2 flex items-center justify-between">
            <button onClick={onExitMap} className="px-4 py-2 font-bold text-stone-600 hover:text-stone-900 transition-colors">
              {language === 'es' ? '← Volver' : '← Back'}
            </button>
            <div className="flex gap-2">
              <button onClick={() => setShowFilters(!showFilters)} className="px-4 py-2 font-bold text-orange-600 bg-orange-50 rounded-xl">
                {language === 'es' ? 'Filtros' : 'Filters'}
              </button>
              <button onClick={handleManualCache} className="px-4 py-2 font-bold text-white bg-teal-600 rounded-xl">
                {language === 'es' ? 'Descargar Mapa' : 'Download Map'}
              </button>
            </div>
          </div>
          
          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white rounded-2xl shadow-xl p-4 flex flex-col gap-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input 
                    type="text" 
                    placeholder={language === 'es' ? 'Buscar tour...' : 'Search tour...'}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-slate-900">
        {GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.trim().length > 5 ? (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map tilt={45} heading={0}
              mapId="b5387d230c6cf22f" // Valid map ID from example
              defaultCenter={{ lat: mapCenter[0], lng: mapCenter[1] }}
              defaultZoom={mapZoom}
              gestureHandling="greedy"
              disableDefaultUI
              className="w-full h-full z-0 custom-google-map"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              <MapController 
                center={mapCenter} 
                zoom={mapZoom} 
                onBoundsChange={(bounds) => handleBoundsChange(bounds as any)} 
                onMapMove={handleMapMove} 
              />

              {/* Tour Markers */}
              {effectiveTours.map(tour => {
                const isSelected = selectedMapTour?.id === tour.id;
                return (
                  <AdvancedMarker
                    key={tour.id}
                    position={{ lat: tour.location.lat, lng: tour.location.lng }}
                    onClick={() => setSelectedMapTour(tour)}
                    title={getLangText(tour.title, language)}
                    zIndex={isSelected ? 100 : 1}
                    className="cursor-pointer"
                  >
                    <div className={`${isSelected ? 'bg-red-500 scale-125' : 'bg-orange-500'} text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                  </AdvancedMarker>
                );
              })}
            </Map>
          </APIProvider>
        ) : (
          /* Interactive Costa Rica Eco-Explorer (GPS Calibrated) */
          <div className="w-full h-full relative bg-gradient-to-b from-stone-900 via-stone-850 to-stone-950 overflow-hidden flex items-center justify-center select-none">
            {/* Topographic & Regional Background Canvas */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />
            
            {/* Ocean labels */}
            <div className="absolute top-1/4 left-6 text-emerald-300/40 text-xs font-semibold tracking-widest uppercase rotate-[-25deg] pointer-events-none">
              🌊 Océano Pacífico (Pacific Ocean)
            </div>
            <div className="absolute top-1/3 right-8 text-cyan-300/40 text-xs font-semibold tracking-widest uppercase rotate-[20deg] pointer-events-none">
              🌊 Mar Caribe (Caribbean Sea)
            </div>

            {/* Costa Rica Map Container */}
            <div className="relative w-[92%] h-[85%] max-w-4xl max-h-[640px] border border-emerald-800/40 rounded-3xl bg-emerald-950/40 backdrop-blur-sm p-4 shadow-2xl">
              {/* Map Header Status */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30 text-xs text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Explorador Satelital Costa Rica • {effectiveTours.length} Tours GPS</span>
              </div>

              {/* Geographic Hotspot Regions */}
              <div className="absolute inset-0">
                {/* Arenal Volcano & Lake */}
                <div className="absolute top-[32%] left-[45%] text-center transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                     onClick={() => onSelectRegion('arenal')}>
                  <div className="text-xl animate-bounce">🌋</div>
                  <span className="text-[10px] font-bold text-amber-200 bg-black/70 px-2 py-0.5 rounded shadow">
                    La Fortuna / Arenal
                  </span>
                </div>

                {/* Monteverde Cloud Forest */}
                <div className="absolute top-[36%] left-[36%] text-center transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                     onClick={() => onSelectRegion('monteverde')}>
                  <div className="text-xl">🌿</div>
                  <span className="text-[10px] font-bold text-emerald-200 bg-black/70 px-2 py-0.5 rounded shadow">
                    Monteverde
                  </span>
                </div>

                {/* Guanacaste Coast */}
                <div className="absolute top-[22%] left-[22%] text-center transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                     onClick={() => onSelectRegion('guanacaste')}>
                  <div className="text-xl">🏖️</div>
                  <span className="text-[10px] font-bold text-yellow-200 bg-black/70 px-2 py-0.5 rounded shadow">
                    Guanacaste
                  </span>
                </div>

                {/* Manuel Antonio */}
                <div className="absolute top-[58%] left-[50%] text-center transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                     onClick={() => onSelectRegion('manuel_antonio')}>
                  <div className="text-xl">🐒</div>
                  <span className="text-[10px] font-bold text-amber-300 bg-black/70 px-2 py-0.5 rounded shadow">
                    Manuel Antonio
                  </span>
                </div>

                {/* Tortuguero Caribbean */}
                <div className="absolute top-[25%] left-[68%] text-center transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                     onClick={() => onSelectRegion('tortuguero')}>
                  <div className="text-xl">🐢</div>
                  <span className="text-[10px] font-bold text-teal-200 bg-black/70 px-2 py-0.5 rounded shadow">
                    Tortuguero
                  </span>
                </div>

                {/* Corcovado Osa */}
                <div className="absolute top-[78%] left-[65%] text-center transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                     onClick={() => onSelectRegion('corcovado')}>
                  <div className="text-xl">🐆</div>
                  <span className="text-[10px] font-bold text-lime-200 bg-black/70 px-2 py-0.5 rounded shadow">
                    Corcovado (Osa)
                  </span>
                </div>

                {/* Puerto Viejo Caribe Sur */}
                <div className="absolute top-[52%] left-[78%] text-center transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                     onClick={() => onSelectRegion('caribe')}>
                  <div className="text-xl">🏄</div>
                  <span className="text-[10px] font-bold text-cyan-200 bg-black/70 px-2 py-0.5 rounded shadow">
                    Caribe Sur
                  </span>
                </div>

                {/* Individual Tour Pins placed via GPS relative coordinates */}
                {effectiveTours.map((tour) => {
                  const isSelected = selectedMapTour?.id === tour.id;
                  const leftPercent = Math.max(8, Math.min(92, ((tour.location.lng - (-85.9)) / 3.3) * 100));
                  const topPercent = Math.max(10, Math.min(90, ((11.0 - tour.location.lat) / 2.8) * 100));

                  return (
                    <button
                      key={tour.id}
                      onClick={() => setSelectedMapTour(tour)}
                      style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-10 ${
                        isSelected ? 'scale-125 z-30' : 'hover:scale-110 hover:z-20'
                      }`}
                      title={getLangText(tour.title, language)}
                    >
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full shadow-lg border-2 ${
                        isSelected 
                          ? 'bg-red-500 border-white text-white font-bold' 
                          : 'bg-orange-500 hover:bg-orange-400 border-white text-white text-xs'
                      }`}>
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline max-w-[90px] truncate text-[10px]">
                          {getLangText(tour.title, language)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Selected Tour Side Panel */}
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
