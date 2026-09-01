import React from 'react';
import { motion } from 'motion/react';
import { Compass, Map, Sparkles, Bus, Coffee, ArrowRight, ShieldCheck, CheckCircle2, Star, Clock, Flame, Users, Bot, Plane } from 'lucide-react';
import { Language, Currency, Tour } from '../types';
import { TOURS } from '../data/toursData';
import { getLangText, formatCurrency } from '../utils/i18n';

interface HomeQuickNavProps {
  language: Language;
  currency: Currency;
  onNavigateTab: (tab: 'tours' | 'map' | 'culture' | 'tools' | 'itinerary' | 'ai' | 'flights') => void;
  onSelectCategory: (category: any) => void;
  onSelectTour: (tour: Tour) => void;
  onOpenCustomFunnel?: () => void;
}

export const HomeQuickNav: React.FC<HomeQuickNavProps> = ({
  language,
  currency,
  onNavigateTab,
  onSelectCategory,
  onSelectTour,
  onOpenCustomFunnel
}) => {
  const tico = language === 'es';

  // 3 Curated Must-Do Tours for fast discovery without clutter
  const curatedTours = TOURS.filter(t => ['arenal', 'manuel-antonio', 'pacuare'].includes(t.id));

  const navCards = [
    {
      id: 'tours',
      title: tico ? 'Catálogo de Tours' : 'Tours & Adventures',
      subtitle: tico ? '+20 excursiones seleccionadas con guías locales expertos' : '20+ curated tours with expert local guides',
      icon: <Compass className="w-6 h-6 text-amber-400" />,
      badge: tico ? 'Más Popular' : 'Most Popular',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      tab: 'tours' as const,
      gradient: 'from-emerald-900/90 to-emerald-950/90 hover:border-amber-400/60',
      actionText: tico ? 'Explorar catálogo' : 'Explore catalog'
    },
    {
      id: 'ai',
      title: tico ? '🤖 8 Agentes IA' : '🤖 8 AI Agents Hub',
      subtitle: tico ? '8 especialistas para itinerarios, biología, reservas, 4x4, chef, mochileros y accesibilidad' : '8 specialists for itineraries, wildlife, bookings, 4x4, chef, backpackers & accessibility',
      icon: <Bot className="w-6 h-6 text-amber-400" />,
      badge: tico ? 'Multi-Flujo' : 'Multi-Workflow',
      badgeColor: 'bg-amber-400 text-emerald-950 font-black',
      tab: 'ai' as const,
      gradient: 'from-emerald-900/95 to-teal-950/90 hover:border-amber-400/80',
      actionText: tico ? 'Hablar con Agentes' : 'Chat with Agents'
    },
    {
      id: 'map',
      title: tico ? 'Mapa Interactivo' : 'Interactive Map',
      subtitle: tico ? 'Explora volcanes, playas y reservas por región' : 'Browse volcanoes, beaches & reserves by region',
      icon: <Map className="w-6 h-6 text-teal-400" />,
      badge: tico ? 'Geográfico' : 'Geographic',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      tab: 'map' as const,
      gradient: 'from-teal-950/90 to-emerald-950/90 hover:border-teal-400/60',
      actionText: tico ? 'Ver mapa' : 'View map'
    },
    {
      id: 'flights',
      title: tico ? '✈️ Vuelos a Costa Rica' : '✈️ Flights to Costa Rica',
      subtitle: tico ? 'Rastreador en vivo desde tu país a San José (SJO) y Liberia (LIR) con reserva y traslados' : 'Live tracker from your origin country to SJO & LIR with booking and airport transfer',
      icon: <Plane className="w-6 h-6 text-amber-400" />,
      badge: tico ? 'En Vivo' : 'Live Radar',
      badgeColor: 'bg-amber-400 text-emerald-950 font-black',
      tab: 'flights' as const,
      gradient: 'from-amber-950/70 to-emerald-950/90 hover:border-amber-400/80',
      actionText: tico ? 'Ver Vuelos y Reservar' : 'View Flights & Book'
    },
    {
      id: 'culture',
      title: tico ? '🇨🇷 Rincón Tico' : '🇨🇷 Tico Culture & Food',
      subtitle: tico ? 'Diccionario, gastronomía típica, café y tradiciones' : 'Local slang, typical dishes, coffee & wildlife',
      icon: <Coffee className="w-6 h-6 text-amber-300" />,
      badge: tico ? '100% Auténtico' : '100% Authentic',
      badgeColor: 'bg-yellow-500/20 text-amber-300 border-yellow-500/40',
      tab: 'culture' as const,
      gradient: 'from-amber-950/80 to-emerald-950/90 hover:border-amber-400/60',
      actionText: tico ? 'Descubrir cultura' : 'Discover culture'
    },
    {
      id: 'tools',
      title: tico ? 'Guía, Parques & Shuttles' : 'Guide, Parks & Shuttles',
      subtitle: tico ? 'Parques SINAC, empaque, 911, moneda, buses y shuttles' : 'SINAC Parks, packing checklist, 911, currency & transport',
      icon: <Bus className="w-6 h-6 text-emerald-400" />,
      badge: tico ? 'Imprescindible' : 'Must Know',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      tab: 'tools' as const,
      gradient: 'from-emerald-950/90 to-teal-950/90 hover:border-emerald-400/60',
      actionText: tico ? 'Ver Guía Completa' : 'View Travel Guide'
    },
    {
      id: 'itinerary',
      title: tico ? 'Planificador con IA' : 'AI Trip Planner',
      subtitle: tico ? 'Crea un itinerario inteligente personalizado en segundos' : 'Generate a custom smart itinerary in seconds',
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      badge: tico ? 'Gratis & Rápido' : 'Free & Fast',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      tab: 'itinerary' as const,
      gradient: 'from-purple-950/80 to-emerald-950/90 hover:border-purple-400/60',
      actionText: tico ? 'Generar plan' : 'Generate plan'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      
      {/* 1. Interactive Navigation Hub (Visual Shortcuts) */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-emerald-900/60 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              {tico ? 'Navegación Rápida' : 'Quick Navigation'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {tico ? '¿Cómo deseas explorar Costa Rica?' : 'How do you wish to explore Costa Rica?'}
            </h2>
          </div>
          <p className="text-sm text-emerald-200/80 max-w-md">
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
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              onClick={() => onNavigateTab(card.tab)}
              className={`group relative p-5 rounded-2xl bg-gradient-to-br ${card.gradient} border border-emerald-500/20 hover:shadow-xl hover:shadow-emerald-900/30 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 group-hover:scale-110 transition-transform">
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
                  <p className="text-xs text-neutral-300 leading-relaxed mt-1 line-clamp-2">
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

      {/* 2. Top Curated Highlights (Must-Dos) - Simple, punchy, not overloaded */}
      <section className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase tracking-widest mb-1">
              <Flame className="w-4 h-4 text-amber-400" />
              {tico ? 'Top 3 Imperdibles de Costa Rica' : 'Top 3 Must-Do Experiences'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {tico ? 'Experiencias Estrella Garantizadas' : 'Signature Costa Rica Highlights'}
            </h2>
          </div>

          <button
            onClick={() => onNavigateTab('tours')}
            className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer group"
          >
            <span>{tico ? 'Ver los 20+ tours oficiales' : 'View all 20+ official tours'}</span>
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
                onClick={() => onSelectTour(tour)}
                className="group relative rounded-3xl bg-emerald-900/30 border border-emerald-500/20 overflow-hidden shadow-xl hover:border-amber-400/50 cursor-pointer flex flex-col justify-between"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={tour.image}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-transparent to-black/30" />
                  
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-emerald-950/80 backdrop-blur-md text-emerald-300 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {tour.rating} ({tour.reviewsCount})
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="bg-amber-500 text-white text-[11px] font-black uppercase px-3 py-1 rounded-full shadow-lg">
                      {formatCurrency(tour.priceUSD, currency)}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-xs font-bold text-emerald-200/90 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
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
                    <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2 mt-1.5">
                      {desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-emerald-900/60 flex items-center justify-between">
                    <div className="text-[11px] text-emerald-300 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{tico ? 'Cancelación Gratuita 48h' : 'Free 48h Cancel'}</span>
                    </div>

                    <span className="text-xs font-black text-amber-400 group-hover:underline flex items-center gap-1">
                      {tico ? 'Ver Tour' : 'View Tour'} &rarr;
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 3. Official Guarantee & Receptive Quality Strip */}
      <section className="bg-gradient-to-r from-emerald-950/90 via-emerald-900/50 to-emerald-950/90 rounded-3xl p-6 sm:p-7 border border-emerald-500/30 backdrop-blur-md shadow-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-400/40 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-tight">{tico ? 'Agencia Receptiva' : 'Official Agency'}</h4>
              <p className="text-[11px] text-emerald-200/75 leading-tight mt-0.5">{tico ? 'Guías ICT y pólizas de seguro al día' : 'ICT certified guides & full liability insurance'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-400/40 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-tight">{tico ? 'Tarifa Oficial Directa' : 'Official Rate'}</h4>
              <p className="text-[11px] text-emerald-200/75 leading-tight mt-0.5">{tico ? 'Sin sobreprecios ni costos ocultos' : 'Direct rates with zero hidden markups'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 flex items-center justify-center shrink-0 border border-teal-400/40 text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-tight">{tico ? 'Voucher QR Inmediato' : 'Instant QR Voucher'}</h4>
              <p className="text-[11px] text-emerald-200/75 leading-tight mt-0.5">{tico ? 'Confirmación digital y soporte directo' : 'Instant confirmation with digital voucher'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-400/40 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-tight">{tico ? 'Cancelación Flexible' : 'Flexible Refund'}</h4>
              <p className="text-[11px] text-emerald-200/75 leading-tight mt-0.5">{tico ? 'Reembolso 100% hasta 48h antes' : '100% refund up to 48 hours prior'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 col-span-2 md:col-span-4 lg:col-span-1">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 flex items-center justify-center shrink-0 border border-yellow-400/40 text-yellow-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-tight">{tico ? 'Asistencia Tica 24/7' : '24/7 Concierge'}</h4>
              <p className="text-[11px] text-emerald-200/75 leading-tight mt-0.5">{tico ? 'Atención local vía WhatsApp' : 'Local WhatsApp support in destination'}</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
