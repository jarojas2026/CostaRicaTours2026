import React, { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, Clock3, Mail, RefreshCw, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import type { Language } from '../types';

type Props = { language: Language };

export default function EmailOperationsPage({ language }: Props) {
  const es = language === 'es';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/email-operations');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar el centro de correo.');
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sweep = async () => {
    setRunning(true);
    setError('');
    try {
      const res = await fetch('/api/admin/email-operations/sweep', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo ejecutar el agente.');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setRunning(false);
    }
  };

  const events = data?.events || [];
  const completed = events.filter((x: any) => x.status === 'completed').length;
  const review = events.filter((x: any) => x.status === 'needs_human_review').length;
  const errors = events.filter((x: any) => x.status === 'error').length;

  return (
    <div className="min-h-[75vh] bg-[#04130e] text-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" /> {es ? 'Correo autónomo' : 'Autonomous mail'}
            </div>
            <h1 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight">
              {es ? 'Centro de operaciones de correo' : 'Email operations center'}
            </h1>
            <p className="mt-3 max-w-3xl text-sm sm:text-base text-stone-400">
              {es
                ? 'Gmail y Outlook entran al mismo cerebro operativo: memoria, triage, reservas, proveedores, respuestas y auditoría.'
                : 'Gmail and Outlook feed the same operational brain: memory, triage, bookings, providers, replies and audit.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-50">
              <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} /> {es ? 'Actualizar' : 'Refresh'}
            </button>
            <button onClick={() => void sweep()} disabled={running} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-stone-950 hover:bg-emerald-300 disabled:opacity-50">
              <Activity className={running ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} /> {running ? (es ? 'Procesando...' : 'Running...') : (es ? 'Ejecutar ahora' : 'Run now')}
            </button>
          </div>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div>}

        <div className="grid md:grid-cols-4 gap-3 mb-5">
          <Stat icon={<ShieldCheck />} label={es ? 'Gmail' : 'Gmail'} value={data?.providers?.gmail ? 'ACTIVO' : 'PENDIENTE'} ok={Boolean(data?.providers?.gmail)} />
          <Stat icon={<ShieldCheck />} label="Outlook" value={data?.providers?.outlook ? 'ACTIVO' : 'PENDIENTE'} ok={Boolean(data?.providers?.outlook)} />
          <Stat icon={<CheckCircle2 />} label={es ? 'Autónomas' : 'Autonomous'} value={completed} ok />
          <Stat icon={<TriangleAlert />} label={es ? 'Revisión / errores' : 'Review / errors'} value={review + errors} ok={false} />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[.035] overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="font-black">{es ? 'Actividad de agentes' : 'Agent activity'}</h2>
              <p className="text-xs text-stone-500 mt-1">{es ? 'Cada mensaje queda idempotente y trazable.' : 'Every message is idempotent and traceable.'}</p>
            </div>
            <Mail className="w-5 h-5 text-sky-300" />
          </div>
          <div className="divide-y divide-white/5">
            {loading && <div className="p-8 text-center text-stone-500">{es ? 'Cargando...' : 'Loading...'}</div>}
            {!loading && events.length === 0 && <div className="p-10 text-center text-stone-500">{es ? 'Aún no hay eventos. Conecta una bandeja y ejecuta el agente.' : 'No events yet. Connect a mailbox and run the agent.'}</div>}
            {!loading && events.map((event: any) => (
              <div key={event.id} className="p-4 hover:bg-white/[.025] transition">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Status status={event.status} />
                      <span className="text-[10px] uppercase tracking-wider text-stone-500">{event.provider}</span>
                      {event.intent && <span className="text-[10px] rounded-full bg-violet-400/10 px-2 py-1 text-violet-300">{event.intent}</span>}
                    </div>
                    <p className="mt-2 font-bold truncate">{event.subject || event.messageId}</p>
                    <p className="mt-1 text-xs text-stone-500 truncate">{event.from || '—'}</p>
                  </div>
                  <div className="text-right text-xs text-stone-500">
                    <div className="flex items-center gap-1 justify-end"><Clock3 className="w-3 h-3" /> {event.updatedAt ? new Date(event.updatedAt).toLocaleString() : '—'}</div>
                    {event.confidence != null && <div className="mt-1 text-emerald-300">{Math.round(Number(event.confidence) * 100)}% confianza</div>}
                  </div>
                </div>
                {event.reason && <p className="mt-3 text-xs text-stone-400">{event.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, ok }: { icon: React.ReactNode; label: string; value: React.ReactNode; ok: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
    <div className="flex items-center justify-between text-stone-400"><span className="text-xs font-bold uppercase tracking-wider">{label}</span><span className={ok ? 'text-emerald-300' : 'text-amber-300'}>{React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}</span></div>
    <div className="mt-2 text-xl font-black">{value}</div>
  </div>;
}

function Status({ status }: { status: string }) {
  const cls = status === 'completed' ? 'text-emerald-300 bg-emerald-400/10' : status === 'needs_human_review' ? 'text-amber-300 bg-amber-400/10' : status === 'error' ? 'text-rose-300 bg-rose-400/10' : 'text-sky-300 bg-sky-400/10';
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase ${cls}`}>{status.replace(/_/g, ' ')}</span>;
}
