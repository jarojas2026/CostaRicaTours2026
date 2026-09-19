import React, { useEffect, useState } from 'react';
import { Activity, Bot, RefreshCw, ShieldCheck, Users, CreditCard, AlertTriangle } from 'lucide-react';
import { auth } from '../firebase';

export default function AutonomousOperationsPage({ language = 'es' }: { language?: 'es' | 'en' }) {
  const es = language === 'es';
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const organize = async () => {
    setLoading(true); setError('');
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!token) throw new Error(es ? 'Se requiere sesión de operador.' : 'Operator session required.');
      const response = await fetch('/api/counter/organize', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Organizer error');
      setPlan(data);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { organize(); }, []);

  const counters = plan?.snapshot?.counters || {};
  const cards = [
    [AlertTriangle, es ? 'Alertas' : 'Alerts', counters.unresolvedAlerts || 0],
    [CreditCard, es ? 'Pagos pendientes' : 'Pending payments', counters.pendingPayments || 0],
    [Activity, es ? 'Salidas 72h' : '72h departures', counters.upcoming72h || 0],
    [Users, es ? 'Proveedores activos' : 'Active providers', counters.activeProviders || 0]
  ];

  return (
    <main className="min-h-screen bg-[#03130d] text-stone-100 px-4 md:px-8 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-[0.2em]">
              <Bot size={15} /> {es ? 'Centro Operativo Autónomo' : 'Autonomous Operations Center'}
            </div>
            <h1 className="text-3xl md:text-5xl font-black mt-2">{es ? 'La página se organiza sola' : 'The page organizes itself'}</h1>
            <p className="text-stone-400 mt-2 max-w-3xl">{es ? 'La IA reordena prioridades según reservas, pagos, alertas y cobertura. Las acciones sensibles permanecen bajo autorización humana.' : 'AI reorders priorities from bookings, payments, alerts and coverage. Sensitive actions remain human-authorized.'}</p>
          </div>
          <button onClick={organize} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 text-stone-950 px-5 py-3 font-black disabled:opacity-50">
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            {loading ? (es ? 'Organizando…' : 'Organizing…') : (es ? 'Reorganizar ahora' : 'Reorganize now')}
          </button>
        </header>

        {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</div>}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map(([Icon, label, value]: any) => (
            <div key={label} className="rounded-3xl border border-emerald-400/15 bg-emerald-400/5 p-5">
              <Icon size={18} className="text-emerald-300" />
              <div className="text-3xl font-black mt-3">{value}</div>
              <div className="text-xs text-stone-400 mt-1">{label}</div>
            </div>
          ))}
        </section>

        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
          <div className="rounded-3xl border border-amber-400/20 bg-black/20 p-5">
            <div className="flex items-center gap-2 mb-4"><ShieldCheck size={18} className="text-amber-300" /><h2 className="font-black">{es ? 'Cola inteligente de prioridades' : 'Intelligent priority queue'}</h2></div>
            {plan?.summary && <p className="text-sm text-stone-300 mb-4">{plan.summary}</p>}
            <div className="space-y-3">
              {(plan?.priorities || plan?.actions || []).slice(0, 8).map((item: any, index: number) => (
                <article key={item.id || index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex justify-between gap-4">
                    <span className="text-[10px] uppercase font-black text-amber-300">{item.priority || 'medium'}</span>
                    {item.safe !== false && <span className="text-[10px] uppercase font-black text-emerald-300">safe</span>}
                  </div>
                  <div className="font-bold mt-1">{item.action}</div>
                  <div className="text-xs text-stone-500 mt-1">{item.reason}</div>
                </article>
              ))}
              {!plan?.priorities?.length && !plan?.actions?.length && <div className="text-sm text-stone-500">{es ? 'No hay prioridades pendientes.' : 'No pending priorities.'}</div>}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-violet-400/20 bg-violet-400/5 p-5">
              <h2 className="font-black mb-3">{es ? 'Watchlist IA' : 'AI watchlist'}</h2>
              {(plan?.watchlist || []).map((x: string, i: number) => <div key={i} className="text-xs text-violet-100 py-2 border-b border-violet-300/10">{x}</div>)}
            </div>
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-5">
              <h2 className="font-black mb-3">{es ? 'Handoffs' : 'Handoffs'}</h2>
              {(plan?.handoffs || []).map((x: string, i: number) => <div key={i} className="text-xs text-emerald-100 py-2 border-b border-emerald-300/10">{x}</div>)}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
