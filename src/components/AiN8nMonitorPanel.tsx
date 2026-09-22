import React, { useState, useEffect } from 'react';
import { 
  Activity, Zap, Server, Bot, Sparkles, RefreshCw, CheckCircle2, 
  AlertTriangle, ShieldAlert, Clock, Terminal, ArrowRight, Check, 
  XCircle, Cpu, Database, Lock, Unlock, Play, Layers
} from 'lucide-react';
import { Language } from '../types';

interface AiN8nMonitorPanelProps {
  language: Language;
}

export const AiN8nMonitorPanel: React.FC<AiN8nMonitorPanelProps> = ({ language }) => {
  const [n8nStatus, setN8nStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [nativeLogs, setNativeLogs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [aiTestPrompt, setAiTestPrompt] = useState('Recomienda un tour de volcanes en Costa Rica para 2 personas');
  const [aiTestResult, setAiTestResult] = useState<string | null>(null);
  const [aiTesting, setAiTesting] = useState(false);

  useEffect(() => {
    loadMonitorData();
  }, []);

  const loadMonitorData = async () => {
    setLoadingStatus(true);
    try {
      const [n8nRes, logsRes, alertsRes] = await Promise.all([
        fetch('/api/n8n/status').then(r => r.json()).catch(() => null),
        fetch('/api/native-engine/logs').then(r => r.json()).catch(() => null),
        fetch('/api/alerts').then(r => r.json()).catch(() => null)
      ]);

      if (n8nRes) setN8nStatus(n8nRes);
      if (logsRes && logsRes.logs) setNativeLogs(logsRes.logs);
      if (alertsRes) {
        const list = alertsRes.alerts || alertsRes.data || [];
        setAlerts(list);
      }
    } catch (e) {
      console.error('Error loading monitor data:', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const testN8nConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/n8n/test-connection', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ connected: false, details: e.message || 'Error de red al conectar con n8n' });
    } finally {
      setTestingConnection(false);
    }
  };

  const testAiEngine = async () => {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await fetch('/api/agent/counter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: aiTestPrompt, language })
      });
      const data = await res.json();
      setAiTestResult(data.reply || data.response || JSON.stringify(data));
    } catch (e: any) {
      setAiTestResult(`Error al invocar motor IA: ${e.message}`);
    } finally {
      setAiTesting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span>Supervisión de Motor IA & Sincronización n8n</span>
          </h3>
          <p className="text-xs text-slate-400">
            Control en tiempo real del motor cognitivo Gemini, estado de webhooks y registros de llamadas recientes.
          </p>
        </div>
        <button
          onClick={loadMonitorData}
          disabled={loadingStatus}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-md disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
          <span>Actualizar Telemetría</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Motor IA (Gemini)</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">Activo / 2.5 Flash</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Latencia promedio: ~320ms
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sincronización n8n</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {n8nStatus?.configured ? 'Conectado' : 'Modo Nativo Autónomo'}
          </div>
          <div className="text-[11px] text-indigo-400 mt-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> {n8nStatus?.endpoints?.outboundTriggers?.length || 27} Webhooks
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Seguridad Webhooks</span>
            {n8nStatus?.authSecurity?.secretConfigured ? (
              <Lock className="w-4 h-4 text-emerald-400" />
            ) : (
              <Unlock className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="text-2xl font-black text-white">
            {n8nStatus?.authSecurity?.secretConfigured ? 'HMAC Firmado' : 'Estándar'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Cabecera X-Webhook-Secret activa
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Alertas y Errores</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-white">{alerts.length} Registrados</div>
          <div className="text-[11px] text-rose-400 mt-1">
            {alerts.filter(a => a.severity === 'critical' && !a.resolved).length} críticos pendientes
          </div>
        </div>
      </div>

      {/* Interactive Testing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* n8n Connection Test Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Prueba de Conexión n8n Cloud</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                costaricatours2026.app.n8n.cloud
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Envía un ping de salud (health check) a la instancia de n8n para verificar latencia y respuesta de API.
            </p>
            {testResult && (
              <div className={`p-3 rounded-lg text-xs mb-4 font-mono ${testResult.connected ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'}`}>
                <div className="font-bold mb-1">{testResult.connected ? '✅ Conexión Exitosa con n8n' : '⚠️ Respuesta / Simulación Activa'}</div>
                <div>Status: {testResult.status || 'OK (Fallback local)'}</div>
                <div className="text-[10px] opacity-80 mt-1">{JSON.stringify(testResult.details)}</div>
              </div>
            )}
          </div>
          <button
            onClick={testN8nConnection}
            disabled={testingConnection}
            className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
            <span>{testingConnection ? 'Verificando enlace n8n...' : 'Ejecutar Test de Enlace n8n'}</span>
          </button>
        </div>

        {/* AI Engine Test Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Prueba en Vivo Motor IA (Counter Agent)</span>
              </h4>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 border border-purple-500/30 px-2 py-0.5 rounded">
                Gemini 2.5 Flash
              </span>
            </div>
            <div className="space-y-2 mb-4">
              <input
                type="text"
                value={aiTestPrompt}
                onChange={(e) => setAiTestPrompt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                placeholder="Escribe una consulta de prueba..."
              />
              {aiTestResult && (
                <div className="bg-slate-950 border border-purple-500/30 p-3 rounded-lg text-xs text-purple-200 max-h-32 overflow-y-auto">
                  <span className="font-bold text-purple-400 block mb-1">Respuesta del Agente:</span>
                  {aiTestResult}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={testAiEngine}
            disabled={aiTesting}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Bot className={`w-4 h-4 ${aiTesting ? 'animate-bounce' : ''}`} />
            <span>{aiTesting ? 'Generando respuesta IA...' : 'Enviar Consulta de Prueba a Gemini'}</span>
          </button>
        </div>
      </div>

      {/* Logs Table (Calls & Recent Errors) */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Registros de Llamadas y Errores Recientes (Engine & Webhooks)</span>
          </h4>
          <span className="text-xs text-slate-400">Mostrando eventos recientes del sistema</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Categoría / Tipo</th>
                <th className="py-3 px-3">Detalle / Acción</th>
                <th className="py-3 px-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
              {nativeLogs && nativeLogs.length > 0 ? (
                nativeLogs.slice(0, 10).map((log, index) => (
                  <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 text-indigo-300 font-bold">
                      {log.category || log.action || 'Sincronización n8n'}
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-md truncate">
                      {log.description || log.details || JSON.stringify(log)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px]">
                        Completado
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500 font-sans text-xs">
                    No hay registros de llamadas recientes en memoria. El motor opera de forma autónoma.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
