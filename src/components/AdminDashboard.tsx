import React, { useEffect, useState } from 'react';
import { BookingRequest, Language } from '../types';
import { X, Server, Activity, Database, Key, Settings, ExternalLink, Zap, Mail, Bot, Network, ChevronRight, RefreshCw, CheckCircle2, BellRing, ShieldAlert, Users, Sparkles, TrendingUp } from 'lucide-react';
import { CronDashboard } from './CronDashboard';
import { N8NWorkflowStudio } from './N8NWorkflowStudio';
import { AlertsCenter } from './AlertsCenter';
import { ProviderCommunicationHub } from './ProviderCommunicationHub';

import { AiInsightsPanel } from './AiInsightsPanel';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, language }) => {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('https://costaricatours.app.n8n.cloud/webhook/reservas');
  
  // Alerts & Notifications State
  const [unresolvedAlertsCount, setUnresolvedAlertsCount] = useState(0);
  const [criticalAlertsCount, setCriticalAlertsCount] = useState(0);

  // Multi-Agent Simulation State
  const [activeTab, setActiveTab] = useState<'bookings' | 'alerts' | 'n8n' | 'cron' | 'swarm' | 'architecture' | 'native'>('bookings');
  const [nativeStatus, setNativeStatus] = useState<any>(null);
  const [nativeLogs, setNativeLogs] = useState<any[]>([]);
  const [simEmail, setSimEmail] = useState('Hola! Somos una familia de 4 (2 adultos, 2 niños). Queremos ir a Costa Rica la primera semana de diciembre. Nos interesan los volcanes y la playa, pero uno de los niños es alérgico al maní. ¿Qué nos recomiendan?');
  const [triageResult, setTriageResult] = useState<any>(null);
  const [processorResult, setProcessorResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simStep, setSimStep] = useState<number>(0);

  const runSwarmSimulation = async () => {
    setSimLoading(true);
    setTriageResult(null);
    setProcessorResult(null);
    setSimStep(1);

    try {
      // Step 1: Triage Agent
      const resTriage = await fetch('/api/agents/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawMessage: simEmail })
      });
      const triageData = await resTriage.json();
      setTriageResult(triageData);
      
      setSimStep(2);
      
      // Step 2: Processor Agent
      const resProcessor = await fetch('/api/agents/processor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawMessage: simEmail, intent: triageData.intent, extractedData: triageData.extractedData })
      });
      const processorData = await resProcessor.json();
      setProcessorResult(processorData);
      
      setSimStep(3);
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBookings();
      fetchNativeStatus();
      fetchAlertsCount();
      const interval = setInterval(fetchAlertsCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchAlertsCount = async () => {
    try {
      const res = await fetch('/api/alerts?resolved=false');
      if (res.ok) {
        const data = await res.json();
        const list: any[] = data.alerts || data.data || [];
        const unresolved = list.filter(a => !a.resolved);
        const critical = unresolved.filter(a => a.severity === 'critical');
        setUnresolvedAlertsCount(unresolved.length);
        setCriticalAlertsCount(critical.length);
      }
    } catch (e) {
      console.error('Error fetching alerts count:', e);
    }
  };

  const fetchNativeStatus = async () => {
    try {
      const [resStatus, resLogs] = await Promise.all([
        fetch('/api/native-engine/status').then(r => r.json()).catch(() => null),
        fetch('/api/native-engine/logs').then(r => r.json()).catch(() => null)
      ]);
      if (resStatus) setNativeStatus(resStatus);
      if (resLogs && resLogs.logs) setNativeLogs(resLogs.logs);
    } catch (e) {
      console.error('Error fetching native automation status:', e);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.bookings) {
        setBookings(data.bookings.reverse());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-hidden">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-6xl h-full sm:h-[90vh] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-700/50 flex justify-between items-center bg-[#1e293b]/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">Admin & Automatizaciones</h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Motor 100% Código Nativo Activo
                </span>
              </div>
              <p className="text-xs text-indigo-300">0ms latencia • $0 costo externo • Conexión directa a Google Gemini y Firestore</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-700/50 bg-[#1e293b]/50 px-6 hide-scrollbar shrink-0">
          <button 
            onClick={() => setActiveTab('native')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'native' ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20' : 'border-transparent text-emerald-300/80 hover:text-emerald-200'}`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Motor Nativo (Código)</span>
            <span className="bg-emerald-500/30 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-mono">0ms</span>
          </button>
          <button 
            onClick={() => setActiveTab('bookings')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'bookings' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Live Bookings
          </button>
          <button 
            onClick={() => setActiveTab('alerts')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'alerts' ? 'border-rose-500 text-rose-400 bg-rose-950/20' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            <BellRing className="w-4 h-4 text-rose-400" />
            <span>Centro de Alertas</span>
            {criticalAlertsCount > 0 ? (
              <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono animate-pulse">
                {criticalAlertsCount} 🔴
              </span>
            ) : unresolvedAlertsCount > 0 ? (
              <span className="bg-amber-500/30 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                {unresolvedAlertsCount}
              </span>
            ) : null}
          </button>
          <button 
            onClick={() => setActiveTab('providers')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'providers' ? 'border-amber-400 text-amber-400 bg-amber-950/20' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>Proveedores & Logística</span>
          </button>
          <button 
            onClick={() => setActiveTab('ai-insights')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ai-insights' ? 'border-purple-400 text-purple-400 bg-purple-950/20' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Sugerencias de IA</span>
          </button>
          <button 
            onClick={() => setActiveTab('n8n')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'n8n' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            <Zap className="w-4 h-4 text-amber-400" /> Blueprints de Flujos
          </button>
          <button 
            onClick={() => setActiveTab('cron')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'cron' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            <Settings className="w-4 h-4" /> Background Jobs (Cron)
          </button>
          <button 
            onClick={() => setActiveTab('swarm')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'swarm' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            <Network className="w-4 h-4" /> Multi-Agent Swarm
          </button>
          <button 
            onClick={() => setActiveTab('architecture')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'architecture' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            <Database className="w-4 h-4" /> Architecture
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
          
          {activeTab === 'bookings' && (
            <>
              {/* n8n Configuration Panel */}
          <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-orange-400" />
                <h3 className="text-white font-bold text-sm">n8n Global Webhook URL</h3>
              </div>
              <p className="text-xs text-slate-400">Target for booking dispatch (used in fallback/demo if environment var is not set).</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input 
                type="text" 
                value={n8nWebhookUrl}
                onChange={(e) => setN8nWebhookUrl(e.target.value)}
                className="w-full sm:w-80 bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                placeholder="https://tu-n8n.com/webhook/..."
              />
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 shrink-0">
                <Settings className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </section>

          {/* Bookings Table */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-400" />
                <h3 className="text-white font-bold text-lg">Live Bookings & Agent Insights</h3>
              </div>
              <button onClick={fetchBookings} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md border border-slate-600">
                Refresh
              </button>
            </div>

            <div className="bg-slate-800/20 border border-slate-700/50 rounded-xl overflow-x-auto">
              {loading ? (
                <div className="p-10 flex flex-col items-center justify-center text-slate-400">
                  <Activity className="w-8 h-8 animate-pulse mb-2 text-indigo-500" />
                  <p>Cargando datos del servidor...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-sm">
                  No hay reservas registradas en la sesión actual.
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/80 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-xl">Booking ID</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Tour / Fecha</th>
                      <th className="px-4 py-3">AI Agent Insights (Backend)</th>
                      <th className="px-4 py-3">Antifraude</th>
                      <th className="px-4 py-3 rounded-tr-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {bookings.map((b) => (
                      <tr key={b.bookingId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-teal-400">{b.bookingId}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{b.customer.fullName}</div>
                          <div className="text-xs text-slate-500">{b.customer.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white">{b.tourName}</div>
                          <div className="text-xs text-slate-500">{b.date} • {b.time}</div>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          {b.agentInsights ? (
                            <div className="bg-indigo-900/30 p-2 rounded border border-indigo-500/20 text-[11px]">
                              <div className="text-indigo-300 font-semibold mb-1">Risk Assessment:</div>
                              <p className="text-slate-300 mb-2 italic">"{b.agentInsights.riskAssessment}"</p>
                              <div className="flex flex-wrap gap-1">
                                {b.agentInsights.automatedTags.map((tag: string, i: number) => (
                                  <span key={i} className="bg-indigo-600/30 text-indigo-200 px-1.5 py-0.5 rounded text-[9px] uppercase border border-indigo-500/40">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-xs">No insights generated</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          {b.fraudRiskScore ? (
                            <div className={`p-2 rounded border text-[11px] ${b.fraudRiskScore === 'alto' ? 'bg-rose-900/30 border-rose-500/30 text-rose-300' : b.fraudRiskScore === 'medio' ? 'bg-amber-900/30 border-amber-500/30 text-amber-300' : 'bg-emerald-900/30 border-emerald-500/30 text-emerald-300'}`}>
                              <span className="font-bold uppercase block mb-1">Riesgo: {b.fraudRiskScore}</span>
                              <span className="italic">"{b.fraudRiskJustification}"</span>
                            </div>
                          ) : (
                            <button 
                              onClick={async () => {
                                try {
                                  await fetch('/api/ai/fraud-check', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ADMIN_MOCK_TOKEN' },
                                    body: JSON.stringify(b)
                                  });
                                  fetchBookings();
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="text-[10px] bg-purple-900/30 hover:bg-purple-800/40 text-purple-300 border border-purple-500/30 px-2 py-1 rounded"
                            >
                              Evaluar Fraude (IA)
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-stone-100/40 text-teal-400 px-2 py-1 rounded text-xs font-bold border border-stone-200">
                            {b.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
            </>
          )}

          {activeTab === 'alerts' && (
            <AlertsCenter
              language={language}
              onNavigateToBooking={(bookingId) => {
                setActiveTab('bookings');
              }}
              onUnresolvedCountChange={(unresolved, critical) => {
                setUnresolvedAlertsCount(unresolved);
                setCriticalAlertsCount(critical);
              }}
            />
          )}

          {activeTab === 'native' && (
            <div className="space-y-6">
              {/* Native Engine Overview Card */}
              <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900/80 to-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <h3 className="text-xl font-black text-white tracking-tight">Motor de Automatización Nativo 100% en Código</h3>
                    </div>
                    <p className="text-sm text-slate-300 max-w-2xl">
                      La plataforma opera con lógica nativa en Node.js/Express, eliminando servidores intermedios de n8n. Todas las consultas turísticas, reservas, confirmaciones y pasarelas de pago se ejecutan en milisegundos con cero costo de suscripción.
                    </p>
                  </div>
                  <button 
                    onClick={fetchNativeStatus}
                    className="self-start md:self-auto bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/30"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Actualizar Métricas
                  </button>
                </div>

                {/* 4 Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-slate-900/80 border border-emerald-500/20 p-4 rounded-xl">
                    <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Estado del Motor</p>
                    <p className="text-2xl font-black text-white mt-1">Activo 24/7</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">100% Código Express</p>
                  </div>
                  <div className="bg-slate-900/80 border border-emerald-500/20 p-4 rounded-xl">
                    <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Latencia Media</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">&lt; 15 ms</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Ejecución en memoria</p>
                  </div>
                  <div className="bg-slate-900/80 border border-emerald-500/20 p-4 rounded-xl">
                    <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Costo Mensual n8n</p>
                    <p className="text-2xl font-black text-white mt-1">$0 USD</p>
                    <p className="text-[10px] text-emerald-400 mt-0.5">Ahorro permanente</p>
                  </div>
                  <div className="bg-slate-900/80 border border-emerald-500/20 p-4 rounded-xl">
                    <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Webhooks Nativos</p>
                    <p className="text-2xl font-black text-white mt-1">14 / 14</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Endpoints integrados</p>
                  </div>
                </div>
              </div>

              {/* Endpoints & Execution Logs Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Native Handlers */}
                <div className="lg:col-span-1 bg-slate-900/70 border border-slate-700/60 rounded-xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Flujos Nativos en Código
                  </h4>
                  <p className="text-xs text-slate-400">Controladores compilados y ejecutándose directamente en backend:</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs">
                    {[
                      { name: '1. Consulta Chat IA', path: '/webhook/chat-consulta', badge: 'Gemini 2.5' },
                      { name: '2. Inicio de Reserva', path: '/webhook/inicio-reserva', badge: 'Firestore' },
                      { name: '3. Solicitud de Pago', path: '/webhook/solicitud-pago', badge: 'Stripe' },
                      { name: '4. Confirmación Reserva', path: '/webhook/confirmacion-reserva', badge: 'Email+Voucher' },
                      { name: '5. Cotizador Itinerario', path: '/webhook/solicitud-itinerario', badge: 'Algoritmo' },
                      { name: '6. Evento Analítica', path: '/webhook/evento-analitica', badge: 'Métricas' },
                      { name: '7. Solicitud Soporte', path: '/webhook/solicitud-soporte', badge: 'Escalamiento' },
                      { name: '8. Lead Funnel', path: '/webhook/lead-funnel', badge: 'Prospectos' },
                      { name: '9. Cambio de Vuelos', path: '/webhook/cambio-vuelos', badge: 'Monitoreo' },
                      { name: '10. Reembolsos', path: '/webhook/reembolsos', badge: 'Auditoría' },
                      { name: '11. Encuesta Post-Tour', path: '/webhook/encuesta-post-tour', badge: 'Feedback' },
                      { name: '12. Alertas Clima', path: '/webhook/alertas-clima', badge: 'Emergencias' },
                      { name: '13. Verificación Operador', path: '/webhook/verificacion-operador', badge: 'CST' },
                      { name: '14. Multi-Agente Swarm', path: '/api/agents/*', badge: 'Orquestador' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
                        <div>
                          <p className="font-semibold text-slate-200">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{item.path}</p>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          {item.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Real-time Execution Logs */}
                <div className="lg:col-span-2 bg-slate-900/70 border border-slate-700/60 rounded-xl p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Registro de Eventos en Código Vivo
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {nativeLogs.length > 0 ? `${nativeLogs.length} eventos registrados` : 'Listo para procesar'}
                    </span>
                  </div>

                  {nativeLogs.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl">
                      <Bot className="w-10 h-10 text-slate-600 mb-2" />
                      <p className="text-sm font-medium text-slate-400">El motor nativo está a la escucha</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        Interactúa con el asistente de WhatsApp, crea una reserva o inicia un itinerario para ver las ejecuciones procesadas instantáneamente.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {nativeLogs.slice(0, 15).map((log, index) => (
                        <div key={index} className="p-3 bg-slate-800/50 border border-slate-700/40 rounded-lg flex items-start justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-400 font-mono">{log.action || log.event}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-slate-300 text-[11px]">
                              {log.summary || JSON.stringify(log.details || log.data || {}).slice(0, 100)}
                            </p>
                          </div>
                          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-mono shrink-0">
                            {log.durationMs ? `${log.durationMs}ms` : '0ms'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cron' && (
            <div className="py-1">
              <CronDashboard />
            </div>
          )}

          {activeTab === 'n8n' && (
            <div className="py-1">
              <N8NWorkflowStudio language={language || 'es'} />
            </div>
          )}

          {activeTab === 'swarm' && (
            <div className="space-y-6">
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Network className="w-6 h-6 text-indigo-400" />
                  <h3 className="text-white font-bold text-lg">Enjambre de Agentes (Multi-Agent Swarm)</h3>
                </div>
                <p className="text-slate-400 text-sm">
                  Simula el flujo de n8n: Un correo entra al Inbox, el <strong>Agente Triage</strong> lo lee y clasifica, y luego el <strong>Agente Procesador</strong> redacta la cotización y define las acciones en BD.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Inbox Simulation */}
                <div className="lg:col-span-1 bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-4 text-slate-300">
                    <Mail className="w-5 h-5" />
                    <span className="font-bold">Bandeja de Entrada (Gmail)</span>
                  </div>
                  <textarea 
                    value={simEmail}
                    onChange={(e) => setSimEmail(e.target.value)}
                    className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 min-h-[200px] focus:outline-none focus:border-indigo-500 resize-none"
                  />
                  <button 
                    onClick={runSwarmSimulation}
                    disabled={simLoading}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {simLoading ? <Activity className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                    {simLoading ? 'Ejecutando Agentes...' : 'Simular Pipeline n8n'}
                  </button>
                </div>

                {/* Pipeline Execution */}
                <div className="lg:col-span-2 space-y-4">
                  
                  {/* Agent 1: Triage */}
                  <div className={`bg-slate-800/40 border rounded-xl p-4 transition-all duration-500 ${simStep >= 1 ? 'border-indigo-500/50 opacity-100' : 'border-slate-700/50 opacity-30'}`}>
                    <div className="flex items-center gap-2 mb-3 text-indigo-300">
                      <Bot className="w-5 h-5" />
                      <span className="font-bold">1. Agente de Clasificación (Triage)</span>
                      {simStep === 1 && <Activity className="w-4 h-4 animate-spin ml-auto" />}
                    </div>
                    {triageResult && (
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                          <span className="text-slate-500 block mb-1">Intención detectada:</span>
                          <span className="font-mono text-teal-400 font-bold">{triageResult.intent}</span>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                          <span className="text-slate-500 block mb-1">Urgencia:</span>
                          <span className={`font-mono font-bold ${triageResult.urgency === 'ALTA' ? 'text-red-400' : 'text-orange-400'}`}>{triageResult.urgency}</span>
                        </div>
                        <div className="col-span-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                          <span className="text-slate-500 block mb-1">Datos extraídos:</span>
                          <pre className="text-slate-300 font-mono overflow-x-auto">{JSON.stringify(triageResult.extractedData, null, 2)}</pre>
                        </div>
                        <div className="col-span-2 bg-indigo-900/20 p-2 rounded-lg border border-indigo-500/30 text-indigo-300">
                          <span className="font-bold">Enrutar hacia n8n Node:</span> {triageResult.nextAgentRoute}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center text-slate-600">
                    <ChevronRight className="w-6 h-6 rotate-90 lg:rotate-0" />
                  </div>

                  {/* Agent 2: Processor */}
                  <div className={`bg-slate-800/40 border rounded-xl p-4 transition-all duration-500 ${simStep >= 2 ? 'border-teal-500/50 opacity-100' : 'border-slate-700/50 opacity-30'}`}>
                    <div className="flex items-center gap-2 mb-3 text-teal-400">
                      <Bot className="w-5 h-5" />
                      <span className="font-bold">2. Agente de Ventas / Procesador</span>
                      {simStep === 2 && <Activity className="w-4 h-4 animate-spin ml-auto" />}
                    </div>
                    {processorResult && (
                      <div className="space-y-4 text-xs">
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                          <span className="text-slate-500 block mb-1">Acciones en Base de Datos (CRM):</span>
                          <ul className="list-disc pl-4 text-slate-300 space-y-1">
                            {processorResult.databaseActions?.map((act: string, i: number) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-stone-100/10 p-3 rounded-lg border border-teal-500/30">
                          <span className="text-teal-500 font-bold block mb-2">Borrador de Respuesta Generado:</span>
                          <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">{processorResult.draftResponse}</div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'providers' && (
            <ProviderCommunicationHub language={language} />
          )}

          {activeTab === 'ai-insights' && (
            <AiInsightsPanel />
          )}
          
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-white font-bold text-xl mb-4">Motor Operativo de Alta Concurrencia</h3>
                <p className="text-slate-400 text-sm mb-6">Esta es la arquitectura distribuida por agentes lista para ser orquestada vía n8n, capaz de soportar concurrencia masiva, caídas de proveedores y fallas de formato de datos.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Pillar 1 */}
                  <div className="bg-slate-900/50 border border-indigo-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-indigo-400 mb-2 flex items-center gap-2"><Network className="w-4 h-4"/> 1. Ingesta Omnicanal</h4>
                    <p className="text-xs text-slate-300 mb-2">Webhooks balanceados envían peticiones a un sistema de colas. El Agente Triage normaliza cualquier texto informal a un esquema JSON estricto.</p>
                    <div className="bg-indigo-900/20 text-indigo-300 text-[10px] p-2 rounded font-mono">
                      POST /api/agents/triage
                    </div>
                  </div>

                  {/* Pillar 2 */}
                  <div className="bg-slate-900/50 border border-teal-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-teal-400 mb-2 flex items-center gap-2"><Settings className="w-4 h-4"/> 2. Formularios y Bloqueo</h4>
                    <p className="text-xs text-slate-300 mb-2">Captura dinámica de datos (restricciones, pesos). Soft Hold de 15 mins con links de pago con expiración. Timeouts automáticos en n8n.</p>
                    <div className="bg-stone-100/20 text-teal-300 text-[10px] p-2 rounded font-mono">
                      Dynamic Form Hooks & Webhook Handlers
                    </div>
                  </div>

                  {/* Pillar 3 */}
                  <div className="bg-slate-900/50 border border-orange-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-orange-400 mb-2 flex items-center gap-2"><Zap className="w-4 h-4"/> 3. Motor de Contingencias</h4>
                    <p className="text-xs text-slate-300 mb-2">Intercepta fallos de clima y disponibilidad. Analiza alternativas viables cercanas y despacha un correo empático de re-agendamiento a "1-clic".</p>
                    <div className="bg-amber-900/20 text-orange-300 text-[10px] p-2 rounded font-mono">
                      POST /api/agents/contingency
                    </div>
                  </div>

                  {/* Pillar 4 */}
                  <div className="bg-slate-900/50 border border-rose-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-rose-400 mb-2 flex items-center gap-2"><Activity className="w-4 h-4"/> 4. Bucle Self-Healing</h4>
                    <p className="text-xs text-slate-300 mb-2">El Agente Supervisor audita los logs de errores y genera ajustes dinámicos de prompts para prevenir el mismo fallo al leer correos informales.</p>
                    <div className="bg-rose-900/20 text-rose-300 text-[10px] p-2 rounded font-mono">
                      POST /api/agents/supervisor
                    </div>
                  </div>

                </div>
              </div>

              {/* Exception Logger Demo */}
              <div className="bg-slate-800/40 border border-rose-500/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2"><Bot className="w-5 h-5 text-rose-400"/> Supervisor: Diagnóstico de Errores</h3>
                  <button onClick={async () => {
                      const res = await fetch('/api/agents/log_exception', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ agentName: 'OperationsAgent', errorContext: 'Timeout from local provider or unreadable format', rawData: 'El compa dijo q tal vez alas 3 o4' })
                      });
                    }} 
                    className="text-xs bg-rose-900/40 text-rose-300 px-3 py-1.5 rounded hover:bg-rose-900/60 transition"
                  >
                    Simular Error de Proveedor
                  </button>
                </div>
                
                <button onClick={async () => {
                    const res = await fetch('/api/agents/supervisor', { method: 'POST' });
                    const data = await res.json();
                    alert("Análisis del Supervisor:\n\n" + JSON.stringify(data, null, 2));
                  }}
                  className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-white font-bold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Activity className="w-4 h-4" /> Ejecutar Agente Supervisor (Auditar Logs)
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};