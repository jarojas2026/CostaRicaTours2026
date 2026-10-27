import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ClipboardCheck } from 'lucide-react';
import type { Language, TourCategory, TourRegion } from '../types';
import { preparationHref } from '../utils/tripPreparation';

export function TravelPreparationEntry({language,region,activity,compact=false}:{language:Language;region?:TourRegion|'all';activity?:TourCategory|'all';compact?:boolean}) {
  const es=language==='es';
  return <section data-testid="travel-preparation-entry" className={`rounded-2xl border border-amber-300/20 bg-[#08251a] ${compact?'p-4':'mx-auto max-w-7xl p-5 sm:p-6'} text-stone-100`}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0 max-w-2xl"><h2 className={`${compact?'text-base':'text-xl'} font-bold text-amber-100`}>{es?'Un viaje mejor preparado':'A better-prepared trip'}</h2><p className="mt-2 text-sm leading-relaxed text-stone-300">{es?'Consulta información oficial y organiza pendientes, equipaje y recordatorios según tu viaje.':'Check official guidance and organize tasks, packing and reminders for your trip.'}</p></div>
      <div className="flex shrink-0 flex-wrap gap-2"><Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300/40 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300" to="/tools"><BookOpen size={16}/>{es?'Guía práctica':'Practical guide'}</Link><Link className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-bold text-stone-950 hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" to={preparationHref(region,activity)}><ClipboardCheck size={16}/>{es?'Preparar mi viaje':'Prepare my trip'}<ArrowRight size={14}/></Link></div>
    </div>
  </section>;
}
