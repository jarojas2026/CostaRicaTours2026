import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  ArrowLeft, Plane, Globe, MapPin, Calendar, Clock, Luggage, ArrowRight, 
  Sparkles, CheckCircle2, ShieldCheck, Filter, Search, RefreshCw, 
  Info, Compass, ChevronDown, Award, ExternalLink, Bot, HelpCircle, Shield, CreditCard
} from 'lucide-react';
import { FlightRoute, Language, Currency, BookingRequest } from '../types';
import { FLIGHT_ROUTES, ORIGIN_COUNTRIES, OriginCountryInfo, detectUserOriginCountry } from '../data/flightsData';
import { formatCurrency, getLangText } from '../utils/i18n';

const FlightBookingModal = lazy(() => import('./FlightBookingModal').then(m => ({ default: m.FlightBookingModal })));

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
  const [maxPrice, setMaxPrice] = useState<number>(1200);
  const [selectedFlightForBooking, setSelectedFlightForBooking] = useState<FlightRoute | null>(null);

  useEffect(() => {
    const detected = detectUserOriginCountry();
    setSelectedCountry(detected);
  }, []);

  const availableRoutes = FLIGHT_ROUTES.filter((r) => {
    if (r.originCountryCode !== selectedCountry.countryCode) return false;
    if (selectedOriginAirport !== 'all' && r.originAirportCode !== selectedOriginAirport) return false;
    if (selectedDestination !== 'all' && r.destinationAirportCode !== selectedDestination) return false;
    if (directOnly && r.stops > 0) return false;
    if (r.basePriceUSD > maxPrice) return false;
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden text-slate-100">
      
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 border-b border-slate-800 pb-6">
        <div>
          {standalone && onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-3 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{language === 'es' ? 'Volver' : 'Back'}</span>
            </button>
          )}

          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold tracking-wider border border-emerald-500/20 mb-2">
            <Plane className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'es' ? 'Rastreador de Vuelos a Costa Rica' : 'Costa Rica Flight Tracker'}</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 flex-wrap">
            <span>{language === 'es' ? 'Vuelos a Costa Rica desde' : 'Flights to Costa Rica from'}</span>
            <span className="text-emerald-400">
              {selectedCountry.flag} {selectedCountry.name[language === 'es' ? 'es' : 'en']}
            </span>
          </h3>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1.5">
            {language === 'es'
              ? 'Conexiones directas y con escala hacia los aeropuertos internacionales de San José (SJO) y Liberia Guanacaste (LIR). Reserva tu vuelo con asistencia receptiva y chofer oficial.'
              : 'Direct and connecting routes to San Jose (SJO) and Liberia Guanacaste (LIR) international airports. Book your flight package with official airport reception & driver.'}
          </p>
        </div>

        {/* Origin Country Selector Dropdown */}
        <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            {language === 'es' ? 'Cambiar Origen:' : 'Change Origin:'}
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
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-md"
          >
            {ORIGIN_COUNTRIES.map((c) => (
              <option key={c.countryCode} value={c.countryCode} className="bg-slate-900 text-white font-semibold">
                {c.flag} {c.name[language === 'es' ? 'es' : 'en']}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter and Airport Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 relative z-10">
        
        {/* Departure Airport Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            {language === 'es' ? 'Aeropuerto de Salida' : 'Departure Airport'}
          </label>
          <select
            value={selectedOriginAirport}
            onChange={(e) => setSelectedOriginAirport(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">{language === 'es' ? 'Todos los Aeropuertos' : 'All Airports'}</option>
            {selectedCountry.defaultAirports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} • {a.city[language === 'es' ? 'es' : 'en']}
              </option>
            ))}
          </select>
        </div>

        {/* Arrival Airport Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            {language === 'es' ? 'Destino en Costa Rica' : 'Arrival Airport in CR'}
          </label>
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">{language === 'es' ? 'SJO & LIR (Ambos)' : 'SJO & LIR (Both)'}</option>
            <option value="SJO">SJO • San José / Alajuela</option>
            <option value="LIR">LIR • Liberia Guanacaste</option>
          </select>
        </div>

        {/* Direct Only Checkbox */}
        <div className="space-y-1 flex flex-col justify-end">
          <label className="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors">
            <input
              type="checkbox"
              checked={directOnly}
              onChange={(e) => setDirectOnly(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
            <span className="text-xs font-semibold text-slate-200">
              {language === 'es' ? 'Solo Vuelos Directos' : 'Direct Flights Only'}
            </span>
          </label>
        </div>

        {/* Max Price Filter */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-semibold text-slate-400 uppercase">
            <span>{language === 'es' ? 'Precio Máx:' : 'Max Price:'}</span>
            <span className="text-emerald-400 font-bold">{formatCurrency(maxPrice, currency)}</span>
          </div>
          <input
            type="range"
            min={150}
            max={2000}
            step={25}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

      </div>

      {/* Flight List */}
      <div className="space-y-3.5 relative z-10">
        {availableRoutes.length === 0 ? (
          <div className="text-center py-10 bg-slate-800/40 rounded-2xl border border-slate-700/60 p-6 space-y-3">
            <Plane className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs font-medium text-slate-400">
              {language === 'es' 
                ? 'No se encontraron vuelos con los filtros seleccionados.'
                : 'No flights found with selected filters.'}
            </p>
            <button
              onClick={() => {
                setSelectedOriginAirport('all');
                setSelectedDestination('all');
                setDirectOnly(false);
                setMaxPrice(2000);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-full text-xs transition-colors cursor-pointer"
            >
              {language === 'es' ? 'Restablecer Filtros' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          availableRoutes.map((route) => (
            <div
              key={route.id}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl p-4 sm:p-5 transition-all shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-slate-100"
            >
              {/* Airline Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-emerald-400 text-xs shadow-inner">
                    {route.airlineCode}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-white text-base">
                        {route.airline}
                      </h4>
                      <span className="text-[10px] font-mono bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        {route.flightNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      {route.aircraft} • <span className="text-emerald-400 font-semibold">{getLangText(route.frequency, language)}</span>
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-semibold bg-slate-900 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
                    <Luggage className="w-3 h-3 text-emerald-400" />
                    {language === 'es' ? 'Mano 10kg + Bodega 23kg' : '10kg Carry-on + 23kg Checked'}
                  </span>
                  {route.stops === 0 ? (
                    <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {language === 'es' ? 'Vuelo Directo' : 'Direct Flight'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      {route.stopDetails ? getLangText(route.stopDetails, language) : '1 Escala'}
                    </span>
                  )}
                </div>
              </div>

              {/* Times Timeline */}
              <div className="flex items-center justify-between sm:justify-center gap-4 sm:gap-6 bg-slate-900/90 p-3 sm:p-4 rounded-xl border border-slate-700/60 min-w-[270px]">
                <div className="text-left">
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono block">
                    {route.departureTime}
                  </span>
                  <span className="text-xs font-bold text-white block">
                    {route.originAirportCode}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {getLangText(route.originCity, language)}
                  </span>
                </div>

                <div className="flex-1 flex flex-col items-center px-2">
                  <span className="text-[10px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    {route.duration}
                  </span>
                  <div className="w-full h-0.5 bg-slate-700 relative flex items-center justify-center">
                    <Plane className="w-3.5 h-3.5 text-emerald-400 absolute" />
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium mt-1">
                    {route.stops === 0 ? (language === 'es' ? 'Directo' : 'Direct') : 'Con escala'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono block">
                    {route.arrivalTime}
                  </span>
                  <span className="text-xs font-bold text-white block">
                    {route.destinationAirportCode}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {getLangText(route.destinationCity, language)}
                  </span>
                </div>
              </div>

              {/* Price & Action */}
              <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 border-slate-700/60 pt-3 lg:pt-0">
                <div className="text-left lg:text-right">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    {language === 'es' ? 'Desde (Tasas Incluidas)' : 'From (Taxes Included)'}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-emerald-400">
                      {formatCurrency(route.basePriceUSD, currency)}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / pax
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedFlightForBooking(route)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>{language === 'es' ? 'Reservar Vuelo' : 'Book Flight'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Assistant Banner */}
      <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">
              {language === 'es' ? '¿Dudas sobre equipaje, aduanas o qué aeropuerto elegir?' : 'Questions about baggage, customs, or SJO vs LIR?'}
            </h5>
            <p className="text-[11px] text-slate-400">
              {language === 'es'
                ? 'Pregunta a nuestro asistente de IA sobre visados y traslados receptivos.'
                : 'Ask our AI Concierge about visas, customs and airport transfers.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (onAskAI) {
                const prompt = language === 'es'
                  ? `¿Cuáles son los requisitos de entrada y aduanas para viajar de ${selectedCountry.name.es} a Costa Rica?`
                  : `What are the entry and customs requirements to travel from ${selectedCountry.name.en} to Costa Rica?`;
                onAskAI(prompt);
              }
            }}
            className="text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-400 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            🛂 {language === 'es' ? 'Requisitos de Entrada' : 'Entry Requirements'}
          </button>
        </div>
      </div>

      {/* Flight Booking Modal */}
      {selectedFlightForBooking && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#07241a] border border-emerald-500/30 rounded-2xl p-6 text-stone-100 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400"></div>
              <span>{language === 'es' ? 'Cargando módulo de reservas de vuelos...' : 'Loading flight booking module...'}</span>
            </div>
          </div>
        }>
          <FlightBookingModal
            flight={selectedFlightForBooking}
            isOpen={!!selectedFlightForBooking}
            language={language}
            currency={currency}
            onClose={() => setSelectedFlightForBooking(null)}
            onBookingSuccess={onBookingSuccess}
          />
        </Suspense>
      )}

    </div>
  );
};
