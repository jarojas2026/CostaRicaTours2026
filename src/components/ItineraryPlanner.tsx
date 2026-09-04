import React, { useState } from 'react';
import { Language, Tour } from '../types';
import { Calendar, Sparkles, ArrowLeft, Clock, Compass, CheckCircle2, ArrowRight, RefreshCw, Sun, MapPin, DollarSign, Users } from 'lucide-react';
import { useTours } from '../contexts/ToursContext';

interface ItineraryPlannerProps {
  language: Language;
  onSelectTour: (tour: Tour) => void;
  onBack?: () => void;
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
  onBack
}) => {
  const { tours: TOURS } = useTours();
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
      
      let parsedDays = [];
      if (Array.isArray(data.days)) {
        parsedDays = data.days;
      } else if (Array.isArray(data.itinerary)) {
        parsedDays = data.itinerary;
      } else if (data.itinerary && Array.isArray(data.itinerary.days)) {
        parsedDays = data.itinerary.days;
      } else if (Array.isArray(data)) {
        parsedDays = data;
      }

      setItinerary({
        title: data.title || data.itinerary?.title || (language === 'es' ? 'Itinerario Personalizado Pura Vida' : 'Tailored Pura Vida Itinerary'),
        summary: data.summary || data.itinerary?.summary || (language === 'es' ? 'Ruta de viaje diseñada especialmente según tus preferencias de viaje.' : 'Custom route crafted specifically to your travel preferences.'),
        days: parsedDays.length > 0 ? parsedDays : [
          {
            day: 1,
            title: language === 'es' ? 'Llegada y Traslado a La Fortuna' : 'Arrival & Arenal Transfer',
            location: 'La Fortuna / Arenal',
            activities: [
              language === 'es' ? 'Check-in en eco-lodge con vista al Volcán Arenal' : 'Eco-lodge check-in facing Arenal Volcano',
              language === 'es' ? 'Relajante baño en aguas termales de Baldi' : 'Soak in Baldi Hot Springs thermal waters'
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
            recommendedTourId: 'arenal-volcano-hike'
          }
        ]
      });
    } catch (err) {
      console.error(err);
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
            recommendedTourId: 'arenal-volcano-hike'
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

  const applyPreset = (presetDays: number, presetStyle: string, presetBudget: string, presetGroup: string) => {
    setDaysCount(presetDays);
    setStyle(presetStyle);
    setBudget(presetBudget);
    setGroup(presetGroup);
    setTimeout(() => {
      handleGenerateItinerary();
    }, 100);
  };

  return (
    <div className="bg-stone-950 py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Title & Warm Explanation */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-stone-900 text-orange-400 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
            <Calendar className="w-3.5 h-3.5 text-[#FF8C00]" />
            {language === 'es' ? 'Planificador Inteligente con IA' : 'AI Smart Planner'}
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-orange-400 uppercase tracking-tight">
            {language === 'es' ? 'Diseñador de Itinerarios Pura Vida' : 'Pura Vida Itinerary Generator'}
          </h2>
          <p className="text-sm sm:text-base text-[#A7F3D0] max-w-2xl mx-auto leading-relaxed">
            {language === 'es'
              ? '¿Planeando tu viaje a Costa Rica? Nuestra IA experta conecta volcanes imponentes, bosques nubosos mágicos y playas paradisíacas sin contratiempos logísticos. Selecciona tus preferencias o elige una ruta de ejemplo.'
              : 'Planning your trip to Costa Rica? Our expert AI seamlessly connects majestic volcanoes, magical cloud forests, and paradise beaches without logistics headaches. Select your preferences or choose a sample route.'
            }
          </p>
        </div>

        {/* 3 Visual Mini-Cards of Example Itineraries */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => applyPreset(7, 'Relax y Aguas Termales', 'Medio', 'Pareja')}
            className="bg-stone-900 hover:bg-stone-800 p-5 rounded-2xl border border-white/10 hover:border-orange-500 transition-all cursor-pointer group shadow-lg space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">🌋</span>
              <span className="text-[10px] font-black uppercase bg-teal-600/30 text-teal-300 px-2.5 py-0.5 rounded-full">
                7 {language === 'es' ? 'Días' : 'Days'} • Pareja
              </span>
            </div>
            <h4 className="text-sm font-black text-white group-hover:text-orange-400 uppercase">
              {language === 'es' ? 'Volcanes y Termales de Ensueño' : 'Volcanoes & Hot Springs Dream'}
            </h4>
            <p className="text-xs text-stone-400 line-clamp-2">
              {language === 'es' ? 'Arenal, aguas termales minerales de Baldi y relax total en pareja.' : 'Arenal, Baldi mineral hot springs and romantic relaxation.'}
            </p>
          </div>

          <div
            onClick={() => applyPreset(5, 'Aventura y Adrenalina', 'Medio', 'Familia')}
            className="bg-stone-900 hover:bg-stone-800 p-5 rounded-2xl border border-white/10 hover:border-orange-500 transition-all cursor-pointer group shadow-lg space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">🦅</span>
              <span className="text-[10px] font-black uppercase bg-orange-500/20 text-orange-300 px-2.5 py-0.5 rounded-full">
                5 {language === 'es' ? 'Días' : 'Days'} • Familia
              </span>
            </div>
            <h4 className="text-sm font-black text-white group-hover:text-orange-400 uppercase">
              {language === 'es' ? 'Aventura Esencial y Fauna' : 'Essential Adventure & Wildlife'}
            </h4>
            <p className="text-xs text-stone-400 line-clamp-2">
              {language === 'es' ? 'Puentes colgantes, tirolesas en Monteverde y safari de perezosos.' : 'Hanging bridges, Monteverde ziplines & sloth safari.'}
            </p>
          </div>

          <div
            onClick={() => applyPreset(10, 'Naturaleza y Fauna', 'Lujo Boutique', 'Grupo de Amigos')}
            className="bg-stone-900 hover:bg-stone-800 p-5 rounded-2xl border border-white/10 hover:border-orange-500 transition-all cursor-pointer group shadow-lg space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">🏖️</span>
              <span className="text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full">
                10 {language === 'es' ? 'Días' : 'Days'} • Lujo
              </span>
            </div>
            <h4 className="text-sm font-black text-white group-hover:text-orange-400 uppercase">
              {language === 'es' ? 'Expedición Total de Costa a Costa' : 'Coast-to-Coast Total Expedition'}
            </h4>
            <p className="text-xs text-stone-400 line-clamp-2">
              {language === 'es' ? 'Arenal, Monteverde, Manuel Antonio y Rafting Pacuare VIP.' : 'Arenal, Monteverde, Manuel Antonio & VIP Pacuare Rafting.'}
            </p>
          </div>
        </div>

        {/* Form Controls Card */}
        <div className="bg-stone-900 p-6 sm:p-8 rounded-[2rem] border-2 border-white/10 shadow-2xl space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Days selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-[#A7F3D0] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                {language === 'es' ? 'Duración del Viaje' : 'Trip Duration'}
              </label>
              <select
                value={daysCount}
                onChange={(e) => setDaysCount(Number(e.target.value))}
                className="w-full bg-stone-950 border border-white/10 focus:border-orange-400 text-white p-3 rounded-xl text-base font-bold focus:outline-none cursor-pointer"
              >
                <option value={3}>{language === 'es' ? '3 Días (Escapada)' : '3 Days (Quick Getaway)'}</option>
                <option value={5}>{language === 'es' ? '5 Días (Aventura Esencial)' : '5 Days (Essential Adventure)'}</option>
                <option value={7}>{language === 'es' ? '7 Días (Semana Completa)' : '7 Days (Full Week)'}</option>
                <option value={10}>{language === 'es' ? '10 Días (Expedición Total)' : '10 Days (Total Expedition)'}</option>
              </select>
            </div>

            {/* Travel Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-[#A7F3D0] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-orange-400" />
                {language === 'es' ? 'Estilo de Viaje' : 'Travel Style'}
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-stone-950 border border-white/10 focus:border-orange-400 text-white p-3 rounded-xl text-base font-bold focus:outline-none cursor-pointer"
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
              <label className="text-xs font-bold uppercase text-[#A7F3D0] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-orange-400" />
                {language === 'es' ? 'Presupuesto' : 'Budget Level'}
              </label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-stone-950 border border-white/10 focus:border-orange-400 text-white p-3 rounded-xl text-base font-bold focus:outline-none cursor-pointer"
              >
                <option value="Medio">{language === 'es' ? 'Medio (Recomendado)' : 'Moderate (Recommended)'}</option>
                <option value="Económico">{language === 'es' ? 'Económico / Mochilero' : 'Budget Friendly'}</option>
                <option value="Lujo Boutique">{language === 'es' ? 'Lujo & Eco-Resorts' : 'Luxury & Eco-Resorts'}</option>
              </select>
            </div>

            {/* Group */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-[#A7F3D0] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-orange-400" />
                {language === 'es' ? 'Compañía' : 'Travelers'}
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full bg-stone-950 border border-white/10 focus:border-orange-400 text-white p-3 rounded-xl text-base font-bold focus:outline-none cursor-pointer"
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
            className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-500 text-stone-950 font-black py-4 rounded-2xl text-sm uppercase tracking-wider transition-all shadow-[0_4px_25px_rgba(255,140,0,0.4)] hover:shadow-[0_6px_30px_rgba(255,140,0,0.6)] flex items-center justify-center gap-2 cursor-pointer border border-amber-300/40 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-stone-950" />
                <span>{language === 'es' ? 'Diseñando Itinerario con Gemini IA...' : 'Designing Itinerary with Gemini AI...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-stone-950" />
                <span>{language === 'es' ? 'Generar Mi Itinerario Personalizado' : 'Generate Custom Itinerary'}</span>
              </>
            )}
          </button>

        </div>

        {/* Results Presentation */}
        {itinerary && (
          <div className="bg-gradient-to-b from-stone-900 to-stone-950 p-6 sm:p-8 rounded-[2rem] border-2 border-amber-500/60 shadow-[0_10px_40px_rgba(0,0,0,0.6)] space-y-6 animate-fade-in">
            
            {/* Title & Summary */}
            <div className="border-b border-white/10 pb-4 space-y-2">
              <span className="bg-teal-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">
                {language === 'es' ? 'Itinerario Sugerido' : 'Suggested Itinerary'}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-orange-400 uppercase">
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
                const matchingTour = d.recommendedTourId 
                  ? TOURS.find(t => t.id === d.recommendedTourId)
                  : TOURS.find(t => t.title['es'].toLowerCase().includes(d.title.toLowerCase().slice(0, 5)));

                return (
                  <div key={d.day} className="bg-stone-950 p-5 rounded-2xl border border-white/10 space-y-3">
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
                      <div className="bg-stone-950 p-2.5 rounded-xl border border-white/10 text-xs text-orange-200/90 italic">
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
                          className="bg-stone-900 hover:bg-teal-600 hover:text-white text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer"
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
