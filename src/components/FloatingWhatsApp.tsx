import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Calendar, CheckCheck, ChevronRight, ExternalLink, MessageCircle, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, Tour } from '../types';
import { getLangText } from '../utils/i18n';
import { useTours } from '../contexts/ToursContext';

interface FloatingWhatsAppProps {
  language: Language;
  initialMessage?: string;
  onOpenAIAssistant?: () => void;
  onSelectTour?: (tour: Tour) => void;
}

type ChatMessage = {
  role: 'user' | 'bot';
  text: string;
  quickActions?: Array<{ label: string; action: string; data?: unknown }>;
};

const WHATSAPP_NUMBER = '50687959148';

const MessageStatus: React.FC<{ isBot?: boolean }> = ({ isBot = false }) => (
  <span className="inline-flex items-center gap-1 ml-2 float-right text-[10px] opacity-60">
    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    <CheckCheck className={`w-3 h-3 ${isBot ? 'text-emerald-300' : 'text-sky-300'}`} />
  </span>
);

const BookingProgressIndicator: React.FC<{ status: string; language: Language }> = ({ status, language }) => {
  if (status === 'none') return null;
  const labels = language === 'es'
    ? ['Consulta', 'Disponibilidad', 'Reserva']
    : ['Inquiry', 'Availability', 'Booking'];
  return (
    <div className="px-4 py-2 border-b border-emerald-900/40 bg-black/10">
      <div className="flex items-center justify-between gap-2">
        {labels.map((label, index) => (
          <React.Fragment key={label}>
            <div className={`text-[9px] font-bold uppercase tracking-wide ${index === 2 && status === 'confirmed' ? 'text-emerald-300' : 'text-stone-300'}`}>
              {label}
            </div>
            {index < labels.length - 1 && <div className="h-px flex-1 bg-emerald-800/60" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const ChatMiniCard: React.FC<{
  tour: Tour;
  language: Language;
  onSelectTour?: (tour: Tour) => void;
}> = ({ tour, language, onSelectTour }) => {
  const title = getLangText(tour.title, language);
  const price = typeof tour.priceUSD === 'number' ? `$${tour.priceUSD} USD` : '';
  const duration = tour.durationHours ? `${tour.durationHours} h` : getLangText(tour.durationLabel, language);
  return (
    <button
      type="button"
      onClick={() => onSelectTour?.(tour)}
      className="w-full text-left rounded-xl border border-emerald-500/20 bg-white/5 hover:bg-white/10 p-3 transition-colors"
    >
      <div className="font-bold text-sm text-white">{title}</div>
      <div className="mt-1 flex items-center justify-between text-xs text-emerald-200">
        <span>{duration}</span>
        <span>{price}</span>
      </div>
    </button>
  );
};

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  language,
  initialMessage = '',
  onOpenAIAssistant,
  onSelectTour
}) => {
  const { tours } = useTours();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState(initialMessage);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [bookingStatus, setBookingStatus] = useState('none');
  const [history, setHistory] = useState<ChatMessage[]>([
    {
      role: 'bot',
      text: language === 'es'
        ? '¡Pura Vida! Soy el Concierge IA de Costa Rica Tours. Puedo ayudarte a consultar tours, fechas y próximos pasos de reserva.'
        : 'Pura Vida! I am the Costa Rica Tours AI Concierge. I can help with tours, dates and booking next steps.'
    }
  ]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  const mentionedTour = useMemo(() => {
    const text = input.toLowerCase();
    return tours.find((tour) => {
      const title = getLangText(tour.title, language).toLowerCase();
      return title && text.length > 3 && (text.includes(title) || title.split(' ').some((word) => word.length > 5 && text.includes(word)));
    });
  }, [input, tours, language]);

  const sendMessage = async (message = input) => {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    setBookingStatus('pending');
    setHistory((prev) => [...prev, { role: 'user', text }].slice(-30));
    setInput('');

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language, sessionId: `whatsapp-${Date.now()}` })
      });
      const data = await response.json().catch(() => ({}));
      const reply = data.reply || data.message || data.response || (
        language === 'es'
          ? 'Recibí tu consulta. Puedo ayudarte a verificar disponibilidad y preparar una reserva.'
          : 'I received your inquiry. I can help verify availability and prepare a booking.'
      );
      setHistory((prev) => [...prev, {
        role: 'bot',
        text: reply,
        quickActions: [
          { label: language === 'es' ? 'Consultar disponibilidad' : 'Check availability', action: 'availability' },
          { label: language === 'es' ? 'WhatsApp directo' : 'Direct WhatsApp', action: 'whatsapp' }
        ]
      }].slice(-30));
      if (data.bookingStatus) setBookingStatus(data.bookingStatus);
      else setBookingStatus('payment_required');
    } catch (error) {
      console.error('Floating WhatsApp AI error:', error);
      setHistory((prev) => [...prev, {
        role: 'bot',
        text: language === 'es'
          ? 'No pude completar la consulta en este momento. Puedes continuar por WhatsApp directo.'
          : 'I could not complete the inquiry right now. You can continue through direct WhatsApp.'
      }].slice(-30));
      setBookingStatus('none');
    } finally {
      setSending(false);
    }
  };

  const openDirectWhatsApp = (message = '') => {
    const text = encodeURIComponent(message || (language === 'es'
      ? 'Hola, quiero información sobre un tour en Costa Rica.'
      : 'Hello, I would like information about a Costa Rica tour.'));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleAction = (action: string) => {
    if (action === 'whatsapp') openDirectWhatsApp();
    if (action === 'availability') setInput(language === 'es' ? 'Quiero verificar disponibilidad para una fecha.' : 'I want to check availability for a date.');
  };

  return (
    <div className="fixed bottom-[calc(4.8rem+env(safe-area-inset-bottom))] right-3 sm:right-4 lg:bottom-6 lg:right-6 z-[80]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="mb-3 w-[90vw] max-w-[400px] h-[min(620px,calc(100vh-120px))] rounded-2xl overflow-hidden bg-[#07241a] border border-emerald-500/30 shadow-2xl flex flex-col"
          >
            <div className="p-4 bg-[#1E7B4A] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-sm flex items-center gap-2">
                    Costa Rica Tours
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-300/20">IA</span>
                  </div>
                  <div className="text-[10px] text-emerald-100">{isOnline ? 'Online' : 'Offline'}</div>
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-white/10" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <BookingProgressIndicator status={bookingStatus} language={language} />

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {history.map((message, index) => (
                <div key={`${index}-${message.role}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white/10 text-stone-100 rounded-bl-sm'}`}>
                    <div className="whitespace-pre-wrap">{message.text}</div>
                    <MessageStatus isBot={message.role === 'bot'} />
                    {message.quickActions?.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.quickActions.map((action) => (
                          <button key={action.action} type="button" onClick={() => handleAction(action.action)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20">
                            {action.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {mentionedTour && (
                <ChatMiniCard tour={mentionedTour} language={language} onSelectTour={onSelectTour} />
              )}
              {sending && (
                <div className="text-xs text-emerald-200 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  {language === 'es' ? 'Consultando agentes...' : 'Consulting agents...'}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-emerald-900/50 bg-black/10">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') void sendMessage(); }}
                  placeholder={language === 'es' ? 'Escribe tu consulta...' : 'Type your inquiry...'}
                  className="flex-1 min-w-0 rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-stone-400 outline-none focus:border-emerald-400"
                />
                <button type="button" onClick={() => void sendMessage()} disabled={!input.trim() || sending} className="w-10 h-10 rounded-xl bg-emerald-500 disabled:opacity-40 flex items-center justify-center" aria-label="Send">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-stone-400">
                <button type="button" onClick={onOpenAIAssistant} className="inline-flex items-center gap-1 hover:text-white">
                  <Bot className="w-3.5 h-3.5" /> IA Assistant
                </button>
                <button type="button" onClick={() => openDirectWhatsApp()} className="inline-flex items-center gap-1 hover:text-white">
                  <ExternalLink className="w-3.5 h-3.5" /> WhatsApp
                </button>
                <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> 24/7</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="pointer-events-auto w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl flex items-center justify-center border-2 border-white/80"
        aria-label="WhatsApp Concierge"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-300 border-2 border-white" />
      </motion.button>
    </div>
  );
};

export default FloatingWhatsApp;
