import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  MessageCircle, 
  X, 
  Send, 
  Sparkles, 
  Calendar, 
  Users, 
  CheckCircle2, 
  ShieldCheck, 
  Phone, 
  Copy, 
  Check, 
  Code, 
  Layers, 
  Clock, 
  ChevronRight,
  HelpCircle,
  DollarSign,
  MapPin,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Star,
  Info,
  Compass,
  Search
} from 'lucide-react';
import { Language, Currency, Tour } from '../types';
import { useTours } from '../contexts/ToursContext';
import { formatCurrency, getLangText } from '../utils/i18n';

export interface DigitalCounterWidgetProps {
  language: Language;
  currency: Currency;
  onSelectTour?: (tour: Tour) => void;
  selectedTour?: Tour | null;
}

interface QuickActionItem {
  label: string;
  action: string;
  variant?: 'primary' | 'whatsapp' | 'amber' | 'teal' | 'default' | string;
  data?: any;
}

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  quickActions?: QuickActionItem[];
  recommendedTours?: any[];
  sources?: Array<{ uri: string; title: string }>;
}

export const DigitalCounterWidget: React.FC<DigitalCounterWidgetProps> = ({
  language,
  currency,
  onSelectTour,
  selectedTour: propSelectedTour
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'availability' | 'faq' | 'embed'>('chat');
  const [showTeaser, setShowTeaser] = useState(true);
  const [sessionId] = useState(() => {
    const key = 'crt-counter-widget-session';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = 'counter_' + Math.random().toString(36).slice(2, 15);
    localStorage.setItem(key, created);
    return created;
  });
  const { tours: TOURS } = useTours();
  const isEs = language === 'es';

  // State for Chat
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'agent',
      text: isEs 
        ? '¡Hola! Bienvenido al Mostrador Digital de Costa Rica Tours. Soy tu Counter Digital Oficial 24/7.\n\n¿En qué te puedo asesorar específicamente hoy? Puedo verificar cupos en tiempo real con operadores locales (como ALSAMA Tours), calcular cotizaciones exactas, explicarte la temporada de ballenas o revisar la garantía de cancelación 24h.'
        : 'Hello! Welcome to the Costa Rica Tours Digital Counter. I am your Official 24/7 Digital Concierge.\n\nHow can I specifically assist you today? I can check real-time availability with local operators (such as ALSAMA Tours), calculate exact quotes, guide you on whale watching seasons, or review our 24h cancellation guarantee.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickActions: [
        {
          label: isEs ? '🐋 Temporada de Ballenas en Uvita' : '🐋 Whale Watching Season Uvita',
          action: 'whale_season'
        },
        {
          label: isEs ? '📅 Cotizar Cupo en Vivo' : '📅 Live Quote & Availability',
          action: 'open_calculator'
        },
        {
          label: isEs ? '🌋 Volcán Arenal & La Fortuna' : '🌋 Arenal Volcano & Hot Springs',
          action: 'arenal_info'
        },
        {
          label: isEs ? '🛡️ Políticas de Cancelación 24h' : '🛡️ 24h Cancellation Policies',
          action: 'policies'
        }
      ]
    }
  ]);

  // State for Quick Availability Checker
  const [availTourId, setAvailTourId] = useState(propSelectedTour?.id || TOURS[0]?.id || '');
  const [availDate, setAvailDate] = useState('');
  const [availAdults, setAvailAdults] = useState(2);
  const [availChildren, setAvailChildren] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [availability, setAvailability] = useState<any>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [tourSearchTerm, setTourSearchTerm] = useState('');

  // Sincronizar si cambia el propSelectedTour
  useEffect(() => {
    if (propSelectedTour?.id) {
      setAvailTourId(propSelectedTour.id);
    }
  }, [propSelectedTour]);

  // Sugerencias rápidas de consulta
  const suggestions = useMemo(() => isEs ? [
    '¿Cuándo es la temporada de ballenas en Uvita?',
    '¿Qué incluye el tour al Volcán Arenal?',
    '¿Cómo funciona la cancelación 24h antes?',
    'Tours con ALSAMA Tours en Marino Ballena',
    '¿Tienen traslados desde San José (SJO)?'
  ] : [
    'When is whale watching season in Uvita?',
    'What does the Arenal Volcano tour include?',
    'How does 24h prior cancellation work?',
    'Tours with ALSAMA Tours in Marino Ballena',
    'Do you have transfers from San Jose (SJO)?'
  ], [isEs]);

  // Enviar mensaje al Mostrador Digital
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/counter/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, language })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Counter Agent unavailable');

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: data.reply || (isEs ? 'No pude completar la respuesta.' : 'I could not complete the response.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickActions: data.quickActions && data.quickActions.length > 0 ? data.quickActions : [
          {
            label: isEs ? '📅 Cotizar fecha en vivo' : '📅 Check live date',
            action: 'open_calculator'
          },
          {
            label: isEs ? '💬 WhatsApp directo (+506)' : '💬 Direct WhatsApp (+506)',
            action: 'whatsapp_direct'
          }
        ],
        recommendedTours: data.recommendedTours,
        sources: data.sources
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch (error) {
      console.error('Counter Agent error:', error);
      const fallback: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: isEs
          ? 'El Mostrador Digital está temporalmente sin conexión con el motor central. Puedes consultar inmediatamente a nuestro equipo local por WhatsApp (+506 8795 9148) o revisar el cotizador de cupos.'
          : 'The Digital Counter is temporarily offline from the central engine. You can immediately ask our local team on WhatsApp (+506 8795 9148) or use the live quote checker.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickActions: [
          {
            label: isEs ? 'Abrir WhatsApp (+506 8795 9148)' : 'Open WhatsApp (+506 8795 9148)',
            action: 'whatsapp_direct'
          },
          {
            label: isEs ? 'Abrir Cotizador' : 'Open Quote Calculator',
            action: 'open_calculator'
          }
        ]
      };
      setMessages(prev => [...prev, fallback]);
    } finally {
      setIsTyping(false);
    }
  };

  // Manejar acciones rápidas
  const handleQuickAction = (action: string, data?: any) => {
    if (action === 'open_calculator') {
      setActiveTab('availability');
      return;
    }
    if (action === 'whale_season') {
      handleSendMessage(isEs 
        ? '¿Cuándo es la temporada de avistamiento de ballenas en el Parque Nacional Marino Ballena (Uvita) y qué operador local lo realiza?' 
        : 'When is whale watching season in Marino Ballena National Park (Uvita) and which local operator runs it?');
      return;
    }
    if (action === 'arenal_info') {
      handleSendMessage(isEs 
        ? 'Quiero saber detalles sobre tours en Volcán Arenal, aguas termales y caminatas en La Fortuna.' 
        : 'I want details about Arenal Volcano tours, hot springs and hikes in La Fortuna.');
      return;
    }
    if (action === 'policies') {
      handleSendMessage(isEs 
        ? '¿Cuáles son las políticas de reserva, métodos de pago aceptados y garantía de cancelación 24 horas?' 
        : 'What are the booking policies, accepted payment methods and 24h cancellation guarantee?');
      return;
    }
    if (action === 'whatsapp_direct') {
      const tourName = selectedTour ? getLangText(selectedTour.title, language) : 'Costa Rica Tours';
      const msg = isEs
        ? `Hola Costa Rica Tours, estoy en el Mostrador Digital y quisiera coordinar disponibilidad para "${tourName}".`
        : `Hello Costa Rica Tours, I am at the Digital Counter and would like to coordinate availability for "${tourName}".`;
      window.open(`https://wa.me/50687959148?text=${encodeURIComponent(msg)}`, '_blank');
      return;
    }
    if (action === 'select_tour' && data) {
      const found = TOURS.find(t => t.id === data.id || t.id === data);
      if (found) {
        if (onSelectTour) onSelectTour(found);
        setIsOpen(false);
      }
      return;
    }
    if (typeof action === 'string' && action.trim()) {
      handleSendMessage(action);
    }
  };

  const selectedTour = TOURS.find(t => t.id === availTourId) || TOURS[0];
  const tourBaseUSD = selectedTour ? selectedTour.priceUSD : 0;
  const adultsSubtotalUSD = tourBaseUSD * availAdults;
  const childrenSubtotalUSD = tourBaseUSD * 0.7 * availChildren;
  const subtotalUSD = adultsSubtotalUSD + childrenSubtotalUSD;
  const vatUSD = subtotalUSD * 0.13; // 13% IVA Costa Rica
  const totalUSD = subtotalUSD + vatUSD;
  const tourName = selectedTour ? getLangText(selectedTour.title, language) : 'Tour';

  const checkLiveAvailability = async () => {
    if (!availDate || !selectedTour) return;
    setAvailabilityLoading(true);
    try {
      const seats = availAdults + availChildren;
      const params = new URLSearchParams({
        date: availDate,
        seats: String(seats)
      });
      const response = await fetch('/api/tours/' + encodeURIComponent(selectedTour.id) + '/availability?' + params.toString());
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Availability error');
      setAvailability(data);
    } catch (error) {
      console.error('Live availability error:', error);
      setAvailability({ available: false, reason: isEs ? 'No se pudo verificar el cupo en este momento. Consulta directa con el asesor.' : 'Availability could not be verified right now. Check with the advisor.' });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const generateWhatsAppLink = () => {
    const operatorLabel = selectedTour?.operatorName || selectedTour?.operatorId || 'Operador Oficial';
    const msg = isEs
      ? `Hola Costa Rica Tours (+506 8795 9148), coticé desde el Mostrador Digital para el tour:\n• Tour: "${tourName}"\n• Operador: ${operatorLabel}\n• Fecha: ${availDate || 'Por definir'}\n• Pasajeros: ${availAdults} Adultos, ${availChildren} Niños\n• Total con IVA: ${formatCurrency(totalUSD, currency)}\n\n¿Tienen cupo disponible para confirmar la reserva?`
      : `Hello Costa Rica Tours (+506 8795 9148), I quoted from the Digital Counter for:\n• Tour: "${tourName}"\n• Operator: ${operatorLabel}\n• Date: ${availDate || 'TBD'}\n• Guests: ${availAdults} Adults, ${availChildren} Children\n• Total with VAT: ${formatCurrency(totalUSD, currency)}\n\nDo you have availability to confirm the booking?`;
    return `https://wa.me/50687959148?text=${encodeURIComponent(msg)}`;
  };

  const embedCodeSnippet = `<!-- Costa Rica Tours - Mostrador Digital & Cotizador Widget -->
<div id="crt-counter-widget"></div>
<script src="https://costaricatours.es/widget/counter.js" async></script>
<script>
  window.CRTCounterConfig = {
    agency: "Costa Rica Tours",
    whatsapp: "+50687959148",
    currency: "${currency}",
    lang: "${language}"
  };
</script>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filtrado de tours para el selector
  const availableToursList = useMemo(() => {
    if (!tourSearchTerm.trim()) return TOURS;
    const term = tourSearchTerm.toLowerCase();
    return TOURS.filter(t => 
      getLangText(t.title, language).toLowerCase().includes(term) ||
      (t.region && t.region.toLowerCase().includes(term)) ||
      ((t.operatorName || t.operatorId) && (t.operatorName || t.operatorId)!.toLowerCase().includes(term))
    );
  }, [TOURS, tourSearchTerm, language]);

  return (
    <>
      {/* Dock del Mostrador Digital de Reservas (posicionado al lado de WhatsApp sin solapamiento) */}
      <div className="fixed bottom-[calc(4.8rem+env(safe-area-inset-bottom))] right-[4.75rem] sm:right-24 lg:bottom-6 lg:right-24 z-[80] flex flex-col items-end gap-2">
        
        {/* Teaser Pill Flotante Interactivo */}
        <AnimatePresence>
          {showTeaser && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.92 }}
              className="hidden sm:flex items-center gap-2 bg-[#051c14]/95 backdrop-blur-md border border-amber-400/40 rounded-2xl p-2 px-3 shadow-2xl text-xs max-w-sm mb-1"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <div className="flex-1 text-stone-200">
                <span className="font-black text-amber-300 mr-1">
                  {isEs ? 'Mostrador 24/7:' : 'Desk 24/7:'}
                </span>
                {isEs ? 'Cotiza cupo en vivo con operadores' : 'Instant live quote with operators'}
              </div>
              <button
                onClick={() => {
                  setIsOpen(true);
                  setActiveTab('availability');
                }}
                className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-black px-2.5 py-1 rounded-xl text-[10px] uppercase tracking-wider shrink-0 transition-transform active:scale-95 cursor-pointer"
              >
                {isEs ? 'Cotizar' : 'Quote'}
              </button>
              <button
                onClick={() => setShowTeaser(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                aria-label="Cerrar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón Principal del Mostrador Digital */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black p-3 sm:px-5 sm:py-3.5 rounded-full shadow-[0_10px_30px_rgba(245,158,11,0.4)] border-2 border-stone-950 cursor-pointer transition-all"
          aria-label={isEs ? 'Abrir Mostrador Digital de Reservas 24/7' : 'Open 24/7 Digital Booking Counter'}
          title={isEs ? 'Mostrador Digital: Cotización y Disponibilidad 24/7' : 'Digital Counter: 24/7 Live Rates & Availability'}
        >
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-stone-950 text-amber-400 flex items-center justify-center shadow-inner">
              <Bot className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-stone-950 animate-pulse" />
          </div>

          <div className="text-left hidden md:block leading-tight pr-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-stone-900 block">
              {isEs ? 'Mostrador Digital' : 'Digital Counter'}
            </span>
            <span className="text-xs font-black text-stone-950 block">
              {isEs ? 'Cotizar & Cupos en Vivo' : 'Live Quote & Seats'}
            </span>
          </div>
        </motion.button>
      </div>

      {/* Modal Interactivo del Mostrador Digital */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#051c14] border border-emerald-500/40 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-stone-100"
            >
              {/* Header del Modal */}
              <div className="bg-[#03140e] p-4 sm:p-5 border-b border-emerald-500/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 flex items-center justify-center font-black shadow-md shrink-0">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                        {isEs ? 'Mostrador Digital de Reservas' : 'Digital Booking Desk'}
                      </h3>
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                        24/7 Oficial
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">
                      {isEs 
                        ? 'Asistencia Directa • Cupos en Vivo • Operadores Certificados' 
                        : 'Direct Assistance • Live Seats • Certified Operators'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  aria-label="Cerrar Mostrador"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barra de Pestañas */}
              <div className="flex border-b border-emerald-500/20 bg-[#041910] text-xs font-bold shrink-0 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-3 px-3 sm:px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'chat'
                      ? 'bg-amber-400 text-stone-950 font-black border-b-2 border-amber-500 shadow-inner'
                      : 'text-stone-300 hover:text-white hover:bg-emerald-950/40'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>{isEs ? 'Chat con el Asesor' : 'Advisor Chat'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('availability')}
                  className={`flex-1 py-3 px-3 sm:px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'availability'
                      ? 'bg-amber-400 text-stone-950 font-black border-b-2 border-amber-500 shadow-inner'
                      : 'text-stone-300 hover:text-white hover:bg-emerald-950/40'
                  }`}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>{isEs ? 'Cotizador & Cupos' : 'Live Quote & Seats'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('faq')}
                  className={`flex-1 py-3 px-3 sm:px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'faq'
                      ? 'bg-amber-400 text-stone-950 font-black border-b-2 border-amber-500 shadow-inner'
                      : 'text-stone-300 hover:text-white hover:bg-emerald-950/40'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>{isEs ? 'Consultas Frecuentes' : 'Fast FAQ'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('embed')}
                  className={`flex-1 py-3 px-3 sm:px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'embed'
                      ? 'bg-amber-400 text-stone-950 font-black border-b-2 border-amber-500 shadow-inner'
                      : 'text-stone-300 hover:text-white hover:bg-emerald-950/40'
                  }`}
                >
                  <Code className="w-4 h-4 shrink-0" />
                  <span>{isEs ? 'Integración Web' : 'Embed API'}</span>
                </button>
              </div>

              {/* Tab 1: Chat con el Asesor Inteligente */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Área de Mensajes */}
                  <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 modal-scrollable bg-[#020e09]/60">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'agent' && (
                          <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 font-bold text-xs mt-1 shadow">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-emerald-700 text-white rounded-tr-none shadow-md'
                              : 'bg-[#06241a] text-stone-200 border border-emerald-500/30 rounded-tl-none shadow-md'
                          }`}
                        >
                          <div className="whitespace-pre-line space-y-2">{msg.text}</div>

                          {/* Fuentes de Google Search Grounding si existen */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-emerald-500/20">
                              <span className="text-[10px] uppercase font-bold text-emerald-300 flex items-center gap-1 mb-1.5">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                {isEs ? 'Fuentes en vivo verificadas (Google Search Grounding):' : 'Verified live sources:'}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.sources.slice(0, 3).map((src, idx) => (
                                  <a
                                    key={idx}
                                    href={src.uri}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/40 text-[10px] text-emerald-200 hover:text-white transition-colors"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate max-w-[150px]">{src.title || src.uri}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tours recomendados en el chat si el agente los devuelve */}
                          {msg.recommendedTours && msg.recommendedTours.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-emerald-500/20 space-y-2">
                              <span className="text-[10px] uppercase font-bold text-amber-300 block">
                                {isEs ? 'Tours sugeridos para tu solicitud:' : 'Suggested tours for your request:'}
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {msg.recommendedTours.slice(0, 2).map((t: any, i) => (
                                  <div
                                    key={i}
                                    className="bg-[#03140e] border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-white truncate">{t.title || t.name}</div>
                                      <div className="text-[10px] text-amber-300 font-black">
                                        {formatCurrency(t.priceUSD || t.price || 0, currency)}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        if (t.id && onSelectTour) {
                                          const found = TOURS.find(item => item.id === t.id);
                                          if (found) onSelectTour(found);
                                        } else {
                                          setActiveTab('availability');
                                        }
                                      }}
                                      className="bg-amber-400 hover:bg-amber-300 text-stone-950 px-2 py-1 rounded-lg text-[10px] font-black uppercase shrink-0"
                                    >
                                      {isEs ? 'Ver' : 'View'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quick Actions Interactivas */}
                          {msg.quickActions && msg.quickActions.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex flex-wrap gap-1.5">
                              {msg.quickActions.map((qa, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleQuickAction(qa.action, qa.data)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400 hover:text-stone-950 text-amber-200 transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span>{qa.label}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          <span className="block text-[9px] text-stone-400 text-right mt-1 opacity-70">
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex items-center gap-2 text-stone-400 text-xs pl-11">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
                        <span className="text-amber-300/80 font-medium">
                          {isEs ? 'El Asesor está verificando disponibilidad y contexto...' : 'Advisor is checking live availability...'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Chips de Preguntas Sugeridas */}
                  <div className="p-2 sm:p-2.5 bg-[#03140e] border-t border-emerald-500/20 flex gap-2 overflow-x-auto scrollbar-hide">
                    {suggestions.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(sug)}
                        className="bg-[#052418] hover:bg-emerald-900/60 text-stone-300 hover:text-amber-300 text-[11px] font-medium px-3 py-1.5 rounded-xl border border-emerald-500/30 whitespace-nowrap transition-colors cursor-pointer shrink-0"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>

                  {/* Input Box para enviar consultas */}
                  <div className="p-3 sm:p-4 bg-[#03140e] border-t border-emerald-500/30 flex items-center gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder={isEs ? 'Pregunta sobre tours, fechas, traslados o precios...' : 'Ask about tours, dates, transfers or rates...'}
                      className="flex-1 bg-[#052418] border border-emerald-500/30 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || isTyping}
                      className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-stone-950 p-3 rounded-2xl font-black transition-colors cursor-pointer shadow-md shrink-0"
                      aria-label="Enviar consulta"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Cotizador & Verificador de Cupos en Vivo */}
              {activeTab === 'availability' && (
                <div className="p-4 sm:p-6 overflow-y-auto modal-scrollable space-y-5 flex-1">
                  <div className="bg-[#041910] p-4 sm:p-5 rounded-2xl border border-emerald-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                      <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span>{isEs ? 'Cotizador Oficial & Verificación de Cupos' : 'Official Quote & Live Availability'}</span>
                      </h4>
                      {(selectedTour?.operatorName || selectedTour?.operatorId) && (
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-600/40 px-2 py-0.5 rounded-lg">
                          {isEs ? 'Operado por: ' : 'Operated by: '} {selectedTour.operatorName || selectedTour.operatorId}
                        </span>
                      )}
                    </div>

                    {/* Filtro de Búsqueda de Tours */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-300 flex items-center justify-between">
                        <span>{isEs ? 'Seleccionar Tour:' : 'Select Tour:'}</span>
                        <span className="text-[10px] text-stone-400 font-normal">
                          {availableToursList.length} {isEs ? 'tours disponibles' : 'tours available'}
                        </span>
                      </label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          value={tourSearchTerm}
                          onChange={e => setTourSearchTerm(e.target.value)}
                          placeholder={isEs ? 'Filtrar por nombre o región (ej: Marino Ballena, Arenal)...' : 'Filter by name or region...'}
                          className="w-full bg-[#020e09] border border-emerald-500/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 mb-2"
                        />
                      </div>
                      <select
                        value={availTourId}
                        onChange={e => {
                          setAvailTourId(e.target.value);
                          setAvailability(null);
                        }}
                        className="w-full bg-[#020e09] border border-emerald-500/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                      >
                        {availableToursList.map(t => (
                          <option key={t.id} value={t.id}>
                            {getLangText(t.title, language)} — {formatCurrency(t.priceUSD, currency)} ({t.region})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Fecha y Pasajeros */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-300 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          <span>{isEs ? 'Fecha Deseada:' : 'Desired Date:'}</span>
                        </label>
                        <input
                          type="date"
                          value={availDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={e => {
                            setAvailDate(e.target.value);
                            setAvailability(null);
                          }}
                          className="w-full bg-[#020e09] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-300 flex items-center gap-1">
                          <Users className="w-3 h-3 text-amber-400" />
                          <span>{isEs ? 'Adultos:' : 'Adults:'}</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="25"
                          value={availAdults}
                          onChange={e => {
                            setAvailAdults(Math.max(1, parseInt(e.target.value) || 1));
                            setAvailability(null);
                          }}
                          className="w-full bg-[#020e09] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-300 flex items-center gap-1">
                          <Users className="w-3 h-3 text-amber-400" />
                          <span>{isEs ? 'Niños (30% desc):' : 'Kids (30% off):'}</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={availChildren}
                          onChange={e => {
                            setAvailChildren(Math.max(0, parseInt(e.target.value) || 0));
                            setAvailability(null);
                          }}
                          className="w-full bg-[#020e09] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Botón para Comprobar Disponibilidad */}
                    <button
                      onClick={checkLiveAvailability}
                      disabled={!availDate || availabilityLoading}
                      className="w-full rounded-xl border border-amber-400/40 bg-amber-400/15 hover:bg-amber-400/25 disabled:opacity-40 text-amber-200 hover:text-white font-black px-4 py-3 text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      {availabilityLoading
                        ? (isEs ? 'Consultando sistema del operador…' : 'Querying operator system…')
                        : (isEs ? 'Verificar Cupos en Tiempo Real' : 'Verify Live Seats with Operator')}
                    </button>

                    {/* Resultado de Disponibilidad */}
                    {availability && (
                      <div className={`rounded-2xl border p-4 transition-all ${availability.available ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-amber-400/40 bg-amber-400/10'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-black text-white flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${availability.available ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                              {availability.available ? (isEs ? '¡Cupo Confirmado Disponible!' : 'Space Confirmed Available!') : (isEs ? 'Cupo Limitado / Requiere Validación' : 'Limited Space / Needs Confirmation')}
                            </div>
                            <div className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                              {availability.reason || (availability.remainingSeats != null 
                                ? (isEs ? `Quedan ${availability.remainingSeats} espacios para la fecha seleccionada.` : `${availability.remainingSeats} spaces remaining for the selected date.`)
                                : (isEs ? 'Operador notificado. Puedes asegurar tu reserva de inmediato.' : 'Operator notified. You can secure your spot right now.'))}
                            </div>
                          </div>
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                        </div>
                      </div>
                    )}

                    {/* Desglose de Precios Transparente */}
                    <div className="p-4 bg-[#020e09] rounded-2xl border border-emerald-500/20 space-y-2 text-xs">
                      <div className="flex justify-between text-stone-300">
                        <span>{isEs ? 'Tarifa Adultos:' : 'Adults Fare:'} ({availAdults} × {formatCurrency(tourBaseUSD, currency)})</span>
                        <span className="font-bold text-white">{formatCurrency(adultsSubtotalUSD, currency)}</span>
                      </div>
                      {availChildren > 0 && (
                        <div className="flex justify-between text-stone-300">
                          <span>{isEs ? 'Tarifa Niños:' : 'Children Fare:'} ({availChildren} × {formatCurrency(tourBaseUSD * 0.7, currency)})</span>
                          <span className="font-bold text-white">{formatCurrency(childrenSubtotalUSD, currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-stone-400 text-[11px]">
                        <span>{isEs ? 'IVA Costa Rica (13% regulatorio):' : 'Costa Rica VAT (13%):'}</span>
                        <span>{formatCurrency(vatUSD, currency)}</span>
                      </div>
                      <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase font-bold block">
                            {isEs ? 'Total Final Estimado' : 'Total Estimated'}
                          </span>
                          <span className="text-2xl font-black text-amber-400">
                            {formatCurrency(totalUSD, currency)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (selectedTour && onSelectTour) {
                                onSelectTour(selectedTour);
                                setIsOpen(false);
                              }
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black px-3.5 py-2.5 rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-md transition-transform hover:scale-105 cursor-pointer"
                          >
                            <Calendar className="w-4 h-4" />
                            <span>{isEs ? 'Reservar' : 'Book'}</span>
                          </button>

                          <a
                            href={generateWhatsAppLink()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#25D366] hover:bg-[#20ba59] text-stone-950 font-black px-3.5 py-2.5 rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-md transition-transform hover:scale-105 cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Consultas Frecuentes Rápidas (FAQ con 1-click) */}
              {activeTab === 'faq' && (
                <div className="p-4 sm:p-6 overflow-y-auto modal-scrollable space-y-4 flex-1 text-xs sm:text-sm">
                  <div className="bg-[#041910] p-4 rounded-2xl border border-emerald-500/30 space-y-3">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      <span>{isEs ? 'Consultas Frecuentes de Viajeros' : 'Top Traveler FAQs'}</span>
                    </h4>
                    <p className="text-xs text-stone-300">
                      {isEs 
                        ? 'Haz clic en cualquiera de las consultas comunes para recibir respuesta inmediata o iniciar la reserva:' 
                        : 'Click any common question for an instant answer or to start booking:'}
                    </p>

                    <div className="space-y-2 pt-2">
                      {[
                        {
                          q: isEs ? '🐋 ¿Cuándo es la temporada de avistamiento de ballenas?' : '🐋 When is whale watching season?',
                          a: isEs 
                            ? 'Costa Rica tiene 2 temporadas de ballenas jorobadas: de JULIO a OCTUBRE (procedentes del hemisferio sur, la más abundante) y de DICIEMBRE a MARZO (del hemisferio norte) en el Parque Nacional Marino Ballena (Uvita).'
                            : 'Costa Rica has 2 humpback whale seasons: JULY to OCTOBER (from Antarctica, most abundant) and DECEMBER to MARCH (from North America) at Marino Ballena National Park (Uvita).'
                        },
                        {
                          q: isEs ? '🛡️ ¿Cómo funciona la cancelación gratuita 24h?' : '🛡️ How does 24h free cancellation work?',
                          a: isEs 
                            ? 'Garantizamos reembolso del 100% notificando al menos 24 horas antes del inicio del tour. El pago completo debe estar registrado antes del servicio.'
                            : 'We guarantee a 100% full refund if notified at least 24 hours prior to tour start. Full payment is required before service.'
                        },
                        {
                          q: isEs ? '🚐 ¿Tienen servicio de transporte desde el Aeropuerto SJO?' : '🚐 Is there airport transfer from SJO?',
                          a: isEs 
                            ? 'Sí, coordinamos traslados privados y compartidos desde el Aeropuerto Juan Santamaría (SJO) hacia La Fortuna, Manuel Antonio, Uvita, Monteverde y Pérez Zeledón.'
                            : 'Yes, we coordinate private and shared transfers from Juan Santamaria Airport (SJO) to La Fortuna, Manuel Antonio, Uvita, Monteverde, and Perez Zeledon.'
                        },
                        {
                          q: isEs ? '💳 ¿Qué métodos de pago aceptan?' : '💳 Which payment methods are accepted?',
                          a: isEs 
                            ? 'Aceptamos tarjetas de crédito/débito internacionales (Visa, Mastercard, Amex), PayPal y transferencias bancarias locales (SINPE Móvil).'
                            : 'We accept international credit/debit cards (Visa, Mastercard, Amex), PayPal, and local bank transfers.'
                        }
                      ].map((faq, i) => (
                        <div key={i} className="p-3 bg-[#020e09] rounded-xl border border-emerald-500/20 space-y-1.5">
                          <button
                            onClick={() => {
                              setActiveTab('chat');
                              handleSendMessage(faq.q);
                            }}
                            className="text-left font-black text-amber-300 hover:text-amber-200 text-xs flex items-center justify-between w-full cursor-pointer"
                          >
                            <span>{faq.q}</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-60 hover:opacity-100" />
                          </button>
                          <p className="text-[11px] text-stone-300 leading-relaxed">{faq.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Integración & API */}
              {activeTab === 'embed' && (
                <div className="p-4 sm:p-6 overflow-y-auto modal-scrollable space-y-6 flex-1 text-xs sm:text-sm">
                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Code className="w-4 h-4 text-amber-400" />
                      <span>{isEs ? 'Incrustar Mostrador Digital en Sitios Aliados' : 'Embed Digital Counter on Partner Sites'}</span>
                    </h4>
                    <p className="text-stone-300 text-xs">
                      {isEs 
                        ? 'Copia este snippet para incrustar el Mostrador Digital y cotizador en cualquier portal de hotel, blog de viajes o sitio de operador aliado:' 
                        : 'Copy this snippet to embed the Digital Counter widget on any hotel portal or partner operator site:'}
                    </p>

                    <div className="relative bg-[#020e09] p-4 rounded-2xl border border-emerald-500/30 font-mono text-xs text-emerald-300">
                      <pre className="overflow-x-auto whitespace-pre-wrap">{embedCodeSnippet}</pre>
                      <button
                        onClick={copyEmbedCode}
                        className="absolute top-3 right-3 bg-amber-400 hover:bg-amber-300 text-stone-950 p-2 rounded-xl font-bold flex items-center gap-1 text-xs cursor-pointer shadow-md"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Operadores Locales Oficiales */}
                  <div className="bg-[#041910] p-4 rounded-2xl border border-emerald-500/30 space-y-3">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span>{isEs ? 'Operadores Certificados Conectados' : 'Connected Certified Operators'}</span>
                    </h4>
                    <ul className="space-y-2 text-xs text-stone-300">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>ALSAMA Tours:</strong> Especialistas en Marino Ballena, Uvita, Osa y Corcovado.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Expediciones Tropicales:</strong> Volcanes, rafting y aventuras en todo Costa Rica.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Base Central:</strong> Pérez Zeledón, San José, Costa Rica. Soporte 24/7.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Footer del Modal */}
              <div className="bg-[#03140e] p-3.5 sm:p-4 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEs ? 'Soporte Directo Costa Rica:' : 'Direct Costa Rica Desk:'} <strong className="text-white">+506 8795 9148</strong></span>
                </div>

                <a
                  href="https://wa.me/50687959148?text=Hola%20Costa%20Rica%20Tours,%20quisiera%20asesoria%20personalizada%20con%20el%20Mostrador%20Digital."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-[#20ba59] text-stone-950 font-black px-4 py-2 rounded-xl text-xs uppercase flex items-center gap-2 shadow-md transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp 24/7 (+506)</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
