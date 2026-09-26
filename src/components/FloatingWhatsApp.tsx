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
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, Tour } from '../types';
import { getLangText } from '../utils/i18n';
import { useTours } from '../contexts/ToursContext';
import { requestCustomerIntake } from '../utils/customerIntake';

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
  const [tourSearchQuery, setTourSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredTours = useMemo(() => {
    const query = tourSearchQuery.trim().toLowerCase();
    if (!query) return [];
    return tours.filter((tour) => {
      const title = getLangText(tour.title, language).toLowerCase();
      const subtitle = getLangText(tour.subtitle, language).toLowerCase();
      const region = (tour.region || '').toLowerCase();
      const category = (tour.category || '').toLowerCase();
      return (
        title.includes(query) ||
        subtitle.includes(query) ||
        region.includes(query) ||
        category.includes(query)
      );
    }).slice(0, 6);
  }, [tours, tourSearchQuery, language]);

  const quickSearchSuggestions = useMemo(() => [
    language === 'es' ? 'Arenal' : 'Arenal',
    language === 'es' ? 'Manuel Antonio' : 'Manuel Antonio',
    language === 'es' ? 'Ballenas' : 'Whales',
    language === 'es' ? 'Monteverde' : 'Monteverde',
    language === 'es' ? 'Rafting' : 'Rafting'
  ], [language]);
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
    requestCustomerIntake({
      message: contextualMessage,
      language,
      source: 'floating-whatsapp',
      context: { tourId: mentionedTour?.id, page: window.location.pathname }
    });
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
    if (action === 'whale_season') {
      void sendMessage(language === 'es' 
        ? '¿Cuándo es la temporada de avistamiento de ballenas en Uvita y qué operador lo realiza?' 
        : 'When is whale watching season in Uvita and which operator runs it?');
      return;
    }
    if (action === 'transfers') {
      void sendMessage(language === 'es' 
        ? '¿Tienen traslados desde el Aeropuerto SJO hacia los principales destinos?' 
        : 'Do you offer airport transfers from SJO to the main destinations?');
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

  const handleSelectTourFromSearch = (tour: Tour, actionType: 'chat' | 'whatsapp' | 'view' = 'chat') => {
    const title = getLangText(tour.title, language);
    if (actionType === 'whatsapp') {
      const msg = language === 'es'
        ? `Hola, encontré el tour "${title}" en el buscador del chat y quisiera consultar disponibilidad.`
        : `Hello, I found the tour "${title}" in the chat search and would like to check availability.`;
      openDirectWhatsApp(msg);
      return;
    }
    if (actionType === 'view' && onSelectTour) {
      onSelectTour(tour);
      return;
    }
    const prompt = language === 'es'
      ? `Quiero consultar disponibilidad, horarios y precios para el tour "${title}".`
      : `I would like to check availability, schedule and details for the tour "${title}".`;
    setTourSearchQuery('');
    setIsSearchFocused(false);
    void sendMessage(prompt);
  };

  return (
    <div className="fixed bottom-[calc(4.8rem+env(safe-area-inset-bottom))] right-3 sm:right-4 lg:bottom-6 lg:right-6 z-[80]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="whatsapp-modal-window mb-3 w-[90vw] max-w-[400px] h-[min(620px,calc(100vh-120px))] rounded-2xl overflow-hidden bg-[#07241a] border border-emerald-500/30 shadow-2xl flex flex-col relative"
          >
            <div className="p-3.5 bg-[#1E7B4A] text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-sm flex items-center gap-1.5">
                    Costa Rica Tours
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-300/20 font-bold tracking-wider">IA</span>
                  </div>
                  <div className="text-[10px] text-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    {isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen((prev) => !prev);
                    if (!isSearchOpen) setIsSearchFocused(true);
                  }}
                  className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-white/25 text-white' : 'hover:bg-white/15 text-white/90'}`}
                  aria-label={language === 'es' ? 'Buscar tours' : 'Search tours'}
                  title={language === 'es' ? 'Filtrar tours en el chat' : 'Filter tours in chat'}
                >
                  <Search className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-white/10" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Barra de Búsqueda Inteligente de Tours */}
            <div className="bg-[#051c14] border-b border-emerald-900/60 p-2.5 relative z-30">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={tourSearchQuery}
                  onChange={(e) => setTourSearchQuery(e.target.value)}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    setIsSearchOpen(true);
                  }}
                  placeholder={
                    language === 'es'
                      ? 'Filtrar tours (ej: Arenal, Ballenas, Rafting)...'
                      : 'Filter tours (e.g. Arenal, Whales, Rafting)...'
                  }
                  className="w-full pl-8 pr-7 py-1.5 bg-black/40 border border-emerald-500/30 rounded-lg text-xs text-white placeholder-stone-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 transition-all"
                />
                {tourSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTourSearchQuery('')}
                    className="absolute right-2 text-stone-400 hover:text-white p-0.5 rounded-full"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Chips de sugerencias rápidas cuando el buscador está enfocado o vacío */}
              {isSearchFocused && !tourSearchQuery && (
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 text-[10px] scrollbar-none">
                  <span className="text-stone-400 text-[10px] shrink-0">
                    {language === 'es' ? 'Filtros rápidos:' : 'Quick filters:'}
                  </span>
                  {quickSearchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setTourSearchQuery(suggestion)}
                      className="px-2 py-0.5 rounded-full bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/50 shrink-0 transition-colors cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Resultados flotantes de la búsqueda inteligente de tours */}
              {tourSearchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 mx-2 p-2 bg-[#041711]/98 backdrop-blur-md rounded-xl border border-emerald-500/40 shadow-2xl max-h-[260px] overflow-y-auto space-y-2 z-40">
                  <div className="flex items-center justify-between text-[11px] text-emerald-300 font-semibold px-1 pb-1 border-b border-emerald-900/60">
                    <span>
                      {filteredTours.length}{' '}
                      {language === 'es' ? 'tours encontrados' : 'tours found'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTourSearchQuery('');
                        setIsSearchFocused(false);
                      }}
                      className="text-stone-400 hover:text-white text-[10px] px-1 py-0.5 rounded hover:bg-white/10"
                    >
                      {language === 'es' ? 'Cerrar' : 'Close'}
                    </button>
                  </div>

                  {filteredTours.length === 0 ? (
                    <div className="py-4 text-center text-xs text-stone-400">
                      <p>
                        {language === 'es'
                          ? 'No encontramos tours para tu búsqueda.'
                          : 'No tours found matching your search.'}
                      </p>
                      <p className="text-[10px] text-emerald-400 mt-1">
                        {language === 'es'
                          ? 'Pregúntale al Concierge en el chat para buscar en todo el catálogo.'
                          : 'Ask the Concierge in the chat to search the full catalog.'}
                      </p>
                    </div>
                  ) : (
                    filteredTours.map((tour) => {
                      const title = getLangText(tour.title, language);
                      return (
                        <div
                          key={tour.id}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-emerald-500/20 transition-all flex flex-col gap-1.5"
                        >
                          <div className="flex items-start gap-2">
                            <img
                              src={tour.image}
                              alt={title}
                              className="w-11 h-11 rounded-md object-cover shrink-0 border border-emerald-500/30"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-semibold text-white truncate">{title}</h4>
                              <div className="flex items-center gap-2 text-[10px] text-stone-300 mt-0.5">
                                <span className="flex items-center gap-0.5 text-emerald-300">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {tour.region}
                                </span>
                                <span>•</span>
                                <span className="text-amber-300 font-bold">${tour.priceUSD} USD</span>
                                <span>•</span>
                                <span>{tour.durationHours}h</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => handleSelectTourFromSearch(tour, 'chat')}
                              className="flex-1 py-1 px-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <Bot className="w-3 h-3" />
                              {language === 'es' ? 'Consultar en chat' : 'Ask in chat'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectTourFromSearch(tour, 'whatsapp')}
                              className="py-1 px-2 rounded-md bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="WhatsApp (+506)"
                            >
                              <MessageCircle className="w-3 h-3" />
                              WA
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
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
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-to-tr from-[#20ba59] via-[#25D366] to-[#20ba59] hover:brightness-110 text-white shadow-[0_10px_25px_rgba(37,211,102,0.4)] flex items-center justify-center border-2 border-white/90 transition-all cursor-pointer"
        aria-label={language === 'es' ? 'Abrir WhatsApp Concierge Oficial (+506 8795 9148)' : 'Open Official WhatsApp Concierge (+506 8795 9148)'}
        title={language === 'es' ? 'WhatsApp Concierge Oficial (+506 8795 9148)' : 'Official WhatsApp Concierge (+506 8795 9148)'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-300 border-2 border-white animate-pulse" />
      </motion.button>
    </div>
  );
};

export default FloatingWhatsApp;
