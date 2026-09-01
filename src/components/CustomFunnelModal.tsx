import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Check, ChevronRight, ChevronLeft, Sparkles, Send, Plane, Bus, 
  MapPin, Calendar, Users, Hotel, ShieldCheck, Compass, CheckCircle2,
  DollarSign, MessageCircle, Info, RefreshCw, Save, WifiOff, Trash2
} from 'lucide-react';
import { Language, Currency } from '../types';
import { formatCurrency } from '../utils/i18n';

const CUSTOM_FUNNEL_DRAFT_KEY = 'costa_rica_custom_funnel_draft';

interface CustomFunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currency: Currency;
  onSelectTour?: (tour: any) => void;
}

export const CustomFunnelModal: React.FC<CustomFunnelModalProps> = ({
  isOpen,
  onClose,
  language,
  currency,
}) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Trip Basics
  const [arrivalAirport, setArrivalAirport] = useState<'SJO' | 'LIR'>('SJO');
  const [travelMonth, setTravelMonth] = useState<string>('Diciembre - Abril (Dry Season)');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);

  // Step 2: Transport & Transfers
  const [transportType, setTransportType] = useState<'shuttle' | 'private' | 'rental' | 'flight'>('private');
  
  // Step 3: Destinations & Stays
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([
    'Arenal Volcano & Thermal Springs',
    'Manuel Antonio National Park'
  ]);
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
            if (draft.travelMonth) setTravelMonth(draft.travelMonth);
            if (draft.durationDays) setDurationDays(draft.durationDays);
            if (draft.adults) setAdults(draft.adults);
            if (draft.children !== undefined) setChildren(draft.children);
            if (draft.transportType) setTransportType(draft.transportType);
            if (draft.selectedDestinations && Array.isArray(draft.selectedDestinations)) {
              setSelectedDestinations(draft.selectedDestinations);
            }
            if (draft.stayStyle) setStayStyle(draft.stayStyle);
            if (draft.includeSim !== undefined) setIncludeSim(draft.includeSim);
            if (draft.includeGuide !== undefined) setIncludeGuide(draft.includeGuide);
            if (draft.includeNationalParkPass !== undefined) setIncludeNationalParkPass(draft.includeNationalParkPass);
            if (draft.includeInsurance !== undefined) setIncludeInsurance(draft.includeInsurance);
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
        travelMonth,
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
    isOpen, step, arrivalAirport, travelMonth, durationDays, adults, children,
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
    setTravelMonth('Diciembre - Abril (Dry Season)');
    setDurationDays(7);
    setAdults(2);
    setChildren(0);
    setTransportType('private');
    setSelectedDestinations(['Arenal Volcano & Thermal Springs', 'Manuel Antonio National Park']);
    setStayStyle('boutique');
    setIncludeSim(true);
    setIncludeGuide(true);
    setIncludeNationalParkPass(true);
    setIncludeInsurance(false);
    setHasRestoredDraft(false);
    setLastSavedTime(null);
  };

  if (!isOpen) return null;

  const toggleDestination = (dest: string) => {
    setSelectedDestinations(prev => 
      prev.includes(dest) ? prev.filter(d => d !== dest) : [...prev, dest]
    );
  };

  // Estimate total cost per person / total
  const calculateEstimate = () => {
    let basePerson = 120 * durationDays; // base stays & activities
    
    // Transport
    if (transportType === 'private') basePerson += 180;
    if (transportType === 'rental') basePerson += 220;
    if (transportType === 'flight') basePerson += 300;
    if (transportType === 'shuttle') basePerson += 90;

    // Destinations
    basePerson += selectedDestinations.length * 65;

    // Accommodation style multiplier
    if (stayStyle === 'ecolodge') basePerson *= 1.1;
    if (stayStyle === 'boutique') basePerson *= 1.25;
    if (stayStyle === 'resort') basePerson *= 1.5;

    // Addons
    let addons = 0;
    if (includeSim) addons += 25;
    if (includeGuide) addons += 45;
    if (includeNationalParkPass) addons += 30;
    if (includeInsurance) addons += 40;

    const totalPerAdult = Math.round(basePerson + addons);
    const totalPerChild = Math.round((basePerson * 0.6) + (addons * 0.5));
    let baseTotalUSD = (totalPerAdult * adults) + (totalPerChild * children);
    
    // Group discount
    const isGroupDiscount = (adults + children) >= 5;
    const totalUSD = isGroupDiscount ? Math.round(baseTotalUSD * 0.9) : baseTotalUSD;

    return {
      perAdultUSD: totalPerAdult,
      totalUSD,
      isGroupDiscount
    };
  };

  const { perAdultUSD, totalUSD, isGroupDiscount } = calculateEstimate();

  const handleSendWhatsApp = () => {
    const textEs = `🌴 *COTIZACIÓN DE VIAJE CUSTOMIZADO - COSTA RICA* 🌴

✈️ *Llegada:* Aeropuerto ${arrivalAirport}
📅 *Temporada:* ${travelMonth}
⏱️ *Duración:* ${durationDays} Días
👥 *Pasajeros:* ${adults} Adultos, ${children} Niños
🚐 *Transporte:* ${transportType.toUpperCase()}
📍 *Destinos:* ${selectedDestinations.join(', ')}
🏨 *Alojamiento:* estilo ${stayStyle.toUpperCase()}
⭐ *Adicionales:*
- Pass Parques SINAC: ${includeNationalParkPass ? 'SÍ' : 'NO'}
- Guía Turístico: ${includeGuide ? 'SÍ' : 'NO'}
- eSIM Costa Rica: ${includeSim ? 'SÍ' : 'NO'}
- Seguro de Viaje: ${includeInsurance ? 'SÍ' : 'NO'}

💰 *Estimado Total:* $${totalUSD} USD (${formatCurrency(totalUSD, 'CRC')} CRC)

Por favor confirmen disponibilidad y atención personalizada para mi grupo. Pura Vida!`;

    const textEn = `🌴 *CUSTOM COSTA RICA TRIP QUOTE* 🌴

✈️ *Arrival:* ${arrivalAirport} Airport
📅 *Season:* ${travelMonth}
⏱️ *Duration:* ${durationDays} Days
👥 *Travelers:* ${adults} Adults, ${children} Kids
🚐 *Transport:* ${transportType.toUpperCase()}
📍 *Destinations:* ${selectedDestinations.join(', ')}
🏨 *Stay Style:* ${stayStyle.toUpperCase()}
⭐ *Perks:*
- SINAC Park Passes: ${includeNationalParkPass ? 'YES' : 'NO'}
- Certified Guide: ${includeGuide ? 'YES' : 'NO'}
- Costa Rica eSIM: ${includeSim ? 'YES' : 'NO'}
- Travel Insurance: ${includeInsurance ? 'YES' : 'NO'}

💰 *Estimated Total:* $${totalUSD} USD

Please confirm availability and custom itinerary details for our trip! Pura Vida!`;

    const message = language === 'es' ? textEs : textEn;
    const url = `https://wa.me/50687959148?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-emerald-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] border border-neutral-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-emerald-900 text-white p-6 relative flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full inline-flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3 h-3" />
                {language === 'es' ? 'Cotizador Inteligente 2026' : 'Smart Trip Package Builder 2026'}
              </span>
              {lastSavedTime && (
                <span className="bg-emerald-800 text-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border border-emerald-700">
                  <Save className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{language === 'es' ? `Guardado (${lastSavedTime})` : `Draft saved (${lastSavedTime})`}</span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
              {language === 'es' ? 'Diseña Tu Paquete a Costa Rica' : 'Build Your Custom Costa Rica Package'}
            </h2>
            <p className="text-xs text-emerald-200">
              {language === 'es' ? 'Paso ' + step + ' de 4 • Cotización personalizada al instante' : 'Step ' + step + ' of 4 • Instant tailored quote'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Restored Draft & Offline Notifications */}
        {hasRestoredDraft && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{language === 'es' ? 'Se recuperó tu cotización personalizada guardada.' : 'Restored your previous customized quote draft.'}</span>
            </div>
            <button
              onClick={handleResetDraft}
              className="text-[10px] font-black text-red-600 hover:text-red-800 flex items-center gap-1 underline cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>{language === 'es' ? 'Reiniciar' : 'Reset'}</span>
            </button>
          </div>
        )}

        {!isOnline && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-900 font-medium flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{language === 'es' ? 'Sin conexión a internet — Tu progreso se guarda automáticamente en este dispositivo.' : 'No connection — Your progress is saved automatically on this device.'}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-neutral-100 h-2 w-full flex">
          <div 
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* STEP 1: Arrival & Passengers */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-emerald-950 uppercase flex items-center gap-2">
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
                      ? 'border-amber-500 bg-emerald-50/50 shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                    arrivalAirport === 'SJO' ? 'bg-amber-500 text-white' : 'bg-neutral-100 text-neutral-600'
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
                      ? 'border-amber-500 bg-emerald-50/50 shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                    arrivalAirport === 'LIR' ? 'bg-amber-500 text-white' : 'bg-neutral-100 text-neutral-600'
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

              {/* Duration & Group size */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    {language === 'es' ? 'Duración (Días):' : 'Duration (Days):'}
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="30"
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
                <h3 className="text-lg font-black text-emerald-950 uppercase flex items-center gap-2">
                  <Bus className="w-5 h-5 text-teal-600" />
                  {language === 'es' ? '2. Estilo de Transporte' : '2. Transport Style'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {language === 'es' ? 'Cómo prefieres moverte entre los destinos de Costa Rica.' : 'How you prefer to travel between Costa Rica destinations.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'private', title: 'Van Privada con Chofer VIP', desc: 'Confort total, paradas ilimitadas, aire acondicionado y flexibilidad de horario.', tag: 'Popular' },
                  { id: 'rental', title: 'Alquiler SUV 4x4 (Drive CR)', desc: 'Libertad completa con GPS Waze, seguro full y vehículo para todo terreno.', tag: 'Aventura' },
                  { id: 'shuttle', title: 'Shuttle Compartido Hotel-to-Hotel', desc: 'Opción económica, puntual con pickups directo en tu hospedaje.', tag: 'Económico' },
                  { id: 'flight', title: 'Vuelos Domésticos Sansa / VIP', desc: 'Ahorra tiempo volando directo a Drake Bay, Nosara, Tambor o Tamarindo.', tag: 'Rápido' }
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setTransportType(opt.id as any)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      transportType === opt.id
                        ? 'border-amber-500 bg-emerald-50/50 shadow-sm'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm text-neutral-900">{opt.title}</span>
                      <span className="bg-amber-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {opt.tag}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Destinations & Accommodation */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-emerald-950 uppercase flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-teal-600" />
                  {language === 'es' ? '3. Destinos & Hospedaje' : '3. Destinations & Stay'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {language === 'es' ? 'Elige las regiones que deseas incluir en tu recorrido.' : 'Choose the regions you want to visit on your trip.'}
                </p>
              </div>

              {/* Destination Chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  'Volcán Arenal & Termales',
                  'Bosque Nuboso Monteverde',
                  'Parque Nacional Manuel Antonio',
                  'Playas de Guanacaste & Tamarindo',
                  'Rafting Río Pacuare',
                  'Tortuguero & Caribe Norte',
                  'Península de Osa & Corcovado'
                ].map((dest) => {
                  const isSelected = selectedDestinations.includes(dest);
                  return (
                    <button
                      key={dest}
                      onClick={() => toggleDestination(dest)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-amber-500'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5 text-white" /> : <Compass className="w-3.5 h-3.5 text-neutral-400" />}
                      <span>{dest}</span>
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
                    { id: 'ecolodge', label: '🌱 Eco-Lodge Sustentable', desc: 'Rodeado de naturaleza' },
                    { id: 'boutique', label: '⭐ Boutique Hotel VIP', desc: 'Confort y estilo' },
                    { id: 'resort', label: '👑 Luxury Resort 5★', desc: 'Termales & Spa' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setStayStyle(st.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        stayStyle === st.id
                          ? 'border-amber-500 bg-emerald-50 text-emerald-950 shadow-sm'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <span className="font-bold text-xs block">{st.label}</span>
                      <span className="text-[10px] text-neutral-500">{st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Summary & Perks */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-emerald-950 uppercase flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  {language === 'es' ? '4. Ventajas Incluidas & Cotización' : '4. Included Perks & Instant Quote'}
                </h3>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                {[
                  { state: includeNationalParkPass, set: setIncludeNationalParkPass, title: '🎫 Reservaciones Parques SINAC', desc: 'Garantiza entradas a Manuel Antonio, Poás y Tenorio.' },
                  { state: includeGuide, set: setIncludeGuide, title: '🦥 Guía Turístico Certificado', desc: 'Acompañamiento profesional con telescopios para avistamiento.' },
                  { state: includeSim, set: setIncludeSim, title: '📱 eSIM Costa Rica con Datos 5G', desc: 'Conexión a internet instantánea para Waze y WhatsApp.' },
                  { state: includeInsurance, set: setIncludeInsurance, title: '🛡️ Seguro Médico de Viaje Local', desc: 'Cobertura médica y asistencia en carretera 24/7.' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div>
                      <span className="font-bold text-xs text-neutral-900 block">{item.title}</span>
                      <span className="text-[10px] text-neutral-500">{item.desc}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => item.set(e.target.checked)}
                      className="w-5 h-5 accent-amber-500 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {/* Estimate Result Box */}
              <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 p-6 rounded-3xl text-white space-y-4 shadow-xl border border-emerald-900/50">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-extrabold text-amber-300 block">
                      {language === 'es' ? 'Estimado Total Paquete Completo' : 'Total Custom Package Estimate'}
                    </span>
                    <span className="text-xs text-emerald-200/80">
                      {adults} {language === 'es' ? 'Adultos' : 'Adults'} {children > 0 && `+ ${children} ${language === 'es' ? 'Niños' : 'Kids'}`} • {durationDays} {language === 'es' ? 'Días' : 'Days'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-amber-400">
                      ${totalUSD} <span className="text-sm font-bold text-white">USD</span>
                    </div>
                    <div className="text-xs text-amber-300 font-mono">
                      ≈ {formatCurrency(totalUSD, 'CRC')} CRC
                    </div>
                    {isGroupDiscount && (
                      <div className="text-[10px] text-amber-400 font-bold uppercase mt-1">
                        🎁 {language === 'es' ? '10% Descuento Grupo Aplicado' : '10% Group Discount'}
                      </div>
                    )}
                    <div className="text-[9px] text-emerald-200 mt-1 uppercase font-bold">
                      {language === 'es' ? 'Incluye IVA (13%) y tarifas locales' : 'Includes 13% VAT & fees'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-100 bg-white/10 p-3 rounded-2xl border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    {language === 'es' 
                      ? 'Sin costo inicial. Envía tus datos por WhatsApp para verificar disponibilidad de hoteles y transporte.' 
                      : 'No upfront fee. Send your quote via WhatsApp to verify hotel and tour availability.'}
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
              className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-teal-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 cursor-pointer ml-auto"
            >
              <span>{language === 'es' ? 'Siguiente Paso' : 'Next Step'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSendWhatsApp}
              className="w-full sm:w-auto px-8 py-3 rounded-full bg-amber-500 hover:bg-teal-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 cursor-pointer ml-auto"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>{language === 'es' ? 'Reservar / Consultar por WhatsApp' : 'Reserve / Inquire via WhatsApp'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
