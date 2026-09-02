const fs = require('fs');

const content = `import React, { useState, useEffect } from 'react';
import { REGIONS_DATA } from '../data/regionsData';
import { TourRegion, Language, Currency, Tour } from '../types';
import { MapPin, Navigation, ArrowRight, ShieldCheck, Compass, ArrowLeft, Grid, X, WifiOff, DownloadCloud, CheckCircle2, RefreshCw } from 'lucide-react';
import { formatCurrency, getLangText, UI_TRANSLATIONS } from '../utils/i18n';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
        ? \`¡Mapa y \${toursToSave.length} tours guardados! Ahora puedes usar el mapa sin conexión a internet.\`
        : \`Map and \${toursToSave.length} tours saved! You can now use the map without internet connection.\`;
      
      alert(msg);
    } catch (error) {
      alert(language === 'es' ? 'Error al guardar datos offline.' : 'Error saving offline data.');
    }
  };

  const effectiveTours = tours.length > 0 ? tours : cachedToursList;
  const activeRegionObj = REGIONS_DATA.find(r => r.id === selectedRegion) || REGIONS_DATA[0];

  const handleExit = () => {
    if (onExitMap) {
      onExitMap();
    } else if (onExploreRegionTours) {
      onExploreRegionTours('all' as TourRegion);
    }
  };

  // Determine map center and zoom
  let mapCenter: [number, number] = [9.7489, -83.7534]; // Default Costa Rica center
  let mapZoom = 7;

  if (selectedMapTour) {
    mapCenter = [selectedMapTour.location.lat, selectedMapTour.location.lng];
    mapZoom = 11;
  } else if (selectedRegion !== 'all' && activeRegionObj) {
    // We approximate the region lat/lng based on a known point or we can just use a default
    // We will find the first tour in the region, or fallback to center
    const regionTours = effectiveTours.filter(t => t.region === selectedRegion);
    if (regionTours.length > 0) {
      mapCenter = [regionTours[0].location.lat, regionTours[0].location.lng];
      mapZoom = 9;
    }
  }

  return (
    <section className="bg-stone-950 text-white py-12 lg:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Offline Status & Cache Banner */}
        {!isOnline && (
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-full">
                <WifiOff className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-orange-400 text-sm">
                  {language === 'es' ? 'Modo Sin Conexión' : 'Offline Mode'}
                </h3>
                <p className="text-xs text-orange-200 mt-1">
                  {isMapCached 
                    ? (language === 'es' 
                        ? \`Viendo copia guardada (\${cachedTourCount} tours disponibles).\` 
                        : \`Viewing saved copy (\${cachedTourCount} tours available).\`)
                    : (language === 'es'
                        ? 'No hay datos guardados para ver offline.'
                        : 'No saved data to view offline.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Map Header Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <button 
            onClick={handleExit}
            className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors group text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {language === 'es' ? 'Volver a Tours' : 'Back to Tours'}
          </button>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={handleManualCache}
              disabled={!isOnline}
              className={\`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm border \${
                isMapCached 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              } \${!isOnline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}\`}
            >
              {isMapCached ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Mapa Guardado' : 'Map Saved'}</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Guardar Mapa Offline' : 'Save Map Offline'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            {language === 'es' ? 'Mapa de Destinos' : 'Destinations Map'}
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
            {language === 'es'
              ? 'Explora Costa Rica de forma interactiva. Selecciona los pines para ver detalles de los tours.'
              : 'Explore Costa Rica interactively. Select pins to view tour details.'}
          </p>
        </div>

        {/* Map & Detail Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-stone-900 p-2 sm:p-4 rounded-[2rem] border border-white/10 shadow-2xl">
          
          {/* Interactive Leaflet Map Column */}
          <div className="lg:col-span-8 relative bg-stone-950 rounded-[1.5rem] overflow-hidden min-h-[450px] sm:min-h-[550px] flex flex-col border border-white/5 shadow-inner z-0">
            <MapContainer 
              center={[9.7489, -83.7534]} 
              zoom={7} 
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              className="absolute inset-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              
              <MapViewUpdater center={mapCenter} zoom={mapZoom} />

              {/* Render effective tours */}
              {effectiveTours.map(tour => {
                if (selectedRegion !== 'all' && tour.region !== selectedRegion) return null;
                const isSelected = selectedMapTour?.id === tour.id;
                
                return (
                  <Marker 
                    key={tour.id} 
                    position={[tour.location.lat, tour.location.lng]}
                    icon={isSelected ? customMarkerIcon : regionIcon}
                    eventHandlers={{
                      click: () => {
                        setSelectedMapTour(tour);
                      }
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="text-center font-bold text-sm">
                        {getLangText(tour.title, language)}
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>

          {/* Details Column */}
          <div className="lg:col-span-4 h-full">
            {selectedMapTour ? (
              <div className="bg-stone-950 rounded-[1.5rem] p-5 sm:p-6 shadow-xl border border-white/10 h-full flex flex-col animate-fade-in relative overflow-hidden">
                <button 
                  onClick={() => setSelectedMapTour(null)}
                  className="absolute top-4 right-4 w-8 h-8 bg-stone-900 rounded-full flex items-center justify-center text-neutral-400 hover:text-white transition-colors border border-white/10 z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="relative w-full h-48 sm:h-56 rounded-xl overflow-hidden mb-5">
                  <img 
                    src={selectedMapTour.image} 
                    alt={selectedMapTour.title.en} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/40 to-transparent" />
                  
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                    <span className="bg-orange-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md shadow-lg">
                      {selectedMapTour.duration}
                    </span>
                    <div className="bg-stone-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-right">
                      <span className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-0.5">
                        {language === 'es' ? 'Precio' : 'Price'}
                      </span>
                      <span className="block font-black text-white leading-none">
                        {formatCurrency(selectedMapTour.price, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <h3 className="text-xl font-black text-white leading-tight mb-2">
                    {getLangText(selectedMapTour.title, language)}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 text-orange-400 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-bold tracking-wide uppercase">
                      {selectedMapTour.location.name}
                    </span>
                  </div>
                  
                  <p className="text-sm text-neutral-300 line-clamp-3 mb-6">
                    {getLangText(selectedMapTour.description, language)}
                  </p>

                  <div className="mt-auto space-y-2">
                    {onSelectTour && (
                      <button 
                        onClick={() => onSelectTour(selectedMapTour)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>{language === 'es' ? 'Ver Detalles Completos' : 'View Full Details'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-stone-950 rounded-[1.5rem] p-6 sm:p-8 shadow-xl border border-white/10 h-full flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center mb-4 border border-white/5">
                  <MapPin className="w-8 h-8 text-orange-500/50" />
                </div>
                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">
                  {language === 'es' ? 'Selecciona un Tour' : 'Select a Tour'}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed max-w-[200px]">
                  {language === 'es' 
                    ? 'Haz clic en los pines del mapa para ver los detalles de cada experiencia.' 
                    : 'Click on the map pins to view the details of each experience.'}
                </p>
                <div className="mt-8 flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse delay-75" />
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse delay-150" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
`;

fs.writeFileSync('src/components/InteractiveMap.tsx', content);
