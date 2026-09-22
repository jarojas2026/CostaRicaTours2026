import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Bot, CheckCircle2, Clock3, Database, MailCheck, RefreshCw, ShieldCheck, TrendingUp, Settings2, Save, Table2 } from 'lucide-react';
import { Language } from '../types';
import { auth } from '../firebase';

interface Props { language: Language; }

export const AdminControlCenterPage: React.FC<Props> = ({ language }) => {
  const es = language === 'es';
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState<any>({});
  const [savingControls, setSavingControls] = useState(false);
  const [controlMessage, setControlMessage] = useState('');

  const getToken = async () => { const user = auth.currentUser; if (!user) throw new Error(es ? 'Inicia sesión con una cuenta administrativa.' : 'Sign in with an administrator account.'); return user.getIdToken(); };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/control-center', { headers: { Authorization: 'Bearer ' + token } });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No autorizado');
      setData(json);
      const controlsResponse = await fetch('/api/admin/platform-controls', { headers: { Authorization: 'Bearer ' + token } });
      const controlsJson = await controlsResponse.json();
      if (controlsResponse.ok) setControls(controlsJson.values || {});
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally { setLoading(false); }
  };

  const saveControls = async () => {
    setSavingControls(true); setControlMessage('');
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/platform-controls', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(controls) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudieron guardar los parámetros.');
      setControls(json.values || controls);
      setControlMessage(es ? 'Parámetros guardados.' : 'Parameters saved.');
    } catch (e: any) { setControlMessage(e?.message || 'Error'); }
    finally { setSavingControls(false); }
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60000);
    return () => window.clearInterval(id);
  }, []);

  const business = data?.business || {};
  const alerts = data?.alerts || {};
  const automation = data?.automation || {};
  const agents = data?.agents || [];
  const documents = data?.documents || {};
  const maxLog = useMemo(() => Math.max(1, ...(automation.recentLogs || []).slice(0, 12).map((x: any) => Number(x.durationMs) || 1)), [automation]);

  if (error && !data) {
    return <div className="max-w-7xl mx-auto px-4 py-12"><div className="rounded-3xl border border-rose-400/30 bg-rose-950/30 p-8 text-rose-100"><h1 className="text-2xl font-black">{es ? 'Centro de control administrativo' : 'Executive control center'}</h1><p className="mt-3 text-sm">{error}</p><button onClick={load} className="mt-5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-stone-950">{es ? 'Reintentar' : 'Retry'}</button></div></div>;
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
      <section className="rounded-[32px] border border-amber-400/20 bg-gradient-to-br from-[#071e14] via-[#041711] to-[#020b07] p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-300 text-[10px] font-black uppercase tracking-[0.22em]"><ShieldCheck size={15}/> {es ? 'Nivel administrativo' : 'Administrative level'}</div>
            <h1 className="mt-2 text-3xl md:text-5xl font-black text-white tracking-tight">{es ? 'Centro de Control Costa Rica Tours' : 'Costa Rica Tours Control Center'}</h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-300">{es ? 'Una vista unificada de ventas, clientes, proveedores, agentes, automatizaciones, fallos y documentos operativos. Incluye supervisión, parámetros maestros y tablas operativas para control humano.' : 'Unified visibility across sales, customers, providers, agents, automation, failures and operational documents. Includes supervision, master parameters and operational tables for human control.'}</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 font-black text-stone-950 hover:bg-amber-300 disabled:opacity-60"><RefreshCw size={17} className={loading ? 'animate-spin' : ''}/>{es ? 'Actualizar' : 'Refresh'}</button>
        </div>
      </section>

      <section className="grid xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-3xl border border-violet-400/20 bg-gradient-to-br from-[#110b24] to-[#070412] p-5">
          <div className="flex items-center gap-2"><Bot className="text-violet-300" size={19}/><h2 className="font-black text-white">{es?'Copiloto ejecutivo con IA':'AI executive copilot'}</h2></div>
          <p className="mt-2 text-xs text-stone-400">{es?'Analiza ventas, operaciones, finanzas y riesgos y prepara acciones para aprobación humana.':'Analyze sales, operations, finance and risk, then prepare actions for human approval.'}</p>
          <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>window.location.assign('/admin/ai-command')} className="rounded-xl bg-violet-500 px-4 py-2 text-xs font-black text-white">{es?'Abrir sala de mando IA':'Open AI command room'}</button><button onClick={()=>window.location.assign('/admin/ai-architecture')} className="rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-xs font-black text-violet-200">{es?'Ver arquitectura ejecutiva':'View executive architecture'}</button></div>
        </div>
        <div className="rounded-3xl border border-emerald-400/20 bg-[#071510] p-5">
          <div className="text-[10px] uppercase tracking-widest text-emerald-300 font-black">{es?'Gobierno de acceso':'Access governance'}</div>
          <div className="mt-2 text-2xl font-black text-white">{es?'Personal autorizado':'Authorized staff'}</div>
          <p className="mt-2 text-xs text-stone-400">{es?'Las rutas administrativas se validan en backend mediante Firebase y rol administrativo.':'Admin routes are enforced server-side through Firebase roles.'}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-400/20 bg-[#111006] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><div className="flex items-center gap-2"><Settings2 className="text-amber-300" size={18}/><h2 className="font-black text-white">{es ? 'Parámetros maestros de la plataforma' : 'Master platform parameters'}</h2></div><button onClick={() => window.location.assign('/admin/financial-legal')} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-200 hover:bg-amber-400/20">{es ? 'Abrir control financiero, contable y legal' : 'Open financial, accounting & legal control'}</button><p className="mt-1 text-xs text-stone-500">{es ? 'Controles humanos persistentes para gobernar el comportamiento operativo de los agentes.' : 'Persistent human controls for governing agent operational behavior.'}</p></div>
          <button onClick={saveControls} disabled={savingControls} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-stone-950 disabled:opacity-60"><Save size={15}/>{savingControls ? (es ? 'Guardando…' : 'Saving…') : (es ? 'Guardar parámetros' : 'Save parameters')}</button>
        </div>
        <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          <label className="rounded-2xl border border-white/5 bg-black/20 p-3 block"><div className="text-xs font-bold text-white">{es ? 'Nivel de autonomía' : 'Autonomy level'}</div><select value={controls.ai_autonomy_level || 'supervised'} onChange={e=>setControls((x:any)=>({...x,ai_autonomy_level:e.target.value}))} className="mt-2 w-full rounded-xl bg-stone-950 border border-white/10 px-3 py-2 text-xs text-white"><option>supervised</option><option>assisted</option><option>high</option></select></label>
          <label className="rounded-2xl border border-white/5 bg-black/20 p-3 block"><div className="text-xs font-bold text-white">{es ? 'Rondas máximas de herramientas' : 'Max tool rounds'}</div><input type="number" min="1" max="10" value={controls.max_agent_tool_rounds ?? 3} onChange={e=>setControls((x:any)=>({...x,max_agent_tool_rounds:Number(e.target.value)}))} className="mt-2 w-full rounded-xl bg-stone-950 border border-white/10 px-3 py-2 text-xs text-white"/></label>
          <label key="journey_adaptation_enabled" className="rounded-2xl border border-white/5 bg-black/20 p-3 block"><div className="text-xs font-bold text-white">{es ? 'Adaptación automática de viajes' : 'Automatic journey adaptation'}</div><button type="button" onClick={() => setControls((x:any)=>({...x,journey_adaptation_enabled:!x.journey_adaptation_enabled}))} className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-xs font-black ${controls.journey_adaptation_enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{controls.journey_adaptation_enabled ? "ON" : "OFF"}</button></label><label key="live_availability_required" className="rounded-2xl border border-white/5 bg-black/20 p-3 block"><div className="text-xs font-bold text-white">{es ? 'Exigir disponibilidad real' : 'Require live availability'}</div><button type="button" onClick={() => setControls((x:any)=>({...x,live_availability_required:!x.live_availability_required}))} className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-xs font-black ${controls.live_availability_required ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{controls.live_availability_required ? "ON" : "OFF"}</button></label><label key="weather_context_enabled" className="rounded-2xl border border-white/5 bg-black/20 p-3 block"><div className="text-xs font-bold text-white">{es ? 'Contexto meteorológico' : 'Weather context'}</div><button type="button" onClick={() => setControls((x:any)=>({...x,weather_context_enabled:!x.weather_context_enabled}))} className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-xs font-black ${controls.weather_context_enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{controls.weather_context_enabled ? "ON" : "OFF"}</button></label><label key="human_handoff_enabled" className="rounded-2xl border border-white/5 bg-black/20 p-3 block"><div className="text-xs font-bold text-white">{es ? 'Escalamiento humano' : 'Human handoff'}</div><button type="button" onClick={() => setControls((x:any)=>({...x,human_handoff_enabled:!x.human_handoff_enabled}))} className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-xs font-black ${controls.human_handoff_enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{controls.human_handoff_enabled ? "ON" : "OFF"}</button></label><label key="provider_auto_coordination" className="rounded-2xl border border-white/5 bg-black/20 p-3 block"><div className="text-xs font-bold text-white">{es ? 'Coordinación con proveedores' : 'Provider coordination'}</div><button type="button" onClick={() => setControls((x:any)=>({...x,provider_auto_coordination:!x.provider_auto_coordination}))} className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-xs font-black ${controls.provider_auto_coordination ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{controls.provider_auto_coordination ? "ON" : "OFF"}</button></label><label key="sales_followup_enabled" className="rounded-2xl border border-white/5 bg-black/20 p-3 block"><div className="text-xs font-bold text-white">{es ? 'Seguimiento comercial' : 'Sales follow-up'}</div><button type="button" onClick={() => setControls((x:any)=>({...x,sales_followup_enabled:!x.sales_followup_enabled}))} className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-xs font-black ${controls.sales_followup_enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{controls.sales_followup_enabled ? "ON" : "OFF"}</button></label><label key="risk_escalation_enabled" className="rounded-2xl border border-white/5 bg-black/20 p-3 block"><div className="text-xs font-bold text-white">{es ? 'Escalamiento de riesgo' : 'Risk escalation'}</div><button type="button" onClick={() => setControls((x:any)=>({...x,risk_escalation_enabled:!x.risk_escalation_enabled}))} className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-xs font-black ${controls.risk_escalation_enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{controls.risk_escalation_enabled ? "ON" : "OFF"}</button></label><label key="learning_reflection_enabled" className="rounded-2xl border border-white/5 bg-black/20 p-3 block"><div className="text-xs font-bold text-white">{es ? 'Reflexión y aprendizaje' : 'Learning reflection'}</div><button type="button" onClick={() => setControls((x:any)=>({...x,learning_reflection_enabled:!x.learning_reflection_enabled}))} className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-xs font-black ${controls.learning_reflection_enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{controls.learning_reflection_enabled ? "ON" : "OFF"}</button></label>
        </div>
        {controlMessage && <div className="mt-3 text-xs font-bold text-emerald-300">{controlMessage}</div>}
      </section>

      <section className="rounded-3xl border border-sky-400/15 bg-[#06121b] p-5">
        <div className="flex items-center gap-2"><Table2 className="text-sky-300" size={18}/><h2 className="font-black text-white">{es ? 'Tabla de reservas recientes' : 'Recent bookings table'}</h2></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[9px] uppercase tracking-wider text-stone-500"><tr><th className="p-2">ID</th><th className="p-2">{es?'Cliente':'Customer'}</th><th className="p-2">Tour</th><th className="p-2">{es?'Fecha':'Date'}</th><th className="p-2">{es?'Estado':'Status'}</th><th className="p-2">USD</th></tr></thead><tbody>{(data?.recentBookings || []).map((b:any)=><tr key={b.id} className="border-t border-white/5"><td className="p-2 font-bold text-emerald-300">{b.id}</td><td className="p-2 text-white">{b.customer}</td><td className="p-2 text-stone-300">{b.tour}</td><td className="p-2 text-stone-400">{b.date}</td><td className="p-2 text-amber-300">{b.status}</td><td className="p-2 text-white">{b.totalUSD}</td></tr>)}</tbody></table></div>
      </section>

      <section className="rounded-3xl border border-emerald-500/15 bg-[#061d14] p-5">
        <div className="flex items-center gap-2"><Table2 className="text-emerald-300" size={18}/><h2 className="font-black text-white">{es ? 'Tabla de proveedores y SLA' : 'Providers & SLA table'}</h2></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[9px] uppercase tracking-wider text-stone-500"><tr><th className="p-2">Proveedor</th><th className="p-2">Región</th><th className="p-2">Estado</th><th className="p-2">SLA</th><th className="p-2">{es?'Respuesta media':'Avg response'}</th><th className="p-2">{es?'Aceptación':'Acceptance'}</th></tr></thead><tbody>{(data?.providers || []).map((p:any)=><tr key={p.id} className="border-t border-white/5"><td className="p-2 font-bold text-white">{p.name}</td><td className="p-2 text-stone-300">{p.region || '—'}</td><td className="p-2 text-emerald-300">{p.status || '—'}</td><td className="p-2 text-stone-300">{p.slaTargetMinutes ?? '—'}m</td><td className="p-2 text-stone-300">{p.averageResponseMinutes ?? '—'}m</td><td className="p-2 text-stone-300">{p.acceptanceRate ?? '—'}%</td></tr>)}</tbody></table></div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          [BarChart3, business.totalBookings, es ? 'Reservas' : 'Bookings'],
          [CheckCircle2, business.confirmedBookings, es ? 'Confirmadas' : 'Confirmed'],
          [Clock3, business.pendingBookings, es ? 'Pendientes' : 'Pending'],
          [TrendingUp, '$' + (business.revenueUSD || 0), es ? 'Ventas USD' : 'Revenue USD'],
          [Activity, business.upcoming72h, es ? 'Próximas 72h' : 'Next 72h'],
          [AlertTriangle, alerts.unresolved, es ? 'Alertas' : 'Alerts'],
          [Bot, agents.length, es ? 'Agentes' : 'Agents'],
          [Database, documents.journeys || 0, es ? 'Viajes guardados' : 'Saved journeys']
        ].map(([Icon, value, label]: any) => (
          <div key={label} className="rounded-2xl border border-emerald-500/15 bg-[#061d14] p-4">
            <Icon className="text-amber-300" size={18}/><div className="mt-2 text-2xl font-black text-white">{value ?? (loading ? '…' : 0)}</div><div className="mt-1 text-[9px] font-black uppercase tracking-wider text-stone-500">{label}</div>
          </div>
        ))}
      </section>

      <section className="grid xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-3xl border border-emerald-500/15 bg-[#061d14] p-5">
          <div className="flex items-center justify-between"><h2 className="font-black text-white">{es ? 'Salud comercial' : 'Commercial health'}</h2><span className="text-xs text-emerald-300">{business.averageBookingUSD ? '$' + business.averageBookingUSD + ' avg.' : ''}</span></div>
          <div className="mt-5 grid sm:grid-cols-3 gap-4">
            {[
              ['Confirmadas', business.confirmedBookings, business.totalBookings],
              ['Pendientes', business.pendingBookings, business.totalBookings],
              ['Fallos/cancelaciones', business.failedOrCancelled, business.totalBookings]
            ].map(([label, value, total]: any) => {
              const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
              return <div key={label} className="rounded-2xl border border-white/5 bg-black/20 p-4"><div className="flex justify-between text-xs text-stone-400"><span>{label}</span><b className="text-white">{value || 0}</b></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-emerald-400" style={{ width: pct + '%' }}/></div><div className="mt-2 text-[10px] text-stone-500">{pct}%</div></div>;
            })}
          </div>
          <div className="mt-5 rounded-2xl border border-amber-400/10 bg-amber-400/5 p-4"><div className="text-xs font-black text-amber-200">{es ? 'Conversión semanal' : 'Weekly conversion'}</div><pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap text-[10px] text-stone-300">{JSON.stringify(data?.conversion || {}, null, 2)}</pre></div>
        </div>

        <div className="rounded-3xl border border-rose-400/15 bg-[#170b0b] p-5">
          <h2 className="font-black text-white">{es ? 'Riesgo operativo' : 'Operational risk'}</h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[['critical', alerts.critical], ['warning', alerts.warning], ['all', alerts.unresolved]].map(([k,v]: any) => <div key={k} className="rounded-2xl bg-black/20 p-3 text-center"><div className="text-xl font-black text-white">{v || 0}</div><div className="text-[9px] uppercase text-stone-500">{k}</div></div>)}
          </div>
          <div className="mt-4 max-h-64 overflow-auto space-y-2">{(alerts.recent || []).map((a: any) => <div key={a.id} className="rounded-xl border border-white/5 bg-black/20 p-3"><div className="text-xs font-bold text-white">{a.title}</div><div className="mt-1 text-[10px] text-stone-400">{a.message}</div></div>)}{!alerts.recent?.length && <p className="text-sm text-stone-500">{es ? 'Sin alertas activas.' : 'No active alerts.'}</p>}</div>
        </div>
      </section>

      <section className="grid xl:grid-cols-2 gap-5">
        <div className="rounded-3xl border border-violet-400/15 bg-[#0b0a18] p-5">
          <div className="flex items-center gap-2"><Bot className="text-violet-300" size={18}/><h2 className="font-black text-white">{es ? 'Mapa de inteligencias' : 'AI workforce map'}</h2><span className="ml-auto text-[10px] text-violet-300">{agents.length} activos definidos</span></div>
          <div className="mt-4 grid sm:grid-cols-2 gap-2 max-h-[460px] overflow-auto">{agents.map((a: any) => <div key={a.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400"/><span className="text-sm font-black text-white">{a.id}</span></div><p className="mt-1 text-[10px] leading-4 text-stone-400">{a.mission}</p><div className="mt-2 text-[9px] text-violet-300">{(a.capabilities || []).join(' • ')}</div></div>)}</div>
        </div>

        <div className="rounded-3xl border border-sky-400/15 bg-[#06121b] p-5">
          <div className="flex items-center gap-2"><MailCheck className="text-sky-300" size={18}/><h2 className="font-black text-white">{es ? 'Agente de correo de proveedores' : 'Provider email agent'}</h2></div>
          <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-4"><div className="flex justify-between text-xs"><span className="text-stone-400">{es ? 'Estado Gmail OAuth' : 'Gmail OAuth status'}</span><span className={automation.providerInbox?.configured ? 'text-emerald-300' : 'text-amber-300'}>{automation.providerInbox?.configured ? 'CONFIGURADO' : 'PENDIENTE DE CREDENCIALES'}</span></div><p className="mt-2 text-[10px] leading-5 text-stone-500">{es ? 'El cron revisa la bandeja cada minuto cuando las credenciales están configuradas.' : 'The cron checks the inbox every minute when credentials are configured.'}</p></div>
          <div className="mt-4 max-h-72 overflow-auto space-y-2">{(data?.providerInbox || []).map((x: any) => <div key={x.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3"><div className="flex justify-between text-[10px]"><b className="text-white">{x.status}</b><span className="text-stone-500">{x.from || ''}</span></div><div className="mt-1 text-xs text-stone-300">{x.subject || x.orderId || 'evento'}</div></div>)}{!data?.providerInbox?.length && <p className="text-sm text-stone-500">{es ? 'Aún no hay eventos procesados.' : 'No processed events yet.'}</p>}</div>
        </div>
      </section>

      <section className="grid xl:grid-cols-2 gap-5">
        <div className="rounded-3xl border border-emerald-500/15 bg-[#061d14] p-5">
          <div className="flex items-center gap-2"><Activity className="text-emerald-300" size={18}/><h2 className="font-black text-white">{es ? 'Motor de automatización' : 'Automation engine'}</h2></div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">{[['Ejecuciones', automation.engine?.totalExecutions], ['Éxito', (automation.engine?.successRate || 0) + '%'], ['Latencia', (automation.engine?.averageLatencyMs || 0) + 'ms'], ['Workflows', automation.engine?.activeWorkflows]].map(([k,v]: any) => <div key={k} className="rounded-xl bg-black/20 p-3"><div className="text-lg font-black text-white">{v ?? 0}</div><div className="text-[9px] uppercase text-stone-500">{k}</div></div>)}</div>
          <div className="mt-4 max-h-72 overflow-auto space-y-2">{(automation.recentLogs || []).slice(0, 12).map((x: any) => <div key={x.id} className="rounded-xl border border-white/5 bg-black/20 p-3"><div className="flex items-center justify-between text-[10px]"><span className={x.status === 'error' ? 'text-rose-300' : 'text-emerald-300'}>{x.status}</span><span className="text-stone-500">{x.durationMs}ms</span></div><div className="mt-1 text-xs text-white">{x.trigger}</div><div className="mt-1 h-1.5 rounded-full bg-black/40"><div className="h-full rounded-full bg-emerald-400" style={{ width: Math.min(100, Math.max(2, ((Number(x.durationMs) || 1) / maxLog) * 100)) + '%' }}/></div></div>)}</div>
        </div>

        <div className="rounded-3xl border border-amber-400/15 bg-[#171108] p-5">
          <div className="flex items-center gap-2"><Database className="text-amber-300" size={18}/><h2 className="font-black text-white">{es ? 'Documentos y evolución' : 'Documents & evolution'}</h2></div>
          <div className="mt-4 grid grid-cols-2 gap-2">{Object.entries(documents).map(([k,v]: any) => <div key={k} className="rounded-xl bg-black/20 p-3"><div className="text-xl font-black text-white">{v}</div><div className="text-[9px] uppercase text-stone-500">{k}</div></div>)}</div>
          <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-4"><div className="text-xs font-black text-amber-200">{es ? 'Skills evolucionadas' : 'Evolved skills'}</div><div className="mt-3 space-y-2">{(data?.evolution?.skills || []).map((s: any) => <div key={s.id + s.version} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-[10px]"><span className="text-white">{s.id} v{s.version}</span><span className="text-stone-400">{s.lifecycle} • {s.exposure}</span></div>)}</div></div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-5 text-[10px] text-stone-500">
        {es ? 'Última actualización: ' : 'Last updated: '}{data?.generatedAt || '…'} · {es ? 'Los datos operativos sensibles siguen protegidos por autenticación administrativa.' : 'Sensitive operational data remains protected by administrator authentication.'}
      </section>
    </div>
  );
};
