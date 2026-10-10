import React, { useState } from 'react';
import { Language, Tour } from '../types';
import {
  Calendar, Sparkles, ArrowLeft, Clock, Compass, CheckCircle2,
  ArrowRight, RefreshCw, MapPin, DollarSign, Users, ShieldCheck,
  Leaf, Car, Luggage, X, Phone, Mail, User, Check
} from 'lucide-react';
import { useTours } from '../contexts/ToursContext';
import { requestCustomerIntake } from '../utils/customerIntake';

interface ItineraryPlannerProps {
  language: Language;
  onSelectTour: (tour: Tour) => void;
  onBack?: () => void;
}

interface DayPlan {
  day: number;
  title: string;
  location?: string;
  destination?: string;
  driveEstimate?: string;
  morningActivity?: string;
  afternoonActivity?: string;
  eveningActivity?: string;
  ecoTip?: string;
  activities: string[];
  tips?: string;
  recommendedTourId?: string;
  suggestedTours?: string[];
  stay?: string;
  transfer?: string;
}

interface ItineraryResult {
  title?: string;
  summary?: string;
  totalDays?: number;
  estimatedBudgetUSD?: number;
  estimatedBudgetCRC?: number;
  recommendedSeason?: string;
  packingList?: string[];
  days?: DayPlan[];
  tips?: string[];
  modelUsed?: string;
}

export const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({
  language,
  onSelectTour,
  onBack
}) => {
  const isEn = language === 'en';
  const { tours: TOURS } = useTours();

  const [daysCount, setDaysCount] = useState(5);
  const [style, setStyle] = useState('Aventura y Naturaleza');
  const [budget, setBudget] = useState('Medio');
  const [group, setGroup] = useState('Pareja');

  const [isLoading, setIsLoading] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryResult | null>(null);

  // Estados para reserva de itinerario completo
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookingAdults, setBookingAdults] = useState(2);
  const [bookingChildren, setBookingChildren] = useState(0);
  const [bookingSuccessId, setBookingSuccessId] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const handleGenerateItinerary = async () => {
    setIsLoading(true);
    setItinerary(null);
    setBookingSuccessId(null);

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

      let parsedDays: DayPlan[] = [];
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
        title: data.title || data.itinerary_title || (isEn ? 'Tailored Pura Vida Itinerary' : 'Itinerario Personalizado Pura Vida'),
        summary: data.summary || (isEn ? 'Exploratory route based on your preferences. Tours, lodging, transfers, schedules and prices require verification before booking.' : 'Ruta exploratoria basada en tus preferencias. Tours, hospedaje, traslados, horarios y precios requieren verificación antes de reservar.'),
        totalDays: data.totalDays || daysCount,
        estimatedBudgetUSD: data.estimatedBudgetUSD || data.estimated_budget_usd || undefined,
        estimatedBudgetCRC: undefined,
        recommendedSeason: data.recommendedSeason || data.recommended_season || (isEn ? 'December - May (Dry Season) / June - Nov (Green Season)' : 'Diciembre - Mayo (Temporada Seca) / Junio - Noviembre (Temporada Verde)'),
        packingList: data.packingList || data.packing_list || [
          isEn ? 'Sturdy hiking boots' : 'Zapatos de senderismo cerrados',
          isEn ? 'Lightweight raincoat' : 'Capa impermeable liviana',
          isEn ? 'Biodegradable reef sunscreen' : 'Bloqueador biodegradable',
          isEn ? 'Dry-bag / phone pouch' : 'Funda impermeable para celular'
        ],
        days: parsedDays,
        tips: data.tips || data.local_tips || [
          isEn ? 'Confirm payment methods, exchange rates and local conditions for each supplier before relying on them.' : 'Confirma métodos de pago, tipo de cambio y condiciones de cada proveedor antes de depender de ellos.',
          isEn ? 'Stay hydrated with fresh tropical pipa fría.' : 'Hidrátate con agua de pipa fría en paradas de ruta.'
        ],
        modelUsed: data.modelUsed || data.model_used || 'Costa Rica Tours Intelligent Engine 2026'
      });
    } catch (err) {
      console.error('Error generando itinerario:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookFullItinerary = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!customerName.trim() || !customerEmail.trim()) {
      setBookingError(isEn ? 'Please provide the lead traveler name and email.' : 'Indica el nombre y correo del viajero responsable.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setBookingError(isEn ? 'Please enter a valid email address.' : 'Ingresa un correo electrónico válido.');
      return;
    }
    if (!startDate) {
      setBookingError(isEn ? 'Choose an exact start date so availability and prices can be verified.' : 'Selecciona una fecha exacta de inicio para verificar cupos y precios.');
      return;
    }
    if (bookingAdults < 1 || bookingChildren < 0) {
      setBookingError(isEn ? 'At least one adult is required.' : 'Se requiere al menos un adulto.');
      return;
    }

    setIsBookingSubmitting(true);
    const destinations = Array.from(new Set(
      (itinerary?.days || [])
        .map(day => day.location || day.destination)
        .filter((value): value is string => Boolean(value))
    )).slice(0, 8);
    const travelers = bookingAdults + bookingChildren;
    const message = isEn
      ? `Please turn this exploratory ${itinerary?.totalDays || daysCount}-day itinerary into a verifiable quote request for ${travelers} travelers (${bookingAdults} adults, ${bookingChildren} children), starting ${startDate}. Style: ${style}. Budget preference: ${budget}. Proposed areas: ${destinations.join(', ') || 'to be refined'}. Do not confirm booking, provider inventory or payment until each component is verified.`
      : `Convierte este itinerario exploratorio de ${itinerary?.totalDays || daysCount} días en una solicitud de cotización verificable para ${travelers} viajeros (${bookingAdults} adultos, ${bookingChildren} niños), iniciando el ${startDate}. Estilo: ${style}. Preferencia de presupuesto: ${budget}. Zonas propuestas: ${destinations.join(', ') || 'por afinar'}. No confirmes reserva, inventario del proveedor ni pago hasta verificar cada componente.`;

    requestCustomerIntake({
      message,
      language,
      source: 'itinerary-planner-quote',
      customer: {
        name: customerName.trim(),
        email: customerEmail.trim(),
        phone: customerPhone.trim() || undefined
      },
      context: {
        requestKind: 'custom_multi_day_itinerary',
        existingJourneyId: localStorage.getItem('crt_active_journey') || undefined,
        journeyRequest: {
          startDate,
          durationDays: itinerary?.totalDays || daysCount,
          adults: bookingAdults,
          children: bookingChildren,
          travelers,
          pace: style.toLowerCase().includes('relax') ? 'relaxed' : style.toLowerCase().includes('aventura') ? 'active' : 'balanced',
          selectedDestinations: destinations,
          priorities: [style],
          specialRequests: `Budget preference: ${budget}. Source proposal: ${itinerary?.title || 'AI itinerary planner'}.`,
          requestQuote: true,
          arrivalAirport: 'SJO',
          departureAirport: 'SJO',
          transportType: 'private',
          stayStyle: budget === 'Lujo Boutique' ? 'resort' : budget === 'Económico' ? 'ecolodge' : 'boutique'
        }
      },
      onResult: (result) => {
        setIsBookingSubmitting(false);
        if (!result.ok) {
          setBookingError(result.reply || (isEn ? 'The quote request could not be opened.' : 'No se pudo abrir la solicitud de cotización.'));
          return;
        }
        setBookingSuccessId(result.journeyId || result.intakeId || (isEn ? 'REQUEST-RECORDED' : 'SOLICITUD-REGISTRADA'));
      }
    });
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
    <div className="bg-[#041711] text-stone-100 py-12 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header & Volver */}
        <div className="flex items-center justify-between">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isEn ? 'Back to Home' : 'Volver al Inicio'}</span>
            </button>
          )}
          <div className="ml-auto inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>2026 Autonomous Travel Planner</span>
          </div>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-5xl font-black text-amber-400 tracking-tight uppercase">
            {isEn ? 'Pura Vida Itinerary Generator' : 'Diseñador de Itinerarios Pura Vida'}
          </h2>
          <p className="text-sm sm:text-base text-stone-300 max-w-2xl mx-auto leading-relaxed">
            {isEn
              ? 'Connect Arenal volcanoes, Monteverde misty cloud forests, and Manuel Antonio beaches with verified private transfers and certified SINAC naturalist guides.'
              : 'Conecta volcanes imponentes, el bosque nuboso y playas paradisíacas con traslados privados coordinados de Alsama Tours CR y cupos SINAC garantizados.'
            }
          </p>
        </div>

        {/* 3 Rutas Populares Preconfiguradas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => applyPreset(7, 'Relax y Aguas Termales', 'Medio', 'Pareja')}
            className="bg-[#07241a] hover:bg-[#0b3325] p-5 rounded-2xl border border-emerald-500/20 hover:border-amber-400 transition-all cursor-pointer group shadow-lg space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">🌋</span>
              <span className="text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full">
                7 {isEn ? 'Days' : 'Días'} • {isEn ? 'Couple' : 'Pareja'}
              </span>
            </div>
            <h4 className="text-sm font-black text-stone-100 group-hover:text-amber-400 uppercase">
              {isEn ? 'Volcanoes & Hot Springs Dream' : 'Volcanes y Termales de Ensueño'}
            </h4>
            <p className="text-xs text-stone-400 line-clamp-2">
              {isEn ? 'Arenal volcano trails, mineral thermal pools, and romantic relaxation.' : 'Arenal, aguas termales minerales de Baldi y relax total en pareja.'}
            </p>
          </div>

          <div
            onClick={() => applyPreset(5, 'Aventura y Adrenalina', 'Medio', 'Familia')}
            className="bg-[#07241a] hover:bg-[#0b3325] p-5 rounded-2xl border border-emerald-500/20 hover:border-amber-400 transition-all cursor-pointer group shadow-lg space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">🦅</span>
              <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full">
                5 {isEn ? 'Days' : 'Días'} • {isEn ? 'Family' : 'Familia'}
              </span>
            </div>
            <h4 className="text-sm font-black text-stone-100 group-hover:text-amber-400 uppercase">
              {isEn ? 'Essential Adventure & Wildlife' : 'Aventura Esencial y Fauna'}
            </h4>
            <p className="text-xs text-stone-400 line-clamp-2">
              {isEn ? 'Hanging bridges, Monteverde ziplines, and Manuel Antonio sloth spotting.' : 'Puentes colgantes, tirolesas en Monteverde y safari de perezosos.'}
            </p>
          </div>

          <div
            onClick={() => applyPreset(10, 'Naturaleza y Fauna', 'Lujo Boutique', 'Grupo de Amigos')}
            className="bg-[#07241a] hover:bg-[#0b3325] p-5 rounded-2xl border border-emerald-500/20 hover:border-amber-400 transition-all cursor-pointer group shadow-lg space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">🏖️</span>
              <span className="text-[10px] font-black uppercase bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full">
                10 {isEn ? 'Days' : 'Días'} • {isEn ? 'Luxury' : 'Lujo'}
              </span>
            </div>
            <h4 className="text-sm font-black text-stone-100 group-hover:text-amber-400 uppercase">
              {isEn ? 'Coast-to-Coast Total Expedition' : 'Expedición Total de Costa a Costa'}
            </h4>
            <p className="text-xs text-stone-400 line-clamp-2">
              {isEn ? 'Arenal, Monteverde, Manuel Antonio beaches, and Pacuare Rafting.' : 'Arenal, Monteverde, Manuel Antonio y Rafting Pacuare VIP.'}
            </p>
          </div>
        </div>

        {/* Selector de Parámetros */}
        <div className="bg-[#07241a] p-6 sm:p-8 rounded-3xl border border-emerald-500/20 shadow-xl space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Días */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {isEn ? 'Trip Duration' : 'Duración del Viaje'}
              </label>
              <select
                value={daysCount}
                onChange={(e) => setDaysCount(Number(e.target.value))}
                className="w-full bg-[#041711] border border-emerald-500/30 focus:border-amber-400 text-stone-100 p-3 rounded-xl text-sm font-bold focus:outline-none cursor-pointer"
              >
                <option value={3}>{isEn ? '3 Days (Quick Getaway)' : '3 Días (Escapada Rápida)'}</option>
                <option value={5}>{isEn ? '5 Days (Essential Highlights)' : '5 Días (Aventura Esencial)'}</option>
                <option value={7}>{isEn ? '7 Days (Full Week Master Route)' : '7 Días (Semana Completa)'}</option>
                <option value={10}>{isEn ? '10 Days (Total Expedition)' : '10 Días (Expedición Total)'}</option>
                <option value={14}>{isEn ? '14 Days (Grand Discovery)' : '14 Días (Gran Descubrimiento)'}</option>
              </select>
            </div>

            {/* Estilo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                {isEn ? 'Travel Style' : 'Estilo de Viaje'}
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-[#041711] border border-emerald-500/30 focus:border-amber-400 text-stone-100 p-3 rounded-xl text-sm font-bold focus:outline-none cursor-pointer"
              >
                <option value="Aventura y Naturaleza">{isEn ? 'Adventure & Adrenaline' : 'Aventura y Adrenalina'}</option>
                <option value="Naturaleza y Fauna">{isEn ? 'Nature & Wildlife' : 'Naturaleza y Fauna Silvestre'}</option>
                <option value="Relax y Aguas Termales">{isEn ? 'Relaxation & Hot Springs' : 'Relax y Aguas Termales'}</option>
                <option value="Familia con Niños">{isEn ? 'Family Friendly' : 'Familia con Niños'}</option>
                <option value="Luna de Miel / Parejas">{isEn ? 'Honeymoon & Couples' : 'Luna de Miel / Parejas'}</option>
              </select>
            </div>

            {/* Presupuesto */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                {isEn ? 'Budget Level' : 'Presupuesto'}
              </label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-[#041711] border border-emerald-500/30 focus:border-amber-400 text-stone-100 p-3 rounded-xl text-sm font-bold focus:outline-none cursor-pointer"
              >
                <option value="Medio">{isEn ? 'Moderate (Recommended)' : 'Medio (Recomendado)'}</option>
                <option value="Económico">{isEn ? 'Budget Friendly' : 'Económico / Mochilero'}</option>
                <option value="Lujo Boutique">{isEn ? 'Luxury & Boutique Eco-Resorts' : 'Lujo & Eco-Resorts'}</option>
              </select>
            </div>

            {/* Compañía */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                {isEn ? 'Travelers' : 'Compañía'}
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full bg-[#041711] border border-emerald-500/30 focus:border-amber-400 text-stone-100 p-3 rounded-xl text-sm font-bold focus:outline-none cursor-pointer"
              >
                <option value="Pareja">{isEn ? 'Couple (2 Travelers)' : 'Pareja (2 Viajeros)'}</option>
                <option value="Solo">{isEn ? 'Solo Traveler (1)' : 'Viajero Solo (1)'}</option>
                <option value="Familia">{isEn ? 'Family (3-5 Travelers)' : 'Familia (3-5 Viajeros)'}</option>
                <option value="Grupo de Amigos">{isEn ? 'Friends Group (4+)' : 'Grupo de Amigos (4+)'}</option>
              </select>
            </div>

          </div>

          {/* Botón de Generación */}
          <button
            onClick={handleGenerateItinerary}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-stone-950" />
                <span>{isEn ? 'Designing Itinerary with Gemini AI...' : 'Diseñando Itinerario Inteligente...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-stone-950" />
                <span>{isEn ? 'Generate Custom Master Itinerary' : 'Generar Itinerario Maestro Personalizado'}</span>
              </>
            )}
          </button>
        </div>

        {/* Presentación de Resultados */}
        {itinerary && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 text-stone-900 shadow-2xl border border-emerald-100 space-y-6 animate-fadeIn">
            
            {/* Header del Itinerario con Presupuesto */}
            <div className="border-b border-stone-200 pb-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-black uppercase px-3 py-1 rounded-full">
                    {itinerary.totalDays || daysCount} {isEn ? 'Days Route' : 'Días de Ruta'}
                  </span>
                  <span className="text-xs font-bold text-stone-500">
                    {itinerary.modelUsed || 'Costa Rica Tours Engine'}
                  </span>
                </div>
                {itinerary.estimatedBudgetUSD && (
                  <div className="text-right">
                    <span className="text-xs font-semibold text-stone-500 block">{isEn ? 'Planning estimate (not a quote):' : 'Estimación de planificación (no cotización):'}</span>
                    <span className="text-xl font-black text-emerald-800">
                      ${itinerary.estimatedBudgetUSD.toLocaleString()} USD
                    </span>
                    <span className="block text-[10px] text-stone-500 font-medium mt-1">
                      {isEn ? 'Must be replaced by verified component pricing before payment.' : 'Debe sustituirse por precios verificados por componente antes de cualquier pago.'}
                    </span>
                  </div>
                )}
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                {itinerary.title}
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                {itinerary.summary}
              </p>
            </div>

            {/* Temporada & Equipaje Recomendado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-2xl space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-700" />
                  {isEn ? 'Recommended Travel Season' : 'Temporada Recomendada'}
                </span>
                <p className="text-xs text-amber-900 font-medium">
                  {itinerary.recommendedSeason}
                </p>
              </div>

              {itinerary.packingList && (
                <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 rounded-2xl space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Luggage className="w-4 h-4 text-emerald-700" />
                    {isEn ? 'Eco-Packing List' : 'Equipaje Sostenible Recomendado'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {itinerary.packingList.map((item, idx) => (
                      <span key={idx} className="bg-white border border-emerald-200 text-emerald-900 text-[11px] font-medium px-2 py-0.5 rounded-md">
                        • {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Desglose Día por Día */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-600">
                {isEn ? 'Detailed Day-by-Day Journey:' : 'Plan Detallado Día por Día:'}
              </h4>

              {itinerary.days?.map((d) => {
                const matchingTour = d.recommendedTourId
                  ? TOURS.find(t => t.id === d.recommendedTourId)
                  : TOURS.find(t => t.title.es.toLowerCase().includes(d.title.toLowerCase().slice(0, 5)));

                return (
                  <div key={d.day} className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-3 shadow-sm hover:border-emerald-300 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                          {d.day}
                        </span>
                        <div>
                          <h5 className="font-bold text-stone-900 text-sm">
                            {d.title}
                          </h5>
                          {d.location && (
                            <span className="text-xs text-stone-500 font-semibold flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-600" />
                              {d.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {d.driveEstimate && (
                        <span className="text-xs text-stone-500 font-medium flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                          <Car className="w-3.5 h-3.5 text-stone-400" />
                          {d.driveEstimate}
                        </span>
                      )}
                    </div>

                    {/* Actividades en 3 columnas */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-stone-200/80">
                        <span className="font-bold text-amber-800 block mb-1">🌅 {isEn ? 'Morning' : 'Mañana'}</span>
                        <p className="text-stone-700 leading-snug">{d.morningActivity || d.activities[0]}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-stone-200/80">
                        <span className="font-bold text-amber-800 block mb-1">☀️ {isEn ? 'Afternoon' : 'Tarde'}</span>
                        <p className="text-stone-700 leading-snug">{d.afternoonActivity || d.activities[1] || d.activities[0]}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-stone-200/80">
                        <span className="font-bold text-amber-800 block mb-1">🌙 {isEn ? 'Evening' : 'Noche'}</span>
                        <p className="text-stone-700 leading-snug">{d.eveningActivity || d.activities[2] || (isEn ? 'Rest & dinner' : 'Descanso y cena')}</p>
                      </div>
                    </div>

                    {/* Eco-tip y Alojamiento */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-stone-600">
                      {d.ecoTip && (
                        <div className="text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200/60 flex items-center gap-1.5 text-[11px]">
                          <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                          <span><strong>{isEn ? 'Eco-Tip' : 'Tip Ecológico'}:</strong> {d.ecoTip}</span>
                        </div>
                      )}
                      {d.stay && (
                        <span className="text-[11px] font-bold text-stone-500">
                          🏨 {d.stay}
                        </span>
                      )}
                    </div>

                    {/* Tour individual recomendado con 1 click */}
                    {matchingTour && (
                      <div className="pt-2 flex items-center justify-between border-t border-stone-200">
                        <span className="text-xs font-bold text-stone-600">
                          {isEn ? 'Official catalog tour for this day:' : 'Tour oficial para este día:'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectTour(matchingTour)}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{matchingTour.title[language]} (${matchingTour.priceUSD} USD)</span>
                          <ArrowRight className="w-3 h-3 text-amber-800" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botón Maestro de Reserva del Itinerario Completo */}
            <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  if (group === 'Solo') { setBookingAdults(1); setBookingChildren(0); }
                  else if (group === 'Pareja') { setBookingAdults(2); setBookingChildren(0); }
                  else if (group === 'Familia') { setBookingAdults(2); setBookingChildren(2); }
                  else { setBookingAdults(4); setBookingChildren(0); }
                  setBookingError(null);
                  setBookingSuccessId(null);
                  setIsBookingModalOpen(true);
                }}
                className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isEn ? 'Verify & Request Quote' : 'Verificar y Solicitar Cotización'}</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Modal de Confirmación de Reserva del Itinerario */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-stone-900 border border-emerald-100 my-8">
            <button
              onClick={() => setIsBookingModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-100 transition"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {bookingSuccessId ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-stone-900">
                  {isEn ? 'Quote Request Registered' : 'Solicitud de Cotización Registrada'}
                </h3>
                <p className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 py-1.5 px-4 rounded-full inline-block">
                  {isEn ? 'Reference' : 'Referencia'} #{bookingSuccessId}
                </p>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {isEn
                    ? `Your ${daysCount}-day proposal is now in the verification/quote workflow. Nothing has been booked or charged yet; verified options and terms must come first.`
                    : `Tu propuesta de ${daysCount} días entró al flujo de verificación/cotización. Todavía no se reservó ni cobró nada; primero deben confirmarse opciones y condiciones verificadas.`
                  }
                </p>
                <button
                  onClick={() => {
                    setIsBookingModalOpen(false);
                    setBookingSuccessId(null);
                  }}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg transition"
                >
                  {isEn ? 'Close' : 'Cerrar'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookFullItinerary} className="space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                    {isEn ? 'Verification & Quote Request' : 'Solicitud de Verificación y Cotización'}
                  </span>
                  <h3 className="text-xl font-black text-stone-900">
                    {itinerary?.title || `Ruta Costa Rica ${daysCount} Días`}
                  </h3>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-black text-emerald-950 block">
                        {isEn ? 'Proposal — not a confirmed booking' : 'Propuesta — no es una reserva confirmada'}
                      </span>
                      <span className="text-[11px] leading-relaxed text-emerald-800 block mt-1">
                        {isEn
                          ? 'We will verify component availability, supplier terms and final prices before presenting a payable option.'
                          : 'Verificaremos cupos por componente, condiciones de proveedores y precios finales antes de presentar una opción pagable.'}
                      </span>
                    </div>
                  </div>
                </div>

                {bookingError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                    {bookingError}
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      {isEn ? 'Full Name *' : 'Nombre Completo *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={isEn ? 'e.g. Michael Smith' : 'ej. Carlos Méndez'}
                      className="w-full p-3 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      {isEn ? 'Email Address *' : 'Correo Electrónico *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="reservas@ejemplo.com"
                      className="w-full p-3 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">{isEn ? 'Adults' : 'Adultos'}</label>
                    <input type="number" min="1" max="50" value={bookingAdults} onChange={e => setBookingAdults(Math.max(1, Number(e.target.value) || 1))} className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">{isEn ? 'Children' : 'Niños'}</label>
                    <input type="number" min="0" max="50" value={bookingChildren} onChange={e => setBookingChildren(Math.max(0, Number(e.target.value) || 0))} className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        {isEn ? 'WhatsApp Phone' : 'Teléfono WhatsApp'}
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+506 8888-8888"
                        className="w-full p-3 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {isEn ? 'Trip Start Date *' : 'Fecha de Inicio *'}
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-3 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isBookingSubmitting}
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isBookingSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isEn ? 'Processing Reservation...' : 'Procesando Reserva...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isEn ? 'Start Verification & Quote' : 'Iniciar Verificación y Cotización'}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
