import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, Pause, Play, Power, RefreshCw, Send, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import type { Language } from '../types';
import { AgentOfficeMap } from './AgentOfficeMap';
import { ownerOfficeFetch, officeRequests, type OfficeRequest } from './agentOfficeApi';
import { AGENT_STATUS_LABELS, honestAgentStatus, type OfficeAgent } from './agentOfficeLayout';

type Fetcher = <T = any>(request: OfficeRequest, es?: boolean) => Promise<T>;

type Approval = {
  id: string;
  action: string;
  status: 'pending' | 'approved' | 'rejected' | 'consumed';
  summary: string;
  resourceRef: string;
  requestedBy?: { email?: string | null; role?: string | null } | null;
  createdAt: string;
  decidedAt?: string | null;
  rejectionReason?: string | null;
};

type GlobalControl = { agentsDisabled: boolean; reason: string | null; updatedAt: string | null };

type JarvisResponse = {
  understood: string;
  plan: string[];
  whoDoesIt: Array<{ taskId: string; agentId: string | null; status: string; runId: string | null; reason: string }>;
  approvalRequired: Array<{ taskId: string; action: string; approvalId: string; summary: string }>;
  executiveSummary: string;
  planId: string;
};

type JarvisPlan = { id: string; ownerOrder: string; status: string; executiveSummary: string; createdAt: string; delegations?: Array<{ id: string; objective: string; assignedAgentId: string | null; status: string }> };

const ACTION_LABELS: Record<string, { es: string; en: string }> = {
  payment: { es: 'Cobro / enlace de pago', en: 'Payment / payment link' },
  refund: { es: 'Reembolso', en: 'Refund' },
  payout: { es: 'Pago a proveedor', en: 'Provider payout' },
  customer_message: { es: 'Mensaje a cliente', en: 'Customer message' },
  mass_message: { es: 'Envío masivo', en: 'Mass message' },
  price_change: { es: 'Cambio de precio', en: 'Price change' },
  publication: { es: 'Publicación', en: 'Publication' },
};

const when = (value: string | null | undefined, es: boolean) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(es ? 'es-CR' : 'en-US');
};

function Panel({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-[#071d15] p-5 sm:p-6">
    <header className="mb-4 flex flex-wrap items-center gap-2"><span className="text-amber-300">{icon}</span><h3 className="text-xl font-black text-white">{title}</h3><span className="ml-auto">{action}</span></header>
    {children}
  </section>;
}

function Notice({ tone, children }: { tone: 'error' | 'ok' | 'info'; children: React.ReactNode }) {
  const cls = tone === 'error' ? 'border-rose-400/30 bg-rose-950/30 text-rose-100' : tone === 'ok' ? 'border-emerald-400/30 bg-emerald-950/30 text-emerald-100' : 'border-white/10 bg-black/25 text-stone-300';
  return <p role={tone === 'error' ? 'alert' : 'status'} className={'rounded-xl border p-3 text-sm ' + cls}>{children}</p>;
}

/** Bandeja de aprobaciones del dueño: aprobar / rechazar (con motivo). Aprobar no ejecuta nada. */
export function OwnerApprovalInbox({ language, fetcher = ownerOfficeFetch }: { language: Language; fetcher?: Fetcher }) {
  const es = language === 'es';
  const [approvals, setApprovals] = useState<Approval[] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError('');
    try { const data = await fetcher<{ approvals: Approval[] }>(officeRequests.approvals(), es); setApprovals(Array.isArray(data?.approvals) ? data.approvals : []); }
    catch (e: any) { setError(e?.message || 'Error'); }
  }, [es, fetcher]);
  useEffect(() => { void load(); }, [load]);

  const decide = async (approval: Approval, decision: 'approve' | 'reject') => {
    setError(''); setMessage('');
    try {
      const reason = (reasons[approval.id] || '').trim();
      if (decision === 'reject' && !reason) throw new Error(es ? 'Escribe el motivo del rechazo.' : 'Write a rejection reason.');
      setBusy(approval.id);
      await fetcher(decision === 'approve' ? officeRequests.approve(approval.id) : officeRequests.reject(approval.id, reason), es);
      setMessage(decision === 'approve'
        ? (es ? 'Aprobado. Es una autorización de un solo uso: no se ejecutó nada todavía.' : 'Approved. Single-use authorization: nothing was executed yet.')
        : (es ? 'Rechazado y registrado en la auditoría.' : 'Rejected and recorded in the audit log.'));
      await load();
    } catch (e: any) { setError(e?.message || 'Error'); }
    finally { setBusy(null); }
  };

  const pending = (approvals || []).filter(a => a.status === 'pending');
  const decided = (approvals || []).filter(a => a.status !== 'pending').slice(0, 8);

  return <Panel title={es ? 'Bandeja de aprobaciones' : 'Approval inbox'} icon={<Inbox size={20} />}
    action={<button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1 text-sm text-white hover:bg-white/5"><RefreshCw size={14} />{es ? 'Actualizar' : 'Refresh'}</button>}>
    <p className="mb-3 text-sm text-stone-400">{es ? 'Pagos, reembolsos, payouts, mensajes a clientes, envíos masivos, cambios de precio y publicaciones siempre esperan aquí tu decisión. Aprobar no ejecuta la acción: autoriza un uso único que el agente debe consumir después.' : 'Payments, refunds, payouts, customer messages, mass sends, price changes and publications always wait here for your decision. Approving does not execute: it grants a single-use authorization the agent must consume later.'}</p>
    {error && <Notice tone="error">{error}</Notice>}
    {message && <Notice tone="ok">{message}</Notice>}
    {approvals === null && !error && <Notice tone="info">{es ? 'Cargando…' : 'Loading…'}</Notice>}
    {approvals !== null && !pending.length && <Notice tone="info">{es ? 'No hay aprobaciones pendientes.' : 'No pending approvals.'}</Notice>}
    <ul className="mt-3 space-y-3">
      {pending.map(approval => <li key={approval.id} data-approval={approval.id} className="rounded-xl border border-amber-400/20 bg-black/25 p-4">
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-200">{(ACTION_LABELS[approval.action] || { es: approval.action, en: approval.action })[es ? 'es' : 'en']}</span><span className="text-xs text-stone-500">{when(approval.createdAt, es)}</span></div>
        <p className="mt-2 text-base text-white">{approval.summary}</p>
        <p className="mt-1 break-all text-xs text-stone-400">{es ? 'Recurso' : 'Resource'}: {approval.resourceRef} · {es ? 'Pedido por' : 'Requested by'}: {approval.requestedBy?.email || approval.requestedBy?.role || '—'}</p>
        <label className="mt-3 block text-xs text-stone-400">{es ? 'Motivo (obligatorio para rechazar)' : 'Reason (required to reject)'}
          <input value={reasons[approval.id] || ''} onChange={e => setReasons(r => ({ ...r, [approval.id]: e.target.value }))} maxLength={500} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white" />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy === approval.id} onClick={() => void decide(approval, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-black text-stone-950 disabled:opacity-50"><CheckCircle2 size={16} />{es ? 'Aprobar' : 'Approve'}</button>
          <button type="button" disabled={busy === approval.id} onClick={() => void decide(approval, 'reject')} className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 px-4 py-2 text-sm font-bold text-rose-200 disabled:opacity-50"><XCircle size={16} />{es ? 'Rechazar' : 'Reject'}</button>
        </div>
      </li>)}
    </ul>
    {decided.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm text-stone-300">{es ? 'Decisiones recientes' : 'Recent decisions'} ({decided.length})</summary>
      <ul className="mt-2 space-y-1 text-xs text-stone-400">{decided.map(a => <li key={a.id}>{a.status} · {a.action} · {a.summary.slice(0, 90)} · {when(a.decidedAt, es)}</li>)}</ul>
    </details>}
  </Panel>;
}

/** Gobernanza: pausar / reanudar / revocar / restaurar por agente y apagado global. */
export function AgentGovernancePanel({ language, agents, onChanged, fetcher = ownerOfficeFetch }: { language: Language; agents: OfficeAgent[]; onChanged?: () => void; fetcher?: Fetcher }) {
  const es = language === 'es';
  const [global, setGlobal] = useState<GlobalControl | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const data = await fetcher<{ global: GlobalControl }>(officeRequests.governance(), es); setGlobal(data?.global || null); }
    catch (e: any) { setError(e?.message || 'Error'); }
  }, [es, fetcher]);
  useEffect(() => { void load(); }, [load]);

  const run = async (request: () => OfficeRequest, done: string, confirmText?: string) => {
    setError(''); setMessage('');
    try {
      const built = request();
      if (confirmText && typeof window !== 'undefined' && !window.confirm(confirmText)) return;
      setBusy(true);
      await fetcher(built, es);
      setMessage(done);
      await load();
      onChanged?.();
    } catch (e: any) { setError(e?.message || 'Error'); }
    finally { setBusy(false); }
  };

  const status = (agent: OfficeAgent) => { const label = AGENT_STATUS_LABELS[honestAgentStatus(agent)]; return es ? label.es : label.en; };

  return <Panel title={es ? 'Gobernanza de agentes' : 'Agent governance'} icon={<ShieldCheck size={20} />}>
    <div className={'rounded-xl border p-4 ' + (global?.agentsDisabled ? 'border-rose-400/40 bg-rose-950/30' : 'border-white/10 bg-black/25')}>
      <div className="flex flex-wrap items-center gap-3">
        <Power size={18} className={global?.agentsDisabled ? 'text-rose-300' : 'text-emerald-300'} />
        <span className="font-bold text-white">{global === null ? (es ? 'Estado global desconocido' : 'Global state unknown') : global.agentsDisabled ? (es ? 'Apagado global ACTIVO: ningún agente puede ejecutar' : 'Global shutdown ACTIVE: no agent can run') : (es ? 'Agentes habilitados (cada uno sigue su autonomía y aprobaciones)' : 'Agents enabled (each still bound by autonomy and approvals)')}</span>
        {global?.reason && <span className="text-xs text-stone-400">{es ? 'Motivo' : 'Reason'}: {global.reason}</span>}
      </div>
    </div>
    <label className="mt-4 block text-sm text-stone-300">{es ? 'Motivo (obligatorio para cualquier cambio; queda en la auditoría)' : 'Reason (required for any change; recorded in the audit log)'}
      <input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white" />
    </label>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => void run(() => officeRequests.shutdown(reason), es ? 'Apagado global activado.' : 'Global shutdown enabled.', es ? '¿Apagar todos los agentes?' : 'Shut down all agents?')} className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50"><ShieldAlert size={16} />{es ? 'Apagado global' : 'Global shutdown'}</button>
      <button type="button" disabled={busy} onClick={() => void run(() => officeRequests.resumeAll(reason), es ? 'Agentes reanudados.' : 'Agents resumed.', es ? '¿Reanudar la fuerza de agentes?' : 'Resume all agents?')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 px-4 py-2 text-sm font-bold text-emerald-200 disabled:opacity-50"><Play size={16} />{es ? 'Reanudar todo' : 'Resume all'}</button>
    </div>
    {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
    {message && <div className="mt-3"><Notice tone="ok">{message}</Notice></div>}
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs uppercase text-stone-500"><tr><th className="py-2">{es ? 'Agente' : 'Agent'}</th><th>{es ? 'Estado' : 'Status'}</th><th>{es ? 'Autonomía' : 'Autonomy'}</th><th>{es ? 'Acciones' : 'Actions'}</th></tr></thead>
        <tbody>
          {agents.map(agent => {
            const s = honestAgentStatus(agent);
            return <tr key={agent.id} data-agent={agent.id} className="border-t border-white/5">
              <td className="py-2 text-white">{agent.name ? (es ? agent.name.es : agent.name.en) : agent.id}<div className="text-[11px] text-stone-500">{agent.id}</div></td>
              <td className="text-stone-300">{status(agent)}</td>
              <td className="text-stone-300">{agent.autonomyLevel ?? '—'}</td>
              <td className="flex flex-wrap gap-1 py-2">
                {s === 'paused'
                  ? <button type="button" disabled={busy} onClick={() => void run(() => officeRequests.agentControl(agent.id, 'resume', reason), es ? 'Agente reanudado.' : 'Agent resumed.')} className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-xs text-white"><Play size={12} />{es ? 'Reanudar' : 'Resume'}</button>
                  : s !== 'revoked' && <button type="button" disabled={busy} onClick={() => void run(() => officeRequests.agentControl(agent.id, 'pause', reason), es ? 'Agente pausado.' : 'Agent paused.')} className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-xs text-white"><Pause size={12} />{es ? 'Pausar' : 'Pause'}</button>}
                {s === 'revoked'
                  ? <button type="button" disabled={busy} onClick={() => void run(() => officeRequests.agentControl(agent.id, 'restore', reason), es ? 'Agente restaurado (autonomía según registro).' : 'Agent restored.', es ? '¿Restaurar este agente?' : 'Restore this agent?')} className="rounded-md border border-emerald-400/30 px-2 py-1 text-xs text-emerald-200">{es ? 'Restaurar' : 'Restore'}</button>
                  : <button type="button" disabled={busy} onClick={() => void run(() => officeRequests.agentControl(agent.id, 'revoke', reason), es ? 'Agente revocado.' : 'Agent revoked.', es ? '¿Revocar este agente? Invalida sus autorizaciones.' : 'Revoke this agent? Its authorizations are invalidated.')} className="rounded-md border border-rose-400/30 px-2 py-1 text-xs text-rose-200">{es ? 'Revocar' : 'Revoke'}</button>}
              </td>
            </tr>;
          })}
        </tbody>
      </table>
      {!agents.length && <Notice tone="info">{es ? 'Sin agentes verificables en el registro.' : 'No verifiable agents in the registry.'}</Notice>}
    </div>
    <p className="mt-3 text-xs text-stone-500">{es ? 'Todos los agentes inician en autonomía 0. Esta vista no sube niveles de autonomía.' : 'All agents start at autonomy 0. This view does not raise autonomy levels.'}</p>
  </Panel>;
}

/** Consola para dar órdenes a JARVIS. JARVIS solo planifica y pide aprobaciones; hoy ningún worker ejecuta. */
export function JarvisCommandConsole({ language, fetcher = ownerOfficeFetch }: { language: Language; fetcher?: Fetcher }) {
  const es = language === 'es';
  const [order, setOrder] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<JarvisResponse | null>(null);
  const [plans, setPlans] = useState<JarvisPlan[] | null>(null);

  const loadPlans = useCallback(async () => {
    try { const data = await fetcher<{ plans: JarvisPlan[] }>(officeRequests.jarvisPlans(10), es); setPlans(Array.isArray(data?.plans) ? data.plans : []); }
    catch (e: any) { setError(e?.message || 'Error'); }
  }, [es, fetcher]);
  useEffect(() => { void loadPlans(); }, [loadPlans]);

  const send = async () => {
    setError(''); setResult(null);
    try {
      const request = officeRequests.jarvisCommand(order, es ? 'es' : 'en');
      setBusy(true);
      setResult(await fetcher<JarvisResponse>(request, es));
      setOrder('');
      await loadPlans();
    } catch (e: any) { setError(e?.message || 'Error'); }
    finally { setBusy(false); }
  };

  const reconcile = async (planId: string) => {
    setError('');
    try { setBusy(true); await fetcher(officeRequests.jarvisReconcile(planId), es); await loadPlans(); }
    catch (e: any) { setError(e?.message || 'Error'); }
    finally { setBusy(false); }
  };

  return <Panel title={es ? 'Consola de JARVIS' : 'JARVIS console'} icon={<Send size={20} />}>
    <Notice tone="info"><AlertTriangle size={14} className="mr-1 inline text-amber-300" />{es ? 'JARVIS divide la orden en tareas, asigna agentes y pide tu aprobación cuando toca. Todavía no hay un proceso que ejecute las tareas: quedan en cola. Nunca paga, cobra ni envía mensajes sin aprobación.' : 'JARVIS splits the order into tasks, assigns agents and asks for approval when needed. No worker executes tasks yet: they stay queued. It never pays, charges or sends messages without approval.'}</Notice>
    <label className="mt-3 block text-sm text-stone-300">{es ? 'Orden para JARVIS' : 'Order for JARVIS'}
      <textarea value={order} onChange={e => setOrder(e.target.value)} maxLength={4000} rows={3} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white" placeholder={es ? 'Ej.: Revisa los leads sin respuesta de más de 24 h y prepara borradores.' : 'E.g.: Review leads unanswered for 24h and prepare drafts.'} />
    </label>
    <button type="button" disabled={busy || !order.trim()} onClick={() => void send()} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-stone-950 disabled:opacity-50"><Send size={16} />{es ? 'Enviar a JARVIS' : 'Send to JARVIS'}</button>
    {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
    {result && <div className="mt-4 space-y-2 rounded-xl border border-sky-400/20 bg-[#071a23] p-4 text-sm">
      <p className="text-white">{result.understood}</p>
      <ol className="list-decimal pl-5 text-stone-300">{result.plan.map((step, i) => <li key={i}>{step}</li>)}</ol>
      <ul className="text-xs text-stone-400">{result.whoDoesIt.map(t => <li key={t.taskId}>{t.agentId || (es ? 'sin agente' : 'no agent')} · {t.status} · {t.reason}</li>)}</ul>
      {result.approvalRequired.length > 0 && <p className="text-amber-200">{es ? 'Requiere tu aprobación en la bandeja:' : 'Needs your approval in the inbox:'} {result.approvalRequired.map(a => a.action).join(', ')}</p>}
      <p className="text-stone-300">{result.executiveSummary}</p>
    </div>}
    <h4 className="mt-5 text-sm font-bold uppercase tracking-wide text-stone-400">{es ? 'Planes recientes' : 'Recent plans'}</h4>
    {plans !== null && !plans.length && <p className="mt-2 text-sm text-stone-500">{es ? 'Sin planes todavía.' : 'No plans yet.'}</p>}
    <ul className="mt-2 space-y-2">{(plans || []).map(plan => <li key={plan.id} className="rounded-xl bg-black/25 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2"><span className="font-bold text-white">{plan.ownerOrder.slice(0, 120)}</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-stone-300">{plan.status}</span><span className="text-xs text-stone-500">{when(plan.createdAt, es)}</span>
        <button type="button" disabled={busy} onClick={() => void reconcile(plan.id)} className="ml-auto rounded-md border border-white/15 px-2 py-1 text-xs text-white">{es ? 'Reconciliar' : 'Reconcile'}</button></div>
      <p className="mt-1 text-xs text-stone-400">{plan.executiveSummary}</p>
    </li>)}</ul>
  </Panel>;
}

/** Pestaña "Oficina": planta + aprobaciones + consola JARVIS + gobernanza. */
export function AgentOfficeWorkspace({ language, snapshot, onChanged, fetcher }: { language: Language; snapshot?: any; onChanged?: () => void; fetcher?: Fetcher }) {
  const es = language === 'es';
  const agents: OfficeAgent[] = Array.isArray(snapshot?.agents) ? snapshot.agents : [];
  return <div className="space-y-6">
    <header><h2 className="text-2xl sm:text-3xl font-black text-white">{es ? 'Oficina virtual' : 'Virtual office'}</h2>
      <p className="mt-1 max-w-3xl text-base text-stone-300">{es ? 'Planta de agentes, tus aprobaciones, órdenes a JARVIS y controles de gobernanza. Nada se paga ni se envía sin tu aprobación.' : 'Agent floor plan, your approvals, JARVIS orders and governance controls. Nothing is paid or sent without your approval.'}</p></header>
    <AgentOfficeMap language={language} snapshot={snapshot} />
    <div className="grid gap-6 xl:grid-cols-2">
      <OwnerApprovalInbox language={language} fetcher={fetcher} />
      <JarvisCommandConsole language={language} fetcher={fetcher} />
    </div>
    <AgentGovernancePanel language={language} agents={agents} onChanged={onChanged} fetcher={fetcher} />
  </div>;
}
