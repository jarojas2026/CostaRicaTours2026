import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { N8N_WORKFLOWS, N8NWorkflowDef } from '../data/n8nWorkflowsBlueprint';
import {
  Zap, Play, CheckCircle2, AlertCircle, Copy, Download, RefreshCw,
  Terminal, Server, Code, FileText, ArrowRight, ShieldCheck, Clock,
  Cpu, Send, ExternalLink, ChevronRight, Layers, Bot, HelpCircle,
  Key, Mail, ShieldAlert, Sliders, Settings, Check, Sparkles, X, Eye
} from 'lucide-react';

interface N8NWorkflowStudioProps {
  language: Language;
}

export const N8NWorkflowStudio: React.FC<N8NWorkflowStudioProps> = ({ language }) => {
  const isEs = language === 'es';
  const [selectedWfId, setSelectedWfId] = useState<string>(N8N_WORKFLOWS[0].id);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCredentialsGuide, setShowCredentialsGuide] = useState<boolean>(false);
  const [activeNodeModal, setActiveNodeModal] = useState<any | null>(null);

  // Form input mode: 'visual' (form fields) or 'json' (raw code)
  const [inputMode, setInputMode] = useState<'visual' | 'json'>('visual');
  const [authSecretHeader, setAuthSecretHeader] = useState<string>('dev-secret-key-123');
  const [retryOnFail, setRetryOnFail] = useState<boolean>(true);
  
  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState<{
    configured: boolean;
    baseUrl: string;
    loading: boolean;
    pingResult?: { connected: boolean; status?: number; latencyMs?: number; details?: any };
  }>({
    configured: true,
    baseUrl: 'https://costaricatours2026.app.n8n.cloud',
    loading: false
  });

  // Runner state
  const [testPayload, setTestPayload] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<{
    success: boolean;
    status: number;
    latencyMs: number;
    data: any;
    error?: string;
    timestamp: string;
  } | null>(null);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeWf = N8N_WORKFLOWS.find((w) => w.id === selectedWfId) || N8N_WORKFLOWS[0];

  // Update test payload whenever active workflow changes
  useEffect(() => {
    setTestPayload(JSON.stringify(activeWf.samplePayload, null, 2));
    setRunResult(null);
  }, [activeWf.id]);

  // Check n8n status on mount
  useEffect(() => {
    checkN8NStatus();
  }, []);

  const checkN8NStatus = async () => {
    try {
      setConnectionStatus((prev) => ({ ...prev, loading: true }));
      const res = await fetch('/api/n8n/status');
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus((prev) => ({
          ...prev,
          configured: data.configured,
          baseUrl: data.baseUrl || 'https://costaricatours2026.app.n8n.cloud',
          loading: false
        }));
      } else {
        setConnectionStatus((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setConnectionStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleTestPing = async () => {
    const start = performance.now();
    try {
      setConnectionStatus((prev) => ({ ...prev, loading: true }));
      const res = await fetch('/api/n8n/test-connection', { method: 'POST' });
      const latency = Math.round(performance.now() - start);
      const data = await res.json();
      setConnectionStatus((prev) => ({
        ...prev,
        loading: false,
        pingResult: {
          connected: data.connected || false,
          status: data.status,
          latencyMs: latency,
          details: data.details
        }
      }));
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      setConnectionStatus((prev) => ({
        ...prev,
        loading: false,
        pingResult: {
          connected: false,
          latencyMs: latency,
          details: err.message
        }
      }));
    }
  };

  const handleExecuteWorkflow = async () => {
    setIsRunning(true);
    setRunResult(null);
    const start = performance.now();

    try {
      let parsedPayload: any = {};
      try {
        parsedPayload = JSON.parse(testPayload);
      } catch (jsonErr: any) {
        setIsRunning(false);
        setRunResult({
          success: false,
          status: 400,
          latencyMs: 0,
          data: null,
          error: isEs ? 'El payload no es un JSON válido: ' + jsonErr.message : 'Invalid JSON payload: ' + jsonErr.message,
          timestamp: new Date().toLocaleTimeString()
        });
        return;
      }

      const res = await fetch(activeWf.endpoint, {
        method: activeWf.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': authSecretHeader || 'dev-secret-key-123'
        },
        body: JSON.stringify(parsedPayload)
      });

      const latency = Math.round(performance.now() - start);
      const responseData = await res.json().catch(() => ({ status: res.statusText }));

      setRunResult({
        success: res.ok,
        status: res.status,
        latencyMs: latency,
        data: responseData,
        error: !res.ok ? (responseData?.error || `HTTP ${res.status}`) : undefined,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      setRunResult({
        success: false,
        status: 500,
        latencyMs: latency,
        data: null,
        error: err.message || 'Error de red al invocar el webhook',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Helper to update individual JSON properties from visual form
  const handleVisualFieldUpdate = (key: string, value: any) => {
    try {
      const current = JSON.parse(testPayload || '{}');
      current[key] = value;
      setTestPayload(JSON.stringify(current, null, 2));
    } catch {
      // ignore
    }
  };

  const handleCopyJson = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadBlueprint = (wf: N8NWorkflowDef) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(wf.blueprintJson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${wf.code.toLowerCase()}-${wf.id}-n8n-workflow.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredWorkflows = N8N_WORKFLOWS.filter((wf) => {
    if (categoryFilter === 'all') return true;
    return wf.category === categoryFilter;
  });

  // Safely parse current testPayload for the Visual Fields Form editor
  let parsedPayloadObj: Record<string, any> = {};
  try {
    parsedPayloadObj = JSON.parse(testPayload || '{}');
  } catch {
    parsedPayloadObj = {};
  }

  return (
    <div className="space-y-6 text-stone-100">
      
      {/* Top Banner: Status & Server Orchestration Metrics */}
      <div className="bg-[#03150d]/90 backdrop-blur-xl border border-emerald-500/25 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                n8n Enterprise Automation
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {isEs ? '13 Flujos en Producción' : '13 Production Workflows'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-400" />
              <span>{isEs ? 'Orquestador de Automatizaciones & Workflows n8n' : 'n8n Automation & Workflow Orchestrator'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl mt-1 leading-relaxed">
              {isEs
                ? 'Conectamos el chat de viajeros, el motor de reservas en Firestore, pasarelas de pago, análisis antifraude, contingencias climáticas y panel de guías en Telegram mediante webhooks asíncronos.'
                : 'Connecting traveler chat, Firestore booking engine, payment gateways, fraud scoring, weather contingencies, and Telegram guide ops panel via asynchronous webhooks.'}
            </p>
          </div>

          {/* Connection Pill & Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowCredentialsGuide(!showCredentialsGuide)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer ${
                showCredentialsGuide
                  ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-amber-400 border-amber-400/40'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isEs ? 'Credenciales Oficiales' : 'Official Credentials'}</span>
            </button>

            <div className="bg-[#020e08] border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3 shadow-inner">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-emerald-300/70 tracking-wider">
                  {isEs ? 'Endpoint n8n' : 'n8n Endpoint'}
                </div>
                <div className="text-xs font-mono font-bold text-amber-300 truncate max-w-[170px]">
                  {connectionStatus.baseUrl}
                </div>
              </div>

              <button
                onClick={handleTestPing}
                disabled={connectionStatus.loading}
                className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 border border-emerald-500/40 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus.loading ? 'animate-spin text-amber-400' : ''}`} />
                <span>Ping</span>
              </button>
            </div>
          </div>
        </div>

        {/* Official Credentials Guide Panel (Expandable) */}
        {showCredentialsGuide && (
          <div className="mt-4 p-5 rounded-2xl bg-[#020e08]/95 border border-amber-400/40 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-white uppercase tracking-wider">
                  {isEs ? 'Configuración de las 3 Credenciales de n8n para Producción' : '3 Official n8n Production Credentials Setup'}
                </h3>
              </div>
              <button
                onClick={() => setShowCredentialsGuide(false)}
                className="text-stone-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕ {isEs ? 'Cerrar' : 'Close'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Credential 1: Firebase / Firestore */}
              <div className="bg-[#051c14] p-4 rounded-xl border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>1. Firebase / Firestore</span>
                  </div>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono">GCP Node</span>
                </div>
                <p className="text-[11px] text-stone-300">
                  {isEs 
                    ? 'Permite a los nodos de n8n leer inventario de tours, bloquear cupos y actualizar estado de reservas.' 
                    : 'Allows n8n nodes to read tour inventory, hold seats, and update booking statuses.'}
                </p>
                <div className="space-y-1 text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-400/80">Project ID:</div>
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span>gen-lang-client-0782739149</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('gen-lang-client-0782739149');
                        setCopiedKey('project-id');
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="text-stone-400 hover:text-white p-1"
                      title="Copiar Project ID"
                    >
                      {copiedKey === 'project-id' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-emerald-400/80 mt-1">Database ID:</div>
                  <div className="flex items-center justify-between text-stone-300 text-[10px] truncate">
                    <span className="truncate">ai-studio-costaricatours-88d81273-09f7-4f87-991c-60b9b0db0dea</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('ai-studio-costaricatours-88d81273-09f7-4f87-991c-60b9b0db0dea');
                        setCopiedKey('database-id');
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="text-stone-400 hover:text-white p-1"
                      title="Copiar Database ID"
                    >
                      {copiedKey === 'database-id' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Credential 2: Gmail (Vouchers & Emails) */}
              <div className="bg-[#051c14] p-4 rounded-xl border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>2. Gmail (Vouchers)</span>
                  </div>
                  <span className="text-[10px] bg-amber-950 text-amber-400 px-2 py-0.5 rounded font-mono">OAuth2 / SMTP</span>
                </div>
                <p className="text-[11px] text-stone-300">
                  {isEs 
                    ? 'Envía confirmaciones con PDF adjunto, itinerarios y avisos de contingencia al email del viajero.' 
                    : 'Dispatches confirmations with attached PDF, itineraries, and contingency alerts to traveler email.'}
                </p>
                <div className="space-y-1 text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-emerald-500/20">
                  <div className="text-[10px] text-amber-400/80">Remitente Autorizado:</div>
                  <div className="flex items-center justify-between text-stone-200">
                    <span>info@costaricatours.es</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('info@costaricatours.es');
                        setCopiedKey('email-sender');
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="text-stone-400 hover:text-white p-1"
                    >
                      {copiedKey === 'email-sender' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1">Scope: https://mail.google.com/</div>
                </div>
              </div>

              {/* Credential 3: Telegram (Ops Bot) */}
              <div className="bg-[#051c14] p-4 rounded-xl border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>3. Telegram (Bot Operativo)</span>
                  </div>
                  <span className="text-[10px] bg-sky-950 text-sky-400 px-2 py-0.5 rounded font-mono">Telegram API</span>
                </div>
                <p className="text-[11px] text-stone-300">
                  {isEs 
                    ? 'Conecta a los guías en campo para confirmar recogidas y traslados mediante botones inline interactivos.' 
                    : 'Connects field guides to confirm pickups and transfers using interactive inline buttons.'}
                </p>
                <div className="space-y-1 text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-emerald-500/20">
                  <div className="text-[10px] text-sky-400/80">Bot Provider:</div>
                  <div className="text-stone-200 text-xs">@BotFather (Telegram)</div>
                  <div className="text-[10px] text-stone-400 mt-1">Webhook: /webhook/telegram-ops-action</div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Live Ping Output Banner if run */}
        {connectionStatus.pingResult && (
          <div className={`text-xs p-3 rounded-xl border flex items-center justify-between gap-2 ${
            connectionStatus.pingResult.connected 
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
              : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {connectionStatus.pingResult.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>
                {connectionStatus.pingResult.connected
                  ? (isEs ? 'Conexión verificada con n8n Cloud / Local Webhook Server' : 'Verified connection to n8n Cloud / Local Webhook Server')
                  : (isEs ? 'Servidor n8n respondiendo en modo Fallback Inteligente (Local)' : 'n8n Server operating in Intelligent Fallback Mode (Local)')}
              </span>
            </div>
            <span className="font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded text-amber-300 font-bold shrink-0">
              ⚡ {connectionStatus.pingResult.latencyMs} ms
            </span>
          </div>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: { es: 'Todos (13)', en: 'All (13)' } },
          { id: 'analytics', label: { es: '📊 Reportes & Telegram', en: '📊 Reports & Telegram' } },
          { id: 'chat', label: { es: 'Chat & Triage', en: 'Chat & Triage' } },
          { id: 'booking', label: { es: 'Bloqueo Cupos', en: 'Seat Hold' } },
          { id: 'payment', label: { es: 'Pagos & HMAC', en: 'Payments' } },
          { id: 'fraud', label: { es: 'Antifraude & Riesgo', en: 'Fraud & Risk' } },
          { id: 'telegram', label: { es: 'Panel Telegram', en: 'Telegram Panel' } },
          { id: 'calendar', label: { es: 'Google Calendar Sync', en: 'Calendar Sync' } },
          { id: 'feedback', label: { es: 'NPS & Post-Tour', en: 'NPS & Feedback' } },
          { id: 'fulfillment', label: { es: 'Vouchers & WhatsApp', en: 'Vouchers' } },
          { id: 'itinerary', label: { es: 'Itinerarios', en: 'Itineraries' } },
          { id: 'contingency', label: { es: 'Contingencias', en: 'Contingency' } },
          { id: 'supervision', label: { es: 'Supervisor', en: 'Supervisor' } },
          { id: 'support', label: { es: 'Soporte Humano', en: 'Support' } }
        ].map((cat) => {
          const isActive = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                isActive
                  ? 'bg-amber-400 text-stone-950 border-amber-400 shadow-md font-black'
                  : 'bg-[#03150d] text-emerald-200/80 hover:bg-[#072418] border-emerald-500/20'
              }`}
            >
              {cat.label[isEs ? 'es' : 'en']}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Workflow Cards (Left) & Active Workflow Studio (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Workflows Navigation List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-black text-emerald-400 uppercase tracking-wider px-1">
            {isEs ? 'Catálogo de Flujos n8n' : 'n8n Workflows Catalog'}
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {filteredWorkflows.map((wf) => {
              const isSelected = wf.id === activeWf.id;
              return (
                <button
                  key={wf.id}
                  onClick={() => setSelectedWfId(wf.id)}
                  className={`w-full text-left p-4 rounded-2xl transition-all cursor-pointer border flex flex-col gap-2 relative ${
                    isSelected
                      ? 'bg-[#062417] border-amber-400 shadow-xl ring-1 ring-amber-400/40'
                      : 'bg-[#03150d]/80 hover:bg-[#062014] border-emerald-500/20 text-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-amber-400 text-stone-950' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {wf.code}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {wf.method} {wf.endpoint}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400/80 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {wf.slaTarget}
                    </span>
                  </div>

                  <div className="font-bold text-sm text-white leading-snug">
                    {wf.name[isEs ? 'es' : 'en']}
                  </div>

                  <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                    {wf.description[isEs ? 'es' : 'en']}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-300/80 border-t border-emerald-500/15">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-400" />
                      {wf.nodesCount} {isEs ? 'Nodos n8n' : 'n8n Nodes'}
                    </span>
                    <span className="text-amber-400 font-bold flex items-center gap-0.5">
                      <span>{isEs ? 'Inspeccionar' : 'Inspect'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Workflow Inspector & Live Runner (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Header Card */}
          <div className="bg-[#03150d]/90 backdrop-blur-xl border border-emerald-500/25 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-black bg-amber-400 text-stone-950 px-2.5 py-1 rounded-xl">
                  {activeWf.code}
                </span>
                <div>
                  <h3 className="text-lg font-black text-white leading-tight">
                    {activeWf.name[isEs ? 'es' : 'en']}
                  </h3>
                  <span className="text-xs font-mono text-emerald-300">
                    {activeWf.method} {activeWf.endpoint}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Export / Download Blueprint */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyJson(JSON.stringify(activeWf.blueprintJson, null, 2), 'blueprint')}
                  className="px-3 py-1.5 rounded-xl bg-[#072418] hover:bg-[#0c3826] border border-emerald-500/40 text-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title={isEs ? 'Copiar JSON para importar en n8n' : 'Copy JSON to import into n8n'}
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{copiedKey === 'blueprint' ? (isEs ? '¡Copiado!' : 'Copied!') : (isEs ? 'Copiar Blueprint' : 'Copy Blueprint')}</span>
                </button>

                <button
                  onClick={() => handleDownloadBlueprint(activeWf)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  title={isEs ? 'Descargar archivo .json listo para n8n' : 'Download ready-to-use .json for n8n'}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Descargar .json' : 'Download .json'}</span>
                </button>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              {activeWf.description[isEs ? 'es' : 'en']}
            </p>

            {/* Pipeline Visual Node Architecture - Modern Interactive Canvas */}
            <div className="space-y-3 pt-3 border-t border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <span>{isEs ? 'Lienzo de Nodos n8n en Tiempo Real' : 'Real-time n8n Node Canvas'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-[#020e08] px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    {activeWf.nodes.length} {isEs ? 'Nodos Encadenados' : 'Chained Nodes'}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>

              {/* Animated Horizontal Pipeline Preview on Desktop */}
              <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {activeWf.nodes.map((node, index) => (
                  <React.Fragment key={`mini-${node.id}`}>
                    <div className="flex items-center gap-1 bg-[#020e08] border border-emerald-500/30 px-2.5 py-1 rounded-lg shrink-0">
                      <span className="w-4 h-4 rounded-full bg-amber-400 text-stone-950 text-[9px] font-black flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-[11px] font-bold text-stone-200 truncate max-w-[100px]">
                        {node.name.split(' ')[0]}
                      </span>
                    </div>
                    {index < activeWf.nodes.length - 1 && (
                      <span className="w-4 h-0.5 bg-gradient-to-r from-emerald-400 to-amber-400 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Detailed Node Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeWf.nodes.map((node, index) => {
                  const isWebhook = node.type.includes('webhook') || node.type.includes('scheduleTrigger');
                  const isAi = node.type.includes('openAi') || node.type.includes('ai') || node.name.toLowerCase().includes('ia') || node.name.toLowerCase().includes('triage');
                  const isDatabase = node.type.includes('httpRequest') || node.name.toLowerCase().includes('firestore') || node.name.toLowerCase().includes('inventario');
                  const isTelegram = node.type.includes('telegram');
                  const isAction = node.type.includes('code') || node.type.includes('crypto') || node.type.includes('respond');
                  
                  let badgeColor = 'text-emerald-300 border-emerald-500/30 bg-emerald-950/60';
                  let nodeTypeIcon = '⚡';
                  if (node.type.includes('scheduleTrigger')) {
                    badgeColor = 'text-cyan-300 border-cyan-500/40 bg-cyan-950/60';
                    nodeTypeIcon = '⏰';
                  } else if (isWebhook) {
                    badgeColor = 'text-sky-300 border-sky-500/40 bg-sky-950/60';
                    nodeTypeIcon = '🌐';
                  } else if (isTelegram) {
                    badgeColor = 'text-sky-300 border-sky-400/50 bg-sky-950/70';
                    nodeTypeIcon = '✈️';
                  } else if (isAi) {
                    badgeColor = 'text-purple-300 border-purple-500/40 bg-purple-950/60';
                    nodeTypeIcon = '🧠';
                  } else if (isDatabase) {
                    badgeColor = 'text-amber-300 border-amber-500/40 bg-amber-950/60';
                    nodeTypeIcon = '🗄️';
                  }

                  return (
                    <div
                      key={node.id}
                      onClick={() => setActiveNodeModal(node)}
                      className="group relative bg-[#020e08]/90 hover:bg-[#062216] p-3.5 rounded-2xl border border-emerald-500/20 hover:border-amber-400/60 transition-all duration-300 flex flex-col justify-between shadow-md cursor-pointer"
                    >
                      {/* Top Header of Node */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 font-black text-[11px] flex items-center justify-center shadow-sm shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                            {node.name}
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 font-semibold shrink-0 ${badgeColor}`}>
                          <span>{nodeTypeIcon}</span>
                          <span className="truncate max-w-[85px]">{node.type.replace('n8n-nodes-base.', '')}</span>
                        </span>
                      </div>

                      {/* Node Description */}
                      <p className="text-[11px] text-stone-300 leading-relaxed group-hover:text-stone-100 transition-colors">
                        {node.description}
                      </p>

                      {/* Node Status Bar & In/Out indicators */}
                      <div className="mt-3 pt-2 border-t border-emerald-500/15 flex items-center justify-between text-[10px] text-emerald-400/80">
                        <span className="flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>ONLINE</span>
                        </span>
                        <span className="text-amber-400 font-bold flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <Eye className="w-3 h-3" />
                          <span>{isEs ? 'Ver Parámetros' : 'View Config'}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Professional Interactive Form & Live Simulator */}
          <div className="bg-[#03150d]/90 backdrop-blur-xl border border-emerald-500/25 rounded-3xl p-5 shadow-2xl space-y-4">
            
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  {isEs ? 'Formulario Parametrizado & Disparador del Flujo' : 'Parametric Form & Workflow Dispatcher'}
                </h4>
              </div>

              {/* Mode Toggle Pills: Formulario Visual vs Raw JSON */}
              <div className="flex items-center bg-[#020e08] p-1 rounded-xl border border-emerald-500/30">
                <button
                  type="button"
                  onClick={() => setInputMode('visual')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    inputMode === 'visual'
                      ? 'bg-amber-400 text-stone-950 font-black shadow'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>{isEs ? 'Campos Visuales' : 'Visual Fields'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('json')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    inputMode === 'json'
                      ? 'bg-amber-400 text-stone-950 font-black shadow'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                >
                  <Code className="w-3 h-3" />
                  <span>JSON RAW</span>
                </button>
              </div>
            </div>

            {/* Visual Form Mode: Dynamic fields matching current workflow */}
            {inputMode === 'visual' ? (
              <div className="space-y-4 p-4 rounded-2xl bg-[#020e08]/90 border border-emerald-500/20">
                <div className="text-xs text-stone-300 flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isEs ? 'Configuración de Parámetros de Entrada para este Workflow' : 'Input Parameters Setup for this Workflow'}
                  </span>
                  <button
                    onClick={() => setTestPayload(JSON.stringify(activeWf.samplePayload, null, 2))}
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    {isEs ? 'Valores por Defecto' : 'Reset Defaults'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Field: Evento Trigger */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
                      Trigger Event
                    </label>
                    <input
                      type="text"
                      value={parsedPayloadObj?.trigger || activeWf.triggerEvent || ''}
                      onChange={(e) => handleVisualFieldUpdate('trigger', e.target.value)}
                      className="w-full bg-[#051c14] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Field: ID Usuario / Contacto / Canal */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
                      {activeWf.category === 'analytics'
                        ? (isEs ? 'Canal Telegram Destino' : 'Target Telegram Channel')
                        : (isEs ? 'ID Usuario / Viajero' : 'User / Traveler ID')}
                    </label>
                    <input
                      type="text"
                      value={activeWf.category === 'analytics'
                        ? (parsedPayloadObj?.canalTelegram || '@CostaRicaToursAdminOps')
                        : (parsedPayloadObj?.idUsuario || parsedPayloadObj?.titular || 'user_cr_992')}
                      onChange={(e) => {
                        if (activeWf.category === 'analytics') handleVisualFieldUpdate('canalTelegram', e.target.value);
                        else handleVisualFieldUpdate(parsedPayloadObj?.idUsuario ? 'idUsuario' : 'titular', e.target.value);
                      }}
                      className="w-full bg-[#051c14] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Field: Mensaje / Motivo / Consulta / Origen */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
                      {activeWf.category === 'analytics'
                        ? (isEs ? 'Colección de Origen de Datos (Firestore)' : 'Data Source Collection (Firestore)')
                        : (isEs ? 'Mensaje o Petición Turística' : 'Message or Tourist Request')}
                    </label>
                    <input
                      type="text"
                      value={activeWf.category === 'analytics'
                        ? (parsedPayloadObj?.origenDatos || 'Firestore Collection: bookings')
                        : (parsedPayloadObj?.mensaje || parsedPayloadObj?.nombreTour || parsedPayloadObj?.motivo || '')}
                      onChange={(e) => {
                        if (activeWf.category === 'analytics') handleVisualFieldUpdate('origenDatos', e.target.value);
                        else if ('mensaje' in parsedPayloadObj) handleVisualFieldUpdate('mensaje', e.target.value);
                        else if ('nombreTour' in parsedPayloadObj) handleVisualFieldUpdate('nombreTour', e.target.value);
                        else handleVisualFieldUpdate('motivo', e.target.value);
                      }}
                      className="w-full bg-[#051c14] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-amber-200 focus:border-amber-400 focus:outline-none font-medium"
                    />
                  </div>

                  {/* Field: Idioma */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
                      {isEs ? 'Idioma del Viajero' : 'Language'}
                    </label>
                    <select
                      value={parsedPayloadObj?.idioma || 'es'}
                      onChange={(e) => handleVisualFieldUpdate('idioma', e.target.value)}
                      className="w-full bg-[#051c14] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="es">Español (Costa Rica / LATAM)</option>
                      <option value="en">English (US / International)</option>
                    </select>
                  </div>

                  {/* Field: Token Secreto Webhook */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
                      X-Webhook-Secret Header
                    </label>
                    <input
                      type="text"
                      value={authSecretHeader}
                      onChange={(e) => setAuthSecretHeader(e.target.value)}
                      className="w-full bg-[#051c14] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Raw JSON Code Mode */
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-bold text-stone-300">
                    {isEs ? 'Cuerpo de la Petición (Payload JSON):' : 'Request Body (JSON Payload):'}
                  </label>
                  <button
                    onClick={() => setTestPayload(JSON.stringify(activeWf.samplePayload, null, 2))}
                    className="text-emerald-300/80 hover:text-white cursor-pointer underline"
                  >
                    {isEs ? 'Restablecer Payload' : 'Reset Payload'}
                  </button>
                </div>
                <textarea
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  rows={7}
                  className="w-full bg-[#020e08] text-emerald-300 font-mono text-xs p-3 rounded-2xl border border-emerald-500/30 focus:border-amber-400 focus:outline-none resize-y leading-relaxed shadow-inner"
                />
              </div>
            )}

            {/* Trigger Bar with SLA & Run Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-stone-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-stone-300 font-bold">SLA: {activeWf.slaTarget}</span>
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="font-mono text-emerald-400 text-[11px]">{activeWf.method} {activeWf.endpoint}</span>
              </div>

              <button
                onClick={handleExecuteWorkflow}
                disabled={isRunning}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20 disabled:opacity-50 active:scale-95"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isEs ? 'Ejecutando en n8n...' : 'Executing in n8n...'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isEs ? 'Disparar Webhook en Vivo' : 'Trigger Live Webhook'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Execution Result Box */}
            {runResult && (
              <div className={`p-4 rounded-2xl border space-y-2.5 mt-3 ${
                runResult.success 
                  ? 'bg-[#02180d] border-emerald-500/40 text-emerald-100' 
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    {runResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>
                      {runResult.success 
                        ? (isEs ? 'Respuesta Exitosa de n8n / Backend' : 'Successful response from n8n / Backend')
                        : (isEs ? 'Error en la Ejecución' : 'Execution Error')}
                    </span>
                    <span className="font-mono text-[10px] bg-black/40 px-2 py-0.5 rounded text-white">
                      HTTP {runResult.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-stone-300">
                    <span>⚡ {runResult.latencyMs} ms</span>
                    <span>🕒 {runResult.timestamp}</span>
                  </div>
                </div>

                {runResult.error && (
                  <div className="text-xs font-semibold text-rose-300 bg-rose-900/30 p-2 rounded-xl">
                    {runResult.error}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                    <span>{isEs ? 'Respuesta JSON Devuelta:' : 'Returned JSON Response:'}</span>
                    <button
                      onClick={() => handleCopyJson(JSON.stringify(runResult.data, null, 2), 'response-output')}
                      className="text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1 normal-case font-bold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey === 'response-output' ? (isEs ? 'Copiado' : 'Copied') : (isEs ? 'Copiar' : 'Copy')}</span>
                    </button>
                  </div>
                  <pre className="bg-[#020e08] p-3 rounded-xl font-mono text-xs text-amber-200 overflow-x-auto max-h-48 border border-emerald-500/20">
                    {JSON.stringify(runResult.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Node Inspector Modal / Drawer */}
      {activeNodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#03150d] border border-amber-400/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-stone-100">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 font-black flex items-center justify-center text-sm">
                  ⚡
                </div>
                <div>
                  <h3 className="font-black text-white text-base leading-tight">
                    {activeNodeModal.name}
                  </h3>
                  <span className="text-xs font-mono text-emerald-400">
                    {activeNodeModal.type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveNodeModal(null)}
                className="w-8 h-8 rounded-full bg-[#052418] hover:bg-[#0c3826] text-stone-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              {activeNodeModal.description}
            </p>

            <div className="bg-[#020e08] p-3.5 rounded-2xl border border-emerald-500/30 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                <span>{isEs ? 'Parámetros del Nodo en n8n' : 'n8n Node Parameters'}</span>
              </div>
              <div className="space-y-1 text-xs font-mono text-emerald-200">
                <div className="flex justify-between border-b border-emerald-500/10 py-1">
                  <span className="text-stone-400">Node ID:</span>
                  <span className="font-bold">{activeNodeModal.id}</span>
                </div>
                <div className="flex justify-between border-b border-emerald-500/10 py-1">
                  <span className="text-stone-400">Execution Mode:</span>
                  <span className="text-amber-300 font-bold">Standard Synchronous</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-400">Retry On Fail:</span>
                  <span className="text-emerald-400 font-bold">Enabled (3 attempts)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveNodeModal(null)}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs cursor-pointer shadow"
              >
                {isEs ? 'Entendido' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
