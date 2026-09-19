import React, { useEffect, useMemo, useState } from 'react';
import { Bot, CalendarCheck, CircleAlert, Gauge, MessageCircle, RefreshCw, Send, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { Language } from '../types';
import { auth } from '../firebase';

interface Props { language: Language; }

export const CounterDeskPage: React.FC<Props> = ({ language }) => {
  const es = language === 'es';
  const [sessionId] = useState(() => {
    const key = 'crt-counter-session';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = 'counter_' + Math.random().toString(36).slice(2, 15);
    localStorage.setItem(key, created);
    return created;
  });
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [autopilot, setAutopilot] = useState<any>(null);
  const [aiPlan, setAiPlan] = useState<any>(null);
  const [error, setError] = useState('');

  const loadAutopilot = async () => {
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!token) return;
      const r = await fetch('/api/counter/autopilot', { headers: { Authorization: 'Bearer ' + token } });
      const data = await r.json();
      if (r.ok) setAutopilot(data);
    } catch {}
  };

  const organizeWithAI = async () => {
    setLoading(true); setError('');
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!token) throw new Error(es ? 'Inicia sesión como operador para organizar operaciones.' : 'Sign in as an operator to organize operations.');
      const r = await fetch('/api/counter/organize', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error');
      setAiPlan(data);
      setAutopilot(data);
    } catch (e: any) { setError(e.message || 'Error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadAutopilot();
    const id = window.setInterval(loadAutopilot, 60000);
    return () => window.clearInterval(id);
  }, []);

  const counters = useMemo(() => autopilot?.snapshot?.counters || {}, [autopilot]);

  const ask = async (text = message) => {
    if (!text.trim() || loading) return;
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/counter/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, language })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo contactar al Counter Agent');
      setReply(data.reply || '');
      setMessage('');
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally { setLoading(false); }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!token) throw new Error(es ? 'Inicia sesión como operador.' : 'Sign in as an operator.');
      const r = await fetch('/api/counter/autopilot', { headers: { Authorization: 'Bearer ' + token } });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error');
      setAutopilot(data);
    } catch (e: any) { setError(e.message || 'Error'); }
    finally { setLoading(false); }
  };

  const quick = [
    es ? 'Quiero reservar un tour y verificar cupos' : 'I want to book a tour and check availability',
    es ? 'Organiza las operaciones de las próximas 72 horas' : 'Organize the next 72 hours of operations',
    es ? '¿Qué problemas requieren atención ahora?' : 'What needs attention right now?'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <section className="rounded-3xl border border-amber-400/30 bg-[#03150e]/95 p-5 md:p-7 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-[0.2em]">
              <Bot className="w-4 h-4" /> Counter Desk Full Stack
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white mt-2 tracking-tight">
              {es ? 'Mostrador Digital + Centro Autónomo' : 'Digital Front Desk + Autonomous Center'}
            </h1>
            <p className="text-stone-300 max-w-3xl mt-3">
              {es
                ? 'Unifica atención, conocimiento operativo y organización preventiva sin reemplazar los sistemas existentes. La IA propone; las operaciones sensibles siguen protegidas.'
                : 'Unifies customer service, operational knowledge and preventive organization without replacing existing systems. AI proposes; sensitive operations remain protected.'}
            </p>
          </div>
          <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 font-black text-stone-950 hover:bg-amber-300 disabled:opacity-50">
            <RefreshCw className={loading ? 'animate-spin' : ''} size={17} /> {es ? 'Actualizar centro' : 'Refresh center'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          [Gauge, counters.totalBookings ?? 0, es ? 'Reservas' : 'Bookings'],
          [CalendarCheck, counters.upcoming72h ?? 0, es ? 'Próximas 72h' : 'Next 72h'],
          [CircleAlert, counters.unresolvedAlerts ?? 0, es ? 'Alertas' : 'Alerts'],
          [ShieldCheck, counters.criticalAlerts ?? 0, es ? 'Críticas' : 'Critical'],
          [Users, counters.activeProviders ?? 0, es ? 'Proveedores' : 'Providers'],
          [Zap, counters.pendingPayments ?? 0, es ? 'Pagos pendientes' : 'Pending payments']
        ].map(([Icon, value, label]: any) => (
          <div key={label} className="rounded-2xl border border-emerald-500/20 bg-[#061d14] p-4">
            <Icon className="w-5 h-5 text-amber-300 mb-2" />
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-[10px] uppercase font-bold text-stone-400">{label}</div>
          </div>
        ))}
      </section>

      <section className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-3xl border border-emerald-500/20 bg-[#061d14] p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="text-amber-300" size={18} />
            <h2 className="font-black text-white">Sofía • Counter Agent</h2>
            <span className="ml-auto text-[10px] rounded-full border border-emerald-400/30 px-2 py-1 text-emerald-300">FULL STACK</span>
          </div>
          <div className="min-h-40 rounded-2xl bg-black/20 border border-white/5 p-4 text-sm text-stone-200 whitespace-pre-wrap">
            {reply || (es ? 'Pregunta por disponibilidad, reservas, proveedores, pagos, rutas o atención al cliente.' : 'Ask about availability, bookings, providers, payments, routing or customer service.')}
          </div>
          <div className="flex flex-wrap gap-2 my-4">
            {quick.map(q => <button key={q} onClick={() => ask(q)} className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100 hover:bg-amber-400/10">{q}</button>)}
          </div>
          <div className="flex gap-2">
            <input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask(); }} placeholder={es ? 'Escribe al Counter Agent…' : 'Message the Counter Agent…'} className="flex-1 rounded-2xl border border-emerald-500/20 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/50" />
            <button onClick={() => ask()} disabled={loading} className="rounded-2xl bg-amber-400 px-4 text-stone-950 disabled:opacity-50"><Send size={18} /></button>
          </div>
          {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
        </div>

        <div className="rounded-3xl border border-violet-400/20 bg-[#0b0a18] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-violet-300" size={18} />
            <h2 className="font-black text-white">{es ? 'Organizador IA' : 'AI Organizer'}</h2>
            <button onClick={organizeWithAI} disabled={loading} className="ml-auto rounded-xl bg-violet-500/20 border border-violet-400/30 px-3 py-1.5 text-[10px] font-black text-violet-200 hover:bg-violet-500/30 disabled:opacity-50">
              {loading ? (es ? 'Analizando…' : 'Analyzing…') : (es ? 'Organizar con IA' : 'Organize with AI')}
            </button>
          </div>
          <p className="text-xs text-stone-400 mb-4">{es ? 'Prioriza tareas con datos operativos actuales. No ejecuta acciones irreversibles por sí solo.' : 'Prioritizes tasks using current operational data. It does not execute irreversible actions by itself.'}</p>
          <div className="space-y-3">
            {(autopilot?.actions || []).map((a: any) => (
              <div key={a.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2"><span className="text-[9px] uppercase font-black text-amber-300">{a.priority}</span><span className="text-sm font-bold text-white">{a.action}</span></div>
                <p className="text-xs text-stone-400 mt-1">{a.reason}</p>
              </div>
            ))}
            {!autopilot?.actions?.length && !aiPlan?.priorities?.length && <p className="text-sm text-stone-500">Sin acciones sugeridas.</p>}
            {aiPlan?.summary && <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-400/5 p-3 text-xs text-violet-100">{aiPlan.summary}</div>}
            {(aiPlan?.priorities || []).slice(0, 8).map((a: any) => (
              <div key={'ai-' + a.id} className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-3">
                <div className="text-[9px] uppercase font-black text-violet-300">{a.priority || 'medium'}</div>
                <div className="text-sm font-bold text-white">{a.action}</div>
                <div className="text-xs text-stone-400 mt-1">{a.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-3xl border border-emerald-500/20 bg-[#061d14] p-5">
          <h2 className="font-black text-white mb-3">{es ? 'Salidas próximas' : 'Upcoming departures'}</h2>
          <div className="space-y-2 max-h-72 overflow-auto">
            {(autopilot?.snapshot?.upcoming || []).map((b: any) => (
              <div key={b.bookingId} className="flex justify-between gap-3 rounded-xl bg-black/20 p-3 text-xs">
                <div><div className="font-bold text-white">{b.tourName || b.bookingId}</div><div className="text-stone-400">{b.date} {b.time || ''}</div></div>
                <span className="text-emerald-300">{b.status || 'pending'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-rose-500/20 bg-[#170b0b] p-5">
          <h2 className="font-black text-white mb-3">{es ? 'Alertas activas' : 'Active alerts'}</h2>
          <div className="space-y-2 max-h-72 overflow-auto">
            {(autopilot?.snapshot?.alerts || []).map((a: any) => (
              <div key={a.id} className="rounded-xl bg-black/20 p-3 text-xs"><div className="font-bold text-white">{a.title}</div><div className="text-stone-400">{a.message}</div></div>
            ))}
            {!autopilot?.snapshot?.alerts?.length && <p className="text-sm text-stone-500">No hay alertas activas.</p>}
          </div>
        </div>
      </section>
    </div>
  );
};
