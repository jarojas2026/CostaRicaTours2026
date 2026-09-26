import React, { useState } from 'react';
import { CalendarDays, Compass, Loader2, MapPinned, MessageCircle, PackageCheck, Route, Sparkles, Sun, Users, RefreshCw, Save } from 'lucide-react';
import { Language } from '../types';

export const FullTripJourneyBuilder: React.FC<{ language: Language }> = ({ language }) => {
  const es = language === 'es';
  const [form, setForm] = useState({ query: '', days: 7, travelers: 2, date: '', profile: 'relaxed', arrivalAirport: 'SJO' });
  const [journey, setJourney] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const journeyStorageKey = 'crt_journey_id';

  React.useEffect(() => {
    const id = localStorage.getItem(journeyStorageKey);
    if (!id) return;
    fetch(`/api/journey/${encodeURIComponent(id)}?sessionId=${encodeURIComponent(localStorage.getItem('crt_journey_session') || '')}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.journey?.status !== 'not_found') setJourney(data.journey); })
      .catch(() => undefined);
  }, []);
  async function build() {
    setLoading(true); setError('');
    try {
      const sessionId = localStorage.getItem('crt_journey_session') || 'traveler_' + crypto.randomUUID();
      localStorage.setItem('crt_journey_session', sessionId);
      const response = await fetch('/api/journey/build', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form,sessionId,language}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo construir el viaje');
      setJourney(data.journey);
      if (data.journey?.journeyId) localStorage.setItem(journeyStorageKey, data.journey.journeyId);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch(e:any){ setError(e?.message || 'Error'); } finally { setLoading(false); }
  }
  async function adapt() {
    if (!journey?.journeyId || loading) return;
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/journey/${encodeURIComponent(journey.journeyId)}/adapt`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form, language}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo adaptar el viaje');
      setJourney(data.journey);
      localStorage.setItem(journeyStorageKey, data.journey.journeyId);
      setSaved(true); setTimeout(() => setSaved(false), 1800);
    } catch(e:any){ setError(e?.message || 'Error'); } finally { setLoading(false); }
  }

  return <section className="rounded-[32px] border border-amber-400/20 bg-gradient-to-br from-[#071e14] via-[#061711] to-[#020a07] p-5 md:p-8 shadow-2xl">
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
      <div><div className="flex items-center gap-2 text-amber-300 text-[10px] font-black uppercase tracking-[0.2em]"><Sparkles size={15}/>{es?'Asistente de viaje completo':'Full-trip AI advisor'}</div>
      <h2 className="mt-2 text-2xl md:text-4xl font-black text-white">{es?'Construimos tu viaje paso a paso.':'We build your trip step by step.'}</h2>
      <p className="mt-2 max-w-3xl text-sm text-stone-300">{es?'Memoria, catálogo, clima, disponibilidad e itinerario trabajan juntos para ayudarte a reservar.':'Memory, catalog, weather, availability and itinerary work together to help you book.'}</p></div>
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-xs text-emerald-200">{es?'Solo mostramos disponibilidad confirmada cuando fue verificada.':'We only show confirmed availability when it was verified.'}</div>
    </div>
    <div className="mt-6 grid lg:grid-cols-12 gap-3">
      <label className="lg:col-span-5 rounded-2xl bg-black/20 border border-white/5 p-3"><span className="block text-[10px] font-black uppercase text-stone-500">{es?'Qué buscas':'What are you looking for?'}</span><input value={form.query} onChange={e=>setForm({...form,query:e.target.value})} placeholder={es?'Familia, naturaleza, playa y aventura...':'Family, nature, beach and adventure...'} className="mt-2 w-full bg-transparent outline-none text-white"/></label>
      <label className="rounded-2xl bg-black/20 border border-white/5 p-3"><span className="block text-[10px] text-stone-500"><CalendarDays size={13} className="inline"/> {es?'Días':'Days'}</span><input type="number" min="1" max="21" value={form.days} onChange={e=>setForm({...form,days:Number(e.target.value)})} className="mt-2 w-full bg-transparent text-white"/></label>
      <label className="rounded-2xl bg-black/20 border border-white/5 p-3"><span className="block text-[10px] text-stone-500"><Users size={13} className="inline"/> {es?'Viajeros':'Travelers'}</span><input type="number" min="1" max="50" value={form.travelers} onChange={e=>setForm({...form,travelers:Number(e.target.value)})} className="mt-2 w-full bg-transparent text-white"/></label>
      <label className="rounded-2xl bg-black/20 border border-white/5 p-3"><span className="block text-[10px] text-stone-500">{es?'Perfil':'Profile'}</span><select value={form.profile} onChange={e=>setForm({...form,profile:e.target.value})} className="mt-2 w-full bg-transparent text-white"><option value="relaxed">Relax</option><option value="family">Familia</option><option value="couple">Pareja</option><option value="adventure">Aventura</option><option value="wildlife">Fauna</option><option value="senior">Senior</option></select></label>
      <label className="rounded-2xl bg-black/20 border border-white/5 p-3"><span className="block text-[10px] text-stone-500">{es?'Fecha':'Date'}</span><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-2 w-full bg-transparent text-white"/></label>
      <button onClick={build} disabled={loading} className="lg:col-span-2 rounded-2xl bg-amber-400 px-4 py-3 font-black text-stone-950 disabled:opacity-60">{loading?<Loader2 className="mx-auto animate-spin"/>:<><Compass size={17} className="inline mr-2"/>{es?'Construir viaje':'Build trip'}</>}</button>
    </div>
    {error && <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-950/20 p-4 text-sm text-rose-200">{error}</div>}
    {journey && <div className="mt-6 grid xl:grid-cols-12 gap-4">
      <div className="xl:col-span-12 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3">
        <div className="flex items-center gap-3 text-xs"><span className="rounded-full bg-emerald-400/15 px-2 py-1 font-black text-emerald-300">v{journey.version || 1}</span><span className="text-stone-300">{es ? `Viaje ${journey.status === 'adapted' ? 'adaptado' : 'guardado'}` : `Journey ${journey.status === 'adapted' ? 'adapted' : 'saved'}`}</span>{saved && <span className="flex items-center gap-1 text-emerald-300"><Save size={13}/> {es ? 'Guardado' : 'Saved'}</span>}</div>
        <button onClick={adapt} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-200 hover:bg-amber-400/20 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>{es ? 'Adaptar este viaje' : 'Adapt this trip'}</button>
      </div>
      <div className="xl:col-span-8 space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-black/20 p-4"><Route className="text-emerald-300" size={18}/><div className="mt-2 text-xs text-stone-400">{es?'Ruta':'Route'}</div><b className="text-white text-sm">{(journey.planning?.regions || []).join(' → ')}</b></div>
          <div className="rounded-2xl bg-black/20 p-4"><Sun className="text-amber-300" size={18}/><div className="mt-2 text-xs text-stone-400">{es?'Clima':'Weather'}</div><b className="text-white text-sm">{journey.live?.weather?.length?(es?'Verificado en vivo':'Live verified'):(es?'Por verificar':'To verify')}</b></div>
          <div className="rounded-2xl bg-black/20 p-4"><MapPinned className="text-sky-300" size={18}/><div className="mt-2 text-xs text-stone-400">{es?'Estado comercial':'Sales stage'}</div><b className="text-white text-sm">{journey.sales?.stage}</b></div>
        </div>
        <div className="rounded-2xl bg-black/20 p-5"><h3 className="font-black text-white">{journey.itinerary?.title}</h3><p className="mt-1 text-xs text-stone-400">{journey.itinerary?.summary}</p><div className="mt-4 grid md:grid-cols-2 gap-2">{(journey.itinerary?.days || []).map((d:any)=><div key={d.day} className="rounded-xl border border-white/5 p-3"><b className="text-amber-300 text-xs">{es?'Día':'Day'} {d.day}</b><div className="mt-1 text-sm font-bold text-white">{d.title || d.activity || d.region}</div><div className="text-[10px] text-stone-500">{d.region || ''}</div></div>)}</div></div>
        <div className="rounded-2xl bg-black/20 p-5"><div className="flex items-center gap-2"><PackageCheck className="text-emerald-300" size={17}/><h3 className="font-black text-white">{es?'Equipaje recomendado':'Packing'}</h3></div><div className="mt-3 flex flex-wrap gap-2">{(journey.planning?.packing?.items || journey.planning?.packing?.essentials || []).slice(0,16).map((x:any,i:number)=><span key={i} className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-stone-300">{typeof x==='string'?x:(x.item||x.name||'')}</span>)}</div></div>
      </div>
      <aside className="xl:col-span-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5"><div className="text-[10px] font-black uppercase tracking-widest text-amber-300">{es?'Siguiente paso':'Next step'}</div><h3 className="mt-2 text-xl font-black text-white">{journey.sales?.nextAction}</h3><div className="mt-4 space-y-2">{(journey.catalog || []).slice(0,5).map((tour:any)=><div key={tour.id} className="rounded-xl bg-black/20 p-3"><div className="font-bold text-white text-sm">{es?tour.title:tour.titleEn}</div><div className="text-[10px] text-stone-400">${tour.priceUSD} · {tour.duration}</div></div>)}</div><a href="https://wa.me/50687959148" target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-black text-stone-950"><MessageCircle size={17}/>{es?'Continuar por WhatsApp':'Continue on WhatsApp'}</a></aside>
    </div>}
  </section>;
};
