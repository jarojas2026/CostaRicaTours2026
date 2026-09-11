import React, { useState, useEffect } from 'react';
import { Tour, Language, Currency } from '../types';
import { getLangText, formatCurrency, UI_TRANSLATIONS } from '../utils/i18n';

import { LazyImage } from './LazyImage';
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
        className={`relative rounded-3xl transition-all duration-300 overflow-hidden flex ${
          viewMode === 'list' ? 'flex-col lg:flex-row' : 'flex-col h-full'
        } group cursor-pointer bg-[#07241a] border border-emerald-500/25 hover:border-amber-400 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1`}
      >
        {/* Image Container with Crisp Aspect Ratio */}
        <div className={`relative overflow-hidden ${viewMode === 'list' ? 'shrink-0 w-full lg:w-[38%] h-56 lg:h-auto' : 'w-full aspect-[4/3] shrink-0'}`}>
          <LazyImage src={tour.image} alt={titleText} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
          
          {/* Subtle Top & Bottom Gradient Shadows for Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" />
          
          {/* Top Row: Clean Highlight Badge & Action Buttons */}
          <div className="absolute top-0 left-0 w-full p-3.5 flex items-center justify-between z-10">
            <div>
              {tour.bestseller ? (
                <span className="inline-flex items-center gap-1.5 bg-amber-400 text-stone-950 text-xs font-black px-3 py-1 rounded-full shadow-md">
                  <span>🔥</span>
                  <span>{language === 'es' ? 'Más Popular' : 'Top Choice'}</span>
                </span>
              ) : tour.freeCancellation ? (
                <span className="inline-flex items-center gap-1 bg-emerald-950/90 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/40 backdrop-blur-md shadow-md">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'es' ? 'Cancelación Gratis' : 'Free Cancel'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-emerald-950/90 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/40 backdrop-blur-md shadow-md">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'es' ? 'Sostenible CST' : 'CST Certified'}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(tour.id);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md ${
                    isFavorite
                      ? 'bg-rose-500 text-white scale-105'
                      : 'bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20'
                  }`}
                  title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                  aria-label="Favorito"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
                </button>
              )}
              {onToggleCompare && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCompare(tour);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md ${
                    isCompared
                      ? 'bg-amber-400 text-stone-950 scale-105 font-bold'
                      : 'bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20'
                  }`}
                  title={t('compareTour')}
                  aria-label="Comparar"
                >
                  {isCompared ? <Check className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Bottom of Photo: Rating & Duration Chips */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-bold text-white z-10 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-extrabold text-white">{tour.rating}</span>
              <span className="text-stone-300 font-normal">({tour.reviewsCount})</span>
            </div>

            <div className="inline-flex items-center gap-1 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-stone-200">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{durationText}</span>
            </div>
          </div>
        </div>

        {/* Card Content Body */}
        <div className={`flex flex-col flex-1 p-5 justify-between ${viewMode === 'list' ? 'lg:w-[62%]' : ''}`}>
          
          <div className="space-y-2.5">
            {/* Location Link with Map Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMiniMap(true);
              }}
              className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-amber-300 transition-colors text-xs font-bold uppercase tracking-wider group/loc text-left"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover/loc:scale-110 transition-transform" />
              <span className="underline decoration-emerald-500/40 underline-offset-2">{tour.location.placeName.split(',')[0]}</span>
            </button>
            
            {/* Tour Title */}
            <h3 className="font-bold text-lg sm:text-xl text-white leading-snug group-hover:text-amber-400 transition-colors">
              {titleText}
            </h3>

            {/* Description Snippet */}
            <p className="text-sm text-stone-300 line-clamp-2 leading-relaxed font-normal">
              {subtitleText}
            </p>
          </div>

          {/* Footer: Clear Price & Primary Action */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-emerald-500/20">
            <div className="space-y-0.5">
              <span className="text-xs text-stone-400 font-medium block">
                {language === 'es' ? 'Precio por persona' : 'Price per person'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-400 tracking-tight">
                  {formattedPrice}
                </span>
                <span className="text-xs font-bold text-stone-300">{currency}</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectTour(tour);
              }}
              className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide transition-all shadow-md group-hover:scale-105 cursor-pointer"
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-[#062017] backdrop-blur-xl w-full max-w-xl max-h-[85vh] modal-scrollable overflow-y-auto rounded-[2.5rem] border border-emerald-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-0 text-stone-100 animate-in fade-in zoom-in-95 duration-200 cursor-default"
          >
            
            {/* Modal Header */}
            <div className="bg-[#041710] p-5 sm:p-6 border-b border-emerald-500/30 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-white text-orange-400 rounded-full text-[10px] font-black uppercase border border-stone-200 shadow-sm">
                  <MapPin className="w-3 h-3 text-orange-400" />
                  <span>{tour.location.placeName}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white uppercase leading-snug">
                  {titleText}
                </h3>
                <p className="text-xs text-emerald-200/80">
                  📍 Coordenadas: <span className="font-mono text-orange-400 font-bold">{tour.location.lat.toFixed(4)}° N, {tour.location.lng.toFixed(4)}° W</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMiniMap(false)}
                className="bg-emerald-950/80 hover:bg-emerald-900 text-stone-200 hover:text-white px-3 py-1.5 rounded-full flex items-center gap-1 font-bold text-xs border border-emerald-500/40 transition-colors shadow-sm flex-shrink-0"
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
              <div className="absolute top-3 left-3 bg-white/50 backdrop-blur-xl/90 text-orange-400 text-[11px] font-black uppercase px-3 py-1.5 rounded-full border border-orange-500/30 shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping" />
                <span>📍 Punto Exacto del Tour</span>
              </div>
            </div>

            {/* Location Details & Shuttle Logistics */}
            <div className="p-5 sm:p-6 space-y-4 bg-white/50 backdrop-blur-xl">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-100/50 p-3 rounded-2xl border border-black/10">
                  <span className="text-[10px] font-bold uppercase text-orange-400 block">
                    {t('hotelPickup')}
                  </span>
                  <span className="text-stone-900 font-black line-clamp-1">
                    {tour.pickupHotels.length} {t('hotelsCovered')}
                  </span>
                </div>

                <div className="bg-stone-100/50 p-3 rounded-2xl border border-black/10">
                  <span className="text-[10px] font-bold uppercase text-orange-400 block">
                    {t('departureTimes')}
                  </span>
                  <span className="text-orange-400 font-black line-clamp-1">
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
                  className="bg-stone-100/50 hover:bg-neutral-700 text-orange-400 hover:text-stone-900 font-bold text-[11px] uppercase py-3 px-3 rounded-xl border border-black/10 transition-colors flex items-center justify-center gap-1.5 text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
                  <span>Google Maps</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setShowMiniMap(false);
                    onSelectTour(tour);
                  }}
                  className="bg-gradient-to-r from-teal-600 to-teal-600 hover:from-orange-500 hover:to-orange-500 border border-orange-400/50 text-stone-900 font-black text-[11px] uppercase py-3 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <span>{t('bookTour')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowMiniMap(false)}
                  className="bg-red-500/20 hover:bg-red-600/80 text-red-200 hover:text-stone-900 font-bold text-[11px] uppercase py-3 px-3 rounded-xl border border-red-500/40 transition-colors flex items-center justify-center gap-1.5"
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

