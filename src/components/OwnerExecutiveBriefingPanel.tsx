import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, BrainCircuit, CheckCircle2, ChevronDown, Clock3, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import type { Language } from '../types';

type Evidence = { path: string; value: number | null; quality: 'sample' | 'unverified' | 'unavailable' };
type Recommendation = {
  id: string;
  severity: 'critical' | 'attention' | 'information';
  department: string;
  title: { es: string; en: string };
  detail: { es: string; en: string };
  evidence: Evidence[];
  suggestedRoute: string;
  execution: 'proposal_only';
};
type Metric = Evidence;
type Briefing = {
  generatedAt: string | null;
  method: 'deterministic_evidence_review';
  execution: 'none';
  coverage: 'uncertified_bounded_sources';
  metrics: Record<string, Metric>;
  workforceSample: Array<{ status: string; count: number | null }> | null;
  recommendations: Recommendation[];
  factsNotCertified: string[];
};

const SEVERITY = {
  critical: { es: 'Crítica', en: 'Critical', className: 'border-rose-500/40 text-rose-200' },
  attention: { es: 'Atención', en: 'Attention', className: 'border-amber-500/40 text-amber-200' },
  information: { es: 'Información', en: 'Information', className: 'border-sky-500/40 text-sky-200' },
};
const DEPARTMENT_LABELS: Record<string, { es: string; en: string }> = {
  operations: { es: 'Operaciones', en: 'Operations' },
  sales: { es: 'Ventas', en: 'Sales' },
  agentops: { es: 'Agentes IA', en: 'AI workforce' },
  finance: { es: 'Finanzas', en: 'Finance' },
};

function Stat({ label, source }: { label: string; source?: Evidence }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
    <p className="text-2xl font-black text-white tabular-nums">{source?.value ?? '—'}</p>
    <p className="mt-1 text-sm font-semibold text-stone-200">{label}</p>
    <p className="mt-1 text-xs text-stone-400">{source?.quality || 'unavailable'}</p>
  </div>;
}

export function OwnerExecutiveBriefingPanel({ language }: { language: Language }) {
  const es = language === 'es';
  const [snapshot, setSnapshot] = useState<Briefing | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error(es ? 'Inicia sesión con la cuenta del propietario.' : 'Sign in with the owner account.');
      const token = await user.getIdToken();
      if (signal?.aborted) return;
      const response = await fetch('/api/admin/owner-briefing', {
        headers: { Authorization: 'Bearer ' + token },
        signal,
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(response.status === 403
        ? es ? 'Acceso reservado al propietario.' : 'Owner access required.'
        : es ? 'No se pudo consultar la gerencia.' : 'Unable to load executive briefing.');
      const data = await response.json() as Briefing;
      if (!signal?.aborted) setSnapshot(data);
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [es]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = window.setInterval(() => { void refresh(controller.signal); }, 60000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [refresh]);

  const shown = useMemo(
    () => (snapshot?.recommendations || []).filter(r => filter === 'all' || r.department === filter),
    [snapshot, filter]
  );
  const formatDate = (iso: string | null) =>
    iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toLocaleString(es ? 'es-CR' : 'en-US') : '—';

  return <section aria-label={es ? 'Gerencia ejecutiva JARVIS' : 'JARVIS executive office'} className="space-y-6">
    <div className="flex flex-wrap justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-amber-300">
          <BrainCircuit size={17} /> JARVIS PRIME
        </p>
        <h2 className="mt-2 text-3xl font-black text-white">{es ? 'Gerencia ejecutiva' : 'Executive management'}</h2>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">{es
          ? 'Propuestas priorizadas con evidencia disponible. Ninguna se ejecuta automáticamente desde esta vista.'
          : 'Evidence-linked, prioritized recommendations. None is automatically executed from this view.'}</p>
      </div>
      <button onClick={() => void refresh()} disabled={loading} type="button"
        className="inline-flex h-fit items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-50">
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{es ? 'Actualizar' : 'Refresh'}
      </button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/25 p-4 text-sm text-rose-200">{error}</p>}
    {loading && !snapshot && <p className="text-stone-300">{es ? 'Recopilando evidencias...' : 'Loading available evidence...'}</p>}
    {snapshot && <>
      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
        <span className="inline-flex items-center gap-1"><Clock3 size={14} />{formatDate(snapshot.generatedAt)}</span>
        <span className="rounded-md border border-amber-500/30 px-2 py-1 text-amber-200">{es ? 'Datos no certificados' : 'Uncertified data'}</span>
        <span className="inline-flex items-center gap-1"><ShieldCheck size={14} />{es ? 'Solo lectura' : 'Read only'}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label={es ? 'Alertas críticas' : 'Critical alerts'} source={snapshot.metrics.alerts} />
        <Stat label={es ? 'Reservas pendientes' : 'Pending bookings'} source={snapshot.metrics.pending} />
        <Stat label={es ? 'Listos para cotizar · muestra' : 'Quote-ready · sample'} source={snapshot.metrics.ready} />
        <Stat label={es ? 'Agentes sin señal · muestra' : 'Agents without signal · sample'} source={snapshot.metrics.noSignal} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-[#071d15] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-xl font-bold text-white"><TrendingUp size={20} />{es ? 'Prioridades sugeridas' : 'Suggested priorities'}</h3>
            <div className="relative">
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-3 text-stone-400" />
              <select aria-label={es ? 'Filtrar departamento' : 'Filter department'} value={filter} onChange={event => setFilter(event.target.value)}
                className="appearance-none rounded-lg border border-white/20 bg-stone-900 py-2 pl-3 pr-8 text-sm text-white">
                <option value="all">{es ? 'Todos los departamentos' : 'All departments'}</option>
                {Object.entries(DEPARTMENT_LABELS).map(([id, v]) => <option key={id} value={id}>{es ? v.es : v.en}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {shown.length === 0 && <p className="text-sm text-stone-300">{es ? 'Sin recomendaciones para este filtro.' : 'No proposals for this filter.'}</p>}
            {shown.map(r => {
              const tone = SEVERITY[r.severity];
              const dept = DEPARTMENT_LABELS[r.department];
              return <article key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap gap-2">
                  <span className={'rounded-md border px-2 py-0.5 text-xs ' + tone.className}>{es ? tone.es : tone.en}</span>
                  <span className="text-xs text-stone-400">{dept ? (es ? dept.es : dept.en) : r.department}</span>
                </div>
                <h4 className="mt-2 text-base font-bold text-white">{es ? r.title.es : r.title.en}</h4>
                <p className="mt-2 text-sm leading-relaxed text-stone-300">{es ? r.detail.es : r.detail.en}</p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-400">
                  {r.evidence.map(e => <span key={e.path}>{e.path}: {e.value ?? '—'} ({e.quality})</span>)}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-stone-400">{es ? 'Propuesta · no ejecutada' : 'Proposal · not executed'}</span>
                  <Link to={r.suggestedRoute} className="inline-flex items-center gap-1 text-sm font-bold text-amber-200 hover:underline">
                    {es ? 'Investigar' : 'Investigate'} <ArrowUpRight size={15}/>
                  </Link>
                </div>
              </article>;
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#071d15] p-5">
            <h3 className="flex items-center gap-2 text-xl font-bold text-white"><BrainCircuit size={20}/>{es ? 'Fuerza laboral digital' : 'Digital workforce'}</h3>
            {!snapshot.workforceSample ? <p className="mt-3 text-sm text-stone-300">{es ? 'Telemetría de agentes no disponible.' : 'Agent telemetry unavailable.'}</p> : <div className="mt-4 space-y-4">
              {snapshot.workforceSample.map(item => {
                const max = Math.max(1,...(snapshot.workforceSample || []).map(x => x.count ?? 0));
                const percent = item.count === null ? 0 : Math.max(0,Math.min(100,item.count / max * 100));
                return <div key={item.status}>
                  <div className="mb-1 flex justify-between text-sm text-stone-300"><span>{item.status.replaceAll('_', ' ')}</span><b>{item.count ?? '—'}</b></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: percent + '%' }} /></div>
                </div>;
              })}
              <p className="text-xs text-stone-400">{es ? 'Estados de una muestra de agentes con heartbeat; no representan horas trabajadas.' : 'Sampled agent heartbeat states; not hours worked.'}</p>
            </div>}
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-[#071d15] p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white"><AlertTriangle size={19}/>{es ? 'Información aún no certificada' : 'Uncertified information'}</h3>
            <p className="mt-2 text-sm text-stone-300">{es ? 'JARVIS no puede inferir de este resumen cobros conciliados, utilidad, capacidad de proveedor ni éxito global de procesos.' : 'This briefing cannot certify payments, profit, provider availability or global workflow health.'}</p>
            <ul className="mt-3 space-y-1 text-xs text-stone-400">
              {snapshot.factsNotCertified.map(v => <li key={v}>• {v}</li>)}
            </ul>
          </div>
          <Link to="/admin/ai-command" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm font-bold text-amber-200">
            <CheckCircle2 size={16} />{es ? 'Abrir sala de mando JARVIS' : 'Open JARVIS command room'}
          </Link>
        </div>
      </div>
    </>}
  </section>;
}
