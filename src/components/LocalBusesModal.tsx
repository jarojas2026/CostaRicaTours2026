import React, { useState } from 'react';
import { 
  Bus, MapPin, Clock, DollarSign, Phone, Search, X, 
  ExternalLink, MessageCircle, AlertCircle, Sparkles, Navigation,
  ShieldCheck, Info, ArrowRight, CheckCircle2
} from 'lucide-react';
import { Language, Currency } from '../types';
import { formatCurrency } from '../utils/i18n';

interface LocalBusesModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currency: Currency;
}

export interface BusRoute {
  id: string;
  from: { es: string; en: string };
  to: { es: string; en: string };
  regionCategory: 'norte' | 'pacifico' | 'caribe' | 'guanacaste' | 'urbano';
  company: string;
  terminal: { es: string; en: string };
  terminalAddress: { es: string; en: string };
  schedules: { es: string; en: string };
  duration: { es: string; en: string };
  priceCRC: number;
  priceUSD: number;
  phone: string;
  tips: { es: string; en: string };
  featured?: boolean;
}

export const BUS_ROUTES: BusRoute[] = [
  {
    id: 'sj-lafortuna',
    from: { es: 'San José', en: 'San José' },
    to: { es: 'La Fortuna (Volcán Arenal)', en: 'La Fortuna (Arenal Volcano)' },
    regionCategory: 'norte',
    company: 'Autotransportes San José - La Fortuna',
    terminal: { es: 'Terminal 7-10 (Calle 8, Av. 7 y 9)', en: 'Terminal 7-10 (8th St, 7th & 9th Ave)' },
    terminalAddress: { es: 'Barrio Paso de la Vaca, San José', en: 'Paso de la Vaca District, San José' },
    schedules: { es: 'Salidas directas: 8:40 AM y 11:30 AM (Diario)', en: 'Direct daily departures: 8:40 AM & 11:30 AM' },
    duration: { es: '3.5 a 4 horas', en: '3.5 to 4 hours' },
    priceCRC: 3100,
    priceUSD: 6,
    phone: '+506 2255-4300',
    tips: { 
      es: 'Se recomienda comprar el tiquete presencialmente en la Terminal 7-10 un día antes o llegar 1 hora antes de la salida.', 
      en: 'Buy tickets at Terminal 7-10 1 day ahead or arrive at least 1 hour prior to departure.' 
    },
    featured: true
  },
  {
    id: 'sj-monteverde',
    from: { es: 'San José', en: 'San José' },
    to: { es: 'Monteverde (Santa Elena)', en: 'Monteverde (Santa Elena)' },
    regionCategory: 'norte',
    company: 'Transmonteverde',
    terminal: { es: 'Terminal Transmonteverde (Calle 12, Av. 7-9)', en: 'Transmonteverde Terminal (12th St, 7-9 Ave)' },
    terminalAddress: { es: 'Cerca de Barrio México, San José', en: 'Near Barrio Mexico, San José' },
    schedules: { es: 'Salidas directas: 6:30 AM y 2:30 PM (Diario)', en: 'Direct daily departures: 6:30 AM & 2:30 PM' },
    duration: { es: '4.5 horas', en: '4.5 hours' },
    priceCRC: 3600,
    priceUSD: 7,
    phone: '+506 2222-3854',
    tips: { 
      es: 'Ruta de montaña con vistas panorámicas increíbles. Cuenta con una parada intermedia en Sargento Loria.', 
      en: 'Scenic mountain route with a brief 15-min rest stop in Sargento Loria.' 
    },
    featured: true
  },
  {
    id: 'sj-manuelantonio',
    from: { es: 'San José', en: 'San José' },
    to: { es: 'Manuel Antonio / Quepos', en: 'Manuel Antonio / Quepos' },
    regionCategory: 'pacifico',
    company: 'Tracopa / Transportes Morales',
    terminal: { es: 'Terminal Tracopa (Plaza Víquez, Calle 5, Av. 18-20)', en: 'Tracopa Terminal (Plaza Víquez, 5th St)' },
    terminalAddress: { es: 'Plaza Víquez, San José Centro', en: 'Plaza Víquez, Downtown San José' },
    schedules: { es: 'Directo por Pista Costanera: 6:00 AM, 9:00 AM, 12:00 PM, 2:30 PM, 6:00 PM, 7:30 PM', en: 'Direct via Highway: 6:00 AM, 9:00 AM, 12:00 PM, 2:30 PM, 6:00 PM, 7:30 PM' },
    duration: { es: '3.5 horas (Directo)', en: '3.5 hours (Direct)' },
    priceCRC: 5200,
    priceUSD: 10,
    phone: '+506 2221-4214',
    tips: { 
      es: 'Asegúrate de pedir el bus "Directo por Pista" (más rápido) en lugar del "Colectivo por Puriscal" (que tarda 5h).', 
      en: 'Always ask for the "Directo por Pista" bus (faster) rather than "Colectivo por Puriscal".' 
    },
    featured: true
  },
  {
    id: 'sj-puertoviejo',
    from: { es: 'San José', en: 'San José' },
    to: { es: 'Puerto Viejo de Talamanca / Cahuita', en: 'Puerto Viejo de Talamanca / Cahuita' },
    regionCategory: 'caribe',
    company: 'Autotransportes MEPE',
    terminal: { es: 'Terminal MEPE / Atlántico Norte (Calle 12, Av. 9)', en: 'MEPE Terminal (12th St, 9th Ave)' },
    terminalAddress: { es: 'Barrio México, San José', en: 'Barrio Mexico, San José' },
    schedules: { es: 'Diario: 6:00 AM, 8:00 AM, 10:00 AM, 12:00 PM, 2:00 PM, 4:00 PM', en: 'Daily: 6:00 AM, 8:00 AM, 10:00 AM, 12:00 PM, 2:00 PM, 4:00 PM' },
    duration: { es: '4.5 a 5 horas', en: '4.5 to 5 hours' },
    priceCRC: 6800,
    priceUSD: 13,
    phone: '+506 2257-8129',
    tips: { 
      es: 'Pasa por el Parque Nacional Braulio Carrillo y la parada de Limón antes de continuar a Cahuita y Puerto Viejo.', 
      en: 'Crosses Braulio Carrillo rainforest and stops briefly in Limón before Cahuita & Puerto Viejo.' 
    },
    featured: true
  },
  {
    id: 'sj-jaco',
    from: { es: 'San José', en: 'San José' },
    to: { es: 'Playa Jacó', en: 'Jacó Beach' },
    regionCategory: 'pacifico',
    company: 'Transportes Jacó',
    terminal: { es: 'Terminal 7-10 (Calle 8, Av. 7 y 9)', en: 'Terminal 7-10 (8th St, 7th & 9th Ave)' },
    terminalAddress: { es: 'Paso de la Vaca, San José', en: 'Paso de la Vaca, San José' },
    schedules: { es: 'Cada 1 o 2 horas desde las 7:00 AM hasta las 7:00 PM', en: 'Every 1-2 hours from 7:00 AM to 7:00 PM' },
    duration: { es: '2 horas', en: '2 hours' },
    priceCRC: 3000,
    priceUSD: 6,
    phone: '+506 2223-1109',
    tips: { 
      es: 'La opción más rápida y económica para llegar a la costa del Pacífico desde la capital.', 
      en: 'Fastest and cheapest direct bus to the Pacific coast from San José.' 
    }
  },
  {
    id: 'sj-tamarindo',
    from: { es: 'San José', en: 'San José' },
    to: { es: 'Tamarindo / Playa Flamingo', en: 'Tamarindo / Flamingo Beach' },
    regionCategory: 'guanacaste',
    company: 'Empresa Alfaro / TIG',
    terminal: { es: 'Terminal 7-10 (Calle 8, Av. 7 y 9)', en: 'Terminal 7-10 (8th St, 7th & 9th Ave)' },
    terminalAddress: { es: 'Barrio Paso de la Vaca, San José', en: 'Paso de la Vaca, San José' },
    schedules: { es: 'Diario: 3:30 AM, 7:30 AM, 11:30 AM, 3:30 PM', en: 'Daily: 3:30 AM, 7:30 AM, 11:30 AM, 3:30 PM' },
    duration: { es: '5 a 5.5 horas', en: '5 to 5.5 hours' },
    priceCRC: 6500,
    priceUSD: 12.5,
    phone: '+506 2222-2666',
    tips: { 
      es: 'Ideal para surfistas y turistas dirigiéndose a las playas doradas de Guanacaste.', 
      en: 'Ideal for surfers and travelers heading to Guanacaste golden beaches.' 
    }
  },
  {
    id: 'sj-santateresa',
    from: { es: 'San José', en: 'San José' },
    to: { es: 'Santa Teresa / Montezuma / Cóbano', en: 'Santa Teresa / Montezuma / Cóbano' },
    regionCategory: 'guanacaste',
    company: 'Transportes Cóbano (Con Ferry)',
    terminal: { es: 'Terminal 7-10 (Calle 8, Av. 7 y 9)', en: 'Terminal 7-10 (8th St, 7th & 9th Ave)' },
    terminalAddress: { es: 'Paso de la Vaca, San José', en: 'Paso de la Vaca, San José' },
    schedules: { es: 'Diario: 6:00 AM y 2:00 PM (Directo con Ferry)', en: 'Daily: 6:00 AM & 2:00 PM (Direct with Ferry)' },
    duration: { es: '5.5 a 6 horas (Incluye cruce en Ferry Paquera)', en: '5.5 to 6 hours (Includes Paquera Ferry crossing)' },
    priceCRC: 8500,
    priceUSD: 16.5,
    phone: '+506 2642-0219',
    tips: { 
      es: 'El tiquete cubre tanto el autobús como la travesía en el ferry de Paquera a través del Golfo de Nicoya.', 
      en: 'Ticket covers both the bus journey and the Paquera Ferry ride across Nicoya Gulf.' 
    },
    featured: true
  },
  {
    id: 'sj-liberia',
    from: { es: 'San José', en: 'San José' },
    to: { es: 'Liberia / Peñas Blancas (Nicaragua)', en: 'Liberia / Peñas Blancas (Nicaragua Border)' },
    regionCategory: 'guanacaste',
    company: 'Pulmitan de Liberia',
    terminal: { es: 'Terminal Pulmitan (Calle 24, Av. 5 y 7)', en: 'Pulmitan Terminal (24th St, 5th & 7th Ave)' },
    terminalAddress: { es: 'Cerca del Parque La Merced, San José', en: 'Near La Merced Park, San José' },
    schedules: { es: 'Salidas cada hora desde las 6:00 AM hasta las 8:00 PM', en: 'Hourly departures from 6:00 AM to 8:00 PM' },
    duration: { es: '4 horas', en: '4 hours' },
    priceCRC: 4800,
    priceUSD: 9.5,
    phone: '+506 2222-0610',
    tips: { 
      es: 'Conecta San José con la capital turística de Guanacaste y la frontera norte con Nicaragua.', 
      en: 'Connects San José with Guanacaste hub and northern Nicaragua border crossing.' 
    }
  },
  {
    id: 'sj-aeropuerto',
    from: { es: 'San José Centro', en: 'Downtown San José' },
    to: { es: 'Aeropuerto Internacional SJO (Juan Santamaría)', en: 'SJO Airport (Juan Santamaría)' },
    regionCategory: 'urbano',
    company: 'TUASA / Station Wagon',
    terminal: { es: 'Parada TUASA (Calle 12, Av. 2 - Parque La Merced)', en: 'TUASA Bus Stop (12th St, 2nd Ave - La Merced)' },
    terminalAddress: { es: 'Frente al Parque La Merced, San José', en: 'In front of La Merced Park, San José' },
    schedules: { es: 'Cada 5 a 10 minutos (Servicio continuo 24/7)', en: 'Every 5 to 10 minutes (24/7 continuous service)' },
    duration: { es: '35 a 45 minutos', en: '35 to 45 minutes' },
    priceCRC: 760,
    priceUSD: 1.5,
    phone: '+506 2442-6900',
    tips: { 
      es: 'Bus de color rojo o anaranjado con rotulación "SJO Aeropuerto". Es la forma más barata de llegar al aeropuerto.', 
      en: 'Red or orange bus labeled "SJO Aeropuerto". The cheapest way to get to the airport.' 
    },
    featured: true
  },
  {
    id: 'sj-tortuguero',
    from: { es: 'San José', en: 'San José' },
    to: { es: 'Guápiles / Cariari (Para Conexión a Tortuguero)', en: 'Guápiles / Cariari (For Tortuguero Boat)' },
    regionCategory: 'caribe',
    company: 'Grupo Caribeños / Empresarios Guapileños',
    terminal: { es: 'Terminal Caribeños (Calle 12, Av. 9)', en: 'Caribeños Terminal (12th St, 9th Ave)' },
    terminalAddress: { es: 'Barrio México, San José', en: 'Barrio México, San José' },
    schedules: { es: 'Cada 15 minutos hacia Guápiles (5:00 AM a 10:00 PM)', en: 'Every 15 min to Guápiles (5:00 AM to 10:00 PM)' },
    duration: { es: '1.5 horas a Guápiles / Cariari', en: '1.5 hours to Guápiles / Cariari' },
    priceCRC: 2100,
    priceUSD: 4,
    phone: '+506 2222-0610',
    tips: { 
      es: 'Toma el bus a Cariari, y luego el bus local a La Pavona para tomar la lancha rápida hacia Tortuguero.', 
      en: 'Take bus to Cariari, then local bus to La Pavona dock for the Tortuguero water taxi.' 
    }
  },
  {
    id: 'sj-golfito',
    from: { es: 'San José', en: 'San José' },
    to: { es: 'Paso Canoas (Panamá) / Golfito / Bahía Drake', en: 'Paso Canoas (Panama) / Golfito / Drake Bay' },
    regionCategory: 'pacifico',
    company: 'Tracopa',
    terminal: { es: 'Terminal Tracopa (Plaza Víquez, Calle 5)', en: 'Tracopa Terminal (Plaza Víquez, 5th St)' },
    terminalAddress: { es: 'Plaza Víquez, San José', en: 'Plaza Víquez, San José' },
    schedules: { es: '5:00 AM, 8:30 AM, 11:00 AM, 2:00 PM, 6:00 PM', en: '5:00 AM, 8:30 AM, 11:00 AM, 2:00 PM, 6:00 PM' },
    duration: { es: '7 a 8 horas', en: '7 to 8 hours' },
    priceCRC: 9500,
    priceUSD: 18.5,
    phone: '+506 2221-4214',
    tips: { 
      es: 'Recorre todo el Pacífico Sur hasta la frontera con Panamá o desembarque en Sierpe para bote a Bahía Drake.', 
      en: 'Runs to southern border with Panama or drop off in Sierpe for Drake Bay boat connection.' 
    }
  }
];

export const LocalBusesModal: React.FC<LocalBusesModalProps> = ({
  isOpen,
  onClose,
  language,
  currency
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'norte' | 'pacifico' | 'caribe' | 'guanacaste' | 'urbano'>('all');

  if (!isOpen) return null;

  const filteredRoutes = BUS_ROUTES.filter(route => {
    const fromText = route.from[language] || route.from.es;
    const toText = route.to[language] || route.to.es;
    const companyText = route.company;
    const terminalText = route.terminal[language] || route.terminal.es;

    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      fromText.toLowerCase().includes(q) ||
      toText.toLowerCase().includes(q) ||
      companyText.toLowerCase().includes(q) ||
      terminalText.toLowerCase().includes(q)
    );

    const matchesCategory = selectedCategory === 'all' || route.regionCategory === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: language === 'es' ? 'Todas las Rutas' : 'All Routes' },
    { id: 'norte', label: language === 'es' ? 'Arenal & Monteverde' : 'Arenal & Monteverde' },
    { id: 'pacifico', label: language === 'es' ? 'Pacífico Central & Sur' : 'Central & South Pacific' },
    { id: 'caribe', label: language === 'es' ? 'Caribe (Puerto Viejo)' : 'Caribbean Coast' },
    { id: 'guanacaste', label: language === 'es' ? 'Guanacaste & Playas' : 'Guanacaste & Beaches' },
    { id: 'urbano', label: language === 'es' ? 'Aeropuerto SJO & Urbano' : 'SJO Airport & Urban' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white text-[#2C3330] w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border border-[#1E7B4A]/20 flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-[#1E7B4A] text-white px-6 py-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
              <Bus className="w-6 h-6 text-[#E67E22]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#E67E22] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  {language === 'es' ? 'Guía Oficial' : 'Official National Guide'}
                </span>
                <span className="text-white/80 text-xs font-bold">• Costa Rica 2026</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                {language === 'es' ? 'Directorio de Buses Locales de Costa Rica' : 'Costa Rica Local Bus & Transport Directory'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Sub-Header / Search & Filter Controls */}
        <div className="p-6 bg-[#F4F7F5] border-b border-neutral-200 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'es' ? 'Buscar destino, empresa o terminal (ej. Arenal, Tracopa, Jacó)...' : 'Search destination, company or terminal (e.g. Arenal, Tracopa)...'}
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-300 rounded-2xl text-sm font-semibold text-[#2C3330] placeholder-neutral-400 focus:outline-none focus:border-[#1E7B4A] shadow-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#2C3330]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick WhatsApp Advice Button */}
            <a
              href={`https://wa.me/50687959148?text=${encodeURIComponent(
                language === 'es' 
                  ? 'Hola Costa Rica Tours (costaricatours.es), quisiera consultar sobre horarios y empresas de bus local para viajar por Costa Rica.'
                  : 'Hello Costa Rica Tours (costaricatours.es), I would like to inquire about local bus schedules and transport in Costa Rica.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#E67E22] hover:bg-[#d67118] text-white font-black text-xs uppercase px-5 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer hover:scale-105"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{language === 'es' ? 'Consultar Horario por WhatsApp' : 'Inquire Bus Info via WhatsApp'}</span>
            </a>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#1E7B4A] text-white shadow-md'
                    : 'bg-white text-[#2C3330] hover:bg-neutral-200 border border-neutral-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Scrollable Content - Route Cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 modal-scrollable bg-[#F4F7F5]">
          
          {/* Top Notice Banner */}
          <div className="bg-white p-4 rounded-2xl border border-[#0B668F]/20 flex items-start gap-3 shadow-sm">
            <Info className="w-5 h-5 text-[#0B668F] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#2C3330] space-y-1">
              <p className="font-bold text-[#0B668F]">
                {language === 'es' ? 'Información Clave para Viajar en Bus Público en Costa Rica:' : 'Essential Local Bus Travel Guide:'}
              </p>
              <p className="text-neutral-600 leading-relaxed">
                {language === 'es'
                  ? 'Los autobuses públicos en Costa Rica son seguros, puntuales y muy económicos. Casi todas las rutas nacionales principales salen de terminales ubicadas en el centro de San José. Se paga en Colones (₡) en efectivo o en ventanilla.'
                  : 'Public buses in Costa Rica are safe, punctual, and highly affordable. Most main national routes depart from key terminals in downtown San José. Pay in Cash (CRC) or ticket office.'}
              </p>
            </div>
          </div>

          {/* Bus Route Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRoutes.map((route) => {
              const destination = route.to[language] || route.to.es;
              const origin = route.from[language] || route.from.es;
              const terminalName = route.terminal[language] || route.terminal.es;
              const scheduleText = route.schedules[language] || route.schedules.es;
              const durationText = route.duration[language] || route.duration.es;
              const tipText = route.tips[language] || route.tips.es;

              const displayPrice = currency === 'CRC' 
                ? `₡${route.priceCRC.toLocaleString('es-CR')} CRC` 
                : currency === 'USD' 
                  ? `$${route.priceUSD} USD` 
                  : formatCurrency(route.priceUSD, currency);

              return (
                <div 
                  key={route.id} 
                  className={`bg-white rounded-3xl p-6 border transition-all shadow-sm hover:shadow-lg flex flex-col justify-between ${
                    route.featured 
                      ? 'border-[#1E7B4A] ring-2 ring-[#1E7B4A]/10' 
                      : 'border-neutral-200 hover:border-[#0B668F]'
                  }`}
                >
                  <div className="space-y-4">
                    
                    {/* Header Route Badge */}
                    <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B668F] uppercase tracking-wider mb-1">
                          <span>{origin}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span className="text-[#1E7B4A]">{destination}</span>
                        </div>
                        <h3 className="font-black text-lg text-[#2C3330] leading-tight">
                          {destination}
                        </h3>
                        <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1 mt-0.5">
                          <Bus className="w-3.5 h-3.5 text-[#1E7B4A]" />
                          {route.company}
                        </p>
                      </div>

                      {/* Price Badge */}
                      <div className="text-right flex-shrink-0 bg-[#F4F7F5] px-3 py-1.5 rounded-2xl border border-neutral-200">
                        <span className="text-[10px] font-extrabold uppercase text-neutral-500 block">
                          {language === 'es' ? 'Pasaje Aprox.' : 'Fare Approx.'}
                        </span>
                        <span className="text-base font-black text-[#E67E22]">
                          {displayPrice}
                        </span>
                      </div>
                    </div>

                    {/* Route Details */}
                    <div className="space-y-2.5 text-xs">
                      
                      {/* Terminal Location */}
                      <div className="flex items-start gap-2 text-neutral-700">
                        <MapPin className="w-4 h-4 text-[#1E7B4A] flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#2C3330] font-bold block">{language === 'es' ? 'Terminal en San José:' : 'Terminal in San José:'}</strong>
                          <span>{terminalName}</span>
                        </div>
                      </div>

                      {/* Schedules */}
                      <div className="flex items-start gap-2 text-neutral-700">
                        <Clock className="w-4 h-4 text-[#0B668F] flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#2C3330] font-bold block">{language === 'es' ? 'Horarios & Frecuencia:' : 'Schedule & Frequency:'}</strong>
                          <span>{scheduleText}</span>
                        </div>
                      </div>

                      {/* Travel Duration */}
                      <div className="flex items-start gap-2 text-neutral-700">
                        <Navigation className="w-4 h-4 text-[#E67E22] flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#2C3330] font-bold block">{language === 'es' ? 'Duración de Viaje:' : 'Travel Duration:'}</strong>
                          <span>{durationText}</span>
                        </div>
                      </div>

                      {/* Phone Contact */}
                      <div className="flex items-center gap-2 text-neutral-700">
                        <Phone className="w-4 h-4 text-[#1E7B4A] flex-shrink-0" />
                        <span className="font-bold">{route.phone}</span>
                      </div>

                    </div>

                    {/* Tip Box */}
                    <div className="bg-[#F4F7F5] p-3 rounded-2xl border border-neutral-200 text-xs text-neutral-700 space-y-1">
                      <strong className="text-[#1E7B4A] font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        {language === 'es' ? 'Recomendación Local:' : 'Local Traveler Tip:'}
                      </strong>
                      <p className="text-[11px] leading-relaxed text-neutral-600">
                        {tipText}
                      </p>
                    </div>

                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${terminalName}, San Jose, Costa Rica`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#0B668F] hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Ver Mapa Terminal' : 'Map Terminal'}</span>
                    </a>

                    <a
                      href={`https://wa.me/50687959148?text=${encodeURIComponent(
                        language === 'es' 
                          ? `Hola Costa Rica Tours (costaricatours.es), quisiera ayuda e información sobre la ruta de bus local: ${destination} (${route.company}).`
                          : `Hello Costa Rica Tours (costaricatours.es), I would like information on the local bus route: ${destination} (${route.company}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#1E7B4A] hover:bg-[#165a36] text-white font-black text-xs uppercase px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#E67E22]" />
                      <span>{language === 'es' ? 'Consultar' : 'Inquire'}</span>
                    </a>
                  </div>

                </div>
              );
            })}
          </div>

          {filteredRoutes.length === 0 && (
            <div className="text-center py-12 space-y-3 bg-white rounded-3xl p-8 border border-neutral-200">
              <Bus className="w-12 h-12 text-neutral-400 mx-auto" />
              <p className="font-bold text-neutral-700">
                {language === 'es' ? 'No se encontraron rutas con ese término.' : 'No bus routes found for your search query.'}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="text-xs font-black text-[#1E7B4A] underline uppercase"
              >
                {language === 'es' ? 'Ver todas las rutas nacionales' : 'Reset search & view all routes'}
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1E7B4A]" />
            <span>
              {language === 'es' 
                ? 'Datos sincronizados con las empresas autorizadas de transporte nacional de Costa Rica.' 
                : 'Data synchronized with official authorized Costa Rican bus transport lines.'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-[#1E7B4A] hover:bg-[#165a36] text-white font-black text-xs uppercase px-6 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            {language === 'es' ? 'Cerrar Directorio' : 'Close Directory'}
          </button>
        </div>

      </div>
    </div>
  );
};
