import React, { useMemo, useState } from 'react';
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
  tempF: number;
  humidity: number;
  moodEs: string;
  moodEn: string;
  image: string;
  icon: 'sun' | 'cloud' | 'waves';
};

const PULSE_CARDS: PulseCard[] = [
  {
    id: 'sjo',
    regionId: 'sjo',
    nameEs: 'San José',
    nameEn: 'San José',
    tempC: 22,
    tempF: 72,
    humidity: 76,
    moodEs: 'Fresco de ciudad',
    moodEn: 'Fresh city air',
    image: REGIONS.find(r => r.id === 'sjo')?.image || '',
    icon: 'cloud'
  },
  {
    id: 'caribe_sur',
    regionId: 'caribe_sur',
    nameEs: 'Cahuita',
    nameEn: 'Cahuita',
    tempC: 29,
    tempF: 84,
    humidity: 82,
    moodEs: 'Calor caribeño',
    moodEn: 'Caribbean warmth',
    image: REGIONS.find(r => r.id === 'caribe_sur')?.image || '',
    icon: 'waves'
  },
  {
    id: 'manuel_antonio',
    regionId: 'manuel_antonio',
    nameEs: 'Parque Nacional Carara',
    nameEn: 'Carara National Park',
    tempC: 30,
    tempF: 86,
    humidity: 84,
    moodEs: 'Sendero tropical',
    moodEn: 'Tropical trails',
    image: REGIONS.find(r => r.id === 'manuel_antonio')?.image || '',
    icon: 'sun'
  },
  {
    id: 'arenal',
    regionId: 'arenal',
    nameEs: 'Río Celeste',
    nameEn: 'Rio Celeste',
    tempC: 22,
    tempF: 72,
    humidity: 90,
    moodEs: 'Selva y cataratas',
    moodEn: 'Rainforest & waterfalls',
    image: REGIONS.find(r => r.id === 'arenal')?.image || '',
    icon: 'cloud'
  },
  {
    id: 'guanacaste',
    regionId: 'guanacaste',
    nameEs: 'Playa Hermosa',
    nameEn: 'Playa Hermosa',
    tempC: 31,
    tempF: 88,
    humidity: 68,
    moodEs: 'Brisa del Pacífico',
    moodEn: 'Pacific breeze',
    image: REGIONS.find(r => r.id === 'guanacaste')?.image || '',
    icon: 'waves'
  }
];

export const DestinationPulse: React.FC<DestinationPulseProps> = ({ language, onSelectRegion }) => {
  const [activeId, setActiveId] = useState(PULSE_CARDS[0].id);
  const active = useMemo(() => PULSE_CARDS.find(c => c.id === activeId) || PULSE_CARDS[0], [activeId]);
  const es = language === 'es';

  return (
    <section className="relative overflow-hidden bg-[#061b13] py-10 sm:py-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,197,94,0.12),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(14,165,233,0.10),transparent_35%)]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-7">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
              <Sparkles className="w-3.5 h-3.5" />
              {es ? 'Costa Rica Pulse' : 'Costa Rica Pulse'}
            </div>
            <h2 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight text-white">
              {es ? '¿A dónde te lleva hoy Costa Rica?' : 'Where will Costa Rica take you today?'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-emerald-100/65">
              {es
                ? 'Una vista rápida de destinos, microclimas y ambiente para inspirarte antes de elegir tu experiencia.'
                : 'A quick visual pulse of destinations, microclimates and vibes before choosing your experience.'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-emerald-200/60">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {es ? 'Condiciones de referencia' : 'Reference conditions'}
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
          {PULSE_CARDS.map((card) => {
            const selected = card.id === activeId;
            return (
              <motion.button
                key={card.id}
                type="button"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => setActiveId(card.id)}
                className={`relative shrink-0 snap-start overflow-hidden rounded-2xl border text-left transition-all duration-300 w-[250px] sm:w-[290px] h-[154px] ${selected ? 'border-emerald-300/70 ring-2 ring-emerald-300/15' : 'border-white/10'}`}
              >
                <img src={card.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-white">
                        <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                        <span className="font-black">{es ? card.nameEs : card.nameEn}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-white/70">{es ? card.moodEs : card.moodEn}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white">{card.tempC}°</div>
                      <div className="text-[9px] font-bold text-white/55">{card.tempF}°F</div>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 rounded-3xl border border-white/10 bg-white/[0.045] p-5 sm:p-6 backdrop-blur-xl"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-200/55 text-[10px] uppercase font-black"><CloudSun className="w-4 h-4" /> {es ? 'Condición' : 'Condition'}</div>
              <div className="mt-1 font-bold text-white">{es ? active.moodEs : active.moodEn}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-emerald-200/55 text-[10px] uppercase font-black"><Droplets className="w-4 h-4" /> {es ? 'Humedad' : 'Humidity'}</div>
              <div className="mt-1 font-bold text-white">{active.humidity}%</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-emerald-200/55 text-[10px] uppercase font-black"><Sun className="w-4 h-4" /> {es ? 'Temperatura' : 'Temperature'}</div>
              <div className="mt-1 font-bold text-white">{active.tempC}°C / {active.tempF}°F</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-emerald-200/55 text-[10px] uppercase font-black"><Waves className="w-4 h-4" /> {es ? 'Ambiente' : 'Vibe'}</div>
              <div className="mt-1 font-bold text-white">{es ? 'Pura vida' : 'Pura vida'}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectRegion(active.regionId)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-[#041711] hover:bg-emerald-300 transition-colors"
          >
            {es ? 'Explorar destino' : 'Explore destination'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};
