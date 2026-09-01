import React, { useState, useEffect } from 'react';
import { Tour, Language, Currency } from '../types';
import { getLangText, formatCurrency, UI_TRANSLATIONS } from '../utils/i18n';
import { Star, Clock, MapPin, Leaf, Shield, ArrowRight, ExternalLink, X, Compass, Navigation, Heart, Scale, Check } from 'lucide-react';

interface TourCardProps {
  tour: Tour;
  language: Language;
  currency: Currency;
  onSelectTour: (tour: Tour) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (tourId: string) => void;
  isCompared?: boolean;
  onToggleCompare?: (tour: Tour) => void;
  viewMode?: 'grid' | 'list';
}

export const TourCard: React.FC<TourCardProps> = ({
  tour,
  language,
  currency,
  onSelectTour,
  isFavorite = false,
  onToggleFavorite,
  isCompared = false,
  onToggleCompare,
  viewMode = 'grid'
}) => {
  const t = (key: string) => UI_TRANSLATIONS[key]?.[language] || UI_TRANSLATIONS[key]?.['es'] || key;
  const [showMiniMap, setShowMiniMap] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMiniMap(false);
      }
    };
    if (showMiniMap) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showMiniMap]);

  // Convert USD to selected currency
  const formattedPrice = formatCurrency(tour.priceUSD, currency);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${tour.location.lat},${tour.location.lng}`;
  const embedMapsUrl = `https://maps.google.com/maps?q=${tour.location.lat},${tour.location.lng}&z=12&output=embed`;

  const titleText = getLangText(tour.title, language);
  const subtitleText = getLangText(tour.subtitle, language);
  const durationText = getLangText(tour.durationLabel, language);
  const inclusionsList = getLangText(tour.inclusions, language, []);

  return (
    <>
      <div 
        onClick={() => onSelectTour(tour)}
        className={`relative rounded-[2rem] border border-white/10 hover:border-amber-400 transition-all duration-500 overflow-hidden flex ${
          viewMode === 'list' ? 'flex-col lg:flex-row' : 'flex-col h-full'
        } group cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:-translate-y-2 bg-emerald-950/80 backdrop-blur-xl`}
      >
        {/* Image Container */}
        <div className={`relative overflow-hidden ${viewMode === 'list' ? 'shrink-0 w-full lg:w-[40%] h-48 lg:h-auto' : 'w-full flex-1 min-h-[14rem] sm:min-h-[16rem]'}`}>
          <img
            src={tour.image}
            alt={titleText}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          {/* Soft gradient to ensure top badges are readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/10 to-emerald-950/80 pointer-events-none"></div>
          
          {/* Top Actions: Badges & Favorites */}
          <div className="absolute top-0 left-0 w-full p-4 flex items-start justify-between z-10">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {tour.bestseller && (
                  <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg">
                    🔥 Bestseller
                  </span>
                )}
                <span className="bg-green-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-green-400 shadow-sm flex items-center gap-1">
                  <Leaf className="w-3 h-3" />
                  {language === 'es' ? 'Eco-Sostenible' : 'Eco-Friendly'}
                </span>
                {tour.freeCancellation && (
                  <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-emerald-400 shadow-sm">
                    {t('freeCancellation')}
                  </span>
                )}
                {tour.maxGroupSize && tour.maxGroupSize >= 8 && (
                  <span className="bg-purple-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-purple-400 shadow-sm">
                    {language === 'es' ? 'Precios para Grupos' : 'Group Rates'}
                  </span>
                )}
                {tour.tourType && (
                  <span className="bg-teal-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-amber-400 shadow-sm">
                    {tour.tourType === 'private' ? t('privateTour') : t('groupTour')}
                  </span>
                )}
              </div>
              
              <div className="bg-emerald-950/70 backdrop-blur-md text-amber-400 px-2.5 py-1 rounded-full text-xs font-black flex items-center w-fit gap-1 border border-white/10 shadow-sm">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{tour.rating}</span>
                <span className="text-[10px] text-white/80">({tour.reviewsCount})</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 items-end">
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(tour.id);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                    isFavorite
                      ? 'bg-rose-500 text-white border-rose-400 scale-110 shadow-lg shadow-rose-500/30'
                      : 'bg-emerald-950/50 backdrop-blur-md text-white hover:text-rose-400 border-white/20 hover:scale-105'
                  }`}
                  title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                >
                  <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'fill-white' : ''}`} />
                </button>
              )}
              {onToggleCompare && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCompare(tour);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                    isCompared
                      ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/30'
                      : 'bg-emerald-950/50 backdrop-blur-md text-white hover:text-amber-400 border-white/20 hover:scale-105'
                  }`}
                  title={t('compareTour')}
                >
                  {isCompared ? <Check className="w-4.5 h-4.5" /> : <Scale className="w-4.5 h-4.5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className={`relative z-10 flex flex-col flex-1 p-5 ${viewMode === 'list' ? 'lg:w-[60%]' : ''}`}>
          <div className="space-y-2 mb-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMiniMap(true);
              }}
              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors text-[11px] font-black uppercase tracking-wider bg-emerald-950/50 px-2 py-1 rounded-full border border-emerald-900/50"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{tour.location.placeName.split(',')[0]}</span>
            </button>
            
            <h3 className="font-black text-xl sm:text-2xl text-white uppercase leading-tight group-hover:text-amber-400 transition-colors drop-shadow-md">
              {titleText}
            </h3>
            <p className="text-base text-neutral-300 line-clamp-2 leading-snug">
              {subtitleText}
            </p>

            {/* Agency Guarantee Ribbon */}
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-800">
                <Shield className="w-3 h-3 text-amber-400" />
                <span>{language === 'es' ? 'Servicio Receptivo Garantizado' : 'Guaranteed Inbound Service'}</span>
              </span>
            </div>
          </div>

          {/* Catalog Footer Actions */}
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-white/10">
            <div className="space-y-1">
              <span className="bg-emerald-900 text-amber-300 px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wider inline-block mb-1 border border-emerald-800">
                {durationText}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-bold uppercase text-white/60 mr-1">
                  {t('fromPrice')}
                </span>
                <span className="text-2xl font-black text-white">
                  {formattedPrice} {currency}
                </span>
              </div>
            </div>

            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectTour(tour);
              }}
              className="bg-amber-500 hover:bg-teal-600 border border-amber-400 text-white font-black px-4 py-2.5 rounded-xl flex items-center justify-center transition-transform shadow-lg group-hover:scale-105 cursor-pointer flex-shrink-0 gap-2 text-xs uppercase"
            >
              <span>{t('checkDetails')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mini-Map Location Pin Popup Modal */}
      {showMiniMap && (
        <div 
          onClick={() => setShowMiniMap(false)}
          className="fixed inset-0 z-50 bg-emerald-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-emerald-950/50 backdrop-blur-xl w-full max-w-xl max-h-[85vh] modal-scrollable overflow-y-auto rounded-[2.5rem] border border-emerald-900/50 shadow-[0_0_50px_rgba(99,102,241,0.2)] space-y-0 text-neutral-100 animate-in fade-in zoom-in-95 duration-200 cursor-default"
          >
            
            {/* Modal Header */}
            <div className="bg-emerald-900/80 p-5 sm:p-6 border-b border-emerald-900/50 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-emerald-950 text-amber-400 rounded-full text-[10px] font-black uppercase border border-emerald-900 shadow-sm">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>{tour.location.placeName}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white uppercase leading-snug">
                  {titleText}
                </h3>
                <p className="text-xs text-neutral-400">
                  📍 Coordenadas: <span className="font-mono text-amber-400 font-bold">{tour.location.lat.toFixed(4)}° N, {tour.location.lng.toFixed(4)}° W</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMiniMap(false)}
                className="bg-emerald-900 hover:bg-neutral-700 text-neutral-400 hover:text-white px-3 py-1.5 rounded-full flex items-center gap-1 font-bold text-xs border border-white/10 transition-colors shadow-sm flex-shrink-0"
                title={t('closeMap')}
              >
                <X className="w-4 h-4" />
                <span>{t('close')}</span>
              </button>
            </div>

            {/* Interactive Map Embed Container */}
            <div className="relative h-64 sm:h-72 w-full bg-neutral-100">
              <iframe
                title={`Map location for ${titleText}`}
                src={embedMapsUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full filter saturate-150 contrast-125 brightness-95"
              />

              {/* Pin Overlay Badge */}
              <div className="absolute top-3 left-3 bg-emerald-950/50 backdrop-blur-xl/90 text-amber-400 text-[11px] font-black uppercase px-3 py-1.5 rounded-full border border-amber-500/30 shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping" />
                <span>📍 Punto Exacto del Tour</span>
              </div>
            </div>

            {/* Location Details & Shuttle Logistics */}
            <div className="p-5 sm:p-6 space-y-4 bg-emerald-950/50 backdrop-blur-xl">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-emerald-900/50 p-3 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold uppercase text-amber-400 block">
                    {t('hotelPickup')}
                  </span>
                  <span className="text-white font-black line-clamp-1">
                    {tour.pickupHotels.length} {t('hotelsCovered')}
                  </span>
                </div>

                <div className="bg-emerald-900/50 p-3 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold uppercase text-amber-400 block">
                    {t('departureTimes')}
                  </span>
                  <span className="text-amber-400 font-black line-clamp-1">
                    {tour.departureTimes.join(' | ')}
                  </span>
                </div>
              </div>

              {/* Action Buttons inside Mini Map Popup */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-900/50 hover:bg-neutral-700 text-amber-400 hover:text-white font-bold text-[11px] uppercase py-3 px-3 rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-1.5 text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                  <span>Google Maps</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setShowMiniMap(false);
                    onSelectTour(tour);
                  }}
                  className="bg-gradient-to-r from-teal-600 to-teal-600 hover:from-amber-500 hover:to-amber-500 border border-amber-400/50 text-white font-black text-[11px] uppercase py-3 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <span>{t('bookTour')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowMiniMap(false)}
                  className="bg-red-500/20 hover:bg-red-600/80 text-red-200 hover:text-white font-bold text-[11px] uppercase py-3 px-3 rounded-xl border border-red-500/40 transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{t('exitMap')}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

