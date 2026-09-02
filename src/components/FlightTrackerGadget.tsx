import React, { useState, useEffect } from 'react';
import { ArrowLeft,
  Plane, Globe, MapPin, Calendar, Clock, Luggage, ArrowRight, 
  Sparkles, CheckCircle2, ShieldCheck, Filter, Search, RefreshCw, 
  Info, Compass, ChevronDown, Award, ExternalLink, Bot, HelpCircle
} from 'lucide-react';
import { FlightRoute, Language, Currency, BookingRequest } from '../types';
import { FLIGHT_ROUTES, ORIGIN_COUNTRIES, OriginCountryInfo, detectUserOriginCountry } from '../data/flightsData';
import { formatCurrency, getLangText } from '../utils/i18n';
import { FlightBookingModal } from './FlightBookingModal';

interface FlightTrackerGadgetProps {
  language: Language;
  currency: Currency;
  onBookingSuccess: (booking: BookingRequest) => void;
  onAskAI?: (prompt: string) => void;
  standalone?: boolean;
  onBack?: () => void;
}

export const FlightTrackerGadget: React.FC<FlightTrackerGadgetProps> = ({
  language,
  currency,
  onBookingSuccess,
  onAskAI,
  standalone = false,
  onBack
}) => {
  const [selectedCountry, setSelectedCountry] = useState<OriginCountryInfo>(() => detectUserOriginCountry());
  const [selectedOriginAirport, setSelectedOriginAirport] = useState<string>('all');
  const [selectedDestination, setSelectedDestination] = useState<'all' | 'SJO' | 'LIR'>('all');
  const [directOnly, setDirectOnly] = useState<boolean>(false);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [selectedFlightForBooking, setSelectedFlightForBooking] = useState<FlightRoute | null>(null);

  // Auto-detect country on mount
  useEffect(() => {
    const detected = detectUserOriginCountry();
    setSelectedCountry(detected);
  }, []);

  // Filter routes based on selection
  const availableRoutes = FLIGHT_ROUTES.filter((r) => {
    // Country filter
    if (r.originCountryCode !== selectedCountry.countryCode) {
      return false;
    }
    // Origin airport filter
    if (selectedOriginAirport !== 'all' && r.originAirportCode !== selectedOriginAirport) {
      return false;
    }
    // Destination airport filter
    if (selectedDestination !== 'all' && r.destinationAirportCode !== selectedDestination) {
      return false;
    }
    // Direct only
    if (directOnly && r.stops > 0) {
      return false;
    }
    // Max price filter
    if (r.basePriceUSD > maxPrice) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-stone-950/90 border-2 border-teal-500/30 rounded-[2.5rem] p-5 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
      
      {onBack && standalone && (
        <div className="relative z-10 mb-2">
          <button 
            onClick={onBack}
            className="bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white px-4 py-2.5 rounded-full font-bold shadow-md transition-colors flex items-center gap-2 border border-teal-500/30 w-fit cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'es' ? 'Volver al Inicio' : 'Back to Home'}</span>
          </button>
        </div>
      )}
      
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 border-b border-teal-500/20 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-stone-900/90 text-orange-400 rounded-full text-[11px] font-black uppercase tracking-wider border border-teal-500/30 mb-2">
            <Plane className="w-3.5 h-3.5 text-orange-400" />
            <span>{language === 'es' ? 'Rastreador de Vuelos Internacionales en Vivo' : 'Live International Flight Tracker'}</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <span>{language === 'es' ? 'Vuelos a Costa Rica desde' : 'Flights to Costa Rica from'}</span>
            <span className="text-orange-400 underline decoration-orange-400/40 decoration-2">
              {selectedCountry.flag} {selectedCountry.name[language === 'es' ? 'es' : 'en']}
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl mt-1">
            {language === 'es'
              ? 'Conexiones directas y con escala hacia los aeropuertos internacionales de San José (SJO) y Liberia Guanacaste (LIR). Reserva tu vuelo con asistencia receptiva y chofer oficial.'
              : 'Direct and connecting routes to San Jose (SJO) and Liberia Guanacaste (LIR) international airports. Book your flight package with official airport reception & driver.'}
          </p>
        </div>

        {/* Origin Country Selector Dropdown */}
        <div className="flex flex-col items-start md:items-end gap-1">
          <label className="text-[10px] font-black uppercase text-teal-300 flex items-center gap-1">
            <Globe className="w-3 h-3 text-orange-400" />
            {language === 'es' ? 'Cambiar País de Origen:' : 'Change Origin Country:'}
          </label>
          <select
            value={selectedCountry.countryCode}
            onChange={(e) => {
              const found = ORIGIN_COUNTRIES.find(c => c.countryCode === e.target.value);
              if (found) {
                setSelectedCountry(found);
                setSelectedOriginAirport('all');
              }
            }}
            className="bg-stone-900 border-2 border-orange-400/60 rounded-xl px-4 py-2.5 text-xs font-black text-white focus:outline-none focus:border-orange-400 cursor-pointer shadow-md"
          >
            {ORIGIN_COUNTRIES.map((c) => (
              <option key={c.countryCode} value={c.countryCode} className="bg-stone-950 text-white">
                {c.flag} {c.name[language === 'es' ? 'es' : 'en']}
              </option>
            ))}
          </select>
          <span className="text-[9px] text-orange-400/80 font-bold">
            {language === 'es' ? '📍 Detección inteligente por sesión' : '📍 Smart session auto-detection'}
          </span>
        </div>
      </div>

      {/* Filter and Airport Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-stone-900/40 p-4 rounded-2xl border border-teal-500/20">
        
        {/* Origin Airport within Selected Country */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-stone-200 uppercase flex items-center gap-1">
            <MapPin className="w-3 h-3 text-orange-400" />
            {language === 'es' ? 'Aeropuerto de Salida' : 'Departure Airport'}
          </label>
          <select
            value={selectedOriginAirport}
            onChange={(e) => setSelectedOriginAirport(e.target.value)}
            className="w-full bg-stone-950 border border-teal-500/30 rounded-xl p-2.5 text-xs text-white font-bold focus:outline-none focus:border-orange-400 cursor-pointer"
          >
            <option value="all">{language === 'es' ? 'Todos los Aeropuertos' : 'All Airports'}</option>
            {selectedCountry.defaultAirports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} • {a.city[language === 'es' ? 'es' : 'en']}
              </option>
            ))}
          </select>
        </div>

        {/* Destination Airport in Costa Rica */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-stone-200 uppercase flex items-center gap-1">
            <MapPin className="w-3 h-3 text-teal-400" />
            {language === 'es' ? 'Destino en Costa Rica' : 'Arrival Airport in CR'}
          </label>
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value as any)}
            className="w-full bg-stone-950 border border-teal-500/30 rounded-xl p-2.5 text-xs text-white font-bold focus:outline-none focus:border-orange-400 cursor-pointer"
          >
            <option value="all">{language === 'es' ? 'SJO & LIR (Ambos Aeropuertos)' : 'SJO & LIR (Both Airports)'}</option>
            <option value="SJO">SJO • San José / Alajuela (Central Hub)</option>
            <option value="LIR">LIR • Liberia Guanacaste (Playas & Sol)</option>
          </select>
        </div>

        {/* Direct Only Toggle */}
        <div className="space-y-1 flex flex-col justify-end">
          <label className="flex items-center gap-2 p-2.5 bg-stone-950 border border-teal-500/30 rounded-xl cursor-pointer hover:border-orange-400 transition-colors">
            <input
              type="checkbox"
              checked={directOnly}
              onChange={(e) => setDirectOnly(e.target.checked)}
              className="w-4 h-4 accent-orange-400 rounded"
            />
            <span className="text-xs font-black text-white">
              {language === 'es' ? 'Solo Vuelos Directos' : 'Non-Stop Flights Only'}
            </span>
          </label>
        </div>

        {/* Max Price Filter */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-stone-200 uppercase">
            <span>{language === 'es' ? 'Precio Máx:' : 'Max Price:'}</span>
            <span className="text-orange-400 font-black">{formatCurrency(maxPrice, currency)}</span>
          </div>
          <input
            type="range"
            min={150}
            max={2000}
            step={25}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-full accent-orange-400 cursor-pointer"
          />
        </div>

      </div>

      {/* Flight Cards Grid */}
      <div className="space-y-4">
        {availableRoutes.length === 0 ? (
          <div className="text-center py-10 bg-stone-900/30 rounded-2xl border border-teal-500/20 p-6 space-y-3">
            <Plane className="w-10 h-10 text-neutral-400 mx-auto opacity-50" />
            <p className="text-sm font-bold text-neutral-300">
              {language === 'es' 
                ? 'No se encontraron vuelos con los filtros seleccionados. Intenta ampliar el rango de precio o seleccionar "Todos los Aeropuertos".'
                : 'No flights found with selected filters. Try expanding price range or selecting "All Airports".'}
            </p>
            <button
              onClick={() => {
                setSelectedOriginAirport('all');
                setSelectedDestination('all');
                setDirectOnly(false);
                setMaxPrice(2000);
              }}
              className="px-4 py-2 bg-stone-800 hover:bg-teal-700 text-white rounded-full text-xs font-bold transition-colors cursor-pointer"
            >
              {language === 'es' ? 'Restablecer Filtros' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          availableRoutes.map((route) => (
            <div
              key={route.id}
              className="bg-stone-900/70 hover:bg-stone-900 border-2 border-teal-500/30 hover:border-orange-400/80 rounded-2xl p-4 sm:p-5 transition-all shadow-lg hover:shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
            >
              {/* Left Column: Airline & Flight Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-950 border border-teal-500/40 flex items-center justify-center font-black text-orange-400 text-sm shadow-inner">
                    {route.airlineCode}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-white text-base">
                        {route.airline}
                      </h4>
                      <span className="text-[10px] font-mono bg-stone-950 text-stone-200 px-2 py-0.5 rounded border border-teal-600/30">
                        {route.flightNumber}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 font-medium">
                      {route.aircraft} • <span className="text-orange-400 font-bold">{getLangText(route.frequency, language)}</span>
                    </p>
                  </div>
                </div>

                {/* Features Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-bold bg-stone-950/80 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-600/30 flex items-center gap-1">
                    <Luggage className="w-3 h-3 text-teal-400" />
                    {language === 'es' ? 'Mano 10kg + Bodega 23kg' : '10kg Carry-on + 23kg Checked'}
                  </span>
                  {route.stops === 0 ? (
                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-teal-400" />
                      {language === 'es' ? 'Vuelo Directo Sin Escalas' : 'Direct Non-Stop'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-orange-500/20 text-orange-300 px-2.5 py-0.5 rounded-full border border-orange-500/40">
                      {route.stopDetails ? getLangText(route.stopDetails, language) : '1 Escala'}
                    </span>
                  )}
                  {route.co2EcoRating && (
                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/40">
                      🌱 Eco CO2: {route.co2EcoRating}
                    </span>
                  )}
                </div>
              </div>

              {/* Middle Column: Route & Times Timeline */}
              <div className="flex items-center justify-between sm:justify-center gap-4 sm:gap-8 bg-stone-950/80 p-3 sm:p-4 rounded-xl border border-teal-500/20 min-w-[280px]">
                {/* Origin */}
                <div className="text-left">
                  <span className="text-xl sm:text-2xl font-black text-orange-400 font-mono block">
                    {route.departureTime}
                  </span>
                  <span className="text-xs font-black text-white block">
                    {route.originAirportCode}
                  </span>
                  <span className="text-[10px] text-neutral-400 line-clamp-1">
                    {getLangText(route.originCity, language)}
                  </span>
                </div>

                {/* Duration Line */}
                <div className="flex-1 flex flex-col items-center px-2">
                  <span className="text-[10px] font-bold text-neutral-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-orange-400" />
                    {route.duration}
                  </span>
                  <div className="w-full h-0.5 bg-teal-500/40 relative flex items-center justify-center">
                    <Plane className="w-3.5 h-3.5 text-orange-400 absolute" />
                  </div>
                  <span className="text-[9px] text-teal-400 font-bold mt-1">
                    {route.stops === 0 ? (language === 'es' ? 'Directo' : 'Direct') : 'Con escala'}
                  </span>
                </div>

                {/* Destination */}
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-orange-400 font-mono block">
                    {route.arrivalTime}
                  </span>
                  <span className="text-xs font-black text-white block">
                    {route.destinationAirportCode}
                  </span>
                  <span className="text-[10px] text-neutral-400 line-clamp-1">
                    {getLangText(route.destinationCity, language)}
                  </span>
                </div>
              </div>

              {/* Right Column: Price & Booking Action */}
              <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 border-teal-500/20 pt-3 lg:pt-0">
                <div className="text-left lg:text-right">
                  <span className="text-[10px] text-neutral-400 font-bold block">
                    {language === 'es' ? 'Desde (Tasas Incluidas)' : 'From (Taxes Included)'}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-orange-400">
                      {formatCurrency(route.basePriceUSD, currency)}
                    </span>
                    <span className="text-[11px] text-neutral-300 font-semibold">
                      / pax
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedFlightForBooking(route)}
                    className="bg-orange-400 hover:bg-orange-300 text-stone-950 font-black px-4 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>{language === 'es' ? 'Reservar Vuelo + Transfer' : 'Book Flight + Transfer'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Helpful AI Travel Assistant Footer Banner */}
      <div className="bg-stone-900/40 p-4 sm:p-5 rounded-2xl border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-400/20 text-orange-400 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-xs font-black uppercase text-orange-400">
              {language === 'es' ? '¿Dudas sobre equipaje, aduanas o qué aeropuerto elegir?' : 'Questions about baggage, customs, or SJO vs LIR?'}
            </h5>
            <p className="text-[11px] text-neutral-300">
              {language === 'es'
                ? 'Nuestros agentes IA te asesoran en vivo sobre visados, tiempos de conexión y traslados directos a tus hoteles.'
                : 'Our AI Concierge provides live guidance on visas, layovers, and airport meet-and-greet transfers.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (onAskAI) {
                const prompt = language === 'es'
                  ? `¿Cuáles son los requisitos de entrada y aduanas para viajar de ${selectedCountry.name.es} a Costa Rica (Aeropuertos SJO y LIR)?`
                  : `What are the customs and entry requirements to travel from ${selectedCountry.name.en} to Costa Rica (SJO & LIR)?`;
                onAskAI(prompt);
              }
            }}
            className="text-[11px] font-bold bg-stone-950 hover:bg-stone-800 text-orange-300 px-3 py-1.5 rounded-full border border-teal-500/30 transition-colors cursor-pointer"
          >
            🛂 {language === 'es' ? 'Requisitos de Entrada' : 'Entry Requirements'}
          </button>
          <button
            onClick={() => {
              if (onAskAI) {
                const prompt = language === 'es'
                  ? '¿Es mejor volar a San José (SJO) o a Liberia (LIR) según mi itinerario en Costa Rica?'
                  : 'Is it better to land at San Jose (SJO) or Liberia (LIR) for my Costa Rica itinerary?';
                onAskAI(prompt);
              }
            }}
            className="text-[11px] font-bold bg-stone-950 hover:bg-stone-800 text-stone-200 px-3 py-1.5 rounded-full border border-teal-500/30 transition-colors cursor-pointer"
          >
            🗺️ {language === 'es' ? '¿SJO o LIR?' : 'SJO vs LIR?'}
          </button>
        </div>
      </div>

      {/* Flight Booking Modal */}
      {selectedFlightForBooking && (
        <FlightBookingModal
          flight={selectedFlightForBooking}
          isOpen={!!selectedFlightForBooking}
          language={language}
          currency={currency}
          onClose={() => setSelectedFlightForBooking(null)}
          onBookingSuccess={onBookingSuccess}
        />
      )}

    </div>
  );
};
