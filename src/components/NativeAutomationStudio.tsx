import React, { useEffect, useState } from 'react';
import type { Language } from '../types';
import { BrainCircuit, Activity, ShieldCheck, RefreshCw, Sparkles, ServerCog } from 'lucide-react';
import { auth } from '../firebase';

interface Props { language?: Language; }

export const NativeAutomationStudio: React.FC<Props> = ({ language = 'es' }) => {
  const es = language === 'es';
  const [status, setStatus] = useState<any>(null);
  const [tools, setTools] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [healing, setHealing] = useState(false);
  const [healingResult, setHealingResult] = useState<any>(null);

  const getAdminHeaders = async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sesión administrativa no disponible');
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
  };

  const load = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        fetch('/api/native-engine/status').then(r => r.json()),
        fetch('/api/ai/tools').then(r => r.json())
      ]);
      setStatus(s);
      setTools(t.tools || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runHealing = async () => {
    setHealing(true);
    try {
      const r = await fetch('/api/self-dev/run-healing', { method: 'POST', headers: await getAdminHeaders() });
      setHealingResult(await r.json());
      await load();
    } finally {
      setHealing(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-5 shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-300">
            <BrainCircuit className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Native AI Core</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            {es ? 'Centro de Automatización Inteligente' : 'Intelligent Automation Center'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {es ? 'IA, reservas, proveedores, seguridad y automatización ejecutados directamente en Node.js + Firestore.' : 'AI, bookings, providers, security and automation running directly on Node.js + Firestore.'}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {es ? 'Actualizar' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl bg-slate-900 p-4">
          <Activity className="w-5 h-5 text-emerald-400 mb-2" />
          <div className="text-xs text-slate-500 uppercase">Engine</div>
          <div className="text-white font-bold">{status?.status || status?.health || 'Online'}</div>
        </div>
        <div className="rounded-2xl bg-slate-900 p-4">
          <Sparkles className="w-5 h-5 text-violet-400 mb-2" />
          <div className="text-xs text-slate-500 uppercase">AI Tools</div>
          <div className="text-white font-bold">{tools.length} {es ? 'capacidades' : 'capabilities'}</div>
        </div>
        <div className="rounded-2xl bg-slate-900 p-4">
          <ShieldCheck className="w-5 h-5 text-cyan-400 mb-2" />
          <div className="text-xs text-slate-500 uppercase">Architecture</div>
          <div className="text-white font-bold">Native / Firestore</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <ServerCog className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-bold text-white">{es ? 'Capacidades activas' : 'Active capabilities'}</h3>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {tools.map(tool => <span key={tool} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">{tool}</span>)}
      </div>

      <button onClick={runHealing} disabled={healing} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50">
        {healing ? (es ? 'Ejecutando autodiagnóstico…' : 'Running self-healing…') : (es ? 'Ejecutar autodiagnóstico IA' : 'Run AI self-healing')}
      </button>

      {healingResult && (
        <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-black/40 p-3 text-xs text-slate-300">
          {JSON.stringify(healingResult, null, 2)}
        </pre>
      )}
    </section>
  );
};
