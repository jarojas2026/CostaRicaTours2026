import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Compass, Map, Sparkles, Bus, Coffee, ArrowRight, ShieldCheck, CheckCircle2, Clock, Flame, Users, Bot, Plane } from 'lucide-react';
import { Language, Currency, Tour } from '../types';
import { useTours } from '../contexts/ToursContext';
import { getLangText, formatCurrency } from '../utils/i18n';

interface HomeQuickNavProps {
  language: Language;
  currency: Currency;
  onNavigateTab?: (tab: 'tours' | 'map' | 'culture' | 'tools' | 'itinerary' | 'ai' | 'flights') => void;
  onSelectCategory?: (category: any) => void;
  onSelectTour?: (tour: Tour) => void;
  onOpenCustomFunnel?: () => void;
}

export const HomeQuickNav: React.FC<HomeQuickNavProps> = ({
  language,
  currency,
  onOpenCustomFunnel
}) => {
  const navigate = useNavigate();
  const { tours: TOURS } = useTours();
  const tico = language === 'es';

  // Three catalog entries for fast discovery without invented popularity/review claims.
  const curatedTours = TOURS.slice(0, 3);

  const navCards = [
    {
      id: 'tours',
      title: tico ? 'Catálogo de Tours' : 'Tours & Adventures',
      subtitle: tico ? 'Explora experiencias por región, estilo y duración' : 'Explore experiences by region, style and duration',
      icon: <Compass className="w-6 h-6 text-orange-400" />,
      badge: tico ? 'Explorar' : 'Explore',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      tab: 'tours' as const,
      gradient: 'from-[#0b3323] to-[#051c14] hover:border-amber-400/80',
      actionText: tico ? 'Explorar catálogo' : 'Explore catalog'
    },
    {
      id: 'ai',
      title: tico ? '🤖 Asistente de Viaje' : '🤖 Travel Assistant',
      subtitle: tico ? 'Planifica, compara y prepara el siguiente paso de tu viaje' : 'Plan, compare and prepare the next step of your trip',
      icon: <Bot className="w-6 h-6 text-orange-400" />,
      badge: tico ? 'Asistente' : 'Assistant',
      badgeColor: 'bg-orange-400 text-stone-950 font-black',
      tab: 'ai' as const,
      gradient: 'from-[#0d3d2c] to-[#072419] hover:border-amber-400',
      actionText: tico ? 'Hablar con el asistente' : 'Chat with the assistant'
    },
    {
      id: 'map',
      title: tico ? 'Mapa Interactivo' : 'Interactive Map',
      subtitle: tico ? 'Explora volcanes, playas y reservas por región' : 'Browse volcanoes, beaches & reserves by region',
      icon: <Map className="w-6 h-6 text-teal-400" />,
      badge: tico ? 'Geográfico' : 'Geographic',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      tab: 'map' as const,
      gradient: 'from-[#072c29] to-[#041a18] hover:border-teal-400/80',
      actionText: tico ? 'Ver mapa' : 'View map'
    },
    {
      id: 'flights',
      title: tico ? '✈️ Vuelos a Costa Rica' : '✈️ Flights to Costa Rica',
      subtitle: tico ? 'Busca opciones hacia San José (SJO) y Liberia (LIR)' : 'Search options to San José (SJO) and Liberia (LIR)',
      icon: <Plane className="w-6 h-6 text-orange-400" />,
      badge: tico ? 'Buscar' : 'Search',
      badgeColor: 'bg-orange-400 text-stone-950 font-black',
      tab: 'flights' as const,
      gradient: 'from-[#222110] to-[#0c1409] hover:border-amber-400/80',
      actionText: tico ? 'Buscar vuelos' : 'Search flights'
    },
    {
      id: 'culture',
      title: tico ? '🇨🇷 Rincón Tico' : '🇨🇷 Tico Culture & Food',
      subtitle: tico ? 'Diccionario, gastronomía típica, café y tradiciones' : 'Local slang, typical dishes, coffee & wildlife',
      icon: <Coffee className="w-6 h-6 text-orange-300" />,
      badge: tico ? 'Cultura' : 'Culture',
      badgeColor: 'bg-yellow-500/20 text-orange-300 border-yellow-500/40',
      tab: 'culture' as const,
      gradient: 'from-[#261d11] to-[#120f09] hover:border-amber-400/80',
      actionText: tico ? 'Descubrir cultura' : 'Discover culture'
    },
    {
      id: 'tools',
      title: tico ? 'Guía, Parques & Shuttles' : 'Guide, Parks & Shuttles',
      subtitle: tico ? 'Parques, empaque, emergencias, moneda, buses y shuttles' : 'Parks, packing, emergencies, currency & transport',
      icon: <Bus className="w-6 h-6 text-teal-400" />,
      badge: tico ? 'Guía' : 'Guide',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      tab: 'tools' as const,
      gradient: 'from-[#092e22] to-[#041711] hover:border-teal-400/80',
      actionText: tico ? 'Ver guía' : 'View travel guide'
    },
    {
      id: 'itinerary',
      title: tico ? 'Planificador con IA' : 'AI Trip Planner',
      subtitle: tico ? 'Crea una propuesta de itinerario y luego verifica la operación' : 'Create an itinerary proposal and then verify operations',
      icon: <Sparkles className="w-6 h-6 text-orange-400" />,
      badge: tico ? 'Planificar' : 'Plan',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      tab: 'itinerary' as const,
      gradient: 'from-[#1b192e] to-[#0d0c18] hover:border-purple-400/80',
      actionText: tico ? 'Generar plan' : 'Generate plan'
    },
    {
      id: 'vip',
      title: tico ? '✨ Viaje a Medida' : '✨ Tailored Trip',
      subtitle: tico ? 'Solicita una propuesta personalizada según tu ruta y preferencias' : 'Request a personalized proposal for your route and preferences',
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      badge: tico ? 'Personalizado' : 'Custom',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      tab: 'tours' as const,
      gradient: 'from-[#292211] to-[#141007] hover:border-amber-400/80',
      actionText: tico ? 'Solicitar propuesta' : 'Request proposal'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      
      {/* 1. Interactive Navigation Hub (Visual Shortcuts) */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200/60 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              {tico ? 'Navegación Rápida' : 'Quick Navigation'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {tico ? '¿Cómo deseas explorar Costa Rica?' : 'How do you wish to explore Costa Rica?'}
            </h2>
          </div>
          <p className="text-sm text-emerald-100/80 max-w-md">
            {tico
              ? 'Accede directamente a la sección que necesitas sin rodeos ni páginas saturadas.'
              : 'Jump straight to the section you need with zero clutter.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {navCards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6, scale: 1.025 }}
              whileTap={{ scale: 0.98 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              onClick={() => navigate(`/${card.tab}`)}
              className={`group relative p-5 rounded-2xl bg-gradient-to-br ${card.gradient} border border-teal-500/20 hover:border-amber-400/80 hover:shadow-[0_10px_30px_rgba(255,140,0,0.15)] transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-black/10 group-hover:scale-110 transition-transform">
                    {card.icon}
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-emerald-100/75 leading-relaxed mt-1 line-clamp-2">
                    {card.subtitle}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-2 flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                <span>{card.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 2. Catalog Highlights */}
      <section className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-teal-400 uppercase tracking-widest mb-1">
              <Flame className="w-4 h-4 text-orange-400" />
              {tico ? 'Ideas para empezar' : 'Ideas to get started'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {tico ? 'Experiencias destacadas del catálogo' : 'Featured catalog experiences'}
            </h2>
          </div>

          <button
            onClick={() => navigate('/tours')}
            className="inline-flex items-center gap-2 text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer group"
          >
            <span>{tico ? 'Ver todo el catálogo' : 'Explore the full catalog'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {curatedTours.map((tour) => {
            const title = getLangText(tour.title, language);
            const desc = getLangText(tour.description, language);
            return (
              <motion.div
                key={tour.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/tour/${tour.id}`)}
                className="group relative rounded-3xl bg-[#08241b]/90 border border-emerald-500/30 overflow-hidden shadow-xl hover:border-amber-400/60 cursor-pointer flex flex-col justify-between"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={tour.image}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-black/30" />

                  <div className="absolute top-3 left-3">
                    <span className="bg-[#051a13]/90 backdrop-blur-md text-teal-300 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-teal-500/30">
                      {tico ? 'Experiencia del catálogo' : 'Catalog experience'}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="bg-orange-500 text-white text-[11px] font-black uppercase px-3 py-1 rounded-full shadow-lg">
                      {formatCurrency(tour.priceUSD, currency)}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-xs font-bold text-emerald-100/90 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-orange-400" />
                      {getLangText(tour.durationLabel, language)}
                    </span>
                    <span>•</span>
                    <span>{tour.location.placeName}</span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                      {title}
                    </h3>
                    <p className="text-xs text-emerald-100/80 leading-relaxed line-clamp-2 mt-1.5">
                      {desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-emerald-500/25 flex items-center justify-between">
                    <div className="text-[11px] text-teal-300 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                      <span>{tico ? 'Cupo se verifica al solicitar' : 'Availability checked on request'}</span>
                    </div>

                    <span className="text-xs font-black text-orange-400 group-hover:underline flex items-center gap-1">
                      {tico ? 'Ver Tour' : 'View Tour'} &rarr;
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 3. Booking truth strip */}
      <section className="bg-[#062017]/95 rounded-3xl p-6 sm:p-7 border border-emerald-500/30 backdrop-blur-md shadow-2xl text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center shrink-0 border border-amber-400/40 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-tight">{tico ? 'Disponibilidad verificada' : 'Availability checked'}</h4>
              <p className="text-[11px] text-stone-300 leading-tight mt-0.5">{tico ? 'Consultamos cupo antes de afirmar disponibilidad' : 'We check capacity before claiming availability'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-400/40 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-tight">{tico ? 'Precio antes de pagar' : 'Price before payment'}</h4>
              <p className="text-[11px] text-stone-300 leading-tight mt-0.5">{tico ? 'La cotización muestra el importe antes de continuar' : 'Your quote shows the amount before you continue'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-400/40 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-tight">{tico ? 'Voucher tras confirmar' : 'Voucher after confirmation'}</h4>
              <p className="text-[11px] text-stone-300 leading-tight mt-0.5">{tico ? 'Pago y proveedor se verifican antes de la confirmación final' : 'Payment and provider are verified before final confirmation'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 flex items-center justify-center shrink-0 border border-teal-400/40 text-teal-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-tight">{tico ? 'Condiciones claras' : 'Clear conditions'}</h4>
              <p className="text-[11px] text-stone-300 leading-tight mt-0.5">{tico ? 'Cambios y cancelaciones dependen del servicio contratado' : 'Change and cancellation terms depend on the booked service'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 col-span-2 md:col-span-4 lg:col-span-1">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-400/40 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-tight">{tico ? 'Asistencia de viaje' : 'Travel assistance'}</h4>
              <p className="text-[11px] text-stone-300 leading-tight mt-0.5">{tico ? 'Consulta por WhatsApp cuando necesites apoyo' : 'Use WhatsApp when you need assistance'}</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
