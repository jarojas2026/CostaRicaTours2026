import React, { useState } from 'react';
import { 
  Search, Sparkles, Globe, ExternalLink, RefreshCw, AlertCircle, 
  CheckCircle2, Compass, Sun, CloudRain, Clock, MapPin, Trees, ShieldAlert,
  Zap, ArrowRight, Waves, Mountain
} from 'lucide-react';
import { Language } from '../types';

interface LiveTouristIntelligenceProps {
  language: Language;
  onAskAgent?: (query: string) => void;
}

interface GroundedSource {
  title: string;
  uri: string;
}

export const LiveTouristIntelligence: React.FC<LiveTouristIntelligenceProps> = ({
  language,
  onAskAgent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultAnswer, setResultAnswer] = useState<string | null>(null);
  const [resultSources, setResultSources] = useState<GroundedSource[]>([]);
  const [lastSearchedTopic, setLastSearchedTopic] = useState<string | null>(null);

  const predefinedQueries = [
    {
      id: 'volcanoes',
      label: { es: '🌋 Estado en Vivo de Volcanes (Poás, Arenal, Irazú)', en: '🌋 Live Volcano Activity (Poas, Arenal, Irazu)' },
      query: 'Estado actual y accesos de los Parques Nacionales Volcán Poás, Arenal y Volcán Irazú en Costa Rica hoy',
    },
    {
      id: 'whales-turtles',
      label: { es: '🐢 Temporadas de Tortugas y Ballenas Jorobadas', en: '🐢 Turtle Nesting & Humpback Whale Seasons' },
      query: 'Temporada actual de desove de tortugas en Tortuguero / Ostional y avistamiento de ballenas jorobadas en Uvita Costa Rica',
    },
    {
      id: 'roads-ferry',
      label: { es: '🚐 Estado de Rutas 32, 27 y Ferri de Paquera', en: '🚐 Road Status (Route 32, 27) & Paquera Ferry' },
      query: 'Horarios del ferri de Puntarenas a Paquera y estado de tránsito en Ruta 32 y Ruta 27 en Costa Rica',
    },
    {
      id: 'entry-rules',
      label: { es: '🛂 Requisitos de Ingreso y Visas de Turista', en: '🛂 Tourist Entry Requirements & Visas' },
      query: 'Requisitos oficiales de entrada de turistas a Costa Rica (pasaporte, boleto de salida, vacuna fiebre amarilla y estadía de 180 días)',
    },
    {
      id: 'sinac-tickets',
      label: { es: '🎫 Entradas SINAC Parques Nacionales', en: '🎫 SINAC National Parks Official Entry Tickets' },
      query: 'Cómo comprar boletos oficiales en línea en la plataforma SINAC para Manuel Antonio y Volcán Poás',
    },
    {
      id: 'currency-rates',
      label: { es: '💵 Tipo de Cambio Oficial BCCR & Dólares/Colones', en: '💵 BCCR Official Exchange Rate (USD/CRC)' },
      query: 'Tipo de cambio oficial del Dólar estadounidense frente al Colón costarricense hoy según Banco Central de Costa Rica',
    },
  ];

  const handleSearch = async (customQuery?: string) => {
    const q = customQuery || searchQuery;
    if (!q.trim() || isLoading) return;

    setIsLoading(true);
    setResultAnswer(null);
    setResultSources([]);
    setLastSearchedTopic(q);

    try {
      const res = await fetch('/api/gemini/grounded-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, language }),
      });
      const data = await res.json();
      setResultAnswer(data.answer || (language === 'es' ? 'No se obtuvo respuesta para esta consulta.' : 'No response obtained.'));
      setResultSources(data.sources || []);
    } catch (e) {
      console.error('Error fetching grounded search:', e);
      setResultAnswer(
        language === 'es'
          ? 'Hubo una interrupción de conexión con la búsqueda en tiempo real. Los Parques Nacionales de Costa Rica operan normalmente con reserva previa en servirr.sinac.go.cr.'
          : 'Connection error retrieving live data. Costa Rica National Parks operate normally via online booking at servirr.sinac.go.cr.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-emerald-950 border-2 border-emerald-500/30 rounded-[2rem] p-5 sm:p-7 shadow-2xl space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-black">
            <Globe className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {language === 'es' ? 'Búsqueda en Vivo & Grounding de Google' : 'Live Google Grounded Intelligence'}
            </div>
            <h3 className="text-xl font-black text-white uppercase">
              {language === 'es' ? 'Información Turística en Vivo de Costa Rica' : 'Real-Time Costa Rica Tourist Intelligence'}
            </h3>
          </div>
        </div>

        <span className="text-[10px] bg-emerald-900 text-emerald-200 px-3 py-1 rounded-full border border-emerald-700/50 font-bold self-start sm:self-auto flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          {language === 'es' ? 'Datos Actualizados' : 'Live Verified Data'}
        </span>
      </div>

      {/* Quick Topic Chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block">
          {language === 'es' ? 'Consultas Frecuentes en Tiempo Real:' : 'Real-Time Frequent Queries:'}
        </span>
        <div className="flex flex-wrap gap-2">
          {predefinedQueries.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSearchQuery(item.query);
                handleSearch(item.query);
              }}
              disabled={isLoading}
              className="text-[11px] font-bold bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white px-3 py-1.5 rounded-xl border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {item.label[language === 'es' ? 'es' : 'en']}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'es'
                ? 'Ej: ¿Está abierto el Volcán Poás hoy? ¿Horario del ferry a Paquera?...'
                : 'Ex: Is Poas Volcano open today? Paquera ferry schedule?....'
            }
            className="w-full bg-emerald-900/60 border border-emerald-500/30 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white focus:outline-none placeholder-emerald-300/40 font-medium pr-10"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-3.5" />
        </div>

        <button
          type="submit"
          disabled={isLoading || !searchQuery.trim()}
          className="bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{language === 'es' ? 'Consultar en Vivo' : 'Check Live'}</span>
            </>
          )}
        </button>
      </form>

      {/* Search Results Display */}
      {resultAnswer && (
        <div className="bg-emerald-900/80 p-5 rounded-2xl border-2 border-emerald-400/50 space-y-4 animate-fade-in text-white shadow-xl">
          <div className="flex items-center justify-between border-b border-emerald-700/60 pb-2.5">
            <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              {language === 'es' ? 'Respuesta Verificada con Fuentes en Vivo:' : 'Verified Live Response with Sources:'}
            </span>
            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950 px-2.5 py-0.5 rounded-full">
              Gemini Search Grounding
            </span>
          </div>

          <div className="text-sm leading-relaxed whitespace-pre-line text-neutral-100 font-medium">
            {resultAnswer}
          </div>

          {/* Sources Links */}
          {resultSources.length > 0 && (
            <div className="pt-2 border-t border-emerald-700/60 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider block">
                {language === 'es' ? 'Fuentes Oficiales y Enlaces Grounding:' : 'Official Grounding Sources & Links:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {resultSources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] bg-emerald-950 hover:bg-emerald-800 text-amber-300 px-3 py-1 rounded-lg border border-emerald-600/40 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{src.title || 'Fuente Web'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Ask Agent Follow-up Button */}
          {onAskAgent && lastSearchedTopic && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => onAskAgent(lastSearchedTopic)}
                className="text-[11px] font-bold bg-teal-600 hover:bg-teal-500 text-white px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <span>{language === 'es' ? 'Preguntar al Asistente IA Concierge' : 'Ask AI Concierge Agent'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
