import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CloudSun, Droplets, MapPin, Sparkles, Sun, Waves } from 'lucide-react';
import { Language } from '../types';
import { REGIONS } from '../data/toursData';

interface DestinationPulseProps { language: Language; onSelectRegion: (regionId: string) => void; }
type PulseCard = { id: string; regionId: string; nameEs: string; nameEn: string; tempC: number; humidity: number; moodEs: string; moodEn: string; image: string; };
type Weather = { temperatureC: number; humidity: number; precipitationProbability: number; labelEs: string; labelEn: string; source: string; };

const PULSE_CARDS: PulseCard[] = [
  { id: 'sjo', regionId: 'sjo', nameEs: 'San José', nameEn: 'San José', tempC: 22, humidity: 76, moodEs: 'Fresco de ciudad', moodEn: 'Fresh city air', image: REGIONS.find(r => r.id === 'sjo')?.image || '' },
  { id: 'caribe', regionId: 'caribe_sur', nameEs: 'Cahuita', nameEn: 'Cahuita', tempC: 29, humidity: 82, moodEs: 'Calor caribeño', moodEn: 'Caribbean warmth', image: REGIONS.find(r => r.id === 'caribe_sur')?.image || '' },
  { id: 'carara', regionId: 'manuel_antonio', nameEs: 'Parque Nacional Carara', nameEn: 'Carara National Park', tempC: 30, humidity: 84, moodEs: 'Sendero tropical', moodEn: 'Tropical trails', image: REGIONS.find(r => r.id === 'manuel_antonio')?.image || '' },
  { id: 'celeste', regionId: 'arenal', nameEs: 'Río Celeste', nameEn: 'Rio Celeste', tempC: 22, humidity: 90, moodEs: 'Selva y cataratas', moodEn: 'Rainforest & waterfalls', image: REGIONS.find(r => r.id === 'arenal')?.image || '' },
  { id: 'hermosa', regionId: 'guanacaste', nameEs: 'Playa Hermosa', nameEn: 'Playa Hermosa', tempC: 31, humidity: 68, moodEs: 'Brisa del Pacífico', moodEn: 'Pacific breeze', image: REGIONS.find(r => r.id === 'guanacaste')?.image || '' }
];

export const DestinationPulse: React.FC<DestinationPulseProps> = ({ language, onSelectRegion }) => {
  const [activeId, setActiveId] = useState(PULSE_CARDS[0].id);
  const [liveWeather, setLiveWeather] = useState<Record<string, Weather>>({});
  const es = language === 'es';

  useEffect(() => {
    fetch('/api/weather/destinations')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('weather unavailable')))
      .then(data => {
        const next: Record<string, Weather> = {};
        for (const item of data.destinations || []) next[item.regionId] = item;
        setLiveWeather(next);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveId(current => {
        const index = PULSE_CARDS.findIndex(card => card.id === current);
        return PULSE_CARDS[(index + 1) % PULSE_CARDS.length].id;
      });
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  const active = useMemo(() => PULSE_CARDS.find(c => c.id === activeId) || PULSE_CARDS[0], [activeId]);

  return (
    <section className="relative overflow-hidden bg-[#061b13] py-12 sm:py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,197,94,0.15),transparent_32%),radial-gradient(circle_at_85%_75%,rgba(14,165,233,0.12),transparent_34%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200"><Sparkles className="h-3.5 w-3.5" />Costa Rica Pulse</div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">{es ? 'Elige tu clima. Elige tu experiencia.' : 'Choose your climate. Choose your experience.'}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/65">{es ? 'Destinos reales, imágenes inmersivas y clima actualizado para inspirarte antes de reservar.' : 'Real destinations, immersive imagery and updated weather to inspire your next booking.'}</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-200/65"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />{Object.keys(liveWeather).length ? (es ? 'Clima en vivo · ' + (liveWeather[active.regionId]?.source || 'Open-Meteo') : 'Live weather · ' + (liveWeather[active.regionId]?.source || 'Open-Meteo')) : (es ? 'Actualizando clima…' : 'Updating weather…')}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PULSE_CARDS.map((card, index) => {
            const selected = card.id === activeId;
            const weather = liveWeather[card.regionId];
            const temp = Math.round(weather?.temperatureC ?? card.tempC);
            const humidity = Math.round(weather?.humidity ?? card.humidity);
            const rain = Math.round(weather?.precipitationProbability ?? 0);
            const cardClass = 'group relative h-[172px] overflow-hidden rounded-[24px] border text-left shadow-2xl transition-all duration-300 sm:h-[190px] ' + (selected ? 'border-emerald-300/80 ring-2 ring-emerald-300/20' : 'border-white/10 hover:border-white/25');

            return (
              <motion.button key={card.id} type="button" layout whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.985 }} onClick={() => setActiveId(card.id)} className={cardClass} aria-label={es ? 'Ver ' + card.nameEs : 'View ' + card.nameEn}>
                <img src={card.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/90" />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                  <div className="flex items-center gap-1.5 rounded-full bg-black/30 px-2 py-1 text-[10px] font-bold text-white/80 backdrop-blur-md"><MapPin className="h-3 w-3 text-emerald-300" />Costa Rica</div>
                  {index === 0 && <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md">Capital</span>}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0"><div className="text-xl font-black leading-none text-white sm:text-2xl">{es ? card.nameEs : card.nameEn}</div><div className="mt-1.5 text-xs font-medium text-white/75">{weather ? (es ? weather.labelEs : weather.labelEn) : (es ? card.moodEs : card.moodEn)}</div></div>
                    <div className="shrink-0 text-right"><div className="text-4xl font-black leading-none tracking-tight text-white">{temp}°</div><div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/60">{humidity}% · {rain}% {es ? 'lluvia' : 'rain'}</div></div>
                  </div>
                </div>
                {selected && <motion.div key={activeId} className="absolute bottom-0 left-0 h-1 bg-emerald-300" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 5.2, ease: 'linear' }} />}
              </motion.button>
            );
          })}
        </div>

        <motion.div key={active.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 grid grid-cols-1 gap-4 rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl sm:p-6 lg:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-200/55"><CloudSun className="h-4 w-4" />{es ? 'Condición' : 'Condition'}</div><div className="mt-1 font-bold text-white">{liveWeather[active.regionId] ? (es ? liveWeather[active.regionId].labelEs : liveWeather[active.regionId].labelEn) : (es ? active.moodEs : active.moodEn)}</div></div>
            <div><div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-200/55"><Droplets className="h-4 w-4" />{es ? 'Humedad' : 'Humidity'}</div><div className="mt-1 font-bold text-white">{Math.round(liveWeather[active.regionId]?.humidity ?? active.humidity)}%</div></div>
            <div><div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-200/55"><Sun className="h-4 w-4" />{es ? 'Temperatura' : 'Temperature'}</div><div className="mt-1 font-bold text-white">{Math.round(liveWeather[active.regionId]?.temperatureC ?? active.tempC)}°C</div></div>
            <div><div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-200/55"><Waves className="h-4 w-4" />{es ? 'Ambiente' : 'Vibe'}</div><div className="mt-1 font-bold text-white">{es ? active.moodEs : active.moodEn}</div></div>
          </div>
          <button type="button" onClick={() => onSelectRegion(active.regionId)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-black text-[#041711] transition-colors hover:bg-emerald-200">{es ? 'Explorar destino' : 'Explore destination'}<ArrowRight className="h-4 w-4" /></button>
        </motion.div>
      </div>
    </section>
  );
};