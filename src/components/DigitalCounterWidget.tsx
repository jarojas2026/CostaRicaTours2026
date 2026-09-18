import React, { useState } from 'react';
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
  MapPin
} from 'lucide-react';
import { Language, Currency, Tour } from '../types';
import { useTours } from '../contexts/ToursContext';
import { formatCurrency, getLangText } from '../utils/i18n';

interface DigitalCounterWidgetProps {
  language: Language;
  currency: Currency;
  onSelectTour?: (tour: Tour) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  actionUrl?: string;
  actionLabel?: string;
}

export const DigitalCounterWidget: React.FC<DigitalCounterWidgetProps> = ({
  language,
  currency,
  onSelectTour
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'availability' | 'embed'>('chat');
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
        ? '¡Hola! Bienvenido al Mostrador Digital de Costa Rica Tours. Soy tu Counter Digital Oficial. ¿En qué te puedo asesorar hoy? (Disponibilidad en tiempo real, cotización de tours, traslados o temporadas).'
        : 'Hello! Welcome to the Costa Rica Tours Digital Counter. I am your Official Concierge Agent. How may I assist you today with availability, quotes, transfers, or seasons?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // State for Quick Availability Checker
  const [availTourId, setAvailTourId] = useState(TOURS[0]?.id || '');
  const [availDate, setAvailDate] = useState('');
  const [availAdults, setAvailAdults] = useState(2);
  const [availChildren, setAvailChildren] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  // Quick prompt suggestions
  const suggestions = isEs ? [
    '¿Cuándo es la temporada de ballenas en Uvita?',
    'Presupuesto para 4 personas en Arenal',
    '¿Cómo funciona la cancelación y pagos?',
    'Tours con ALSAMA Tours en Marino Ballena'
  ] : [
    'When is whale watching season in Uvita?',
    'Quote for 4 people at Arenal Volcano',
    'How do cancellations and payments work?',
    'Tours with ALSAMA Tours in Marino Ballena'
  ];

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    // AI Counter response logic with precise, warm knowledge
    setTimeout(() => {
      let replyText = '';
      const lower = text.toLowerCase();

      if (lower.includes('ballena') || lower.includes('whale') || lower.includes('uvita')) {
        replyText = isEs 
          ? '🐋 **Temporada de Ballenas en Costa Rica**: Tenemos 2 temporadas de avistamiento en el Parque Nacional Marino Ballena (Uvita):\n• **Julio a Noviembre** (migración del hemisferio sur, la más activa).\n• **Diciembre a Abril** (migración del norte).\n\nOperado oficialmente por **ALSAMA Tours**. Salidas diarias a las 8:30 AM y 1:00 PM desde Bahía Ballena.'
          : '🐋 **Whale Watching in Costa Rica**: There are 2 seasons in Marino Ballena National Park (Uvita):\n• **July to November** (Southern migration, peak activity).\n• **December to April** (Northern migration).\n\nOperated officially by **ALSAMA Tours**. Daily departures at 8:30 AM & 1:00 PM.';
      } else if (lower.includes('arenal') || lower.includes('volc') || lower.includes('terma') || lower.includes('spring')) {
        replyText = isEs
          ? '🌋 **Arenal & Aguas Termales**: El tour incluye caminata por el sendero de lava del Parque Nacional Volcán Arenal, almuerzo típico y pase de tarde/noche en aguas termales minerales. Tarifa desde $145 USD por persona.'
          : '🌋 **Arenal & Hot Springs**: Includes guided lava flow trail hike at Arenal Volcano National Park, traditional lunch, and afternoon/evening pass at natural thermal springs. Rates start from $145 USD per person.';
      } else if (lower.includes('cancel') || lower.includes('pago') || lower.includes('pay')) {
        replyText = isEs
          ? '💳 **Políticas de Pago y Cancelación**:\n• Aceptamos tarjetas internacionales (Stripe), PayPal y SINPE Móvil local (+506 8795-9148).\n• **Cancelación 100% gratuita** hasta 24 horas antes del inicio del tour.\n• Toda reserva recibe voucher oficial y soporte 24/7.'
          : '💳 **Payment & Cancellation Policies**:\n• We accept international credit/debit cards (Stripe), PayPal, and local SINPE Móvil.\n• **100% Free Cancellation** up to 24 hours before your tour start time.\n• Instant official voucher and 24/7 support.';
      } else if (lower.includes('alsama')) {
        replyText = isEs
          ? '⭐ **ALSAMA Tours** es nuestro operador local oficial en Uvita y Parque Marino Ballena con más de 12 años de trayectoria, guías certificados por el ICT y embarcaciones con chalecos y seguro al día.'
          : '⭐ **ALSAMA Tours** is our verified local operator in Uvita & Marino Ballena with 12+ years of experience, ICT-certified guides, and fully insured boats.';
      } else {
        replyText = isEs
          ? `¡Con gusto! Para brindarte la tarifa exacta y cupos con el operador certificado, indícame la fecha deseada y número de personas. También puedo conectarte de inmediato con nuestro asesor de guardia en WhatsApp (+506 8795-9148).`
          : `I’d love to assist! To give you exact availability and rates with our certified operators, let me know your desired date and party size. Or connect directly with our 24/7 WhatsApp counter (+506 8795-9148).`;
      }

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, agentMsg]);
      setIsTyping(false);
    }, 800);
  };

  const selectedTour = TOURS.find(t => t.id === availTourId) || TOURS[0];
  const totalUSD = selectedTour ? (selectedTour.priceUSD * availAdults) + (selectedTour.priceUSD * 0.7 * availChildren) : 0;
  const tourName = selectedTour ? getLangText(selectedTour.title, language) : 'Tour';

  const generateWhatsAppLink = () => {
    const msg = isEs
      ? `Hola, estoy consultando disponibilidad desde el Mostrador Digital para el tour "${tourName}". Fecha: ${availDate || 'Por definir'}, ${availAdults} Adultos, ${availChildren} Niños. Total estimado: ${formatCurrency(totalUSD, currency)}.`
      : `Hello, I am checking availability from the Digital Counter for "${tourName}". Date: ${availDate || 'TBD'}, ${availAdults} Adults, ${availChildren} Children. Estimated total: ${formatCurrency(totalUSD, currency)}.`;
    return `https://wa.me/50687959148?text=${encodeURIComponent(msg)}`;
  };

  const embedCodeSnippet = `<!-- Costa Rica Tours - Counter Digital Widget -->
<div id="crt-counter-widget"></div>
<script src="https://costaricatours.es/widget/counter.js" async></script>
<script>
  window.CRTCounterConfig = {
    agency: "Costa Rica Tours",
    whatsapp: "+50687959148",
    currency: "USD",
    lang: "es"
  };
</script>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <>
      {/* Floating Counter Button in bottom right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-[0_10px_30px_rgba(245,158,11,0.4)] border-2 border-stone-950 cursor-pointer"
          aria-label="Abrir Mostrador Digital de Reservas"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-stone-950 text-amber-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-stone-950 animate-pulse" />
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-[10px] uppercase font-black tracking-wider text-stone-900 block leading-tight">
              {isEs ? 'Counter Digital' : 'Digital Concierge'}
            </span>
            <span className="text-xs font-black text-stone-950 block leading-tight">
              {isEs ? 'Asesor de Reservas 24/7' : '24/7 Booking Desk'}
            </span>
          </div>
        </motion.button>
      </div>

      {/* Counter Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#051c14] border border-emerald-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-stone-100"
            >
              {/* Modal Header */}
              <div className="bg-[#03140e] p-4 sm:p-5 border-b border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-md">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                        {isEs ? 'Mostrador Digital de Reservas' : 'Digital Booking Desk'}
                      </h3>
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                        24/7 Online
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">
                      {isEs ? 'Asesor Oficial • Tarifas, Disponibilidad & Operadores' : 'Official Advisor • Rates, Availability & Operators'}
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

              {/* Tabs Navigation */}
              <div className="flex border-b border-emerald-500/20 bg-[#041910] text-xs font-bold">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'chat'
                      ? 'bg-amber-400 text-stone-950 font-black border-b-2 border-amber-500'
                      : 'text-stone-300 hover:text-white hover:bg-emerald-950/40'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{isEs ? 'Chat con el Asesor' : 'Advisor Chat'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('availability')}
                  className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'availability'
                      ? 'bg-amber-400 text-stone-950 font-black border-b-2 border-amber-500'
                      : 'text-stone-300 hover:text-white hover:bg-emerald-950/40'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>{isEs ? 'Cotizador Rápido' : 'Quick Quote'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('embed')}
                  className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'embed'
                      ? 'bg-amber-400 text-stone-950 font-black border-b-2 border-amber-500'
                      : 'text-stone-300 hover:text-white hover:bg-emerald-950/40'
                  }`}
                >
                  <Code className="w-4 h-4" />
                  <span>{isEs ? 'Integración & N8N' : 'Embed & API'}</span>
                </button>
              </div>

              {/* Tab 1: Live Chat */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Messages Area */}
                  <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 modal-scrollable bg-[#020e09]/60">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'agent' && (
                          <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 font-bold text-xs mt-1">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div
                          className={`max-w-[82%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-emerald-700 text-white rounded-tr-none shadow-md'
                              : 'bg-[#06241a] text-stone-200 border border-emerald-500/30 rounded-tl-none shadow-md'
                          }`}
                        >
                          <div className="whitespace-pre-line">{msg.text}</div>
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
                        <span>{isEs ? 'El Asesor está respondiendo...' : 'Advisor is typing...'}</span>
                      </div>
                    )}
                  </div>

                  {/* Suggestions Chips */}
                  <div className="p-2 sm:p-3 bg-[#03140e] border-t border-emerald-500/20 flex gap-2 overflow-x-auto scrollbar-hide">
                    {suggestions.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(sug)}
                        className="bg-[#052418] hover:bg-emerald-900/60 text-stone-300 hover:text-amber-300 text-[11px] font-medium px-3 py-1.5 rounded-xl border border-emerald-500/30 whitespace-nowrap transition-colors cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>

                  {/* Input Box */}
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
                      className="bg-amber-400 hover:bg-amber-300 text-stone-950 p-3 rounded-2xl font-black transition-colors cursor-pointer shadow-md shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Fast Availability & Quote Calculator */}
              {activeTab === 'availability' && (
                <div className="p-5 sm:p-6 overflow-y-auto modal-scrollable space-y-5 flex-1">
                  <div className="bg-[#041910] p-4 rounded-2xl border border-emerald-500/30 space-y-4">
                    <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>{isEs ? 'Calculador de Tarifas & Disponibilidad' : 'Rates & Availability Calculator'}</span>
                    </h4>

                    {/* Select Tour */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-300">{isEs ? 'Seleccionar Tour:' : 'Select Tour:'}</label>
                      <select
                        value={availTourId}
                        onChange={e => setAvailTourId(e.target.value)}
                        className="w-full bg-[#020e09] border border-emerald-500/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        {TOURS.map(t => (
                          <option key={t.id} value={t.id}>
                            {getLangText(t.title, language)} — {formatCurrency(t.priceUSD, currency)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date and Passengers */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-300">{isEs ? 'Fecha Deseada:' : 'Desired Date:'}</label>
                        <input
                          type="date"
                          value={availDate}
                          onChange={e => setAvailDate(e.target.value)}
                          className="w-full bg-[#020e09] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-300">{isEs ? 'Adultos:' : 'Adults:'}</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={availAdults}
                          onChange={e => setAvailAdults(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-[#020e09] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-300">{isEs ? 'Niños (3-11):' : 'Children:'}</label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={availChildren}
                          onChange={e => setAvailChildren(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-[#020e09] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Summary Box */}
                    <div className="mt-4 p-4 bg-[#020e09] rounded-2xl border border-emerald-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">
                          {isEs ? 'Total Estimado' : 'Estimated Total'}
                        </span>
                        <span className="text-2xl font-black text-amber-400">
                          {formatCurrency(totalUSD, currency)}
                        </span>
                      </div>

                      <a
                        href={generateWhatsAppLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#25D366] hover:bg-[#20ba59] text-stone-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{isEs ? 'Consultar Cupo WhatsApp' : 'Check Space WhatsApp'}</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Embed Widget & N8N Webhook Integration */}
              {activeTab === 'embed' && (
                <div className="p-5 sm:p-6 overflow-y-auto modal-scrollable space-y-6 flex-1 text-xs sm:text-sm">
                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Code className="w-4 h-4 text-amber-400" />
                      <span>{isEs ? 'Código de Incrustación (Widget Embed)' : 'Embed Code Snippet'}</span>
                    </h4>
                    <p className="text-stone-300 text-xs">
                      {isEs 
                        ? 'Copia este snippet para incrustar el Counter Digital en cualquier sitio web externo, landing page o portal hotelero aliado:' 
                        : 'Copy this snippet to embed the Digital Counter widget on any external landing page or hotel portal:'}
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

                  {/* N8N & Netlify Deployment Guide */}
                  <div className="bg-[#041910] p-4 rounded-2xl border border-emerald-500/30 space-y-3">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span>{isEs ? 'Automatizaciones N8N & Webhooks Activos' : 'N8N Automations & Webhooks'}</span>
                    </h4>
                    <ul className="space-y-2 text-xs text-stone-300">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Instancia n8n:</strong> <code className="text-amber-300">costaricatours2026.app.n8n.cloud</code></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Webhook de Notificaciones:</strong> Envío automático de confirmación por WhatsApp y correo a los operadores.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Seguridad:</strong> Todas las peticiones al backend incluyen cabecera <code className="text-amber-300">X-Webhook-Secret</code>.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="bg-[#03140e] p-4 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEs ? 'Soporte Directo:' : 'Direct Desk:'} <strong className="text-white">+506 8795 9148</strong></span>
                </div>

                <a
                  href="https://wa.me/50687959148?text=Hola%20Costa%20Rica%20Tours,%20quisiera%20asesoria%20personalizada%20con%20el%20Counter%20Digital."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-[#20ba59] text-stone-950 font-black px-4 py-2 rounded-xl text-xs uppercase flex items-center gap-2 shadow-md transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp 24/7</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
