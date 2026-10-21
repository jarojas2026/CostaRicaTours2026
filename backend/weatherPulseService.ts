type WeatherPulse = {
  regionId: string;
  name: string;
  temperatureC: number;
  apparentTemperatureC: number;
  humidity: number;
  precipitationProbability: number;
  windKmh: number;
  weatherCode: number;
  isDay: boolean;
  observedAt: string;
  source: 'open-meteo';
};

const COORDS: Record<string, { lat: number; lon: number; name: string }> = {
  sjo: { lat: 9.9281, lon: -84.0907, name: 'San José' },
  caribe_sur: { lat: 9.7489, lon: -82.9988, name: 'Cahuita' },
  manuel_antonio: { lat: 9.3922, lon: -84.1367, name: 'Carara / Pacífico Central' },
  arenal: { lat: 10.431, lon: -84.706, name: 'Río Celeste / Arenal' },
  guanacaste: { lat: 10.566, lon: -85.700, name: 'Playa Hermosa / Guanacaste' }
};

type VerifiedWeatherPulse = WeatherPulse & { labelEs: string; labelEn: string };
let cache: { expiresAt: number; data: VerifiedWeatherPulse[] } | null = null;

function weatherLabel(code: number, es = true): string {
  if (code === 0) return es ? 'Despejado' : 'Clear';
  if ([1, 2, 3].includes(code)) return es ? 'Parcialmente nublado' : 'Partly cloudy';
  if ([45, 48].includes(code)) return es ? 'Niebla' : 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return es ? 'Llovizna' : 'Drizzle';
  if ([61, 63, 65, 80, 81, 82].includes(code)) return es ? 'Lluvia' : 'Rain';
  if ([95, 96, 99].includes(code)) return es ? 'Tormenta' : 'Thunderstorm';
  return es ? 'Variable' : 'Variable';
}

/** Only complete, source-verified Open-Meteo observations are returned.
 * An upstream outage or incomplete record means `unknown`, never synthetic weather.
 * Empty array is a supported result and must be presented as unavailable.
 */
export async function getDestinationWeather(force = false): Promise<VerifiedWeatherPulse[]> {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.data;

  const results = await Promise.all(Object.entries(COORDS).map(async ([regionId, c]): Promise<VerifiedWeatherPulse | null> => {
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(c.lat));
      url.searchParams.set('longitude', String(c.lon));
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day');
      url.searchParams.set('hourly', 'precipitation_probability');
      url.searchParams.set('forecast_days', '1');
      url.searchParams.set('timezone', 'America/Costa_Rica');
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('weather_unavailable');
      const data: any = await response.json();
      const current = data?.current;
      const hourlyTimes: unknown = data?.hourly?.time;
      const hourlyProbabilities: unknown = data?.hourly?.precipitation_probability;

      // The probability must refer to the current local hour, not midnight.
      const localTime = typeof current?.time === 'string' ? current.time : '';
      const observedHour = localTime.slice(0, 13);
      if (!observedHour || !Array.isArray(hourlyTimes) || !Array.isArray(hourlyProbabilities)) {
        return null;
      }
      const hourIndex = hourlyTimes.findIndex((hour: unknown) =>
        typeof hour === 'string' && hour.slice(0, 13) === observedHour
      );
      if (hourIndex < 0) return null;
      const measured = [
        current.temperature_2m, current.apparent_temperature,
        current.relative_humidity_2m, current.wind_speed_10m,
        current.weather_code, hourlyProbabilities[hourIndex],
      ];
      if (!measured.every(value => typeof value === 'number' && Number.isFinite(value))) return null;
      if (!Number.isFinite(Date.parse(localTime))) return null;
      const [temperatureC, apparentTemperatureC, humidity, windKmh, weatherCode, precipitationProbability] = measured as number[];
      const isDay = current.is_day;
      if (isDay !== 0 && isDay !== 1) return null;
      return {
        regionId, name: c.name,
        temperatureC, apparentTemperatureC, humidity, precipitationProbability,
        windKmh, weatherCode, isDay: Boolean(isDay),
        observedAt: localTime,
        source: 'open-meteo',
        labelEs: weatherLabel(weatherCode, true),
        labelEn: weatherLabel(weatherCode, false),
      };
    } catch {
      return null;
    }
  }));

  const verified = results.filter((value): value is VerifiedWeatherPulse => value !== null);
  // Cache observations, including source labels; never cache fabricated fallback numbers.
  cache = { expiresAt: Date.now() + 10 * 60 * 1000, data: verified };
  return verified;
}

export function getWeatherForRegion(regionId: string) {
  return getDestinationWeather().then(items => items.find(w => w.regionId === regionId) || null);
}

export function getWeatherRisk(weather: Pick<WeatherPulse, 'weatherCode' | 'precipitationProbability' | 'windKmh'>) {
  const storm = [95, 96, 99].includes(weather.weatherCode);
  const heavyRain = [65, 82].includes(weather.weatherCode) || weather.precipitationProbability >= 80;
  const strongWind = weather.windKmh >= 35;
  return {
    level: storm || strongWind ? 'high' : heavyRain ? 'medium' : 'low',
    reasons: [
      ...(storm ? ['tormenta eléctrica'] : []),
      ...(heavyRain ? ['alta probabilidad/intensidad de lluvia'] : []),
      ...(strongWind ? ['viento fuerte'] : [])
    ]
  };
}
