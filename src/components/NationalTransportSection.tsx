import React, { useState } from 'react';
import { Bus, Navigation, ArrowRight, ExternalLink, MessageCircle, Info, ShieldCheck, MapPin, Clock, Phone, Sparkles, Car, Plane, Check } from 'lucide-react';
import { Language, Currency } from '../types';
import { formatCurrency } from '../utils/i18n';

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
  const [activeTab, setActiveTab] = useState<'shuttles' | 'car_rental' | 'flights' | 'buses'>('shuttles');

  return (
    <section id="transporte" className="py-16 bg-[#0B2516] text-white relative overflow-hidden border-y border-emerald-500/30">
      {/* Background Subtle Gradient & Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 via-[#0B2516] to-[#05140B] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 rounded-full text-xs font-black uppercase tracking-wider">
            <Bus className="w-3.5 h-3.5 text-[#25D366]" />
            <span>{language === 'es' ? 'Movilidad & Transporte Costa Rica' : 'Costa Rica Mobility & Transport'}</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase">
            🚌 {language === 'es' ? 'Transporte & Movilidad Nacional' : 'Nationwide Transport & Mobility'}
          </h2>
          
          <p className="text-sm sm:text-base text-emerald-100 font-medium leading-relaxed">
            {language === 'es' 
              ? 'Conectamos todas las opciones para moverte por el país: shuttles interhoteles compartidos, renta de vehículos 4x4, vuelos domésticos rápidos y buses públicos económicos.'
              : 'All your Costa Rica travel options in one place: door-to-door shuttles, 4x4 car rentals, fast domestic flights, and affordable public buses.'}
          </p>
        </div>

        {/* Tab Selection Buttons */}
        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 mb-10">
          <button
            onClick={() => setActiveTab('shuttles')}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg ${
              activeTab === 'shuttles'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-300 shadow-emerald-500/20 scale-105'
                : 'bg-[#0E351F] text-emerald-200 hover:bg-[#15462A] border border-emerald-800/60'
            }`}
          >
            <span>🚐</span>
            <span>{language === 'es' ? 'Shuttles Turísticos' : 'Tourist Shuttles'}</span>
          </button>

          <button
            onClick={() => setActiveTab('car_rental')}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg ${
              activeTab === 'car_rental'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-300 shadow-emerald-500/20 scale-105'
                : 'bg-[#0E351F] text-emerald-200 hover:bg-[#15462A] border border-emerald-800/60'
            }`}
          >
            <span>🚙</span>
            <span>{language === 'es' ? 'Renta de Autos 4x4' : '4x4 Car Rental'}</span>
          </button>

          <button
            onClick={() => setActiveTab('flights')}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg ${
              activeTab === 'flights'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-300 shadow-emerald-500/20 scale-105'
                : 'bg-[#0E351F] text-emerald-200 hover:bg-[#15462A] border border-emerald-800/60'
            }`}
          >
            <span>✈️</span>
            <span>{language === 'es' ? 'Vuelos Domésticos' : 'Domestic Flights'}</span>
          </button>

          <button
            onClick={() => setActiveTab('buses')}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg ${
              activeTab === 'buses'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-300 shadow-emerald-500/20 scale-105'
                : 'bg-[#0E351F] text-emerald-200 hover:bg-[#15462A] border border-emerald-800/60'
            }`}
          >
            <span>🚍</span>
            <span>{language === 'es' ? 'Buses Públicos' : 'Public Buses'}</span>
          </button>
        </div>

        {/* Tab Content: Shuttles */}
        {activeTab === 'shuttles' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Shuttle Compartido Nacional */}
              <div id="card-shuttle-national" className="bg-[#0E351F]/90 rounded-3xl p-6 border border-emerald-500/30 shadow-xl flex flex-col justify-between hover:border-emerald-400 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-black uppercase px-3 py-1 rounded-full">
                      {language === 'es' ? 'Rutas Nacionales' : 'Main National Routes'}
                    </span>
                    <span className="text-amber-300 text-xs font-bold">★ Servicio Compartido Confort</span>
                  </div>

                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    🚐 Shuttle Turístico Hotel-a-Hotel
                  </h3>

                  <p className="text-xs text-emerald-100 leading-relaxed">
                    {language === 'es'
                      ? 'Traslados compartidos y confortables con recogida directa en la recepción de tu hotel entre Arenal, Monteverde, Manuel Antonio, Tamarindo, Papagayo y Aeropuerto SJO. Vans modernas con A/C y WiFi.'
                      : 'Shared door-to-door transfers picking you up at your hotel lobby connecting San José Airport, Arenal, Monteverde, Manuel Antonio, Tamarindo, and Guanacaste.'}
                  </p>

                  <div className="bg-[#071A0F] p-3.5 rounded-2xl border border-emerald-900/80 text-xs space-y-1.5 text-emerald-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{language === 'es' ? 'Salidas diarias: 8:00 AM y 2:00 PM' : 'Daily Departures: 8:00 AM & 2:00 PM'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{language === 'es' ? 'Tarifa Oficial: $54 - $65 USD / persona' : 'Official Rate: $54 - $65 USD / person'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-emerald-800/60">
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
              <div id="card-shuttle-caribe" className="bg-[#0E351F]/90 rounded-3xl p-6 border border-emerald-500/30 shadow-xl flex flex-col justify-between hover:border-emerald-400 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-black uppercase px-3 py-1 rounded-full">
                      {language === 'es' ? 'Caribe & Costas' : 'Caribbean & Coasts'}
                    </span>
                    <span className="text-amber-300 text-xs font-bold">★ Conexión Playas & Lanchas</span>
                  </div>

                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    🚌 Shuttle Expreso Caribe Sur
                  </h3>

                  <p className="text-xs text-emerald-100 leading-relaxed">
                    {language === 'es'
                      ? 'Conexiones directas y confortables entre San José, Arenal y Tortuguero hacia Puerto Viejo de Talamanca, Cahuita, Manzanillo y cruce fronterizo.'
                      : 'Direct comfortable tourist routes linking San José and Arenal with Puerto Viejo, Cahuita, Manzanillo, and Caribbean ports.'}
                  </p>

                  <div className="bg-[#071A0F] p-3.5 rounded-2xl border border-emerald-900/80 text-xs space-y-1.5 text-emerald-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{language === 'es' ? 'Conexiones directas a playa & muelles' : 'Direct beach & boat connections'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{language === 'es' ? 'Tarifa Oficial: $58 - $70 USD / persona' : 'Official Rate: $58 - $70 USD / person'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-emerald-800/60">
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
              <div id="card-shuttle-private" className="bg-[#0E351F]/90 rounded-3xl p-6 border border-emerald-500/30 shadow-xl flex flex-col justify-between hover:border-emerald-400 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-black uppercase px-3 py-1 rounded-full">
                      {language === 'es' ? 'Privado & Familias' : 'Private & Families'}
                    </span>
                    <span className="text-amber-300 text-xs font-bold">★ Servicio VIP Puerta a Puerta</span>
                  </div>

                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    🚐 Traslados Privados Exclusivos
                  </h3>

                  <p className="text-xs text-emerald-100 leading-relaxed">
                    {language === 'es'
                      ? 'Vans ejecutivas exclusivas para familias y grupos pequeños con paradas libres para fotos y comida en ruta. Horario 100% flexible a tu conveniencia.'
                      : 'Exclusive executive vans for families and groups with custom departure times and scenic photo/meal stops along the route.'}
                  </p>

                  <div className="bg-[#071A0F] p-3.5 rounded-2xl border border-emerald-900/80 text-xs space-y-1.5 text-emerald-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{language === 'es' ? 'Salida a la hora que tú elijas' : 'Custom departure time anytime'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{language === 'es' ? 'Capacidad: 1 a 12 pasajeros' : 'Capacity: 1 to 12 passengers'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-emerald-800/60">
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
              <div className="bg-[#0E351F]/90 rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-xl flex flex-col justify-between hover:border-emerald-400 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-black uppercase px-3 py-1 rounded-full">
                      {language === 'es' ? 'Flota Todo Terreno' : 'All-Terrain 4WD Fleet'}
                    </span>
                    <span className="text-emerald-300 text-xs font-bold">★ Cobertura Total Disponible</span>
                  </div>

                  <h3 className="text-2xl font-black text-white flex items-center gap-2">
                    🚙 Alquiler de Vehículos 4x4 & SUVs
                  </h3>

                  <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                    {language === 'es'
                      ? 'Flota moderna de vehículos 4x4 (Suzuki Jimny, Vitara, Hyundai Tucson, Prado) con excelentes coberturas y entrega directa en Aeropuertos SJO y LIR o en tu hotel en cualquier parte del país.'
                      : 'Modern 4WD SUV fleet (Suzuki Jimny, Vitara, Tucson, Prado) with comprehensive zero-deductible insurance and airport pickup at SJO/LIR or direct hotel delivery.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-200">
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-emerald-900/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'es' ? 'Cobertura Total Cero Deducible' : 'Zero Deductible Option'}</span>
                    </div>
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-emerald-900/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'es' ? 'GPS & WiFi portátil' : 'GPS & WiFi Hotspot'}</span>
                    </div>
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-emerald-900/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'es' ? 'Conductor adicional gratis' : 'Free additional driver'}</span>
                    </div>
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-emerald-900/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'es' ? 'Asistencia en carretera 24/7' : '24/7 Roadside Assistance'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-emerald-800/60 flex flex-col sm:flex-row gap-3">
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
              <div className="bg-[#0E351F]/90 rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-xl flex flex-col justify-between hover:border-emerald-400 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-black uppercase px-3 py-1 rounded-full">
                      {language === 'es' ? 'Flota Automática & Premium' : 'Automatic & Premium Fleet'}
                    </span>
                    <span className="text-amber-300 text-xs font-bold">★ Entrega Express Aeropuerto</span>
                  </div>

                  <h3 className="text-2xl font-black text-white flex items-center gap-2">
                    🚗 Renta de SUVs & Sedanes Automáticos
                  </h3>

                  <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                    {language === 'es'
                      ? 'Flota de última generación con vehículos automáticos y manuales de alta gama. Ideal para turistas que buscan máximo confort, kilometraje ilimitado y entrega inmediata en el aeropuerto.'
                      : 'Premium vehicle fleet featuring modern automatic and manual SUVs. Perfect for travelers seeking effortless airport car pickups, high comfort, and unlimited mileage.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-200">
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-emerald-900/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'es' ? 'Pick-up en Aeropuerto SJO/LIR' : 'Airport SJO/LIR Pick-up'}</span>
                    </div>
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-emerald-900/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'es' ? 'Transmisión Automática' : 'Automatic Transmission'}</span>
                    </div>
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-emerald-900/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'es' ? 'Sillas de bebé disponibles' : 'Child safety seats'}</span>
                    </div>
                    <div className="bg-[#071A0F] p-3 rounded-xl border border-emerald-900/60 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'es' ? 'Kilometraje Ilimitado' : 'Unlimited Mileage'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-emerald-800/60 flex flex-col sm:flex-row gap-3">
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
            <div className="bg-[#0E351F]/90 rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-xl">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-emerald-800/60">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-black uppercase">
                    <Plane className="w-3.5 h-3.5" />
                    <span>{language === 'es' ? 'Conexiones Aéreas en Costa Rica' : 'Costa Rica Domestic Flight Connections'}</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    ✈️ Vuelos Domésticos & Avionetas Escénicas
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
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
                <div className="bg-[#071A0F] p-4 rounded-2xl border border-emerald-900/60 text-center">
                  <span className="text-[10px] text-amber-400 font-bold block uppercase">SJO ⇄ Quepos</span>
                  <strong className="text-white text-sm block mt-1">Manuel Antonio</strong>
                  <span className="text-[11px] text-emerald-300 block mt-1">⏱ 25 min vuelo</span>
                </div>
                <div className="bg-[#071A0F] p-4 rounded-2xl border border-emerald-900/60 text-center">
                  <span className="text-[10px] text-amber-400 font-bold block uppercase">SJO ⇄ La Fortuna</span>
                  <strong className="text-white text-sm block mt-1">Volcán Arenal</strong>
                  <span className="text-[11px] text-emerald-300 block mt-1">⏱ 30 min vuelo</span>
                </div>
                <div className="bg-[#071A0F] p-4 rounded-2xl border border-emerald-900/60 text-center">
                  <span className="text-[10px] text-amber-400 font-bold block uppercase">SJO ⇄ Tamarindo</span>
                  <strong className="text-white text-sm block mt-1">Guanacaste</strong>
                  <span className="text-[11px] text-emerald-300 block mt-1">⏱ 45 min vuelo</span>
                </div>
                <div className="bg-[#071A0F] p-4 rounded-2xl border border-emerald-900/60 text-center">
                  <span className="text-[10px] text-amber-400 font-bold block uppercase">SJO ⇄ Bahía Drake</span>
                  <strong className="text-white text-sm block mt-1">Corcovado / Osa</strong>
                  <span className="text-[11px] text-emerald-300 block mt-1">⏱ 45 min vuelo</span>
                </div>
                <div className="bg-[#071A0F] p-4 rounded-2xl border border-emerald-900/60 text-center">
                  <span className="text-[10px] text-amber-400 font-bold block uppercase">SJO ⇄ Pto. Jiménez</span>
                  <strong className="text-white text-sm block mt-1">Golfo Dulce</strong>
                  <span className="text-[11px] text-emerald-300 block mt-1">⏱ 50 min vuelo</span>
                </div>
                <div className="bg-[#071A0F] p-4 rounded-2xl border border-emerald-900/60 text-center">
                  <span className="text-[10px] text-amber-400 font-bold block uppercase">SJO ⇄ Tortuguero</span>
                  <strong className="text-white text-sm block mt-1">Caribe Norte</strong>
                  <span className="text-[11px] text-emerald-300 block mt-1">⏱ 35 min vuelo</span>
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
              <div id="card-bus-musoc" className="bg-[#0E351F] rounded-3xl p-6 border border-emerald-500/30 shadow-lg flex flex-col justify-between hover:border-emerald-400 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold text-xs uppercase tracking-wider">Pacífico & Sur</span>
                    <Bus className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-black text-white">MUSOC</h3>
                  <p className="text-xs text-emerald-100">
                    {language === 'es' 
                      ? 'Rutas principales desde San José hacia Pérez Zeledón, San Isidro y el Pacífico Sur.'
                      : 'Main routes connecting San José with Pérez Zeledón & South Pacific.'}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-emerald-800/60">
                  <a
                    href="https://www.musoc.co.cr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>{language === 'es' ? 'Ver Horarios y Sitio Oficial' : 'Official Schedules & Website'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* TRACOPA */}
              <div id="card-bus-tracopa" className="bg-[#0E351F] rounded-3xl p-6 border border-emerald-500/30 shadow-lg flex flex-col justify-between hover:border-emerald-400 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold text-xs uppercase tracking-wider">Manuel Antonio & Sur</span>
                    <Bus className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-black text-white">TRACOPA</h3>
                  <p className="text-xs text-emerald-100">
                    {language === 'es' 
                      ? 'Rutas directas a Quepos, Manuel Antonio, Uvita, Golfito, Puerto Jiménez y Paso Canoas.'
                      : 'Direct buses to Manuel Antonio, Quepos, Uvita, Golfito, and Panama border.'}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-emerald-800/60">
                  <a
                    href="https://www.tracopa.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>{language === 'es' ? 'Ver Horarios y Sitio Oficial' : 'Official Schedules & Website'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* GAFESO / San José-La Fortuna */}
              <div id="card-bus-gafeso" className="bg-[#0E351F] rounded-3xl p-6 border border-emerald-500/30 shadow-lg flex flex-col justify-between hover:border-emerald-400 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold text-xs uppercase tracking-wider">Arenal & Zona Norte</span>
                    <Bus className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-black text-white">GAFESO / San Carlos</h3>
                  <p className="text-xs text-emerald-100">
                    {language === 'es' 
                      ? 'Rutas hacia San Carlos, Ciudad Quesada y conexiones al Volcán Arenal / La Fortuna.'
                      : 'Buses to San Carlos, Ciudad Quesada, and Arenal Volcano connections.'}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-emerald-800/60">
                  <a
                    href="https://www.gafeso.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>{language === 'es' ? 'Ver Horarios y Sitio Oficial' : 'Official Schedules & Website'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* MEPE */}
              <div id="card-bus-mepe" className="bg-[#0E351F] rounded-3xl p-6 border border-emerald-500/30 shadow-lg flex flex-col justify-between hover:border-emerald-400 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold text-xs uppercase tracking-wider">Caribe Sur</span>
                    <Bus className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-black text-white">AUTOTRANSPORTES MEPE</h3>
                  <p className="text-xs text-emerald-100">
                    {language === 'es' 
                      ? 'Rutas principales a Cahuita, Puerto Viejo, Manzanillo, Bribri y Limón.'
                      : 'Main routes to Cahuita, Puerto Viejo, Manzanillo, Bribri, and Limón.'}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-emerald-800/60">
                  <a
                    href="https://www.mepe.cr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>{language === 'es' ? 'Ver Horarios y Sitio Oficial' : 'Official Schedules & Website'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>

            {/* Complete Bus Directory Modal Launcher Banner */}
            <div className="bg-gradient-to-r from-emerald-900 to-[#071A0F] p-6 rounded-3xl border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-lg font-black text-white">
                  {language === 'es' ? '¿Buscas terminales en San José, tarifas exactas o consejos de seguridad?' : 'Looking for San José terminals, exact fares or bus safety tips?'}
                </h4>
                <p className="text-xs text-emerald-200">
                  {language === 'es' ? 'Abre el directorio completo de buses locales de Costa Rica con más de 10 rutas nacionales detalladas.' : 'Open the complete local bus directory with over 10 detailed national routes.'}
                </p>
              </div>

              <button
                onClick={onOpenLocalBuses}
                className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs uppercase px-6 py-3.5 rounded-2xl transition-all flex items-center gap-2 shadow-lg cursor-pointer whitespace-nowrap hover:scale-105"
              >
                <Bus className="w-4 h-4" />
                <span>{language === 'es' ? 'Abrir Directorio de Buses' : 'Open Bus Directory'}</span>
              </button>
            </div>

            {/* Legal Notice Warning Box */}
            <div className="bg-amber-950/40 p-4 rounded-2xl border border-amber-500/40 text-xs text-amber-200 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-amber-300 uppercase mb-0.5">
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
        <div className="mt-16 bg-[#071A0F]/80 p-6 sm:p-8 rounded-3xl border border-emerald-500/30">
          <h3 className="text-2xl font-black text-white text-center mb-8 uppercase tracking-wider">
            {language === 'es' ? 'Preguntas Frecuentes de Movilidad' : 'Mobility & Transport FAQ'}
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#0E351F]/60 p-5 rounded-2xl border border-emerald-800/50">
              <h4 className="text-emerald-300 font-bold mb-2 flex items-center gap-2 text-sm uppercase">
                <Clock className="w-4 h-4 text-amber-300" />
                {language === 'es' ? '¿Son puntuales los traslados?' : 'Are schedules accurate?'}
              </h4>
              <p className="text-emerald-100 text-xs leading-relaxed">
                {language === 'es' 
                  ? 'Los traslados turísticos y vuelos domésticos coordinados por nuestra agencia son sumamente puntuales. Para buses públicos, recomendamos presentarse con 30 minutos de antelación.' 
                  : 'Tourist shuttles and domestic flights arranged by our agency operate strictly on schedule. For public buses, we recommend arriving 30 minutes before departure.'}
              </p>
            </div>
            
            <div className="bg-[#0E351F]/60 p-5 rounded-2xl border border-emerald-800/50">
              <h4 className="text-emerald-300 font-bold mb-2 flex items-center gap-2 text-sm uppercase">
                <Car className="w-4 h-4 text-amber-300" />
                {language === 'es' ? '¿Se necesita auto 4x4?' : 'Is a 4x4 vehicle needed?'}
              </h4>
              <p className="text-emerald-100 text-xs leading-relaxed">
                {language === 'es' 
                  ? 'Para Monteverde, Península de Osa y playas remotas, un 4x4 o SUV alto es altamente recomendado debido a la topografía de montaña y tramos de lastre.' 
                  : 'For Monteverde, Osa Peninsula, and secluded beaches, a 4WD or high-clearance SUV is strongly recommended due to mountain terrain.'}
              </p>
            </div>

            <div className="bg-[#0E351F]/60 p-5 rounded-2xl border border-emerald-800/50">
              <h4 className="text-emerald-300 font-bold mb-2 flex items-center gap-2 text-sm uppercase">
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                {language === 'es' ? '¿Cómo se garantiza la reserva?' : 'How is booking guaranteed?'}
              </h4>
              <p className="text-emerald-100 text-xs leading-relaxed">
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

