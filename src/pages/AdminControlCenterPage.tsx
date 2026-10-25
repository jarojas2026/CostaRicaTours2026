import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, BookOpen, Bot, CheckCircle2, ChevronRight, Clock3, Database, ExternalLink,
  Building2, Inbox, LayoutDashboard, Mail, RefreshCw, Settings, ShieldCheck, Store, Users, Wallet, Workflow, BrainCircuit
} from 'lucide-react';
import { Language } from '../types';
import { auth } from '../firebase';
import { CommerceOperationsPanel } from '../components/CommerceOperationsPanel';
import { KnowledgeCityPanel } from '../components/KnowledgeCityPanel';
import { AgentOfficeMap } from '../components/AgentOfficeMap';
import { AgentOfficeWorkspace } from '../components/AgentOfficeWorkspace';
import { MissionControlPanel } from '../components/MissionControlPanel';
import { OwnerExecutiveBriefingPanel } from '../components/OwnerExecutiveBriefingPanel';
import { DigitalCityRegistrationPreflight } from '../components/DigitalCityRegistrationPreflight';
import { DigitalCityReviewQueue } from '../components/DigitalCityReviewQueue';
import { AdminLeadsAnalytics, AdminAiStatsCard, AdminCronHeartbeatCard } from '../components/AdminLeadsAnalytics';

type SectionId = 'resumen' | 'gerencia' | 'leads' | 'tours' | 'operadores' | 'ia' | 'oficina' | 'misiones' | 'contenido' | 'ajustes';
type LeadLite = { id: string; status: string; lastActivityAt?: string; createdAt?: string };

const SECTIONS: { id: SectionId; icon: React.ComponentType<{ size?: number; className?: string }>; es: string; en: string }[] = [
  { id: 'resumen', icon: LayoutDashboard, es: 'Resumen', en: 'Overview' },
  { id: 'gerencia', icon: BrainCircuit, es: 'Gerencia JARVIS', en: 'JARVIS Executive' },
  { id: 'leads', icon: Inbox, es: 'Leads', en: 'Leads' },
  { id: 'tours', icon: Store, es: 'Tours / Tienda', en: 'Tours / Store' },
  { id: 'operadores', icon: Users, es: 'Operadores', en: 'Operators' },
  { id: 'ia', icon: Bot, es: 'IA', en: 'AI' },
  { id: 'oficina', icon: Building2, es: 'Oficina', en: 'Office' },
  { id: 'misiones', icon: Workflow, es: 'Misiones', en: 'Missions' },
  { id: 'contenido', icon: BookOpen, es: 'Contenido', en: 'Content' },
  { id: 'ajustes', icon: Settings, es: 'Ajustes', en: 'Settings' }
];
const isSection = (v: string): v is SectionId => SECTIONS.some(s => s.id === v);
const OPEN_LEAD_STATUSES = ['nuevo', 'cotizando', 'esperando_operador'];
const hoursSince = (iso?: string) => { const t = iso ? new Date(iso).getTime() : NaN; return Number.isNaN(t) ? 0 : (Date.now() - t) / 36e5; };

// Legibilidad: dentro del panel ningún texto baja de 14px (los paneles hijos usan tamaños diminutos).
const READABLE_CSS = `.admin-readable .text-\\[9px\\],.admin-readable .text-\\[10px\\],.admin-readable .text-\\[11px\\],.admin-readable .text-xs{font-size:.875rem;line-height:1.35rem}`;

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={'rounded-2xl border border-white/10 bg-[#071d15] p-5 sm:p-6 ' + className}>{children}</div>;
}
function Stat({ icon: Icon, value, label, hint, tone = 'text-white' }: { icon: React.ComponentType<{ size?: number; className?: string }>; value: React.ReactNode; label: string; hint?: string; tone?: string }) {
  return <Card className="flex flex-col gap-2">
    <div className="flex items-center gap-2 text-sm font-semibold text-stone-300"><Icon size={18} className="text-amber-300" />{label}</div>
    <div className={'text-3xl font-black ' + tone}>{value ?? '—'}</div>
    {hint && <div className="text-sm text-stone-400">{hint}</div>}
  </Card>;
}
function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <header className="flex flex-wrap items-end justify-between gap-3">
    <div><h2 className="text-2xl sm:text-3xl font-black text-white">{title}</h2>{subtitle && <p className="mt-1 max-w-3xl text-base text-stone-300">{subtitle}</p>}</div>
    {action}
  </header>;
}

export const AdminControlCenterPage: React.FC<{ language: Language }> = ({ language }) => {
  const es = language === 'es';
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadLite[] | null>(null);
  const [leadsError, setLeadsError] = useState('');
  const initial = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
  const [section, setSection] = useState<SectionId>(isSection(initial) ? initial : 'resumen');

  const go = (id: SectionId) => {
    setSection(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '#' + id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error(es ? 'Inicia sesión con una cuenta administrativa.' : 'Sign in with an administrator account.');
      const headers = { Authorization: 'Bearer ' + await user.getIdToken() };
      const [cc, ld] = await Promise.allSettled([
        fetch('/api/admin/control-center', { headers }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'No autorizado'); return j; }),
        // Solo lectura: los cambios de estado viven en /admin/leads.
        fetch('/api/admin/leads?limit=200', { headers }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Error'); return Array.isArray(j.leads) ? j.leads : []; })
      ]);
      if (cc.status === 'fulfilled') setData(cc.value); else throw cc.reason;
      if (ld.status === 'fulfilled') { setLeads(ld.value); setLeadsError(''); } else setLeadsError(ld.reason?.message || 'Error');
    } catch (e: any) { setError(e?.message || 'Error'); }
    finally { setLoading(false); }
  }, [es]);

  useEffect(() => { void load(); const id = window.setInterval(load, 60000); return () => window.clearInterval(id); }, [load]);

  const b = data?.business || {}, a = data?.alerts || {}, p = data?.providers || {}, auto = data?.automation || {}, pipe = data?.journeyPipeline || {}, docs = data?.documents || {};
  const office = data?.agentOffice;

  const leadStats = useMemo(() => {
    if (!leads) return null;
    const byStatus: Record<string, number> = {};
    for (const l of leads) byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    const open = leads.filter(l => OPEN_LEAD_STATUSES.includes(l.status));
    return { total: leads.length, byStatus, nuevos: byStatus.nuevo || 0, porResponder: open.length, atrasados: open.filter(l => hoursSince(l.lastActivityAt || l.createdAt) > 24).length };
  }, [leads]);

  const supervisor = useMemo(() => {
    const agents: any[] = Array.isArray(office?.agents) ? office.agents : [];
    const unavailable = !office || office.source === 'unavailable';
    const active = agents.filter(x => x.signal === 'recent_activity').length;
    return { total: office?.registered ?? agents.length, active, noSignal: agents.length - active, unavailable };
  }, [office]);

  const realAlerts = useMemo(() => (a.recent || []).filter((x: any) => x.severity === 'critical' || x.severity === 'warning'), [a.recent]);
  const alertCount = (a.critical || 0) + (a.warning || 0);

  if (error && !data) return <main className="admin-readable max-w-3xl mx-auto px-4 py-12"><div className="rounded-2xl border border-rose-400/30 bg-rose-950/30 p-8 text-rose-100"><h1 className="text-3xl font-black">{es ? 'Centro de Control' : 'Control Center'}</h1><p className="mt-3 text-base">{error}</p><button onClick={load} className="mt-5 rounded-xl bg-amber-400 px-5 py-3 text-base font-black text-stone-950">{es ? 'Reintentar' : 'Retry'}</button></div></main>;

  const supervisorCard = <Card className="flex flex-col gap-4">
    <div className="flex items-center gap-2"><Bot className="text-violet-300" size={22} /><h3 className="text-xl font-black text-white">{es ? 'Supervisor IA' : 'AI Supervisor'}</h3>
      <span className={'ml-auto rounded-full px-3 py-1 text-sm font-bold ' + (supervisor.unavailable ? 'bg-stone-500/20 text-stone-200' : supervisor.active > 0 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/15 text-amber-200')}>
        {supervisor.unavailable ? (es ? 'Telemetría no disponible' : 'Telemetry unavailable') : supervisor.active > 0 ? (es ? 'Operando' : 'Operating') : (es ? 'Sin señal reciente' : 'No recent signal')}
      </span></div>
    <div className="grid grid-cols-3 gap-3 text-center">
      <div className="rounded-xl bg-black/25 p-3"><div className="text-2xl font-black text-white">{supervisor.total ?? '—'}</div><div className="text-sm text-stone-400">{es ? 'Registrados' : 'Registered'}</div></div>
      <div className="rounded-xl bg-black/25 p-3"><div className="text-2xl font-black text-emerald-300">{supervisor.unavailable ? '—' : supervisor.active}</div><div className="text-sm text-stone-400">{es ? 'Activos' : 'Active'}</div></div>
      <div className="rounded-xl bg-black/25 p-3"><div className="text-2xl font-black text-stone-300">{supervisor.unavailable ? '—' : supervisor.noSignal}</div><div className="text-sm text-stone-400">{es ? 'Sin señal' : 'No signal'}</div></div>
    </div>
    <p className="text-sm text-stone-400">{es ? '“Sin señal” = sin heartbeat en los últimos 60 s; no significa apagado.' : '“No signal” = no heartbeat in the last 60 s; it does not mean offline.'}</p>
    {section !== 'ia' && <button type="button" onClick={() => go('ia')} className="inline-flex items-center gap-1 self-start text-base font-bold text-amber-300 hover:underline">{es ? 'Ver detalle por agente' : 'See per-agent detail'}<ChevronRight size={18} /></button>}
  </Card>;

  const leadsLink = <Link to="/admin/leads" className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-base font-black text-stone-950 hover:bg-amber-300">{es ? 'Abrir pipeline de leads' : 'Open leads pipeline'}<ExternalLink size={18} /></Link>;

  const content = (() => {
    switch (section) {
      case 'resumen': return <div className="space-y-8">
        <SectionTitle title={es ? 'Resumen' : 'Overview'} subtitle={es ? 'Lo que necesita tu atención hoy.' : 'What needs your attention today.'} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <Stat icon={Inbox} value={leadStats ? leadStats.nuevos : '—'} label={es ? 'Leads nuevos' : 'New leads'} hint={leadsError ? (es ? 'No se pudieron leer los leads' : 'Could not load leads') : leadStats ? `${leadStats.total} ${es ? 'en muestra (máx. 200)' : 'sampled (max 200)'}` : undefined} />
          <Stat icon={Clock3} value={leadStats ? leadStats.porResponder : '—'} label={es ? 'Por responder' : 'Awaiting reply'} tone={leadStats?.atrasados ? 'text-amber-300' : 'text-white'} hint={leadStats ? (leadStats.atrasados ? `${leadStats.atrasados} ${es ? 'con más de 24 h sin actividad' : 'idle for over 24 h'}` : (es ? 'Ninguno atrasado' : 'None overdue')) : undefined} />
          <Stat icon={Wallet}
            value={typeof b.confirmedBookingValueUSD === 'number' && Number.isFinite(b.confirmedBookingValueUSD) ? '$' + b.confirmedBookingValueUSD.toLocaleString(es ? 'es-CR' : 'en-US') : '—'}
            label={es ? 'Valor de reservas registradas (USD)' : 'Recorded booking value (USD)'}
            hint={es ? 'No equivale a dinero cobrado. Fuente no conciliada.' : 'Not collected cash. Source not reconciled.'} />
          <Stat icon={Wallet}
            value={typeof b.financialEvidence?.verifiedCollectionsUSD === 'number' ? '$' + b.financialEvidence.verifiedCollectionsUSD.toLocaleString(es ? 'es-CR' : 'en-US') : '—'}
            label={es ? 'Cobros conciliados (USD)' : 'Reconciled collections (USD)'}
            hint={es ? 'Sin fuente de conciliación conectada: N/D.' : 'No reconciliation source connected: N/A.'} />
          <Stat icon={AlertTriangle} value={alertCount} label={es ? 'Alertas reales' : 'Real alerts'} tone={a.critical ? 'text-rose-300' : alertCount ? 'text-amber-300' : 'text-emerald-300'} hint={`${a.critical || 0} ${es ? 'críticas' : 'critical'} · ${a.warning || 0} ${es ? 'avisos' : 'warnings'}`} />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex items-center gap-2"><AlertTriangle className="text-rose-300" size={20} /><h3 className="text-xl font-black text-white">{es ? 'Alertas que requieren acción' : 'Alerts that need action'}</h3></div>
            <ul className="mt-4 space-y-3">
              {realAlerts.slice(0, 6).map((x: any) => <li key={x.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2"><span className={'h-2.5 w-2.5 shrink-0 rounded-full ' + (x.severity === 'critical' ? 'bg-rose-400' : 'bg-amber-400')} /><b className="text-base text-white">{x.title}</b></div>
                {x.message && <p className="mt-1 text-sm text-stone-300">{x.message}</p>}
              </li>)}
              {!realAlerts.length && <li className="flex items-center gap-2 text-base text-emerald-300"><CheckCircle2 size={18} />{es ? 'Sin alertas críticas ni avisos.' : 'No critical alerts or warnings.'}</li>}
            </ul>
          </Card>
          {supervisorCard}
        </div>
        <Card>
          <h3 className="text-xl font-black text-white">{es ? 'Accesos rápidos' : 'Quick links'}</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            {leadsLink}
            <button type="button" onClick={() => go('tours')} className="rounded-xl border border-white/15 px-5 py-3 text-base font-bold text-white hover:bg-white/5">{es ? 'Cargar tarifas y cupos' : 'Load rates and inventory'}</button>
            <button type="button" onClick={() => go('operadores')} className="rounded-xl border border-white/15 px-5 py-3 text-base font-bold text-white hover:bg-white/5">{es ? 'Revisar solicitudes de operadores' : 'Review operator applications'}</button>
          </div>
        </Card>
      </div>;

      case 'leads': return <div className="space-y-6">
        <SectionTitle title="Leads" subtitle={es ? 'Solicitudes de cotización y su estado. La gestión se hace en el pipeline.' : 'Quote requests and their status. Manage them in the pipeline.'} action={leadsLink} />
        {leadsError && <p role="alert" className="text-base text-rose-300">{leadsError}</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {['nuevo', 'cotizando', 'esperando_operador', 'confirmado_por_escrito', 'pagado', 'cancelado'].map(s => <Card key={s} className="text-center">
            <div className="text-3xl font-black text-white">{leadStats ? (leadStats.byStatus[s] || 0) : '—'}</div>
            <div className="mt-1 text-sm text-stone-300">{s.replace(/_/g, ' ')}</div>
          </Card>)}
        </div>
        <AdminLeadsAnalytics envelope={data?.leads} es={es} />
      </div>;

      case 'tours': return <div className="space-y-6">
        <SectionTitle title={es ? 'Tours / Tienda' : 'Tours / Store'} subtitle={es ? 'Reservas, embudo y carga de experiencias, ofertas y cupos.' : 'Bookings, funnel and loading of experiences, offers and inventory.'} />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Stat icon={Database} value={b.totalBookings} label={es ? 'Reservas' : 'Bookings'} />
          <Stat icon={CheckCircle2} value={b.confirmedBookings} label={es ? 'Confirmadas' : 'Confirmed'} />
          <Stat icon={Clock3} value={b.pendingBookings} label={es ? 'Pendientes' : 'Pending'} />
          <Stat icon={Activity} value={b.upcoming72h} label={es ? 'Próximas 72 h' : 'Next 72 h'} />
        </div>
        <Card>
          <h3 className="text-xl font-black text-white">{es ? 'Embudo de viajeros' : 'Traveler funnel'} <span className="text-base font-normal text-stone-400">· {pipe.total || 0}</span></h3>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[[es ? 'Descubrimiento' : 'Discovery', pipe.discovery], [es ? 'Verificación' : 'Verification', pipe.verification], [es ? 'Listo para cotizar' : 'Ready to quote', pipe.readyToQuote], [es ? 'Recuperación' : 'Recovery', pipe.recovery]].map(([k, v]: any) => <div key={k} className="rounded-xl bg-black/25 p-4"><div className="text-sm text-stone-300">{k}</div><div className="mt-1 text-2xl font-black text-white">{v || 0}</div></div>)}
          </div>
        </Card>
        <CommerceOperationsPanel language={language} />
      </div>;

      case 'operadores': return <div className="space-y-6">
        <SectionTitle title={es ? 'Operadores' : 'Operators'} subtitle={es ? 'Proveedores verificados, solicitudes de participación y correo operativo. Solo visible para administración.' : 'Verified providers, participation applications and operations email. Admin only.'} />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-xl font-black text-white">{es ? 'Proveedores' : 'Providers'} <span className="text-base font-normal text-stone-400">· {p.active || 0}/{p.total || 0} {es ? 'activos' : 'active'}</span></h3>
            <ul className="mt-4 space-y-2">
              {(p.list || []).slice(0, 12).map((x: any) => <li key={x.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/25 px-4 py-3"><span className="text-base font-semibold text-white">{x.name}</span><span className="text-sm text-emerald-300">{x.status} · {x.activeOrdersCount || 0}</span></li>)}
              {!(p.list || []).length && <li className="text-base text-stone-400">{es ? 'Aún no hay proveedores verificados.' : 'No verified providers yet.'}</li>}
            </ul>
          </Card>
          <Card>
            <div className="flex items-center gap-2"><Mail className="text-sky-300" size={20} /><h3 className="text-xl font-black text-white">{es ? 'Correo de proveedores' : 'Provider email'}</h3>
              <span className={'ml-auto text-sm font-bold ' + (auto.providerInbox?.configured ? 'text-emerald-300' : 'text-amber-300')}>{auto.providerInbox?.configured ? (es ? 'Configurado' : 'Configured') : (es ? 'Pendiente' : 'Pending')}</span></div>
            <ul className="mt-4 max-h-80 overflow-auto space-y-2">
              {(data?.providerInbox || []).map((x: any) => <li key={x.id} className="rounded-xl bg-black/25 p-3"><b className="text-sm text-white">{x.status}</b><div className="text-sm text-stone-300">{x.subject || x.orderId || ''}</div></li>)}
              {!(data?.providerInbox || []).length && <li className="text-base text-stone-400">{es ? 'Sin mensajes recientes.' : 'No recent messages.'}</li>}
            </ul>
          </Card>
        </div>
        <DigitalCityReviewQueue language={language} />
      </div>;

      case 'gerencia': return <OwnerExecutiveBriefingPanel language={language} />;
      case 'misiones': return <MissionControlPanel language={language} />;
      case 'oficina': return <AgentOfficeWorkspace language={language} snapshot={office} onChanged={() => { void load(); }} />;

      case 'ia': return <div className="space-y-6">
        <SectionTitle title={es ? 'Inteligencia artificial' : 'Artificial intelligence'} subtitle={es ? 'Estado global de los agentes y automatizaciones.' : 'Global status of agents and automations.'}
          action={<div className="flex flex-wrap gap-2"><Link to="/admin/ai-command" className="rounded-xl border border-white/15 px-4 py-2 text-base font-bold text-white hover:bg-white/5">{es ? 'Sala de mando IA' : 'AI command room'}</Link><Link to="/admin/email-operations" className="rounded-xl border border-white/15 px-4 py-2 text-base font-bold text-white hover:bg-white/5">{es ? 'Centro de correo' : 'Email center'}</Link></div>} />
        <AdminAiStatsCard envelope={data?.ai} es={es} />
        <AdminCronHeartbeatCard envelope={data?.crons} es={es} />
        <div className="grid gap-6 lg:grid-cols-2">
          {supervisorCard}
          <Card>
            <div className="flex items-center gap-2"><Activity className="text-emerald-300" size={20} /><h3 className="text-xl font-black text-white">{es ? 'Automatización' : 'Automation'}</h3></div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                [es ? 'Eventos locales retenidos' : 'Retained local events', auto.engine?.totalExecutions ?? '—'],
                [es ? 'Éxito observado' : 'Observed success', auto.engine?.successRate == null ? '—' : auto.engine.successRate + '%'],
                [es ? 'Duración reportada' : 'Reported duration', auto.engine?.averageReportedDurationMs == null ? '—' : auto.engine.averageReportedDurationMs + ' ms'],
                [es ? 'Flujos activos verificados' : 'Verified active workflows', auto.engine?.activeWorkflows ?? '—'],
              ].map(([k, v]: any) => <div key={k} className="rounded-xl bg-black/25 p-3"><div className="text-xl font-black text-white">{v}</div><div className="text-sm text-stone-400">{k}</div></div>)}
            </div>
            <p className="mt-3 text-sm text-amber-200/80">{es ? 'Telemetría local: máximo 200 eventos en memoria por instancia; no representa el total global ni persiste tras reinicios.' : 'Local telemetry: up to 200 in-memory events per instance; not the global total and not durable across restarts.'}</p>
          </Card>
        </div>
        <details className="group rounded-2xl border border-white/10 bg-[#071d15] p-5">
          <summary className="cursor-pointer list-none text-lg font-bold text-white"><ChevronRight size={18} className="mr-1 inline transition-transform group-open:rotate-90" />{es ? 'Detalle por agente' : 'Per-agent detail'} ({supervisor.total ?? 0})</summary>
          <div className="mt-5"><AgentOfficeMap language={language} snapshot={office} /></div>
        </details>
        <details className="group rounded-2xl border border-white/10 bg-[#071d15] p-5">
          <summary className="cursor-pointer list-none text-lg font-bold text-white"><ChevronRight size={18} className="mr-1 inline transition-transform group-open:rotate-90" />{es ? 'Registro reciente de automatizaciones' : 'Recent automation log'}</summary>
          <ul className="mt-4 max-h-80 overflow-auto space-y-2">
            {(auto.recentLogs || []).slice(0, 15).map((x: any) => <li key={x.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/25 p-3"><span className="text-sm text-white">{x.trigger}</span><span className={'text-sm font-bold ' + (x.status === 'error' ? 'text-rose-300' : 'text-emerald-300')}>{x.status} · {x.durationMs} ms</span></li>)}
            {!(auto.recentLogs || []).length && <li className="text-base text-stone-400">{es ? 'Sin ejecuciones recientes.' : 'No recent runs.'}</li>}
          </ul>
        </details>
      </div>;

      case 'contenido': return <div className="space-y-6">
        <SectionTitle title={es ? 'Contenido' : 'Content'} subtitle={es ? 'Artículos de Knowledge City.' : 'Knowledge City articles.'} />
        <KnowledgeCityPanel language={language} />
      </div>;

      case 'ajustes': return <div className="space-y-6">
        <SectionTitle title={es ? 'Ajustes' : 'Settings'} subtitle={es ? 'Laboratorio de inscripción, gobierno financiero y datos técnicos.' : 'Registration lab, financial governance and technical data.'}
          action={<Link to="/admin/financial-legal" className="rounded-xl border border-white/15 px-4 py-2 text-base font-bold text-white hover:bg-white/5">{es ? 'Gobierno financiero y legal' : 'Financial & legal'}</Link>} />
        <DigitalCityRegistrationPreflight language={language} />
        <details className="group rounded-2xl border border-white/10 bg-[#071d15] p-5">
          <summary className="cursor-pointer list-none text-lg font-bold text-white"><ChevronRight size={18} className="mr-1 inline transition-transform group-open:rotate-90" />{es ? 'Detalles técnicos' : 'Technical details'}</summary>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Object.entries(docs).map(([k, v]: any) => <div key={k} className="rounded-xl bg-black/25 p-3"><div className="text-xl font-black text-white">{v}</div><div className="text-sm text-stone-400">{k}</div></div>)}</div>
            <div><div className="text-sm font-bold text-cyan-200">{es ? 'Conversión semanal (JSON)' : 'Weekly conversion (JSON)'}</div><pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-black/30 p-3 text-sm text-stone-300 whitespace-pre-wrap">{JSON.stringify(data?.conversion || {}, null, 2)}</pre></div>
            <p className="text-sm text-stone-400">{es ? 'Generado:' : 'Generated:'} {data?.generatedAt || '—'}</p>
          </div>
        </details>
      </div>;
    }
  })();

  return <div className="admin-readable min-h-screen text-base text-stone-200">
    <style>{READABLE_CSS}</style>
    <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
      <aside className="lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#041711] lg:overflow-y-auto">
        <div className="hidden lg:flex items-center gap-2 px-6 pt-7 pb-5 text-sm font-black uppercase tracking-widest text-amber-300"><ShieldCheck size={18} />{es ? 'Administración' : 'Admin'}</div>
        <nav aria-label={es ? 'Secciones del panel' : 'Panel sections'} className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:px-3 lg:py-0">
          {SECTIONS.map(s => {
            const Icon = s.icon; const active = section === s.id;
            const badge = s.id === 'leads' && leadStats?.porResponder ? leadStats.porResponder : s.id === 'resumen' && alertCount ? alertCount : null;
            return <button key={s.id} type="button" onClick={() => go(s.id)} aria-current={active ? 'page' : undefined}
              className={'flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ' + (active ? 'bg-amber-400 text-stone-950' : 'text-stone-200 hover:bg-white/5')}>
              <Icon size={20} />{es ? s.es : s.en}
              {badge ? <span className={'ml-auto rounded-full px-2 text-sm font-bold ' + (active ? 'bg-stone-950/20' : 'bg-amber-400/20 text-amber-200')}>{badge}</span> : null}
            </button>;
          })}
          <Link to="/admin/leads" className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-base text-stone-300 hover:bg-white/5 lg:mt-4 lg:border-t lg:border-white/10 lg:pt-4"><ExternalLink size={18} />{es ? 'Pipeline de leads' : 'Leads pipeline'}</Link>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-stone-300">{es ? 'Centro de Control · Costa Rica Tours' : 'Control Center · Costa Rica Tours'}</h1>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 px-4 py-2 text-base font-bold text-amber-200 hover:bg-amber-400/10 disabled:opacity-60"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} />{es ? 'Actualizar' : 'Refresh'}</button>
        </div>
        {error && <p role="alert" className="mb-6 rounded-xl border border-rose-400/30 bg-rose-950/30 p-4 text-base text-rose-200">{error}</p>}
        {content}
        <p className="mt-10 text-sm text-stone-500">{es ? 'Se actualiza cada 60 s. Datos sensibles: solo administración.' : 'Refreshes every 60 s. Sensitive data: admin only.'}</p>
      </main>
    </div>
  </div>;
};
