import React, { useState, useEffect } from 'react';
import {
  Users, Phone, MessageSquare, ShieldCheck, Clock, CheckCircle2,
  RefreshCw, Cpu, Zap, Navigation, DollarSign, Radio, Check, X,
  Sparkles, MapPin, FileText, AlertTriangle
} from 'lucide-react';
import { auth } from '../firebase';

interface ProviderCommunicationHubProps {
  language?: 'es' | 'en';
}

export const ProviderCommunicationHub: React.FC<ProviderCommunicationHubProps> = ({ language = 'es' }) => {
  const [providersData, setProvidersData] = useState<any>(null);
  const [selfDevData, setSelfDevData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [healingRunning, setHealingRunning] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'providers' | 'orders' | 'self_dev' | 'routes'>('providers');

  const adminToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error(language === 'es' ? 'Sesión administrativa no disponible.' : 'Admin session is not available.');
    return user.getIdToken();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await adminToken();
      const response = await fetch('/api/admin/control-center', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const control = await response.json();
      if (!response.ok) throw new Error(control?.error || control?.message || 'Admin Control Center request failed');
      const providerPlane = control?.providers || {};
      setProvidersData({
        sourceOfTruth: providerPlane.sourceOfTruth,
        legacyDirectoryExcluded: providerPlane.legacyDirectoryExcluded === true,
        observedAt: providerPlane.observedAt,
        providers: Array.isArray(providerPlane.list) ? providerPlane.list.filter((provider: any) => provider?.verified === true) : [],
        recentServiceOrders: Array.isArray(providerPlane.recentServiceOrders) ? providerPlane.recentServiceOrders : []
      });
      setSelfDevData(control?.evolution?.selfDevelopment || null);
    } catch (e: any) {
      console.error('Error fetching provider hub data:', e);
      setProvidersData({ providers: [], recentServiceOrders: [], legacyDirectoryExcluded: true });
      setActionFeedback(language === 'es'
        ? `No se pudo leer el plano operativo verificado: ${e?.message || 'error no especificado'}`
        : `Verified operational plane could not be loaded: ${e?.message || 'unspecified error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleRunSelfHealing = async () => {
    try {
      setHealingRunning(true);
      const token = await adminToken();
      const res = await fetch('/api/self-dev/run-healing', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Self-healing request failed');

      const locks = Number(data.metrics?.staleLocksFreed || 0);
      const detected = Number(data.metrics?.slaBreachesDetected || 0);
      const recovered = Number(data.metrics?.slaBreachesRecovered || 0);
      const unresolved = Number(data.metrics?.slaBreachesUnresolved || 0);
      const score = Number.isFinite(Number(data.systemHealthScore)) ? Number(data.systemHealthScore) : null;
      const summary = language === 'es'
        ? `Auto-diagnóstico ejecutado con datos reales: ${locks} hold(s) liberados; ${detected} excepción(es) SLA detectadas, ${recovered} recuperadas y ${unresolved} pendientes.${score !== null ? ` Score operacional derivado: ${score}/100.` : ''}`
        : `Evidence-backed diagnostic completed: ${locks} hold(s) released; ${detected} SLA exception(s) detected, ${recovered} recovered and ${unresolved} unresolved.${score !== null ? ` Derived operational score: ${score}/100.` : ''}`;
      setActionFeedback(summary);
      await fetchData();
    } catch (e: any) {
      console.error(e);
      setActionFeedback(language === 'es'
        ? `No se pudo completar el auto-diagnóstico: ${e?.message || 'error no especificado'}`
        : `Self-diagnostic could not be completed: ${e?.message || 'unspecified error'}`);
    } finally {
      setHealingRunning(false);
    }
  };

  const handleProviderAction = async (orderId: string, action: 'confirm' | 'reject' | 'delay' | 'no_show') => {
    try {
      const token = await adminToken();
      const res = await fetch('/api/providers/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ orderId, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || 'Provider action failed');
      setActionFeedback(data.message || (language === 'es' ? 'Acción registrada exitosamente' : 'Action recorded successfully'));
      await fetchData();
    } catch (e: any) {
      console.error(e);
      setActionFeedback(language === 'es'
        ? `No se pudo registrar la acción: ${e?.message || 'error no especificado'}`
        : `Action could not be recorded: ${e?.message || 'unspecified error'}`);
    }
  };

  const providers = (providersData?.providers || []).filter((provider: any) => provider?.verified === true);
  const serviceOrders = providersData?.recentServiceOrders || [];
  const selfLogs = selfDevData?.recentHealingLogs || [];
  const routeOptimizations = selfDevData?.routeOptimizations || [];
  const pricingInsights = selfDevData?.pricingIntelligence || [];
  const healthScore = Number.isFinite(Number(selfDevData?.systemHealthScore)) ? Number(selfDevData.systemHealthScore) : null;
  const unresolvedSlaBreaches = Number(selfDevData?.healthScoreBasis?.unresolvedSlaBreaches || 0);
  const healingActionsTotal = Number(selfDevData?.autoHealingActionsTotal || 0);

  return (
    <div className="space-y-6 text-slate-100">
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-[#0c1e14] border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              {language === 'es' ? 'Mission Control de Proveedores' : 'Provider Mission Control'}
            </h3>
          </div>
          <p className="text-xs text-emerald-200/80">
            {language === 'es'
              ? 'Órdenes y proveedores desde el plano administrativo autenticado. Sólo registros verificados/activos de Firestore participan como verdad operacional.'
              : 'Orders and providers from the authenticated admin plane. Only verified/active Firestore records participate as operational truth.'}
          </p>
          <p className="text-[10px] text-slate-500">
            {providersData?.sourceOfTruth || (language === 'es' ? 'Fuente operativa no disponible' : 'Operational source unavailable')}
            {providersData?.observedAt ? ` • ${new Date(providersData.observedAt).toLocaleString()}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRunSelfHealing}
            disabled={healingRunning}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healingRunning ? 'animate-spin' : ''}`} />
            <span>{healingRunning
              ? (language === 'es' ? 'Diagnosticando...' : 'Diagnosing...')
              : (language === 'es' ? '⚡ Ejecutar Auto-Diagnóstico' : '⚡ Run Self-Diagnostic')}
            </span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title={language === 'es' ? 'Refrescar datos' : 'Refresh data'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-200">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-emerald-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex border-b border-slate-800 gap-2 pb-2 overflow-x-auto">
        <button onClick={() => setActiveSubTab('providers')} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'providers' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800/60 text-slate-400 hover:text-white'}`}>
          <Users className="w-3.5 h-3.5" />
          <span>{language === 'es' ? 'Proveedores' : 'Providers'} ({providers.length})</span>
        </button>
        <button onClick={() => setActiveSubTab('orders')} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'orders' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800/60 text-slate-400 hover:text-white'}`}>
          <FileText className="w-3.5 h-3.5" />
          <span>{language === 'es' ? 'Órdenes de Servicio' : 'Service Orders'} ({serviceOrders.length})</span>
        </button>
        <button onClick={() => setActiveSubTab('self_dev')} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'self_dev' ? 'bg-amber-500 text-stone-950 shadow-sm font-black' : 'bg-slate-800/60 text-slate-400 hover:text-white'}`}>
          <Cpu className="w-3.5 h-3.5" />
          <span>{language === 'es' ? 'Auto-Healing' : 'Self-Healing'}</span>
        </button>
        <button onClick={() => setActiveSubTab('routes')} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'routes' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800/60 text-slate-400 hover:text-white'}`}>
          <Navigation className="w-3.5 h-3.5" />
          <span>{language === 'es' ? 'Rutas & Pricing Advisory' : 'Routes & Pricing Advisory'}</span>
        </button>
      </div>

      {activeSubTab === 'providers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.length === 0 && (
            <div className="md:col-span-2 bg-slate-900/60 rounded-2xl p-8 text-center text-slate-400 border border-slate-800">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-bold text-white">{language === 'es' ? 'No hay proveedores operativos verificados para mostrar' : 'No verified operational providers to display'}</p>
              <p className="text-xs text-slate-500 mt-1">{language === 'es' ? 'No se utiliza el directorio histórico como fallback.' : 'Historical directory is not used as fallback.'}</p>
            </div>
          )}
          {providers.map((prov: any) => (
            <div key={prov.id} className="bg-slate-900/90 border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl p-4 transition-all space-y-3 relative overflow-hidden group">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">VERIFICADO</span>
                    {prov.cstLevel != null && <span className="text-[10px] text-slate-400">CST: {prov.cstLevel}</span>}
                  </div>
                  <h4 className="text-sm font-black text-white mt-1 group-hover:text-emerald-300 transition">{prov.name}</h4>
                  <p className="text-xs text-slate-400">{prov.contactName || '—'} • {prov.region || 'Costa Rica'}</p>
                </div>
                <div className="text-right shrink-0">
                  {prov.averageResponseMinutes != null && prov.slaTargetMinutes != null ? (
                    <span className="inline-block bg-slate-800 text-emerald-400 text-[10px] font-black px-2 py-1 rounded-md border border-emerald-500/20">
                      SLA observado: {prov.averageResponseMinutes}m / objetivo {prov.slaTargetMinutes}m
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">SLA sin evidencia suficiente</span>
                  )}
                  {prov.observedAcceptanceRate != null && <p className="text-[10px] text-slate-400 mt-0.5">Aceptación observada: {prov.observedAcceptanceRate}%</p>}
                </div>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Canal operativo:</span>
                  <span className="text-amber-300 font-bold flex items-center gap-1"><MessageSquare className="w-3 h-3 text-emerald-400" /> {prov.whatsapp ? 'WhatsApp configurado' : 'No configurado'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Órdenes activas:</span>
                  <span className="font-mono text-white text-[10px]">{Number(prov.activeOrdersCount || 0)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {prov.whatsapp && (
                  <a
                    href={`https://wa.me/${String(prov.whatsapp).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Costa Rica Tours - Central de Operaciones. Hola ${prov.contactName || prov.name}, contacto manual del administrador.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{language === 'es' ? 'Contacto manual admin' : 'Admin manual contact'}</span>
                  </a>
                )}
                <button
                  onClick={() => {
                    setSelectedProvider(prov);
                    setActionFeedback(language === 'es'
                      ? `${prov.name} seleccionado. Las órdenes reales se crean desde una reserva/Journey y conservan auditoría e idempotencia.`
                      : `${prov.name} selected. Real orders are created from a booking/Journey with audit and idempotency.`);
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-400/30 flex items-center gap-1 transition cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedProvider?.id === prov.id ? (language === 'es' ? 'Seleccionado' : 'Selected') : (language === 'es' ? 'Seleccionar' : 'Select')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'orders' && (
        <div className="space-y-3">
          {serviceOrders.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl p-8 text-center text-slate-400 border border-slate-800">
              <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-bold text-white">{language === 'es' ? 'No hay órdenes de servicio activas' : 'No active service orders'}</p>
              <p className="text-xs text-slate-500 mt-1">{language === 'es' ? 'Las órdenes aparecen aquí desde Firestore después de ser creadas por el lifecycle real de reserva.' : 'Orders appear here from Firestore after creation by the real booking lifecycle.'}</p>
            </div>
          ) : serviceOrders.map((order: any) => (
            <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400 text-xs">{order.id}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${order.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : order.status === 'dispatched' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}`}>{order.status}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{order.tourName}</h4>
                <p className="text-xs text-slate-400">Operador: <strong className="text-slate-200">{order.providerName}</strong> • {order.date} ({order.time})</p>
                {order.payoutAmountUSD != null && <p className="text-xs text-emerald-300">Liquidación registrada: <strong>${order.payoutAmountUSD} USD</strong></p>}
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {order.wazeUrl && <a href={order.wazeUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-[#33ccff]/20 hover:bg-[#33ccff]/30 text-[#33ccff] font-bold text-xs rounded-xl border border-[#33ccff]/40 flex items-center gap-1"><Navigation className="w-3.5 h-3.5" /><span>Waze</span></a>}
                {order.status === 'dispatched' && <>
                  <button onClick={() => handleProviderAction(order.id, 'confirm')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"><Check className="w-3.5 h-3.5" /><span>Confirmar</span></button>
                  <button onClick={() => handleProviderAction(order.id, 'delay')} className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/40 flex items-center gap-1 transition cursor-pointer"><Clock className="w-3.5 h-3.5" /><span>Demora</span></button>
                  <button onClick={() => handleProviderAction(order.id, 'reject')} className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/40 flex items-center gap-1 transition cursor-pointer"><X className="w-3.5 h-3.5" /><span>Failover</span></button>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'self_dev' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block mb-1">{language === 'es' ? 'Score operacional derivado' : 'Derived operational score'}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400">{healthScore !== null ? `${healthScore}/100` : '—'}</span>
                <span className="text-[10px] text-slate-500 font-bold">{selfDevData?.healthScoreBasis?.derived ? (language === 'es' ? 'basado en señales observadas' : 'observed signals') : (language === 'es' ? 'sin datos' : 'no data')}</span>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block mb-1">{language === 'es' ? 'Acciones reales registradas' : 'Recorded real actions'}</span>
              <div className="flex items-baseline gap-2"><span className="text-2xl font-black text-amber-400">{healingActionsTotal}</span><span className="text-[10px] text-slate-400 font-bold">log</span></div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block mb-1">{language === 'es' ? 'Excepciones SLA pendientes' : 'Unresolved SLA exceptions'}</span>
              <div className="flex items-baseline gap-2"><span className={`text-2xl font-black ${unresolvedSlaBreaches > 0 ? 'text-rose-400' : 'text-indigo-400'}`}>{unresolvedSlaBreaches}</span><span className="text-[10px] text-slate-400 font-bold">{language === 'es' ? 'observadas ahora' : 'observed now'}</span></div>
            </div>
          </div>

          {selfDevData?.healthScoreBasis?.definition && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 flex gap-2 items-start">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{selfDevData.healthScoreBasis.definition}</span>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-400" />{language === 'es' ? 'Historial de acciones ejecutadas' : 'Executed action log'}</h4>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 hide-scrollbar">
              {selfLogs.length === 0 && <p className="text-xs text-slate-500">{language === 'es' ? 'No hay acciones de auto-healing registradas en este runtime.' : 'No self-healing actions recorded in this runtime.'}</p>}
              {selfLogs.map((log: any) => (
                <div key={log.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">{log.resolved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}{log.description}</span>
                    <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[11px] text-emerald-300/90 pl-5">{language === 'es' ? 'Resultado:' : 'Result:'} {log.impact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'routes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5"><Navigation className="w-4 h-4 text-indigo-400" />{language === 'es' ? 'Optimización de Rutas con Evidencia' : 'Evidence-backed Route Optimization'}</h4>
            {routeOptimizations.length === 0 && <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 text-xs text-slate-400">{language === 'es' ? 'Sin rutas optimizadas verificadas. El sistema no genera ejemplos ficticios cuando no existe telemetría real de pickups, tiempos y geolocalización.' : 'No verified optimized routes. The system does not generate fictional examples without real pickup, timing and geolocation telemetry.'}</div>}
            {routeOptimizations.map((route: any, i: number) => (
              <div key={i} className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between"><span className="font-bold text-white">{route.zone}</span><span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">-{route.minutesSaved} min / -{route.co2SavedKg} kg CO2</span></div>
                <ul className="space-y-1 text-[11px] text-slate-400 pl-2">{route.optimizedSequence?.map((seq: string, j: number) => <li key={j} className="flex items-center gap-1 text-slate-300"><MapPin className="w-3 h-3 text-amber-400 shrink-0" /><span>{seq}</span></li>)}</ul>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-amber-400" />{language === 'es' ? 'Pricing Advisory (no autoritativo)' : 'Pricing Advisory (non-authoritative)'}</h4>
            <p className="text-[11px] text-slate-500">{language === 'es' ? 'Estas señales son recomendaciones modeladas. No cambian la tarifa server-authoritative ni prueban disponibilidad.' : 'These are modeled recommendations. They do not change server-authoritative price or prove availability.'}</p>
            {pricingInsights.map((insight: any, i: number) => (
              <div key={i} className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between"><span className="font-bold text-white">{insight.tourName}</span><span className="text-amber-400 font-mono font-black">${insight.recommendedPriceUSD} USD <span className="text-slate-500 text-[10px]">(base ${insight.basePriceUSD})</span></span></div>
                <p className="text-[11px] text-slate-400">{insight.justification}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
