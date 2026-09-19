import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Calendar,
  CalendarCheck,
  CheckCheck,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, Tour } from '../types';
import { getLangText } from '../utils/i18n';
import { useTours } from '../contexts/ToursContext';

export interface QuickAction {
  label: string;
  action: string;
  variant?: 'primary' | 'whatsapp' | 'amber' | 'teal' | 'default' | string;
  icon?: 'calendar' | 'whatsapp' | 'compass' | 'sparkles' | 'shield' | 'clock' | 'external' | string;
  data?: unknown;
}

interface FloatingWhatsAppProps {
  language: Language;
  initialMessage?: string;
  onOpenAIAssistant?: () => void;
  onSelectTour?: (tour: Tour) => void;
}

type ChatMessage = {
  role: 'user' | 'bot';
  text: string;
  quickActions?: QuickAction[];
};

const WHATSAPP_NUMBER = '50687959148';

const getQuickActionIcon = (action: QuickAction) => {
  const iconType = action.icon || (
    action.action === 'whatsapp' ? 'whatsapp' :
    action.action === 'availability' ? 'calendar' :
    action.action === 'recommend' ? 'compass' :
    action.action === 'policies' ? 'shield' :
    action.action.includes('date') || action.action.includes('calendar') ? 'calendar' :
    action.action.includes('tour') ? 'compass' :
    'sparkles'
  );

  switch (iconType) {
    case 'whatsapp':
      return <MessageCircle className="w-3.5 h-3.5 text-emerald-300 group-hover:text-stone-950 transition-colors shrink-0" />;
    case 'calendar':
      return <CalendarCheck className="w-3.5 h-3.5 text-emerald-300 group-hover:text-stone-950 transition-colors shrink-0" />;
    case 'compass':
      return <Compass className="w-3.5 h-3.5 text-amber-300 group-hover:text-stone-950 transition-colors shrink-0" />;
    case 'shield':
      return <ShieldCheck className="w-3.5 h-3.5 text-teal-300 group-hover:text-stone-950 transition-colors shrink-0" />;
    case 'clock':
      return <Clock className="w-3.5 h-3.5 text-sky-300 group-hover:text-stone-950 transition-colors shrink-0" />;
    case 'external':
      return <ExternalLink className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-950 transition-colors shrink-0" />;
    case 'sparkles':
    default:
      return <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:text-stone-950 transition-colors shrink-0" />;
  }
};

const getQuickActionStyles = (variant?: string, actionName?: string) => {
  const resolved = variant || (
    actionName === 'whatsapp' ? 'whatsapp' :
    actionName === 'availability' ? 'primary' :
    actionName === 'recommend' ? 'amber' :
    actionName === 'policies' ? 'teal' :
    'default'
  );

  switch (resolved) {
    case 'whatsapp':
      return 'border-[#25D366]/50 bg-[#25D366]/15 hover:bg-[#25D366] text-[#6ee7b7] hover:text-stone-950 shadow-emerald-950/20';
    case 'amber':
      return 'border-amber-400/50 bg-amber-400/15 hover:bg-amber-400 text-amber-200 hover:text-stone-950 shadow-amber-950/20';
    case 'teal':
      return 'border-teal-400/50 bg-teal-500/15 hover:bg-teal-400 text-teal-200 hover:text-stone-950 shadow-teal-950/20';
    case 'primary':
      return 'border-emerald-400/50 bg-emerald-500/15 hover:bg-emerald-400 text-emerald-200 hover:text-stone-950 shadow-emerald-950/20';
    case 'default':
    default:
      return 'border-white/20 bg-white/10 hover:bg-emerald-400 text-stone-100 hover:text-stone-950 shadow-black/20';
  }
};

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
  const initialQuickActions = useMemo<QuickAction[]>(() => [
    {
      label: language === 'es' ? 'Consultar disponibilidad' : 'Check availability',
      action: 'availability',
      variant: 'primary',
      icon: 'calendar'
    },
    {
      label: language === 'es' ? 'WhatsApp directo (+506)' : 'Direct WhatsApp (+506)',
      action: 'whatsapp',
      variant: 'whatsapp',
      icon: 'whatsapp'
    },
    {
      label: language === 'es' ? 'Tours recomendados' : 'Top tours',
      action: 'recommend',
      variant: 'amber',
      icon: 'compass'
    },
    {
      label: language === 'es' ? 'Políticas y cancelación' : 'Policies & 24h cancellation',
      action: 'policies',
      variant: 'teal',
      icon: 'shield'
    }
  ], [language]);

  const [history, setHistory] = useState<ChatMessage[]>([
    {
      role: 'bot',
      text: language === 'es'
        ? '¡Pura Vida! Soy el Concierge de Costa Rica Tours. Puedo ayudarte a consultar tours, fechas en tiempo real y coordinar tu reserva con operadores locales.'
        : 'Pura Vida! I am the Costa Rica Tours Concierge. I can help you check tours, real-time availability and coordinate your booking with local operators.',
      quickActions: [
        {
          label: language === 'es' ? 'Consultar disponibilidad' : 'Check availability',
          action: 'availability',
          variant: 'primary',
          icon: 'calendar'
        },
        {
          label: language === 'es' ? 'WhatsApp directo (+506)' : 'Direct WhatsApp (+506)',
          action: 'whatsapp',
          variant: 'whatsapp',
          icon: 'whatsapp'
        },
        {
          label: language === 'es' ? 'Tours recomendados' : 'Top tours',
          action: 'recommend',
          variant: 'amber',
          icon: 'compass'
        },
        {
          label: language === 'es' ? 'Políticas y cancelación' : 'Policies & cancellation',
          action: 'policies',
          variant: 'teal',
          icon: 'shield'
        }
      ]
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
    setHistory((prev) => [...prev, { role: 'user' as const, text }].slice(-30));
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
          ? 'Recibí tu consulta. Puedo ayudarte a verificar disponibilidad y preparar los detalles de tu reserva.'
          : 'I received your inquiry. I can help verify availability and prepare your booking details.'
      );
      setHistory((prev) => [...prev, {
        role: 'bot' as const,
        text: reply,
        quickActions: [
          {
            label: language === 'es' ? 'Verificar fechas' : 'Check dates',
            action: 'availability',
            variant: 'primary',
            icon: 'calendar'
          },
          {
            label: language === 'es' ? 'WhatsApp directo (+506)' : 'Direct WhatsApp (+506)',
            action: 'whatsapp',
            variant: 'whatsapp',
            icon: 'whatsapp'
          },
          {
            label: language === 'es' ? 'Políticas de reserva' : 'Booking policies',
            action: 'policies',
            variant: 'teal',
            icon: 'shield'
          }
        ]
      }].slice(-30));
      if (data.bookingStatus) setBookingStatus(data.bookingStatus);
      else setBookingStatus('payment_required');
    } catch (error) {
      console.error('Floating WhatsApp AI error:', error);
      setHistory((prev) => [...prev, {
        role: 'bot' as const,
        text: language === 'es'
          ? 'No pude completar la consulta en este momento. Nuestro equipo local está disponible de inmediato por WhatsApp directo.'
          : 'I could not complete the inquiry right now. Our local team is available immediately via direct WhatsApp.',
        quickActions: [
          {
            label: language === 'es' ? 'Abrir WhatsApp (+506 8795 9148)' : 'Open WhatsApp (+506 8795 9148)',
            action: 'whatsapp',
            variant: 'whatsapp',
            icon: 'whatsapp'
          },
          {
            label: language === 'es' ? 'Reintentar consulta' : 'Retry inquiry',
            action: 'retry',
            variant: 'primary',
            icon: 'sparkles'
          }
        ]
      }].slice(-30));
      setBookingStatus('none');
    } finally {
      setSending(false);
    }
  };

  const openDirectWhatsApp = (message = '') => {
    const contextualMessage = message || (mentionedTour
      ? (language === 'es'
          ? `Hola, estoy interesado en el tour "${getLangText(mentionedTour.title, language)}" en Costa Rica. Quisiera consultar disponibilidad y tarifas.`
          : `Hello, I am interested in the tour "${getLangText(mentionedTour.title, language)}" in Costa Rica. I would like to check availability and rates.`)
      : (language === 'es'
          ? 'Hola, quiero información y consultar disponibilidad sobre un tour en Costa Rica.'
          : 'Hello, I would like information and availability for a tour in Costa Rica.'));
    const text = encodeURIComponent(contextualMessage);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleAction = (action: string, data?: unknown) => {
    if (action === 'whatsapp') {
      openDirectWhatsApp();
      return;
    }
    if (action === 'availability') {
      const tourName = mentionedTour ? `para "${getLangText(mentionedTour.title, language)}"` : '';
      const prompt = language === 'es'
        ? `Quiero verificar disponibilidad y próximas fechas ${tourName}.`.trim()
        : `I want to check availability and upcoming dates ${tourName ? `for "${mentionedTour ? getLangText(mentionedTour.title, language) : ''}"` : ''}.`.trim();
      void sendMessage(prompt);
      return;
    }
    if (action === 'recommend') {
      const prompt = language === 'es'
        ? '¿Cuáles son los tours y experiencias más recomendados en Costa Rica?'
        : 'What are the top recommended tours and experiences in Costa Rica?';
      void sendMessage(prompt);
      return;
    }
    if (action === 'policies') {
      const prompt = language === 'es'
        ? '¿Cuáles son las políticas de cancelación 24h y formas de pago aceptadas?'
        : 'What are the 24h cancellation policies and accepted payment methods?';
      void sendMessage(prompt);
      return;
    }
    if (action === 'retry') {
      void sendMessage(language === 'es' ? 'Consultar tours disponibles en Costa Rica' : 'Check available tours in Costa Rica');
      return;
    }
    if (typeof data === 'string' && data.trim()) {
      void sendMessage(data);
    }
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
                      <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                        {message.quickActions.map((action, actionIdx) => (
                          <motion.button
                            key={`${action.action}-${actionIdx}`}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleAction(action.action, action.data)}
                            className={`group inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-full border shadow-sm transition-all duration-150 cursor-pointer ${getQuickActionStyles(action.variant, action.action)}`}
                          >
                            {getQuickActionIcon(action)}
                            <span className="truncate max-w-[210px]">{action.label}</span>
                            <ChevronRight className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </motion.button>
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
