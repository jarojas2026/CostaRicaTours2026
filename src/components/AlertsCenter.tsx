import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  RefreshCw, 
  Search, 
  Clock, 
  ExternalLink, 
  ShieldAlert, 
  Info, 
  Check, 
  Sparkles, 
  Filter, 
  BellRing,
  Layers,
  Calendar,
  UserCheck
} from 'lucide-react';
import { Language } from '../types';

export interface AdminAlert {
  id: string;
  source: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  bookingId?: string;
  providerId?: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  resolved: boolean;
  createdAt: string;
}

interface AlertsCenterProps {
  language: Language;
  onNavigateToBooking?: (bookingId: string) => void;
  onUnresolvedCountChange?: (count: number, criticalCount: number) => void;
}

export const AlertsCenter: React.FC<AlertsCenterProps> = ({ 
  language,
  onNavigateToBooking,
  onUnresolvedCountChange 
}) => {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [onlyUnresolved, setOnlyUnresolved] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});
  const [simulating, setSimulating] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  const fetchAlerts = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const queryParams = new URLSearchParams();
      if (onlyUnresolved) queryParams.append('resolved', 'false');
      if (severityFilter !== 'all') queryParams.append('severity', severityFilter);

      const res = await fetch(`/api/alerts?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const alertList: AdminAlert[] = data.alerts || data.data || [];
        setAlerts(alertList);

        // Calculate unresolved counts
        const unresolved = alertList.filter(a => !a.resolved);
        const criticalUnresolved = unresolved.filter(a => a.severity === 'critical');
        if (onUnresolvedCountChange) {
          onUnresolvedCountChange(unresolved.length, criticalUnresolved.length);
        }
      }
    } catch (err) {
      console.error('Error al obtener alertas:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  // Initial load and 60-second polling
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => {
      fetchAlerts();
    }, 60000);

    return () => clearInterval(interval);
  }, [onlyUnresolved, severityFilter]);

  const handleToggleRead = async (alert: AdminAlert, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(alert.id);
    try {
      const newReadState = !alert.read;
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: newReadState })
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, read: newReadState } : a));
      }
    } catch (err) {
      console.error('Error al actualizar lectura de alerta:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleResolved = async (alert: AdminAlert, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(alert.id);
    try {
      const newResolvedState = !alert.resolved;
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: newResolvedState, read: true })
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, resolved: newResolvedState, read: true } : a));
        // If we're filtering only unresolved and just resolved this one, remove or update
        if (onlyUnresolved && newResolvedState) {
          setAlerts(prev => prev.filter(a => a.id !== alert.id));
        }
      }
    } catch (err) {
      console.error('Error al actualizar resolución de alerta:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedAlerts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateTestAlert = async (severity: 'critical' | 'warning' | 'info') => {
    setSimulating(true);
    try {
      const sampleTitles = {
        critical: 'Fallo en Pago Automático a Operador Rafting Sarapiquí',
        warning: 'Reintento de Envío de Voucher #CR-98432 por Tiempo de Espera',
        info: 'Confirmación y Notificación Multicanal Enviada con Éxito'
      };

      const sampleMessages = {
        critical: 'El webhook hacia la cuenta bancaria del operador respondió HTTP 504 Gateway Timeout tras 3 intentos. La reserva #CR-2026-789 requiere verificación manual inmediata.',
        warning: 'El servidor de correo demoró 4.8s en entregar el comprobante PDF. Se programó reintento automático en 5 minutos.',
        info: 'Cliente Robert Miller confirmó tour Arenal Volcano & Hot Springs. Todos los asientos asignados y sincronizados con Firestore.'
      };

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer cr-tours-n8n-production-key-2026'
        },
        body: JSON.stringify({
          source: 'n8n Workflow • Pagos Automáticos a Proveedores',
          severity,
          title: sampleTitles[severity],
          message: sampleMessages[severity],
          bookingId: severity === 'critical' ? 'CR-2026-789' : 'CR-2026-442',
          providerId: 'prov_sarapiqui_rafting_01',
          metadata: {
            retryCount: severity === 'critical' ? 3 : 1,
            httpStatus: severity === 'critical' ? 504 : 200,
            executionId: `n8n_exec_${Date.now()}`
          }
        })
      });

      if (res.ok) {
        setNotificationBanner(`Alerta de prueba (${severity.toUpperCase()}) registrada y persistida.`);
        setTimeout(() => setNotificationBanner(null), 4000);
        fetchAlerts(true);
      }
    } catch (err) {
      console.error('Error simulando alerta:', err);
    } finally {
      setSimulating(false);
    }
  };

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
      if (onlyUnresolved && alert.resolved) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = alert.title.toLowerCase().includes(q);
        const matchMsg = alert.message.toLowerCase().includes(q);
        const matchSrc = alert.source.toLowerCase().includes(q);
        const matchBooking = alert.bookingId?.toLowerCase().includes(q);
        const matchProvider = alert.providerId?.toLowerCase().includes(q);
        return matchTitle || matchMsg || matchSrc || matchBooking || matchProvider;
      }
      return true;
    });
  }, [alerts, severityFilter, onlyUnresolved, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
    const warning = alerts.filter(a => a.severity === 'warning' && !a.resolved).length;
    const info = alerts.filter(a => a.severity === 'info' && !a.resolved).length;
    const resolved = alerts.filter(a => a.resolved).length;
    return { total, critical, warning, info, resolved };
  }, [alerts]);

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'Hace unos segundos';
      if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      return `Hace ${diffDays} días`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {notificationBanner && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center justify-between shadow-lg shadow-emerald-950/50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notificationBanner}</span>
          </div>
          <button onClick={() => setNotificationBanner(null)} className="text-emerald-400/70 hover:text-emerald-300 text-xs">
            Cerrar
          </button>
        </div>
      )}

      {/* Main Banner / Overview */}
      <div className="bg-gradient-to-br from-slate-900 via-[#0a1914] to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <BellRing className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-black text-white tracking-tight">Centro de Alertas Operativas</h3>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                Infraestructura Propia (Firestore + Email)
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Canal unificado que reemplaza Telegram. Recibe fallos, anomalías de pago SINPE/Stripe y estados críticos de los workflows de n8n con persistencia en Firestore y alertas automáticas por correo.
            </p>
          </div>

          {/* Quick Simulation Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleCreateTestAlert('critical')}
              disabled={simulating}
              className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="Simular fallo crítico de n8n"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>+ Probar Alerta 🔴</span>
            </button>
            <button
              onClick={() => fetchAlerts(true)}
              disabled={refreshing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-rose-500/30 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-white">{stats.critical}</div>
              <div className="text-[11px] text-rose-300 font-medium">Críticas Pendientes</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-white">{stats.warning}</div>
              <div className="text-[11px] text-amber-300 font-medium">Advertencias</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-blue-500/30 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-white">{stats.info}</div>
              <div className="text-[11px] text-blue-300 font-medium">Informativas</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-emerald-500/30 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-white">{stats.resolved}</div>
              <div className="text-[11px] text-emerald-300 font-medium">Resueltas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Severity Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSeverityFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              severityFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            Todas ({alerts.length})
          </button>
          <button
            onClick={() => setSeverityFilter('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              severityFilter === 'critical'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-900/80 text-rose-300 hover:bg-rose-950/40 border border-rose-900/40'
            }`}
          >
            <span>🔴 Críticas</span>
          </button>
          <button
            onClick={() => setSeverityFilter('warning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              severityFilter === 'warning'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-900/80 text-amber-300 hover:bg-amber-950/40 border border-amber-900/40'
            }`}
          >
            <span>🟡 Advertencias</span>
          </button>
          <button
            onClick={() => setSeverityFilter('info')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              severityFilter === 'info'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900/80 text-blue-300 hover:bg-blue-950/40 border border-blue-900/40'
            }`}
          >
            <span>🔵 Informativas</span>
          </button>
        </div>

        {/* Search & Only Unresolved Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <input
              type="checkbox"
              checked={onlyUnresolved}
              onChange={(e) => setOnlyUnresolved(e.target.checked)}
              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 bg-slate-800"
            />
            <span className="font-semibold">Solo no resueltas</span>
          </label>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID, fuente o detalle..."
              className="w-full sm:w-64 bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Consultando alertas en Firestore...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-80" />
            <h4 className="text-base font-bold text-white mb-1">Sin alertas pendientes</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Todos los workflows de n8n, verificaciones SINPE y notificaciones a operadores están operando con normalidad.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';
            const isExpanded = !!expandedAlerts[alert.id];
            const isActing = actionLoadingId === alert.id;

            return (
              <div
                key={alert.id}
                className={`transition-all rounded-xl border p-4 sm:p-5 relative ${
                  isCritical && !alert.resolved
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/30'
                    : isWarning && !alert.resolved
                    ? 'bg-amber-950/10 border-amber-500/30'
                    : alert.resolved
                    ? 'bg-slate-900/30 border-slate-800/80 opacity-70'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                } ${!alert.read && !alert.resolved ? 'border-l-4 border-l-emerald-500' : ''}`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  
                  {/* Left Column: Icon + Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    
                    {/* Severity Icon */}
                    <div className="shrink-0 mt-0.5">
                      {isCritical ? (
                        <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                      ) : isWarning ? (
                        <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
                          <Info className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      
                      {/* Meta Tags Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}>
                          {alert.severity}
                        </span>

                        <span className="text-xs text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-500" />
                          {alert.source}
                        </span>

                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formatRelativeTime(alert.createdAt)}
                        </span>

                        {!alert.read && !alert.resolved && (
                          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                            NUEVA
                          </span>
                        )}

                        {alert.resolved && (
                          <span className="bg-emerald-950 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-700 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Resuelta
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                        {alert.title}
                      </h4>

                      {/* Message body with Truncate / Expand */}
                      <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {isExpanded ? (
                          <p className="whitespace-pre-wrap">{alert.message}</p>
                        ) : (
                          <p className="line-clamp-2">{alert.message}</p>
                        )}
                      </div>

                      {/* Expand / Collapse toggle */}
                      {alert.message.length > 140 && (
                        <button
                          onClick={() => toggleExpand(alert.id)}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          {isExpanded ? 'Ver menos' : 'Ver detalle completo'}
                        </button>
                      )}

                      {/* Associated Booking or Provider Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1.5">
                        {alert.bookingId && (
                          <button
                            onClick={() => onNavigateToBooking ? onNavigateToBooking(alert.bookingId!) : null}
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 border border-teal-600/40 px-2 py-1 rounded-md transition-colors"
                            title="Ver detalles de la reserva"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Reserva: #{alert.bookingId}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        )}

                        {alert.providerId && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-700/40 px-2 py-1 rounded-md">
                            <UserCheck className="w-3 h-3 text-emerald-400" />
                            <span>Proveedor: {alert.providerId}</span>
                          </span>
                        )}
                      </div>

                      {/* Metadata JSON if expanded */}
                      {isExpanded && alert.metadata && Object.keys(alert.metadata).length > 0 && (
                        <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 overflow-x-auto">
                          <div className="font-bold text-slate-300 mb-1">Metadatos n8n:</div>
                          <pre>{JSON.stringify(alert.metadata, null, 2)}</pre>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                    
                    {/* Mark as Resolved */}
                    <button
                      onClick={(e) => handleToggleResolved(alert, e)}
                      disabled={isActing}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 w-full justify-center ${
                        alert.resolved
                          ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{alert.resolved ? 'Reabrir Alerta' : 'Marcar Resuelta'}</span>
                    </button>

                    {/* Mark as Read */}
                    {!alert.resolved && (
                      <button
                        onClick={(e) => handleToggleRead(alert, e)}
                        disabled={isActing}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 w-full justify-center ${
                          alert.read
                            ? 'text-slate-500 hover:text-slate-400 bg-transparent'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{alert.read ? 'Leída' : 'Marcar Leída'}</span>
                      </button>
                    )}

                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
