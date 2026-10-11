import React, { useState } from 'react';
import { Activity, Bot, Building2, Clock3, Eye, ShieldCheck, Workflow } from 'lucide-react';
import type { Language } from '../types';

type AgentSignal = 'recent_activity' | 'no_recent_signal' | 'telemetry_unavailable';
type AgentOfficeAgent = {
  id: string;
  mission: string;
  signal: AgentSignal;
  lastEventType: string | null;
  lastObservedAt: string | null;
  currentTask: null;
};
type OfficeSnapshot = {
  generatedAt: string;
  source: string;
  registered: number;
  recentlyObserved: number;
  agents: AgentOfficeAgent[];
};

const departments = [
  { id: 'frontdesk', es: 'Recepción y atención', en: 'Front desk', members: ['concierge', 'triage', 'multilingual_support', 'conversion_advisor'] },
  { id: 'sales', es: 'Reservas y finanzas', en: 'Bookings and finance', members: ['booking', 'payments_support', 'payment'] },
  { id: 'operations', es: 'Operaciones y territorio', en: 'Operations and territory', members: ['provider_liaison', 'operations', 'itinerary_planner', 'sustainability_guide', 'safety_health'] },
  { id: 'oversight', es: 'Supervisión y aprendizaje', en: 'Oversight and learning', members: ['supervisor', 'learning'] }
] as const;

const isRecent = (signal: AgentSignal) => signal === 'recent_activity';

export function AgentOfficeMap({ language, snapshot }: { language: Language; snapshot?: OfficeSnapshot | null }) {
  const es = language === 'es';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const agents = Array.isArray(snapshot?.agents) ? snapshot.agents : [];
  const selected = agents.find(agent => agent.id === selectedId) || agents[0];
  const assigned = new Set(departments.flatMap(department => [...department.members]));
  const groups = [
    ...departments.map(group => ({ ...group, agents: agents.filter(agent => (group.members as readonly string[]).includes(agent.id)) })),
    { id: 'other', es: 'Otras especialidades', en: 'Other specialists', agents: agents.filter(agent => !assigned.has(agent.id)) }
  ].filter(group => group.agents.length > 0);

  const statusLabel = (signal: AgentSignal) => {
    if (signal === 'recent_activity') return es ? 'Actividad observada (5 min)' : 'Activity observed (5 min)';
    if (signal === 'telemetry_unavailable') return es ? 'Telemetría no disponible' : 'Telemetry unavailable';
    return es ? 'Sin señal reciente' : 'No recent signal';
  };

  const timestamp = (value: string | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(es ? 'es-CR' : 'en-US');
  };

  return (
    <section aria-label={es ? 'Oficina virtual de agentes' : 'Virtual agent office'} className="rounded-[30px] border border-emerald-500/20 bg-[#041711] p-4 sm:p-6 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-300"><Building2 size={16}/>{es ? 'Ciudad administrativa' : 'Administrative city'}</div>
          <h2 className="mt-2 text-2xl font-black text-white">{es ? 'Oficina virtual de inteligencia artificial' : 'AI virtual office'}</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-400">{es ? 'Plano interactivo de los agentes registrados. La actividad procede de eventos observables, no de una simulación de empleados trabajando.' : 'Interactive floor plan of registered agents. Activity is based on observed events, not simulated employees at work.'}</p>
        </div>
        <span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-stone-300"><ShieldCheck size={14} className="mr-2 inline text-amber-300"/>{es ? 'Solo administración' : 'Admin only'}</span>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="text-2xl font-black text-white">{snapshot?.registered ?? '—'}</div><div className="text-xs text-stone-400">{es ? 'Agentes registrados' : 'Registered agents'}</div></div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[.05] p-4"><div className="text-2xl font-black text-emerald-300">{snapshot?.source && snapshot.source !== 'unavailable' ? snapshot.recentlyObserved : '—'}</div><div className="text-xs text-stone-400">{es ? 'Con actividad reciente' : 'Recently observed'}</div></div>
        <div className="col-span-2 md:col-span-1 rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2 text-xs text-stone-200"><Clock3 size={15}/>{es ? 'Última observación' : 'Last observation'}</div><div className="mt-2 text-xs text-stone-400">{timestamp(snapshot?.generatedAt)}</div></div>
      </div>

      <div className="rounded-3xl border border-emerald-400/20 bg-[#0b2920] p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500/30 bg-black/20 py-3 text-[10px] uppercase tracking-[.2em] text-emerald-300"><Workflow size={15}/>{es ? 'Pasillo central · distribución por funciones' : 'Central corridor · grouped by function'}</div>
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map(group => (
            <section key={group.id} className="rounded-2xl border border-amber-400/15 bg-[#061910] p-3">
              <h3 className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3 text-xs font-bold uppercase tracking-wide text-amber-200"><Building2 size={14}/>{es ? group.es : group.en}<span className="ml-auto text-stone-500">{group.agents.length}</span></h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.agents.map(agent => (
                  <button key={agent.id} type="button" onClick={() => setSelectedId(agent.id)} aria-pressed={selected?.id === agent.id}
                    className={`min-h-[110px] rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${selected?.id === agent.id ? 'border-amber-400/70 bg-amber-500/10' : 'border-white/10 bg-black/20 hover:border-emerald-400/40'}`}>
                    <span className="flex items-center gap-2"><Bot size={17} className="shrink-0 text-amber-300"/><span className="break-all text-sm font-bold text-white">{agent.id}</span></span>
                    <span className="mt-3 flex items-center gap-2 text-[11px] text-stone-300">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${isRecent(agent.signal) ? 'bg-emerald-400' : 'bg-stone-500'}`}/>
                      {statusLabel(agent.signal)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        {!groups.length && <p className="p-8 text-center text-sm text-stone-400">{es ? 'No hay datos verificables para mostrar. No se generarán agentes ficticios.' : 'No verifiable data to display. No synthetic agents will be shown.'}</p>}
      </div>

      {selected && <aside className="rounded-2xl border border-sky-400/20 bg-[#071a23] p-4" aria-live="polite">
        <div className="flex items-center gap-2 text-sky-200"><Eye size={16}/><h3 className="font-bold">{es ? 'Inspección de agente' : 'Agent inspection'}: {selected.id}</h3></div>
        <p className="mt-2 text-sm text-stone-300">{selected.mission}</p>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <div><dt className="text-stone-500">{es ? 'Estado observable' : 'Observed status'}</dt><dd className="mt-1 text-white">{statusLabel(selected.signal)}</dd></div>
          <div><dt className="text-stone-500">{es ? 'Último evento' : 'Last event'}</dt><dd className="mt-1 break-all text-white">{selected.lastEventType || '—'}</dd></div>
          <div><dt className="text-stone-500">{es ? 'Última actividad' : 'Last activity'}</dt><dd className="mt-1 text-white">{timestamp(selected.lastObservedAt)}</dd></div>
        </dl>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-black/25 p-3 text-xs text-stone-400"><Activity size={15} className="shrink-0 text-amber-300"/>{es ? 'Tarea actual y estado de reposo: no verificables todavía. Para mostrarlos hará falta instrumentar ejecuciones con inicio, fin, heartbeat y responsable. Esta vista no ejecuta acciones ni simula tareas.' : 'Current task and idle state are not yet verifiable. Showing them requires instrumented execution start, finish, heartbeat and ownership. This view does not execute actions or simulate tasks.'}</div>
      </aside>}
      <p className="text-[11px] text-stone-500">{es ? 'Fuente: muestra limitada de eventos guardados en Firestore. Sin señal no significa apagado, inactivo ni libre de tareas.' : 'Source: bounded sample of Firestore events. No signal does not mean offline, idle or free of tasks.'}</p>
    </section>
  );
}
