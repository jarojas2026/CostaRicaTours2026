import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, Workflow } from 'lucide-react';
import { auth } from '../firebase';
import type { Language } from '../types';

type Status =
  | 'queued' | 'running' | 'waiting_approval' | 'completed'
  | 'failed' | 'cancelled' | 'revoked';
type Run = {
  id: string;
  agentId: string;
  objective: string;
  status: Status;
  createdAt: string | null;
  updatedAt: string | null;
  durationMs: number | null;
  errorCode: string | null;
  lastStepSequence: number;
};
type Approval = { id: string; action: string; status: string; summary: string; createdAt: string | null };
type Plan = { id: string; status: string; delegatedTasks: number; awaitingApproval: number; createdAt: string | null };
type MissionSnapshot = {
  generatedAt: string;
  overallState: 'unavailable' | 'sample' | 'partial';
  limits: { runs: number; approvals: number; plans: number };
  sources: { runs: string; approvals: string; plans: string };
  runs: Run[];
  runSample: null | { sampled: number; byStatus: Record<Status, number>; unfinishedInSample: number };
  approvals: Approval[];
  plans: Plan[];
};

function DateTime({ value, language }: { value: string | null; language: Language }) {
  if (!value) return <>—</>;
  const date = new Date(value);
  return <>{Number.isFinite(date.getTime()) ? date.toLocaleString(language === 'es' ? 'es-CR' : 'en-US') : '—'}</>;
}

function Metric({ label, value }: { label: string; value: number | string | null | undefined }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
    <div className="text-2xl font-black text-white">{value ?? '—'}</div>
    <div className="mt-1 text-sm text-stone-300">{label}</div>
  </div>;
}

export function MissionControlPanel({ language }: { language: Language }) {
  const es = language === 'es';
  const [snapshot, setSnapshot] = useState<MissionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error(es ? 'Inicia sesión como propietario.' : 'Sign in as the owner.');
      const headers = { Authorization: 'Bearer ' + await user.getIdToken() };
      if (signal?.aborted) return;
      const response = await fetch('/api/admin/mission-control', { headers, signal });
      if (!response.ok) throw new Error(response.status === 403
        ? es ? 'Esta vista requiere acceso del propietario.' : 'Owner access required.'
        : es ? 'No fue posible consultar los procesos.' : 'Unable to load workflows.');
      const result = await response.json() as MissionSnapshot;
      if (!signal?.aborted) setSnapshot(result);
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Error');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [es]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const interval = window.setInterval(() => { void load(controller.signal); }, 60000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [load]);

  const statusLabel: Record<Status, string> = es ? {
    queued: 'En cola', running: 'En ejecución', waiting_approval: 'Esperando aprobación',
    completed: 'Completada', failed: 'Fallida', cancelled: 'Cancelada', revoked: 'Revocada',
  } : {
    queued: 'Queued', running: 'Running', waiting_approval: 'Awaiting approval',
    completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled', revoked: 'Revoked',
  };

  return <section className="space-y-6" aria-label={es ? 'Centro de misiones' : 'Mission Control'}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-black text-white"><Workflow size={25} className="text-amber-300" />{es ? 'Mission Control' : 'Mission Control'}</h2>
        <p className="mt-2 max-w-3xl text-sm text-stone-300">
          {es ? 'Ejecuciones persistidas en Firestore, planes JARVIS y aprobaciones. Las cifras son muestras acotadas, no totales globales.' : 'Firestore-backed runs, JARVIS plans and approvals. Counts are bounded samples, not enterprise-wide totals.'}
        </p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-300/40 px-4 py-2 text-sm font-bold text-amber-200 disabled:opacity-50">
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{es ? 'Actualizar' : 'Refresh'}
      </button>
    </div>

    {error && <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-950/20 p-4 text-sm text-rose-200">
      <AlertCircle size={16} className="mr-2 inline" />{error}
    </div>}
    {loading && !snapshot && <p className="text-stone-300">{es ? 'Consultando registros...' : 'Loading recorded events...'}</p>}
    {snapshot?.overallState === 'unavailable' && <div className="rounded-xl border border-amber-400/30 p-5 text-sm text-amber-100">
      {es ? 'Firestore no disponible: no se muestran valores cero ficticios.' : 'Firestore unavailable: no fictional zero values are displayed.'}
    </div>}
    {snapshot && snapshot.overallState !== 'unavailable' && <>
      <div className="flex flex-wrap items-center gap-2 text-sm text-stone-300">
        <ShieldCheck size={16} />
        <span>{es ? 'Actualizado' : 'Updated'}: <DateTime language={language} value={snapshot.generatedAt} /></span>
        <span className="ml-auto">{snapshot.overallState === 'partial' ? (es ? 'Fuentes parciales' : 'Partial sources') : (es ? 'Muestra observada' : 'Observed sample')}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label={es ? 'Runs observados' : 'Observed runs'} value={snapshot.runSample?.sampled ?? null} />
        <Metric label={es ? 'En curso o en espera (muestra)' : 'In progress/waiting (sample)'} value={snapshot.runSample?.unfinishedInSample ?? null} />
        <Metric label={es ? 'Fallidas (muestra)' : 'Failed (sample)'} value={snapshot.runSample?.byStatus.failed ?? null} />
        <Metric label={es ? 'Aprobaciones pendientes (muestra)' : 'Pending approvals (sample)'}
          value={snapshot.sources.approvals === 'observed' ? snapshot.approvals.filter(a => a.status === 'pending').length : null} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#071d15] p-5">
          <h3 className="flex items-center gap-2 text-xl font-bold text-white"><Activity size={19} />{es ? 'Últimas ejecuciones' : 'Recent runs'}</h3>
          {snapshot.sources.runs !== 'observed'
            ? <p className="mt-4 text-amber-200">{es ? 'Registro no disponible.' : 'Run ledger unavailable.'}</p>
            : snapshot.runs.length === 0
              ? <p className="mt-4 text-stone-300">{es ? 'No hay ejecuciones en el registro consultado.' : 'No runs in the queried ledger.'}</p>
              : <ul className="mt-4 max-h-[520px] space-y-2 overflow-auto">
                {snapshot.runs.map(run => <li key={run.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-bold text-white">{run.agentId}</span>
                    <span className="text-amber-200">{statusLabel[run.status] || run.status}</span>
                  </div>
                  <p className="mt-1 break-words text-sm text-stone-300">{run.objective || '—'}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
                    <span><Clock3 size={13} className="mr-1 inline" /><DateTime language={language} value={run.updatedAt} /></span>
                    <span>{es ? 'Pasos' : 'Steps'}: {run.lastStepSequence}</span>
                    {run.errorCode && <span className="text-rose-200">{run.errorCode}</span>}
                  </div>
                </li>)}
              </ul>}
        </div>
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#071d15] p-5">
            <h3 className="flex items-center gap-2 text-xl font-bold text-white"><ShieldCheck size={19} />{es ? 'Aprobaciones' : 'Approvals'}</h3>
            {snapshot.sources.approvals !== 'observed'
              ? <p className="mt-3 text-amber-200">{es ? 'Fuente no disponible.' : 'Source unavailable.'}</p>
              : snapshot.approvals.length === 0
                ? <p className="mt-3 text-stone-300">{es ? 'Sin solicitudes registradas en la muestra.' : 'No requests in the sampled records.'}</p>
                : <ul className="mt-3 max-h-60 space-y-2 overflow-auto">{snapshot.approvals.map(a =>
                  <li key={a.id} className="rounded-lg bg-black/20 p-3 text-sm">
                    <span className="font-semibold text-white">{a.action}</span><span className="float-right text-amber-200">{a.status}</span>
                    <p className="mt-1 break-words text-stone-300">{a.summary}</p>
                  </li>)}</ul>}
            <a href="/admin/ai-command" className="mt-3 inline-block text-sm font-semibold text-amber-300 hover:underline">
              {es ? 'Abrir sala de decisiones' : 'Open decisions room'}
            </a>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#071d15] p-5">
            <h3 className="flex items-center gap-2 text-xl font-bold text-white"><CheckCircle2 size={19} />{es ? 'Planes JARVIS' : 'JARVIS plans'}</h3>
            {snapshot.sources.plans !== 'observed' ? <p className="mt-3 text-amber-200">{es ? 'Fuente no disponible.' : 'Source unavailable.'}</p>
              : snapshot.plans.length === 0 ? <p className="mt-3 text-stone-300">{es ? 'No hay planes registrados en la muestra.' : 'No recorded plans in sample.'}</p>
              : <ul className="mt-3 max-h-60 space-y-2 overflow-auto">{snapshot.plans.map(p =>
                <li key={p.id} className="rounded-lg bg-black/20 p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2"><span className="font-bold text-white">{p.id.slice(0, 26)}</span><span className="text-amber-200">{p.status}</span></div>
                  <div className="mt-1 text-stone-300">{p.delegatedTasks} {es ? 'delegaciones' : 'delegations'} · {p.awaitingApproval} {es ? 'aprobaciones solicitadas' : 'approval requests'}</div>
                </li>)}</ul>}
          </div>
        </div>
      </div>
      <p className="text-sm text-stone-400">{es
        ? `Consultados hasta ${snapshot.limits.runs} runs, ${snapshot.limits.approvals} aprobaciones y ${snapshot.limits.plans} planes. No utilizar estas muestras para calcular totales históricos.`
        : `Queried up to ${snapshot.limits.runs} runs, ${snapshot.limits.approvals} approvals and ${snapshot.limits.plans} plans. Do not infer historical totals from these samples.`}</p>
    </>}
  </section>;
}
