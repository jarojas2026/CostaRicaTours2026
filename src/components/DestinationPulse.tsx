import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CloudSun, Droplets, MapPin, Sparkles, Sun, Waves } from 'lucide-react';
import { Language } from '../types';
import { REGIONS } from '../data/toursData';

interface DestinationPulseProps {
  language: Language;
  onSelectRegion: (regionId: string) => void;
}

type PulseCard = {
  id: string;
  regionId: string;
  nameEs: string;
  nameEn: string;
  tempC: number;
  humidity: number;
  moodEs: string;
  moodEn: string;
  image: string;
};

type Weather = {
  temperatureC: number;
  apparentTemperatureC: number;
  humidity: number;
  precipitationProbability: number;
  windKmh: number;
  labelEs: string;
  labelEn: string;
  source: string;
};

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
    const controller = new AbortController();
    fetch('/api/weather/destinations', { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('weather unavailable')))
      .then(data => {
        const next: Record<string, Weather> = {};
        for (const item of data.destinations || []) next[item.regionId] = item;
        setLiveWeather(next);
      })
      .catch(() => {});
    return () => controller.abort();
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

  const active = useMemo(
    () => PULSE_CARDS.find(c => c.id === activeId) || PULSE_CARDS[0],
    [activeId]
  );

  return (
    <section className="relative overflow-hidden bg-[#dff5ff] py-10 sm:py-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(14,165,233,0.28),transparent_30%),radial-gradient(circle_at_90%_90%,rgba(16,185,129,0.22),transparent_35%)]" />
      <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-white/50 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-900/10 bg-white/65 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-950 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Costa Rica Pulse
            </div>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-sky-950 sm:text-5xl">
              {es ? 'Elige tu clima. Elige tu experiencia.' : 'Choose your climate. Choose your experience.'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-950/65">
              {es
                ? 'Una vista rápida y visual de los destinos, con clima actualizado para ayudarte a decidir dónde vivir tu próxima aventura.'
                : 'A quick visual view of destinations with updated weather to help you choose your next adventure.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start rounded-full bg-white/65 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-sky-950/65 shadow-sm backdrop-blur sm:self-auto">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {Object.keys(liveWeather).length
              ? (es ? 'Clima en vivo' : 'Live weather')
              : (es ? 'Actualizando clima' : 'Updating weather')}
          </div>
        </div>

        <div className="relative space-y-3 sm:space-y-4">
          <div className="absolute -left-2 top-0 hidden h-full w-1 rounded-full bg-sky-900/10 sm:block">
            <motion.div
              key={activeId}
              className="w-full rounded-full bg-sky-500"
              initial={{ height: 0 }}
              animate={{ height: '100%' }}
              transition={{ duration: 5.2, ease: 'linear' }}
            />
          </div>

          {PULSE_CARDS.map((card, index) => {
            const selected = card.id === activeId;
            const weather = liveWeather[card.regionId];
            const temp = Math.round(weather?.temperatureC ?? card.tempC);
            const feels = Math.round(weather?.apparentTemperatureC ?? temp);
            const humidity = Math.round(weather?.humidity ?? card.humidity);
            const rain = Math.round(weather?.precipitationProbability ?? 0);
            const condition = weather
              ? (es ? weather.labelEs : weather.labelEn)
              : (es ? card.moodEs : card.moodEn);

            return (
              <motion.button
                key={card.id}
                type="button"
                layout
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.995 }}
                onClick={() => {
                  setActiveId(card.id);
                  onSelectRegion(card.regionId);
                }}
                className={
                  'group relative block h-[112px] w-full overflow-hidden rounded-[24px] border text-left shadow-[0_12px_30px_rgba(15,23,42,0.13)] transition-all duration-300 sm:h-[132px] sm:rounded-[28px] ' +
                  (selected
                    ? 'border-white ring-2 ring-sky-500/35 shadow-[0_18px_42px_rgba(14,116,144,0.22)]'
                    : 'border-white/70 hover:border-white')
                }
                aria-label={es ? 'Explorar ' + card.nameEs : 'Explore ' + card.nameEn}
              >
                <img
                  src={card.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

                <div className="absolute inset-x-0 inset-y-0 flex items-center justify-between gap-4 px-5 sm:px-7">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-white/80" />
                      <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/75">
                        {index === 0 ? (es ? 'Capital' : 'Capital') : 'Costa Rica'}
                      </span>
                    </div>
                    <div className="mt-1 text-xl font-black leading-tight text-white drop-shadow sm:text-2xl">
                      {es ? card.nameEs : card.nameEn}
                    </div>
                    <div className="mt-1 text-xs font-medium text-white/80 sm:text-sm">{condition}</div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4 sm:gap-7">
                    <div className="hidden text-right sm:block">
                      <div className="text-[9px] font-black uppercase tracking-wider text-white/60">
                        {es ? 'Sensación' : 'Feels like'}
                      </div>
                      <div className="mt-1 text-sm font-bold text-white">{feels}°C</div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black leading-none tracking-tight text-white drop-shadow sm:text-5xl">
                        {temp}°
                      </div>
                      <div className="mt-1 text-[9px] font-black uppercase tracking-wider text-white/70">
                        {humidity}% · {rain}% {es ? 'lluvia' : 'rain'}
                      </div>
                    </div>
                    <ArrowRight className={'h-5 w-5 text-white/70 transition-transform ' + (selected ? 'translate-x-1 text-white' : 'group-hover:translate-x-1')} />
                  </div>
                </div>

                {selected && (
                  <motion.div
                    key={activeId}
                    className="absolute bottom-0 left-0 h-1 bg-sky-300"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5.2, ease: 'linear' }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 grid grid-cols-2 gap-3 rounded-[24px] border border-white/80 bg-white/70 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:grid-cols-4 sm:gap-5 sm:p-5"
        >
          <div>
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-sky-950/50">
              <CloudSun className="h-3.5 w-3.5" />{es ? 'Condición' : 'Condition'}
            </div>
            <div className="mt-1 truncate text-sm font-bold text-sky-950">{liveWeather[active.regionId] ? (es ? liveWeather[active.regionId].labelEs : liveWeather[active.regionId].labelEn) : (es ? active.moodEs : active.moodEn)}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-sky-950/50">
              <Droplets className="h-3.5 w-3.5" />{es ? 'Humedad' : 'Humidity'}
            </div>
            <div className="mt-1 text-sm font-bold text-sky-950">{Math.round(liveWeather[active.regionId]?.humidity ?? active.humidity)}%</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-sky-950/50">
              <Sun className="h-3.5 w-3.5" />{es ? 'Temperatura' : 'Temperature'}
            </div>
            <div className="mt-1 text-sm font-bold text-sky-950">{Math.round(liveWeather[active.regionId]?.temperatureC ?? active.tempC)}°C</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-sky-950/50">
              <Waves className="h-3.5 w-3.5" />{es ? 'Ambiente' : 'Vibe'}
            </div>
            <div className="mt-1 truncate text-sm font-bold text-sky-950">{es ? active.moodEs : active.moodEn}</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
