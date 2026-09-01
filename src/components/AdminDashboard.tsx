import React, { useEffect, useState } from 'react';
import { BookingRequest, Language } from '../types';
import { X, Server, Activity, Database, Key, Settings, ExternalLink, Zap, Mail, Bot, Network, ChevronRight } from 'lucide-react';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, language }) => {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('https://tu-n8n.com/webhook/reservas');
  
  // Multi-Agent Simulation State
  const [activeTab, setActiveTab] = useState<'bookings' | 'swarm' | 'architecture'>('bookings');
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
    }
  }, [isOpen]);

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
              <h2 className="text-xl font-black text-white tracking-tight">Admin & Automations Control</h2>
              <p className="text-xs text-indigo-300">n8n Workflow Webhooks & Booking Insights</p>
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
        <div className="flex border-b border-slate-700/50 bg-[#1e293b]/50 px-6">
          <button 
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'bookings' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Live Bookings
          </button>
          <button 
            onClick={() => setActiveTab('swarm')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'swarm' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            <Network className="w-4 h-4" /> Multi-Agent Swarm
          </button>
          <button 
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'architecture' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            <Database className="w-4 h-4" /> Advanced Architecture
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
          
          {activeTab === 'bookings' && (
            <>
              {/* n8n Configuration Panel */}
          <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-white font-bold text-lg">n8n Automation Webhooks</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Configura el webhook de tu servidor n8n para enviar automáticamente las nuevas reservas. 
              El Agente de IA ya ha pre-procesado las tareas operativas (Insights) que llegarán en el Payload de n8n.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={n8nWebhookUrl}
                onChange={(e) => setN8nWebhookUrl(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="https://tu-n8n.com/webhook/..."
              />
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-colors flex items-center justify-center gap-2">
                <Settings className="w-4 h-4" />
                Guardar Configuración
              </button>
            </div>
          </section>

          {/* Bookings Table */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
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
                      <th className="px-4 py-3 rounded-tr-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {bookings.map((b) => (
                      <tr key={b.bookingId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-emerald-400">{b.bookingId}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{b.customer.fullName}</div>
                          <div className="text-xs text-slate-500">{b.customer.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white">{b.tourName}</div>
                          <div className="text-xs text-slate-500">{b.date} • {b.time}</div>
                        </td>
                        <td className="px-4 py-3 max-w-sm">
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
                        <td className="px-4 py-3">
                          <span className="bg-emerald-900/40 text-emerald-400 px-2 py-1 rounded text-xs font-bold border border-emerald-800">
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
                          <span className="font-mono text-emerald-400 font-bold">{triageResult.intent}</span>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                          <span className="text-slate-500 block mb-1">Urgencia:</span>
                          <span className={`font-mono font-bold ${triageResult.urgency === 'ALTA' ? 'text-red-400' : 'text-amber-400'}`}>{triageResult.urgency}</span>
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
                  <div className={`bg-slate-800/40 border rounded-xl p-4 transition-all duration-500 ${simStep >= 2 ? 'border-emerald-500/50 opacity-100' : 'border-slate-700/50 opacity-30'}`}>
                    <div className="flex items-center gap-2 mb-3 text-emerald-400">
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
                        <div className="bg-emerald-900/10 p-3 rounded-lg border border-emerald-500/30">
                          <span className="text-emerald-500 font-bold block mb-2">Borrador de Respuesta Generado:</span>
                          <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">{processorResult.draftResponse}</div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
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
                  <div className="bg-slate-900/50 border border-emerald-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2"><Settings className="w-4 h-4"/> 2. Formularios y Bloqueo</h4>
                    <p className="text-xs text-slate-300 mb-2">Captura dinámica de datos (restricciones, pesos). Soft Hold de 15 mins con links de pago con expiración. Timeouts automáticos en n8n.</p>
                    <div className="bg-emerald-900/20 text-emerald-300 text-[10px] p-2 rounded font-mono">
                      Dynamic Form Hooks & Webhook Handlers
                    </div>
                  </div>

                  {/* Pillar 3 */}
                  <div className="bg-slate-900/50 border border-amber-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-amber-400 mb-2 flex items-center gap-2"><Zap className="w-4 h-4"/> 3. Motor de Contingencias</h4>
                    <p className="text-xs text-slate-300 mb-2">Intercepta fallos de clima y disponibilidad. Analiza alternativas viables cercanas y despacha un correo empático de re-agendamiento a "1-clic".</p>
                    <div className="bg-amber-900/20 text-amber-300 text-[10px] p-2 rounded font-mono">
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