import { requestCustomerIntake } from '../utils/customerIntake';
import React, { useState } from 'react';
import { 
  Bus, Navigation, ArrowRight, ExternalLink, MessageCircle, Info, 
  ShieldCheck, MapPin, Clock, Phone, Sparkles, Car, Plane, Check,
  Wifi, Wind, Coffee, Users, Search, Award
} from 'lucide-react';
import { Language, Currency } from '../types';
import { formatCurrency } from '../utils/i18n';
import { 
  ALSAMA_PROVIDER_INFO, 
  ALSAMA_TRANSPORT_ROUTES, 
  AlsamaTransportRoute 
} from '../data/alsamaTransportData';

interface NationalTransportSectionProps {
  language: Language;
  currency: Currency;
  onOpenLocalBuses: () => void;
  onOpenTripBuilder: () => void;
}

export const NationalTransportSection: React.FC<NationalTransportSectionProps> = ({
  language,
  currency,
  onOpenLocalBuses,
  onOpenTripBuilder,
}) => {
  const [activeTab, setActiveTab] = useState<'alsama_private' | 'shuttles' | 'car_rental' | 'flights' | 'buses'>('alsama_private');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('sjo-to-la-fortuna-arenal');
  const [groupSize, setGroupSize] = useState<'1-5' | '6-10'>('1-5');
  const [routeSearch, setRouteSearch] = useState<string>('');

  const selectedRoute = ALSAMA_TRANSPORT_ROUTES.find(r => r.id === selectedRouteId) || ALSAMA_TRANSPORT_ROUTES[0];

  const filteredRoutes = ALSAMA_TRANSPORT_ROUTES.filter(r => {
    if (!routeSearch.trim()) return true;
    const q = routeSearch.toLowerCase();
    return (
      r.origin.es.toLowerCase().includes(q) ||
      r.origin.en.toLowerCase().includes(q) ||
      r.destination.es.toLowerCase().includes(q) ||
      r.destination.en.toLowerCase().includes(q)
    );
  });

  return (
    <section id="transporte" className="py-16 bg-stone-50 text-stone-900 relative overflow-hidden border-y border-black/10">
      {/* Background Subtle Gradient & Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-850 via-stone-900 to-stone-950 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-teal-500/10 border border-teal-400/30 text-teal-300 rounded-full text-xs font-black uppercase tracking-wider">
            <Bus className="w-3.5 h-3.5 text-[#25D366]" />
            <span>{language === 'es' ? 'Movilidad & Transporte Costa Rica' : 'Costa Rica Mobility & Transport'}</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-900 uppercase">
            🚌 {language === 'es' ? 'Transporte & Movilidad Nacional' : 'Nationwide Transport & Mobility'}
          </h2>
          
          <p className="text-sm sm:text-base text-stone-900 font-medium leading-relaxed">
            {language === 'es' 
              ? 'Explora opciones para moverte por Costa Rica. Cada servicio, proveedor, precio y horario debe confirmarse antes de reservar.'
              : 'Explore ways to get around Costa Rica. Confirm each service, provider, price and schedule before booking.'}
          </p>
        </div>

        {/* Tab Selection Buttons */}
        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 mb-10">
          <button
            onClick={() => setActiveTab('alsama_private')}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg ${
              activeTab === 'alsama_private'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-teal-300 shadow-teal-500/30 scale-105 ring-2 ring-emerald-400/50'
                : 'bg-[#0E351F] text-stone-100 hover:bg-[#15462A] border border-teal-500/40'
            }`}
          >
            <span>🚐</span>
            <span>{language === 'es' ? 'Consultar transporte (Alsama Tours)' : 'Ask about transport (Alsama Tours)'}</span>
            <span className="ml-1 bg-amber-400 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              {language === 'es' ? 'Por confirmar' : 'To confirm'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('shuttles')}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg ${
              activeTab === 'shuttles'
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-stone-900 border border-teal-300 shadow-teal-500/20 scale-105'
                : 'bg-[#0E351F] text-stone-800 hover:bg-[#15462A] border border-stone-200/60'
            }`}
          >
            <span>🚐</span>
            <span>{language === 'es' ? 'Shuttles Compartidos' : 'Shared Shuttles'}</span>
          </button>

          <button
            onClick={() => setActiveTab('car_rental')}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg ${
              activeTab === 'car_rental'
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-stone-900 border border-teal-300 shadow-teal-500/20 scale-105'
                : 'bg-[#0E351F] text-stone-800 hover:bg-[#15462A] border border-stone-200/60'
            }`}
          >
            <span>🚙</span>
            <span>{language === 'es' ? 'Renta de Autos 4x4' : '4x4 Car Rental'}</span>
          </button>

          <button
            onClick={() => setActiveTab('flights')}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg ${
              activeTab === 'flights'
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-stone-900 border border-teal-300 shadow-teal-500/20 scale-105'
                : 'bg-[#0E351F] text-stone-800 hover:bg-[#15462A] border border-stone-200/60'
            }`}
          >
            <span>✈️</span>
            <span>{language === 'es' ? 'Vuelos Domésticos' : 'Domestic Flights'}</span>
          </button>

          <button
            onClick={() => setActiveTab('buses')}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg ${
              activeTab === 'buses'
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-stone-900 border border-teal-300 shadow-teal-500/20 scale-105'
                : 'bg-[#0E351F] text-stone-800 hover:bg-[#15462A] border border-stone-200/60'
            }`}
          >
            <span>🚍</span>
            <span>{language === 'es' ? 'Buses Públicos' : 'Public Buses'}</span>
          </button>
        </div>

        {/* Tab Content: Alsama Tours CR Private Transfers */}
        {activeTab === 'alsama_private' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Prospective provider and quote inquiry */}
            <div className="bg-gradient-to-br from-[#0B2B18] via-[#0E351F] to-[#081F12] rounded-3xl p-6 sm:p-8 border border-emerald-500/40 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-emerald-500/30">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-black uppercase px-3.5 py-1 rounded-full flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>{language === 'es' ? 'Proveedor recomendado · por validar' : 'Recommended provider · verification pending'}</span>
                    </span>
                    <span className="text-amber-300 text-xs font-bold flex items-center gap-1">
                      {language === 'es' ? 'Sin acuerdo comercial confirmado' : 'No confirmed commercial agreement'}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 tracking-tight">
                    🚐 {language === 'es' ? 'Solicita transporte y servicios de Alsama Tours CR' : 'Request transport and services from Alsama Tours CR'}
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-900 max-w-3xl leading-relaxed">
                    {language === 'es'
                      ? 'Proveedor recomendado por Costa Rica Tours. Consulta su sitio y solicita disponibilidad y precio; cada servicio debe confirmarse directamente antes de considerarse reservado.'
                      : 'Recommended by Costa Rica Tours. Visit its website and request availability and a quote; each service must be confirmed directly before it is considered booked.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <a
                    href={ALSAMA_PROVIDER_INFO.transportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#071A0F] hover:bg-[#0c2918] text-emerald-300 border border-emerald-500/40 font-bold text-xs uppercase px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>{language === 'es' ? 'Visitar web de Alsama Tours' : 'Visit Alsama Tours website'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`https://wa.me/50687959148?text=${encodeURIComponent(
                      language === 'es'
                        ? 'Hola Costa Rica Tours. Quisiera solicitar una cotización de transporte o un servicio turístico con Alsama Tours. Aún no es una reserva confirmada.'
                        : 'Hello Costa Rica Tours. I would like to request a quote for transport or a travel service with Alsama Tours. This is not a confirmed booking.'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#20bd5a] text-stone-950 font-black text-xs uppercase px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{language === 'es' ? 'Consultar por WhatsApp' : 'WhatsApp Direct Inquiry'}</span>
                  </a>
                </div>
              </div>

            <p className="mt-4 text-xs text-amber-200">{language === 'es' ? 'Precios, horarios, vehículo, inclusiones, políticas y disponibilidad: pendientes de confirmación con el proveedor. Enviar esta consulta no reserva ni genera un cobro.' : 'Prices, schedules, vehicle, inclusions, policies and availability must be confirmed with the provider. Sending this inquiry does not book or charge.'}</p>
            </div>

            {/* Interactive Route Calculator & Quote Generator */}
            <div className="bg-[#0E351F]/95 rounded-3xl p-6 sm:p-8 border border-teal-500/40 shadow-xl">
              <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-200/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xl sm:text-2xl font-black text-stone-900">
                      {language === 'es' ? 'Solicitar cotización de traslado' : 'Request a transfer quote'}
                    </h4>
                    <p className="text-xs text-stone-900">
                      {language === 'es'
                        ? 'Elige una ruta de referencia y tamaño de grupo; confirmaremos precio y disponibilidad.'
                        : 'Choose a sample route and group size; price and availability will be confirmed.'}
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex bg-teal-500/20 text-teal-300 text-xs font-bold px-3 py-1 rounded-full border border-teal-400/30">
                  {language === 'es' ? 'Cotización por confirmar' : 'Quote to be confirmed'}
                </span>
              </div>

              {/* Selector Controls */}
              <div className="grid md:grid-cols-2 gap-6 items-center">
                
                {/* Left: Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-teal-300 mb-2">
                      {language === 'es' ? 'Selecciona tu Ruta de Traslado:' : 'Select your Transfer Route:'}
                    </label>
                    <select
                      value={selectedRouteId}
                      onChange={(e) => setSelectedRouteId(e.target.value)}
                      className="w-full bg-[#071A0F] text-stone-900 border border-teal-500/50 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-teal-400 shadow-inner"
                    >
                      {ALSAMA_TRANSPORT_ROUTES.map((route) => (
                            <option key={route.id} value={route.id} className="bg-[#071A0F] text-stone-900">
                          {route.origin[language === 'es' ? 'es' : 'en']} ➔ {route.destination[language === 'es' ? 'es' : 'en']}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-teal-300 mb-2">
                      {language === 'es' ? 'Tamaño del Grupo y Vehículo:' : 'Group Size & Vehicle Type:'}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setGroupSize('1-5')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          groupSize === '1-5'
                            ? 'bg-teal-600/30 border-teal-400 text-stone-900 shadow-lg'
                            : 'bg-[#071A0F] border-stone-200/60 text-stone-800 hover:border-stone-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black uppercase text-teal-300 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            1 a 5 Pasajeros
                          </span>
                          {groupSize === '1-5' && <Check className="w-4 h-4 text-teal-400" />}
                        </div>
                            <span className="text-[11px] text-stone-900 block">{language === 'es' ? 'Vehículo y tarifa por confirmar' : 'Vehicle and rate to be confirmed'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGroupSize('6-10')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          groupSize === '6-10'
                            ? 'bg-teal-600/30 border-teal-400 text-stone-900 shadow-lg'
                            : 'bg-[#071A0F] border-stone-200/60 text-stone-800 hover:border-stone-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            6 a 10 Pasajeros
                          </span>
                          {groupSize === '6-10' && <Check className="w-4 h-4 text-amber-400" />}
                        </div>
                            <span className="text-[11px] text-stone-900 block">{language === 'es' ? 'Vehículo y tarifa por confirmar' : 'Vehicle and rate to be confirmed'}</span>
                      </button>
                    </div>
                  </div>

                  {selectedRoute.scenicStops && (
                    <div className="bg-[#071A0F] p-3.5 rounded-2xl border border-stone-200/60 flex items-start gap-2.5 text-xs text-stone-800">
                      <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-stone-900 block">
                          {language === 'es' ? 'Ruta de referencia para cotizar:' : 'Sample route for a quote:'}
                        </strong>
                        <span>{language === 'es' ? 'Paradas y recorrido se coordinan con el proveedor.' : 'Stops and routing are coordinated with the provider.'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Price & Booking Action Card */}
                <div className="bg-gradient-to-br from-[#071A0F] to-[#0A2616] p-6 sm:p-7 rounded-3xl border border-teal-500/50 shadow-2xl flex flex-col justify-between space-y-5">
                  <div>
                    <div className="flex items-center justify-between text-xs text-stone-900 mb-2">
                      <span className="uppercase tracking-wider font-bold text-teal-300">
                        {language === 'es' ? 'Precio del servicio' : 'Service price'}
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                        {groupSize === '1-5' ? '1-5 Pax' : '6-10 Pax'}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                        {language === 'es' ? 'Por cotizar' : 'Quote required'}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-900 mt-2 leading-relaxed">
                      {language === 'es'
                        ? 'Solicita una cotización; inclusiones y condiciones se confirmarán antes de reservar.'
                        : 'Request a quote; inclusions and terms will be confirmed before booking.'}
                    </p>

                  </div>

                  <div className="space-y-2.5 pt-2">
                    <a
                      href={`https://wa.me/50687959148?text=${encodeURIComponent(
                        language === 'es'
                          ? `Hola Costa Rica Tours. Quisiera cotizar un traslado con Alsama Tours:\n• Ruta solicitada: ${selectedRoute.origin.es} ➔ ${selectedRoute.destination.es}\n• Grupo: ${groupSize === '1-5' ? '1 a 5 pasajeros' : '6 a 10 pasajeros'}\nPor favor confirmar precio, disponibilidad, vehículo e inclusiones. Entiendo que esto es una consulta, no una reserva confirmada.`
                          : `Hello Costa Rica Tours. I would like a quote for a transfer with Alsama Tours:\n• Requested route: ${selectedRoute.origin.en} ➔ ${selectedRoute.destination.en}\n• Group: ${groupSize === '1-5' ? '1 to 5 passengers' : '6 to 10 passengers'}\nPlease confirm price, availability, vehicle and inclusions. I understand this is an inquiry, not a confirmed booking.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-stone-950 font-black text-xs uppercase px-5 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{language === 'es' ? 'Solicitar cotización por WhatsApp' : 'Request a quote on WhatsApp'}</span>
                    </a>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-stone-900">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'es' ? 'Condiciones por confirmar' : 'Terms to be confirmed'}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Complete Transparent Rates Table */}
            <div className="bg-[#0E351F]/90 rounded-3xl p-6 sm:p-8 border border-teal-500/30 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xl font-black text-stone-900 flex items-center gap-2">
                    📋 {language === 'es' ? 'Rutas de referencia para solicitar cotización' : 'Sample routes to request a quote'}
                  </h4>
                  <p className="text-xs text-stone-900">
                    {language === 'es' 
                      ? 'La lista ayuda a preparar una consulta; no confirma operación, horarios ni precio de Alsama Tours.'
                      : 'This list helps prepare an inquiry; it does not confirm Alsama Tours service, schedule or price.'}
                  </p>
                </div>

                {/* Quick Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-stone-900 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={routeSearch}
                    onChange={(e) => setRouteSearch(e.target.value)}
                    placeholder={language === 'es' ? 'Filtrar por destino...' : 'Filter destination...'}
                    className="w-full bg-[#071A0F] text-stone-900 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-stone-200/60 focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-teal-500/30 text-teal-300 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3 font-bold">{language === 'es' ? 'Origen / Salida' : 'Origin'}</th>
                      <th className="py-3 px-3 font-bold">{language === 'es' ? 'Destino' : 'Destination'}</th>
                      <th className="py-3 px-3 font-bold text-center">{language === 'es' ? 'Tarifa' : 'Rate'}</th>
                      <th className="py-3 px-3 font-bold text-center">{language === 'es' ? 'Grupo' : 'Group'}</th>
                      <th className="py-3 px-3 font-bold text-center">{language === 'es' ? 'Acción' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-stone-800">
                    {filteredRoutes.map((route) => {
                      const isSelected = route.id === selectedRouteId;
                      return (
                        <tr
                          key={route.id}
                          onClick={() => setSelectedRouteId(route.id)}
                          className={`hover:bg-white/5 transition-colors cursor-pointer ${
                            isSelected ? 'bg-teal-500/10 text-stone-900 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-stone-900">{route.origin[language === 'es' ? 'es' : 'en']}</span>
                            {route.airportRoute && (
                              <span className="ml-1.5 text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded uppercase">
                                SJO
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-stone-900">{route.destination[language === 'es' ? 'es' : 'en']}</span>
                          </td>
                          <td className="py-3.5 px-3 text-center text-stone-900">{language === 'es' ? 'Por cotizar' : 'Quote required'}</td>
                          <td className="py-3.5 px-3 text-center text-stone-900">{language === 'es' ? 'Por confirmar' : 'To confirm'}</td>
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRouteId(route.id);
                                const targetUrl = `https://wa.me/50687959148?text=${encodeURIComponent(
                                  language === 'es'
                                    ? `Hola Costa Rica Tours. Quisiera cotizar la ruta ${route.origin.es} ➔ ${route.destination.es} con Alsama Tours. Por favor confirmar disponibilidad, tarifa, vehículo y condiciones. Esto no es una reserva confirmada.`
                                    : `Hello Costa Rica Tours. I would like a quote for ${route.origin.en} ➔ ${route.destination.en} with Alsama Tours. Please confirm availability, rate, vehicle and terms. This is not a confirmed booking.`
                                )}`;
                                requestCustomerIntake({
                                  message: language === 'es'
                                    ? `Hola Costa Rica Tours, deseo reservar traslado con Alsama Tours CR: ${route.origin.es} ➔ ${route.destination.es}.`
                                    : `Hello Costa Rica Tours, I want to book transfer with Alsama Tours CR: ${route.origin.en} ➔ ${route.destination.en}.`,
                                  language,
                                  source: `national-transport:${route.id}`,
                                  context: { routeId: route.id, page: window.location.pathname, originalHref: targetUrl }
                                });
                              }}
                              className="bg-teal-600 hover:bg-teal-500 text-stone-900 font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg transition-all"
                            >
                              {language === 'es' ? 'Cotizar' : 'Quote'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab Content: Shuttles */}
        {activeTab === 'shuttles' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Shuttle Compartido Nacional */}
              <div id="card-shuttle-national" className="bg-[#0E351F]/90 rounded-3xl p-6 border border-teal-500/30 shadow-xl flex flex-col justify-between hover:border-teal-400 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[11px] font-black uppercase px-3 py-1 rounded-full">
                      {language === 'es' ? 'Rutas Nacionales' : 'Main National Routes'}
                    </span>
                    <span className="text-orange-300 text-xs font-bold">★ Servicio Compartido Confort</span>
                  </div>

                  <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
                    🚐 Shuttle Turístico Hotel-a-Hotel
                  </h3>

                  <p className="text-xs text-stone-900 leading-relaxed">
                    {language === 'es'
                      ? 'Traslados compartidos y confortables con recogida directa en la recepción de tu hotel entre Arenal, Monteverde, Manuel Antonio, Tamarindo, Papagayo y Aeropuerto SJO. Vans modernas con A/C y WiFi.'
                      : 'Shared door-to-door transfers picking you up at your hotel lobby connecting San José Airport, Arenal, Monteverde, Manuel Antonio, Tamarindo, and Guanacaste.'}
                  </p>

                  <div className="bg-[#071A0F] p-3.5 rounded-2xl border border-stone-200/80 text-xs space-y-1.5 text-stone-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-400 flex-shrink-0" />
                      <span>{language === 'es' ? 'Salidas diarias: 8:00 AM y 2:00 PM' : 'Daily Departures: 8:00 AM & 2:00 PM'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
                      <span>{language === 'es' ? 'Tarifa Oficial: $54 - $65 USD / persona' : 'Official Rate: $54 - $65 USD / person'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-stone-200/60">
                  <a
                    href={`https://wa.me/50687959148?text=${encodeURIComponent(
                      language === 'es'
                        ? 'Hola Costa Rica Tours (costaricatours.es), quisiera cotizar un shuttle turístico compartido hotel-a-hotel.'
                        : 'Hello Costa Rica Tours (costaricatours.es), I would like to book a shared hotel-to-hotel tourist shuttle.'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-stone-950 font-black text-xs uppercase px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{language === 'es' ? 'Cotizar Shuttle Compartido' : 'Inquire Shared Shuttle'}</span>
                  </a>
                </div>
              </div>

              {/* Shuttle Expreso Caribe */}
              <div id="card-shuttle-caribe" className="bg-[#0E351F]/90 rounded-3xl p-6 border border-teal-500/30 shadow-xl flex flex-col justify-between hover:border-teal-400 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[11px] font-black uppercase px-3 py-1 rounded-full">
                      {language === 'es' ? 'Caribe & Costas' : 'Caribbean & Coasts'}
                    </span>
                    <span className="text-orange-300 text-xs font-bold">★ Conexión Playas & Lanchas</span>
                  </div>

                  <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
                    🚌 Shuttle Expreso Caribe Sur
                  </h3>

                  <p className="text-xs text-stone-900 leading-relaxed">
                    {language === 'es'
                      ? 'Conexiones directas y confortables entre San José, Arenal y Tortuguero hacia Puerto Viejo de Talamanca, Cahuita, Manzanillo y cruce fronterizo.'
                      : 'Direct comfortable tourist routes linking San José and Arenal with Puerto Viejo, Cahuita, Manzanillo, and Caribbean ports.'}
                  </p>

                  <div className="bg-[#071A0F] p-3.5 rounded-2xl border border-stone-200/80 text-xs space-y-1.5 text-stone-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-400 flex-shrink-0" />
                      <span>{language === 'es' ? 'Conexiones directas a playa & muelles' : 'Direct beach & boat connections'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
                      <span>{language === 'es' ? 'Tarifa Oficial: $58 - $70 USD / persona' : 'Official Rate: $58 - $70 USD / person'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-stone-200/60">
                  <a
                    href={`https://wa.me/50687959148?text=${encodeURIComponent(
                      language === 'es'
                        ? 'Hola Costa Rica Tours (costaricatours.es), quisiera cotizar traslado shuttle hacia Puerto Viejo / Cahuita / Caribe.'
                        : 'Hello Costa Rica Tours (costaricatours.es), I would like to book a tourist shuttle to Puerto Viejo / Cahuita / Caribbean.'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-stone-950 font-black text-xs uppercase px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{language === 'es' ? 'Cotizar Shuttle Caribe' : 'Inquire Caribbean Shuttle'}</span>
                  </a>
                </div>
              </div>

              {/* Private Vans */}
              <div id="card-shuttle-private" className="bg-[#0E351F]/90 rounded-3xl p-6 border border-teal-500/30 shadow-xl flex flex-col justify-between hover:border-teal-400 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[11px] font-black uppercase px-3 py-1 rounded-full">
                      {language === 'es' ? 'Privado & Familias' : 'Private & Families'}
                    </span>
                    <span className="text-orange-300 text-xs font-bold">★ Servicio VIP Puerta a Puerta</span>
                  </div>

                  <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
                    🚐 Traslados Privados Exclusivos
                  </h3>

                  <p className="text-xs text-stone-900 leading-relaxed">
                    {language === 'es'
                      ? 'Vans ejecutivas exclusivas para familias y grupos pequeños con paradas libres para fotos y comida en ruta. Horario 100% flexible a tu conveniencia.'
                      : 'Exclusive executive vans for families and groups with custom departure times and scenic photo/meal stops along the route.'}
                  </p>

                  <div className="bg-[#071A0F] p-3.5 rounded-2xl border border-stone-200/80 text-xs space-y-1.5 text-stone-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-400 flex-shrink-0" />
                      <span>{language === 'es' ? 'Salida a la hora que tú elijas' : 'Custom departure time anytime'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
                      <span>{language === 'es' ? 'Capacidad: 1 a 12 pasajeros' : 'Capacity: 1 to 12 passengers'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-stone-200/60">
                  <a
                    href={`https://wa.me/50687959148?text=${encodeURIComponent(
                      language === 'es'
                        ? 'Hola Costa Rica Tours (costaricatours.es), quisiera cotizar un traslado privado exclusivo para mi grupo.'
                        : 'Hello Costa Rica Tours (costaricatours.es), I would like to quote a private van transfer for my group.'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-stone-950 font-black text-xs uppercase px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{language === 'es' ? 'Cotizar Van Privada' : 'Inquire Private Van'}</span>
                  </a>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab Content: Car Rental */}
        {activeTab === 'car_rental' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Alquiler 4x4 Nacional */}
              <div className="bg-[#0E351F]/90 rounded-3xl p-6 sm:p-8 border border-teal-500/30 shadow-xl flex flex-col justify-between hover:border-teal-400 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-orange-500/20 text-orange-300 border border-orange-400/30 text-[11px] font-black uppercase px-3 py-1 rounded-full">
                      {language === 'es' ? 'Flota Todo Terreno' : 'All-Terrain 4WD Fleet'}
                    </span>
                    <span className="text-teal-300 text-xs font-bold">★ Cobertura Total Disponible</span>
                  </div>

                  <h3 className="text-2xl font-black text-stone-900 flex items-center gap-2">
                    🚙 Alquiler de Vehículos 4x4 & SUVs
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-900 leading-relaxed">
                    {language === 'es'
                      ? 'Flota moderna de vehículos 4x4 (Suzuki Jimny, Vitara, Hyundai Tucson, Prado) con excelentes coberturas y entrega directa en Aeropuertos SJO y LIR o en tu hotel en cualquier parte del país.'
                      : 'Modern 4WD SUV fleet (Suzuki Jimny, Vitara, Tucson, Prado) with comprehensive zero-deductible insurance and airport pickup at SJO/LIR or direct hotel delivery.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-800">
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-stone-200/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>{language === 'es' ? 'Cobertura Total Cero Deducible' : 'Zero Deductible Option'}</span>
                    </div>
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-stone-200/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>{language === 'es' ? 'GPS & WiFi portátil' : 'GPS & WiFi Hotspot'}</span>
                    </div>
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-stone-200/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>{language === 'es' ? 'Conductor adicional gratis' : 'Free additional driver'}</span>
                    </div>
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-stone-200/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>{language === 'es' ? 'Asistencia en carretera 24/7' : '24/7 Roadside Assistance'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-stone-200/60 flex flex-col sm:flex-row gap-3">
                  <a
                    href={`https://wa.me/50687959148?text=${encodeURIComponent(
                      language === 'es'
                        ? 'Hola Costa Rica Tours (costaricatours.es), quisiera cotizar el alquiler de un vehículo 4x4 para mis fechas de viaje.'
                        : 'Hello Costa Rica Tours (costaricatours.es), I would like to quote a 4x4 rental car for my travel dates.'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-stone-950 font-black text-xs uppercase px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{language === 'es' ? 'Cotizar Alquiler 4x4 por WhatsApp' : 'Inquire 4x4 Rental via WhatsApp'}</span>
                  </a>
                </div>
              </div>

              {/* Renta de Autos Ejecutiva */}
              <div className="bg-[#0E351F]/90 rounded-3xl p-6 sm:p-8 border border-teal-500/30 shadow-xl flex flex-col justify-between hover:border-teal-400 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[11px] font-black uppercase px-3 py-1 rounded-full">
                      {language === 'es' ? 'Flota Automática & Premium' : 'Automatic & Premium Fleet'}
                    </span>
                    <span className="text-orange-300 text-xs font-bold">★ Entrega Express Aeropuerto</span>
                  </div>

                  <h3 className="text-2xl font-black text-stone-900 flex items-center gap-2">
                    🚗 Renta de SUVs & Sedanes Automáticos
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-900 leading-relaxed">
                    {language === 'es'
                      ? 'Flota de última generación con vehículos automáticos y manuales de alta gama. Ideal para turistas que buscan máximo confort, kilometraje ilimitado y entrega inmediata en el aeropuerto.'
                      : 'Premium vehicle fleet featuring modern automatic and manual SUVs. Perfect for travelers seeking effortless airport car pickups, high comfort, and unlimited mileage.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-800">
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-stone-200/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>{language === 'es' ? 'Pick-up en Aeropuerto SJO/LIR' : 'Airport SJO/LIR Pick-up'}</span>
                    </div>
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-stone-200/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>{language === 'es' ? 'Transmisión Automática' : 'Automatic Transmission'}</span>
                    </div>
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-stone-200/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>{language === 'es' ? 'Sillas de bebé disponibles' : 'Child safety seats'}</span>
                    </div>
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-stone-200/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>{language === 'es' ? 'Kilometraje Ilimitado' : 'Unlimited Mileage'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-stone-200/60 flex flex-col sm:flex-row gap-3">
                  <a
                    href={`https://wa.me/50687959148?text=${encodeURIComponent(
                      language === 'es'
                        ? 'Hola Costa Rica Tours (costaricatours.es), quisiera cotizar un auto automático para mi viaje.'
                        : 'Hello Costa Rica Tours (costaricatours.es), I would like to quote an automatic rental car for my trip.'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-stone-950 font-black text-xs uppercase px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{language === 'es' ? 'Cotizar Auto Automático' : 'Inquire Automatic Car'}</span>
                  </a>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab Content: Domestic Flights */}
        {activeTab === 'flights' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-[#0E351F]/90 rounded-3xl p-6 sm:p-8 border border-teal-500/30 shadow-xl">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-stone-200/60">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs font-black uppercase">
                    <Plane className="w-3.5 h-3.5" />
                    <span>{language === 'es' ? 'Conexiones Aéreas en Costa Rica' : 'Costa Rica Domestic Flight Connections'}</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                    ✈️ Vuelos Domésticos & Avionetas Escénicas
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-900 max-w-2xl leading-relaxed">
                    {language === 'es'
                      ? 'Llega a tu destino en solo 30 a 45 minutos volando desde la terminal de San José (SJO). Ahorra hasta 6 horas de carretera y disfruta de vistas aéreas espectaculares de volcanes, costas y selvas.'
                      : 'Reach top destinations in just 30 to 45 minutes departing from San José Terminal (SJO). Save 4-6 hours of road driving while enjoying breathtaking aerial views of volcanoes and coasts.'}
                  </p>
                </div>

                <a
                  href={`https://wa.me/50687959148?text=${encodeURIComponent(
                    language === 'es'
                      ? 'Hola Costa Rica Tours (costaricatours.es), quisiera cotizar y reservar vuelos domésticos internos en Costa Rica.'
                      : 'Hello Costa Rica Tours (costaricatours.es), I would like to quote and book domestic flights in Costa Rica.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-stone-950 font-black text-xs uppercase px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shrink-0 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{language === 'es' ? 'Cotizar Vuelos Domésticos' : 'Inquire Domestic Flights'}</span>
                </a>
              </div>

              {/* Flight Route Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-6">
                <div className="bg-[#071A0F] p-4 rounded-2xl border border-stone-200/60 text-center">
                  <span className="text-[10px] text-orange-400 font-bold block uppercase">SJO ⇄ Quepos</span>
                  <strong className="text-stone-900 text-sm block mt-1">Manuel Antonio</strong>
                  <span className="text-[11px] text-teal-300 block mt-1">⏱ 25 min vuelo</span>
                </div>
                <div className="bg-[#071A0F] p-4 rounded-2xl border border-stone-200/60 text-center">
                  <span className="text-[10px] text-orange-400 font-bold block uppercase">SJO ⇄ La Fortuna</span>
                  <strong className="text-stone-900 text-sm block mt-1">Volcán Arenal</strong>
                  <span className="text-[11px] text-teal-300 block mt-1">⏱ 30 min vuelo</span>
                </div>
                <div className="bg-[#071A0F] p-4 rounded-2xl border border-stone-200/60 text-center">
                  <span className="text-[10px] text-orange-400 font-bold block uppercase">SJO ⇄ Tamarindo</span>
                  <strong className="text-stone-900 text-sm block mt-1">Guanacaste</strong>
                  <span className="text-[11px] text-teal-300 block mt-1">⏱ 45 min vuelo</span>
                </div>
                <div className="bg-[#071A0F] p-4 rounded-2xl border border-stone-200/60 text-center">
                  <span className="text-[10px] text-orange-400 font-bold block uppercase">SJO ⇄ Bahía Drake</span>
                  <strong className="text-stone-900 text-sm block mt-1">Corcovado / Osa</strong>
                  <span className="text-[11px] text-teal-300 block mt-1">⏱ 45 min vuelo</span>
                </div>
                <div className="bg-[#071A0F] p-4 rounded-2xl border border-stone-200/60 text-center">
                  <span className="text-[10px] text-orange-400 font-bold block uppercase">SJO ⇄ Pto. Jiménez</span>
                  <strong className="text-stone-900 text-sm block mt-1">Golfo Dulce</strong>
                  <span className="text-[11px] text-teal-300 block mt-1">⏱ 50 min vuelo</span>
                </div>
                <div className="bg-[#071A0F] p-4 rounded-2xl border border-stone-200/60 text-center">
                  <span className="text-[10px] text-orange-400 font-bold block uppercase">SJO ⇄ Tortuguero</span>
                  <strong className="text-stone-900 text-sm block mt-1">Caribe Norte</strong>
                  <span className="text-[11px] text-teal-300 block mt-1">⏱ 35 min vuelo</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Public Buses */}
        {activeTab === 'buses' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* MUSOC */}
              <div id="card-bus-musoc" className="bg-[#0E351F] rounded-3xl p-6 border border-teal-500/30 shadow-lg flex flex-col justify-between hover:border-teal-400 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-300 font-bold text-xs uppercase tracking-wider">Pacífico & Sur</span>
                    <Bus className="w-5 h-5 text-teal-400" />
                  </div>
                  <h3 className="text-xl font-black text-stone-900">MUSOC</h3>
                  <p className="text-xs text-stone-900">
                    {language === 'es' 
                      ? 'Rutas principales desde San José hacia Pérez Zeledón, San Isidro y el Pacífico Sur.'
                      : 'Main routes connecting San José with Pérez Zeledón & South Pacific.'}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-stone-200/60">
                  <a
                    href="https://www.musoc.co.cr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-teal-600 hover:bg-teal-500 text-stone-900 font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>{language === 'es' ? 'Ver Horarios y Sitio Oficial' : 'Official Schedules & Website'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* TRACOPA */}
              <div id="card-bus-tracopa" className="bg-[#0E351F] rounded-3xl p-6 border border-teal-500/30 shadow-lg flex flex-col justify-between hover:border-teal-400 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-300 font-bold text-xs uppercase tracking-wider">Manuel Antonio & Sur</span>
                    <Bus className="w-5 h-5 text-teal-400" />
                  </div>
                  <h3 className="text-xl font-black text-stone-900">TRACOPA</h3>
                  <p className="text-xs text-stone-900">
                    {language === 'es' 
                      ? 'Rutas directas a Quepos, Manuel Antonio, Uvita, Golfito, Puerto Jiménez y Paso Canoas.'
                      : 'Direct buses to Manuel Antonio, Quepos, Uvita, Golfito, and Panama border.'}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-stone-200/60">
                  <a
                    href="https://www.tracopa.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-teal-600 hover:bg-teal-500 text-stone-900 font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>{language === 'es' ? 'Ver Horarios y Sitio Oficial' : 'Official Schedules & Website'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* GAFESO / San José-La Fortuna */}
              <div id="card-bus-gafeso" className="bg-[#0E351F] rounded-3xl p-6 border border-teal-500/30 shadow-lg flex flex-col justify-between hover:border-teal-400 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-300 font-bold text-xs uppercase tracking-wider">Arenal & Zona Norte</span>
                    <Bus className="w-5 h-5 text-teal-400" />
                  </div>
                  <h3 className="text-xl font-black text-stone-900">GAFESO / San Carlos</h3>
                  <p className="text-xs text-stone-900">
                    {language === 'es' 
                      ? 'Rutas hacia San Carlos, Ciudad Quesada y conexiones al Volcán Arenal / La Fortuna.'
                      : 'Buses to San Carlos, Ciudad Quesada, and Arenal Volcano connections.'}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-stone-200/60">
                  <a
                    href="https://www.gafeso.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-teal-600 hover:bg-teal-500 text-stone-900 font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>{language === 'es' ? 'Ver Horarios y Sitio Oficial' : 'Official Schedules & Website'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* MEPE */}
              <div id="card-bus-mepe" className="bg-[#0E351F] rounded-3xl p-6 border border-teal-500/30 shadow-lg flex flex-col justify-between hover:border-teal-400 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-300 font-bold text-xs uppercase tracking-wider">Caribe Sur</span>
                    <Bus className="w-5 h-5 text-teal-400" />
                  </div>
                  <h3 className="text-xl font-black text-stone-900">AUTOTRANSPORTES MEPE</h3>
                  <p className="text-xs text-stone-900">
                    {language === 'es' 
                      ? 'Rutas principales a Cahuita, Puerto Viejo, Manzanillo, Bribri y Limón.'
                      : 'Main routes to Cahuita, Puerto Viejo, Manzanillo, Bribri, and Limón.'}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-stone-200/60">
                  <a
                    href="https://www.mepe.cr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-teal-600 hover:bg-teal-500 text-stone-900 font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>{language === 'es' ? 'Ver Horarios y Sitio Oficial' : 'Official Schedules & Website'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>

            {/* Complete Bus Directory Modal Launcher Banner */}
            <div className="bg-white p-6 rounded-3xl border border-teal-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-lg font-black text-stone-900">
                  {language === 'es' ? '¿Buscas terminales en San José, tarifas exactas o consejos de seguridad?' : 'Looking for San José terminals, exact fares or bus safety tips?'}
                </h4>
                <p className="text-xs text-stone-800">
                  {language === 'es' ? 'Abre el directorio completo de buses locales de Costa Rica con más de 10 rutas nacionales detalladas.' : 'Open the complete local bus directory with over 10 detailed national routes.'}
                </p>
              </div>

              <button
                onClick={onOpenLocalBuses}
                className="bg-orange-400 hover:bg-orange-300 text-stone-950 font-black text-xs uppercase px-6 py-3.5 rounded-2xl transition-all flex items-center gap-2 shadow-lg cursor-pointer whitespace-nowrap hover:scale-105"
              >
                <Bus className="w-4 h-4" />
                <span>{language === 'es' ? 'Abrir Directorio de Buses' : 'Open Bus Directory'}</span>
              </button>
            </div>

            {/* Legal Notice Warning Box */}
            <div className="bg-amber-950/40 p-4 rounded-2xl border border-orange-500/40 text-xs text-orange-200 flex items-start gap-3">
              <Info className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-orange-300 uppercase mb-0.5">
                  ⚠️ {language === 'es' ? 'Información Importante:' : 'Important Notice:'}
                </strong>
                <p className="leading-relaxed">
                  {language === 'es'
                    ? 'Los tiquetes de buses públicos se compran directamente en el sitio web oficial o en las ventanillas físicas de cada empresa. Costa Rica Tours (costaricatours.es) no vende ni cobra comisiones por boletos de transporte público; únicamente facilitamos los enlaces e información para ayudarte a planificar tu itinerario.'
                    : 'Public bus tickets are purchased directly on the official websites or physical terminal counters of each company. Costa Rica Tours (costaricatours.es) does not sell or charge fees for public bus tickets; we provide the links and guidance solely for itinerary planning.'}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 bg-[#071A0F]/80 p-6 sm:p-8 rounded-3xl border border-teal-500/30">
          <h3 className="text-2xl font-black text-stone-900 text-center mb-8 uppercase tracking-wider">
            {language === 'es' ? 'Preguntas Frecuentes de Movilidad' : 'Mobility & Transport FAQ'}
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#0E351F]/60 p-5 rounded-2xl border border-stone-200/50">
              <h4 className="text-teal-300 font-bold mb-2 flex items-center gap-2 text-sm uppercase">
                <Clock className="w-4 h-4 text-orange-300" />
                {language === 'es' ? '¿Son puntuales los traslados?' : 'Are schedules accurate?'}
              </h4>
              <p className="text-stone-900 text-xs leading-relaxed">
                {language === 'es' 
                  ? 'Los traslados turísticos y vuelos domésticos coordinados por nuestra agencia son sumamente puntuales. Para buses públicos, recomendamos presentarse con 30 minutos de antelación.' 
                  : 'Tourist shuttles and domestic flights arranged by our agency operate strictly on schedule. For public buses, we recommend arriving 30 minutes before departure.'}
              </p>
            </div>
            
            <div className="bg-[#0E351F]/60 p-5 rounded-2xl border border-stone-200/50">
              <h4 className="text-teal-300 font-bold mb-2 flex items-center gap-2 text-sm uppercase">
                <Car className="w-4 h-4 text-orange-300" />
                {language === 'es' ? '¿Se necesita auto 4x4?' : 'Is a 4x4 vehicle needed?'}
              </h4>
              <p className="text-stone-900 text-xs leading-relaxed">
                {language === 'es' 
                  ? 'Para Monteverde, Península de Osa y playas remotas, un 4x4 o SUV alto es altamente recomendado debido a la topografía de montaña y tramos de lastre.' 
                  : 'For Monteverde, Osa Peninsula, and secluded beaches, a 4WD or high-clearance SUV is strongly recommended due to mountain terrain.'}
              </p>
            </div>

            <div className="bg-[#0E351F]/60 p-5 rounded-2xl border border-stone-200/50">
              <h4 className="text-teal-300 font-bold mb-2 flex items-center gap-2 text-sm uppercase">
                <ShieldCheck className="w-4 h-4 text-orange-300" />
                {language === 'es' ? '¿Cómo se garantiza la reserva?' : 'How is booking guaranteed?'}
              </h4>
              <p className="text-stone-900 text-xs leading-relaxed">
                {language === 'es' 
                  ? 'Emitimos vouchers oficiales de Costa Rica Tours con confirmación inmediata, código QR de verificación, póliza de seguro y asistencia 24/7 en español e inglés.' 
                  : 'We issue official Costa Rica Tours vouchers with instant confirmation, verification QR code, insurance coverage, and 24/7 bilingual travel assistance.'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

