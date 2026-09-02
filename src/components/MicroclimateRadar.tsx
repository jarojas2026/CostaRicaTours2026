import React, { useState } from 'react';
import { 
  Sun, CloudRain, Wind, Thermometer, CloudLightning, Umbrella, 
  Sparkles, CheckCircle2, MapPin, Shirt, Compass, Shield
} from 'lucide-react';
import { Language } from '../types';

interface MicroclimateRadarProps {
  language: Language;
}

interface RegionWeather {
  id: string;
  nameEs: string;
  nameEn: string;
  tempC: number;
  tempF: number;
  conditionEs: string;
  conditionEn: string;
  humidity: number;
  uvIndex: number;
  icon: 'sun' | 'rain' | 'cloud' | 'lightning';
  gearEs: string[];
  gearEn: string[];
}

const REGION_WEATHER_DATA: RegionWeather[] = [
  {
    id: 'arenal',
    nameEs: 'Volcán Arenal & La Fortuna',
    nameEn: 'Arenal Volcano & La Fortuna',
    tempC: 28,
    tempF: 82,
    conditionEs: 'Soleado con brisa tropical',
    conditionEn: 'Sunny with tropical breeze',
    humidity: 75,
    uvIndex: 9,
    icon: 'sun',
    gearEs: ['Traje de baño para termales', 'Tenis para caminata en lava', 'Bloqueador solar orgánico'],
    gearEn: ['Swimwear for hot springs', 'Trail shoes for lava hike', 'Reef-safe sunscreen'],
  },
  {
    id: 'monteverde',
    nameEs: 'Bosque Nuboso Monteverde',
    nameEn: 'Monteverde Cloud Forest',
    tempC: 19,
    tempF: 66,
    conditionEs: 'Neblina mística y llovizna fresca',
    conditionEn: 'Mystic cloud cover & cool mist',
    humidity: 92,
    uvIndex: 5,
    icon: 'cloud',
    gearEs: ['Chaqueta impermeable ligera', 'Botas de caminata antideslizantes', 'Repelente de insectos'],
    gearEn: ['Light rain jacket', 'Grip hiking boots', 'Eco-friendly bug spray'],
  },
  {
    id: 'manuel_antonio',
    nameEs: 'Manuel Antonio & Pacífico Central',
    nameEn: 'Manuel Antonio & Central Pacific',
    tempC: 31,
    tempF: 88,
    conditionEs: 'Cálido y radiante para playa',
    conditionEn: 'Warm & sunny beach vibes',
    humidity: 80,
    uvIndex: 11,
    icon: 'sun',
    gearEs: ['Gafas de sol y sombrero', 'Bolsa seca impermeable', 'Cámara con zoom para monitos'],
    gearEn: ['Sunglasses & hat', 'Dry bag for gear', 'Telephoto camera for monkeys'],
  },
  {
    id: 'guanacaste',
    nameEs: 'Guanacaste & Península Papagayo',
    nameEn: 'Guanacaste & Papagayo Peninsula',
    tempC: 33,
    tempF: 91,
    conditionEs: 'Sol despejado de Costa de Oro',
    conditionEn: 'Clear blue skies & golden coast',
    humidity: 65,
    uvIndex: 11,
    icon: 'sun',
    gearEs: ['Ropa de lino fresca', 'Sandalias cómodas', 'Hidratación con electrolitos'],
    gearEn: ['Breathable linen wear', 'Comfy sandals', 'Electrolyte water bottle'],
  },
  {
    id: 'tortuguero',
    nameEs: 'Tortuguero & Caribe Norte',
    nameEn: 'Tortuguero & North Caribbean',
    tempC: 27,
    tempF: 80,
    conditionEs: 'Humedad tropical & verde vibrante',
    conditionEn: 'Lush rainforest humidity',
    humidity: 95,
    uvIndex: 8,
    icon: 'rain',
    gearEs: ['Poncho impermeable', 'Linterna con luz roja (tortugas)', 'Funda impermeable de celular'],
    gearEn: ['Rain poncho', 'Red light headlamp (turtles)', 'Waterproof phone case'],
  },
];

export const MicroclimateRadar: React.FC<MicroclimateRadarProps> = ({ language }) => {
  const [selectedRegion, setSelectedRegion] = useState<RegionWeather>(REGION_WEATHER_DATA[0]);

  return (
    <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
        <div className="space-y-1">
          <span className="bg-stone-100 text-stone-800 text-[10px] font-black uppercase px-3 py-1 rounded-full inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-600" />
            {language === 'es' ? 'Radar Meteorológico 2026' : '2026 Microclimate Radar'}
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-neutral-900 uppercase">
            {language === 'es' ? 'Clima en Tiempo Real & Guía de Empaque' : 'Live Climate & Packing Recommendation'}
          </h3>
          <p className="text-xs text-neutral-500">
            {language === 'es' 
              ? 'Costa Rica posee 12 microclimas únicos. Consulta las condiciones de hoy antes de realizar tu tour.' 
              : 'Costa Rica has 12 microclimates. Check live conditions and gear tips before heading out.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-2xl border border-stone-200 text-stone-900 text-xs font-bold self-start sm:self-center">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
          <span>{language === 'es' ? 'Actualizado en Vivo' : 'Live Updates Active'}</span>
        </div>
      </div>

      {/* Region selector buttons */}
      <div className="flex flex-wrap gap-2">
        {REGION_WEATHER_DATA.map((reg) => {
          const isSelected = selectedRegion.id === reg.id;
          return (
            <button
              key={reg.id}
              onClick={() => setSelectedRegion(reg)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSelected
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-orange-500'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{language === 'es' ? reg.nameEs : reg.nameEn}</span>
            </button>
          );
        })}
      </div>

      {/* Selected region weather display card */}
      <div className="bg-gradient-to-br from-neutral-900 to-stone-950 text-white rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-xl border border-stone-900">
        <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative z-10">
          
          {/* Main Temperature & State */}
          <div className="space-y-2">
            <span className="text-orange-400 text-xs font-black uppercase tracking-wider block">
              {language === 'es' ? selectedRegion.nameEs : selectedRegion.nameEn}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-black text-white">{selectedRegion.tempC}°C</span>
              <span className="text-xl text-orange-300 font-bold">/ {selectedRegion.tempF}°F</span>
            </div>
            <p className="text-sm font-semibold text-stone-100 flex items-center gap-2">
              {selectedRegion.icon === 'sun' && <Sun className="w-5 h-5 text-orange-400 animate-spin-slow" />}
              {selectedRegion.icon === 'cloud' && <Wind className="w-5 h-5 text-orange-300" />}
              {selectedRegion.icon === 'rain' && <CloudRain className="w-5 h-5 text-orange-300" />}
              <span>{language === 'es' ? selectedRegion.conditionEs : selectedRegion.conditionEn}</span>
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-4 bg-white/10 p-4 rounded-2xl border border-white/10">
            <div>
              <span className="text-[10px] text-orange-300 font-bold uppercase block">{language === 'es' ? 'Humedad:' : 'Humidity:'}</span>
              <span className="text-lg font-black text-white">{selectedRegion.humidity}%</span>
            </div>
            <div>
              <span className="text-[10px] text-orange-300 font-bold uppercase block">{language === 'es' ? 'Índice UV:' : 'UV Index:'}</span>
              <span className="text-lg font-black text-orange-300">{selectedRegion.uvIndex} ({selectedRegion.uvIndex > 8 ? (language === 'es' ? 'Muy Alto' : 'Very High') : (language === 'es' ? 'Moderado' : 'Moderate')})</span>
            </div>
          </div>

          {/* Recommended Packing Gear */}
          <div className="space-y-2 bg-white/10 p-4 rounded-2xl border border-white/10">
            <span className="text-xs font-black text-orange-400 uppercase flex items-center gap-1.5">
              <Shirt className="w-4 h-4" />
              {language === 'es' ? 'Qué llevar hoy:' : 'Gear to pack:'}
            </span>
            <ul className="text-xs space-y-1.5 text-stone-100">
              {(language === 'es' ? selectedRegion.gearEs : selectedRegion.gearEn).map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};
