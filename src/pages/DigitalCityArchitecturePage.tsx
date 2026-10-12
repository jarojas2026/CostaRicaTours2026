import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Bot, Building2, CheckCircle2, Compass, Globe2,
  Layers3, Map, MapPinned, Network, Plane, Route, ShieldCheck, Users, Waypoints
} from 'lucide-react';
import type { Language } from '../types';
import { CITY_DISTRICTS, type CityDistrict } from '../data/digitalCityDistricts';

const icons = { compass: Compass, map: Map, users: Users, plane: Plane, route: Route, bot: Bot };
const districts = [
  [CITY_DISTRICTS[0], CITY_DISTRICTS[1]],
  [CITY_DISTRICTS[2], CITY_DISTRICTS[3]],
  [CITY_DISTRICTS[4], CITY_DISTRICTS[5]]
] as const;

function DistrictCard({ district, es, selected, onSelect }: {
  district: CityDistrict;
  es: boolean;
  selected: boolean;
  onSelect: (id: CityDistrict['id']) => void
}) {
  const Icon = icons[district.icon];
  return <div className={`group relative flex h-full min-h-40 flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-colors duration-200 ${selected ? 'border-amber-300/70 bg-amber-500/10 shadow-[0_0_0_1px_rgba(252,211,77,.15)]' : 'border-emerald-400/15 bg-[#0a2b21] hover:border-emerald-300/45'}`}>
    <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full border border-emerald-200/10" aria-hidden="true"/>
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/80">
        <span className="rounded-md border border-emerald-300/20 px-1.5 py-1 text-amber-200">{district.number}</span>
        {es ? 'Distrito' : 'District'}
      </span>
      <Icon size={20} strokeWidth={1.6} className="text-amber-300" aria-hidden="true"/>
    </div>
    <div className="relative mt-5">
      <h3 className="text-base font-bold leading-tight text-white">{es ? district.titleEs : district.titleEn}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-emerald-50/70">{es ? district.descriptionEs : district.descriptionEn}</p>
    </div>
    <div className="relative mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={() => onSelect(district.id)}
        aria-pressed={selected}
        className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-stone-200 transition-colors hover:border-amber-300/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
        {es ? 'Ver en el plano' : 'View on plan'}
      </button>
      <Link to={district.href} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-amber-300 px-3 py-2 text-xs font-black text-stone-950 transition-colors hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        {es ? district.labelEs : district.labelEn}<ArrowUpRight size={14} aria-hidden="true"/>
      </Link>
    </div>
  </div>;
}

export function DigitalCityArchitecturePage({ language }: { language: Language }) {
  const es = language === 'es';
  const [selectedId, setSelectedId] = useState<CityDistrict['id']>('community');
  const selected = CITY_DISTRICTS.find(item => item.id === selectedId) || CITY_DISTRICTS[2];

  return <main id="contenido-ciudad" className="relative isolate mx-auto max-w-[1440px] overflow-hidden px-4 pb-20 pt-8 sm:px-6 lg:px-8">
    <div className="pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden="true"
      style={{ backgroundImage: 'linear-gradient(rgba(52,211,153,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,.06) 1px, transparent 1px)', backgroundSize: '38px 38px' }}/>
    <div className="pointer-events-none absolute -right-24 top-10 -z-10 h-80 w-80 rounded-full bg-emerald-700/20 blur-3xl" aria-hidden="true"/>

    <nav aria-label={es ? 'Ubicación en el sitio' : 'Breadcrumb'} className="mb-8 flex flex-wrap items-center gap-2 text-xs text-emerald-200/70">
      <Link className="min-h-11 content-center rounded-lg px-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300" to="/">{es ? 'Inicio' : 'Home'}</Link>
      <span aria-hidden="true">/</span><span aria-current="page" className="font-bold text-amber-200">{es ? 'Ciudad digital' : 'Digital city'}</span>
    </nav>

    <header className="grid items-end gap-7 lg:grid-cols-[1.4fr_.6fr]">
      <div className="space-y-5">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-900/40 px-3 py-2 text-xs font-bold uppercase tracking-[.16em] text-emerald-200">
          <Building2 size={16} aria-hidden="true"/>
          {es ? 'El plano maestro · Costa Rica' : 'The masterplan · Costa Rica'}
        </p>
        <h1 className="max-w-4xl text-4xl font-black leading-[1.05] text-white sm:text-5xl lg:text-6xl">
          {es ? 'Una ciudad para descubrir, conectar y construir.' : 'A city to discover, connect and build.'}
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-stone-200/85">
          {es
            ? 'Recorre un ecosistema digital inspirado en la estructura de una ciudad: distritos turísticos, comunidad, movilidad, planificación y asistencia. Cada entrada conecta con una función existente de Costa Rica Tours.'
            : 'Explore a digital ecosystem arranged like a city: travel, community, mobility, planning and assistance districts. Every entrance connects to an existing Costa Rica Tours feature.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/participar" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-stone-950 hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <Users size={17} aria-hidden="true"/>{es ? 'Ser parte de la ciudad' : 'Join the city'}<ArrowRight size={16} aria-hidden="true"/>
          </Link>
          <Link to="/tours" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-900/30 px-5 py-3 text-sm font-bold text-white hover:border-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            <Compass size={17} aria-hidden="true"/>{es ? 'Explorar experiencias' : 'Explore experiences'}
          </Link>
        </div>
      </div>
      <div className="rounded-3xl border border-emerald-300/20 bg-[#09271c]/90 p-5 text-sm text-stone-200">
        <p className="flex items-center gap-2 font-bold text-amber-200"><Layers3 size={18} aria-hidden="true"/>{es ? 'Capas de la ciudad' : 'City layers'}</p>
        <div className="mt-4 space-y-3">
          {[
            { n: '01', es: 'Explorar servicios y destinos', en: 'Discover services and places' },
            { n: '02', es: 'Solicitar participación', en: 'Apply to participate' },
            { n: '03', es: 'Verificación y operación supervisada', en: 'Verified and supervised operations' }
          ].map(layer => <div key={layer.n} className="flex gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
            <span className="text-xs font-black text-emerald-300">{layer.n}</span><span>{es ? layer.es : layer.en}</span>
          </div>)}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-stone-400">
          {es ? 'El último nivel depende de verificaciones, permisos y disponibilidad; no se habilita por registrarse.' : 'The last layer requires verification, authorization and availability; registration alone does not enable it.'}
        </p>
      </div>
    </header>

    <section aria-labelledby="plano-ciudad-heading" className="mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">{es ? 'Plano de orientación' : 'Orientation plan'}</span>
          <h2 id="plano-ciudad-heading" className="mt-1 text-2xl font-black text-white sm:text-3xl">{es ? 'Seis distritos. Una plaza central.' : 'Six districts. One central plaza.'}</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-200"><MapPinned size={16} aria-hidden="true"/>{es ? 'Plano conceptual, no geográfico' : 'Conceptual layout, not geographic'}</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,1.07fr)_minmax(0,1fr)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {districts[0].map(d => <DistrictCard key={d.id} district={d} es={es} selected={selectedId===d.id} onSelect={setSelectedId}/>)}
        </div>
        <div className="relative isolate flex min-h-[440px] flex-col justify-between overflow-hidden rounded-[28px] border border-amber-300/40 bg-[#092d23] p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-55" aria-hidden="true"
            style={{ background: 'repeating-linear-gradient(45deg,transparent 0px,transparent 34px,rgba(251,191,36,.05) 35px,transparent 36px), radial-gradient(circle at 50% 45%, rgba(16,185,129,.27), transparent 58%)' }}/>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.15em] text-amber-200"><Network size={16} aria-hidden="true"/>{es ? 'Plaza central' : 'Central plaza'}</span>
            <span className="text-[10px] uppercase tracking-widest text-stone-300">CRT · 2026</span>
          </div>

          <div className="relative mx-auto my-6 flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
            <div className="absolute inset-0 rounded-full border border-dashed border-amber-200/40" aria-hidden="true"/>
            <div className="absolute inset-5 rounded-full border border-emerald-200/30" aria-hidden="true"/>
            <div className="absolute inset-10 rotate-45 rounded-[26px] border border-amber-300/60 bg-[#0c3d2e] shadow-[0_0_45px_rgba(52,211,153,.12)]" aria-hidden="true"/>
            <div className="relative z-10 flex max-w-40 flex-col items-center gap-2 text-center">
              <Globe2 size={32} strokeWidth={1.5} className="text-amber-200" aria-hidden="true"/>
              <b className="text-lg leading-tight text-white">Costa Rica<br/>Tours</b>
              <span className="text-[10px] font-semibold uppercase tracking-[.13em] text-emerald-200">{es ? 'Ecosistema conectado' : 'Connected ecosystem'}</span>
            </div>
          </div>

          <div aria-live="polite" className="rounded-2xl border border-amber-300/25 bg-black/35 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">{es ? 'Distrito seleccionado' : 'Selected district'} · {selected.number}</p>
            <h3 className="mt-1 text-lg font-bold text-white">{es ? selected.titleEs : selected.titleEn}</h3>
            <p className="mt-1 text-xs leading-relaxed text-emerald-100/80">{es ? selected.descriptionEs : selected.descriptionEn}</p>
            <Link to={selected.href} className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-amber-300 px-3 py-2 text-xs font-bold text-stone-950 hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
              {es ? selected.labelEs : selected.labelEn}<ArrowUpRight size={15} aria-hidden="true"/>
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {districts[1].map(d => <DistrictCard key={d.id} district={d} es={es} selected={selectedId===d.id} onSelect={setSelectedId}/>)}
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {districts[2].map(d => <DistrictCard key={d.id} district={d} es={es} selected={selectedId===d.id} onSelect={setSelectedId}/>)}
      </div>
    </section>

    <section aria-labelledby="confianza-ciudad" className="mt-12 grid gap-6 rounded-3xl border border-emerald-400/15 bg-[#061b14] p-6 md:grid-cols-[.8fr_1.2fr] md:p-8">
      <div>
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-emerald-300"><ShieldCheck size={16} aria-hidden="true"/>{es ? 'Una ciudad con reglas' : 'A city with rules'}</p>
        <h2 id="confianza-ciudad" className="mt-3 text-2xl font-black text-white">{es ? 'La confianza es parte de la arquitectura.' : 'Trust is part of the architecture.'}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-stone-200">
        <p><CheckCircle2 size={17} className="mr-2 inline text-emerald-300" aria-hidden="true"/>{es ? 'Cada solicitud de participación se mantiene privada hasta revisión.' : 'Every participation application stays private until review.'}</p>
        <p><CheckCircle2 size={17} className="mr-2 inline text-emerald-300" aria-hidden="true"/>{es ? 'Una ficha informativa no equivale a un proveedor verificado.' : 'An informational listing is not a verified supplier.'}</p>
        <p><CheckCircle2 size={17} className="mr-2 inline text-emerald-300" aria-hidden="true"/>{es ? 'Precios, cupos, pagos y confirmaciones requieren validación de sus sistemas.' : 'Prices, availability, payments and confirmations require system verification.'}</p>
        <p className="flex items-start gap-2 pt-2 text-xs text-stone-400"><Waypoints size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true"/>{es ? 'El plano organiza funciones existentes y no representa edificios reales, presencia institucional, convenios o establecimientos inventados.' : 'This diagram organizes existing features. It does not represent real buildings, official affiliations, agreements or invented businesses.'}</p>
      </div>
    </section>
  </main>;
}
