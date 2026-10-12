import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, Compass, Globe2, Users } from 'lucide-react';
import type { Language } from '../types';

/** Small entrance to the city; does not replace the travel-first home page. */
export function DigitalCityGateway({ language }: { language: Language }) {
  const es = language === 'es';
  return <section aria-label={es ? 'Acceso a la ciudad digital' : 'Digital city entrance'} className="mx-auto w-full max-w-7xl px-4 sm:px-6">
    <div className="relative isolate grid items-center gap-5 overflow-hidden rounded-[28px] border border-amber-400/35 bg-[#0a2a20] p-5 shadow-[0_15px_45px_rgba(0,0,0,.18)] sm:p-8 lg:grid-cols-[1.3fr_.7fr]">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden="true"
        style={{ backgroundImage: 'radial-gradient(circle at 90% 20%, rgba(245,158,11,.14), transparent 48%), repeating-linear-gradient(90deg,rgba(52,211,153,.07) 0px,rgba(52,211,153,.07) 1px,transparent 1px,transparent 48px)' }}/>
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-amber-200"><Globe2 size={17} aria-hidden="true"/>{es ? 'Nueva dimensión del proyecto' : 'A new dimension of the project'}</div>
        <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">{es ? 'Conoce el plano de nuestra ciudad digital.' : 'Explore our digital city masterplan.'}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-200">
          {es
            ? 'Una plaza central conecta turismo, destinos, comunidades, movilidad, planificación y asistencia IA. Explora lo que ya funciona y descubre cómo solicitar participación.'
            : 'A central plaza connects travel, destinations, communities, mobility, planning and AI assistance. Explore existing services and learn how to apply.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/ciudad" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-stone-950 hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <Compass size={17} aria-hidden="true"/>{es ? 'Recorrer la ciudad' : 'Explore the city'}<ArrowUpRight size={16} aria-hidden="true"/>
          </Link>
          <Link to="/participar" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-emerald-300/35 bg-black/20 px-4 py-3 text-sm font-semibold text-emerald-50 hover:border-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <Users size={17} aria-hidden="true"/>{es ? 'Presentar una solicitud' : 'Apply to join'}
          </Link>
        </div>
      </div>
      <div className="relative min-h-40 rounded-2xl border border-emerald-300/20 bg-black/20 p-4" aria-hidden="true">
        <div className="absolute left-4 top-4 h-12 w-[44%] rounded-xl border border-amber-300/40 bg-amber-300/10"/>
        <div className="absolute right-4 top-4 h-12 w-[32%] rounded-xl border border-emerald-300/30 bg-emerald-300/10"/>
        <div className="absolute left-4 bottom-4 h-12 w-[32%] rounded-xl border border-emerald-300/30 bg-emerald-300/10"/>
        <div className="absolute right-4 bottom-4 h-12 w-[44%] rounded-xl border border-amber-300/40 bg-amber-300/10"/>
        <div className="absolute inset-0 grid place-items-center"><div className="flex h-20 w-20 rotate-45 items-center justify-center rounded-2xl border-2 border-amber-300/60 bg-[#104632] shadow-xl"><Building2 size={29} className="-rotate-45 text-amber-200"/></div></div>
        <div className="absolute left-1/2 top-2 h-4 w-px -translate-x-1/2 bg-amber-300/40"/>
        <div className="absolute left-1/2 bottom-2 h-4 w-px -translate-x-1/2 bg-amber-300/40"/>
      </div>
    </div>
  </section>;
}
