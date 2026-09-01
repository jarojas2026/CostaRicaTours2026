const fs = require('fs');
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const imports = `import React, { useEffect, useState } from 'react';
import { BookingRequest, Language } from '../types';
import { X, Server, Activity, Database, Key, Settings, ExternalLink, Zap, Mail, Bot, Network, ChevronRight } from 'lucide-react';`;

let newContent = content.replace(/import React.*lucide-react';/s, imports);

const stateVars = `  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('https://tu-n8n.com/webhook/reservas');
  
  // Multi-Agent Simulation State
  const [activeTab, setActiveTab] = useState<'bookings' | 'swarm'>('bookings');
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
  };`;

newContent = newContent.replace(/  const \[bookings, setBookings\].*?  useEffect\(\(\) => \{/s, stateVars + '\n\n  useEffect(() => {');

const tabsHtml = `        {/* Tabs */}
        <div className="flex border-b border-slate-700/50 bg-[#1e293b]/50 px-6">
          <button 
            onClick={() => setActiveTab('bookings')}
            className={\`px-4 py-3 text-sm font-bold border-b-2 transition-colors \${activeTab === 'bookings' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}\`}
          >
            Live Bookings
          </button>
          <button 
            onClick={() => setActiveTab('swarm')}
            className={\`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 \${activeTab === 'swarm' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}\`}
          >
            <Network className="w-4 h-4" /> Multi-Agent Swarm
          </button>
        </div>

        {/* Content */}`;

newContent = newContent.replace(/        {\/\* Content \*\/}/, tabsHtml);

const bookingsContent = `        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
          
          {activeTab === 'bookings' && (
            <>
              {/* n8n Configuration Panel */}`;

newContent = newContent.replace(/        {\/\* Content \*\/}\s*<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">\s*{\/\* n8n Configuration Panel \*\//, bookingsContent);

const swarmContent = `            </>
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
                  <div className={\`bg-slate-800/40 border rounded-xl p-4 transition-all duration-500 \${simStep >= 1 ? 'border-indigo-500/50 opacity-100' : 'border-slate-700/50 opacity-30'}\`}>
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
                          <span className={\`font-mono font-bold \${triageResult.urgency === 'ALTA' ? 'text-red-400' : 'text-amber-400'}\`}>{triageResult.urgency}</span>
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
                  <div className={\`bg-slate-800/40 border rounded-xl p-4 transition-all duration-500 \${simStep >= 2 ? 'border-emerald-500/50 opacity-100' : 'border-slate-700/50 opacity-30'}\`}>
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
          
        </div>
      </div>
    </div>
  );
};`;

newContent = newContent.replace(/            <\/div>\n          <\/section>\n\n        <\/div>\n      <\/div>\n    <\/div>\n  \);\n\};\n?/s, `            </div>\n          </section>\n${swarmContent}`);

fs.writeFileSync('src/components/AdminDashboard.tsx', newContent);
