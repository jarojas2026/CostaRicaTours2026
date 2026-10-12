import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bot, Building2, Compass, Globe2, MapPinned, Route, ShieldCheck, Sparkles, Users } from 'lucide-react';
import type { Language } from '../types';

type Audience = {
  key: string;
  icon: typeof Compass;
  eyebrowEs: string;
  eyebrowEn: string;
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
  href: string;
  ctaEs: string;
  ctaEn: string;
  accent: string;
};

export const CITY_AUDIENCES: readonly Audience[] = [
  {
    key: 'travelers', icon: Compass, eyebrowEs: 'Para viajeros', eyebrowEn: 'For travelers',
    titleEs: 'Descubre tu próxima experiencia', titleEn: 'Find your next experience',
    bodyEs: 'Explora tours y actividades reales del catálogo. Consulta los detalles antes de solicitar una reserva.',
    bodyEn: 'Browse tours and activities from the existing catalog. Check the details before requesting a booking.',
    href: '/tours', ctaEs: 'Explorar experiencias', ctaEn: 'Explore experiences', accent: 'from-emerald-500/25'
  },
  {
    key: 'planning', icon: Route, eyebrowEs: 'Para quienes planean', eyebrowEn: 'For trip planners',
    titleEs: 'Diseña un viaje a tu medida', titleEn: 'Design a trip around you',
    bodyEs: 'Organiza destinos e itinerarios con asistencia. Cada propuesta requiere comprobación operativa.',
    bodyEn: 'Organize destinations and itineraries with guidance. Every proposal needs operational verification.',
    href: '/itinerary', ctaEs: 'Planificar mi viaje', ctaEn: 'Plan my trip', accent: 'from-sky-500/25'
  },
  {
    key: 'partners', icon: Building2, eyebrowEs: 'Para operadores y negocios', eyebrowEn: 'For operators and businesses',
    titleEs: 'Haz que conozcamos tu proyecto', titleEn: 'Introduce your business',
    bodyEs: 'Solicita participar en la ciudad digital. La revisión no garantiza publicación ni ventas.',
    bodyEn: 'Apply to join the digital city. Review does not guarantee a listing or sales.',
    href: '/participar', ctaEs: 'Solicitar participación', ctaEn: 'Apply to participate', accent: 'from-amber-500/25'
  }
] as const;

/** Audience-first orientation; all links lead to existing public routes. */
export function DigitalCityAudienceHub({ language, compact = false }: { language: Language; compact?: boolean }) {
  const es = language === 'es';
  return <section aria-labelledby={compact ? 'city-audience-home' : 'city-audience-main'} className="mx-auto w-full max-w-7xl px-4 sm:px-6">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.17em] text-amber-300"><Sparkles size={16} aria-hidden="true"/>{es ? 'Tu puerta de entrada' : 'Your starting point'}</p>
        <h2 id={compact ? 'city-audience-home' : 'city-audience-main'} className="mt-2 text-2xl font-black text-white sm:text-3xl">{es ? '¿Qué quieres hacer hoy?' : 'What would you like to do today?'}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-300">{es ? 'Elige tu objetivo y te llevamos directamente a la sección indicada.' : 'Choose your goal and go straight to the right section.'}</p>
      </div>
      {compact && <Link to="/ciudad" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/40 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
        <Globe2 size={17} aria-hidden="true"/>{es ? 'Conocer la ciudad digital' : 'Explore the digital city'}<ArrowUpRight size={16} aria-hidden="true"/>
      </Link>}
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {CITY_AUDIENCES.map((audience, index) => {
        const Icon = audience.icon;
        return <article key={audience.key} className={`group relative isolate flex min-h-64 flex-col justify-between overflow-hidden rounded-[26px] border border-white/15 bg-[#0b2b23] p-6 shadow-[0_14px_38px_rgba(0,0,0,.14)] transition-colors hover:border-amber-300/60`}>
          <div aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${audience.accent} via-transparent to-transparent`}/>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[.13em] text-amber-200">{es ? audience.eyebrowEs : audience.eyebrowEn}</span>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10"><Icon size={24} className="text-amber-200" aria-hidden="true"/></span>
          </div>
          <div className="mt-5">
            <h3 className="text-xl font-black leading-tight text-white">{es ? audience.titleEs : audience.titleEn}</h3>
            <p className="mt-3 text-sm leading-relaxed text-emerald-50/80">{es ? audience.bodyEs : audience.bodyEn}</p>
          </div>
          <Link to={audience.href} className="mt-5 inline-flex min-h-12 w-fit items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-stone-950 hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            {es ? audience.ctaEs : audience.ctaEn}<ArrowRight size={16} aria-hidden="true"/>
          </Link>
          <span className="pointer-events-none absolute bottom-4 right-5 text-5xl font-black text-white/5" aria-hidden="true">0{index + 1}</span>
        </article>;
      })}
    </div>
    {!compact && <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 rounded-2xl border border-emerald-400/20 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-100">
      <span className="inline-flex items-center gap-2"><MapPinned size={16} className="text-amber-300" aria-hidden="true"/>{es ? 'Explora destinos en el mapa turístico' : 'Explore destinations on the travel map'} <Link to="/map" className="underline underline-offset-4 hover:text-amber-200">{es ? 'Ver mapa' : 'View map'}</Link></span>
      <span className="inline-flex items-center gap-2"><Bot size={16} className="text-amber-300" aria-hidden="true"/>{es ? '¿Necesitas orientación?' : 'Need guidance?'} <Link to="/ai" className="underline underline-offset-4 hover:text-amber-200">{es ? 'Hablar con la IA' : 'Talk to AI'}</Link></span>
      <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-amber-300" aria-hidden="true"/>{es ? 'Cupos, precios y proveedores requieren verificación.' : 'Availability, pricing and providers require verification.'}</span>
    </div>}
  </section>;
}
