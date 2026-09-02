import React, { useState } from 'react';
import { 
  Sun, CloudRain, Calendar, DollarSign, Calculator, ShieldCheck, 
  MapPin, PhoneCall, Info, Sparkles, Check, ChevronRight, Compass,
  Globe, AlertCircle, Eye, Bus, Trees, Luggage, HeartPulse, Car, 
  Wifi, CheckSquare, Square, RefreshCw, Zap, ShieldAlert, Award
} from 'lucide-react';
import { Language, Currency } from '../types';
import { formatCurrency } from '../utils/i18n';

interface TravelerToolkitProps {
  language: Language;
  currency: Currency;
  onOpenTripBuilder?: () => void;
  onOpenLocalBuses?: () => void;
}

interface PackingItem {
  id: string;
  category: 'clothing' | 'gear' | 'health' | 'tech';
  nameEs: string;
  nameEn: string;
  descEs: string;
  descEn: string;
  essential: boolean;
}

const PACKING_ITEMS: PackingItem[] = [
  {
    id: 'rain-jacket',
    category: 'clothing',
    nameEs: 'Chaqueta impermeable / Poncho ligero',
    nameEn: 'Lightweight rain jacket / poncho',
    descEs: 'Imprescindible para el bosque nuboso de Monteverde y paseos por la tarde.',
    descEn: 'Crucial for Monteverde cloud forests and afternoon showers.',
    essential: true
  },
  {
    id: 'hiking-shoes',
    category: 'clothing',
    nameEs: 'Calzado de senderismo con buen agarre',
    nameEn: 'Trail / hiking shoes with traction',
    descEs: 'Evita resbalones en senderos de barro en Volcán Arenal, Río Celeste y Manuel Antonio.',
    descEn: 'Prevents slipping on muddy trails in Arenal, Rio Celeste & Manuel Antonio.',
    essential: true
  },
  {
    id: 'water-shoes',
    category: 'clothing',
    nameEs: 'Sandalias de río o calzado acuático (Keen/Teva)',
    nameEn: 'Water shoes or strap sandals (Keen/Teva)',
    descEs: 'Perfecto para rafting en Río Pacuare, cascadas y cruce de ríos.',
    descEn: 'Perfect for Pacuare rafting, waterfalls, and river crossings.',
    essential: false
  },
  {
    id: 'dry-bag',
    category: 'gear',
    nameEs: 'Bolsa seca impermeable (Dry Bag 10L - 20L)',
    nameEn: 'Waterproof Dry Bag (10L - 20L)',
    descEs: 'Protege cámaras, celulares y pasaportes en botes a Tortuguero o rafting.',
    descEn: 'Protects cameras, phones & passports during boat rides or rafting.',
    essential: true
  },
  {
    id: 'water-bottle',
    category: 'gear',
    nameEs: 'Botella reutilizable de agua / Termo',
    nameEn: 'Reusable water bottle / Thermos',
    descEs: 'Los Parques Nacionales prohíben plásticos de un solo uso. El agua de grifo es 100% potable.',
    descEn: 'National Parks ban single-use plastics. Tap water is 100% potable nationwide.',
    essential: true
  },
  {
    id: 'reef-sunscreen',
    category: 'health',
    nameEs: 'Bloqueador solar biodegradable (Reef-Safe)',
    nameEn: 'Biodegradable Reef-Safe Sunscreen (SPF 50+)',
    descEs: 'El sol en el trópico es muy intenso. Protege tu piel sin dañar los arrecifes de coral.',
    descEn: 'Tropical UV index is high. Protect your skin while preserving coral reefs.',
    essential: true
  },
  {
    id: 'insect-repellent',
    category: 'health',
    nameEs: 'Repelente de insectos (DEET / Picaridina)',
    nameEn: 'Insect repellent (DEET / Picaridin)',
    descEs: 'Recomendado para caminatas en selva tropical y zonas costeras al atardecer.',
    descEn: 'Recommended for rainforest walks and coastal areas during twilight.',
    essential: true
  },
  {
    id: 'power-plug',
    category: 'tech',
    nameEs: 'Adaptador de corriente (Enchufes Tipo A/B 110V)',
    nameEn: 'Power adapter (US Standard Type A/B 110V)',
    descEs: 'Mismo estándar que EE.UU. y Canadá. Turistas europeos necesitan adaptador de clavija plana.',
    descEn: 'Same 110-120V standard as USA/Canada. European visitors need flat-pin adapters.',
    essential: true
  },
  {
    id: 'binocs-camera',
    category: 'tech',
    nameEs: 'Binoculares o cámara con zoom óptico',
    nameEn: 'Compact binoculars or zoom camera',
    descEs: 'Para avistar tucanes, perezosos, quetzales y monos en lo alto del dosel de la selva.',
    descEn: 'Spot toucans, sloths, quetzals, and howler monkeys high up in the forest canopy.',
    essential: false
  }
];

export const TravelerToolkit: React.FC<TravelerToolkitProps> = ({
  language,
  currency,
  onOpenTripBuilder,
  onOpenLocalBuses,
}) => {
  const [calcUsd, setCalcUsd] = useState<number>(50);
  const [activeTab, setActiveTab] = useState<'transport' | 'national_parks' | 'packing' | 'safety_health' | 'seasons' | 'driving_sim' | 'currency' | 'entry'>('transport');
  
  // Packing checklist state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    'rain-jacket': true,
    'water-bottle': true,
    'reef-sunscreen': true
  });

  const togglePackingItem = (id: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const exchangeRate = 510; // 1 USD = 510 CRC
  const calcCrc = calcUsd * exchangeRate;
  const isEs = language === 'es';

  return (
    <section className="py-16 bg-gradient-to-b from-neutral-50 via-emerald-50/20 to-white border-y border-neutral-100" id="traveler-toolkit">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="bg-stone-100 text-stone-800 text-[11px] font-black uppercase px-3.5 py-1 rounded-full border border-stone-200 inline-flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            {isEs ? 'Guía Oficial & Herramientas del Viajero' : 'Official Costa Rica Traveler Toolkit'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-stone-950 uppercase tracking-tight">
            {isEs ? 'Todo lo que Necesitas Saber para Tu Viaje' : 'Everything You Need Before Landing'}
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
            {isEs
              ? 'Información verificada para turistas: transporte, reservas de parques nacionales SINAC, lista de empaque, seguridad, agua potable y moneda.'
              : 'Verified tourist handbook: transport, SINAC national park passes, packing checklist, 911 safety, tap water & currency tips.'}
          </p>
        </div>

        {/* Toolkit Navigation Tabs */}
        <div className="flex justify-center border-b border-neutral-200 pb-4 overflow-x-auto modal-scrollable">
          <div className="flex flex-wrap justify-center items-center gap-2 bg-neutral-100 p-1.5 rounded-3xl border border-neutral-200 max-w-full">
            
            <button
              onClick={() => setActiveTab('transport')}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'transport'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              <Bus className="w-4 h-4" />
              <span>{isEs ? 'Transporte & Shuttles' : 'Transport & Shuttles'}</span>
            </button>

            <button
              onClick={() => setActiveTab('national_parks')}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'national_parks'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              <Trees className="w-4 h-4" />
              <span>{isEs ? 'Parques SINAC' : 'National Parks'}</span>
            </button>

            <button
              onClick={() => setActiveTab('packing')}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'packing'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              <Luggage className="w-4 h-4" />
              <span>{isEs ? 'Checklist de Empaque' : 'Packing Checklist'}</span>
            </button>

            <button
              onClick={() => setActiveTab('safety_health')}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'safety_health'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>{isEs ? 'Salud & 9-1-1' : 'Health & Safety'}</span>
            </button>
            
            <button
              onClick={() => setActiveTab('seasons')}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'seasons'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{isEs ? 'Temporadas & Fauna' : 'Seasons & Wildlife'}</span>
            </button>

            <button
              onClick={() => setActiveTab('driving_sim')}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'driving_sim'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>{isEs ? 'Conducir & eSIM' : 'Driving & eSIM'}</span>
            </button>

            <button
              onClick={() => setActiveTab('currency')}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'currency'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>{isEs ? 'Moneda & Propinas' : 'Currency & Tipping'}</span>
            </button>

            <button
              onClick={() => setActiveTab('entry')}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'entry'
                  ? 'bg-[#1E7B4A] text-white shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isEs ? 'Requisitos de Entrada' : 'Entry Requirements'}</span>
            </button>

            {onOpenLocalBuses && (
              <button
                onClick={onOpenLocalBuses}
                className="px-3.5 py-2 rounded-full text-xs font-extrabold bg-[#E67E22] hover:bg-[#d67118] text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
              >
                <Bus className="w-4 h-4" />
                <span>{isEs ? '🚌 Buses Locales' : '🚌 Bus Directory'}</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 0: Transport & Logistics */}
        {activeTab === 'transport' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 flex flex-col items-center text-center space-y-4 hover:shadow-lg transition-all group">
              <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Bus className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                {isEs ? 'Shuttles Privados Puerta a Puerta' : 'Private Door-to-Door Shuttles'}
              </h3>
              <p className="text-sm text-neutral-600 flex-1">
                {isEs 
                  ? 'Viaja cómodo desde los aeropuertos (SJO San José o LIR Guanacaste) directo a tu hotel. Ideal para familias o grupos, con aire acondicionado, WiFi y chofer bilingüe certificado.' 
                  : 'Travel comfortably from airports (SJO or Liberia) directly to your hotel. Ideal for families or groups, with AC, WiFi, and bilingual drivers.'}
              </p>
              <button 
                onClick={onOpenTripBuilder}
                className="w-full mt-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-md hover:shadow-lg">
                {isEs ? 'Cotizar Shuttle Privado' : 'Quote Private Shuttle'}
              </button>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 flex flex-col items-center text-center space-y-4 hover:shadow-lg transition-all group">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <MapPin className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                {isEs ? 'Shuttles Compartidos Hotel-a-Hotel' : 'Shared Shuttles (Hotel-to-Hotel)'}
              </h3>
              <p className="text-sm text-neutral-600 flex-1">
                {isEs 
                  ? 'Conecta los principales destinos (La Fortuna / Arenal, Manuel Antonio, Monteverde, Tamarindo, Puerto Viejo) de forma económica, segura y puntual.' 
                  : 'Connect major destinations (La Fortuna, Manuel Antonio, Monteverde, Tamarindo, Puerto Viejo) economically and safely.'}
              </p>
              <button 
                onClick={onOpenTripBuilder}
                className="w-full mt-4 py-3 bg-white border-2 border-orange-500 text-amber-600 hover:bg-amber-50 rounded-xl font-bold text-sm transition-colors cursor-pointer">
                {isEs ? 'Ver Rutas Compartidas' : 'View Shared Routes'}
              </button>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 flex flex-col items-center text-center space-y-4 hover:shadow-lg transition-all group">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Compass className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                {isEs ? 'Alquiler 4x4 / Buses Públicos' : '4x4 Car Rental / Public Buses'}
              </h3>
              <p className="text-sm text-neutral-600 flex-1">
                {isEs 
                  ? '¿Prefieres explorar por tu cuenta? Te asesoramos con alquiler de vehículos 4x4 con seguro total o te brindamos el directorio oficial de buses públicos.' 
                  : 'Prefer to explore on your own? We assist with 4x4 rentals with zero-deductible insurance or provide the official public bus guide.'}
              </p>
              <div className="w-full flex gap-2 mt-4">
                <button 
                  onClick={onOpenTripBuilder}
                  className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold text-sm transition-colors cursor-pointer">
                  {isEs ? 'Rent a Car' : 'Rent a Car'}
                </button>
                {onOpenLocalBuses && (
                  <button 
                    onClick={onOpenLocalBuses}
                    className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold text-sm transition-colors cursor-pointer">
                    {isEs ? 'Buses' : 'Buses'}
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 1: National Parks & SINAC Regulations */}
        {activeTab === 'national_parks' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                  <Trees className="w-4 h-4" />
                  {isEs ? 'Sistema Nacional de Áreas de Conservación (SINAC)' : 'National System of Conservation Areas (SINAC)'}
                </span>
                <h3 className="text-2xl font-black text-stone-950">
                  {isEs ? 'Guía Oficial para Ingresar a Parques Nacionales' : 'Official Guidelines for National Parks Entry'}
                </h3>
              </div>
              <a
                href="https://serviciosenlinea.sinac.go.cr/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-black px-4 py-2.5 rounded-full shadow transition-colors cursor-pointer"
              >
                <span>{isEs ? 'Portal Oficial SINAC' : 'Official SINAC Portal'}</span>
                <Globe className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-stone-50/70 p-5 rounded-2xl border border-stone-200 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-stone-200 text-stone-900 flex items-center justify-center font-black">
                  🎫
                </div>
                <h4 className="font-bold text-base text-stone-950">
                  {isEs ? '1. Reserva Obligatoria Anticipada' : '1. Advance Online Booking Required'}
                </h4>
                <p className="text-xs text-stone-800 leading-relaxed">
                  {isEs
                    ? 'Parques como Manuel Antonio, Volcán Poás, Volcán Irazú y Chirripó NO venden entradas en taquilla. Debes adquirir tu boleto con franja horaria en línea antes de llegar.'
                    : 'Parks like Manuel Antonio, Poas Volcano, and Irazu Volcano DO NOT sell tickets at physical counters. You must purchase advance time-slotted e-tickets online.'}
                </p>
                <div className="text-[11px] font-bold text-stone-900 bg-white/80 p-2 rounded-lg border border-teal-300">
                  💡 {isEs ? 'Todos nuestros tours incluyen entradas ya garantizadas.' : 'All our guided tours include pre-reserved entrance tickets.'}
                </div>
              </div>

              <div className="bg-amber-50/70 p-5 rounded-2xl border border-orange-200 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-orange-200 text-amber-900 flex items-center justify-center font-black">
                  🚫
                </div>
                <h4 className="font-bold text-base text-amber-950">
                  {isEs ? '2. Cero Plásticos de Un Solo Uso' : '2. Strict Single-Use Plastics Ban'}
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {isEs
                    ? 'Por ley ambiental, está estrictamente prohibido ingresar botellas plásticas desechables, pajillas o bolsas plásticas. Lleva tu termo o botella reutilizable para rellenar.'
                    : 'By national environmental law, disposable plastic water bottles, straws, and bags are prohibited. Bring a reusable water bottle to refill.'}
                </p>
                <div className="text-[11px] font-bold text-amber-900 bg-white/80 p-2 rounded-lg border border-orange-300">
                  💧 {isEs ? 'Los parques cuentan con estaciones de agua potable.' : 'Parks have free fresh drinking water refill stations.'}
                </div>
              </div>

              <div className="bg-teal-50/70 p-5 rounded-2xl border border-teal-200 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-200 text-teal-900 flex items-center justify-center font-black">
                  🦥
                </div>
                <h4 className="font-bold text-base text-teal-950">
                  {isEs ? '3. Respeto a la Vida Silvestre' : '3. Wildlife Ethics & Safety'}
                </h4>
                <p className="text-xs text-teal-800 leading-relaxed">
                  {isEs
                    ? 'Está prohibido alimentar, tocar o usar flashes con animales. Mantén una distancia prudente. La campaña oficial "#StopAnimalSelfies" protege nuestra biodiversidad.'
                    : 'Feeding, touching, or flash-photographing animals is illegal. Keep respectful distance. Costa Rica leads the "#StopAnimalSelfies" conservation movement.'}
                </p>
                <div className="text-[11px] font-bold text-teal-900 bg-white/80 p-2 rounded-lg border border-teal-300">
                  📸 {isEs ? 'Usa zoom óptico en lugar de acercarte.' : 'Use optical camera zoom instead of approaching.'}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: Interactive Packing Checklist */}
        {activeTab === 'packing' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <h3 className="font-black text-xl text-neutral-900 flex items-center gap-2">
                  <Luggage className="w-5 h-5 text-teal-700" />
                  {isEs ? 'Checklist Interactivo de Equipaje para Costa Rica' : 'Interactive Costa Rica Packing Checklist'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {isEs
                    ? 'Haz clic en los elementos para ir marcando lo que ya empacaste en tu maleta.'
                    : 'Click on items to check off what you have packed into your luggage.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-800 bg-stone-100 px-3 py-1 rounded-full">
                  {Object.values(checkedItems).filter(Boolean).length} / {PACKING_ITEMS.length} {isEs ? 'Listos' : 'Packed'}
                </span>
                <button
                  onClick={() => setCheckedItems({})}
                  className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1 font-bold p-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Reiniciar' : 'Reset'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PACKING_ITEMS.map((item) => {
                const isChecked = !!checkedItems[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => togglePackingItem(item.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isChecked
                        ? 'bg-stone-50/80 border-teal-300 text-stone-950 shadow-sm'
                        : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-800'
                    }`}
                  >
                    <div className="mt-0.5 text-teal-600">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-teal-600 fill-emerald-100" />
                      ) : (
                        <Square className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs ${isChecked ? 'line-through text-stone-900/70' : 'text-neutral-900'}`}>
                          {isEs ? item.nameEs : item.nameEn}
                        </span>
                        {item.essential && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                            {isEs ? 'Esencial' : 'Essential'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 leading-tight">
                        {isEs ? item.descEs : item.descEn}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Health, Safety & 9-1-1 */}
        {activeTab === 'safety_health' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-black text-xl text-neutral-900 flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-teal-600" />
                    {isEs ? 'Salud, Agua Potable & Hospitales' : 'Health, Tap Water & Medical Care'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {isEs ? 'Costa Rica tiene los estándares de salud más altos de Centroamérica.' : 'Costa Rica boasts the highest healthcare and sanitation standards in Central America.'}
                  </p>
                </div>

                <div className="space-y-3 text-xs text-neutral-700">
                  <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                    <strong className="block text-stone-950 font-bold text-sm mb-1">
                      🚰 {isEs ? 'Agua 100% Potable del Grifo' : '100% Potable Tap Water'}
                    </strong>
                    <p className="text-stone-800 leading-relaxed">
                      {isEs
                        ? 'En el 95% del territorio nacional (San José, Arenal, Monteverde, Manuel Antonio, Guanacaste), el agua de grifo es totalmente segura para beber. En islas muy remotas se recomienda agua embotellada o filtrada.'
                        : 'Tap water is clean and safe to drink in 95% of Costa Rica (San Jose, Arenal, Monteverde, Manuel Antonio, Guanacaste). Reusable bottles are recommended.'}
                    </p>
                  </div>

                  <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200">
                    <strong className="block text-neutral-900 font-bold mb-1">
                      💉 {isEs ? 'Vacunas Requeridas' : 'Vaccines & Health Requirements'}
                    </strong>
                    <p className="text-neutral-600 leading-relaxed">
                      {isEs
                        ? 'No se requieren vacunas obligatorias para viajeros de Norteamérica o Europa. La vacuna de Fiebre Amarilla solo es obligatoria si provienes de países endémicos (ciertas zonas de Sudamérica y África subsahariana).'
                        : 'No mandatory vaccines for travelers from North America or Europe. Yellow Fever vaccine certificate is only required if arriving from endemic regions in South America or Africa.'}
                    </p>
                  </div>

                  <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200">
                    <strong className="block text-neutral-900 font-bold mb-1">
                      🏥 {isEs ? 'Hospitales Privados con Acreditación JCI' : 'Top International Hospitals'}
                    </strong>
                    <p className="text-neutral-600 leading-relaxed">
                      {isEs
                        ? 'San José cuenta con hospitales certificados internacionalmente: Hospital CIMA, Clínica Bíblica y Hospital Metropolitano con médicos bilingües y farmacias 24/7.'
                        : 'San Jose features world-class JCI-accredited facilities: CIMA Hospital, Clinica Biblica & Metropolitan Hospital with fluent English-speaking staff.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Safety & 911 Assistance */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-black text-xl text-neutral-900 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                    {isEs ? 'Seguridad & Números de Emergencia' : 'Safety & Emergency Contacts'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {isEs ? 'Líneas directas de respuesta inmediata en Costa Rica.' : 'Immediate direct response hotlines across Costa Rica.'}
                  </p>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-orange-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                        {isEs ? 'Emergencias Nacionales 24/7' : '24/7 National Emergency Hotline'}
                      </span>
                      <span className="text-2xl font-black text-amber-950 font-mono">🚨 9-1-1</span>
                    </div>
                    <span className="text-xs font-bold text-amber-900 bg-orange-200/80 px-2.5 py-1 rounded-full">
                      {isEs ? 'Bilingüe Español/Inglés' : 'Bilingual Support'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    {isEs
                      ? 'Centraliza Policía Turística, Cruz Roja, Bomberos y Guardacostas. Funciona desde cualquier teléfono móvil aún sin saldo o chip.'
                      : 'Centralizes Tourist Police, Red Cross Paramedics, Fire Dept & Coast Guard. Works on any mobile phone even without roaming/SIM.'}
                  </p>
                </div>

                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 text-xs text-neutral-700 space-y-2">
                  <strong className="block text-neutral-900 font-bold">
                    🌊 {isEs ? 'Consejos en Playas (Corrientes de Resaca)' : 'Beach Safety (Rip Currents)'}
                  </strong>
                  <p className="text-neutral-600 leading-relaxed">
                    {isEs
                      ? 'Si eres atrapado por una corriente de resaca, nunca nades contra ella hacia la orilla. Nada en paralelo a la playa con calma hasta salir de la corriente y luego regresa.'
                      : 'If caught in a rip current, never fight it head-on. Swim calmly parallel to the beach until you escape the current channel, then head toward shore.'}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: Seasons & Wildlife */}
        {activeTab === 'seasons' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            
            {/* Dry Season */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-4 hover:border-orange-500 transition-colors">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-black">
                <Sun className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-neutral-900">
                {isEs ? 'Temporada Seca (Diciembre - Abril)' : 'Dry Season (Dec - Apr)'}
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {isEs
                  ? 'Días soleados continuos, ideal para playas de Guanacaste, Manuel Antonio y senderismo alrededor del Volcán Arenal.'
                  : 'Sunny clear days, best for Guanacaste beaches, Manuel Antonio NP & Arenal Volcano hiking.'}
              </p>
              <div className="bg-amber-50 p-3 rounded-2xl border border-orange-200 text-amber-900 text-xs font-semibold">
                ✨ {isEs ? 'Tip: Reservar con anticipación por alta demanda.' : 'Tip: Book early as this is peak travel season.'}
              </div>
            </div>

            {/* Green Season */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-4 hover:border-orange-500 transition-colors">
              <div className="w-12 h-12 bg-stone-100 text-teal-600 rounded-2xl flex items-center justify-center font-black">
                <CloudRain className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-neutral-900">
                {isEs ? 'Temporada Verde (Mayo - Noviembre)' : 'Green Season (May - Nov)'}
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {isEs
                  ? 'Lluvias tropicales por las tardes, vegetación exuberante, cascadas caudalosas y tarifas con descuentos especiales.'
                  : 'Tropical afternoon showers, lush rainforests, roaring waterfalls, and discounted rates.'}
              </p>
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-stone-900 text-xs font-semibold">
                🌿 {isEs ? 'Tip: Las mañanas suelen ser despejadas y luminosas.' : 'Tip: Mornings are usually sunny and clear.'}
              </div>
            </div>

            {/* Wildlife Calendar */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-4 hover:border-orange-500 transition-colors">
              <div className="w-12 h-12 bg-stone-100 text-teal-600 rounded-2xl flex items-center justify-center font-black">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-neutral-900">
                {isEs ? 'Radar de Fauna Silvestre' : 'Wildlife Calendar Highlights'}
              </h3>
              <ul className="text-xs text-neutral-600 space-y-2">
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-neutral-900">🐢 Tortuguero:</span>
                  <span>{isEs ? 'Julio - Octubre (Anidación de Tortugas Verdes)' : 'July - October (Green Turtle Nesting)'}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-neutral-900">🐋 Uvita / Ballena:</span>
                  <span>{isEs ? 'Agosto - Octubre & Enero - Marzo (Avistamiento de Ballenas)' : 'August - October & January - March (Whale Watching)'}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-neutral-900">🦥 Pérezosos & Aves:</span>
                  <span>{isEs ? 'Todo el año en Manuel Antonio, Arenal & Corcovado' : 'Year-round in Manuel Antonio, Arenal & Corcovado'}</span>
                </li>
              </ul>
            </div>

          </div>
        )}

        {/* TAB 5: Driving & eSIM Connectivity */}
        {activeTab === 'driving_sim' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-4">
                <h3 className="font-black text-xl text-neutral-900 flex items-center gap-2">
                  <Car className="w-5 h-5 text-teal-700" />
                  {isEs ? 'Consejos de Conducción en Costa Rica' : 'Driving & Road Tips in Costa Rica'}
                </h3>
                <ul className="space-y-3 text-xs text-neutral-700">
                  <li className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200">
                    <strong className="block text-neutral-900 font-bold mb-1">
                      📱 {isEs ? 'Usa Waze como Navegador Principal' : 'Use Waze App for Real-Time Navigation'}
                    </strong>
                    {isEs
                      ? 'En Costa Rica, Waze es mucho más preciso que Google Maps para alertar sobre policías de tránsito, desvíos, estado de carreteras de lastre y congestión.'
                      : 'Waze is the gold standard navigation tool in Costa Rica with real-time updates on potholes, traffic, and police checkpoints.'}
                  </li>
                  <li className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200">
                    <strong className="block text-neutral-900 font-bold mb-1">
                      🚙 {isEs ? '¿Cuándo necesitas un 4x4?' : 'When is a 4x4 Necessary?'}
                    </strong>
                    {isEs
                      ? 'Recomendado para Monteverde, Península de Nicoya (Santa Teresa / Nosara), Rincón de la Vieja y Drake Bay debido a caminos de grava o cruces de ríos pequeños.'
                      : 'Recommended for Monteverde, Nicoya Peninsula (Santa Teresa, Nosara), Rincon de la Vieja & Drake Bay due to steep gravel roads.'}
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-black text-xl text-neutral-900 flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-teal-600" />
                  {isEs ? 'Internet Móvil & eSIMs Turísticas' : 'Mobile Internet & Tourist eSIMs'}
                </h3>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3 text-xs text-stone-900">
                  <strong className="block font-bold text-stone-950">
                    📡 {isEs ? 'Operadores Locales (Kolbi, Liberty, Claro)' : 'Local Telecom Carriers (Kolbi, Liberty, Claro)'}
                  </strong>
                  <p className="leading-relaxed">
                    {isEs
                      ? 'Kölbi (ICE) tiene la mayor cobertura geográfica en selvas y montañas. Puedes adquirir una eSIM prepago para turistas en los quioscos del Aeropuerto SJO / LIR o instalar una eSIM digital antes de volar.'
                      : 'Kolbi offers the widest coverage across remote rainforests. You can purchase tourist prepaid SIM/eSIM at SJO/LIR airports or activate digital eSIMs before departure.'}
                  </p>
                  <div className="pt-2 border-t border-stone-200/60 font-bold flex items-center justify-between">
                    <span>⚡ {isEs ? 'Velocidad Promedio 4G / 5G' : 'Average 4G/5G Speed'}</span>
                    <span>30 - 80 Mbps</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 6: Currency & Tipping Calculator */}
        {activeTab === 'currency' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
            
            {/* Quick Converter Box */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-black text-lg text-neutral-900 uppercase flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-teal-600" />
                  {isEs ? 'Convertidor Rápido USD / Colón' : 'Quick Currency Converter USD / CRC'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {isEs ? 'Tipo de cambio de referencia estimado en Costa Rica.' : 'Estimated reference exchange rate.'}
                </p>
              </div>

              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    {isEs ? 'Monto en Dólares ($ USD):' : 'Amount in Dollars ($ USD):'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-400">$</span>
                    <input
                      type="number"
                      value={calcUsd}
                      onChange={(e) => setCalcUsd(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-neutral-300 rounded-xl font-black text-stone-900 text-lg"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-neutral-600">{isEs ? 'Equivalente en Colones (₡):' : 'Equivalent in Colones (₡):'}</span>
                  <span className="font-black text-xl text-teal-600">₡{calcCrc.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Tipping Guidelines */}
            <div className="space-y-4">
              <h3 className="font-black text-lg text-neutral-900 uppercase">
                {isEs ? 'Guía Local de Propinas' : 'Local Tipping Etiquette'}
              </h3>
              <ul className="space-y-3 text-xs text-neutral-600">
                <li className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
                  <strong className="text-neutral-900 block font-bold mb-0.5">🍽️ {isEs ? 'Restaurantes & Cafeterías:' : 'Restaurants & Cafes:'}</strong>
                  {isEs
                    ? 'Por ley en Costa Rica, la factura de restaurantes ya incluye un 10% de servicio obligatorio y 13% IVA. Dejar propina adicional es voluntario para premiar un servicio excelente.'
                    : 'By law, bills include 10% mandatory service tax and 13% VAT. Additional tipping is optional for great service.'}
                </li>
                <li className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
                  <strong className="text-neutral-900 block font-bold mb-0.5">🦥 {isEs ? 'Guías de Tour & Choferes:' : 'Tour Guides & Drivers:'}</strong>
                  {isEs
                    ? 'Se acostumbra de $5 a $15 USD por día para guías turísticos y $3 a $5 USD para choferes privados.'
                    : 'Customary tip is $5-$15 USD per day for tour guides and $3-$5 USD for private drivers.'}
                </li>
              </ul>
            </div>

          </div>
        )}

        {/* TAB 7: Entry Requirements Certification */}
        {activeTab === 'entry' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-3">
                <h3 className="font-black text-lg text-neutral-900 uppercase flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  {isEs ? 'Requisitos Oficiales de Ingreso al País' : 'Official Costa Rica Entry Requirements'}
                </h3>
                <ul className="space-y-2 text-xs text-neutral-600">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span><strong>{isEs ? 'Pasaporte Válido:' : 'Valid Passport:'}</strong> {isEs ? 'Mínimo un (1) día a seis (6) meses de vigencia según país de origen.' : 'Valid passport required.'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span><strong>{isEs ? 'Tiquete de Salida:' : 'Exit Ticket:'}</strong> {isEs ? 'Boleto de regreso aéreo o terrestre confirmado de salida del país.' : 'Confirmed return or onward departure ticket required.'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span><strong>{isEs ? 'Permanencia Turística:' : 'Tourist Stay:'}</strong> {isEs ? 'Hasta 180 días de estadía para ciudadanos de EE.UU., Canadá, Unión Europea y Reino Unido sin visa consular previa.' : 'Up to 180 days stay granted for USA, Canada, EU & UK passport holders without prior visa.'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span><strong>{isEs ? 'Seguro de Viaje Recomendado:' : 'Travel Insurance:'}</strong> {isEs ? 'Recomendado con cobertura médica y de aventura.' : 'Highly recommended with adventure and medical coverage.'}</span>
                  </li>
                </ul>
              </div>

              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-stone-950 font-black text-sm uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                  <span>{isEs ? 'Operador Receptivo Oficial en Costa Rica' : 'Official Receptive Operator in Costa Rica'}</span>
                </div>
                <p className="text-xs text-stone-800 leading-relaxed">
                  {isEs
                    ? 'Garantizamos pólizas comerciales de transporte, permisos de Instituto Costarricense de Turismo (ICT) y guías bilingües certificados.'
                    : 'We ensure full commercial passenger insurance, Costa Rica Tourism Board (ICT) certified credentials, and bilingual naturalists.'}
                </p>
                {onOpenTripBuilder && (
                  <button
                    onClick={onOpenTripBuilder}
                    className="mt-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase px-5 py-2.5 rounded-full shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{isEs ? 'Cotizar Itinerario a Medida' : 'Custom Itinerary Quote'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
};

