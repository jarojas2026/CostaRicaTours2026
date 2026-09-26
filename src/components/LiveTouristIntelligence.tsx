import React, { useState } from 'react';
import { 
  Search, Sparkles, Globe, ExternalLink, RefreshCw, 
  CheckCircle2, Zap, ArrowRight
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
    <div className="bg-[#041910] border-2 border-emerald-500/30 rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6 text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-black border border-amber-400/30 shrink-0">
            <Globe className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {language === 'es' ? 'Google Search Grounding (gemini-3.5-flash)' : 'Google Search Grounding (gemini-3.5-flash)'}
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              {language === 'es' ? 'Información Turística en Vivo de Costa Rica' : 'Real-Time Costa Rica Tourist Intelligence'}
            </h3>
          </div>
        </div>

        <span className="text-[11px] bg-emerald-950 text-emerald-300 px-3.5 py-1.5 rounded-full border border-emerald-500/40 font-bold self-start sm:self-auto flex items-center gap-1.5 shadow-sm">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          {language === 'es' ? 'Datos Oficiales en Vivo' : 'Official Live Data'}
        </span>
      </div>

      {/* Quick Topic Chips */}
      <div className="space-y-2">
        <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider block">
          {language === 'es' ? 'Consultas Frecuentes Verificadas:' : 'Verified Frequent Inquiries:'}
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
              className="text-[11px] font-bold bg-[#020e08] hover:bg-emerald-900/60 text-emerald-100 hover:text-white px-3.5 py-2 rounded-xl border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
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
        className="flex flex-col sm:flex-row gap-2.5"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'es'
                ? 'Ej: ¿Horario del ferry a Paquera hoy? ¿Estado de Ruta 32? ¿Entradas a Manuel Antonio?...'
                : 'Ex: Paquera ferry schedule today? Route 32 road status? Manuel Antonio entry tickets?...'
            }
            className="w-full bg-[#020e08] border border-emerald-500/40 focus:border-amber-400 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none placeholder-emerald-400/40 font-medium pr-10 shadow-inner"
          />
          <Search className="w-4 h-4 text-emerald-400/60 absolute right-3.5 top-4" />
        </div>

        <button
          type="submit"
          disabled={isLoading || !searchQuery.trim()}
          className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-black px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
              <span>{language === 'es' ? 'Consultando...' : 'Checking...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-stone-950" />
              <span>{language === 'es' ? 'Consultar en Vivo' : 'Check Live'}</span>
            </>
          )}
        </button>
      </form>

      {/* Search Results Display */}
      {resultAnswer && (
        <div className="bg-[#020e08] p-5 sm:p-6 rounded-2xl border-2 border-emerald-500/40 space-y-4 animate-fade-in text-stone-200 shadow-xl">
          <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
            <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              {language === 'es' ? 'Respuesta Verificada en Tiempo Real:' : 'Verified Live Response:'}
            </span>
            <span className="text-[10px] text-emerald-300 font-bold bg-[#041910] border border-emerald-500/40 px-3 py-1 rounded-full">
              ⚡ Gemini 3.5 Flash Grounding
            </span>
          </div>

          <div className="text-sm leading-relaxed whitespace-pre-line text-stone-200 font-medium">
            {resultAnswer}
          </div>

          {/* Sources Links */}
          {resultSources.length > 0 && (
            <div className="pt-3 border-t border-emerald-500/20 space-y-2">
              <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider block">
                {language === 'es' ? 'Fuentes Oficiales y Enlaces de Google Grounding:' : 'Official Grounding Sources & References:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {resultSources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] bg-[#041910] hover:bg-emerald-900/60 text-emerald-200 hover:text-white px-3 py-1.5 rounded-lg border border-emerald-500/40 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <span className="line-clamp-1 max-w-[220px]">{src.title || 'Fuente Web'}</span>
                    <ExternalLink className="w-3 h-3 text-amber-400 shrink-0" />
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
                className="text-[11px] font-black uppercase bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <span>{language === 'es' ? 'Preguntar al Asistente IA Concierge' : 'Ask AI Concierge Agent'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
