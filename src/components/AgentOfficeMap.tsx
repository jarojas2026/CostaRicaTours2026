import React, { useState } from 'react';
import { Activity, Bot, Building2, Clock3, DoorOpen, Eye, ShieldCheck, Workflow } from 'lucide-react';
import type { Language } from '../types';
import { AGENT_STATUS_LABELS, buildOfficeRooms, honestAgentStatus, type OfficeAgent, type OfficeAgentSignal } from './agentOfficeLayout';

type OfficeSnapshot = {
  generatedAt: string;
  source: string;
  registered: number;
  recentlyObserved: number;
  agents: OfficeAgent[];
};

const isRecent = (signal: OfficeAgentSignal) => signal === 'recent_activity';

/**
 * Resumen seguro de la tarea: solo id de ejecución y hora de inicio. El objetivo
 * textual nunca se muestra (puede traer datos de viajeros o instrucciones internas;
 * AGENTS.md §12), aunque una respuesta antigua del backend lo incluyera.
 */
export function safeTaskSummary(task: { runId?: unknown; startedAt?: unknown } | null | undefined, es: boolean, formatTime: (value: string | null | undefined) => string): string {
  const runId = typeof task?.runId === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(task.runId) ? task.runId : (es ? 'reservado' : 'redacted');
  const startedAt = typeof task?.startedAt === 'string' ? formatTime(task.startedAt) : '—';
  return es
    ? `Tarea en curso · ejecución ${runId} · desde ${startedAt}. El detalle de la tarea no se muestra aquí por privacidad.`
    : `Task in progress · run ${runId} · since ${startedAt}. Task details are not shown here for privacy.`;
}

/**
 * Planta de la oficina virtual: 9 salas del registro real (shared/agentOfficeTypes).
 * Cada agente aparece en la sala de su campo `office`. Sin heartbeat fresco el estado
 * es "sin señal": la vista no simula empleados trabajando ni ejecuta acciones.
 */
export function AgentOfficeMap({ language, snapshot }: { language: Language; snapshot?: OfficeSnapshot | null }) {
  const es = language === 'es';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const agents = Array.isArray(snapshot?.agents) ? snapshot.agents : [];
  const selected = agents.find(agent => agent.id === selectedId) || agents[0];
  const rooms = agents.length ? buildOfficeRooms(agents) : [];
  const vacantCount = rooms.filter(room => room.vacant).length;

  const statusLabel = (agent: OfficeAgent) => {
    if (agent.signal === 'telemetry_unavailable') return es ? 'Sin señal · telemetría no disponible' : 'No signal · telemetry unavailable';
    const label = AGENT_STATUS_LABELS[honestAgentStatus(agent)];
    return es ? label.es : label.en;
  };

  const agentName = (agent: OfficeAgent) => (agent.name ? (es ? agent.name.es : agent.name.en) : agent.id);

  const timestamp = (value: string | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(es ? 'es-CR' : 'en-US');
  };

  return (
    <section aria-label={es ? 'Oficina virtual de agentes' : 'Virtual agent office'} className="rounded-[30px] border border-emerald-500/20 bg-[#041711] p-4 sm:p-6 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-300"><Building2 size={16}/>{es ? 'Planta de la oficina' : 'Office floor plan'}</div>
          <h2 className="mt-2 text-2xl font-black text-white">{es ? 'Oficina virtual de inteligencia artificial' : 'AI virtual office'}</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-400">{es ? 'Salas y agentes del registro real. El estado solo se muestra si hay heartbeat reciente; si no, “sin señal”. No es una simulación de empleados trabajando.' : 'Rooms and agents from the real registry. Status is shown only with a recent heartbeat; otherwise “no signal”. Not a simulation of employees at work.'}</p>
        </div>
        <span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-stone-300"><ShieldCheck size={14} className="mr-2 inline text-amber-300"/>{es ? 'Solo administración' : 'Admin only'}</span>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="text-2xl font-black text-white">{snapshot?.registered ?? '—'}</div><div className="text-xs text-stone-400">{es ? 'Agentes registrados' : 'Registered agents'}</div></div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[.05] p-4"><div className="text-2xl font-black text-emerald-300">{snapshot?.source && snapshot.source !== 'unavailable' ? snapshot.recentlyObserved : '—'}</div><div className="text-xs text-stone-400">{es ? 'Con señal reciente' : 'With recent signal'}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="text-2xl font-black text-white">{rooms.length ? vacantCount : '—'}</div><div className="text-xs text-stone-400">{es ? 'Salas vacantes' : 'Vacant rooms'}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2 text-xs text-stone-200"><Clock3 size={15}/>{es ? 'Última observación' : 'Last observation'}</div><div className="mt-2 text-xs text-stone-400">{timestamp(snapshot?.generatedAt)}</div></div>
      </div>

      <div className="rounded-3xl border border-emerald-400/20 bg-[#0b2920] p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500/30 bg-black/20 py-3 text-[10px] uppercase tracking-[.2em] text-emerald-300"><Workflow size={15}/>{es ? 'Pasillo central · salas del registro' : 'Central corridor · registry rooms'}</div>
        <div className="grid gap-3 lg:grid-cols-3">
          {rooms.map(room => (
            <section key={room.id} data-office={room.id} className={`rounded-2xl border p-3 ${room.vacant ? 'border-dashed border-white/10 bg-black/10' : 'border-amber-400/15 bg-[#061910]'}`}>
              <h3 className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3 text-xs font-bold uppercase tracking-wide text-amber-200"><Building2 size={14}/>{es ? room.name.es : room.name.en}<span className="ml-auto text-stone-500">{room.agents.length}</span></h3>
              {room.vacant
                ? <p className="flex items-center gap-2 p-2 text-xs text-stone-500"><DoorOpen size={14}/>{es ? 'Vacante: sin agente asignado.' : 'Vacant: no agent assigned.'}</p>
                : <div className="grid grid-cols-1 gap-2">
                  {room.agents.map(agent => (
                    <button key={agent.id} type="button" onClick={() => setSelectedId(agent.id)} aria-pressed={selected?.id === agent.id}
                      className={`min-h-[88px] rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${selected?.id === agent.id ? 'border-amber-400/70 bg-amber-500/10' : 'border-white/10 bg-black/20 hover:border-emerald-400/40'}`}>
                      <span className="flex items-center gap-2"><Bot size={17} className="shrink-0 text-amber-300"/><span className="text-sm font-bold text-white">{agentName(agent)}</span></span>
                      <span className="mt-1 block break-all text-[10px] text-stone-500">{agent.id} · {es ? 'autonomía' : 'autonomy'} {agent.autonomyLevel ?? '—'}</span>
                      <span className="mt-2 flex items-center gap-2 text-[11px] text-stone-300">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${isRecent(agent.signal) ? 'bg-emerald-400' : 'bg-stone-500'}`}/>
                        {statusLabel(agent)}
                      </span>
                    </button>
                  ))}
                </div>}
            </section>
          ))}
        </div>
        {!rooms.length && <p className="p-8 text-center text-sm text-stone-400">{es ? 'No hay datos verificables para mostrar. No se generarán agentes ficticios.' : 'No verifiable data to display. No synthetic agents will be shown.'}</p>}
      </div>

      {selected && <aside className="rounded-2xl border border-sky-400/20 bg-[#071a23] p-4" aria-live="polite">
        <div className="flex items-center gap-2 text-sky-200"><Eye size={16}/><h3 className="font-bold">{es ? 'Inspección de agente' : 'Agent inspection'}: {agentName(selected)}</h3></div>
        <p className="mt-2 text-sm text-stone-300">{selected.mission}</p>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
          <div><dt className="text-stone-500">{es ? 'Estado observable' : 'Observed status'}</dt><dd className="mt-1 text-white">{statusLabel(selected)}</dd></div>
          <div><dt className="text-stone-500">{es ? 'Nivel de autonomía' : 'Autonomy level'}</dt><dd className="mt-1 text-white">{selected.autonomyLevel ?? '—'}</dd></div>
          <div><dt className="text-stone-500">{es ? 'Último evento' : 'Last event'}</dt><dd className="mt-1 break-all text-white">{selected.lastEventType || '—'}</dd></div>
          <div><dt className="text-stone-500">{es ? 'Último heartbeat' : 'Last heartbeat'}</dt><dd className="mt-1 text-white">{timestamp(selected.lastHeartbeatAt)}</dd></div>
        </dl>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-black/25 p-3 text-xs text-stone-400"><Activity size={15} className="shrink-0 text-amber-300"/>{selected.currentTask && isRecent(selected.signal)
          ? safeTaskSummary(selected.currentTask, es, timestamp)
          : (es ? 'Tarea actual: no verificable. Hoy ningún proceso emite heartbeats, por eso los agentes aparecen “sin señal”. Esta vista no ejecuta acciones ni simula tareas.' : 'Current task: not verifiable. No process emits heartbeats yet, so agents show “no signal”. This view does not execute actions or simulate tasks.')}</div>
      </aside>}
      <p className="text-[11px] text-stone-500">{es ? 'Fuente: registro de agentes y eventos en Firestore. “Sin señal” = sin heartbeat en los últimos 60 s; no significa apagado ni libre de tareas.' : 'Source: Firestore agent registry and events. “No signal” = no heartbeat in the last 60 s; it does not mean offline or free of tasks.'}</p>
    </section>
  );
}
