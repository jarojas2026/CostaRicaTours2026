import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Minus, Loader2, RefreshCw } from 'lucide-react';

export const AiInsightsPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchForecasts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/demand-forecast', {
        headers: {
          'X-Operator-Key': import.meta.env.VITE_OPERATOR_API_KEY || ''
        }
      });
      const data = await res.json();
      if (data.success) {
        setForecasts(data.forecasts);
      } else {
        setError(data.error || 'Error al cargar predicciones');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Sugerencias de IA y Predicción de Demanda
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Revisar antes de aplicar. Estas sugerencias se basan en los datos reales de reservas de los últimos 90 días.
          </p>
        </div>
        <button 
          onClick={fetchForecasts}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Actualizar
        </button>
      </div>

      {loading && forecasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
          <p className="font-bold">Analizando 90 días de historial de reservas con Gemini...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-900/20 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-center">
          {error}
        </div>
      ) : forecasts.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/50 p-12 rounded-xl text-center text-slate-400">
          No hay datos suficientes para generar predicciones en este momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {forecasts.map((forecast, i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 hover:border-purple-500/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-white text-lg">{forecast.tourName}</h3>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-bold uppercase tracking-wider">
                  {forecast.trend === 'subiendo' && <><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">En Alza</span></>}
                  {forecast.trend === 'bajando' && <><TrendingDown className="w-3.5 h-3.5 text-rose-400" /><span className="text-rose-400">A la Baja</span></>}
                  {forecast.trend === 'estable' && <><Minus className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-400">Estable</span></>}
                  {forecast.trend === 'insuficiente' && <><span className="text-slate-400">Sin Datos</span></>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Total (90d)</p>
                  <p className="text-lg font-black text-slate-300">{forecast.total}</p>
                </div>
                <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Últimos 45d</p>
                  <p className="text-lg font-black text-slate-300">{forecast.period2Count}</p>
                </div>
                <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Previos 45d</p>
                  <p className="text-lg font-black text-slate-300">{forecast.period1Count}</p>
                </div>
              </div>

              <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3">
                <p className="text-xs text-purple-400 font-bold uppercase mb-1">Sugerencia de la IA</p>
                <p className="text-sm text-purple-100/90 leading-relaxed">
                  {forecast.suggestion}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
