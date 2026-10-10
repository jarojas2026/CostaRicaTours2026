import { requestCustomerIntake } from '../utils/customerIntake';
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Check, ChevronRight, ChevronLeft, Sparkles, Send, Plane, Bus, 
  MapPin, Calendar, Users, Hotel, ShieldCheck, Compass, CheckCircle2,
  DollarSign, MessageCircle, Info, RefreshCw, Save, WifiOff, Trash2
} from 'lucide-react';
import { Language, Currency } from '../types';

const CUSTOM_FUNNEL_DRAFT_KEY = 'costa_rica_custom_funnel_draft';

const DESTINATION_OPTIONS = [
  { id: 'Arenal', es: 'Volcán Arenal & La Fortuna', en: 'Arenal Volcano & La Fortuna' },
  { id: 'Monteverde', es: 'Bosque Nuboso Monteverde', en: 'Monteverde Cloud Forest' },
  { id: 'Manuel Antonio', es: 'Manuel Antonio & Quepos', en: 'Manuel Antonio & Quepos' },
  { id: 'Guanacaste', es: 'Guanacaste & Tamarindo', en: 'Guanacaste & Tamarindo' },
  { id: 'Pacuare', es: 'Río Pacuare & Turrialba', en: 'Pacuare River & Turrialba' },
  { id: 'Caribe', es: 'Tortuguero & Caribe', en: 'Tortuguero & Caribbean' },
  { id: 'Pacífico Sur', es: 'Osa, Corcovado & Pacífico Sur', en: 'Osa, Corcovado & South Pacific' }
] as const;

const LEGACY_DESTINATION_ALIASES: Record<string, string> = {
  'Arenal Volcano & Thermal Springs': 'Arenal',
  'Volcán Arenal & Termales': 'Arenal',
  'Bosque Nuboso Monteverde': 'Monteverde',
  'Manuel Antonio National Park': 'Manuel Antonio',
  'Parque Nacional Manuel Antonio': 'Manuel Antonio',
  'Playas de Guanacaste & Tamarindo': 'Guanacaste',
  'Rafting Río Pacuare': 'Pacuare',
  'Tortuguero & Caribe Norte': 'Caribe',
  'Península de Osa & Corcovado': 'Pacífico Sur'
};

function normalizeSavedDestinations(value: unknown): string[] {
  if (!Array.isArray(value)) return ['Arenal', 'Manuel Antonio'];
  const validIds = new Set(DESTINATION_OPTIONS.map(option => option.id));
  return Array.from(new Set(value.map(item => {
    const raw = String(item || '').trim();
    return LEGACY_DESTINATION_ALIASES[raw] || raw;
  }).filter(id => validIds.has(id as any))));
}

interface CustomFunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currency: Currency;
  onSelectTour?: (tour: any) => void;
  onOpenItineraryPlanner?: () => void;
}

export const CustomFunnelModal: React.FC<CustomFunnelModalProps> = ({
  isOpen,
  onClose,
  language,
  currency,
  onOpenItineraryPlanner,
}) => {
  const [step, setStep] = useState<number>(1);
  const [copiedQuote, setCopiedQuote] = useState(false);

  // Step 1: Trip Basics
  const [arrivalAirport, setArrivalAirport] = useState<'SJO' | 'LIR'>('SJO');
  const [departureAirport, setDepartureAirport] = useState<'SJO' | 'LIR'>('SJO');
  const [startDate, setStartDate] = useState('');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [pace, setPace] = useState<'relaxed' | 'balanced' | 'active'>('balanced');
  const [budgetUSD, setBudgetUSD] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [requestQuote, setRequestQuote] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [formError, setFormError] = useState('');

  // Step 2: Transport & Transfers
  const [transportType, setTransportType] = useState<'shuttle' | 'private' | 'rental' | 'flight'>('private');
  
  // Step 3: Destinations & Stays
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>(['Arenal', 'Manuel Antonio']);
  const [stayStyle, setStayStyle] = useState<'ecolodge' | 'boutique' | 'resort'>('boutique');

  // Step 4: Add-on Perks
  const [includeSim, setIncludeSim] = useState<boolean>(true);
  const [includeGuide, setIncludeGuide] = useState<boolean>(true);
  const [includeNationalParkPass, setIncludeNationalParkPass] = useState<boolean>(true);
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(false);

  // Auto-save & offline state
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);
  const hasRestoredRef = useRef(false);

  // Network connection listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Restore draft when opened
  useEffect(() => {
    if (isOpen && !hasRestoredRef.current) {
      try {
        const saved = localStorage.getItem(CUSTOM_FUNNEL_DRAFT_KEY);
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft) {
            if (draft.step) setStep(draft.step);
            if (draft.arrivalAirport) setArrivalAirport(draft.arrivalAirport);
            if (draft.departureAirport) setDepartureAirport(draft.departureAirport);
            if (draft.startDate) setStartDate(draft.startDate);
            if (draft.durationDays) setDurationDays(draft.durationDays);
            if (draft.adults) setAdults(draft.adults);
            if (draft.children !== undefined) setChildren(draft.children);
            if (draft.transportType) setTransportType(draft.transportType);
            if (draft.selectedDestinations && Array.isArray(draft.selectedDestinations)) {
              setSelectedDestinations(normalizeSavedDestinations(draft.selectedDestinations));
            }
            if (draft.stayStyle) setStayStyle(draft.stayStyle);
            if (draft.includeSim !== undefined) setIncludeSim(draft.includeSim);
            if (draft.includeGuide !== undefined) setIncludeGuide(draft.includeGuide);
            if (draft.includeNationalParkPass !== undefined) setIncludeNationalParkPass(draft.includeNationalParkPass);
            if (draft.includeInsurance !== undefined) setIncludeInsurance(draft.includeInsurance);
            if (draft.pace) setPace(draft.pace);
            if (draft.budgetUSD !== undefined) setBudgetUSD(String(draft.budgetUSD || ''));
            if (draft.specialRequests !== undefined) setSpecialRequests(String(draft.specialRequests || ''));
            if (draft.requestQuote !== undefined) setRequestQuote(Boolean(draft.requestQuote));
            if (draft.customerName !== undefined) setCustomerName(String(draft.customerName || ''));
            if (draft.customerEmail !== undefined) setCustomerEmail(String(draft.customerEmail || ''));
            if (draft.customerPhone !== undefined) setCustomerPhone(String(draft.customerPhone || ''));
            if (draft.savedAt) setLastSavedTime(draft.savedAt);
            setHasRestoredDraft(true);
          }
        }
      } catch (e) {
        console.warn('Error reading custom funnel draft:', e);
      }
      hasRestoredRef.current = true;
    }
  }, [isOpen]);

  // Periodic Auto-Save
  useEffect(() => {
    if (!isOpen) return;

    const performSave = () => {
      const now = new Date();
      const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const payload = {
        step,
        arrivalAirport,
        departureAirport,
        startDate,
        durationDays,
        adults,
        children,
        transportType,
        selectedDestinations,
        stayStyle,
        includeSim,
        includeGuide,
        includeNationalParkPass,
        includeInsurance,
        pace,
        budgetUSD,
        specialRequests,
        requestQuote,
        customerName,
        customerEmail,
        customerPhone,
        savedAt: timeFormatted,
        updatedAt: now.toISOString()
      };

      try {
        localStorage.setItem(CUSTOM_FUNNEL_DRAFT_KEY, JSON.stringify(payload));
        setLastSavedTime(timeFormatted);
      } catch (err) {
        console.warn('Could not auto-save custom funnel:', err);
      }
    };

    const debounceTimer = setTimeout(performSave, 400);
    const intervalTimer = setInterval(performSave, 3000);

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(intervalTimer);
    };
  }, [
    isOpen, step, arrivalAirport, departureAirport, startDate, durationDays, adults, children,
    pace, budgetUSD, specialRequests, requestQuote, customerName, customerEmail, customerPhone,
    transportType, selectedDestinations, stayStyle, includeSim, includeGuide,
    includeNationalParkPass, includeInsurance
  ]);

  const handleResetDraft = () => {
    try {
      localStorage.removeItem(CUSTOM_FUNNEL_DRAFT_KEY);
    } catch (e) {
      console.warn(e);
    }
    setStep(1);
    setArrivalAirport('SJO');
    setDepartureAirport('SJO');
    setStartDate('');
    setDurationDays(7);
    setAdults(2);
    setChildren(0);
    setTransportType('private');
    setSelectedDestinations(['Arenal', 'Manuel Antonio']);
    setStayStyle('boutique');
    setIncludeSim(true);
    setIncludeGuide(true);
    setIncludeNationalParkPass(true);
    setIncludeInsurance(false);
    setPace('balanced');
    setBudgetUSD('');
    setSpecialRequests('');
    setRequestQuote(true);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setFormError('');
    setHasRestoredDraft(false);
    setLastSavedTime(null);
  };

  if (!isOpen) return null;

  const toggleDestination = (dest: string) => {
    setSelectedDestinations(prev => 
      prev.includes(dest) ? prev.filter(d => d !== dest) : [...prev, dest]
    );
  };

  const selectedDestinationLabels = selectedDestinations.map(id => {
    const option = DESTINATION_OPTIONS.find(item => item.id === id);
    return option ? (language === 'es' ? option.es : option.en) : id;
  });

  const selectedPriorities = [
    includeNationalParkPass ? (language === 'es' ? 'parques nacionales y naturaleza' : 'national parks and nature') : '',
    includeGuide ? (language === 'es' ? 'guía naturalista cuando aporte valor' : 'naturalist guide where useful') : '',
    includeSim ? (language === 'es' ? 'opciones de conectividad' : 'connectivity options') : '',
    includeInsurance ? (language === 'es' ? 'información sobre seguro de viaje' : 'travel insurance information') : ''
  ].filter(Boolean);

  const buildTripRequestMessage = () => {
    const travelers = adults + children;
    const destinationText = selectedDestinationLabels.length
      ? selectedDestinationLabels.join(', ')
      : (language === 'es' ? 'por definir' : 'to be defined');
    const outcome = requestQuote
      ? (language === 'es'
          ? 'Después de proponer la ruta, inicia la verificación operativa necesaria para preparar una cotización real; no reserves ni cobres hasta completar las verificaciones.'
          : 'After proposing the route, start the operational verification needed for a real quote; do not book or charge until verification is complete.')
      : (language === 'es'
          ? 'Por ahora quiero sólo una propuesta de viaje; no inicies reserva ni pago.'
          : 'For now I only want a trip proposal; do not start booking or payment.');

    return language === 'es'
      ? `Necesito un viaje personalizado de ${durationDays} días en Costa Rica para ${travelers} viajeros (${adults} adultos, ${children} niños). Fecha de inicio: ${startDate || 'por definir'}. Llegada: ${arrivalAirport}. Salida: ${departureAirport}. Queremos visitar: ${destinationText}. Ritmo: ${pace}. Preferimos transporte ${transportType} y alojamiento ${stayStyle}. ${budgetUSD ? `Presupuesto máximo declarado para el grupo: $${budgetUSD} USD; úsalo como restricción, no como precio cotizado.` : ''} ${selectedPriorities.length ? `Prioridades: ${selectedPriorities.join(', ')}.` : ''} ${specialRequests ? `Necesidades o solicitudes especiales: ${specialRequests}.` : ''} Construye una ruta día por día, optimiza geografía y traslados, usa servicios reales del catálogo cuando correspondan y marca claramente todo lo que requiera verificación. ${outcome}`
      : `I need a custom ${durationDays}-day Costa Rica trip for ${travelers} travelers (${adults} adults, ${children} children). Start date: ${startDate || 'to be defined'}. Arrival: ${arrivalAirport}. Departure: ${departureAirport}. We want to visit: ${destinationText}. Pace: ${pace}. We prefer ${transportType} transport and ${stayStyle} lodging. ${budgetUSD ? `Declared group budget ceiling: $${budgetUSD} USD; use it as a constraint, not as a quoted price.` : ''} ${selectedPriorities.length ? `Priorities: ${selectedPriorities.join(', ')}.` : ''} ${specialRequests ? `Special needs or requests: ${specialRequests}.` : ''} Build a day-by-day route, optimize geography and transfers, use real catalog services when they fit, and clearly mark anything requiring verification. ${outcome}`;
  };

  const handleGenerateItinerary = () => {
    setFormError('');
    const travelers = adults + children;
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());

    if (durationDays < 3 || durationDays > 21) {
      setFormError(language === 'es' ? 'La duración debe estar entre 3 y 21 días.' : 'Trip duration must be between 3 and 21 days.');
      return;
    }
    if (adults < 1 || travelers < 1) {
      setFormError(language === 'es' ? 'Debe viajar al menos un adulto.' : 'At least one adult traveler is required.');
      return;
    }
    if (!selectedDestinations.length) {
      setFormError(language === 'es' ? 'Selecciona al menos un destino para construir una ruta coherente.' : 'Select at least one destination to build a coherent route.');
      return;
    }
    if (requestQuote && !startDate) {
      setFormError(language === 'es' ? 'Indica una fecha exacta de inicio para verificar disponibilidad y cotizar.' : 'Provide an exact start date to verify availability and prepare a quote.');
      return;
    }
    if (requestQuote && !customerName.trim()) {
      setFormError(language === 'es' ? 'Indica el nombre del viajero responsable para abrir la solicitud de cotización.' : 'Provide the lead traveler name to open the quote request.');
      return;
    }
    if (requestQuote && !emailLooksValid) {
      setFormError(language === 'es' ? 'Indica un correo válido para continuar la verificación de la cotización.' : 'Provide a valid email to continue quote verification.');
      return;
    }

    const message = buildTripRequestMessage();
    requestCustomerIntake({
      message,
      language,
      source: 'custom-trip-funnel',
      customer: {
        name: customerName.trim() || undefined,
        email: customerEmail.trim() || undefined,
        phone: customerPhone.trim() || undefined
      },
      context: {
        page: window.location.pathname,
        requestKind: 'custom_multi_day_itinerary',
        existingJourneyId: localStorage.getItem('crt_active_journey') || undefined,
        journeyRequest: {
          startDate: startDate || undefined,
          arrivalAirport,
          departureAirport,
          durationDays,
          adults,
          children,
          travelers,
          pace,
          budgetUSD: budgetUSD ? Number(budgetUSD) : undefined,
          transportType,
          selectedDestinations,
          stayStyle,
          priorities: selectedPriorities,
          specialRequests: specialRequests.trim() || undefined,
          requestQuote,
          addons: {
            nationalParkPass: includeNationalParkPass,
            guide: includeGuide,
            esim: includeSim,
            insurance: includeInsurance
          }
        }
      }
    });
  };

  const handleCopyQuote = () => {
    const text = buildTripRequestMessage();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedQuote(true);
        setTimeout(() => setCopiedQuote(false), 3000);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-white/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] border border-neutral-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-stone-50 text-stone-900 p-6 relative flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-orange-500 text-stone-900 text-[10px] font-black uppercase px-3 py-1 rounded-full inline-flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3 h-3" />
                {language === 'es' ? 'Planificador Inteligente 2026' : 'Smart Trip Planner 2026'}
              </span>
              {lastSavedTime && (
                <span className="bg-stone-100 text-stone-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border border-teal-700">
                  <Save className="w-2.5 h-2.5 text-teal-400" />
                  <span>{language === 'es' ? `Guardado (${lastSavedTime})` : `Draft saved (${lastSavedTime})`}</span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
              {language === 'es' ? 'Diseña Tu Paquete a Costa Rica' : 'Build Your Custom Costa Rica Package'}
            </h2>
            <p className="text-xs text-stone-800">
              {language === 'es' ? 'Paso ' + step + ' de 4 • Diseña una propuesta de viaje verificable' : 'Step ' + step + ' of 4 • Build a verifiable trip proposal'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-stone-900 flex items-center justify-center transition-colors border border-black/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Restored Draft & Offline Notifications */}
        {hasRestoredDraft && (
          <div className="bg-stone-50 border-b border-stone-200 px-6 py-2.5 text-xs text-stone-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{language === 'es' ? 'Se recuperó tu propuesta de viaje guardada.' : 'Restored your saved trip proposal.'}</span>
            </div>
            <button
              onClick={handleResetDraft}
              className="min-h-[44px] min-w-[44px] text-[10px] font-black text-red-600 hover:text-red-800 flex items-center gap-1 underline cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>{language === 'es' ? 'Reiniciar' : 'Reset'}</span>
            </button>
          </div>
        )}

        {!isOnline && (
          <div className="bg-amber-50 border-b border-orange-200 px-6 py-2 text-xs text-amber-900 font-medium flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{language === 'es' ? 'Sin conexión a internet — Tu progreso se guarda automáticamente en este dispositivo.' : 'No connection — Your progress is saved automatically on this device.'}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-neutral-100 h-2 w-full flex">
          <div 
            className="bg-orange-500 h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* STEP 1: Arrival & Passengers */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-stone-950 uppercase flex items-center gap-2">
                  <Plane className="w-5 h-5 text-teal-600" />
                  {language === 'es' ? '1. Llegada y Pasajeros' : '1. Arrival & Travelers'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {language === 'es' ? 'Selecciona tu aeropuerto de llegada y cantidad de viajeros.' : 'Select your entry airport and traveler group size.'}
                </p>
              </div>

              {/* Airport Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setArrivalAirport('SJO')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    arrivalAirport === 'SJO'
                      ? 'border-orange-500 bg-stone-50/50 shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                    arrivalAirport === 'SJO' ? 'bg-orange-500 text-stone-900' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    SJO
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900">San José (SJO - Juan Santamaría)</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {language === 'es' ? 'Ideal para Volcanes, Valle Central y Caribe.' : 'Best for Volcanoes, Central Valley & Caribbean.'}
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setArrivalAirport('LIR')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    arrivalAirport === 'LIR'
                      ? 'border-orange-500 bg-stone-50/50 shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                    arrivalAirport === 'LIR' ? 'bg-orange-500 text-stone-900' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    LIR
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900">Liberia (LIR - Daniel Oduber)</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {language === 'es' ? 'Ideal para Playas de Guanacaste & Papagayo.' : 'Best for Guanacaste Beaches & Papagayo.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    {language === 'es' ? 'Fecha exacta de inicio' : 'Exact start date'}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm font-bold text-neutral-800"
                  />
                  <p className="mt-1 text-[10px] text-neutral-500">
                    {language === 'es' ? 'Necesaria para verificar cupos y precios vivos.' : 'Required for live availability and price verification.'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    {language === 'es' ? 'Aeropuerto de salida' : 'Departure airport'}
                  </label>
                  <select
                    value={departureAirport}
                    onChange={(e) => setDepartureAirport(e.target.value as 'SJO' | 'LIR')}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm font-bold text-neutral-800"
                  >
                    <option value="SJO">SJO · Juan Santamaría</option>
                    <option value="LIR">LIR · Guanacaste/Liberia</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    {language === 'es' ? 'Ritmo del viaje' : 'Trip pace'}
                  </label>
                  <select
                    value={pace}
                    onChange={(e) => setPace(e.target.value as 'relaxed' | 'balanced' | 'active')}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm font-bold text-neutral-800"
                  >
                    <option value="relaxed">{language === 'es' ? 'Relajado · más tiempo libre' : 'Relaxed · more free time'}</option>
                    <option value="balanced">{language === 'es' ? 'Equilibrado' : 'Balanced'}</option>
                    <option value="active">{language === 'es' ? 'Activo · más experiencias' : 'Active · more experiences'}</option>
                  </select>
                </div>
              </div>

              {/* Duration & Group size */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    {language === 'es' ? 'Duración (Días):' : 'Duration (Days):'}
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="21"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm font-bold text-neutral-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    {language === 'es' ? 'Adultos (+12 años):' : 'Adults (+12 yrs):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm font-bold text-neutral-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    {language === 'es' ? 'Niños (0-11 años):' : 'Kids (0-11 yrs):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm font-bold text-neutral-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Transport Preference */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-stone-950 uppercase flex items-center gap-2">
                  <Bus className="w-5 h-5 text-teal-600" />
                  {language === 'es' ? '2. Estilo de Transporte' : '2. Transport Style'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {language === 'es' ? 'Cómo prefieres moverte entre los destinos de Costa Rica.' : 'How you prefer to travel between Costa Rica destinations.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    id: 'private',
                    titleEs: 'Transporte privado con conductor',
                    titleEn: 'Private driver transfer',
                    descEs: 'Preferencia de movilidad puerta a puerta. Operador, vehículo, horario, ruta y tarifa se verifican antes de cotizar.',
                    descEn: 'Door-to-door mobility preference. Provider, vehicle, schedule, route and price are verified before quoting.',
                    tagEs: 'Flexible', tagEn: 'Flexible'
                  },
                  {
                    id: 'rental',
                    titleEs: 'Vehículo de alquiler',
                    titleEn: 'Rental vehicle',
                    descEs: 'Opción para conducir por cuenta propia. Tipo de vehículo, seguros, depósito y condiciones se verifican con el proveedor.',
                    descEn: 'Self-drive option. Vehicle type, insurance, deposit and terms are verified with the supplier.',
                    tagEs: 'Independiente', tagEn: 'Independent'
                  },
                  {
                    id: 'shuttle',
                    titleEs: 'Shuttle compartido',
                    titleEn: 'Shared shuttle',
                    descEs: 'Preferencia de transporte compartido entre destinos. Rutas, horarios, recogida y cupos se verifican.',
                    descEn: 'Shared transport preference between destinations. Routes, schedules, pickup and seats are verified.',
                    tagEs: 'Compartido', tagEn: 'Shared'
                  },
                  {
                    id: 'flight',
                    titleEs: 'Vuelo doméstico',
                    titleEn: 'Domestic flight',
                    descEs: 'Útil para reducir algunos traslados largos cuando exista una ruta adecuada. Horarios, equipaje, tarifa y operación se verifican en vivo.',
                    descEn: 'Useful to shorten some long transfers when a suitable route exists. Schedule, baggage, fare and operation are verified live.',
                    tagEs: 'Aéreo', tagEn: 'Air'
                  }
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setTransportType(opt.id as any)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      transportType === opt.id
                        ? 'border-orange-500 bg-stone-50/50 shadow-sm'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm text-neutral-900">{language === 'es' ? opt.titleEs : opt.titleEn}</span>
                      <span className="bg-amber-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {language === 'es' ? opt.tagEs : opt.tagEn}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">{language === 'es' ? opt.descEs : opt.descEn}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Destinations & Accommodation */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-stone-950 uppercase flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-teal-600" />
                  {language === 'es' ? '3. Destinos & Hospedaje' : '3. Destinations & Stay'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {language === 'es' ? 'Elige las regiones que deseas incluir en tu recorrido.' : 'Choose the regions you want to visit on your trip.'}
                </p>
              </div>

              {/* Destination Chips */}
              <div className="flex flex-wrap gap-2">
                {DESTINATION_OPTIONS.map((dest) => {
                  const isSelected = selectedDestinations.includes(dest.id);
                  return (
                    <button
                      key={dest.id}
                      onClick={() => toggleDestination(dest.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-teal-600 text-stone-900 border-teal-600 shadow-sm'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-orange-500'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5 text-stone-900" /> : <Compass className="w-3.5 h-3.5 text-stone-600" />}
                      <span>{language === 'es' ? dest.es : dest.en}</span>
                    </button>
                  );
                })}
              </div>

              {/* Accommodation Style */}
              <div className="pt-2">
                <label className="text-xs font-bold text-neutral-700 block mb-2">
                  {language === 'es' ? 'Estilo de Alojamiento Preferido:' : 'Preferred Stay Style:'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'ecolodge', es: 'Eco-lodge / naturaleza', en: 'Eco-lodge / nature', descEs: 'Preferencia de categoría; propiedad y tarifa se verifican.', descEn: 'Category preference; property and rate are verified.' },
                    { id: 'boutique', es: 'Hotel boutique / gama media-alta', en: 'Boutique / upper-midscale hotel', descEs: 'Confort y escala pequeña; no implica una propiedad específica.', descEn: 'Comfort and smaller scale; no specific property is implied.' },
                    { id: 'resort', es: 'Resort / alta gama', en: 'Resort / upscale', descEs: 'Preferencia de nivel de servicio; disponibilidad y condiciones se verifican.', descEn: 'Service-level preference; availability and terms are verified.' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setStayStyle(st.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        stayStyle === st.id
                          ? 'border-orange-500 bg-stone-50 text-stone-950 shadow-sm'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <span className="font-bold text-xs block">{language === 'es' ? st.es : st.en}</span>
                      <span className="text-[10px] text-neutral-500">{language === 'es' ? st.descEs : st.descEn}</span>
                    </button>
                  ))}
                </div>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  {language === 'es' ? 'Presupuesto máximo del grupo (USD, opcional)' : 'Group budget ceiling (USD, optional)'}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={budgetUSD}
                    onChange={(e) => setBudgetUSD(e.target.value)}
                    placeholder={language === 'es' ? 'Ej. 4500' : 'e.g. 4500'}
                    className="w-full bg-white border border-neutral-300 rounded-xl pl-9 pr-3 py-2 text-sm font-bold text-neutral-800"
                  />
                </div>
                <p className="mt-1 text-[10px] text-neutral-500">
                  {language === 'es'
                    ? 'Se usa como restricción de diseño; nunca se convierte automáticamente en una tarifa o cobro.'
                    : 'Used as a planning constraint; it is never automatically treated as a fare or charge.'}
                </p>
              </div>
              </div>
            </div>
          )}

          {/* STEP 4: Summary & Perks */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-stone-950 uppercase flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  {language === 'es' ? '4. Resumen & Preferencias del Itinerario' : '4. Itinerary Summary & Preferences'}
                </h3>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                {[
                  {
                    state: includeNationalParkPass, set: setIncludeNationalParkPass,
                    titleEs: '🎫 Incluir parques nacionales', titleEn: '🎫 Include national parks',
                    descEs: 'La IA los incorpora como preferencia; entradas, horario, aforo y reglas se verifican antes de cotizar.',
                    descEn: 'AI treats parks as a preference; admission, hours, capacity and rules are verified before quoting.'
                  },
                  {
                    state: includeGuide, set: setIncludeGuide,
                    titleEs: '🦥 Preferencia por guía naturalista', titleEn: '🦥 Naturalist guide preference',
                    descEs: 'Se buscará cuando aporte valor. Credenciales, idioma, disponibilidad y tarifa se verifican.',
                    descEn: 'Included when useful. Credentials, language, availability and price are verified.'
                  },
                  {
                    state: includeSim, set: setIncludeSim,
                    titleEs: '📱 Opciones de conectividad', titleEn: '📱 Connectivity options',
                    descEs: 'Solicita recomendaciones de conectividad/eSIM; no se presume que estén incluidas en el paquete.',
                    descEn: 'Request connectivity/eSIM options; they are not assumed to be included in the package.'
                  },
                  {
                    state: includeInsurance, set: setIncludeInsurance,
                    titleEs: '🛡️ Información sobre seguro de viaje', titleEn: '🛡️ Travel insurance information',
                    descEs: 'Solicita opciones e información. Coberturas, exclusiones y precio nunca se inventan.',
                    descEn: 'Request options and information. Coverage, exclusions and price are never invented.'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div>
                      <span className="font-bold text-xs text-neutral-900 block">{language === 'es' ? item.titleEs : item.titleEn}</span>
                      <span className="text-[10px] text-neutral-500">{language === 'es' ? item.descEs : item.descEn}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => item.set(e.target.checked)}
                      className="w-5 h-5 accent-orange-500 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    {language === 'es' ? 'Necesidades, intereses o restricciones' : 'Needs, interests or constraints'}
                  </label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    maxLength={1200}
                    rows={3}
                    placeholder={language === 'es'
                      ? 'Ej. viajamos con niños, queremos fauna y playa, evitar trayectos muy largos, celebración, movilidad, alimentación...'
                      : 'e.g. traveling with children, wildlife + beach, avoid long drives, celebration, mobility, dietary needs...'}
                    className="w-full resize-y bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wide text-neutral-600 block mb-1">
                      {language === 'es' ? 'Nombre responsable' : 'Lead traveler'}
                    </label>
                    <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-800" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wide text-neutral-600 block mb-1">Email</label>
                    <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-800" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wide text-neutral-600 block mb-1">
                      {language === 'es' ? 'Teléfono (opcional)' : 'Phone (optional)'}
                    </label>
                    <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-800" />
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestQuote}
                    onChange={(e) => setRequestQuote(e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-emerald-600"
                  />
                  <span>
                    <span className="block text-xs font-black text-emerald-900">
                      {language === 'es' ? 'Después del plan, iniciar verificación para cotizar' : 'After planning, start quote verification'}
                    </span>
                    <span className="block mt-1 text-[10px] leading-relaxed text-emerald-800">
                      {language === 'es'
                        ? 'Crea trabajo durable de verificación. No confirma disponibilidad, reserva ni pago hasta recibir evidencia válida.'
                        : 'Creates durable verification work. It does not confirm availability, booking or payment until valid evidence is received.'}
                    </span>
                  </span>
                </label>

                {formError && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    {formError}
                  </div>
                )}
              </div>

              {/* Estimate Result Box */}
              <div className="bg-white p-6 rounded-3xl text-stone-900 space-y-4 shadow-xl border border-stone-200/50">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-extrabold text-orange-300 block">
                      {language === 'es' ? 'Solicitud lista para crear el itinerario' : 'Ready to build your itinerary'}
                    </span>
                    <span className="text-xs text-stone-800/80">
                      {adults} {language === 'es' ? 'Adultos' : 'Adults'} {children > 0 && `+ ${children} ${language === 'es' ? 'Niños' : 'Kids'}`} • {durationDays} {language === 'es' ? 'Días' : 'Days'}
                    </span>
                  </div>
                  <div className="text-right max-w-[220px]">
                    <div className="text-sm font-black text-emerald-700">
                      {language === 'es' ? 'Itinerario primero' : 'Itinerary first'}
                    </div>
                    <div className="text-[10px] text-stone-600 mt-1 leading-relaxed">
                      {language === 'es'
                        ? (requestQuote ? 'Plan → verificación → cotización. Nada se cobra ni confirma antes de validar cada componente.' : 'Crearás una propuesta de ruta sin iniciar reserva ni cobro.')
                        : (requestQuote ? 'Plan → verification → quote. Nothing is charged or confirmed before each component is validated.' : 'You will create a route proposal without starting a booking or charge.')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-900 bg-white/10 p-3 rounded-2xl border border-black/10">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span>
                    {language === 'es' 
                      ? 'La IA construirá una ruta día por día con tus destinos y viajeros. Ningún cupo, tarifa o alojamiento se presentará como confirmado sin verificación real.' 
                      : 'AI will build a day-by-day route from your destinations and traveler count. No capacity, fare or lodging will be shown as confirmed without live verification.'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-neutral-50 border-t border-neutral-200 p-4 sm:p-6 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-full border border-neutral-300 text-neutral-700 font-bold text-xs flex items-center gap-1.5 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{language === 'es' ? 'Anterior' : 'Back'}</span>
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-2.5 rounded-full bg-orange-500 hover:bg-teal-600 text-stone-900 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-orange-500/20 transition-all hover:scale-105 cursor-pointer ml-auto"
            >
              <span>{language === 'es' ? 'Siguiente Paso' : 'Next Step'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={handleCopyQuote}
                className="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-full border border-neutral-300 hover:border-neutral-400 bg-white text-neutral-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title={language === 'es' ? 'Copiar texto al portapapeles' : 'Copy text to clipboard'}
              >
                {copiedQuote ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4 text-neutral-500" />}
                <span>{copiedQuote ? (language === 'es' ? '¡Copiado!' : 'Copied!') : (language === 'es' ? 'Copiar Solicitud' : 'Copy Request')}</span>
              </button>

              {onOpenItineraryPlanner && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenItineraryPlanner();
                  }}
                  className="px-4 py-2.5 rounded-full border border-emerald-600/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{language === 'es' ? 'Generar con IA' : 'Generate with AI'}</span>
                </button>
              )}

              <button
                onClick={handleGenerateItinerary}
                className="min-h-[44px] min-w-[44px] w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-stone-900 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{requestQuote ? (language === 'es' ? 'Crear plan y verificar para cotizar' : 'Build plan & verify for quote') : (language === 'es' ? 'Crear itinerario' : 'Build itinerary')}</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
