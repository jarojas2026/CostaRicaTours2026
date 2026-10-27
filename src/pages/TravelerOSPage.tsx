import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, ArrowRight, BellRing, CalendarDays, Check,
  ClipboardCheck, Cloud, Compass, FileText, HeartPulse, Luggage,
  MapPinned, Navigation, Plus, RefreshCw, Save,
  ShieldCheck, Sparkles, StickyNote, WalletCards, Wifi,
  WifiOff, Clock3, Plane, Users, Trash2
} from 'lucide-react';
import type { Language, BookingRequest } from '../types';
import { loadExchangeRates } from '../utils/exchangeRates';
import { formatAmount, formatUSD, rateFor, rateNote } from '../utils/money';
import { useRates } from '../hooks/useMoney';
import { withStorageScope } from '../hooks/useStorageScope';
import { getPersonalItem, captureStorageScope, isStorageScopeCurrent, setPersonalItemInScope } from '../utils/privateStorage';
import { TripPreparationPanel } from '../components/TripPreparationPanel';
import { DEFAULT_PREPARATION, PREPARATION_REGIONS, PREPARATION_ACTIVITIES, isPreparationRegion, isPreparationActivity, regionLabel, activityLabel, costaRicaDate, civilDay, tripTiming, preparationTasks, packingTasks, preparationContext, type PreparationProfile } from '../utils/tripPreparation';

interface TravelerOSPageProps {
  language: Language;
  /** Moneda elegida; el conversor usa CRC cuando es USD. */
  currency?: string;
  onOpenTripBuilder?: () => void;
  onOpenBookings?: () => void;
  bookings?: BookingRequest[];
}

type Task = {
  id: string;
  labelEs: string;
  labelEn: string;
  done: boolean;
  category: 'before' | 'during' | 'documents' | 'packing';
};

type SavedTrip = PreparationProfile & {
  destination: string;
  startDate: string;
  travelers: number;
  budgetUSD: number;
  note: string;
};

const STORAGE_KEY = 'crt_traveler_os_v1' as const;

const defaultTasks: Task[] = [
  { id: 'passport', labelEs: 'Revisar pasaporte y requisitos de entrada', labelEn: 'Review passport and entry requirements', done: false, category: 'documents' },
  { id: 'insurance', labelEs: 'Guardar póliza y contactos de asistencia', labelEn: 'Save insurance policy and assistance contacts', done: false, category: 'documents' },
  { id: 'flights', labelEs: 'Confirmar vuelos y equipaje', labelEn: 'Confirm flights and baggage', done: false, category: 'before' },
  { id: 'lodging', labelEs: 'Confirmar hospedajes y direcciones', labelEn: 'Confirm lodging and addresses', done: false, category: 'before' },
  { id: 'transfers', labelEs: 'Organizar traslados y transporte', labelEn: 'Arrange transfers and transport', done: false, category: 'before' },
  { id: 'offline', labelEs: 'Guardar mapas, reservas y teléfonos para uso offline', labelEn: 'Save maps, bookings and phone numbers offline', done: false, category: 'during' },
  { id: 'packing-waterproof', labelEs: 'Preparar protección impermeable para celular/documentos', labelEn: 'Pack waterproof protection for phone/documents', done: false, category: 'packing' },
  { id: 'cash', labelEs: 'Preparar método de pago y algo de efectivo', labelEn: 'Prepare payment method and some cash', done: false, category: 'before' }
];

const initialTrip: SavedTrip = {
  ...DEFAULT_PREPARATION,
  destination: 'Costa Rica',
  startDate: '',
  travelers: 2,
  budgetUSD: 0,
  note: ''
};

const TravelerOSPageComponent: React.FC<TravelerOSPageProps> = ({
  language,
  currency = 'USD',
  onOpenTripBuilder,
  onOpenBookings,
  bookings = []
}) => {
  const es = language === 'es';
  const navigate = useNavigate();
  const [params,setParams] = useSearchParams();
  const contextRegion=params.get('region'),contextActivity=params.get('activity');
  const [scopeSnapshot] = useState(captureStorageScope);
  const [today,setToday] = useState(costaRicaDate);
  const [preparationChecked,setPreparationChecked] = useState<Record<string,boolean>>({});
  const [storageAvailable,setStorageAvailable] = useState<boolean|null>(null);
  const [trip, setTrip] = useState<SavedTrip>(initialTrip);
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [noteDraft, setNoteDraft] = useState('');
  const [usdAmount, setUsdAmount] = useState(100);
  const rates = useRates();
  const [rateStatus, setRateStatus] = useState<'idle' | 'loading' | 'live' | 'fallback'>('idle');
  // Conversor: USD → moneda elegida (CRC si la elegida es USD). Solo tasas reales.
  const targetCurrency = currency !== 'USD' ? currency : 'CRC';
  const targetRate = rateFor(targetCurrency, rates);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [saved, setSaved] = useState(false);
  const [spentUSD, setSpentUSD] = useState(0);
  const [expenseDraft, setExpenseDraft] = useState('');
  const [expenseAmountDraft, setExpenseAmountDraft] = useState('');
  const [expenseError,setExpenseError] = useState(false);
  const [expenses, setExpenses] = useState<Array<{ id: string; label: string; amount: number }>>([]);

  useEffect(() => {
    try {
      const raw = getPersonalItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { trip?: SavedTrip; tasks?: Task[]; spentUSD?: number; expenses?: Array<{ id: string; label: string; amount: number }>; preparationChecked?:Record<string,boolean> };
      if (parsed.trip) setTrip({ ...initialTrip, ...parsed.trip, region:isPreparationRegion(parsed.trip.region)?parsed.trip.region:'all',activity:isPreparationActivity(parsed.trip.activity)?parsed.trip.activity:'all',family:parsed.trip.family===true,accessibility:parsed.trip.accessibility===true });
      if(parsed.preparationChecked&&typeof parsed.preparationChecked==='object')setPreparationChecked(Object.fromEntries(Object.entries(parsed.preparationChecked).filter(([,v])=>typeof v==='boolean')));
      if (Array.isArray(parsed.tasks)) setTasks(parsed.tasks.filter(t=>typeof t?.id==='string'&&typeof t.labelEs==='string'&&typeof t.labelEn==='string'&&typeof t.done==='boolean'));
      if (typeof parsed.spentUSD === 'number' && Number.isFinite(parsed.spentUSD) && parsed.spentUSD >= 0) setSpentUSD(parsed.spentUSD);
      if (Array.isArray(parsed.expenses)) setExpenses(parsed.expenses);
    } catch {
      // Local storage is an enhancement; the page remains usable without it.
    }
  }, []);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  useEffect(()=>{
    const update=()=>setToday(costaRicaDate());
    const timer=window.setInterval(update,60_000);
    document.addEventListener('visibilitychange',update);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',update);};
  },[]);
  useEffect(()=>{
    if(isPreparationRegion(contextRegion)||isPreparationActivity(contextActivity))setTrip(prev=>({...prev,...(isPreparationRegion(contextRegion)?{region:contextRegion}:{}),...(isPreparationActivity(contextActivity)?{activity:contextActivity}:{})}));
  },[contextRegion,contextActivity]);
  const persistWorkspace=()=>{
    const raw=JSON.stringify({trip,tasks,spentUSD,expenses,preparationChecked});
    const written=setPersonalItemInScope(scopeSnapshot,STORAGE_KEY,raw)&&isStorageScopeCurrent(scopeSnapshot)&&getPersonalItem(STORAGE_KEY)===raw;
    setStorageAvailable(written);return written;
  };
  useEffect(()=>{
    const timer=window.setTimeout(()=>persistWorkspace(),250);
    return()=>window.clearTimeout(timer);
  },[trip,tasks,spentUSD,expenses,preparationChecked]);
  const profile=useMemo<PreparationProfile>(()=>({region:trip.region,activity:trip.activity,startDate:trip.startDate,endDate:trip.endDate,family:trip.family,accessibility:trip.accessibility}),[trip.region,trip.activity,trip.startDate,trip.endDate,trip.family,trip.accessibility]);
  const smartTasks=useMemo(()=>[...preparationTasks(profile,today),...packingTasks(profile)],[profile,today]);
  const contextKey=preparationContext(profile);
  const completed=tasks.filter(task=>task.done).length;
  const smartCompleted=smartTasks.filter(task=>preparationChecked[contextKey+'|'+task.id]).length;
  const progress=Math.round((completed+smartCompleted)/(tasks.length+smartTasks.length)*100);
  const manualProgress=tasks.length?Math.round(completed/tasks.length*100):0;
  const upcomingBookings=useMemo(()=>bookings.filter(booking=>civilDay(booking?.date||'')!==null).sort((a,b)=>civilDay(a.date)!-civilDay(b.date)!),[bookings]);
  const nextBooking=upcomingBookings.find(booking=>civilDay(booking.date)!>=civilDay(today)!);
  const timing=tripTiming(trip.startDate,trip.endDate,today);
  const countdown=timing.countdown;
  const tripDay=timing.day;
  const chooseContext=(field:'region'|'activity',value:string)=>{
    setTrip(prev=>({...prev,[field]:value}));
    setParams(previous=>{const next=new URLSearchParams(previous);if(value==='all')next.delete(field);else next.set(field,value);return next;},{replace:true});
  };

  const converted = targetRate ? formatAmount(usdAmount * targetRate, targetCurrency, language) : '';
  const conversionNote = rateNote(targetCurrency, language, rates);

  const refreshRate = async () => {
    setRateStatus('loading');
    const live = rateFor(targetCurrency, await loadExchangeRates(true));
    setRateStatus(live ? 'live' : 'fallback');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task => task.id === id ? { ...task, done: !task.done } : task));
  };

  const resetTasks = () => setTasks(defaultTasks.map(task => ({ ...task, done: false })));

  const addExpense = () => {
    const amount = Math.round(Number(expenseAmountDraft) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {setExpenseError(true);return;}
    setExpenseError(false);
    const expense = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label: expenseDraft.trim() || (es ? 'Gasto de viaje' : 'Travel expense'), amount: Math.round(amount * 100) / 100 };
    setExpenses(prev => [expense, ...prev]);
    setSpentUSD(prev => Math.round((prev + amount) * 100) / 100);
    setExpenseAmountDraft('');
    setExpenseDraft('');
  };

  const removeExpense = (id: string) => {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;
    setExpenses(prev => prev.filter(item => item.id !== id));
    setSpentUSD(prev => Math.max(0, Math.round((prev - expense.amount) * 100) / 100));
  };

  const remainingBudget = Math.max(0, trip.budgetUSD - spentUSD);
  const budgetProgress = trip.budgetUSD > 0 ? Math.min(100, Math.round((spentUSD / trip.budgetUSD) * 100)) : 0;

  const contextualMessage = timing.phase==='invalid'
    ? (es?'Revisa las fechas: el final no puede ser anterior al inicio.':'Review the dates: the end cannot precede the start.')
    : timing.phase==='completed' ? (es?'La fecha de regreso ya pasó. Conserva tus notas o ajusta el próximo plan.':'The return date has passed. Keep your notes or adjust the next plan.')
    : timing.phase==='return_unknown' ? (es?'La salida ya pasó. Añade una fecha de finalización para mostrar la fase del viaje.':'Departure has passed. Add an end date to show the trip phase.')
    : tripDay!==null ? (es?`Día ${tripDay}: revisa agenda, accesos y conexiones.`:`Day ${tripDay}: review your agenda, access and connections.`)
    : countdown!==null&&countdown<=7 ? (es?'La salida está cerca: prioriza documentos, accesos y traslados.':'Departure is near: prioritize documents, access and transfers.')
    : countdown!==null ? (es?`Faltan ${countdown} días para salir. Revisa los pendientes de tu plan.`:`Departure is in ${countdown} days. Review your preparation checklist.`)
    : (es?'Define fecha, región y actividad para adaptar tu preparación.':'Set your date, region and activity to adapt your preparation.');

  const addNote = () => {
    const value = noteDraft.trim();
    if (!value) return;
    const merged = trip.note.trim() ? `${trip.note.trim()}\n• ${value}` : `• ${value}`;
    setTrip(prev => ({ ...prev, note: merged }));
    setNoteDraft('');
  };

  const saveNow=()=>{const success=persistWorkspace();setSaved(success);if(success)window.setTimeout(()=>setSaved(false),1800);};

  const quickActions = [
    { icon: Compass, title: es ? 'Explorar experiencias' : 'Explore experiences', text: es ? 'Encuentra qué hacer' : 'Find things to do', path: '/tours' },
    { icon: MapPinned, title: es ? 'Mapa inteligente' : 'Smart map', text: es ? 'Ubica regiones y rutas' : 'Regions and routes', path: '/map' },
    { icon: Plane, title: es ? 'Vuelos' : 'Flights', text: es ? 'Consulta tus conexiones' : 'Check your connections', path: '/flights' },
    { icon: HeartPulse, title: es ? 'Ayuda y herramientas' : 'Help & tools', text: es ? 'Prepárate para el día' : 'Prepare for the day', path: '/tools' },
    { icon: FileText, title: es ? 'Mis reservas' : 'My bookings', text: es ? 'Consulta tus próximas reservas' : 'Review your upcoming bookings', path: '#bookings' }
  ];

  return (
    <main className="min-h-screen bg-[#041711] text-stone-100 px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-emerald-400/20 bg-gradient-to-br from-[#0a2a1d] via-[#071d15] to-[#041711] p-6 sm:p-9">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 text-emerald-200 text-[10px] font-black uppercase tracking-[0.2em]">
                <Sparkles size={13} />
                {es ? 'Traveler OS' : 'Traveler OS'}
              </div>
              <h1 className="mt-4 text-4xl sm:text-6xl font-black tracking-tight text-white">
                {es ? 'Tu centro de mando para viajar' : 'Your travel command center'}
              </h1>
              <p className="mt-4 text-stone-300 max-w-2xl leading-relaxed">
                {es
                  ? 'Guarda tu plan, controla pendientes, consulta herramientas y vuelve aquí cada día para saber qué hacer antes y durante tu viaje.'
                  : 'Save your plan, track what is pending, use practical tools and return here each day to know what to do before and during your trip.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onOpenTripBuilder} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 text-stone-950 px-4 py-3 font-black hover:bg-emerald-300 transition-colors">
                <Sparkles size={17} />
                {es ? 'Diseñar viaje con IA' : 'Design trip with AI'}
              </button>
              <button type="button" onClick={saveNow} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-black text-white hover:bg-white/10 transition-colors">
                {saved ? <Check size={17} /> : <Save size={17} />}
                {saved ? (es ? 'Guardado' : 'Saved') : (es ? 'Guardar ahora' : 'Save now')}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-amber-300/15 bg-amber-300/[0.03] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3"><div className="w-11 h-11 rounded-2xl bg-amber-300/10 border border-amber-300/10 flex items-center justify-center"><BellRing size={18} className="text-amber-200"/></div><div><div className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-200">{es ? 'Briefing inteligente' : 'Smart briefing'}</div><div className="mt-1 text-base sm:text-lg font-black text-white">{contextualMessage}</div></div></div>
            {nextBooking && <button type="button" onClick={onOpenBookings} className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black text-white hover:bg-white/10">{es ? 'Ver próxima reserva' : 'View next booking'} <ArrowRight size={14}/></button>}
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-emerald-300 text-xs font-bold"><CalendarDays size={15}/>{es ? 'Salida' : 'Departure'}</div><div className="mt-2 text-xl font-black">{trip.startDate || (es ? 'Aún no definida' : 'Not set yet')}</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-amber-300 text-xs font-bold"><Clock3 size={15}/>{es ? 'Cuenta regresiva' : 'Countdown'}</div><div className="mt-2 text-xl font-black">{countdown === null ? '—' : countdown > 0 ? `${countdown} ${es ? 'días' : 'days'}` : countdown === 0 ? (es ? 'Hoy' : 'Today') : (timing.phase==='completed'?(es?'Finalizado':'Completed'):timing.phase==='return_unknown'?(es?'Revisar fechas':'Review dates'):(es?'En curso':'In progress'))}</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-sky-300 text-xs font-bold"><Users size={15}/>{es ? 'Viajeros' : 'Travelers'}</div><div className="mt-2 text-xl font-black">{trip.travelers}</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-violet-300 text-xs font-bold"><ClipboardCheck size={15}/>{es ? 'Preparación personal' : 'Personal preparation'}</div><div className="mt-2 text-xl font-black">{progress}%</div></div>
        </section>

        <div className="grid lg:grid-cols-[1.35fr_0.65fr] gap-6">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-[#071c14] p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-black uppercase tracking-[0.18em]"><Navigation size={15}/>{es ? 'Mi viaje' : 'My trip'}</div>
                  <h2 className="mt-1 text-2xl font-black text-white">{es ? 'Plan personal' : 'Personal plan'}</h2>
                </div>
                <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border ${isOnline ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/20 bg-amber-400/10 text-amber-100'}`}>
                  {isOnline ? <Wifi size={14}/> : <WifiOff size={14}/>}
                  {storageAvailable===false?(es?'Guardado no disponible':'Saving unavailable'):isOnline?(es?'Plan en este dispositivo':'Plan on this device'):(es?'Sin conexión':'Offline')}
                </div>
              </div>

              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{es ? 'Nombre o referencia del viaje' : 'Trip name or reference'}</span><input value={trip.destination} onChange={e=>setTrip(p=>({...p,destination:e.target.value}))} className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder={es ? 'Costa Rica' : 'Costa Rica'} /></label>
                <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{es ? 'Fecha de inicio (Costa Rica)' : 'Start date (Costa Rica)'}</span><input type="date" value={trip.startDate} onChange={e=>setTrip(p=>({...p,startDate:e.target.value}))} className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400" /></label>
                <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{es ? 'Número de viajeros' : 'Travelers'}</span><input type="number" min={1} max={30} value={trip.travelers} onChange={e=>setTrip(p=>({...p,travelers:Math.max(1,Math.min(30,Number(e.target.value)||1))}))} className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400" /></label>
                <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{es ? 'Presupuesto estimado (USD)' : 'Estimated budget (USD)'}</span><input type="number" min={0} value={trip.budgetUSD || ''} onChange={e=>setTrip(p=>({...p,budgetUSD:Math.max(0,Number(e.target.value)||0)}))} className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="0" /></label>
                <label className="space-y-2"><span className="text-xs font-semibold text-stone-300">{es?'Fecha de regreso / finalización':'Return / end date'}</span><input id="trip-end-date" type="date" value={trip.endDate} min={trip.startDate||undefined} onChange={e=>setTrip(p=>({...p,endDate:e.target.value}))} className="w-full rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-white"/></label>
                <label className="space-y-2"><span className="text-xs font-semibold text-stone-300">{es?'Región principal':'Main region'}</span><select id="trip-region" value={trip.region} onChange={e=>chooseContext('region',e.target.value)} className="w-full rounded-2xl border border-white/20 bg-[#0c2c1f] px-4 py-3 text-white"><option value="all">{es?'Por definir':'Not set'}</option>{PREPARATION_REGIONS.map(region=><option key={region} value={region}>{regionLabel(region,language)}</option>)}</select></label>
                <label className="space-y-2"><span className="text-xs font-semibold text-stone-300">{es?'Actividad principal':'Main activity'}</span><select id="trip-activity" value={trip.activity} onChange={e=>chooseContext('activity',e.target.value)} className="w-full rounded-2xl border border-white/20 bg-[#0c2c1f] px-4 py-3 text-white"><option value="all">{es?'Por definir':'Not set'}</option>{PREPARATION_ACTIVITIES.map(activity=><option key={activity} value={activity}>{activityLabel(activity,language)}</option>)}</select></label>
                <div className="space-y-3 text-sm text-stone-200"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={trip.family} onChange={e=>setTrip(p=>({...p,family:e.target.checked}))} className="h-5 w-5 accent-amber-300"/>{es?'Incluir preguntas para viajar con menores':'Include questions for travel with children'}</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={trip.accessibility} onChange={e=>setTrip(p=>({...p,accessibility:e.target.checked}))} className="h-5 w-5 accent-amber-300"/>{es?'Incluir preguntas de accesibilidad':'Include accessibility questions'}</label></div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-stone-300">{scopeSnapshot.uid?(es?'Este plan pertenece a tu cuenta en este dispositivo; cerrar sesión limpia sus datos locales.':'This plan belongs to your account on this device; signing out clears its local data.'):(es?'Sin iniciar sesión, el plan dura esta sesión del navegador. Copia el resumen antes de cerrar.':'While signed out, the plan lasts for this browser session. Copy the summary before closing.')}</p>
              {timing.phase==='invalid'&&<p role="alert" className="mt-3 text-sm text-amber-200">{contextualMessage}</p>}
              {storageAvailable===false&&<p role="alert" className="mt-3 text-sm text-amber-200">{es?'El navegador no permitió guardar los cambios. Conserva una copia del resumen antes de salir.':'The browser did not allow saving changes. Keep a copy of the summary before leaving.'}</p>}
            </section>
            <TripPreparationPanel language={language} profile={profile} tasks={smartTasks} checked={preparationChecked} onCheckedChange={setPreparationChecked} today={today}/>

            <section className="rounded-[2rem] border border-white/10 bg-[#071c14] p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-[0.18em]"><ClipboardCheck size={15}/>{es ? 'Panel diario' : 'Daily board'}</div>
                  <h2 className="mt-1 text-2xl font-black text-white">{es ? 'Pendientes generales' : 'General checklist'}</h2>
                </div>
                <button type="button" onClick={resetTasks} className="inline-flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-white"><RefreshCw size={14}/>{es ? 'Reiniciar' : 'Reset'}</button>
              </div>
              <div className="mt-5 h-2 rounded-full bg-black/30 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${manualProgress}%` }} className="h-full bg-emerald-400 rounded-full" /></div>
              <div className="mt-2 text-[11px] text-stone-500">{completed}/{tasks.length} {es ? 'tareas completadas' : 'tasks completed'}</div>
              <div className="mt-5 grid sm:grid-cols-2 gap-2">
                {tasks.map(task => (
                  <button key={task.id} type="button" onClick={()=>toggleTask(task.id)} aria-pressed={task.done} className={`text-left flex items-start gap-3 p-3 rounded-2xl border transition-colors ${task.done ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-white/5 bg-black/10 hover:bg-white/[0.04]'}`}>
                    <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${task.done ? 'border-emerald-300 bg-emerald-300 text-stone-950' : 'border-stone-600 text-transparent'}`}><Check size={12}/></span>
                    <span className={`text-sm leading-relaxed ${task.done ? 'text-stone-500 line-through' : 'text-stone-200'}`}>{es ? task.labelEs : task.labelEn}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#071c14] p-5 sm:p-7">
              <div className="flex items-center gap-2 text-sky-300 text-xs font-black uppercase tracking-[0.18em]"><StickyNote size={15}/>{es ? 'Memoria del viajero' : 'Traveler memory'}</div>
              <div className="mt-3 flex gap-2">
                <input aria-label={es ? 'Añadir nota al viaje' : 'Add trip note'} value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addNote()} className="min-w-0 flex-1 rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-sky-300" placeholder={es ? 'Guarda una idea, dirección, restaurante o pendiente…' : 'Save an idea, address, restaurant or task…'} />
                <button type="button" onClick={addNote} aria-label={es ? 'Guardar nota' : 'Save note'} className="w-12 rounded-2xl bg-sky-300 text-stone-950 flex items-center justify-center"><Plus size={18}/></button>
              </div>
              <textarea aria-label={es ? 'Notas privadas del viaje' : 'Private trip notes'} value={trip.note} onChange={e=>setTrip(p=>({...p,note:e.target.value}))} rows={6} className="mt-3 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-sm leading-relaxed text-stone-200 outline-none focus:border-sky-300" placeholder={es ? 'Notas privadas para tu plan actual.' : 'Private notes for your current plan.'} />
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-white/[0.02] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-black uppercase tracking-[0.18em]"><WalletCards size={15}/>{es ? 'Conversor rápido' : 'Quick converter'}</div>
              <div className="mt-2 text-2xl font-black text-white">{`USD → ${targetCurrency}`}</div>
              <div className="mt-4"><input aria-label={es ? 'Convertir monto en USD' : 'Convert USD amount'} type="number" min={0} value={usdAmount} onChange={e=>setUsdAmount(Math.max(0,Number(e.target.value)||0))} className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-300" /></div>
              <div className="mt-3 rounded-2xl bg-black/20 p-4"><div className="text-xs text-stone-500">USD</div><div data-testid="converter-usd" className="text-2xl font-black text-emerald-200">{formatUSD(usdAmount, 2)}</div><div className="my-2 text-stone-700">↓</div><div className="text-xs text-stone-500">{targetCurrency}</div><div data-testid="converter-result" className="text-2xl font-black text-white">{converted ? `≈ ${converted}` : '—'}</div>{conversionNote && <div className="mt-2 text-[11px] text-stone-400">{conversionNote}</div>}</div>
              {!targetRate && <p role="status" aria-live="polite" className="mt-3 text-xs leading-relaxed text-amber-200/90">
                {rateStatus === 'loading'
                  ? (es ? 'Consultando el tipo de cambio…' : 'Checking the exchange rate…')
                  : (es
                    ? `No se pudo verificar el tipo de cambio para ${targetCurrency}. No mostramos una conversión estimada; los precios se muestran en USD.`
                    : `The ${targetCurrency} exchange rate could not be verified. We do not show an estimate; prices are shown in USD.`)}
              </p>}
              <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500"><span>1 USD = {targetRate ? targetRate.toLocaleString(targetCurrency === 'CRC' || es ? 'es-CR' : 'en-US', { maximumFractionDigits: targetRate < 10 ? 4 : 2 }) : '—'} {targetCurrency}</span><button type="button" onClick={refreshRate} aria-label={es ? 'Actualizar tipo de cambio' : 'Refresh exchange rate'} className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white">{rateStatus==='loading'?<RefreshCw size={13} className="animate-spin"/>:<RefreshCw size={13}/>} {rateStatus==='live'?(es?'Actualizado':'Updated'):rateStatus==='fallback'?(es?'Reintentar':'Retry'):(es?'Actualizar':'Refresh')}</button></div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#071c14] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-[0.18em]"><BellRing size={15}/>{es ? 'Atajos útiles' : 'Useful shortcuts'}</div>
              <div className="mt-4 space-y-2">
                {quickActions.map(action => { const Icon = action.icon; return <button key={action.path} type="button" onClick={()=> action.path === '#bookings' ? onOpenBookings?.() : navigate(action.path)} className="w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-black/10 hover:bg-white/[0.04] border border-white/5 transition-colors"><span className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"><Icon size={17} className="text-amber-200"/></span><span className="flex-1 min-w-0"><span className="block text-sm font-black text-white">{action.title}</span><span className="block text-[11px] text-stone-500">{action.text}</span></span><ArrowRight size={14} className="text-stone-600"/></button>; })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#071c14] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-black uppercase tracking-[0.18em]"><WalletCards size={15}/>{es ? 'Presupuesto' : 'Budget'}</div>
              <div className="mt-2 text-2xl font-black text-white">{trip.budgetUSD > 0 ? `${spentUSD.toFixed(2)} / ${trip.budgetUSD.toFixed(2)}` : (es ? 'Añade un presupuesto en tu plan' : 'Add a budget to your plan')}</div>
              {trip.budgetUSD > 0 && <div className="mt-4 h-2 rounded-full bg-black/30 overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${budgetProgress}%`}} className="h-full bg-cyan-300 rounded-full"/></div>}
              {trip.budgetUSD > 0 && <div className="mt-2 text-[11px] text-stone-500">{es ? `Disponible: ${remainingBudget.toFixed(2)} · ${budgetProgress}% usado` : `Remaining: ${remainingBudget.toFixed(2)} · ${budgetProgress}% used`}</div>}
              {trip.budgetUSD>0&&spentUSD>trip.budgetUSD&&<p role="status" data-testid="budget-overrun" className="mt-3 text-sm text-amber-200">{es?'Presupuesto superado por':'Budget exceeded by'} US${(spentUSD-trip.budgetUSD).toFixed(2)}</p>}
              <div className="mt-4 grid grid-cols-[1fr_90px_auto] gap-2">
                <input aria-label={es ? 'Descripción del gasto' : 'Expense description'} value={expenseDraft} onChange={e=>setExpenseDraft(e.target.value)} className="min-w-0 rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300" placeholder={es ? 'Gasto' : 'Expense'} />
                <input aria-label={es ? 'Monto del gasto en USD' : 'Expense amount in USD'} inputMode="decimal" value={expenseAmountDraft} onChange={e=>setExpenseAmountDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addExpense()} className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300" placeholder="USD" />
                <button type="button" onClick={addExpense} aria-label={es ? 'Añadir gasto' : 'Add expense'} className="rounded-xl bg-cyan-300 text-stone-950 px-3 font-black text-xs">+</button>
              </div>
              {expenseError&&<p role="alert" className="mt-3 text-xs text-amber-200">{es?'Introduce un gasto entre 0,01 y 10.000.000 USD.':'Enter an expense between 0.01 and 10,000,000 USD.'}</p>}
              {expenses.length > 0 && <div className="mt-4 space-y-2 max-h-44 overflow-auto pr-1">{expenses.map(expense => <div key={expense.id} className="flex items-center gap-2 rounded-xl bg-black/15 border border-white/5 px-3 py-2"><span className="flex-1 min-w-0 truncate text-xs text-stone-300">{expense.label}</span><span className="text-xs font-black text-cyan-200">${expense.amount.toFixed(2)}</span><button type="button" onClick={() => removeExpense(expense.id)} aria-label={es ? 'Eliminar gasto' : 'Remove expense'} className="text-stone-600 hover:text-white"><Trash2 size={13}/></button></div>)}</div>}
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#071c14] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-violet-300 text-xs font-black uppercase tracking-[0.18em]"><ShieldCheck size={15}/>{es ? 'Modo de viaje' : 'Travel mode'}</div>
              <p className="mt-3 text-sm text-stone-400 leading-relaxed">{es ? 'Usa este panel como lista viva: marca lo que completas, guarda información importante y vuelve a consultarlo durante el viaje.' : 'Use this panel as a living checklist: mark what you complete, save important information and return here throughout your trip.'}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3"><Luggage size={15} className="text-violet-200"/><div className="mt-2 font-bold text-stone-200">{es ? 'Equipaje' : 'Packing'}</div></div>
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3"><FileText size={15} className="text-violet-200"/><div className="mt-2 font-bold text-stone-200">{es ? 'Documentos' : 'Documents'}</div></div>
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3"><Cloud size={15} className="text-violet-200"/><div className="mt-2 font-bold text-stone-200">{es ? 'Clima' : 'Weather'}</div></div>
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3"><Activity size={15} className="text-violet-200"/><div className="mt-2 font-bold text-stone-200">{es ? 'Actividad' : 'Activity'}</div></div>
              </div>
            </section>
          </aside>
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-[#071c14] p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOnline ? 'bg-emerald-400/10' : 'bg-amber-400/10'}`}>{isOnline ? <Wifi className="text-emerald-300" size={18}/> : <WifiOff className="text-amber-300" size={18}/>}</div>
            <div><div className="font-black text-white">{isOnline ? (storageAvailable===false?(es?'Revisa el guardado de tu plan':'Check plan saving'):(es?'Tu espacio personal de viaje':'Your personal trip workspace')) : (es ? 'Estás en modo offline' : 'You are offline')}</div><div className="text-sm text-stone-500">{es ? 'La información introducida en este panel puede seguir disponible aunque pierdas conexión.' : 'Information entered here can remain available even when connectivity is lost.'}</div></div>
          </div>
          <button type="button" onClick={saveNow} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/15 px-5 py-3 font-black text-white border border-white/10"><Save size={16}/>{es ? 'Guardar mi centro de viaje' : 'Save my travel center'}</button>
        </section>
      </div>
    </main>
  );
};

// Remonta al cambiar de identidad: el estado en memoria nunca pasa a otra persona.
export const TravelerOSPage = withStorageScope(TravelerOSPageComponent);
