const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const stateVarReplacement = `  const [activeTab, setActiveTab] = useState<'bookings' | 'swarm' | 'architecture'>('bookings');`;
content = content.replace(/  const \[activeTab, setActiveTab\] = useState<.*?>\('bookings'\);/, stateVarReplacement);

const tabsHtml = `          <button 
            onClick={() => setActiveTab('architecture')}
            className={\`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 \${activeTab === 'architecture' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}\`}
          >
            <Database className="w-4 h-4" /> Advanced Architecture
          </button>
        </div>`;

content = content.replace(/        <\/div>\s*{\/\* Content \*\//, tabsHtml + '\n\n        {/* Content */');

const archContent = `          {activeTab === 'architecture' && (
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
};`;

content = content.replace(/        <\/div>\n      <\/div>\n    <\/div>\n  \);\n\};\n?/s, `${archContent}`);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
