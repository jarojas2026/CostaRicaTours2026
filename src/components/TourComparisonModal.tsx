import React from 'react';
import { Tour, Language, Currency } from '../types';
import { getLangText } from '../utils/i18n';
import { X, Scale, Star, Leaf, Clock, MapPin, Check, ExternalLink, ArrowRight } from 'lucide-react';

interface TourComparisonModalProps {
  comparedTours: Tour[];
  language: Language;
  currency: Currency;
  onClose: () => void;
  onRemoveTour: (tourId: string) => void;
  onSelectTour: (tour: Tour) => void;
}

export const TourComparisonModal: React.FC<TourComparisonModalProps> = ({
  comparedTours,
  language,
  currency,
  onClose,
  onRemoveTour,
  onSelectTour,
}) => {
  React.useEffect(() => {
    if (comparedTours.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [comparedTours.length]);

  if (comparedTours.length === 0) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-stone-950 w-full max-w-5xl max-h-[88vh] modal-scrollable overflow-y-auto rounded-[2.5rem] border-4 border-white/10 shadow-2xl space-y-0 text-white cursor-default animate-in fade-in zoom-in-95 duration-200"
      >
        
        {/* Header */}
        <div className="bg-stone-900 p-5 sm:p-6 border-b-2 border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 text-neutral-900 rounded-2xl flex items-center justify-center font-black shadow-lg">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                {language === 'es' ? 'Comparador de Excursiones' : 'Tour Comparison Tool'}
              </h3>
              <p className="text-xs text-[#A7F3D0]">
                {language === 'es' 
                  ? `Comparando ${comparedTours.length} de 3 tours seleccionados` 
                  : `Comparing ${comparedTours.length} of 3 selected tours`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-red-500/20 hover:bg-red-600 text-red-200 hover:text-white px-3.5 py-2 rounded-full flex items-center gap-1.5 font-bold text-xs border border-red-500/40 transition-colors shadow-md flex-shrink-0"
          >
            <X className="w-4 h-4" />
            <span>{language === 'es' ? 'Cerrar' : 'Close'}</span>
          </button>
        </div>

        {/* Side-by-Side Comparison Table Container */}
        <div className="p-4 sm:p-6 overflow-x-auto">
          <div className="min-w-[600px] grid grid-cols-1 divide-y divide-neutral-800">
            
            {/* Tour Headers Row */}
            <div className={`grid grid-cols-${comparedTours.length + 1} gap-4 pb-4 items-stretch`}>
              <div className="font-black text-xs uppercase text-[#FF8C00] flex items-end pb-2">
                {language === 'es' ? 'Excursión' : 'Excursion'}
              </div>

              {comparedTours.map((tour) => {
                const titleText = getLangText(tour.title, language);
                const priceFormatted = currency === 'USD'
                  ? `$${tour.priceUSD}`
                  : `₡${Math.round(tour.priceUSD * 515).toLocaleString('es-CR')}`;

                return (
                  <div key={tour.id} className="bg-stone-900 p-4 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3 relative group">
                    <button
                      type="button"
                      onClick={() => onRemoveTour(tour.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 z-10"
                      title={language === 'es' ? 'Quitar de la comparación' : 'Remove from comparison'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    <img 
                      src={tour.image} 
                      alt={titleText} 
                      className="w-full h-28 object-cover rounded-xl border border-white/10"
                    />

                    <div>
                      <h4 className="font-black text-sm text-white uppercase leading-tight line-clamp-2">
                        {titleText}
                      </h4>
                      <p className="text-[11px] text-[#A7F3D0] mt-1">
                        📍 {tour.location.placeName.split(',')[0]}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-lg font-black text-[#FFD700]">{priceFormatted}</span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectTour(tour);
                        }}
                        className="bg-orange-500 hover:bg-teal-600 text-neutral-900 font-black text-[11px] uppercase px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 shadow-md"
                      >
                        <span>{language === 'es' ? 'Ver' : 'View'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Row */}
            <div className={`grid grid-cols-${comparedTours.length + 1} gap-4 py-3 text-xs items-center`}>
              <div className="font-bold text-[#A7F3D0]">
                💰 {language === 'es' ? 'Precio por persona' : 'Price per person'}
              </div>
              {comparedTours.map((tour) => (
                <div key={tour.id} className="font-black text-white text-sm">
                  {currency === 'USD' ? `$${tour.priceUSD}` : `₡${Math.round(tour.priceUSD * 515).toLocaleString('es-CR')}`}
                </div>
              ))}
            </div>

            {/* Duration & Difficulty Row */}
            <div className={`grid grid-cols-${comparedTours.length + 1} gap-4 py-3 text-xs items-center`}>
              <div className="font-bold text-[#A7F3D0]">
                ⏱️ {language === 'es' ? 'Duración y Nivel' : 'Duration & Difficulty'}
              </div>
              {comparedTours.map((tour) => (
                <div key={tour.id} className="space-y-1">
                  <span className="bg-neutral-700 text-white px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-block">
                    {getLangText(tour.durationLabel, language)}
                  </span>
                  <div className="text-[11px] text-gray-300 font-semibold">
                    {getLangText(tour.difficultyLabel, language)}
                  </div>
                </div>
              ))}
            </div>

            {/* Customer Rating Row */}
            <div className={`grid grid-cols-${comparedTours.length + 1} gap-4 py-3 text-xs items-center`}>
              <div className="font-bold text-[#A7F3D0]">
                ⭐ {language === 'es' ? 'Calificación' : 'Customer Rating'}
              </div>
              {comparedTours.map((tour) => (
                <div key={tour.id} className="flex items-center gap-1 text-[#FFD700] font-black">
                  <Star className="w-4 h-4 fill-[#FFD700]" />
                  <span>{tour.rating}</span>
                  <span className="text-[10px] text-gray-300 font-normal">({tour.reviewsCount} reseñas)</span>
                </div>
              ))}
            </div>

            {/* Inclusions Highlights Row */}
            <div className={`grid grid-cols-${comparedTours.length + 1} gap-4 py-3 text-xs items-start`}>
              <div className="font-bold text-[#A7F3D0]">
                📋 {language === 'es' ? 'Servicios Incluidos' : 'Included Services'}
              </div>
              {comparedTours.map((tour) => {
                const inclusions = getLangText(tour.inclusions, language, []);
                return (
                  <ul key={tour.id} className="space-y-1 text-[11px] text-gray-200">
                    {inclusions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-[#FF8C00]">✓</span>
                        <span className="leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              })}
            </div>

            {/* Hotel Pickup Row */}
            <div className={`grid grid-cols-${comparedTours.length + 1} gap-4 py-3 text-xs items-start`}>
              <div className="font-bold text-[#A7F3D0]">
                🏨 {language === 'es' ? 'Pick-up en Hotel' : 'Hotel Pickup'}
              </div>
              {comparedTours.map((tour) => (
                <div key={tour.id} className="text-[11px] text-gray-300 leading-relaxed">
                  {tour.pickupHotels.length} hoteles en la zona ({tour.pickupHotels.slice(0, 2).join(', ')}...)
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-stone-900 p-4 sm:p-5 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              comparedTours.forEach(t => onRemoveTour(t.id));
            }}
            className="text-xs text-red-300 hover:text-red-100 font-bold underline"
          >
            {language === 'es' ? 'Limpiar comparación' : 'Clear all comparison'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-orange-500 hover:bg-teal-600 text-neutral-900 font-black text-xs uppercase px-6 py-2.5 rounded-full shadow-lg transition-colors"
          >
            {language === 'es' ? 'Entendido / Regresar' : 'Got it / Go Back'}
          </button>
        </div>

      </div>
    </div>
  );
};
