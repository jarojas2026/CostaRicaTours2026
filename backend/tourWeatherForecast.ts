/**
 * Pronóstico de 5 días por coordenadas (ficha /tour/:id) desde Open-Meteo.
 *
 * - Gratis y sin clave: https://open-meteo.com (atribución "Open-Meteo", CC BY 4.0).
 * - Caché en memoria de 1 h por coordenada redondeada (~1 km) para que muchas
 *   visitas a la misma ficha no multipliquen las llamadas.
 * - Nunca inventa datos: si Open-Meteo falla, devuelve null y la UI se oculta.
 */

export interface TourForecastDay {
  date: string; // YYYY-MM-DD (hora de Costa Rica)
  weatherCode: number;
  tempMaxC: number;
  tempMinC: number;
  precipitationProbability: number | null; // % máximo del día
  precipitationMm: number | null;
}

export interface TourForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  days: TourForecastDay[];
  rainAlert: boolean;
  fetchedAt: string;
  source: 'open-meteo';
  attribution: { name: 'Open-Meteo'; url: 'https://open-meteo.com/'; license: 'CC BY 4.0' };
}

export const FORECAST_DAYS = 5;
export const FORECAST_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const FETCH_TIMEOUT_MS = 6000;

/** Lluvia relevante para un tour al aire libre: probabilidad ≥ 60 % o ≥ 10 mm en el día. */
export const RAIN_PROBABILITY_ALERT = 60;
export const RAIN_MM_ALERT = 10;

/** Costa Rica continental + Isla del Coco, con margen. */
export function parseCostaRicaCoords(latRaw: unknown, lonRaw: unknown): { lat: number; lon: number } | null {
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < 5 || lat > 11.5 || lon < -88 || lon > -82.4) return null;
  // ~1 km de resolución: suficiente para un pronóstico regional y bueno para la caché.
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
}

const num = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(n) ? n : null;
};

/** Convierte la respuesta `daily` de Open-Meteo. Lanza si falta lo esencial. */
export function parseOpenMeteoDaily(payload: any, fetchedAt = new Date().toISOString()): TourForecast {
  const daily = payload?.daily;
  const dates: unknown[] = Array.isArray(daily?.time) ? daily.time : [];
  const days: TourForecastDay[] = [];
  dates.slice(0, FORECAST_DAYS).forEach((date, i) => {
    const tempMaxC = num(daily.temperature_2m_max?.[i]);
    const tempMinC = num(daily.temperature_2m_min?.[i]);
    const weatherCode = num(daily.weather_code?.[i]);
    if (typeof date !== 'string' || tempMaxC === null || tempMinC === null || weatherCode === null) return;
    days.push({
      date,
      weatherCode,
      tempMaxC,
      tempMinC,
      precipitationProbability: num(daily.precipitation_probability_max?.[i]),
      precipitationMm: num(daily.precipitation_sum?.[i]),
    });
  });
  if (days.length === 0) throw new Error('open_meteo_empty_daily');
  return {
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    timezone: String(payload.timezone || 'America/Costa_Rica'),
    days,
    rainAlert: days.some(isRainyDay),
    fetchedAt,
    source: 'open-meteo',
    attribution: { name: 'Open-Meteo', url: 'https://open-meteo.com/', license: 'CC BY 4.0' },
  };
}

export function isRainyDay(day: Pick<TourForecastDay, 'precipitationProbability' | 'precipitationMm'>): boolean {
  return (day.precipitationProbability ?? 0) >= RAIN_PROBABILITY_ALERT || (day.precipitationMm ?? 0) >= RAIN_MM_ALERT;
}

export function buildOpenMeteoUrl(lat: number, lon: number): URL {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum');
  url.searchParams.set('forecast_days', String(FORECAST_DAYS));
  url.searchParams.set('timezone', 'America/Costa_Rica');
  return url;
}

const cache = new Map<string, { expiresAt: number; value: TourForecast }>();
const inflight = new Map<string, Promise<TourForecast | null>>();

export function clearTourForecastCache(): void {
  cache.clear();
  inflight.clear();
}

export async function getTourForecast(
  lat: number,
  lon: number,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<TourForecast | null> {
  const key = `${lat},${lon}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now()) return hit.value;
  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    try {
      const response = await fetchImpl(buildOpenMeteoUrl(lat, lon), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!response.ok) throw new Error(`open_meteo_http_${response.status}`);
      const value = parseOpenMeteoDaily(await response.json(), new Date(now()).toISOString());
      if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
      cache.set(key, { expiresAt: now() + FORECAST_CACHE_TTL_MS, value });
      return value;
    } catch (error: any) {
      console.warn('[tour-weather] Open-Meteo unavailable:', error?.message || error);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, task);
  return task;
}
