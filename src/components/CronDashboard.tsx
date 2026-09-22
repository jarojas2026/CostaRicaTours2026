import React, { useState } from 'react';
import { Clock, Play, CheckCircle2, AlertCircle, RefreshCw, Zap, ShieldCheck, Mail, Send, Check } from 'lucide-react';

export function CronDashboard({ language = 'es' }: { language?: 'es' | 'en' }) {
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, { status: 'success' | 'error', time: string, message: string }>>({});
  
  // Autonomous full loop tester state
  const [runningAutonomous, setRunningAutonomous] = useState<boolean>(false);
  const [autonomousResult, setAutonomousResult] = useState<any | null>(null);

  const t = {
    title: language === 'es' ? 'Motor de Automatización Nativo' : 'Native Automation Engine',
    subtitle: language === 'es' ? 'Gestión de flujos 100% autónomos y tareas programadas (Zero intervención manual)' : '100% Autonomous workflows and scheduled tasks management (Zero manual intervention)',
    forceRun: language === 'es' ? 'Forzar Ejecución' : 'Force Run',
    running: language === 'es' ? 'Ejecutando...' : 'Running...',
    jobs: [
      {
        id: 'WF_PAGOS_PROVEEDORES',
        name: language === 'es' ? 'Pagos Automáticos a Proveedores' : 'Automated Provider Payouts',
        schedule: 'Diario / Daily 06:00 AM (CR)',
        desc: language === 'es' ? 'Liquidación automática con deduplicación por reserva' : 'Automatic provider settlements with idempotent batching',
        endpoint: '/api/native/workflows/payouts',
      },
      {
        id: 'WF_RECORDATORIOS_24H',
        name: language === 'es' ? 'Recordatorios 24h Antes del Tour' : '24h Pre-Tour Reminders',
        schedule: 'Diario / Daily 07:00 AM (CR)',
        desc: language === 'es' ? 'Envía detalles de recogida y qué llevar a los viajeros de mañana' : 'Sends pickup details and packing recommendations to tomorrow travelers',
        endpoint: '/api/native/workflows/reminders',
      },
      {
        id: 'WF_VIGILANCIA_2H',
        name: language === 'es' ? 'Vigilancia y Escalamiento de Reservas' : 'Booking Surveillance & Escalation',
        schedule: 'Cada 2 horas / Every 2 hours',
        desc: language === 'es' ? 'Audita reservas en pendiente_pago > 2h y alerta a la mesa de operaciones' : 'Audits pending_payment bookings > 2h and alerts ops desk',
        endpoint: '/api/native/workflows/surveillance',
      },
      {
        id: 'WF_RESENAS_POST_TOUR',
        name: language === 'es' ? 'Solicitudes de Reseña Post-Tour' : 'Post-Tour Review Requests',
        schedule: 'Diario / Daily 05:00 PM (CR)',
        desc: language === 'es' ? 'Envía enlaces a formulario propio para tours concluidos hoy' : 'Dispatches review requests for tours completed today',
        endpoint: '/api/native/workflows/reviews',
      },
      {
        id: 'WF_REPORTE_DIARIO',
        name: language === 'es' ? 'Reporte Diario de Operación' : 'Daily Operations Report',
        schedule: 'Diario / Daily 08:00 PM (CR)',
        desc: language === 'es' ? 'Consolida ingresos, pasajeros y alertas en el Centro de Operaciones' : 'Consolidates daily revenue, passenger counts and alerts in the Operations Center',
        endpoint: '/api/native/workflows/daily-report',
      },
      {
        id: 'AUTO_RELEASE_HOLD',
        name: language === 'es' ? 'Limpiador de Soft Holds Expirados' : 'Expired Soft Hold Cleaner',
        schedule: 'Cada 5 minutos / Every 5 mins',
        desc: language === 'es' ? 'Libera cupos no pagados tras ventana de 15 minutos' : 'Releases locked availability slots after 15-minute window',
        endpoint: '/api/native/workflows/cleanup-holds',
      },
      {
        id: 'CRON_SEMANAL_CONVERSION',
        name: language === 'es' ? 'Reporte Semanal de Conversión' : 'Weekly Conversion Report',
        schedule: 'Lunes / Monday 08:00 AM (CR)',
        desc: language === 'es' ? 'Calcula métricas de conversión y ticket promedio' : 'Calculates conversion rates and average order values',
        endpoint: '/api/native/workflows/conversion-report',
      }
    ]
  };

  const handleRunAutonomousPipeline = async () => {
    setRunningAutonomous(true);
    try {
      const res = await fetch('/api/native/autonomous-booking-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: 'arenal-volcano-hot-springs',
          adults: 2,
          children: 1,
          customerName: 'Juan Carlos Rojas',
          customerEmail: 'demo@invalid.local',
          pickupHotel: 'Tabacón Thermal Resort, La Fortuna',
          specialRequests: 'Simulación administrativa: no enviar notificaciones ni confirmar reserva'
        })
      });
      const data = await res.json();
      setAutonomousResult(data);
    } catch (err: any) {
      setAutonomousResult({ success: false, error: err.message });
    } finally {
      setRunningAutonomous(false);
    }
  };

  const handleForceRun = async (jobId: string, endpoint: string) => {
    setRunningJob(jobId);
    try {
      const payload = {};
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
          Zero Manual Intervention
        </div>
      </div>

      {/* 🚀 BANNER PILOTO 100% AUTÓNOMO */}
      <div className="m-6 p-5 rounded-xl bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white border border-emerald-700/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-emerald-400/30">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Modo Simulación Gobernada
            </div>
            <h3 className="text-lg font-bold text-white">
              Simulador del Pipeline de Reserva
            </h3>
            <p className="text-sm text-emerald-200/90 mt-1 max-w-2xl">
              Simula el recorrido de disponibilidad → reserva pendiente → pago verificado → confirmación. La prueba no crea reservas reales, no cobra y no notifica proveedores.
            </p>
          </div>
          <button
            onClick={handleRunAutonomousPipeline}
            disabled={runningAutonomous}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {runningAutonomous ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5 fill-current" />
            )}
            <span>{runningAutonomous ? 'Ejecutando Flujo...' : 'Simular Flujo Seguro'}</span>
          </button>
        </div>

        {autonomousResult && (
          <div className="mt-4 pt-4 border-t border-emerald-800/60 bg-black/20 rounded-lg p-4">
            {autonomousResult.success ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Simulación ejecutada en {autonomousResult.duracionMs} ms sin efectos persistentes</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white/10 rounded p-2.5 border border-white/10">
                    <span className="text-emerald-300 block font-semibold mb-0.5">Código Reserva</span>
                    <span className="font-mono text-white text-sm font-bold">{autonomousResult.reserva?.codigo}</span>
                  </div>
                  <div className="bg-white/10 rounded p-2.5 border border-white/10">
                    <span className="text-emerald-300 block font-semibold mb-0.5">Estado Operativo</span>
                    <span className="text-white font-medium truncate block">{autonomousResult.message || 'No se notificó ningún proveedor'}</span>
                    <span className="text-emerald-300/80 text-[10px]">✓ Sin notificación en simulación</span>
                  </div>
                  <div className="bg-white/10 rounded p-2.5 border border-white/10">
                    <span className="text-emerald-300 block font-semibold mb-0.5">Pago</span>
                    <span className="text-white font-medium truncate block">{autonomousResult.paymentRequired ? 'Pago real requerido' : 'No requerido en simulación'}</span>
                    <span className="text-emerald-300/80 text-[10px]">✓ Sin voucher en simulación</span>
                  </div>
                  <div className="bg-white/10 rounded p-2.5 border border-white/10">
                    <span className="text-emerald-300 block font-semibold mb-0.5">Efectos</span>
                    <span className="text-white font-medium block">Sin efectos externos</span>
                    <span className="text-emerald-300/80 text-[10px]">Solo lectura</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span>Error: {autonomousResult.error || 'Fallo de ejecución'}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="p-6 pt-0 space-y-4">
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
