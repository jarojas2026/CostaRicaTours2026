import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Sparkles, Compass, Map, CalendarDays, ArrowRight,
  Plane, ShieldCheck, WandSparkles, BriefcaseBusiness
} from 'lucide-react';
import type { Language } from '../types';

interface TravelerCommandBarProps {
  language: Language;
  activeTab: string;
  onNavigate: (path: string) => void;
  onOpenTripBuilder: () => void;
  compact?: boolean;
}

export const TravelerCommandBar: React.FC<TravelerCommandBarProps> = ({
  language,
  activeTab,
  onNavigate,
  onOpenTripBuilder,
  compact = false
}) => {
  const es = language === 'es';
  const prefersReducedMotion = useReducedMotion();
  const actions = [
    {
      id: 'explore',
      icon: Compass,
      title: es ? 'Explorar experiencias' : 'Explore experiences',
      text: es ? 'Tours, aventura, naturaleza y cultura' : 'Tours, adventure, nature and culture',
      action: () => onNavigate('/tours'),
      accent: 'emerald'
    },
    {
      id: 'map',
      icon: Map,
      title: es ? 'Explorar por mapa' : 'Explore by map',
      text: es ? 'Descubre regiones y actividades cerca' : 'Discover regions and nearby activities',
      action: () => onNavigate('/map'),
      accent: 'sky'
    },
    {
      id: 'planner',
      icon: WandSparkles,
      title: es ? 'Crear mi viaje' : 'Build my trip',
      text: es ? 'Combina días, personas y experiencias' : 'Combine days, travelers and experiences',
      action: onOpenTripBuilder,
      accent: 'amber'
    },
    {
      id: 'trip',
      icon: BriefcaseBusiness,
      title: es ? 'Mi viaje' : 'My trip',
      text: es ? 'Checklist, presupuesto y notas' : 'Checklist, budget and notes',
      action: () => onNavigate('/trip'),
      accent: 'teal'
    },
    {
      id: 'ai',
      icon: Sparkles,
      title: es ? 'Preguntar a la IA' : 'Ask the AI',
      text: es ? 'Recomendaciones según tu viaje' : 'Recommendations for your trip',
      action: () => onNavigate('/ai'),
      accent: 'violet'
    },
    {
      id: 'tools',
      icon: ShieldCheck,
      title: es ? 'Herramientas del viajero' : 'Traveler tools',
      text: es ? 'Transporte, vuelos y ayuda práctica' : 'Transport, flights and practical help',
      action: () => onNavigate('/tools'),
      accent: 'cyan'
    }
  ];

  if (compact) {
    const compactActions = actions.filter((item) => ['explore', 'map', 'planner', 'trip'].includes(item.id));
    return (
      <nav
        aria-label={es ? 'Navegación rápida del viaje' : 'Quick trip navigation'}
        className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 relative z-30"
      >
        <div className="rounded-2xl border border-emerald-500/15 bg-[#061a12]/95 p-2 shadow-lg">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {compactActions.map((item) => {
              const Icon = item.icon;
              const active = (item.id === 'explore' && activeTab === 'tours') ||
                (item.id === 'map' && activeTab === 'map') ||
                (item.id === 'trip' && activeTab === 'trip');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  aria-current={active ? 'page' : undefined}
                  className={`min-w-0 min-h-[44px] rounded-xl px-2.5 py-2 flex items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 transition-colors ${active ? 'bg-emerald-400/15 text-emerald-100 ring-1 ring-inset ring-emerald-400/35' : 'text-stone-300 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <Icon size={16} className="text-emerald-300" />
                  </span>
                  <span className="min-w-0 text-[11px] sm:text-xs font-black leading-tight">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative z-30">
      <div className="rounded-[2rem] border border-white/10 bg-[#071d15]/90 backdrop-blur-2xl shadow-2xl shadow-black/20 overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-[10px] font-black uppercase tracking-[0.22em]">
              <Sparkles size={13} />
              {es ? 'Centro de viaje inteligente' : 'Smart travel hub'}
            </div>
            <h2 className="mt-1 text-xl sm:text-2xl font-black text-white tracking-tight">
              {es ? 'Todo lo que necesitas para organizar Costa Rica' : 'Everything you need to plan Costa Rica'}
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-400">
            <Plane size={14} className="text-amber-300" />
            {es ? 'Desde inspiración hasta reserva' : 'From inspiration to booking'}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-px bg-white/5">
          {actions.map((item, index) => {
            const Icon = item.icon;
            const active = (item.id === 'explore' && activeTab === 'tours') ||
              (item.id === 'map' && activeTab === 'map') ||
              (item.id === 'ai' && activeTab === 'ai') ||
              (item.id === 'tools' && activeTab === 'tools') ||
              (item.id === 'trip' && activeTab === 'trip');
            return (
              <motion.button
                key={item.id}
                type="button"
                whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                onClick={item.action}
                aria-current={active ? 'page' : undefined}
                className={`group min-h-[44px] text-left p-4 sm:p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-emerald-300 bg-[#061a12] hover:bg-[#0a261b] transition-all ${active ? 'ring-1 ring-inset ring-emerald-400/50 bg-emerald-950/30' : ''}`}
                aria-label={item.title}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Icon size={19} className="text-emerald-300 group-hover:text-white transition-colors" />
                  </span>
                  <ArrowRight size={15} className="text-stone-600 group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="mt-4 text-sm font-black text-white">{item.title}</div>
                <div className="mt-1 text-[11px] leading-relaxed text-stone-500">{item.text}</div>
              </motion.button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-white/5 bg-black/10">
          <div className="flex items-center gap-2 text-[11px] text-stone-400">
            <CalendarDays size={14} className="text-emerald-300" />
            {es ? 'Puedes empezar sin saber exactamente qué reservar.' : 'You can start without knowing exactly what to book.'}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/itinerary')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg text-[11px] font-black text-amber-300 hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 transition-colors"
          >
            {es ? 'Abrir planificador avanzado' : 'Open advanced planner'}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
};
