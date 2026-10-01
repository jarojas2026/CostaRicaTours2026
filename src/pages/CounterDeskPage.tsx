import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, CalendarCheck, CircleAlert, Gauge, MessageCircle, RefreshCw, Send, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { Language } from '../types';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { deskCounterValue, deskRequest, hasDeskSnapshot } from '../utils/deskRequest';

interface Props { language: Language; }

export const CounterDeskPage: React.FC<Props> = ({ language }) => {
  const es = language === 'es';
  const [sessionId] = useState(() => {
    const key = 'crt-counter-session';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = 'counter_' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36));
    localStorage.setItem(key, created);
    return created;
  });
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [autopilot, setAutopilot] = useState<any>(null);
  const [aiPlan, setAiPlan] = useState<any>(null);
  const [error, setError] = useState('');
  const [voiceConfig, setVoiceConfig] = useState<any>(null);
  const [operationsError, setOperationsError] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const sessionVersion = useRef(0);

  const loadAutopilot = useCallback(async () => {
    const version = ++requestVersion.current;
    const user = auth.currentUser;
    try {
      if (!user) throw new Error(es ? 'Inicia sesión con una cuenta autorizada para ver datos operativos.' : 'Sign in with an authorized account to view operational data.');
      const token = await user.getIdToken();
      const data = await deskRequest('/api/counter/autopilot', { headers: { Authorization: 'Bearer ' + token } }, language);
      if (!hasDeskSnapshot(data)) throw new Error(es ? 'No se recibió un estado operativo válido.' : 'No valid operational snapshot was received.');
      if (version !== requestVersion.current || auth.currentUser !== user) return;
      setAutopilot(data);
      setLastUpdated(new Date().toISOString());
      setOperationsError('');
    } catch (e) {
      if (version !== requestVersion.current || auth.currentUser !== user) return;
      setAutopilot(null);
      setAiPlan(null);
      setLastUpdated(null);
      setOperationsError(e instanceof Error ? e.message : (es ? 'Datos no disponibles.' : 'Data unavailable.'));
    }
  }, [es, language]);

  const organizeWithAI = async () => {
    if (loading) return;
    const version = sessionVersion.current;
    setLoading(true); setError('');
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!token) throw new Error(es ? 'Inicia sesión con una cuenta administrativa autorizada.' : 'Sign in with an authorized administrative account.');
      if (version !== sessionVersion.current) return;
      const data = await deskRequest('/api/counter/organize', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      }, language);
      if (version !== sessionVersion.current) return;
      setAiPlan(data);
      await loadAutopilot();
    } catch (e: any) { if (version === sessionVersion.current) setError(e.message || 'Error'); }
    finally { if (version === sessionVersion.current) setLoading(false); }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      const version = ++sessionVersion.current;
      requestVersion.current++;
      setAutopilot(null); setAiPlan(null); setVoiceConfig(null); setLastUpdated(null);
      setReply(''); setError(''); setVoiceError(''); setLoading(false);
      void loadAutopilot();
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const data = await deskRequest('/api/voice/config', { headers: { Authorization: 'Bearer ' + token } }, language);
        if (version === sessionVersion.current) setVoiceConfig(data.config || null);
      } catch (e) {
        if (version === sessionVersion.current) setVoiceError(es ? 'No se pudo verificar la configuración de voz.' : 'Voice configuration could not be verified.');
      }
    });
    const id = window.setInterval(() => { void loadAutopilot(); }, 60000);
    return () => { unsubscribe(); window.clearInterval(id); requestVersion.current++; sessionVersion.current++; };
  }, [loadAutopilot, language, es]);

  const ask = async (text = message) => {
    if (!text.trim() || loading) return;
    const version = sessionVersion.current;
    setLoading(true); setError('');
    try {
      const data = await deskRequest('/api/counter/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, language })
      }, language);
      if (version !== sessionVersion.current) return;
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error(es ? 'El asesor no devolvió una respuesta. Tu consulta sigue sin resolver.' : 'The advisor returned no answer. Your inquiry is still unresolved.');
      setReply(data.reply);
      setMessage(current => current === text ? '' : current);
    } catch (e: any) {
      if (version === sessionVersion.current) setError(e.message || 'Error');
    } finally { if (version === sessionVersion.current) setLoading(false); }
  };

  const refresh = async () => {
    if (loading) return;
    const version = sessionVersion.current;
    setLoading(true);
    try { await loadAutopilot(); }
    finally { if (version === sessionVersion.current) setLoading(false); }
  };

  const quick = [
    { label: es ? 'Consultar un tour y sus cupos' : 'Ask about a tour and availability', action: () => ask(es ? 'Quiero reservar un tour y verificar cupos' : 'I want to book a tour and check availability') },
    { label: es ? 'Proponer plan operativo de 72 horas' : 'Propose a 72-hour operations plan', action: organizeWithAI },
    { label: es ? 'Consultar alertas operativas' : 'Check operational alerts', action: refresh }
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

      <section className="rounded-3xl border border-sky-400/20 bg-[#07131c] p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-black text-sky-300">☎ Agent Desk de Voz</div>
            <h2 className="text-xl font-black text-white mt-1">
              {es ? 'Recepción de llamadas para hoteles y operadores' : 'Inbound calling for hotels and tour operators'}
            </h2>
            <p className="text-xs text-stone-400 mt-2 max-w-3xl">
              {es
                ? 'Un hotel puede enrutar el teléfono de sus habitaciones, PBX o SIP hacia una línea del Agent Desk. La llamada entra al mismo ecosistema de IA, memoria y operaciones, y puede pasar a una persona cuando sea necesario.'
                : 'A hotel can route room phones, PBX or SIP to an Agent Desk line. The call enters the same AI, memory and operations ecosystem and can be handed to a person when needed.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase">
            <span className={`rounded-full border px-3 py-1.5 ${voiceConfig?.ready ? 'border-emerald-400/30 text-emerald-300 bg-emerald-400/5' : 'border-amber-400/30 text-amber-300 bg-amber-400/5'}`}>
              {voiceConfig?.ready ? (es ? 'CONFIGURADO · PRUEBA TELEFÓNICA PENDIENTE' : 'CONFIGURED · PHONE TEST REQUIRED') : (es ? 'VOZ NO VERIFICADA' : 'VOICE UNVERIFIED')}
            </span>
            {voiceConfig?.humanTransferConfigured && <span className="rounded-full border border-sky-400/30 text-sky-300 bg-sky-400/5 px-3 py-1.5">HUMAN HANDOFF</span>}
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          {[
            [es ? 'Primera atención' : 'First response', voiceConfig?.primaryHandler || 'Agent Desk IA'],
            [es ? 'Contexto' : 'Context', es ? 'Hotel · habitación · idioma' : 'Hotel · room · language'],
            [es ? 'Responsable humano' : 'Human owner', voiceConfig?.humanTransferConfigured ? voiceConfig.humanTransferLabel : (es ? 'Por asignar y configurar' : 'Assignment and configuration required')]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/5 bg-black/20 p-3">
              <div className="text-[9px] uppercase font-black text-stone-500">{label}</div>
              <div className="text-sm font-bold text-white mt-1">{value}</div>
            </div>
          ))}
        </div>
        {voiceConfig?.missing?.length > 0 && <p className="mt-3 text-xs text-amber-200" role="status">{es ? 'Configuración pendiente: ' : 'Missing configuration: '}{voiceConfig.missing.join(', ')}</p>}
        {voiceError && <p className="mt-3 text-xs text-amber-200" role="status">{voiceError}</p>}
      </section>

      <div className="rounded-2xl border border-amber-400/20 bg-[#061d14] p-4 text-sm text-stone-200" role="status" aria-live="polite">
        {operationsError || (lastUpdated
          ? `${es ? 'Última consulta recibida' : 'Last snapshot received'}: ${new Date(lastUpdated).toLocaleTimeString(es ? 'es-CR' : 'en-US')}`
          : (es ? 'Datos operativos aún no verificados. Los guiones no significan cero reservas.' : 'Operational data is not verified yet. Dashes do not mean zero bookings.'))}
      </div>
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          [Gauge, deskCounterValue(autopilot, 'totalBookings'), es ? 'Reservas' : 'Bookings'],
          [CalendarCheck, deskCounterValue(autopilot, 'upcoming72h'), es ? 'Próximas 72h' : 'Next 72h'],
          [CircleAlert, deskCounterValue(autopilot, 'unresolvedAlerts'), es ? 'Alertas' : 'Alerts'],
          [ShieldCheck, deskCounterValue(autopilot, 'criticalAlerts'), es ? 'Críticas' : 'Critical'],
          [Users, deskCounterValue(autopilot, 'activeProviders'), es ? 'Proveedores' : 'Providers'],
          [Zap, deskCounterValue(autopilot, 'pendingPayments'), es ? 'Pagos pendientes' : 'Pending payments']
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
            {quick.map(q => <button key={q.label} onClick={q.action} disabled={loading} className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100 hover:bg-amber-400/10 disabled:opacity-50">{q.label}</button>)}
          </div>
          <div className="flex gap-2">
            <input aria-label={es ? 'Consulta al asesor' : 'Ask the advisor'} maxLength={5000} value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask(); }} placeholder={es ? 'Escribe al Counter Agent…' : 'Message the Counter Agent…'} className="flex-1 rounded-2xl border border-emerald-500/20 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/50" />
            <button aria-label={es ? 'Enviar consulta' : 'Send inquiry'} onClick={() => ask()} disabled={loading || !message.trim()} className="rounded-2xl bg-amber-400 px-4 text-stone-950 disabled:opacity-50"><Send size={18} /></button>
          </div>
          {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
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
            {!autopilot?.actions?.length && !aiPlan?.priorities?.length && <p className="text-sm text-stone-400">{autopilot ? (es ? 'Sin acciones sugeridas en esta consulta.' : 'No suggested actions in this snapshot.') : (es ? 'Pendiente de cargar operaciones.' : 'Operational data has not loaded.')}</p>}
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
            {!autopilot?.snapshot?.upcoming?.length && <p className="text-sm text-stone-400">{autopilot ? (es ? 'Sin salidas en esta consulta de las próximas 72 horas.' : 'No departures in this 72-hour snapshot.') : (es ? 'Salidas no verificadas.' : 'Departures unverified.')}</p>}
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
            {!autopilot?.snapshot?.alerts?.length && <p className="text-sm text-stone-400">{autopilot ? (es ? 'Sin alertas en esta consulta.' : 'No alerts in this snapshot.') : (es ? 'Alertas no verificadas.' : 'Alerts unverified.')}</p>}
          </div>
        </div>
      </section>
    </div>
  );
};
