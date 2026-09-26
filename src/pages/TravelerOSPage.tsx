import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, BellRing, CalendarDays, Check,
  ClipboardCheck, Cloud, Compass, FileText, HeartPulse, Luggage,
  MapPinned, Navigation, Plus, RefreshCw, Save,
  ShieldCheck, Sparkles, StickyNote, WalletCards, Wifi,
  WifiOff, Clock3, Plane, Users
} from 'lucide-react';
import type { Language } from '../types';
import { fetchLiveExchangeRate, getUsdToCrcRate } from '../utils/currencies';

interface TravelerOSPageProps {
  language: Language;
  onOpenTripBuilder?: () => void;
  onOpenBookings?: () => void;
}

type Task = {
  id: string;
  labelEs: string;
  labelEn: string;
  done: boolean;
  category: 'before' | 'during' | 'documents' | 'packing';
};

type SavedTrip = {
  destination: string;
  startDate: string;
  travelers: number;
  budgetUSD: number;
  note: string;
};

const STORAGE_KEY = 'crt_traveler_os_v1';

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
  destination: 'Costa Rica',
  startDate: '',
  travelers: 2,
  budgetUSD: 0,
  note: ''
};

export const TravelerOSPage: React.FC<TravelerOSPageProps> = ({
  language,
  onOpenTripBuilder,
  onOpenBookings
}) => {
  const es = language === 'es';
  const navigate = useNavigate();
  const [trip, setTrip] = useState<SavedTrip>(initialTrip);
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [noteDraft, setNoteDraft] = useState('');
  const [usdAmount, setUsdAmount] = useState(100);
  const [crcRate, setCrcRate] = useState(getUsdToCrcRate());
  const [rateStatus, setRateStatus] = useState<'idle' | 'loading' | 'live' | 'fallback'>('idle');
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { trip?: SavedTrip; tasks?: Task[] };
      if (parsed.trip) setTrip({ ...initialTrip, ...parsed.trip });
      if (Array.isArray(parsed.tasks)) setTasks(parsed.tasks);
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ trip, tasks }));
      } catch {
        // Ignore storage quota/privacy restrictions.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [trip, tasks]);

  const completed = tasks.filter(task => task.done).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const today = new Date();
  const countdown = useMemo(() => {
    if (!trip.startDate) return null;
    const start = new Date(`${trip.startDate}T12:00:00`);
    if (Number.isNaN(start.getTime())) return null;
    return Math.ceil((start.getTime() - new Date().getTime()) / 86400000);
  }, [trip.startDate]);

  const crcValue = crcRate > 0 ? Math.round(usdAmount * crcRate) : 0;

  const refreshRate = async () => {
    setRateStatus('loading');
    const live = await fetchLiveExchangeRate();
    if (live > 0) {
      setCrcRate(live);
      setRateStatus('live');
    } else {
      setRateStatus('fallback');
    }
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task => task.id === id ? { ...task, done: !task.done } : task));
  };

  const resetTasks = () => setTasks(defaultTasks.map(task => ({ ...task, done: false })));

  const addNote = () => {
    const value = noteDraft.trim();
    if (!value) return;
    const merged = trip.note.trim() ? `${trip.note.trim()}\n• ${value}` : `• ${value}`;
    setTrip(prev => ({ ...prev, note: merged }));
    setNoteDraft('');
  };

  const saveNow = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ trip, tasks }));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setSaved(false);
    }
  };

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

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-emerald-300 text-xs font-bold"><CalendarDays size={15}/>{es ? 'Salida' : 'Departure'}</div><div className="mt-2 text-xl font-black">{trip.startDate || (es ? 'Aún no definida' : 'Not set yet')}</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-amber-300 text-xs font-bold"><Clock3 size={15}/>{es ? 'Cuenta regresiva' : 'Countdown'}</div><div className="mt-2 text-xl font-black">{countdown === null ? '—' : countdown > 0 ? `${countdown} ${es ? 'días' : 'days'}` : countdown === 0 ? (es ? 'Hoy' : 'Today') : (es ? 'En curso' : 'In progress')}</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-sky-300 text-xs font-bold"><Users size={15}/>{es ? 'Viajeros' : 'Travelers'}</div><div className="mt-2 text-xl font-black">{trip.travelers}</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-violet-300 text-xs font-bold"><ClipboardCheck size={15}/>{es ? 'Preparación' : 'Readiness'}</div><div className="mt-2 text-xl font-black">{progress}%</div></div>
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
                  {isOnline ? (es ? 'Conectado + guardado local' : 'Online + local save') : (es ? 'Modo offline' : 'Offline mode')}
                </div>
              </div>

              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{es ? 'Destino' : 'Destination'}</span><input value={trip.destination} onChange={e=>setTrip(p=>({...p,destination:e.target.value}))} className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder={es ? 'Costa Rica' : 'Costa Rica'} /></label>
                <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{es ? 'Fecha de inicio' : 'Start date'}</span><input type="date" value={trip.startDate} onChange={e=>setTrip(p=>({...p,startDate:e.target.value}))} className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400" /></label>
                <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{es ? 'Número de viajeros' : 'Travelers'}</span><input type="number" min={1} max={30} value={trip.travelers} onChange={e=>setTrip(p=>({...p,travelers:Math.max(1,Math.min(30,Number(e.target.value)||1))}))} className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400" /></label>
                <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{es ? 'Presupuesto estimado (USD)' : 'Estimated budget (USD)'}</span><input type="number" min={0} value={trip.budgetUSD || ''} onChange={e=>setTrip(p=>({...p,budgetUSD:Math.max(0,Number(e.target.value)||0)}))} className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="0" /></label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#071c14] p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-[0.18em]"><ClipboardCheck size={15}/>{es ? 'Panel diario' : 'Daily board'}</div>
                  <h2 className="mt-1 text-2xl font-black text-white">{es ? 'Pendientes del viaje' : 'Travel checklist'}</h2>
                </div>
                <button type="button" onClick={resetTasks} className="inline-flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-white"><RefreshCw size={14}/>{es ? 'Reiniciar' : 'Reset'}</button>
              </div>
              <div className="mt-5 h-2 rounded-full bg-black/30 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-emerald-400 rounded-full" /></div>
              <div className="mt-2 text-[11px] text-stone-500">{completed}/{tasks.length} {es ? 'tareas completadas' : 'tasks completed'}</div>
              <div className="mt-5 grid sm:grid-cols-2 gap-2">
                {tasks.map(task => (
                  <button key={task.id} type="button" onClick={()=>toggleTask(task.id)} className={`text-left flex items-start gap-3 p-3 rounded-2xl border transition-colors ${task.done ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-white/5 bg-black/10 hover:bg-white/[0.04]'}`}>
                    <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${task.done ? 'border-emerald-300 bg-emerald-300 text-stone-950' : 'border-stone-600 text-transparent'}`}><Check size={12}/></span>
                    <span className={`text-sm leading-relaxed ${task.done ? 'text-stone-500 line-through' : 'text-stone-200'}`}>{es ? task.labelEs : task.labelEn}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#071c14] p-5 sm:p-7">
              <div className="flex items-center gap-2 text-sky-300 text-xs font-black uppercase tracking-[0.18em]"><StickyNote size={15}/>{es ? 'Memoria del viajero' : 'Traveler memory'}</div>
              <div className="mt-3 flex gap-2">
                <input value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addNote()} className="flex-1 rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-sky-300" placeholder={es ? 'Guarda una idea, dirección, restaurante o pendiente…' : 'Save an idea, address, restaurant or task…'} />
                <button type="button" onClick={addNote} className="w-12 rounded-2xl bg-sky-300 text-stone-950 flex items-center justify-center"><Plus size={18}/></button>
              </div>
              <textarea value={trip.note} onChange={e=>setTrip(p=>({...p,note:e.target.value}))} rows={6} className="mt-3 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-sm leading-relaxed text-stone-200 outline-none focus:border-sky-300" placeholder={es ? 'Tus notas se guardan localmente en este dispositivo.' : 'Your notes are saved locally on this device.'} />
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-white/[0.02] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-black uppercase tracking-[0.18em]"><WalletCards size={15}/>{es ? 'Conversor rápido' : 'Quick converter'}</div>
              <div className="mt-2 text-2xl font-black text-white">{es ? 'USD → CRC' : 'USD → CRC'}</div>
              <div className="mt-4"><input type="number" min={0} value={usdAmount} onChange={e=>setUsdAmount(Math.max(0,Number(e.target.value)||0))} className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-300" /></div>
              <div className="mt-3 rounded-2xl bg-black/20 p-4"><div className="text-xs text-stone-500">USD</div><div className="text-2xl font-black text-emerald-200">{usdAmount.toLocaleString('en-US',{style:'currency',currency:'USD'})}</div><div className="my-2 text-stone-700">↓</div><div className="text-xs text-stone-500">CRC</div><div className="text-2xl font-black text-white">{crcValue ? `₡${crcValue.toLocaleString('es-CR')}` : '—'}</div></div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500"><span>1 USD = {crcRate > 0 ? crcRate.toFixed(2) : '—'} CRC</span><button type="button" onClick={refreshRate} className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white">{rateStatus==='loading'?<RefreshCw size={13} className="animate-spin"/>:<RefreshCw size={13}/>} {rateStatus==='live'?(es?'Actualizado':'Updated'):(es?'Actualizar':'Refresh')}</button></div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#071c14] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-[0.18em]"><BellRing size={15}/>{es ? 'Atajos útiles' : 'Useful shortcuts'}</div>
              <div className="mt-4 space-y-2">
                {quickActions.map(action => { const Icon = action.icon; return <button key={action.path} type="button" onClick={()=> action.path === '#bookings' ? onOpenBookings?.() : navigate(action.path)} className="w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-black/10 hover:bg-white/[0.04] border border-white/5 transition-colors"><span className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"><Icon size={17} className="text-amber-200"/></span><span className="flex-1 min-w-0"><span className="block text-sm font-black text-white">{action.title}</span><span className="block text-[11px] text-stone-500">{action.text}</span></span><ArrowRight size={14} className="text-stone-600"/></button>; })}
              </div>
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
            <div><div className="font-black text-white">{isOnline ? (es ? 'Tu plan está disponible y se guarda localmente' : 'Your plan is available and saved locally') : (es ? 'Estás en modo offline' : 'You are offline')}</div><div className="text-sm text-stone-500">{es ? 'La información introducida en este panel puede seguir disponible aunque pierdas conexión.' : 'Information entered here can remain available even when connectivity is lost.'}</div></div>
          </div>
          <button type="button" onClick={saveNow} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/15 px-5 py-3 font-black text-white border border-white/10"><Save size={16}/>{es ? 'Guardar mi centro de viaje' : 'Save my travel center'}</button>
        </section>
      </div>
    </main>
  );
};
