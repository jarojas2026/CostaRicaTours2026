import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, CalendarCheck2, ClipboardCheck, Compass, HeartHandshake, MessageCircleQuestion, ShieldCheck, Users } from 'lucide-react';
import type { Language } from '../types';

export const CITY_SERVICE_STEPS = [
  { id: 'discover', es: 'Descubre', en: 'Discover', detailEs: 'Explora experiencias y destinos del catálogo.', detailEn: 'Browse experiences and destinations from the catalog.' },
  { id: 'advise', es: 'Consulta', en: 'Ask', detailEs: 'La IA te orienta según tus preguntas y preferencias.', detailEn: 'AI guidance adapts to your questions and preferences.' },
  { id: 'plan', es: 'Planifica', en: 'Plan', detailEs: 'Construye una propuesta de itinerario.', detailEn: 'Build a proposed itinerary.' },
  { id: 'verify', es: 'Verifica', en: 'Verify', detailEs: 'Precio, cupo y proveedor deben comprobarse antes de confirmar.', detailEn: 'Price, availability and provider must be checked before confirmation.' }
] as const;

/** Explains the existing sales and assistance journey without implying a booking was made. */
export function DigitalCityServiceJourney({ language }: { language: Language }) {
  const es = language === 'es';
  return <section aria-labelledby="city-service-journey" className="mx-auto w-full max-w-7xl px-4 sm:px-6">
    <div className="relative overflow-hidden rounded-[30px] border border-emerald-300/25 bg-[#061e18] p-6 sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden="true"/>
      <div className="relative grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-amber-300"><HeartHandshake size={18} aria-hidden="true"/>{es ? 'Atención que acompaña' : 'Guidance at every step'}</p>
          <h2 id="city-service-journey" className="mt-3 max-w-lg text-3xl font-black leading-tight text-white sm:text-4xl">
            {es ? 'Tu viaje empieza con una conversación.' : 'Your journey starts with a conversation.'}
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-stone-200">
            {es
              ? 'Cuéntanos qué buscas. El asistente puede ayudarte a explorar alternativas y preparar un plan. La disponibilidad, los precios y las reservas se verifican mediante los servicios correspondientes.'
              : 'Tell us what you are looking for. The assistant can help explore options and prepare a plan. Availability, prices and bookings must be verified by the relevant services.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/ai" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-stone-950 hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <Bot size={18} aria-hidden="true"/>{es ? 'Hablar con el asistente' : 'Talk to the assistant'}<ArrowRight size={16} aria-hidden="true"/>
            </Link>
            <Link to="/itinerary" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-emerald-300/35 px-5 py-3 text-sm font-bold text-emerald-50 hover:border-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
              <Compass size={17} aria-hidden="true"/>{es ? 'Crear itinerario' : 'Build an itinerary'}
            </Link>
          </div>
          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-emerald-100/70"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true"/>{es ? 'Una recomendación o cotización no constituye una reserva confirmada.' : 'A recommendation or quotation is not a confirmed booking.'}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {CITY_SERVICE_STEPS.map((step, index) => {
            const Icon = [Compass, MessageCircleQuestion, CalendarCheck2, ClipboardCheck][index];
            return <article key={step.id} className="rounded-2xl border border-white/10 bg-white/[.045] p-5">
              <div className="flex items-center justify-between"><span className="text-xs font-black tracking-widest text-amber-300">0{index+1}</span><Icon size={20} className="text-emerald-200" aria-hidden="true"/></div>
              <h3 className="mt-4 text-lg font-black text-white">{es ? step.es : step.en}</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-50/75">{es ? step.detailEs : step.detailEn}</p>
            </article>;
          })}
        </div>
      </div>
      <div className="relative mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2 text-sm text-emerald-100"><Users size={18} className="text-amber-300" aria-hidden="true"/>{es ? '¿Ofreces servicios turísticos?' : 'Do you provide tourism services?'}</div>
        <Link to="/participar" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-amber-200 underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
          {es ? 'Conoce cómo solicitar participación' : 'Learn how to apply'}<ArrowRight size={16} aria-hidden="true"/>
        </Link>
      </div>
    </div>
  </section>;
}
