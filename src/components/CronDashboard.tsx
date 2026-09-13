import React, { useState } from 'react';
import { Clock, Play, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export function CronDashboard({ language = 'es' }: { language?: 'es' | 'en' }) {
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, { status: 'success' | 'error', time: string, message: string }>>({});

  const t = {
    title: language === 'es' ? 'Motor de Automatización Cron' : 'Cron Automation Engine',
    subtitle: language === 'es' ? 'Gestión de tareas programadas en segundo plano' : 'Background scheduled tasks management',
    forceRun: language === 'es' ? 'Forzar Ejecución' : 'Force Run',
    running: language === 'es' ? 'Ejecutando...' : 'Running...',
    jobs: [
      {
        id: 'CRON_SEMANAL_CONVERSION',
        name: language === 'es' ? 'Reporte Semanal de Conversión' : 'Weekly Conversion Report',
        schedule: 'Lunes / Monday 08:00 AM',
        desc: language === 'es' ? 'Despacha el resumen de ventas al equipo en Telegram' : 'Dispatches sales summary to Telegram team',
        endpoint: '/api/n8n/dispatch-weekly-report',
      },
      {
        id: 'AUTO_RELEASE_HOLD',
        name: language === 'es' ? 'Limpiador de Reservas Soft Hold' : 'Soft Hold Cleaner',
        schedule: 'Cada 5 minutos / Every 5 mins',
        desc: language === 'es' ? 'Libera cupos no pagados que han expirado' : 'Releases unpaid bookings that have expired',
        endpoint: '/webhook/health-check', // using health-check as placeholder for now since we didn't expose a manual trigger for this yet, but we could!
      },
      {
        id: 'CRON_NPS_DISPATCH',
        name: language === 'es' ? 'Encuestas NPS Post-Tour' : 'Post-Tour NPS Surveys',
        schedule: 'Diariamente / Daily 18:00',
        desc: language === 'es' ? 'Envía encuestas de calidad a clientes del día anterior' : 'Sends quality surveys to previous day clients',
        endpoint: '/webhook/post-tour-nps', 
      }
    ]
  };

  const handleForceRun = async (jobId: string, endpoint: string) => {
    setRunningJob(jobId);
    try {
      const isWebhook = endpoint.startsWith('/webhook/');
      const payload = isWebhook ? { trigger: jobId, manual_dispatch: true, timestamp: new Date().toISOString() } : {};
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setLastResults(prev => ({
          ...prev,
          [jobId]: { status: 'success', time: new Date().toLocaleTimeString(), message: 'Ejecución exitosa' }
        }));
      } else {
        throw new Error('Error en la ejecución');
      }
    } catch (error: any) {
      setLastResults(prev => ({
        ...prev,
        [jobId]: { status: 'error', time: new Date().toLocaleTimeString(), message: error.message }
      }));
    } finally {
      setRunningJob(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            {t.title}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          Engine Active
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        {t.jobs.map((job) => (
          <div key={job.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{job.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{job.desc}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {job.schedule}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">{job.id}</span>
                </div>
              </div>
              <button
                onClick={() => handleForceRun(job.id, job.endpoint)}
                disabled={runningJob === job.id}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-emerald-600 transition-colors disabled:opacity-50"
              >
                {runningJob === job.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {runningJob === job.id ? t.running : t.forceRun}
                </span>
              </button>
            </div>
            
            {lastResults[job.id] && (
              <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
                lastResults[job.id].status === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                  : 'bg-red-50 text-red-800 border border-red-100'
              }`}>
                {lastResults[job.id].status === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                )}
                <div>
                  <p className="font-medium">
                    {lastResults[job.id].status === 'success' ? 'Ejecución completada' : 'Error en ejecución'}
                  </p>
                  <p className="opacity-90 mt-0.5">
                    {lastResults[job.id].message} - {lastResults[job.id].time}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
