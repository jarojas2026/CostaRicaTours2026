import React, { useMemo, useState } from 'react';
import { Compass, Luggage, ShieldCheck, Sparkles, Route, Loader2, MapPinned, CalendarDays, ShoppingCart } from 'lucide-react';
import { Language } from '../types';

type Action = 'trip_fit' | 'packing_list' | 'activity_safety_check' | 'route_strategy' | 'full_journey';

interface Props { language: Language; }

export const SmartTripAdvisor: React.FC<Props> = ({ language }) => {
  const es = language === 'es';
  const [days, setDays] = useState(7);
  const [profile, setProfile] = useState('family');
  const [query, setQuery] = useState('');
  const [action, setAction] = useState<Action>('trip_fit');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sessionId] = useState(() => 'traveler_' + Math.random().toString(36).slice(2, 12));

  const labels = useMemo(() => ({
    trip_fit: es ? 'Diseñar viaje' : 'Design trip',
    packing_list: es ? 'Equipaje inteligente' : 'Smart packing',
    activity_safety_check: es ? 'Revisión de actividad' : 'Activity check',
    route_strategy: es ? 'Ruta geográfica' : 'Route strategy',
    full_journey: es ? 'Construir viaje completo' : 'Build full journey'
  }), [es]);

  async function run() {
    setLoading(true);
    try {
      const payload =
        action === 'trip_fit'
          ? { query, days, profile }
          : action === 'packing_list'
            ? { activities: query.split(',').map(x => x.trim()).filter(Boolean), profile }
            : action === 'activity_safety_check'
              ? { activity: query || (es ? 'actividad de aventura' : 'adventure activity') }
              : action === 'full_journey'
          ? { query, days, travelers: 2, profile, language: es ? 'es' : 'en', sessionId }
          : { regions: query.split(',').map(x => x.trim()).filter(Boolean), days };
      const response = await fetch(action === 'full_journey' ? '/api/journey/build' : '/api/ai/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      setResult(action === 'full_journey' ? (data.journey || data) : data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-sky-200/70 bg-white px-5 py-7 shadow-[0_20px_55px_rgba(15,23,42,0.10)] sm:px-8 sm:py-9">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-100 blur-3xl" />
      <div className="relative z-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-800">
              <Sparkles className="h-3.5 w-3.5" /> AI Travel Intelligence
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {es ? 'Tu asesor inteligente de Costa Rica' : 'Your Costa Rica smart advisor'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {es ? 'Convierte tus preferencias en una guía práctica: destino, ruta, equipaje y revisión de actividad.' : 'Turn your preferences into practical guidance: destinations, route, packing and activity checks.'}
            </p>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700">
            {es ? 'Conocimiento experto + verificación en vivo' : 'Expert knowledge + live verification'}
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(labels) as Action[]).map(key => {
            const Icon = key === 'trip_fit' ? Compass : key === 'packing_list' ? Luggage : key === 'activity_safety_check' ? ShieldCheck : key === 'route_strategy' ? Route : Sparkles;
            return (
              <button key={key} type="button" onClick={() => { setAction(key); setResult(null); }}
                className={'rounded-2xl border px-3 py-3 text-left transition ' + (action === key ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-300')}>
                <Icon className="h-4 w-4 text-sky-700" />
                <div className="mt-2 text-xs font-black text-slate-900">{labels[key]}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[120px_180px_1fr_auto]">
          <label className="text-xs font-bold text-slate-600">
            {es ? 'Días' : 'Days'}
            <input type="number" min={1} max={21} value={days} onChange={e => setDays(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-sky-400" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            {es ? 'Perfil' : 'Profile'}
            <select value={profile} onChange={e => setProfile(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-sky-400">
              <option value="family">{es ? 'Familia' : 'Family'}</option>
              <option value="couple">{es ? 'Pareja' : 'Couple'}</option>
              <option value="adventure">{es ? 'Aventura' : 'Adventure'}</option>
              <option value="wildlife">{es ? 'Fauna' : 'Wildlife'}</option>
              <option value="relaxed">{es ? 'Relajado' : 'Relaxed'}</option>
              <option value="photography">{es ? 'Fotografía' : 'Photography'}</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            {action === 'route_strategy'
              ? (es ? 'Regiones separadas por coma' : 'Regions separated by commas')
              : action === 'packing_list'
                ? (es ? 'Actividades separadas por coma' : 'Activities separated by commas')
                : action === 'activity_safety_check'
                  ? (es ? 'Actividad' : 'Activity')
                  : (es ? '¿Qué quieres vivir en Costa Rica?' : 'What do you want to experience in Costa Rica?')}
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder={action === 'route_strategy' ? 'arenal, monteverde, manuel_antonio' : action === 'packing_list' ? 'playa, rafting, hiking' : action === 'activity_safety_check' ? 'canopy' : 'playa, fauna, termales...'}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
          </label>
          <button type="button" onClick={run} disabled={loading}
            className="self-end rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-60">
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : es ? 'Analizar' : 'Analyze'}
          </button>
        </div>

        {result && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {result.error ? (
              <p className="text-sm text-red-600">{result.error}</p>
            ) : action === 'full_journey' ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Journey {result.journeyId}</div>
                    <h3 className="mt-1 text-xl font-black text-slate-950">{result.itinerary?.title || (es ? 'Tu viaje en construcción' : 'Your trip in progress')}</h3>
                    <p className="mt-1 text-sm text-slate-600">{result.itinerary?.summary}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">
                    {result.sales?.stage || 'DISCOVERY'}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-3 border border-slate-200"><MapPinned className="h-4 w-4 text-emerald-700"/><div className="mt-2 text-xs font-black text-slate-900">{es ? 'Regiones' : 'Regions'}</div><div className="mt-1 text-xs text-slate-600">{(result.planning?.regions || []).join(' • ')}</div></div>
                  <div className="rounded-2xl bg-white p-3 border border-slate-200"><CalendarDays className="h-4 w-4 text-sky-700"/><div className="mt-2 text-xs font-black text-slate-900">{es ? 'Días' : 'Days'}</div><div className="mt-1 text-xs text-slate-600">{result.planning?.days || days}</div></div>
                  <div className="rounded-2xl bg-white p-3 border border-slate-200"><ShoppingCart className="h-4 w-4 text-amber-700"/><div className="mt-2 text-xs font-black text-slate-900">{es ? 'Siguiente paso' : 'Next step'}</div><div className="mt-1 text-xs text-slate-600">{result.sales?.nextAction}</div></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {(result.itinerary?.days || []).slice(0, 6).map((day: any) => (
                    <div key={day.day} className="rounded-2xl bg-white border border-slate-200 p-4">
                      <div className="text-[10px] font-black uppercase text-emerald-700">{es ? 'Día' : 'Day'} {day.day}</div>
                      <div className="mt-1 text-sm font-black text-slate-950">{day.title}</div>
                      <div className="mt-2 text-xs leading-5 text-slate-600">{day.morningActivity}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">{day.afternoonActivity}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-xs font-black text-emerald-900">{es ? 'Disponibilidad real' : 'Live availability'}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(result.live?.availability || []).map((x: any) => <span key={x.tourId} className="rounded-full bg-white border border-emerald-200 px-3 py-1 text-[10px] font-bold text-slate-700">{x.tourId}: {x.status || (x.available ? 'available' : 'verify')}</span>)}
                  </div>
                </div>
                <button type="button" onClick={() => window.location.assign('/tours')} className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white">{es ? 'Continuar a catálogo y reserva' : 'Continue to catalog & booking'}</button>
              </div>
            ) : (
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-700">{JSON.stringify(result, null, 2)}</pre>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
