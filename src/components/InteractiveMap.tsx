import React, { useState, useEffect } from 'react';
import { REGIONS_DATA } from '../data/regionsData';
import { TourRegion, Language, Currency, Tour } from '../types';
import { MapPin, Navigation, ArrowRight, ShieldCheck, Compass, ArrowLeft, Grid, X, WifiOff, DownloadCloud, CheckCircle2, RefreshCw } from 'lucide-react';
import { formatCurrency, getLangText, UI_TRANSLATIONS } from '../utils/i18n';

const getMapCoordinates = (lat: number, lng: number) => {
  const x = (lng + 86.5) * 23;
  const y = (11.5 - lat) * 30;
  return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
};

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

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  language,
  currency = 'USD' as Currency,
  tours = [],
  selectedRegion,
  onSelectRegion,
  onExploreRegionTours,
  onSelectTour,
  onExitMap
}) => {
  const t = (key: string) => UI_TRANSLATIONS[key]?.[language] || UI_TRANSLATIONS[key]?.['es'] || key;
  const [selectedMapTour, setSelectedMapTour] = useState<Tour | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isMapCached, setIsMapCached] = useState<boolean>(false);
  const [cachedTourCount, setCachedTourCount] = useState<number>(0);
  const [cacheNotification, setCacheNotification] = useState<string | null>(null);
  const [cachedToursList, setCachedToursList] = useState<Tour[]>([]);

  // Monitor network connectivity status & load offline cached data
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Read stored offline map cache on mount
    try {
      const savedToursRaw = localStorage.getItem(OFFLINE_CACHE_KEY);
      if (savedToursRaw) {
        const parsedTours: Tour[] = JSON.parse(savedToursRaw);
        if (Array.isArray(parsedTours) && parsedTours.length > 0) {
          setCachedToursList(parsedTours);
          setCachedTourCount(parsedTours.length);
          setIsMapCached(true);
        }
      }
    } catch (e) {
      console.warn('Could not parse offline map cache:', e);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save current map tours & regions data to localStorage
  const handleSaveMapOffline = () => {
    try {
      const toursToSave = tours.length > 0 ? tours : cachedToursList;
      localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(toursToSave));
      localStorage.setItem(OFFLINE_REGIONS_KEY, JSON.stringify(REGIONS_DATA));
      setCachedToursList(toursToSave);
      setCachedTourCount(toursToSave.length);
      setIsMapCached(true);
      
      const msg = language === 'es' 
        ? `¡Mapa guardado exitosamente! ${toursToSave.length} puntos de interés disponibles sin conexión.`
        : `Map saved successfully! ${toursToSave.length} destinations available offline.`;
      setCacheNotification(msg);
      setTimeout(() => setCacheNotification(null), 4000);
    } catch (e) {
      console.error('Error saving map to offline cache:', e);
      const err = language === 'es' ? 'Error al guardar el mapa offline.' : 'Failed to save offline map.';
      setCacheNotification(err);
      setTimeout(() => setCacheNotification(null), 3000);
    }
  };

  // Determine effective tours list (use current or fall back to offline cache if offline)
  const effectiveTours = (tours && tours.length > 0) 
    ? tours 
    : cachedToursList;

  const activeRegionObj = REGIONS_DATA.find(r => r.id === selectedRegion) || REGIONS_DATA[0];

  const handleExit = () => {
    if (onExitMap) {
      onExitMap();
    } else if (onExploreRegionTours) {
      onExploreRegionTours('all');
    }
  };

  return (
    <section className="bg-[#1E7B4A] text-white py-12 lg:py-16 px-4 sm:px-6 lg:px-8 border-b-4 border-[#0B668F]/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Offline Status & Cache Banner */}
        {!isOnline && (
          <div className="bg-[#E67E22] text-white p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <WifiOff className="w-6 h-6 flex-shrink-0 text-white" />
              <div>
                <p className="font-extrabold text-sm uppercase tracking-wide">
                  {language === 'es' ? 'Modo Sin Conexión Detectado (Selva / Montaña)' : 'Offline Mode Active (Low/No Cellular Coverage)'}
                </p>
                <p className="text-xs text-white/90">
                  {language === 'es'
                    ? `Navegando con datos guardados en caché local (${cachedTourCount} destinos y mapa almacenado).`
                    : `Browsing with saved offline local cache (${cachedTourCount} destinations & map stored).`}
                </p>
              </div>
            </div>
            <span className="bg-white text-[#E67E22] text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
              {language === 'es' ? 'Modo Offline' : 'Offline Ready'}
            </span>
          </div>
        )}

        {/* Cache Notification Toast */}
        {cacheNotification && (
          <div className="bg-[#0B668F] text-white p-3.5 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
            <span>{cacheNotification}</span>
          </div>
        )}

        {/* Top Back & Offline Storage Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 pb-4">
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-black uppercase tracking-wider border border-white/20 transition-all shadow-md group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#E67E22] group-hover:-translate-x-1 transition-transform" />
            <span>{language === 'es' ? 'Volver al Catálogo de Tours' : 'Back to Tours Catalog'}</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Cache Map Button */}
            <button
              onClick={handleSaveMapOffline}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                isMapCached
                  ? 'bg-[#0B668F] text-white border border-white/30 hover:bg-[#084e6e]'
                  : 'bg-[#E67E22] text-white hover:bg-[#d67118]'
              }`}
            >
              {isMapCached ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{language === 'es' ? `Mapa Offline Guardado (${cachedTourCount})` : `Map Cached (${cachedTourCount})`}</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4 text-white" />
                  <span>{language === 'es' ? 'Guardar Mapa para Uso Sin Conexión' : 'Save Map for Offline Use'}</span>
                </>
              )}
            </button>

            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-2 bg-white/10 text-white rounded-full text-[11px] font-bold border border-white/20">
              <Compass className="w-3.5 h-3.5 text-[#E67E22]" />
              <span>{language === 'es' ? 'Navegación GPS / Caché Local' : 'GPS / Local Offline Mode'}</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 text-white rounded-full text-xs font-black uppercase tracking-widest border border-white/20">
            <Compass className="w-4 h-4 text-[#E67E22]" />
            {language === 'es' ? 'Explorador Geográfico & Caché Offline' : 'Costa Rica Geographic Explorer & Offline Cache'}
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            {language === 'es' ? 'Mapa de Regiones y Destinos Top' : 'Regions & Top Destinations Map'}
          </h2>

          <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
            {language === 'es'
              ? 'Haz clic en los puntos del mapa para descubrir tours, microclimas y logística. Los datos quedan guardados en la memoria de tu dispositivo para utilizarlos en zonas sin señal de celular.'
              : 'Click region hotspots on the map to discover tours, microclimates, and logistics. Data is saved to local storage for use in areas with poor connectivity.'}
          </p>
        </div>

        {/* Map & Detail Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#F4F7F5] text-[#2C3330] p-6 sm:p-8 rounded-[2rem] border-2 border-white/30 shadow-2xl">
          
          {/* Interactive Graphic Map Column */}
          <div className="lg:col-span-7 relative bg-white rounded-[1.5rem] p-6 border border-neutral-200 min-h-[380px] sm:min-h-[460px] flex flex-col justify-between overflow-hidden shadow-sm">
            
            {/* Map Header badge */}
            <div className="flex justify-between items-center z-10">
              <span className="text-[10px] font-black uppercase bg-[#1E7B4A] text-white px-3 py-1 rounded-full border border-white/20 shadow-sm">
                📍 {language === 'es' ? 'Costa Rica (Caribe y Pacífico)' : 'Costa Rica (Caribbean & Pacific Coast)'}
              </span>

              <button
                onClick={() => onSelectRegion('all')}
                className="text-[11px] font-bold text-[#0B668F] hover:underline uppercase"
              >
                {language === 'es' ? 'Ver todo el mapa' : 'Reset Map View'}
              </button>
            </div>

            {/* Stylized Costa Rica SVG Outline */}
            <div className="relative w-full h-[320px] sm:h-[380px] my-auto">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full opacity-15 text-[#1E7B4A] fill-current"
              >
                <path d="M 15 20 Q 30 15 50 25 Q 70 20 85 30 Q 90 40 75 55 Q 85 70 70 90 Q 55 75 40 65 Q 25 55 15 35 Z" />
              </svg>

              {/* Ocean Labels */}
              <div className="absolute top-4 left-4 text-[10px] font-black uppercase text-[#0B668F] tracking-widest pointer-events-none">
                🌊 Océano Pacífico Norte
              </div>
              <div className="absolute top-4 right-4 text-[10px] font-black uppercase text-[#0B668F] tracking-widest pointer-events-none">
                🏝️ Mar Caribe
              </div>
              <div className="absolute bottom-4 left-6 text-[10px] font-black uppercase text-[#0B668F] tracking-widest pointer-events-none">
                🐋 Pacífico Sur (Osa)
              </div>

              {/* Tour Pins */}
              {effectiveTours.map(tour => {
                const isSelected = selectedMapTour?.id === tour.id;
                const coords = getMapCoordinates(tour.location.lat, tour.location.lng);
                if (selectedRegion !== 'all' && tour.region !== selectedRegion) return null;
                
                return (
                  <button
                    key={tour.id}
                    onClick={() => setSelectedMapTour(tour)}
                    style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group ${
                      isSelected ? 'z-40 scale-125' : 'z-30 hover:scale-110'
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center font-black shadow-lg border-2 ${
                          isSelected
                            ? 'bg-[#E67E22] text-white border-white scale-110'
                            : 'bg-[#1E7B4A] text-white border-white hover:bg-[#E67E22]'
                        }`}
                      />
                      {!isSelected && (
                        <span className="absolute top-5 whitespace-nowrap text-[9px] font-bold px-2 py-0.5 rounded shadow-lg border bg-[#2C3330] text-white border-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          {tour.title[language] || tour.title.es}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Hotspot Pins */}
              {REGIONS_DATA.map((reg) => {
                const isSelected = selectedRegion === reg.id;
                return (
                  <button
                    key={reg.id}
                    onClick={() => onSelectRegion(reg.id)}
                    style={{ left: `${reg.coordinates.x}%`, top: `${reg.coordinates.y}%` }}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group ${
                      isSelected ? 'z-30 scale-125' : 'z-20 hover:scale-110'
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <span
                        className={`absolute w-8 h-8 rounded-full animate-ping opacity-40 ${
                          isSelected ? 'bg-[#E67E22]' : 'bg-[#1E7B4A]'
                        }`}
                      />
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-xl border-2 ${
                          isSelected
                            ? 'bg-[#E67E22] text-white border-white scale-110'
                            : 'bg-[#0B668F] text-white border-white'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                      </div>

                      {/* Floating tooltip label */}
                      <span
                        className={`absolute top-8 whitespace-nowrap text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-lg border transition-all ${
                          isSelected
                            ? 'bg-[#E67E22] text-white border-white'
                            : 'bg-[#1E7B4A] text-white border-white/20 group-hover:bg-[#0B668F]'
                        }`}
                      >
                        {reg.name.split('/')[0]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] text-neutral-500 text-center font-medium pt-2 border-t border-neutral-200">
              💡 {language === 'es' ? 'Haz clic en los marcadores para explorar detalles (Disponibles sin Internet)' : 'Click markers to explore details (Available Offline)'}
            </div>
          </div>

          {/* Details Column */}
          <div className="lg:col-span-5 space-y-6 text-left relative">
            {selectedMapTour ? (
              <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-lg flex flex-col h-full animate-fade-in">
                <div className="relative h-48 sm:h-56">
                  <img
                    src={selectedMapTour.image}
                    alt={selectedMapTour.title[language] || selectedMapTour.title.es}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2C3330]/90 via-[#2C3330]/40 to-transparent" />
                  <button
                    onClick={() => setSelectedMapTour(null)}
                    className="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="bg-[#E67E22] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full mb-2 inline-block">
                      {getLangText(selectedMapTour.category, language)}
                    </span>
                    <h3 className="text-xl font-black text-white uppercase leading-tight">
                      {selectedMapTour.title[language] || selectedMapTour.title.es}
                    </h3>
                  </div>
                </div>
                
                <div className="p-5 space-y-4 flex-grow">
                  <p className="text-xs text-[#2C3330] leading-relaxed line-clamp-3">
                    {selectedMapTour.description[language] || selectedMapTour.description.es}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                    <div>
                      <span className="text-[10px] text-neutral-500 font-bold block uppercase">
                        {t('priceFrom')}
                      </span>
                      <span className="text-xl font-black text-[#E67E22]">
                        {formatCurrency(selectedMapTour.priceUSD, currency)} {currency}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (onSelectTour) onSelectTour(selectedMapTour);
                      }}
                      className="bg-[#1E7B4A] hover:bg-[#165a36] text-white font-black text-[11px] uppercase py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 shadow-md hover:scale-105 cursor-pointer"
                    >
                      <span>{t('viewDetails')}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#E67E22]" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="relative h-48 rounded-2xl overflow-hidden border-2 border-neutral-200 shadow-md">
                  <img
                    src={activeRegionObj.image}
                    alt={activeRegionObj.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2C3330]/90 via-[#2C3330]/40 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="bg-[#1E7B4A] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                      Destino Seleccionado
                    </span>
                    <h3 className="text-2xl font-black text-white uppercase mt-1">
                      {activeRegionObj.name}
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#2C3330] leading-relaxed font-medium">
                  {activeRegionObj.tagline[language]}
                </p>

                <div className="bg-white p-4 rounded-2xl border border-neutral-200 space-y-2 text-xs shadow-sm">
                  <div className="flex justify-between items-center text-neutral-600">
                    <span className="font-bold">{t('primaryAccess')}</span>
                    <span className="text-[#2C3330] font-black">
                      {activeRegionObj.id === 'arenal' || activeRegionObj.id === 'monteverde'
                        ? 'Terrestre / Van Privada (3-3.5 hrs desde SJO)'
                        : activeRegionObj.id === 'tortuguero' || activeRegionObj.id === 'osa'
                        ? 'Lancha Rápida / Vuelo Doméstico'
                        : 'Carretera Pavimentada / Transfer Directo'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-600 border-t border-neutral-100 pt-2">
                    <span className="font-bold">{t('weatherPacking')}</span>
                    <span className="text-[#2C3330] font-black">
                      {activeRegionObj.id === 'monteverde'
                        ? 'Fresco / Templado (Traer abrigo)'
                        : activeRegionObj.id === 'guanacaste'
                        ? 'Cálido & Soleado (Traer traje de baño)'
                        : 'Tropical Cálido Húmedo'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onExploreRegionTours) {
                        onExploreRegionTours(activeRegionObj.id);
                      } else {
                        onSelectRegion(activeRegionObj.id);
                      }
                    }}
                    className="w-full bg-[#E67E22] hover:bg-[#d67118] text-white font-black text-xs uppercase py-3.5 px-6 rounded-full transition-transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>
                      {language === 'es'
                        ? `Ver Tours en ${activeRegionObj.name.split('/')[0]}`
                        : `Explore Tours in ${activeRegionObj.name.split('/')[0]}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleExit}
                    className="w-full bg-white hover:bg-neutral-100 text-[#2C3330] font-bold text-xs uppercase py-2.5 px-4 rounded-full border border-neutral-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-[#E67E22]" />
                    <span>{t('exitMapViewAll')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
