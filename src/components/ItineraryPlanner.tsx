import React, { useState } from 'react';
import { Language, Tour } from '../types';
import { Calendar, Sparkles, Clock, Compass, CheckCircle2, ArrowRight, RefreshCw, Sun, MapPin, DollarSign } from 'lucide-react';
import { TOURS } from '../data/toursData';

interface ItineraryPlannerProps {
  language: Language;
  onSelectTour: (tour: Tour) => void;
}

interface DayPlan {
  day: number;
  title: string;
  location?: string;
  activities: string[];
  tips?: string;
  recommendedTourId?: string;
}

interface ItineraryResult {
  title?: string;
  summary?: string;
  days?: DayPlan[];
}

export const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({
  language,
  onSelectTour,
}) => {
  const [daysCount, setDaysCount] = useState(5);
  const [style, setStyle] = useState('Aventura y Naturaleza');
  const [budget, setBudget] = useState('Medio');
  const [group, setGroup] = useState('Pareja');

  const [isLoading, setIsLoading] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryResult | null>(null);

  const handleGenerateItinerary = async () => {
    setIsLoading(true);
    setItinerary(null);

    try {
      const response = await fetch('/api/gemini/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: daysCount,
          style,
          budget,
          group,
          language
        })
      });

      const data = await response.json();
      setItinerary(data);
    } catch (err) {
      console.error(err);
      // Fallback
      setItinerary({
        title: language === 'es' ? 'Ruta Costa Rica Tours (costaricatours.es)' : 'Costa Rica Tours Route (costaricatours.es)',
        summary: language === 'es' ? 'Un viaje equilibrado combinando Volcán Arenal, Bosque Nuboso y Parque Manuel Antonio.' : 'A balanced trip combining Arenal Volcano, Cloud Forest, and Manuel Antonio NP.',
        days: [
          {
            day: 1,
            title: language === 'es' ? 'Llegada y Traslado a La Fortuna' : 'Arrival & Arenal Transfer',
            location: 'La Fortuna / Arenal',
            activities: [
              language === 'es' ? 'Check-in en eco-lodge con vista al Volcán' : 'Eco-lodge check-in facing Arenal Volcano',
              language === 'es' ? 'Relajante baño en aguas termales de Baldi' : 'Soak in Baldi Hot Springs thermal waters',
            ],
            recommendedTourId: 'arenal-hot-springs'
          },
          {
            day: 2,
            title: language === 'es' ? 'Caminata Volcánica y Catarata' : 'Volcano Hike & Waterfall',
            location: 'Arenal NP',
            activities: [
              language === 'es' ? 'Caminata sobre coladas de lava de 1968' : 'Hiking 1968 lava fields',
              language === 'es' ? 'Nado refrescante en Catarata La Fortuna' : 'Refreshing swim at La Fortuna Waterfall'
            ],
            recommendedTourId: 'arenal-hot-springs'
          },
          {
            day: 3,
            title: language === 'es' ? 'Monteverde: Canopy Zipline' : 'Monteverde: Cloud Forest Zipline',
            location: 'Monteverde',
            activities: [
              language === 'es' ? 'Traslado panorámico en bote por Lago Arenal' : 'Scenic boat crossing on Arenal Lake',
              language === 'es' ? 'Vuelo Superman en tirolesa por las nubes' : 'Superman zipline flight over canopy'
            ],
            recommendedTourId: 'monteverde-canopy'
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-emerald-950 py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-emerald-900 text-amber-400 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
            <Calendar className="w-3.5 h-3.5 text-[#FF8C00]" />
            {language === 'es' ? 'Diseñador Inteligente' : 'Smart Planner'}
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-amber-400 uppercase tracking-tight">
            {language === 'es' ? 'Cotizador de Itinerario IA' : 'AI Itinerary Generator'}
          </h2>
          <p className="text-sm sm:text-base text-[#A7F3D0] max-w-2xl mx-auto">
            {language === 'es'
              ? 'Personaliza tus días, estilo de viaje y presupuesto. Nuestra IA creará el itinerario día por día optimizado con los mejores tours.'
              : 'Customize your days, travel style, and group. AI generates a day-by-day tailored itinerary with recommended tours.'
            }
          </p>
        </div>

        {/* Form Controls Card */}
        <div className="bg-emerald-950 p-6 sm:p-8 rounded-[2rem] border-2 border-white/10 shadow-2xl space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Days selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-[#A7F3D0]">
                {language === 'es' ? 'Duración del Viaje' : 'Trip Duration'}
              </label>
              <select
                value={daysCount}
                onChange={(e) => setDaysCount(Number(e.target.value))}
                className="w-full bg-emerald-950 border border-white/10 focus:border-amber-400 text-white p-3 rounded-xl text-base font-bold focus:outline-none cursor-pointer"
              >
                <option value={3}>{language === 'es' ? '3 Días (Escapada)' : '3 Days (Quick Getaway)'}</option>
                <option value={5}>{language === 'es' ? '5 Días (Aventura Esencial)' : '5 Days (Essential Adventure)'}</option>
                <option value={7}>{language === 'es' ? '7 Días (Semana Completa)' : '7 Days (Full Week)'}</option>
                <option value={10}>{language === 'es' ? '10 Días (Expedición Total)' : '10 Days (Total Expedition)'}</option>
              </select>
            </div>

            {/* Travel Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-[#A7F3D0]">
                {language === 'es' ? 'Estilo de Viaje' : 'Travel Style'}
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-emerald-950 border border-white/10 focus:border-amber-400 text-white p-3 rounded-xl text-base font-bold focus:outline-none cursor-pointer"
              >
                <option value="Aventura y Adrenalina">{language === 'es' ? 'Aventura y Adrenalina' : 'Adrenaline & Adventure'}</option>
                <option value="Naturaleza y Fauna">{language === 'es' ? 'Naturaleza y Fauna' : 'Nature & Wildlife'}</option>
                <option value="Relax y Aguas Termales">{language === 'es' ? 'Relax y Aguas Termales' : 'Relaxation & Hot Springs'}</option>
                <option value="Familia con Niños">{language === 'es' ? 'Familia con Niños' : 'Family with Kids'}</option>
                <option value="Luna de Miel / Parejas">{language === 'es' ? 'Luna de Miel / Parejas' : 'Honeymoon / Couples'}</option>
              </select>
            </div>

            {/* Budget */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-[#A7F3D0]">
                {language === 'es' ? 'Presupuesto' : 'Budget Level'}
              </label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-emerald-950 border border-white/10 focus:border-amber-400 text-white p-3 rounded-xl text-base font-bold focus:outline-none cursor-pointer"
              >
                <option value="Medio">{language === 'es' ? 'Medio (Recomendado)' : 'Moderate (Recommended)'}</option>
                <option value="Económico">{language === 'es' ? 'Económico / Mochilero' : 'Budget Friendly'}</option>
                <option value="Lujo Boutique">{language === 'es' ? 'Lujo & Eco-Resorts' : 'Luxury & Eco-Resorts'}</option>
              </select>
            </div>

            {/* Group */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-[#A7F3D0]">
                {language === 'es' ? 'Compañía' : 'Travelers'}
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full bg-emerald-950 border border-white/10 focus:border-amber-400 text-white p-3 rounded-xl text-base font-bold focus:outline-none cursor-pointer"
              >
                <option value="Pareja">{language === 'es' ? 'Pareja' : 'Couple'}</option>
                <option value="Solo">{language === 'es' ? 'Viajero Solo' : 'Solo Traveler'}</option>
                <option value="Familia">{language === 'es' ? 'Familia' : 'Family'}</option>
                <option value="Grupo de Amigos">{language === 'es' ? 'Grupo de Amigos' : 'Friends Group'}</option>
              </select>
            </div>

          </div>

          <button
            onClick={handleGenerateItinerary}
            disabled={isLoading}
            className="w-full bg-teal-600 hover:bg-teal-600 text-white font-black py-4 rounded-full text-sm uppercase tracking-wider transition-colors shadow-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{language === 'es' ? 'Diseñando Itinerario con Gemini IA...' : 'Designing Itinerary with Gemini AI...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-white" />
                <span>{language === 'es' ? 'Generar Mi Itinerario Personalizado' : 'Generate Custom Itinerary'}</span>
              </>
            )}
          </button>

        </div>

        {/* Results Presentation */}
        {itinerary && (
          <div className="bg-emerald-950 p-6 sm:p-8 rounded-[2rem] border-2 border-amber-500 shadow-2xl space-y-6 animate-fade-in">
            
            {/* Title & Summary */}
            <div className="border-b border-white/10 pb-4 space-y-2">
              <span className="bg-teal-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">
                {language === 'es' ? 'Itinerario Sugerido' : 'Suggested Itinerary'}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-amber-400 uppercase">
                {itinerary.title || 'Propuesta de Viaje Pura Vida'}
              </h3>
              {itinerary.summary && (
                <p className="text-sm text-[#A7F3D0] leading-relaxed">
                  {itinerary.summary}
                </p>
              )}
            </div>

            {/* Days Breakdown */}
            <div className="space-y-4">
              {itinerary.days?.map((d) => {
                // Check if there is a matching tour in data
                const matchingTour = d.recommendedTourId 
                  ? TOURS.find(t => t.id === d.recommendedTourId)
                  : TOURS.find(t => t.title['es'].toLowerCase().includes(d.title.toLowerCase().slice(0, 5)));

                return (
                  <div key={d.day} className="bg-emerald-950 p-5 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-teal-600 text-white font-black text-sm flex items-center justify-center">
                          {d.day}
                        </span>
                        <div>
                          <h4 className="text-base font-black text-white uppercase">
                            Día {d.day}: {d.title}
                          </h4>
                          {d.location && (
                            <span className="text-xs text-[#A7F3D0] flex items-center gap-1 font-bold">
                              <MapPin className="w-3 h-3 text-[#FF8C00]" />
                              {d.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <ul className="space-y-1.5 text-xs sm:text-sm text-[#A7F3D0] pl-2">
                      {d.activities?.map((act, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#FF8C00] font-bold">•</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>

                    {d.tips && (
                      <div className="bg-emerald-950 p-2.5 rounded-xl border border-white/10 text-xs text-amber-200/90 italic">
                        💡 Tip local: {d.tips}
                      </div>
                    )}

                    {matchingTour && (
                      <div className="pt-2 flex items-center justify-between border-t border-white/10">
                        <span className="text-[11px] text-[#A7F3D0] font-bold">
                          {language === 'es' ? 'Tour Recomendado para este día:' : 'Recommended Tour for this day:'}
                        </span>
                        <button
                          onClick={() => onSelectTour(matchingTour)}
                          className="bg-emerald-900 hover:bg-teal-600 hover:text-white text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors flex items-center gap-1"
                        >
                          <span>{matchingTour.title[language].slice(0, 30)}...</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
