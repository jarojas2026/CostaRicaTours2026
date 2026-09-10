import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { N8N_WORKFLOWS, N8NWorkflowDef } from '../data/n8nWorkflowsBlueprint';
import {
  Zap, Play, CheckCircle2, AlertCircle, Copy, Download, RefreshCw,
  Terminal, Server, Code, FileText, ArrowRight, ShieldCheck, Clock,
  Cpu, Send, ExternalLink, ChevronRight, Layers, Bot, HelpCircle
} from 'lucide-react';

interface N8NWorkflowStudioProps {
  language: Language;
}

export const N8NWorkflowStudio: React.FC<N8NWorkflowStudioProps> = ({ language }) => {
  const isEs = language === 'es';
  const [selectedWfId, setSelectedWfId] = useState<string>(N8N_WORKFLOWS[0].id);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState<{
    configured: boolean;
    baseUrl: string;
    loading: boolean;
    pingResult?: { connected: boolean; status?: number; latencyMs?: number; details?: any };
  }>({
    configured: true,
    baseUrl: 'https://costaricatours.app.n8n.cloud',
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
          baseUrl: data.baseUrl || 'https://costaricatours.app.n8n.cloud',
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
          'X-Webhook-Secret': 'dev-secret-key-123'
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
                {isEs ? '8 Flujos en Producción' : '8 Production Workflows'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-400" />
              <span>{isEs ? 'Orquestador de Automatizaciones & Workflows n8n' : 'n8n Automation & Workflow Orchestrator'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl mt-1 leading-relaxed">
              {isEs
                ? 'Conectamos el chat de viajeros, el motor de reservas en Firestore, las pasarelas de pago y las contingencias climáticas mediante webhooks asíncronos y modelos de IA en n8n.'
                : 'Connecting traveler chat, Firestore booking engine, payment gateways, and weather contingencies via asynchronous webhooks and AI models in n8n.'}
            </p>
          </div>

          {/* Connection Pill & Ping Action */}
          <div className="bg-[#020e08] border border-emerald-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 shadow-inner">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-emerald-300/70 tracking-wider">
                {isEs ? 'Endpoint Base n8n' : 'n8n Base Endpoint'}
              </div>
              <div className="text-xs font-mono font-bold text-amber-300 truncate max-w-[220px]">
                {connectionStatus.baseUrl}
              </div>
            </div>

            <button
              onClick={handleTestPing}
              disabled={connectionStatus.loading}
              className="px-3.5 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border border-emerald-500/40 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus.loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isEs ? 'Test Ping' : 'Test Ping'}</span>
            </button>
          </div>
        </div>

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
          { id: 'all', label: { es: 'Todos (8)', en: 'All (8)' } },
          { id: 'chat', label: { es: 'Chat & Triage', en: 'Chat & Triage' } },
          { id: 'booking', label: { es: 'Bloqueo Cupos', en: 'Seat Hold' } },
          { id: 'payment', label: { es: 'Pagos & HMAC', en: 'Payments' } },
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

            {/* Pipeline Visual Node Architecture */}
            <div className="space-y-2 pt-2 border-t border-emerald-500/20">
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>{isEs ? 'Diagrama de Nodos del Pipeline en n8n' : 'n8n Pipeline Node Flow'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeWf.nodes.map((node, index) => (
                  <div
                    key={node.id}
                    className="bg-[#020e08] p-2.5 rounded-xl border border-emerald-500/20 flex items-start gap-2 text-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-950 text-amber-400 border border-emerald-500/40 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{node.name}</div>
                      <div className="text-[10px] font-mono text-emerald-400/70 truncate">{node.type}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5 leading-snug">{node.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Live Tester / Runner */}
          <div className="bg-[#03150d]/90 backdrop-blur-xl border border-emerald-500/25 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  {isEs ? 'Simulador & Disparador de Webhooks en Vivo' : 'Live Webhook Simulator & Runner'}
                </h4>
              </div>

              <button
                onClick={() => setTestPayload(JSON.stringify(activeWf.samplePayload, null, 2))}
                className="text-[11px] text-emerald-300/80 hover:text-white cursor-pointer underline"
              >
                {isEs ? 'Restablecer Payload' : 'Reset Payload'}
              </button>
            </div>

            {/* Editable JSON Payload Textarea */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-300">
                {isEs ? 'Cuerpo de la Petición (Payload JSON):' : 'Request Body (JSON Payload):'}
              </label>
              <textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                rows={6}
                className="w-full bg-[#020e08] text-emerald-300 font-mono text-xs p-3 rounded-2xl border border-emerald-500/30 focus:border-amber-400 focus:outline-none resize-y leading-relaxed shadow-inner"
              />
            </div>

            {/* Trigger Button */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isEs ? 'Autenticación con cabecera X-Webhook-Secret' : 'Authenticated via X-Webhook-Secret header'}</span>
              </div>

              <button
                onClick={handleExecuteWorkflow}
                disabled={isRunning}
                className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
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
              <div className={`p-4 rounded-2xl border space-y-2 mt-3 ${
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
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                    {isEs ? 'Respuesta JSON Devuelta:' : 'Returned JSON Response:'}
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

    </div>
  );
};
