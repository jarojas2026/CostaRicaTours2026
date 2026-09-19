import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, ChevronRight, Info, Map, Calendar, MessageSquare, Palette, Bot, QrCode, CheckCircle2, CheckCheck, Volume2, VolumeX, Share2, Download, Trash2, Sparkles, Leaf, Clock, AlertTriangle, AlertCircle, CalendarCheck, CalendarX, XCircle, Wifi, WifiOff, Mic, MicOff, ExternalLink, Ear, Volume1 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Language, Tour } from '../types';
import { getLangText } from '../utils/i18n';
import { useTours } from '../contexts/ToursContext';
import { useNatureSounds } from "../hooks/useNatureSounds";

interface FloatingWhatsAppProps {
  language: Language;
  initialMessage?: string;
  onOpenAIAssistant?: () => void;
  onSelectTour?: (tour: Tour) => void;
}


const MessageStatus = ({ isBot }: { isBot?: boolean }) => {
  const [isRead, setIsRead] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setIsRead(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <span className="inline-flex items-end gap-1 ml-2 float-right mt-1">
      <span className="text-[10px] opacity-60 leading-none">
        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      </span>
      {!isBot && <CheckCheck className={`w-3.5 h-3.5 leading-none ${isRead ? 'text-[#34B7F1]' : 'text-stone-600'}`} />}
      {isBot && <CheckCheck className={`w-3.5 h-3.5 leading-none ${isRead ? 'text-[#34B7F1]' : 'text-stone-600'}`} />}
    </span>
  );
};


const BookingProgressIndicator = ({ 
  status, 
  language 
}: { 
  status: 'none' | 'pending' | 'payment_required' | 'confirmed', 
  language: Language 
}) => {
  if (status === 'none') return null;
  
  const steps = [
    { id: 'pending', label: language === 'es' ? 'Pendiente' : 'Pending', icon: Clock },
    { id: 'payment_required', label: language === 'es' ? 'Pago Requerido' : 'Payment', icon: AlertCircle },
    { id: 'confirmed', label: language === 'es' ? 'Confirmado' : 'Confirmed', icon: CheckCircle2 }
  ];
  
  const getCurrentStepIndex = () => {
    switch (status) {
      case 'pending': return 0;
      case 'payment_required': return 1;
      case 'confirmed': return 2;
      default: return -1;
    }
  };
  
  const currentIndex = getCurrentStepIndex();

  return (
    <div className="bg-slate-50 border-b border-slate-200 p-3 shadow-sm shrink-0">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isActive = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1 z-10 relative">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-500 ${isActive ? (isCurrent ? (step.id === 'payment_required' ? 'border-orange-500 bg-amber-50 text-amber-600 shadow-sm' : 'border-teal-500 bg-stone-50 text-teal-600 shadow-sm') : 'border-teal-500 bg-teal-500 text-white') : 'border-slate-200 bg-white text-slate-300'}`}>
                  {isActive && !isCurrent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-[2px] mx-1 relative overflow-hidden bg-slate-200">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: idx < currentIndex ? '100%' : '0%' }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-teal-500 h-full" 
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};


const THEMES: Record<string, any> = {
  emerald: {
    name: 'Emerald (Standard)',
    button: 'bg-[#25D366] hover:bg-[#20bd5a] shadow-[0_0_20px_rgba(37,211,102,0.4)]',
    header: 'bg-[#1E7B4A]',
    badge: 'bg-[#E67E22] text-white',
    hoverBorder: 'hover:border-[#1E7B4A]',
    iconBg: 'bg-stone-50 group-hover:bg-stone-100',
    ping: 'bg-[#25D366]'
  },
  costa_rica: {
    name: 'Costa Rica Pura Vida',
    button: 'bg-[#E63946] hover:bg-[#D62828] shadow-[0_0_20px_rgba(230,57,70,0.4)]',
    header: 'bg-[#1D3557]',
    badge: 'bg-[#F1FAEE] text-[#1D3557]',
    hoverBorder: 'hover:border-[#E63946]',
    iconBg: 'bg-stone-50 group-hover:bg-[#F1FAEE]',
    ping: 'bg-[#E63946]'
  },
  ocean: {
    name: 'Ocean Blue',
    button: 'bg-[#0077B6] hover:bg-[#023E8A] shadow-[0_0_20px_rgba(0,119,182,0.4)]',
    header: 'bg-[#03045E]',
    badge: 'bg-[#48CAE4] text-white',
    hoverBorder: 'hover:border-[#0077B6]',
    iconBg: 'bg-stone-50 group-hover:bg-[#CAF0F8]',
    ping: 'bg-[#0077B6]'
  },
  sunset: {
    name: 'Tropical Sunset',
    button: 'bg-[#F4A261] hover:bg-[#E76F51] shadow-[0_0_20px_rgba(244,162,97,0.4)]',
    header: 'bg-[#264653]',
    badge: 'bg-[#E9C46A] text-[#264653]',
    hoverBorder: 'hover:border-[#F4A261]',
    iconBg: 'bg-stone-50 group-hover:bg-[#F4A261]/10',
    ping: 'bg-[#F4A261]'
  },
  volcano: {
    name: 'Arenal Volcano',
    button: 'bg-[#D00000] hover:bg-[#9D0208] shadow-[0_0_20px_rgba(208,0,0,0.4)]',
    header: 'bg-[#370617]',
    badge: 'bg-[#FFBA08] text-[#370617]',
    hoverBorder: 'hover:border-[#D00000]',
    iconBg: 'bg-stone-50 group-hover:bg-[#FFBA08]/10',
    ping: 'bg-[#D00000]'
  },
  rainforest: {
    name: 'Monteverde Rainforest',
    button: 'bg-[#2D6A4F] hover:bg-[#1B4332] shadow-[0_0_20px_rgba(45,106,79,0.4)]',
    header: 'bg-[#081C15]',
    badge: 'bg-[#74C69D] text-[#081C15]',
    hoverBorder: 'hover:border-[#2D6A4F]',
    iconBg: 'bg-stone-50 group-hover:bg-[#74C69D]/10',
    ping: 'bg-[#2D6A4F]'
  },
  orchid: {
    name: 'Wild Orchid',
    button: 'bg-[#9D4EDD] hover:bg-[#7B2CBF] shadow-[0_0_20px_rgba(157,78,221,0.4)]',
    header: 'bg-[#3C096C]',
    badge: 'bg-[#E0AAFF] text-[#3C096C]',
    hoverBorder: 'hover:border-[#9D4EDD]',
    iconBg: 'bg-stone-50 group-hover:bg-[#E0AAFF]/10',
    ping: 'bg-[#9D4EDD]'
  },
  gold: {
    name: 'Luxury Gold',
    button: 'bg-[#D4AF37] hover:bg-[#AA8C2C] shadow-[0_0_20px_rgba(212,175,55,0.4)]',
    header: 'bg-[#1A1A1A]',
    badge: 'bg-[#FFFFFF] text-[#1A1A1A]',
    hoverBorder: 'hover:border-[#D4AF37]',
    iconBg: 'bg-stone-50 group-hover:bg-[#D4AF37]/10',
    ping: 'bg-[#D4AF37]'
  },
  minimalist: {
    name: 'Minimalist Monochrome',
    button: 'bg-[#4A4A4A] hover:bg-[#2D2D2D] shadow-[0_0_20px_rgba(74,74,74,0.4)]',
    header: 'bg-[#111111]',
    badge: 'bg-[#E0E0E0] text-[#111111]',
    hoverBorder: 'hover:border-[#4A4A4A]',
    iconBg: 'bg-stone-50 group-hover:bg-[#E0E0E0]/20',
    ping: 'bg-[#4A4A4A]'
  },
  sky: {
    name: 'Clear Sky',
    button: 'bg-[#00B4D8] hover:bg-[#0096C7] shadow-[0_0_20px_rgba(0,180,216,0.4)]',
    header: 'bg-[#03045E]',
    badge: 'bg-[#90E0EF] text-[#03045E]',
    hoverBorder: 'hover:border-[#00B4D8]',
    iconBg: 'bg-stone-50 group-hover:bg-[#90E0EF]/20',
    ping: 'bg-[#00B4D8]'
  }
};

const keywordsToTourId: Record<string, string> = {
  'poas': 'sjo-3-in-1-combo',
  '3-in-1': 'sjo-3-in-1-combo',
  'irazu': 'sjo-irazu-orosi-lankester',
  'orosi': 'sjo-irazu-orosi-lankester',
  'lankester': 'sjo-irazu-orosi-lankester',
  'tortuga': 'sjo-tortuga-island-cruise',
  'isla tortuga': 'sjo-tortuga-island-cruise',
  'arenal full day': 'arenal-full-day',
  'arenal': 'arenal-hot-springs',
  'pure trek': 'arenal-pure-trek-canyoning',
  'canyoning': 'arenal-pure-trek-canyoning',
  'balsa': 'arenal-wave-balsa-rafting',
  'sky trek': 'arenal-sky-trek-tram-combo',
  'sky adventures': 'arenal-sky-trek-tram-combo',
  'guachipelin': 'guanacaste-guachipelin-combo',
  'diamante': 'guanacaste-diamante-adventure',
  'marlin del rey': 'guanacaste-marlin-del-rey-sunset',
  'selvatura': 'monteverde-selvatura-all-in-one',
  '100% aventura': 'monteverde-100-aventura-extreme',
  'superman': 'monteverde-100-aventura-extreme',
  'manuel antonio': 'manuel-antonio-sloth',
  'damas': 'manuel-antonio-damas-mangrove',
  'manglar': 'manuel-antonio-damas-mangrove',
  'ocean king': 'manuel-antonio-ocean-king-catamaran',
  'marino ballena': 'uvita-whale-watching-combo',
  'ballenas': 'uvita-whale-watching-combo',
  'isla del caño': 'uvita-cano-island-snorkel',
  'caño': 'uvita-cano-island-snorkel',
  'pacuare': 'pacuare-rafting',
  'rafting': 'pacuare-rafting',
  'monteverde': 'monteverde-canopy',
  'tortuguero': 'tortuguero-mawamba-3d2n',
  'catamaran': 'guanacaste-marlin-del-rey-sunset',
  'sailing': 'guanacaste-marlin-del-rey-sunset',
  'corcovado': 'osa-corcovado-sirena-day',
  'sirena': 'osa-corcovado-sirena-day',
  'celeste': 'arenal-celeste',
  'nauyaca': 'manuel-antonio-nauyaca',
  'whale': 'uvita-whale-watching-combo',
  'cahuita': 'caribe-cahuita-snorkeling-hike',
  'circuito': 'circuit-classic-costa-rica-5d',
  '5 dias': 'circuit-classic-costa-rica-5d',
  'city tour': 'sjo-city-heritage-tour',
  'shuttle': 'sjo-shuttle',
  'rental': 'car-rental-4x4',
  'sim': 'tourist-sim-esim'
};

const getMentionedTours = (text: string, TOURS: Tour[]) => {
  if (!text || text.length < 3) return [];
  const lower = text.toLowerCase();
  const matchedTours: Tour[] = [];
  const seenIds = new Set<string>();

  for (const [kw, id] of Object.entries(keywordsToTourId)) {
    if (lower.includes(kw)) {
      const tour = TOURS.find(t => t.id === id);
      if (tour && !seenIds.has(tour.id)) {
        matchedTours.push(tour);
        seenIds.add(tour.id);
      }
    }
  }
  
  // Also check exact ID
  for (const tour of TOURS) {
    if (lower.includes(tour.id.toLowerCase()) && !seenIds.has(tour.id)) {
      matchedTours.push(tour);
      seenIds.add(tour.id);
    }
  }

  return matchedTours.slice(0, 1); // Limit to 1 mini-card to save space
};

interface ChatMiniCardProps {
  tour: Tour;
  language: Language;
  onSelectTour?: (t: Tour) => void;
}

const getFormattedDateLabel = (dateStr: string, lang: Language) => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString(lang === 'es' ? 'es-CR' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

const ChatMiniCard: React.FC<ChatMiniCardProps> = ({ tour, language, onSelectTour }) => {
  const title = getLangText(tour.title, language);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const durationBadge = React.useMemo(() => {
    if (tour.durationHours) {
      return `${tour.durationHours} hrs`;
    }
    if (tour.durationLabel) {
      const label = getLangText(tour.durationLabel, language);
      return label;
    }
    if ((tour as any).duration) {
      return (tour as any).duration;
    }
    return '4 hrs';
  }, [tour, language]);

  const todayStr = React.useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const tomorrowStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const in3DaysStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  }, []);

  const in7DaysStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState(tomorrowStr);

  const handleQuickDate = (daysAhead: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedDate(dateStr);
  };

  const handleOpenTourDetails = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      sessionStorage.setItem('tentative_travel_date', selectedDate);
      sessionStorage.setItem('tentative_tour_id', tour.id);
    } catch (err) {}
    if (onSelectTour) {
      onSelectTour({
        ...tour,
        tentativeDate: selectedDate
      } as any);
    }
  };

  const formattedDate = getFormattedDateLabel(selectedDate, language);

  const dateValidation = React.useMemo(() => {
    if (!selectedDate) {
      return {
        status: 'error' as const,
        label: language === 'es' ? 'Selecciona una fecha válida' : 'Select a valid date',
        detail: language === 'es' ? 'Se requiere fecha de viaje' : 'Travel date required',
        isBlackout: true,
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = selectedDate.split('-').map(Number);
    const selected = new Date(y, m - 1, d);
    selected.setHours(0, 0, 0, 0);

    if (isNaN(selected.getTime()) || selected < today) {
      return {
        status: 'past' as const,
        label: language === 'es' ? 'Fecha no disponible (fecha anterior a hoy)' : 'Date unavailable (past date)',
        detail: language === 'es' ? 'Elige una fecha a partir de hoy' : 'Select today or later',
        isBlackout: true,
      };
    }

    const dayOfWeek = selected.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue...
    const isManuelAntonio = tour.id.includes('manuel-antonio') || (tour.title && tour.title.es && tour.title.es.toLowerCase().includes('manuel antonio'));
    
    // Manuel Antonio closed on Tuesdays by SINAC conservation regulation
    if (isManuelAntonio && dayOfWeek === 2) {
      return {
        status: 'blackout' as const,
        label: language === 'es' ? 'Bloqueo: Parque Manuel Antonio cerrado los martes' : 'Blackout: Manuel Antonio NP closed on Tuesdays',
        detail: language === 'es' ? 'Regulación de conservación SINAC/MINAE' : 'SINAC/MINAE Conservation regulation',
        isBlackout: true,
      };
    }

    // Holiday blackout dates (e.g., Dec 25 Christmas & Jan 1 New Year's Day)
    if ((m === 12 && d === 25) || (m === 1 && d === 1)) {
      return {
        status: 'blackout' as const,
        label: language === 'es' ? 'Bloqueo: Feriado nacional / Operación cerrada' : 'Blackout: National holiday / Closed operations',
        detail: language === 'es' ? 'Sin salidas programadas para esta fecha' : 'No departures scheduled for this date',
        isBlackout: true,
      };
    }

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) {
      return {
        status: 'limited' as const,
        label: language === 'es' ? `Fecha válida • Alta demanda fin de semana` : `Valid date • Weekend high demand`,
        detail: language === 'es' ? `Cupos limitados para ${formattedDate}` : `Limited slots for ${formattedDate}`,
        isBlackout: false,
      };
    }

    return {
      status: 'valid' as const,
      label: language === 'es' ? `Fecha válida y disponible para reserva` : `Date verified & available for booking`,
      detail: language === 'es' ? `Salidas confirmadas para ${formattedDate}` : `Guaranteed departures for ${formattedDate}`,
      isBlackout: false,
    };
  }, [selectedDate, tour, language, formattedDate]);

  const triggerNativePicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dateInputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch (err) {
        dateInputRef.current.focus();
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ 
        opacity: 1, 
        scale: [0.93, 1.05, 0.98, 1.02, 1],
        y: 0,
        boxShadow: [
          "0 0 0 0 rgba(30, 77, 43, 0)",
          "0 0 0 8px rgba(30, 77, 43, 0.3)",
          "0 0 0 16px rgba(30, 77, 43, 0)",
          "0 0 0 6px rgba(30, 77, 43, 0.2)",
          "0 0 0 0 rgba(30, 77, 43, 0)"
        ]
      }}
      transition={{ 
        duration: 1.8, 
        ease: "easeInOut",
        times: [0, 0.25, 0.5, 0.75, 1]
      }}
      className="whatsapp-mini-card-pulse mini-card mini-card-pulsing relative mt-2 w-[252px] bg-[#FAF8F5] rounded-2xl shadow-xl border border-[#D5CCBE] overflow-hidden group text-stone-900"
    >
      {/* Earth & forest attention highlight badge */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-[#1E4D2B] text-[#F5EEDC] text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md border border-[#3E6D4B]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400"></span>
        </span>
        <Sparkles className="w-2.5 h-2.5 text-orange-300" />
        <span>{language === 'es' ? 'Tour Recomendado' : 'Recommended'}</span>
      </div>

      {/* Tour Cover Image */}
      <div 
        onClick={() => handleOpenTourDetails()}
        className="h-24 w-full relative overflow-hidden cursor-pointer"
      >
        <img src={tour.image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#143020]/95 via-[#143020]/35 to-transparent"></div>
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Map className="w-3 h-3 text-[#A8D5BA]" />
            <span className="text-[9px] font-bold text-[#FAF8F5] uppercase tracking-wider">{tour.region}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Duration Badge */}
            <div className="bg-[#143020]/90 backdrop-blur-xs text-[#E2EFE7] border border-[#2D663B]/60 text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5 text-orange-300" />
              <span>{durationBadge}</span>
            </div>
            {/* Price Tag */}
            <div className="bg-[#D97736] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm border border-[#F39C5E]/40">
              ${tour.priceUSD} USD
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-[#FAF8F5] space-y-2.5">
        {/* Title */}
        <div onClick={() => handleOpenTourDetails()} className="cursor-pointer">
          <h4 className="text-xs font-bold text-stone-900 line-clamp-2 leading-snug hover:text-[#1E4D2B] transition-colors">
            {title}
          </h4>
        </div>

        {/* Earth & Forest Native Date Selector Component */}
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="bg-[#F3EFEA] hover:bg-[#EBE5DC] border border-[#D8CFC2] hover:border-[#1E4D2B]/60 rounded-xl p-2.5 space-y-2 shadow-xs hover:shadow-lg hover:scale-[1.01] transform transition-all duration-200 ease-out"
        >
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase text-[#1B3B2B] tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-[#2D663B]" />
              <span>{language === 'es' ? 'Pre-seleccionar Fecha:' : 'Select Travel Date:'}</span>
            </label>
            <span className="text-[8.5px] font-bold text-[#1E4D2B] bg-[#E4ECE6] px-2 py-0.5 rounded-full border border-[#BCD4C2]">
              {language === 'es' ? 'Cupos 2026' : '2026 Slots'}
            </span>
          </div>

          {/* Stylized Interactive Date Trigger Container with marked Hover State */}
          <div 
            onClick={triggerNativePicker}
            className="relative flex items-center justify-between bg-[#FCFAF7] hover:bg-white border-2 border-[#8C7A6B]/35 hover:border-[#1E4D2B] hover:ring-2 hover:ring-[#1E4D2B]/20 hover:shadow-md hover:scale-[1.01] transform rounded-xl px-2.5 py-2 cursor-pointer transition-all duration-200 ease-out group/date"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1E4D2B] group-hover/date:bg-[#14391F] text-[#F5EEDC] flex items-center justify-center font-black text-xs shadow-xs transition-colors">
                📅
              </div>
              <div className="text-left">
                <span className="block text-[8px] uppercase font-bold text-stone-500 leading-none">
                  {language === 'es' ? 'Fecha Seleccionada' : 'Chosen Date'}
                </span>
                <span className="block text-xs font-black text-[#1A3A29] capitalize leading-tight mt-0.5">
                  {formattedDate}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-[#E8E2D8] group-hover/date:bg-[#1E4D2B] group-hover/date:text-[#FAF8F5] text-stone-800 text-[9px] font-bold px-2 py-1 rounded-md transition-all duration-200 shadow-2xs">
              <span>{language === 'es' ? 'Cambiar' : 'Change'}</span>
            </div>

            {/* Native date input cleanly integrated and positioned */}
            <input
              ref={dateInputRef}
              type="date"
              min={todayStr}
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                }
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              aria-label="Select date"
            />
          </div>

          {/* Validation Status Indicator Underneath Date Input */}
          <div className="flex items-center justify-between text-[8.5px] px-1 font-semibold">
            <div className="flex items-center gap-1.5 truncate">
              {dateValidation.status === 'valid' && (
                <>
                  <CheckCircle2 className="w-3 h-3 text-[#2D663B] shrink-0" />
                  <span className="text-[#1E4D2B] font-bold">
                    {language === 'es' ? 'Fecha válida para reserva' : 'Valid date for booking'}
                  </span>
                </>
              )}
              {dateValidation.status === 'limited' && (
                <>
                  <Sparkles className="w-3 h-3 text-[#D97736] shrink-0" />
                  <span className="text-[#B45309] font-bold">
                    {language === 'es' ? 'Cupos limitados fin de semana' : 'Weekend limited slots'}
                  </span>
                </>
              )}
              {dateValidation.status === 'blackout' && (
                <>
                  <AlertTriangle className="w-3 h-3 text-[#DC2626] shrink-0" />
                  <span className="text-[#B91C1C] font-bold">
                    {language === 'es' ? 'Conflicto: Período de bloqueo / Cierre' : 'Conflict: Blackout period / Closed'}
                  </span>
                </>
              )}
              {dateValidation.status === 'past' && (
                <>
                  <XCircle className="w-3 h-3 text-[#DC2626] shrink-0" />
                  <span className="text-[#B91C1C] font-bold">
                    {language === 'es' ? 'Fecha pasada inválida' : 'Invalid past date'}
                  </span>
                </>
              )}
            </div>
            <span className="text-[8px] text-stone-500 font-mono shrink-0">
              UTC-6 (CR)
            </span>
          </div>

          {/* Quick Date Presets Chips */}
          <div className="space-y-1 pt-0.5">
            <span className="text-[8px] text-stone-500 font-bold uppercase tracking-wider block">
              {language === 'es' ? 'Atajos Rápidos:' : 'Quick Presets:'}
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={(e) => handleQuickDate(1, e)}
                className={`text-[9px] font-black py-1 px-1 rounded-lg transition-all cursor-pointer text-center truncate ${
                  selectedDate === tomorrowStr
                    ? 'bg-[#1E4D2B] text-[#F5EEDC] shadow-xs border border-[#14391F] scale-[1.02]'
                    : 'bg-[#FCFAF7] hover:bg-[#EAE4DC] text-stone-700 border border-[#DDD6CB] hover:border-[#8C7A6B]/50'
                }`}
              >
                {language === 'es' ? 'Mañana' : 'Tomorrow'}
              </button>

              <button
                type="button"
                onClick={(e) => handleQuickDate(3, e)}
                className={`text-[9px] font-black py-1 px-1 rounded-lg transition-all cursor-pointer text-center truncate ${
                  selectedDate === in3DaysStr
                    ? 'bg-[#1E4D2B] text-[#F5EEDC] shadow-xs border border-[#14391F] scale-[1.02]'
                    : 'bg-[#FCFAF7] hover:bg-[#EAE4DC] text-stone-700 border border-[#DDD6CB] hover:border-[#8C7A6B]/50'
                }`}
              >
                +3 {language === 'es' ? 'Días' : 'Days'}
              </button>

              <button
                type="button"
                onClick={(e) => handleQuickDate(7, e)}
                className={`text-[9px] font-black py-1 px-1 rounded-lg transition-all cursor-pointer text-center truncate ${
                  selectedDate === in7DaysStr
                    ? 'bg-[#1E4D2B] text-[#F5EEDC] shadow-xs border border-[#14391F] scale-[1.02]'
                    : 'bg-[#FCFAF7] hover:bg-[#EAE4DC] text-stone-700 border border-[#DDD6CB] hover:border-[#8C7A6B]/50'
                }`}
              >
                +1 {language === 'es' ? 'Semana' : 'Week'}
              </button>
            </div>
          </div>

          {/* Live Availability & Blackout Detailed Status Banner */}
          <div 
            className={`flex items-start gap-1.5 text-[9px] font-bold rounded-lg p-2 border transition-all ${
              dateValidation.status === 'valid'
                ? 'text-[#1E4D2B] bg-[#E8F0EA] border-[#BCD4C2]'
                : dateValidation.status === 'limited'
                ? 'text-[#8A5012] bg-[#FEF3E2] border-[#F3CCA0]'
                : 'text-[#991B1B] bg-[#FEF2F2] border-[#FECACA]'
            }`}
          >
            {dateValidation.status === 'valid' && (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2D663B] shrink-0 mt-0.5" />
            )}
            {dateValidation.status === 'limited' && (
              <Sparkles className="w-3.5 h-3.5 text-[#D97736] shrink-0 mt-0.5" />
            )}
            {dateValidation.status === 'blackout' && (
              <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0 mt-0.5" />
            )}
            {dateValidation.status === 'past' && (
              <XCircle className="w-3.5 h-3.5 text-[#DC2626] shrink-0 mt-0.5" />
            )}
            
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-black truncate">{dateValidation.label}</span>
              <span className="text-[8px] opacity-85 font-medium mt-0.5">{dateValidation.detail}</span>
            </div>
          </div>
        </div>

        {/* View Full Tour Details Button */}
        <button
          type="button"
          disabled={dateValidation.isBlackout}
          onClick={(e) => handleOpenTourDetails(e)}
          className={`w-full flex items-center justify-between text-[#FAF8F5] font-black text-[11px] uppercase px-3 py-2.5 rounded-xl shadow-md transition-all group/btn ${
            dateValidation.isBlackout
              ? 'bg-stone-400 opacity-70 cursor-not-allowed border border-stone-400'
              : 'bg-[#1E4D2B] hover:bg-[#14391F] hover:shadow-lg cursor-pointer border border-[#2D663B]'
          }`}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Leaf className="w-3.5 h-3.5 text-orange-300 shrink-0" />
            <span className="truncate">
              {dateValidation.isBlackout
                ? (language === 'es' ? 'Fecha no disponible' : 'Date Unavailable')
                : (language === 'es' ? 'Continuar con esta Fecha' : 'Continue with Date')}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform text-orange-300 shrink-0" />
        </button>
      </div>
    </motion.div>
  );
};

/**

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ language, initialMessage, onOpenAIAssistant, onSelectTour }) => {
  const { tours: TOURS } = useTours();
  const [isOpen, setIsOpen] = useState(false);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [badgeText, setBadgeText] = useState(language === 'es' ? '¡Chiva!' : 'New');
  
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [generatedQRUrl, setGeneratedQRUrl] = useState<string | null>(null);
  const { isMuted, setIsMuted, playNotification } = useNatureSounds(isOpen);
  
  // Internet connection detection
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showReconnectedAlert, setShowReconnectedAlert] = useState(false);
  const [offlineAttemptNotice, setOfflineAttemptNotice] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedAlert(true);
      setOfflineAttemptNotice(false);
      const timer = setTimeout(() => setShowReconnectedAlert(false), 4000);
      return () => clearTimeout(timer);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedAlert(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot', text: string, quickActions?: {label: string, action: string; data?: any}[] }[]>(() => {
    try {
      const saved = localStorage.getItem('whatsapp_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [selectedAgent, setSelectedAgent] = useState<'concierge' | 'booking_react' | 'transporte' | 'sinpe_pagos'>('concierge');

  const AGENTS = [
    {
      id: 'concierge',
      name: language === 'es' ? '🌴 Concierge Pura Vida' : '🌴 Pura Vida Concierge',
      role: language === 'es' ? 'Tours, Playas y Parques' : 'Tours, Beaches & Parks',
      badge: 'IA Concierge'
    },
    {
      id: 'booking_react',
      name: language === 'es' ? '🤖 Reservas 2026' : '🤖 Booking 2026',
      role: language === 'es' ? 'ReAct + Cupos en Vivo' : 'ReAct + Live Slots',
      badge: 'ReAct DB'
    },
    {
      id: 'transporte',
      name: language === 'es' ? '🚐 Traslados Alsama' : '🚐 Alsama Transfers',
      role: language === 'es' ? 'Rutas Aeropuerto y Vans' : 'Airport Routes & Vans',
      badge: 'Transporte'
    },
    {
      id: 'sinpe_pagos',
      name: language === 'es' ? '💳 SINPE & Pagos' : '💳 SINPE & Payments',
      role: language === 'es' ? 'Validación y Comprobantes' : 'Validation & Receipts',
      badge: 'SINPE'
    }
  ];

  const prevIsOpenRef = React.useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      playNotification();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, playNotification]);

  const prevChatLengthRef = React.useRef(0);
  useEffect(() => {
    if (chatHistory.length > prevChatLengthRef.current) {
      const lastMsg = chatHistory[chatHistory.length - 1];
      if (lastMsg && lastMsg.role === 'bot' && isOpen) {
        playNotification();
      }
    }
    prevChatLengthRef.current = chatHistory.length;
  }, [chatHistory, isOpen, playNotification]);

  const [chatInput, setChatInput] = useState(() => {
    try {
      return localStorage.getItem('whatsapp_chat_input_draft') || '';
    } catch {
      return '';
    }
  });
  const [showTyping, setShowTyping] = useState(false);
  const [isSendingToWebhook, setIsSendingToWebhook] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<"none" | "pending" | "payment_required" | "confirmed">("none");

  // Autoguardado del borrador de mensaje en localStorage para prevenir pérdida accidental
  useEffect(() => {
    try {
      if (chatInput.trim()) {
        localStorage.setItem('whatsapp_chat_input_draft', chatInput);
      } else {
        localStorage.removeItem('whatsapp_chat_input_draft');
      }
    } catch (e) {
      console.warn('Error saving chat draft to localStorage:', e);
    }
  }, [chatInput]);

  // Voice-to-text recording state & controller
  const [isWhisperMode, setIsWhisperMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('whatsapp_whisper_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceNotice, setVoiceNotice] = useState<{
    title: string;
    description: string;
    guideUrl?: string;
    guideLabel?: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
    setAudioLevel(0);
  };

  const startListeningSession = async (whisperMode: boolean) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice({
        title: language === 'es'
          ? 'Reconocimiento de voz no disponible'
          : 'Speech recognition unavailable',
        description: language === 'es'
          ? 'La API de reconocimiento de voz está deshabilitada o no es compatible con este navegador. Te recomendamos usar Google Chrome, Microsoft Edge o Safari.'
          : 'The Speech Recognition API is disabled or unsupported in this browser. We recommend using Google Chrome, Microsoft Edge, or Safari.',
        guideUrl: 'https://support.google.com/chrome/answer/2693767',
        guideLabel: language === 'es' ? 'Ver guía de permisos y compatibilidad' : 'View permissions & compatibility guide'
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      // Whisper mode evaluates up to 5 multi-phonemic alternatives to capture low-energy whisper formants
      recognition.maxAlternatives = whisperMode ? 5 : 1;
      recognition.lang = language === 'es' ? 'es-CR' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          let text = item[0]?.transcript || '';

          // In whisper mode, evaluate candidate hypotheses for low-volume confidence
          if (whisperMode && item.length > 1) {
            let bestMatch = item[0];
            for (let k = 1; k < item.length; k++) {
              if ((item[k]?.confidence || 0) > (bestMatch?.confidence || 0) && item[k]?.transcript?.trim()) {
                bestMatch = item[k];
              }
            }
            text = bestMatch?.transcript || text;
          }

          if (item.isFinal) {
            finalChunk += text;
          } else {
            interim += text;
          }
        }

        if (finalChunk.trim()) {
          setChatInput((prev) => {
            const trimmedPrev = prev.trim();
            const trimmedFinal = finalChunk.trim();
            return trimmedPrev ? `${trimmedPrev} ${trimmedFinal}` : trimmedFinal;
          });
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event warning:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceNotice({
            title: language === 'es'
              ? 'Permiso de micrófono bloqueado'
              : 'Microphone permission blocked',
            description: language === 'es'
              ? 'El acceso al micrófono está deshabilitado en los permisos de este sitio o navegador. Haz clic en el ícono del candado/configuración de la barra de direcciones para habilitarlo.'
              : 'Microphone access is blocked by browser site permissions. Click the lock/settings icon in your browser address bar to allow it.',
            guideUrl: 'https://support.google.com/chrome/answer/2693767',
            guideLabel: language === 'es' ? '¿Cómo activar el micrófono en tu navegador?' : 'How to enable microphone in your browser'
          });
        } else if (event.error === 'audio-capture') {
          setVoiceNotice({
            title: language === 'es' ? 'Micrófono no detectado' : 'No microphone detected',
            description: language === 'es'
              ? 'No se encontró ningún micrófono conectado o activo en tu dispositivo.'
              : 'No microphone was found or active on your device.',
            guideUrl: 'https://support.google.com/chrome/answer/2693767',
            guideLabel: language === 'es' ? 'Guía de solución de audio' : 'Audio troubleshooting guide'
          });
        } else if (event.error !== 'no-speech') {
          setVoiceNotice({
            title: language === 'es' ? 'Audio no reconocido' : 'Speech not recognized',
            description: language === 'es'
              ? whisperMode
                ? 'No se detectó el susurro con suficiente claridad. Acércate más al micrófono y susurra despacio.'
                : 'No se logró capturar audio con suficiente claridad. Por favor vuelve a pulsar el micrófono e intenta hablar cerca de tu dispositivo.'
              : whisperMode
                ? 'Whisper was too quiet to detect. Move closer to the microphone and whisper slowly.'
                : 'Could not capture clear speech. Please tap the microphone again and speak clearly near your device.'
          });
          setTimeout(() => setVoiceNotice(null), 5000);
        }
        stopListening();
      };

      recognition.onend = () => {
        stopListening();
      };

      // In whisper mode, activate proximity hardware AGC booster and live sensitivity meter
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              autoGainControl: true,
              echoCancellation: true,
              // In whisper mode, relax aggressive noise suppression so soft whisper fricatives aren't clipped
              noiseSuppression: !whisperMode,
            }
          });
          audioStreamRef.current = stream;

          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.4;

            if (whisperMode) {
              const gainNode = ctx.createGain();
              gainNode.gain.value = 3.5; // +350% proximity amplifier for whispers
              source.connect(gainNode);
              gainNode.connect(analyser);
            } else {
              source.connect(analyser);
            }

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkLevel = () => {
              if (!recognitionRef.current) return;
              analyser.getByteFrequencyData(dataArray);
              let total = 0;
              for (let idx = 0; idx < dataArray.length; idx++) {
                total += dataArray[idx];
              }
              const avg = total / dataArray.length;
              const boostFactor = whisperMode ? 2.8 : 1.4;
              const val = Math.min(100, Math.round((avg / 128) * 100 * boostFactor));
              setAudioLevel(val);
              animFrameRef.current = requestAnimationFrame(checkLevel);
            };
            animFrameRef.current = requestAnimationFrame(checkLevel);
          }
        } catch (mediaErr) {
          console.debug('MediaStream proximity AGC boost note:', mediaErr);
        }
      }

      recognition.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      stopListening();
      setVoiceNotice({
        title: language === 'es' ? 'Acceso al micrófono restringido' : 'Microphone access restricted',
        description: language === 'es'
          ? 'No se pudo iniciar el dictado debido a restricciones de seguridad del navegador o configuración de permisos de sitio.'
          : 'Could not start voice dictation due to browser security restrictions or site permission settings.',
        guideUrl: 'https://support.google.com/chrome/answer/2693767',
        guideLabel: language === 'es' ? 'Ver guía para permitir micrófono' : 'See guide to allow microphone'
      });
    }
  };

  const toggleWhisperMode = (forcedState?: boolean) => {
    const next = typeof forcedState === 'boolean' ? forcedState : !isWhisperMode;
    setIsWhisperMode(next);
    try {
      localStorage.setItem('whatsapp_whisper_mode', String(next));
    } catch (e) {}
    // If currently listening, restart listening so the new sensitivity profile takes effect immediately
    if (isListening) {
      stopListening();
      setTimeout(() => {
        startListeningSession(next);
      }, 150);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListeningSession(isWhisperMode);
    }
  };

  // Clean up speech recognition on close or unmount
  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [isOpen, isListening]);

  useEffect(() => {
    let typingTimer: NodeJS.Timeout;
    if (isOpen) {
      setShowTyping(false);
      typingTimer = setTimeout(() => {
        setShowTyping(true);
      }, 5000);
    } else {
      setShowTyping(false);
    }
    return () => clearTimeout(typingTimer);
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('whatsapp_chat_history', JSON.stringify(chatHistory.slice(-50)));
  }, [chatHistory]);


  useEffect(() => {
    if (isGeneratingQR) {
      QRCode.toDataURL(window.location.href, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      .then(url => {
        setGeneratedQRUrl(url);
      })
      .catch(err => {
        console.error(err);
      });
    } else {
      setGeneratedQRUrl(null);
    }
  }, [isGeneratingQR, window.location.href]);

  useEffect(() => {
    const badgeTimer = setTimeout(() => {
      setBadgeText(language === 'es' ? 'Ayuda Disponible' : 'Help Available');
    }, 15000);

    return () => clearTimeout(badgeTimer);
  }, [language]);

  useEffect(() => {
    if (scanResult) {
      setRecentScans(prev => {
        const newScans = [scanResult, ...prev.filter(s => s !== scanResult)].slice(0, 3);
        return newScans;
      });

      const timer = setTimeout(() => {
        let possibleTourId = scanResult;
        
        try {
           const url = new URL(scanResult);
           const parts = url.pathname.split('/').filter(Boolean);
           if (parts.length > 0) {
               possibleTourId = parts[parts.length - 1];
           }
        } catch(e) {}
        
        const foundTour = TOURS.find(t => t.id === possibleTourId || scanResult.includes(t.id));
        
        if (foundTour && onSelectTour) {
           onSelectTour(foundTour);
           setIsOpen(false);
           setIsScanning(false);
           setScanResult(null);
        } else {
           try {
             const url = new URL(scanResult);
             if (url.protocol === 'http:' || url.protocol === 'https:') {
               window.location.href = url.href;
             }
           } catch (e) {}
        }
      }, 2000); // 2 second debounce/delay to allow user to see success UI

      return () => clearTimeout(timer);
    }
  }, [scanResult, onSelectTour]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      setNeedsAttention(false);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!isOpen) {
          setNeedsAttention(true);
        }
      }, 30000);
    };

    // Track user interaction
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    
    // Initial start
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [isOpen]);

  const generateCustomGreeting = (baseMsgEs: string, baseMsgEn: string, isDirectChat = false) => {
    const hour = new Date().getHours();
    let timeGreetingEs = '';
    let timeGreetingEn = '';

    if (hour >= 5 && hour < 12) {
      timeGreetingEs = 'Buenos días';
      timeGreetingEn = 'Good morning';
    } else if (hour >= 12 && hour < 19) {
      timeGreetingEs = 'Buenas tardes';
      timeGreetingEn = 'Good afternoon';
    } else {
      timeGreetingEs = 'Buenas noches';
      timeGreetingEn = 'Good evening';
    }

    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const pageContextEs = `estoy viendo la página: ${currentUrl}`;
    const pageContextEn = `I am viewing the page: ${currentUrl}`;

    if (isDirectChat && initialMessage) {
      return `${language === 'es' ? timeGreetingEs : timeGreetingEn}, ${language === 'es' ? pageContextEs : pageContextEn}. ${initialMessage}`;
    }

    if (language === 'es') {
      return `${timeGreetingEs}, ${pageContextEs}. ${baseMsgEs}`;
    } else {
      return `${timeGreetingEn}, ${pageContextEn}. ${baseMsgEn}`;
    }
  };

  const t = {
    title: language === 'es' ? 'Asistente Pura Vida' : 'Pura Vida Assistant',
    status: isOnline 
      ? (language === 'es' ? 'Pura vida, en línea' : 'Online')
      : (language === 'es' ? 'Sin conexión (Offline)' : 'No Internet (Offline)'),
    prompt: language === 'es' ? '¡Hola! 👋 ¿En qué te podemos ayudar hoy para tu viaje a Costa Rica?' : 'Hi! 👋 How can we help you today with your trip to Costa Rica?',
    options: [
      {
        id: 'tours',
        icon: <Map className={`w-5 h-5 text-orange-500`} />,
        text: language === 'es' ? 'Recomendación de Tours' : 'Tour Recommendations',
        msg: generateCustomGreeting('Necesito recomendaciones de tours en Costa Rica.', 'I need tour recommendations in Costa Rica.')
      },
      {
        id: 'itinerary',
        icon: <Calendar className={`w-5 h-5 text-orange-500`} />,
        text: language === 'es' ? 'Planear Itinerario' : 'Plan Itinerary',
        msg: generateCustomGreeting('Quiero ayuda para armar mi itinerario de viaje.', 'I want help planning my travel itinerary.')
      },
      {
        id: 'info',
        icon: <Info className={`w-5 h-5 text-orange-500`} />,
        text: language === 'es' ? 'Dudas y Consultas' : 'Questions & Doubts',
        msg: generateCustomGreeting('Tengo algunas dudas generales sobre viajar a Costa Rica.', 'I have some general questions about traveling to Costa Rica.')
      },
      {
        id: 'custom',
        icon: <MessageSquare className={`w-5 h-5 text-orange-500`} />,
        text: language === 'es' ? 'Chat Directo' : 'Direct Chat',
        msg: generateCustomGreeting('Quisiera más información.', 'I would like more information.', true)
      },
      {
        id: 'ai-bot',
        icon: <Bot className="w-5 h-5 text-orange-500" />,
        text: language === 'es' ? 'Bot de Reservas con IA (Urgencias)' : 'AI Booking Bot (Urgent)',
        msg: ''
      },
      {
        id: 'scan-qr',
        icon: <QrCode className={`w-5 h-5 text-orange-500`} />,
        text: language === 'es' ? 'Escanear Código de Tour' : 'Scan Tour Code',
        msg: ''
      },
      {
        id: 'generate-qr',
        icon: <Share2 className="w-5 h-5 text-orange-500" />,
        text: language === 'es' ? 'Compartir (QR)' : 'Share via QR',
        msg: ''
      }
    ]
  };

  const handleOptionClick = (opt: any) => {
    if (opt.id === 'ai-bot') {
      if (onOpenAIAssistant) {
        onOpenAIAssistant();
      } else {
        setSelectedAgent('booking_react');
      }
      setIsOpen(false);
    } else if (opt.id === 'scan-qr') {
      setIsScanning(true);
      setIsOpen(false);
    } else if (opt.id === 'generate-qr') {
      setIsGeneratingQR(true);
      setIsOpen(false);
    } else if (opt.id === 'tours' || opt.id === 'itinerary' || opt.id === 'info') {
      if (opt.id === 'tours') setSelectedAgent('concierge');
      if (opt.id === 'itinerary') setSelectedAgent('booking_react');
      if (opt.id === 'info') setSelectedAgent('concierge');
      
      const queryText = opt.msg || (opt.id === 'tours' ? 'Recomiéndame los mejores tours en Costa Rica' : 'Quiero planear mi itinerario');
      setChatInput(queryText);
      setTimeout(() => {
        const form = document.getElementById('chat-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }, 50);
    } else {
      const text = encodeURIComponent(opt.msg);
      const whatsappUrl = `https://wa.me/50687959148?text=${text}`;
      
      if (opt.msg) {
        setChatHistory(prev => {
          const newHistory = [...prev, { role: 'user' as const, text: opt.msg }];
          return newHistory.slice(-50);
        });
      }

      window.open(whatsappUrl, '_blank');
      setIsOpen(false);
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
    setChatInput('');
    try {
      localStorage.removeItem('whatsapp_chat_history');
      localStorage.removeItem('whatsapp_chat_input_draft');
    } catch (e) {
      console.warn('Error clearing chat history or draft:', e);
    }
  };

  const handleQuickAction = (action: string, data?: any) => {
    if (action === 'direct_whatsapp') {
      const text = encodeURIComponent(language === 'es' ? 'Hola, necesito asistencia con tours en Costa Rica.' : 'Hello, I need assistance with tours in Costa Rica.');
      window.open(`https://wa.me/50687959148?text=${text}`, '_blank');
      setIsOpen(false);
    } else if (action === 'send_message') {
      setChatInput(data.message);
      setTimeout(() => {
        const form = document.getElementById('chat-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }, 50);
    } else if (action === 'book') {
      setChatInput(language === 'es' ? 'Quiero reservar este tour' : 'I want to book this tour');
      setTimeout(() => {
        const form = document.getElementById('chat-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }, 50);
    } else if (action === 'check_availability') {
      setChatInput(language === 'es' ? 'Verificar disponibilidad de fechas' : 'Check date availability');
      setTimeout(() => {
        const form = document.getElementById('chat-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }, 50);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    }
    if (!chatInput.trim() || isSendingToWebhook) return;
    
    const msg = chatInput.trim();

    if (!isOnline) {
      setOfflineAttemptNotice(true);
      setChatHistory(prev => {
        const newHistory = [
          ...prev, 
          { role: 'user' as const, text: msg },
          { 
            role: 'bot' as const, 
            text: language === 'es'
              ? '⚠️ [Modo Offline] Mensaje registrado en tu historial. Al no contar con conexión a Internet activa, se enviará en cuanto se restablezca la red.'
              : '⚠️ [Offline Mode] Message recorded. As there is no active Internet connection, it will be sent once the network is restored.'
          }
        ];
        return newHistory.slice(-50);
      });
      setChatInput('');
      try {
        localStorage.removeItem('whatsapp_chat_input_draft');
      } catch {}
      return;
    }

    setChatHistory(prev => {
      const newHistory = [...prev, { role: 'user' as const, text: msg }];
      return newHistory.slice(-50);
    });
    
    setChatInput('');
    try {
      localStorage.removeItem('whatsapp_chat_input_draft');
    } catch {}
    setIsSendingToWebhook(true);

    try {
      // 1. Obtener o inicializar ID de usuario persistente
      let userId = '';
      try {
        userId = localStorage.getItem('crt_user_id') || '';
        if (!userId) {
          userId = 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
          localStorage.setItem('crt_user_id', userId);
        }
      } catch {
        userId = 'usr_guest_' + Date.now();
      }

      const formattedHistory = chatHistory.map(h => ({ role: h.role, text: h.text }));
      let finalBotReply = '';
      let quickActions: Array<{ label: string; action: string; data?: any }> = [];

      // 2. Ejecución con Servidor Full-Stack (/api/chat/inquiry)
      try {
        const serverChatRes = await fetch('/api/chat/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg,
            language,
            history: formattedHistory,
            agentId: selectedAgent,
            engine: 'auto',
            context: {
              source: 'floating_whatsapp_ai',
              agentId: selectedAgent,
              userId,
              horaLocal: new Date().toISOString()
            }
          })
        });

        if (serverChatRes.ok) {
          const serverData = await serverChatRes.json();
          if (serverData.reply) {
            finalBotReply = serverData.reply;
            quickActions = serverData.quickActions || [];
          }
        }
      } catch (err) {
        console.warn('⚠️ Fallback a motor de IA nativo y procesador local:', err);
      }

      // 3. El backend nativo registra y procesa el evento de IA; no se usan orquestadores externos.\n\n      // 4. Si el backend aún no generó respuesta (modo fallback o contingencia)
      if (!finalBotReply) {
        try {
          const triageRes = await fetch('/api/agents/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawMessage: msg })
          });
          if (triageRes.ok) {
            const triageData = await triageRes.json();
            const procRes = await fetch('/api/agents/processor', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rawMessage: msg, intent: triageData.intent, extractedData: triageData.extractedData })
            });
            if (procRes.ok) {
              const procData = await procRes.json();
              if (procData.draftResponse) {
                finalBotReply = procData.draftResponse;
              }
            }
          }
        } catch {
          // Fallback silencioso
        }
      }

      if (!finalBotReply) {
        finalBotReply = language === 'es'
          ? `🇨🇷 **¡Pura Vida!** Recibimos tu consulta sobre tours y reservas en Costa Rica. Nuestros agentes inteligentes y asesores oficiales están a tu servicio.\n\n• **Disponibilidad**: Procesamiento en tiempo real con operadores locales certificados.\n• **Soporte Directo**: Puedes escribirnos de inmediato a nuestro WhatsApp oficial (+506 8795-9148).\n\n¿Deseas que te ayude a verificar fechas o cotizar alguna excursión específica?`
          : `🇨🇷 **¡Pura Vida!** We received your inquiry regarding tours and bookings in Costa Rica. Our smart agents and certified advisors are at your service.\n\n• **Availability**: Real-time processing with verified local operators.\n• **Direct Support**: You can chat directly via our official WhatsApp (+506 8795-9148).\n\nWould you like me to help check dates or quote a specific excursion?`;
      }

      if (quickActions.length === 0) {
        quickActions = [
          {
            label: language === 'es' ? '📅 Verificar Disponibilidad' : '📅 Check Availability',
            action: 'check_availability'
          },
          {
            label: language === 'es' ? '💬 WhatsApp Directo' : '💬 Direct WhatsApp',
            action: 'direct_whatsapp'
          }
        ];
      }

      playNotification();

      setChatHistory(prev => {
        const newHistory = [...prev, { role: 'bot' as const, text: finalBotReply, quickActions }];
        return newHistory.slice(-50);
      });

    } catch (unexpectedError) {
      console.error('[Trigger CONSULTA_CHAT_IA] Error fatal:', unexpectedError);
      const errText = unexpectedError instanceof Error ? unexpectedError.message : 'Error inesperado';
      setChatHistory(prev => {
        const newHistory = [
          ...prev,
          {
            role: 'bot' as const,
            text: language === 'es'
              ? `⚠️ Ocurrió una intermitencia (${errText}). Puedes escribirnos directamente a WhatsApp para atención inmediata.`
              : `⚠️ An issue occurred (${errText}). You can contact us directly on WhatsApp for immediate support.`,
            quickActions: [
              {
                label: language === 'es' ? '💬 WhatsApp Directo' : '💬 Direct WhatsApp',
                action: 'direct_whatsapp'
              }
            ]
          }
        ];
        return newHistory.slice(-50);
      });
    } finally {
      setIsSendingToWebhook(false);
    }
  };

  const themeClasses = THEMES.emerald;
  const _ignore = {
    button: 'bg-[#25D366] hover:bg-[#20bd5a] shadow-[0_0_20px_rgba(37,211,102,0.4)]',
    header: 'bg-[#1E7B4A]',
    badge: 'bg-[#E67E22] text-white',
    hoverBorder: 'hover:border-[#1E7B4A]',
    iconBg: 'bg-stone-50 group-hover:bg-stone-100',
    ping: 'bg-[#25D366]'
  };

  return (
    <div className="floating-whatsapp-container fixed bottom-[calc(4.8rem+env(safe-area-inset-bottom))] right-3 sm:right-4 lg:bottom-6 lg:right-6 z-[80] flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.8, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, y: 0, scale: 1, transformOrigin: "bottom right" }}
            exit={{ opacity: 0, y: 30, scale: 0.9, transformOrigin: "bottom right" }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25,
              mass: 0.8 
            }}
            className="whatsapp-modal-window pointer-events-auto bg-[#07241a]/95 backdrop-blur-2xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] border border-emerald-500/30 overflow-hidden w-[90vw] max-w-[400px] sm:w-80 flex flex-col max-h-[calc(100vh-100px)] sm:max-h-[calc(100vh-120px)] text-stone-100"
          >
            {/* Header */}
            <div className={`${themeClasses.header}/90 backdrop-blur-md p-3 sm:p-4 flex items-center justify-between text-white transition-colors duration-300 border-b border-black/10 shrink-0`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full transition-colors duration-300 ${isOnline ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]' : 'bg-rose-500 animate-pulse'}`}></span>
                </div>
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-1.5">
                    {t.title}
                    <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      IA + DB 2026
                    </span>
                    {!isOnline && (
                      <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                        Offline
                      </span>
                    )}
                  </h4>
                  <p className={`text-xs flex items-center gap-1 ${isOnline ? "text-amber-100" : "text-rose-200 font-semibold"} transition-colors duration-300`}>
                    {isOnline ? <Wifi className="w-3 h-3 text-teal-300 inline" /> : <WifiOff className="w-3 h-3 text-rose-300 inline" />}
                    {t.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleClearChat}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title={language === 'es' ? 'Limpiar historial' : 'Clear history'}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title={isMuted ? "Unmute sounds" : "Mute sounds"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Agent Selector Bar */}
            <div className="bg-[#03150f] px-3 py-2 border-b border-emerald-500/20 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                <Bot className="w-3 h-3 text-emerald-400" />
                {language === 'es' ? 'Agente:' : 'Agent:'}
              </span>
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id as any)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                    selectedAgent === agent.id
                      ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-950 border border-emerald-400/40 scale-105'
                      : 'bg-emerald-950/60 text-emerald-300/80 hover:bg-emerald-900/60 hover:text-emerald-100 border border-emerald-800/40'
                  }`}
                  title={agent.role}
                >
                  <span>{agent.name}</span>
                </button>
              ))}
            </div>

            {/* Offline Connectivity Warning Banner */}
            {!isOnline && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-orange-500 text-amber-950 px-3.5 py-2 text-xs font-bold flex items-center gap-2.5 border-b border-amber-600/30 shadow-inner shrink-0"
              >
                <div className="w-6 h-6 rounded-full bg-amber-600/30 flex items-center justify-center shrink-0">
                  <WifiOff className="w-3.5 h-3.5 text-amber-950 animate-pulse" />
                </div>
                <div className="flex-1 leading-tight text-[11px]">
                  <span className="font-extrabold uppercase block text-[10px] tracking-wider text-amber-900">
                    {language === 'es' ? 'Sin Conexión a Internet' : 'No Internet Connection'}
                  </span>
                  {language === 'es' 
                    ? 'Verifica tu WiFi o datos móviles. Podés redactar tu consulta y enviarla apenas vuelva la señal.'
                    : 'Check your WiFi or mobile data. You can draft your message and send once signal returns.'}
                </div>
              </motion.div>
            )}

            {/* Restored Connection Toast */}
            {showReconnectedAlert && isOnline && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-teal-600 text-white px-3.5 py-2 text-xs font-bold flex items-center gap-2 border-b border-teal-700 shadow-inner shrink-0"
              >
                <Wifi className="w-4 h-4 text-stone-800 shrink-0 animate-bounce" />
                <span className="leading-tight text-[11px]">
                  {language === 'es' 
                    ? '🟢 ¡Conexión restablecida! Estás en línea. Pura vida.'
                    : '🟢 Connection restored! You are back online. Pura vida.'}
                </span>
              </motion.div>
            )}

            <BookingProgressIndicator status={bookingStatus} language={language} />
                        {/* Chat Body */}

            <div className="p-3 sm:p-4 bg-[#041710]/95 flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 pb-2 scrollbar-thin scrollbar-thumb-neutral-200">
                <div className="bg-[#082a1e] backdrop-blur-md p-3 rounded-2xl rounded-tl-sm shadow-sm border border-emerald-500/30 mb-4 inline-block max-w-[90%]">
                  <p className="text-sm text-emerald-100 font-medium whitespace-pre-wrap">{t.prompt}<MessageStatus isBot={true} /></p>
                </div>

                {chatHistory.map((msg, idx) => {
                  const mentionedTours = getMentionedTours(msg.text, TOURS);
                  return (
                    <div key={idx} className={`mb-3 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      
                      <div className={`p-3 rounded-2xl max-w-[90%] shadow-sm text-sm font-medium ${msg.role === 'user' ? themeClasses.button + ' text-white rounded-tr-sm' : 'bg-[#082a1e] backdrop-blur-md text-emerald-100 border border-emerald-500/30 rounded-tl-sm'}`}>
                        <span className="whitespace-pre-wrap">{msg.text}</span>
                        <MessageStatus isBot={msg.role === 'bot'} />
                      </div>
                      {msg.quickActions && msg.quickActions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 ml-1">
                          {msg.quickActions.map((qa, qaid) => (
                            <button 
                              key={qaid}
                              onClick={() => handleQuickAction(qa.action, qa.data)}
                              className={`text-xs font-bold px-4 py-2 rounded-full shadow-md ${themeClasses.button} text-white transition-all transform hover:scale-105 active:scale-95 duration-200 flex-1 text-center`}
                            >
                              {qa.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {mentionedTours.length > 0 && (
                        <div className="mt-1 flex flex-col gap-2">
                          {mentionedTours.map(t => (
                            <ChatMiniCard 
                              key={t.id} 
                              tour={t} 
                              language={language} 
                              onSelectTour={(t) => {
                                if (onSelectTour) {
                                  onSelectTour(t);
                                  setIsOpen(false);
                                }
                              }} 
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}


              <div className="space-y-2 mt-2">
                {t.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionClick(opt)}
                    className={`w-full flex items-center justify-between p-3 bg-[#08261b] backdrop-blur-sm rounded-xl shadow-sm border border-emerald-500/25 ${themeClasses.hoverBorder} hover:bg-[#0c3526] hover:shadow-md transition-all group text-left`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`${themeClasses.iconBg} p-2 rounded-lg transition-colors`}>
                        {opt.icon}
                      </div>
                      <span className="text-sm font-semibold text-emerald-100">{opt.text}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-stone-600 group-hover:text-orange-500 group-hover:translate-x-1 transition-all`} />
                  </button>
                ))}
              </div>
              
              {recentScans.length > 0 && (
                <div className="mt-4 border-t border-neutral-200 pt-3">
                  <p className="text-xs font-bold text-neutral-500 uppercase mb-2">
                    {language === 'es' ? 'Escaneos Recientes' : 'Recent Scans'}
                  </p>
                  <div className="space-y-2">
                    {recentScans.map((scan, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          let possibleId = scan;
                          try {
                            const url = new URL(scan);
                            const parts = url.pathname.split('/').filter(Boolean);
                            if (parts.length > 0) {
                              possibleId = parts[parts.length - 1];
                            }
                          } catch(e) {}
                          
                          const found = TOURS.find(t => t.id === possibleId || scan.includes(t.id));
                          if (found && onSelectTour) {
                             onSelectTour(found);
                             setIsOpen(false);
                             setIsScanning(false);
                          } else {
                            try {
                              const url = new URL(scan);
                              if (url.protocol === 'http:' || url.protocol === 'https:') {
                                window.location.href = url.href;
                              }
                            } catch (e) {}
                          }
                        }}
                        className={`w-full flex items-center gap-2 p-2 bg-white/50 backdrop-blur-sm rounded-lg border border-neutral-200 hover:bg-white hover:border-orange-300 transition-all text-left group`}
                      >
                        <QrCode className="w-4 h-4 text-stone-600 group-hover:text-orange-500 shrink-0" />
                        <span className="text-xs text-neutral-600 truncate">{scan}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              </div>
              
              {showTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-2 ml-2"
                >
                  <div className="bg-white/80 backdrop-blur-md px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm border border-neutral-200/60 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-xs text-neutral-500 font-medium">{language === 'es' ? 'Escribiendo mae...' : 'Typing...'}</span>
                </motion.div>
              )}

              {/* Draft Autosave indicator & Whisper Mode toggle */}
              <div className="flex items-center justify-between px-2 pt-1 pb-0.5 text-[10px] select-none">
                {chatInput.trim().length > 0 ? (
                  <div className="flex items-center gap-1 text-emerald-400/80 font-medium">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{language === 'es' ? 'Borrador autoguardado' : 'Draft autosaved'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setChatInput('');
                        try {
                          localStorage.removeItem('whatsapp_chat_input_draft');
                        } catch {}
                      }}
                      className="text-stone-400 hover:text-rose-400 ml-1 transition-colors cursor-pointer text-[10px] underline decoration-stone-500/40"
                      title={language === 'es' ? 'Descartar borrador' : 'Discard draft'}
                    >
                      {language === 'es' ? 'Descartar' : 'Discard'}
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-300/50 flex items-center gap-1">
                    <Volume1 className="w-2.5 h-2.5 opacity-60" />
                    <span>{language === 'es' ? 'Dictado por voz disponible' : 'Voice dictation available'}</span>
                  </div>
                )}

                {/* Whisper Mode Toggle Button */}
                <button
                  type="button"
                  id="whatsapp-whisper-mode-toggle"
                  onClick={() => toggleWhisperMode()}
                  title={
                    isWhisperMode
                      ? (language === 'es'
                          ? 'Modo Susurro ACTIVADO: Alta sensibilidad de cercanía (+350%) y tolerancia fonética para hablar en voz baja en lugares públicos. Clic para desactivar.'
                          : 'Whisper Mode ACTIVE: High proximity sensitivity (+350%) and phonetic tolerance for speaking softly in public. Click to disable.')
                      : (language === 'es'
                          ? 'Modo Susurro DESACTIVADO: Clic para activar modo de alta sensibilidad para lugares públicos o silenciosos.'
                          : 'Whisper Mode OFF: Click to enable high-sensitivity mode for quiet or public places.')
                  }
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all cursor-pointer border ${
                    isWhisperMode
                      ? 'bg-violet-950/90 border-violet-400/60 text-violet-200 shadow-sm shadow-violet-900/40'
                      : 'bg-emerald-950/50 border-emerald-500/20 text-emerald-300/70 hover:text-emerald-100 hover:border-emerald-500/40'
                  }`}
                >
                  <Ear className={`w-3 h-3 ${isWhisperMode ? 'text-violet-300' : 'text-emerald-400/70'}`} />
                  <span>{language === 'es' ? 'Modo Susurro' : 'Whisper Mode'}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isWhisperMode ? 'bg-violet-400 shadow-[0_0_6px_#a78bfa] animate-pulse' : 'bg-emerald-800'
                    }`}
                  />
                </button>
              </div>

              {/* Voice-to-text recording active or error notice */}
              <AnimatePresence>
                {isListening && (
                  isWhisperMode ? (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="flex flex-col gap-1.5 px-3 py-2 bg-violet-950/90 border border-violet-500/50 rounded-xl text-violet-200 text-xs shadow-md mt-1 select-none"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500"></span>
                          </span>
                          <span className="font-semibold text-[11px] text-violet-100 flex items-center gap-1.5">
                            <span>🤫 {language === 'es' ? 'Modo Susurro Activo' : 'Whisper Mode Active'}</span>
                            <span className="text-[9px] bg-violet-800/90 px-1.5 py-0.5 rounded text-violet-200 font-medium">
                              {language === 'es' ? 'Alta Sensibilidad' : 'High Sensitivity'}
                            </span>
                          </span>
                        </div>

                        {/* Real-time audio sensitivity equalizer bars */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-0.5 h-3.5 px-1 py-0.5 bg-violet-900/40 rounded border border-violet-700/40" title={language === 'es' ? 'Nivel de sensibilidad de audio' : 'Audio sensitivity level'}>
                            {[10, 25, 40, 55, 75].map((threshold, idx) => (
                              <span
                                key={idx}
                                className={`w-0.5 rounded-full transition-all duration-75 ${
                                  audioLevel >= threshold
                                    ? 'bg-violet-300 h-3 shadow-[0_0_4px_#c4b5fd]'
                                    : 'bg-violet-950 h-1'
                                }`}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={stopListening}
                            className="px-2 py-0.5 text-[10px] font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-md transition-colors shrink-0 shadow-sm cursor-pointer"
                          >
                            {language === 'es' ? 'Listo' : 'Done'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-violet-300/80 px-0.5">
                        <span className="truncate italic">
                          {interimTranscript
                            ? `"${interimTranscript}"`
                            : (language === 'es' ? 'Susurra cerca del micrófono. Ajustado para lugares públicos.' : 'Whisper close to mic. Tuned for quiet public spaces.')}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleWhisperMode(false)}
                          className="text-violet-400 hover:text-white underline ml-2 shrink-0 cursor-pointer text-[10px]"
                          title={language === 'es' ? 'Cambiar a modo de voz normal' : 'Switch to normal voice mode'}
                        >
                          {language === 'es' ? 'Modo normal' : 'Normal mode'}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-200 text-xs shadow-inner mt-1 select-none"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                        </span>
                        <span className="font-medium text-[11px] truncate text-rose-100">
                          {interimTranscript
                            ? `"${interimTranscript}"`
                            : (language === 'es' ? '🎙️ Escuchando... Di tu consulta sobre tours o reservas' : '🎙️ Listening hands-free... Speak your query')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleWhisperMode(true)}
                          className="px-1.5 py-0.5 text-[10px] bg-stone-900/80 hover:bg-stone-800 text-violet-300 rounded border border-violet-500/40 transition-colors cursor-pointer flex items-center gap-1"
                          title={language === 'es' ? '¿En lugar público? Activa el modo susurro de alta sensibilidad' : 'In public? Enable high-sensitivity whisper mode'}
                        >
                          <span>🤫</span>
                          <span>{language === 'es' ? 'Susurro' : 'Whisper'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopListening}
                          className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-md transition-colors shrink-0 shadow-sm cursor-pointer"
                        >
                          {language === 'es' ? 'Listo' : 'Done'}
                        </button>
                      </div>
                    </motion.div>
                  )
                )}

                {voiceNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="p-2.5 bg-amber-950/90 border border-amber-500/40 rounded-xl text-amber-200 text-xs shadow-md mt-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-200 text-[11px]">{voiceNotice.title}</p>
                          <p className="text-amber-200/80 text-[10px] leading-relaxed mt-0.5">{voiceNotice.description}</p>
                          {voiceNotice.guideUrl && (
                            <a
                              href={voiceNotice.guideUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 hover:text-amber-100 hover:underline mt-1.5 transition-colors"
                            >
                              <span>{voiceNotice.guideLabel || (language === 'es' ? 'Cómo activar el micrófono' : 'How to enable microphone')}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVoiceNotice(null)}
                        className="text-amber-400 hover:text-white p-0.5 text-xs font-bold cursor-pointer shrink-0 rounded transition-colors"
                        title={language === 'es' ? 'Cerrar aviso' : 'Dismiss notice'}
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Input */}
              <form id="chat-form" onSubmit={handleSendMessage} className="mt-2 flex gap-2 shrink-0 items-center">
                <div className="relative flex-1 flex items-center">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      isListening
                        ? isWhisperMode
                          ? (language === 'es' ? '🤫 Susurrando... Escuchando de cerca' : '🤫 Whispering... Listening closely')
                          : (language === 'es' ? 'Escuchando tu voz...' : 'Listening to your voice...')
                        : isWhisperMode
                          ? (language === 'es' ? '🤫 Escribe o susurra de cerca...' : '🤫 Type or whisper closely...')
                          : (language === 'es' ? 'Escribe o dicta tu consulta...' : 'Type or dictate your query...')
                    }
                    className={`w-full bg-emerald-950/80 text-white placeholder-emerald-200/50 border rounded-full pl-4 pr-11 py-2 text-sm focus:outline-none transition-all ${
                      isWhisperMode
                        ? 'border-violet-500/40 focus:border-violet-400 focus:ring-1 focus:ring-violet-400'
                        : 'border-emerald-500/30 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                    }`}
                  />
                  
                  {/* Voice-to-text recording button inside the chat input area */}
                  <button
                    type="button"
                    id="whatsapp-voice-record-btn"
                    onClick={toggleListening}
                    aria-label={
                      isListening
                        ? (language === 'es' ? 'Detener dictado por voz' : 'Stop voice dictation')
                        : isWhisperMode
                          ? (language === 'es' ? 'Dictar en modo susurro' : 'Dictate in whisper mode')
                          : (language === 'es' ? 'Dictar consulta por voz' : 'Dictate query by voice')
                    }
                    title={
                      isListening
                        ? (language === 'es' ? 'Detener dictado por voz' : 'Stop voice dictation')
                        : isWhisperMode
                          ? (language === 'es' ? 'Dictar en Modo Susurro (alta sensibilidad para lugares públicos)' : 'Dictate in Whisper Mode (high sensitivity for public places)')
                          : (language === 'es' ? 'Dictar por voz (manos libres)' : 'Dictate by voice (hands-free)')
                    }
                    className={`absolute right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isListening
                        ? isWhisperMode
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/50 scale-105 animate-pulse'
                          : 'bg-rose-500 text-white shadow-lg shadow-rose-500/50 scale-105 animate-pulse'
                        : isWhisperMode
                          ? 'text-violet-300 hover:text-white hover:bg-violet-900/60 active:scale-95'
                          : 'text-emerald-400 hover:text-white hover:bg-emerald-800/60 active:scale-95'
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-[#25D366] text-white p-2 rounded-full hover:bg-[#20bd5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10 shrink-0 shadow-sm cursor-pointer"
                  title={language === 'es' ? 'Enviar mensaje' : 'Send message'}
                >
                  {isSendingToWebhook ? <Sparkles className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5 ml-0.5" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="bg-[#062017] border border-emerald-500/30 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] text-stone-100 relative">
              <div className="p-5 bg-gradient-to-r from-teal-600 to-teal-600 flex items-center justify-between text-white shadow-md">
                <div className="flex items-center gap-3">
                  <QrCode className="w-6 h-6 text-stone-900" />
                  <h3 className="font-black text-lg uppercase tracking-wide">
                    {language === 'es' ? 'Escanear Código' : 'Scan Code'}
                  </h3>
                </div>
                <button onClick={() => setIsScanning(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 relative bg-white/20">
                {scanResult ? (
                  <div className="text-center py-8 space-y-4 animate-fade-in">
                    <CheckCircle2 className="w-20 h-20 text-orange-500 mx-auto glow-orange" />
                    <h4 className="text-2xl font-black text-white uppercase tracking-tight">
                      {language === 'es' ? '¡Código Escaneado!' : 'Code Scanned!'}
                    </h4>
                    <div className="bg-black/60 p-4 rounded-2xl border border-black/10 break-all">
                      <p className="text-orange-400 font-mono text-sm">
                        {scanResult}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setScanResult(null);
                        setIsScanning(false);
                      }}
                      className="mt-6 w-full bg-orange-500 hover:bg-teal-600 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest shadow-lg hover:scale-[1.02]"
                    >
                      {language === 'es' ? 'Continuar' : 'Continue'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-3xl overflow-hidden border-2 border-orange-500/50 relative bg-black aspect-square shadow-inner group">
                    <Scanner
                      onScan={(result: any) => {
                        if (result) {
                          if (Array.isArray(result) && result.length > 0) {
                            setScanResult(result[0].rawValue || result[0].text);
                          } else if (result.text || result.rawValue) {
                            setScanResult(result.rawValue || result.text);
                          } else if (typeof result === 'string') {
                            setScanResult(result);
                          }
                        }
                      }}
                      onError={(error: any) => console.log(error)}
                    />
                    {/* Scanning overlay animation */}
                    <div className="absolute inset-0 border-[4px] border-orange-500/50 rounded-3xl pointer-events-none z-10"></div>
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-orange-400 shadow-[0_0_20px_4px_rgba(52,211,153,0.8)] animate-scan pointer-events-none z-20"></div>
                    <div className="absolute inset-0 bg-orange-500/10 pointer-events-none z-0"></div>
                    
                    <div className="absolute bottom-4 left-0 right-0 text-center z-20">
                      <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full border border-black/10">
                        {language === 'es' ? 'Apunta la cámara al código QR' : 'Point camera at QR code'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Predictive Search Fallback */}
                  <div className="mt-4 border-t border-orange-500/20 pt-4">
                    <p className="text-xs text-stone-600 mb-2 font-medium uppercase tracking-wider text-center">
                      {language === 'es' ? '¿Código dañado? Busca por nombre:' : 'Damaged code? Search by name:'}
                    </p>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={language === 'es' ? 'Buscar tour...' : 'Search tour...'}
                      className="w-full bg-black/40 border border-orange-500/30 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors placeholder:text-neutral-500"
                    />
                    {searchQuery.trim().length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-black/60 border border-orange-500/20 hide-scrollbar flex flex-col gap-1 p-1">
                        {TOURS.filter(t => 
                           getLangText(t.title, language).toLowerCase().includes(searchQuery.toLowerCase())
                        ).map(t => (
                           <button
                             key={t.id}
                             onClick={() => {
                               if (onSelectTour) onSelectTour(t);
                               setIsOpen(false);
                               setIsScanning(false);
                               setSearchQuery('');
                             }}
                             className="w-full text-left px-3 py-2 hover:bg-teal-600/40 rounded-lg text-sm text-stone-800 transition-colors line-clamp-1"
                           >
                             {getLangText(t.title, language)}
                           </button>
                        ))}
                        {TOURS.filter(t => 
                           getLangText(t.title, language).toLowerCase().includes(searchQuery.toLowerCase())
                        ).length === 0 && (
                           <div className="p-2 text-xs text-center text-neutral-500">
                             {language === 'es' ? 'No se encontraron tours.' : 'No tours found.'}
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      
      {/* Floating WhatsApp and Autonomous AI Trigger Button */}
      <div className="flex flex-col items-center gap-3 pointer-events-auto relative">
        <div className="relative group">
          {/* Animated Glow Aura */}
          <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-300"></div>

          {needsAttention && !isOpen && (
            <div className={`absolute inset-0 ${themeClasses.ping} rounded-full animate-ping opacity-50 transition-colors duration-300`}></div>
          )}

          <button
            id="floating-whatsapp-trigger-btn"
            onClick={() => {
              setIsOpen(!isOpen);
              setNeedsAttention(false);
            }}
            aria-label={isOpen ? 'Cerrar asistente y chat de WhatsApp' : 'Abrir asistente de IA y reservas WhatsApp Costa Rica Tours'}
            title={language === 'es' ? 'Asistente Inteligente y Reservas WhatsApp Costa Rica Tours 2026' : 'AI Assistant & WhatsApp Bookings Costa Rica Tours 2026'}
            className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer ${
              isOpen
                ? 'bg-stone-100 text-stone-900 hover:scale-105 border-2 border-emerald-500/50'
                : `${themeClasses.button} text-white hover:scale-110 active:scale-95 border-2 border-white/40`
            } ${needsAttention && !isOpen ? 'animate-pulse' : ''}`}
          >
            {isOpen ? (
              <X className="w-8 h-8 transition-transform duration-200" />
            ) : (
              <div className="relative flex items-center justify-center">
                <MessageCircle className="w-9 h-9 fill-white/20 stroke-white transition-transform duration-200 group-hover:scale-105" />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-sm animate-pulse"></span>
              </div>
            )}
            
            {!isOpen && (
              <span className={`absolute -top-2.5 -right-2 bg-gradient-to-r from-amber-500 to-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-lg border-2 border-white whitespace-nowrap animate-bounce transition-colors duration-300 flex items-center gap-1`}>
                <Sparkles className="w-2.5 h-2.5 text-amber-200" />
                {badgeText}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


export default FloatingWhatsApp;
