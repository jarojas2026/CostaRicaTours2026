import React, { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Sun, Umbrella } from 'lucide-react';
import type { Language } from '../types';

interface ForecastDay {
  date: string;
  weatherCode: number;
  tempMaxC: number;
  tempMinC: number;
  precipitationProbability: number | null;
  precipitationMm: number | null;
}

interface ForecastResponse {
  success: boolean;
  days?: ForecastDay[];
  rainAlert?: boolean;
}

const RAIN_PROBABILITY_ALERT = 60;
const RAIN_MM_ALERT = 10;

function describe(code: number, es: boolean): { label: string; Icon: typeof Sun } {
  if (code === 0) return { label: es ? 'Despejado' : 'Clear', Icon: Sun };
  if (code === 1 || code === 2) return { label: es ? 'Parcialmente nublado' : 'Partly cloudy', Icon: CloudSun };
  if (code === 3) return { label: es ? 'Nublado' : 'Overcast', Icon: Cloud };
  if (code === 45 || code === 48) return { label: es ? 'Niebla' : 'Fog', Icon: CloudFog };
  if (code >= 51 && code <= 57) return { label: es ? 'Llovizna' : 'Drizzle', Icon: CloudDrizzle };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: es ? 'Lluvia' : 'Rain', Icon: CloudRain };
  if (code >= 95) return { label: es ? 'Tormenta' : 'Thunderstorm', Icon: CloudLightning };
  return { label: es ? 'Variable' : 'Variable', Icon: Cloud };
}

const rainy = (d: ForecastDay) => (d.precipitationProbability ?? 0) >= RAIN_PROBABILITY_ALERT || (d.precipitationMm ?? 0) >= RAIN_MM_ALERT;

function dayLabel(date: string, es: boolean): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(es ? 'es-CR' : 'en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(parsed);
}

/**
 * Pronóstico de 3–5 días para la ubicación de referencia del tour (Open-Meteo vía backend, caché 1 h).
 * Falla en silencio: si el servicio no responde, la sección no se muestra.
 */
export function TourWeather({ lat, lng, language }: { lat: number; lng: number; language: Language }) {
  const [days, setDays] = useState<ForecastDay[] | null>(null);
  const es = language === 'es';

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return;
    const controller = new AbortController();
    setDays(null);
    fetch(`/api/weather/forecast?lat=${encodeURIComponent(lat.toFixed(2))}&lon=${encodeURIComponent(lng.toFixed(2))}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ForecastResponse | null) => {
        if (data?.success && Array.isArray(data.days) && data.days.length >= 3) setDays(data.days.slice(0, 5));
      })
      .catch(() => { /* silencioso */ });
    return () => controller.abort();
  }, [lat, lng]);

  if (!days) return null;
  const rainyDays = days.filter(rainy);

  return (
    <section data-testid="tour-weather" aria-label={es ? 'Pronóstico del tiempo' : 'Weather forecast'} className="space-y-3">
      <h2 className="text-2xl font-bold text-white">{es ? 'Pronóstico en la zona' : 'Local forecast'}</h2>
      {rainyDays.length > 0 && (
        <p role="status" className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <Umbrella className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {es
              ? `Se espera lluvia (${rainyDays.map((d) => dayLabel(d.date, true)).join(', ')}). Lleva capa impermeable; el operador confirma si hay cambios por clima.`
              : `Rain expected (${rainyDays.map((d) => dayLabel(d.date, false)).join(', ')}). Bring a rain jacket; the operator confirms any weather-related changes.`}
          </span>
        </p>
      )}
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {days.map((d) => {
          const { label, Icon } = describe(d.weatherCode, es);
          return (
            <li key={d.date} className="min-w-0 rounded-2xl border border-white/10 bg-stone-950/40 px-2 py-3 text-center">
              <div className="truncate text-[11px] font-black uppercase tracking-wide text-stone-400">{dayLabel(d.date, es)}</div>
              <Icon className={`mx-auto my-2 h-6 w-6 ${rainy(d) ? 'text-sky-300' : 'text-amber-300'}`} aria-hidden="true" />
              <div className="sr-only">{label}</div>
              <div className="text-sm font-bold text-white">{Math.round(d.tempMaxC)}° <span className="text-stone-400">{Math.round(d.tempMinC)}°</span></div>
              {d.precipitationProbability !== null && (
                <div className="text-[11px] text-sky-300">{es ? 'Lluvia' : 'Rain'} {Math.round(d.precipitationProbability)}%</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-stone-400">
        {es ? 'Pronóstico aproximado para la ubicación de referencia. Datos: ' : 'Approximate forecast for the reference location. Data: '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline text-emerald-300">Open-Meteo</a> (CC BY 4.0)
      </p>
    </section>
  );
}
