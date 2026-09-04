import React, { useState, useEffect } from 'react';
import { MessageCircle, X, ChevronRight, Info, Map, Calendar, MessageSquare, Palette, Bot, QrCode, CheckCircle2, CheckCheck, Volume2, VolumeX, Share2, Download, Trash2, Sparkles, Leaf, Clock, AlertTriangle, AlertCircle, CalendarCheck, CalendarX, XCircle, Wifi, WifiOff } from 'lucide-react';
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
      {!isBot && <CheckCheck className={`w-3.5 h-3.5 leading-none ${isRead ? 'text-[#34B7F1]' : 'text-neutral-400'}`} />}
      {isBot && <CheckCheck className={`w-3.5 h-3.5 leading-none ${isRead ? 'text-[#34B7F1]' : 'text-neutral-400'}`} />}
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

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ language, initialMessage, onOpenAIAssistant, onSelectTour }) => {
  const { tours: TOURS } = useTours();
  const [isOpen, setIsOpen] = useState(false);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [badgeText, setBadgeText] = useState(language === 'es' ? '¡Chiva!' : 'New');
  const [theme, setTheme] = useState<'emerald' | 'teal'>('emerald');
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

  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot', text: string }[]>(() => {
    try {
      const saved = localStorage.getItem('whatsapp_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

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

  const [chatInput, setChatInput] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [isSendingToWebhook, setIsSendingToWebhook] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<"none" | "pending" | "payment_required" | "confirmed">("none");

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
        icon: <Map className={`w-5 h-5 ${theme === 'teal' ? 'text-orange-500' : 'text-orange-500'}`} />,
        text: language === 'es' ? 'Recomendación de Tours' : 'Tour Recommendations',
        msg: generateCustomGreeting('Necesito recomendaciones de tours en Costa Rica.', 'I need tour recommendations in Costa Rica.')
      },
      {
        id: 'itinerary',
        icon: <Calendar className={`w-5 h-5 ${theme === 'teal' ? 'text-orange-500' : 'text-orange-500'}`} />,
        text: language === 'es' ? 'Planear Itinerario' : 'Plan Itinerary',
        msg: generateCustomGreeting('Quiero ayuda para armar mi itinerario de viaje.', 'I want help planning my travel itinerary.')
      },
      {
        id: 'info',
        icon: <Info className={`w-5 h-5 ${theme === 'teal' ? 'text-orange-500' : 'text-orange-500'}`} />,
        text: language === 'es' ? 'Dudas y Consultas' : 'Questions & Doubts',
        msg: generateCustomGreeting('Tengo algunas dudas generales sobre viajar a Costa Rica.', 'I have some general questions about traveling to Costa Rica.')
      },
      {
        id: 'custom',
        icon: <MessageSquare className={`w-5 h-5 ${theme === 'teal' ? 'text-orange-500' : 'text-orange-500'}`} />,
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
      if (onOpenAIAssistant) onOpenAIAssistant();
      setIsOpen(false);
    } else if (opt.id === 'scan-qr') {
      setIsScanning(true);
      setIsOpen(false);
    } else if (opt.id === 'generate-qr') {
      setIsGeneratingQR(true);
      setIsOpen(false);
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
    localStorage.removeItem('whatsapp_chat_history');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
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
      return;
    }

    setChatHistory(prev => {
      const newHistory = [...prev, { role: 'user' as const, text: msg }];
      return newHistory.slice(-50);
    });
    
    setChatInput('');
    setIsSendingToWebhook(true);

    try {
      const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://tu-n8n.com/webhook/whatsapp-chat';
      const n8nApiKey = import.meta.env.VITE_N8N_API_KEY;
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (n8nApiKey) {
        // Secure API Key authentication for n8n Webhook validation
        headers['Authorization'] = `Bearer ${n8nApiKey}`;
        // Alternatively, use a custom header if configured in n8n
        // headers['X-N8N-API-KEY'] = n8nApiKey;
      }
      
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
           message: msg, 
           language,
           source: 'website_chat',
           timestamp: new Date().toISOString()
        })
      });

      if (!response.ok && n8nWebhookUrl.includes('tu-n8n.com')) {
         throw new Error("Simulated Webhook");
      }
      
      const data = await response.json().catch(() => ({}));
      
      setChatHistory(prev => {
        const replyText = data.reply || (language === 'es' ? '🤖 ¡Mensaje recibido! Nuestro agente n8n lo está procesando...' : '🤖 Message received! Our n8n agent is processing it...');
        const newHistory = [...prev, { role: 'bot' as const, text: replyText }];
        return newHistory.slice(-50);
      });
      
    } catch (error) {
      // Fallback for simulation purposes: call our local agent Triage/Processor
      try {
        const triageRes = await fetch('/api/agents/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawMessage: msg })
        });
        const triageData = await triageRes.json();
        
        const procRes = await fetch('/api/agents/processor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawMessage: msg, intent: triageData.intent, extractedData: triageData.extractedData })
        });
        const procData = await procRes.json();

        // SIMULATION LOGIC FOR PROGRESS INDICATOR
        if (msg.toLowerCase().includes('reserv') || msg.toLowerCase().includes('book')) {
           setBookingStatus('pending');
           setTimeout(() => {
             setBookingStatus('payment_required');
             setChatHistory(prev => {
                const newHistory = [...prev, { role: 'bot' as const, text: language === 'es' ? '🔗 Aquí tienes tu enlace de pago seguro para confirmar el cupo. Expira en 15 minutos.' : '🔗 Here is your secure payment link to confirm the spot. It expires in 15 minutes.' }];
                return newHistory.slice(-50);
             });
           }, 5000);
        } else if ((msg.toLowerCase().includes('pag') || msg.toLowerCase().includes('paid') || msg.toLowerCase().includes('listo')) && bookingStatus === 'payment_required') {
           setBookingStatus('confirmed');
        }

        setChatHistory(prev => {
          let replyText = procData.draftResponse || (language === 'es' ? 'Mensaje procesado en backend.' : 'Message processed in backend.');
          
          if (bookingStatus === 'payment_required' && (msg.toLowerCase().includes('pag') || msg.toLowerCase().includes('paid') || msg.toLowerCase().includes('listo'))) {
             replyText = language === 'es' ? '✅ ¡Pago recibido! Tu reserva está 100% confirmada. Te hemos enviado el voucher por correo.' : '✅ Payment received! Your booking is 100% confirmed. We sent the voucher to your email.';
          }

          const newHistory = [...prev, { role: 'bot' as const, text: replyText }];
          return newHistory.slice(-50);
        });
      } catch (innerError) {
         setChatHistory(prev => {
            const newHistory = [...prev, { role: 'bot' as const, text: language === 'es' ? '⚠️ Error al contactar al Agente N8N o Backend.' : '⚠️ Error contacting N8N or Backend Agent.' }];
            return newHistory.slice(-50);
         });
      }
    } finally {
      setIsSendingToWebhook(false);
    }
  };

  const themeClasses = {
    button: 'bg-[#25D366] hover:bg-[#20bd5a] shadow-[0_0_20px_rgba(37,211,102,0.4)]',
    header: 'bg-[#1E7B4A]',
    badge: 'bg-[#E67E22] text-white',
    hoverBorder: 'hover:border-[#1E7B4A]',
    iconBg: 'bg-stone-50 group-hover:bg-stone-100',
    ping: 'bg-[#25D366]'
  };

  return (
    <div className="floating-whatsapp-container fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 xl:bottom-6 xl:right-6 z-[90] flex flex-col items-end gap-3 pointer-events-none">
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
            className="whatsapp-modal-window pointer-events-auto bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-neutral-200/50 overflow-hidden w-[90vw] max-w-[400px] sm:w-80 flex flex-col max-h-[calc(100vh-100px)] sm:max-h-[calc(100vh-120px)]"
          >
            {/* Header */}
            <div className={`${themeClasses.header}/90 backdrop-blur-md p-3 sm:p-4 flex items-center justify-between text-white transition-colors duration-300 border-b border-white/10 shrink-0`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full transition-colors duration-300 ${isOnline ? 'bg-teal-400' : 'bg-rose-500 animate-pulse'}`}></span>
                </div>
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-1.5">
                    {t.title}
                    {!isOnline && (
                      <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                        Offline
                      </span>
                    )}
                  </h4>
                  <p className={`text-xs flex items-center gap-1 ${isOnline ? (theme === 'teal' ? 'text-amber-100' : 'text-stone-100') : 'text-rose-200 font-semibold'} transition-colors duration-300`}>
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
                <Wifi className="w-4 h-4 text-stone-200 shrink-0 animate-bounce" />
                <span className="leading-tight text-[11px]">
                  {language === 'es' 
                    ? '🟢 ¡Conexión restablecida! Estás en línea. Pura vida.'
                    : '🟢 Connection restored! You are back online. Pura vida.'}
                </span>
              </motion.div>
            )}

            <BookingProgressIndicator status={bookingStatus} language={language} />
            {/* Chat Body */}
            <div className="p-3 sm:p-4 bg-neutral-50/40 flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 pb-2 scrollbar-thin scrollbar-thumb-neutral-200">
                <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl rounded-tl-sm shadow-sm border border-neutral-200/60 mb-4 inline-block max-w-[90%]">
                  <p className="text-sm text-neutral-800 font-medium whitespace-pre-wrap">{t.prompt}<MessageStatus isBot={true} /></p>
                </div>

                {chatHistory.map((msg, idx) => {
                  const mentionedTours = getMentionedTours(msg.text, TOURS);
                  return (
                    <div key={idx} className={`mb-3 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3 rounded-2xl max-w-[90%] shadow-sm text-sm font-medium ${msg.role === 'user' ? 'bg-[#25D366] text-white rounded-tr-sm' : 'bg-white/80 backdrop-blur-md text-neutral-800 border border-neutral-200/60 rounded-tl-sm'}`}>
                        <span className="whitespace-pre-wrap">{msg.text}</span>
                        <MessageStatus isBot={msg.role === 'bot'} />
                      </div>
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
                    className={`w-full flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-neutral-200/50 ${themeClasses.hoverBorder} hover:bg-white/90 hover:shadow-md transition-all group text-left`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`${themeClasses.iconBg} p-2 rounded-lg transition-colors`}>
                        {opt.icon}
                      </div>
                      <span className="text-sm font-semibold text-neutral-700">{opt.text}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-neutral-400 ${theme === 'teal' ? 'group-hover:text-orange-500' : 'group-hover:text-orange-500'} group-hover:translate-x-1 transition-all`} />
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
                        <QrCode className="w-4 h-4 text-neutral-400 group-hover:text-orange-500 shrink-0" />
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

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="mt-2 flex gap-2 shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={language === 'es' ? 'Mandá un mensaje mae...' : 'Type a message...'}
                  className="flex-1 bg-white border border-neutral-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] transition-shadow"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-[#25D366] text-white p-2 rounded-full hover:bg-[#20bd5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10 shrink-0 shadow-sm"
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
            <div className="bg-neutral-950 border border-orange-500/30 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.2)] relative">
              <div className="p-5 bg-gradient-to-r from-teal-600 to-teal-600 flex items-center justify-between text-white shadow-md">
                <div className="flex items-center gap-3">
                  <QrCode className="w-6 h-6 text-stone-100" />
                  <h3 className="font-black text-lg uppercase tracking-wide">
                    {language === 'es' ? 'Escanear Código' : 'Scan Code'}
                  </h3>
                </div>
                <button onClick={() => setIsScanning(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 relative bg-stone-950/20">
                {scanResult ? (
                  <div className="text-center py-8 space-y-4 animate-fade-in">
                    <CheckCircle2 className="w-20 h-20 text-orange-500 mx-auto glow-orange" />
                    <h4 className="text-2xl font-black text-white uppercase tracking-tight">
                      {language === 'es' ? '¡Código Escaneado!' : 'Code Scanned!'}
                    </h4>
                    <div className="bg-black/60 p-4 rounded-2xl border border-white/10 break-all">
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
                      <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full border border-white/10">
                        {language === 'es' ? 'Apunta la cámara al código QR' : 'Point camera at QR code'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Predictive Search Fallback */}
                  <div className="mt-4 border-t border-orange-500/20 pt-4">
                    <p className="text-xs text-neutral-400 mb-2 font-medium uppercase tracking-wider text-center">
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
                             className="w-full text-left px-3 py-2 hover:bg-teal-600/40 rounded-lg text-sm text-neutral-200 transition-colors line-clamp-1"
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

      <div className="flex flex-col items-center gap-3 pointer-events-auto">
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setTheme(theme === 'emerald' ? 'teal' : 'emerald')}
            className={`w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center transition-colors ${
              theme === 'teal' ? 'bg-teal-600 hover:bg-teal-600' : 'bg-orange-500 hover:bg-teal-600'
            }`}
            title={language === 'es' ? 'Cambiar Estilo' : 'Toggle Style'}
          >
            <Palette className="w-4 h-4 text-white" />
          </motion.button>
        )}

        <div className="relative">
          {needsAttention && !isOpen && (
            <div className={`absolute inset-0 ${themeClasses.ping} rounded-full animate-ping opacity-40 transition-colors duration-300`}></div>
          )}
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              setNeedsAttention(false);
            }}
            aria-label="Toggle WhatsApp Chat"
            className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              isOpen ? 'bg-stone-900 text-white hover:scale-105' : `${themeClasses.button} text-white hover:scale-110 active:scale-95`
            } ${needsAttention && !isOpen ? 'animate-pulse' : ''}`}
          >
            {isOpen ? <X className="w-8 h-8" /> : <MessageCircle className="w-9 h-9 fill-white/20 stroke-white" />}
            
            {!isOpen && (
              <span className={`absolute -top-2 -right-2 ${themeClasses.badge} text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border-2 border-white whitespace-nowrap animate-bounce transition-colors duration-300`}>
                {badgeText}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
