import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Bot, CheckCircle2, Clock3, Database, MailCheck, RefreshCw, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { Language } from '../types';
import { auth } from '../firebase';

interface Props { language: Language; }

export const AdminControlCenterPage: React.FC<Props> = ({ language }) => {
  const es = language === 'es';
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error(es ? 'Inicia sesión con una cuenta administrativa.' : 'Sign in with an administrator account.');
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/control-center', { headers: { Authorization: 'Bearer ' + token } });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No autorizado');
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally { setLoading(false); }
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
  const journeyPipeline = data?.journeyPipeline || {};
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
            <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-300">{es ? 'Una vista unificada de ventas, clientes, proveedores, agentes, automatizaciones, fallos y documentos operativos. Solo lectura para supervisión.' : 'Unified visibility across sales, customers, providers, agents, automation, failures and operational documents. Read-only for supervision.'}</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 font-black text-stone-950 hover:bg-amber-300 disabled:opacity-60"><RefreshCw size={17} className={loading ? 'animate-spin' : ''}/>{es ? 'Actualizar' : 'Refresh'}</button>
        </div>
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
        <div className="rounded-3xl border border-cyan-400/15 bg-[#06141b] p-5">
          <div className="flex items-center gap-2"><TrendingUp className="text-cyan-300" size={18}/><h2 className="font-black text-white">{es ? 'Embudo real de viajeros' : 'Real traveler funnel'}</h2><span className="ml-auto text-[10px] text-stone-500">{journeyPipeline.total || 0} {es ? 'viajes' : 'journeys'}</span></div>
          <div className="mt-5 space-y-3">
            {[
              ['DISCOVERY', journeyPipeline.discovery || 0, es ? 'Descubrimiento' : 'Discovery'],
              ['VERIFICATION', journeyPipeline.verification || 0, es ? 'Verificación' : 'Verification'],
              ['READY_TO_QUOTE', journeyPipeline.readyToQuote || 0, es ? 'Listos para cotizar' : 'Ready to quote'],
              ['RECOVERY', journeyPipeline.recovery || 0, es ? 'Recuperación' : 'Recovery']
            ].map(([key,value,label]: any) => {
              const pct = journeyPipeline.total ? Math.round((Number(value) / Number(journeyPipeline.total)) * 100) : 0;
              return <div key={key}>
                <div className="flex justify-between text-[10px]"><span className="text-stone-300">{label}</span><b className="text-white">{value}</b></div>
                <div className="mt-1.5 h-2 rounded-full bg-black/40 overflow-hidden"><div className="h-full rounded-full bg-cyan-300" style={{width: pct + '%'}} /></div>
              </div>;
            })}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {(data?.journeyRecent || []).slice(0, 6).map((j: any) => <div key={j.id} className="rounded-xl border border-white/5 bg-black/20 p-3">
              <div className="text-[9px] font-black text-cyan-300">{j.stage}</div>
              <div className="mt-1 text-xs font-bold text-white">{j.profile || 'traveler'} · {j.travelers || 0}</div>
              <div className="mt-1 text-[10px] text-stone-500">{(j.regions || []).join(' → ')}</div>
            </div>)}
          </div>
        </div>

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
