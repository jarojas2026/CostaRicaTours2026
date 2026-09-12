import React, { useState } from 'react';
import { X, Sparkles, Compass, Calendar, Users, MapPin, CheckCircle2, Clock, Car, Leaf, ArrowRight, Loader2 } from 'lucide-react';
import { Tour } from '../types';
import { TOURS } from '../data/toursData';

interface ClaudeItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'es' | 'en';
  onSelectTour?: (tour: Tour) => void;
  onSendToChat?: (text: string) => void;
}

export const ClaudeItineraryModal: React.FC<ClaudeItineraryModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectTour,
  onSendToChat
}) => {
  const isEn = language === 'en';

  const [days, setDays] = useState<number>(7);
  const [travelers, setTravelers] = useState<number>(2);
  const [style, setStyle] = useState<'eco_relax' | 'adventure_extreme' | 'family_comfort' | 'wildlife_photography' | 'cultural_discovery'>('eco_relax');
  const [budget, setBudget] = useState<'standard' | 'premium' | 'luxury'>('premium');
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['Arenal / La Fortuna', 'Monteverde', 'Manuel Antonio']);
  const [specialRequests, setSpecialRequests] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultItinerary, setResultItinerary] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleRegion = (region: string) => {
    if (selectedRegions.includes(region)) {
      if (selectedRegions.length > 1) {
        setSelectedRegions(selectedRegions.filter((r) => r !== region));
      }
    } else {
      setSelectedRegions([...selectedRegions, region]);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/claude/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days,
          travelers,
          style,
          budget,
          regions: selectedRegions,
          language,
          specialRequests
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al generar itinerario con Claude');
      }

      setResultItinerary(data);
    } catch (err: any) {
      console.error('Error generating itinerary with Claude:', err);
      setErrorMessage(
        isEn
          ? 'Could not connect with Claude Vertex AI right now. Please try again in a moment.'
          : 'No se pudo conectar con Claude Vertex AI en este momento. Por favor reintenta en unos instantes.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const availableRegions = [
    'Arenal / La Fortuna',
    'Monteverde',
    'Manuel Antonio',
    'Tortuguero',
    'Guanacaste / Playas',
    'Caribe Sur (Puerto Viejo)',
    'Corcovado / Península de Osa'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-black/10 max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-stone-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-amber-200 text-xs font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Anthropic Claude 3.5 Sonnet • Google Cloud Vertex AI</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            {isEn ? 'AI Custom Itinerary Planner' : 'Planificador Experto de Itinerarios'}
          </h2>
          <p className="text-amber-100/90 text-sm mt-1 max-w-xl">
            {isEn
              ? 'Deep reasoning engine optimized with official Costa Rica microclimates, real highway drive times, and CST sustainable operators.'
              : 'Motor de razonamiento profundo optimizado con microclimas, tiempos reales de carretera y operadores sostenibles CST de Costa Rica.'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-stone-800">
          {!resultItinerary ? (
            <>
              {/* Form Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Duración */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>{isEn ? 'Trip Duration (Days):' : 'Duración del Viaje (Días):'}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {[3, 5, 7, 10, 14].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDays(d)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                          days === d
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-black/10'
                        }`}
                      >
                        {d} {isEn ? 'days' : 'días'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Viajeros */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>{isEn ? 'Number of Travelers:' : 'Número de Viajeros:'}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 4, 6, 8].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTravelers(t)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                          travelers === t
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-black/10'
                        }`}
                      >
                        {t === 1 ? (isEn ? 'Solo' : '1 pers.') : `${t}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estilo de Viaje */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-600" />
                  <span>{isEn ? 'Travel Style & Focus:' : 'Estilo de Viaje & Enfoque:'}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'eco_relax', label: isEn ? '🌿 Eco-Relax & Hot Springs' : '🌿 Eco-Relax & Termales' },
                    { id: 'adventure_extreme', label: isEn ? '⚡ Extreme Adventure & Zipline' : '⚡ Aventura Extrema & Rafting' },
                    { id: 'family_comfort', label: isEn ? '👨‍👩‍👧 Family Comfort' : '👨‍👩‍👧 Familiar Confortable' },
                    { id: 'wildlife_photography', label: isEn ? '🦥 Wildlife & Birding' : '🦥 Fauna & Aves' },
                    { id: 'cultural_discovery', label: isEn ? '☕ Coffee & Local Culture' : '☕ Café & Cultura Local' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStyle(st.id as any)}
                      className={`p-2.5 rounded-xl text-xs font-bold text-left transition-all border ${
                        style === st.id
                          ? 'bg-amber-50 text-amber-900 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-black/10'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Regiones de Interés */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>{isEn ? 'Desired Regions (Select 2-4):' : 'Regiones de Interés (Elige 2-4):'}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableRegions.map((reg) => {
                    const isSelected = selectedRegions.includes(reg);
                    return (
                      <button
                        key={reg}
                        type="button"
                        onClick={() => toggleRegion(reg)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-black/10'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{reg}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Solicitudes especiales */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  {isEn ? 'Special Requests or Dietary Needs:' : 'Peticiones Especiales o Notas:'}
                </label>
                <input
                  type="text"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder={
                    isEn
                      ? 'e.g. Vegetarian dining, traveling with toddlers, avoid steep hikes'
                      : 'ej. Comida vegetariana, viajamos con niños pequeños, evitar caminatas empinadas'
                  }
                  className="w-full bg-stone-50 border border-black/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Botón de Generación */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isEn ? 'Designing Itinerary with Claude 3.5 Sonnet...' : 'Diseñando Itinerario con Claude 3.5 Sonnet...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{isEn ? 'Generate Master Itinerary with Claude' : 'Generar Itinerario Maestro con Claude'}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* Resultados de Itinerario Diseñado por Claude */
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-amber-50/80 border border-amber-200/80 p-5 rounded-2xl">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    {resultItinerary.modelUsed || 'Claude 3.5 Sonnet'}
                  </span>
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {resultItinerary.recommendedSeason || 'Diciembre - Mayo'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-stone-900">{resultItinerary.title}</h3>
                <p className="text-sm text-stone-700 mt-2 leading-relaxed">{resultItinerary.summary}</p>
              </div>

              {/* Packing list recomendada */}
              {resultItinerary.packingList && (
                <div className="bg-stone-50 border border-black/10 p-4 rounded-2xl">
                  <h4 className="text-xs font-black uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1.5">
                    <Leaf className="w-4 h-4 text-emerald-600" />
                    <span>{isEn ? 'Claude Eco-Packing Recommendations:' : 'Recomendaciones de Equipaje Sostenible:'}</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {resultItinerary.packingList.map((item: string, idx: number) => (
                      <span key={idx} className="bg-white border border-black/10 text-stone-700 text-xs px-2.5 py-1 rounded-lg">
                        • {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Días desglosados */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-600">
                  {isEn ? 'Day-by-Day Journey Plan:' : 'Plan de Ruta Día por Día:'}
                </h4>

                {resultItinerary.itinerary?.map((day: any) => (
                  <div key={day.day} className="bg-white border border-black/10 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                          {day.day}
                        </span>
                        <span className="font-bold text-stone-900 text-sm">{day.destination}</span>
                      </div>
                      {day.driveEstimate && (
                        <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                          <Car className="w-3.5 h-3.5 text-stone-400" />
                          {day.driveEstimate}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-black/5">
                        <span className="font-black text-amber-700 block mb-1">🌅 {isEn ? 'Morning' : 'Mañana'}</span>
                        <p className="text-stone-700 leading-snug">{day.morningActivity}</p>
                      </div>
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-black/5">
                        <span className="font-black text-amber-700 block mb-1">☀️ {isEn ? 'Afternoon' : 'Tarde'}</span>
                        <p className="text-stone-700 leading-snug">{day.afternoonActivity}</p>
                      </div>
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-black/5">
                        <span className="font-black text-amber-700 block mb-1">🌙 {isEn ? 'Evening' : 'Noche'}</span>
                        <p className="text-stone-700 leading-snug">{day.eveningActivity}</p>
                      </div>
                    </div>

                    {day.ecoTip && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <Leaf className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span><strong>{isEn ? 'Eco-Tip' : 'Tip Ecológico'}:</strong> {day.ecoTip}</span>
                      </div>
                    )}

                    {/* Tours sugeridos */}
                    {day.suggestedTours && day.suggestedTours.length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-stone-500 uppercase">
                          {isEn ? 'Recommended Tours:' : 'Tours Sugeridos:'}
                        </span>
                        {day.suggestedTours.map((tName: string, tIdx: number) => {
                          const matchedTour = TOURS.find(
                            (t) =>
                              t.title.es.toLowerCase().includes(tName.toLowerCase()) ||
                              t.title.en.toLowerCase().includes(tName.toLowerCase())
                          );
                          return (
                            <button
                              key={tIdx}
                              onClick={() => {
                                if (matchedTour && onSelectTour) {
                                  onClose();
                                  onSelectTour(matchedTour);
                                } else if (onSendToChat) {
                                  onClose();
                                  onSendToChat(`Quiero más información sobre el tour "${tName}"`);
                                }
                              }}
                              className="text-[11px] font-bold bg-amber-100/70 hover:bg-amber-200/80 text-amber-900 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <span>{tName}</span>
                              <ArrowRight className="w-3 h-3 text-amber-700" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Botones de acción final */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setResultItinerary(null)}
                  className="flex-1 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  {isEn ? 'Adjust Parameters' : 'Modificar Parámetros'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onSendToChat) {
                      onSendToChat(
                        `Me encantó el itinerario "${resultItinerary.title}" de ${days} días generado por Claude. ¿Cómo podemos coordinar las reservas y traslados?`
                      );
                    }
                    onClose();
                  }}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isEn ? 'Discuss with Concierge in Chat' : 'Conversar con Asesor en el Chat'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
