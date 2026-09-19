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
  source: 'open-meteo' | 'fallback';
};

const COORDS: Record<string, { lat: number; lon: number; name: string }> = {
  sjo: { lat: 9.9281, lon: -84.0907, name: 'San José' },
  caribe_sur: { lat: 9.7489, lon: -82.9988, name: 'Cahuita' },
  manuel_antonio: { lat: 9.3922, lon: -84.1367, name: 'Carara / Pacífico Central' },
  arenal: { lat: 10.431, lon: -84.706, name: 'Río Celeste / Arenal' },
  guanacaste: { lat: 10.566, lon: -85.700, name: 'Playa Hermosa / Guanacaste' }
};

const FALLBACKS: Record<string, Omit<WeatherPulse, 'regionId' | 'name' | 'observedAt' | 'source'>> = {
  sjo: { temperatureC: 22, apparentTemperatureC: 22, humidity: 76, precipitationProbability: 35, windKmh: 8, weatherCode: 2, isDay: true },
  caribe_sur: { temperatureC: 29, apparentTemperatureC: 32, humidity: 82, precipitationProbability: 45, windKmh: 10, weatherCode: 3, isDay: true },
  manuel_antonio: { temperatureC: 30, apparentTemperatureC: 33, humidity: 84, precipitationProbability: 40, windKmh: 9, weatherCode: 2, isDay: true },
  arenal: { temperatureC: 22, apparentTemperatureC: 23, humidity: 90, precipitationProbability: 55, windKmh: 7, weatherCode: 61, isDay: true },
  guanacaste: { temperatureC: 31, apparentTemperatureC: 34, humidity: 68, precipitationProbability: 20, windKmh: 16, weatherCode: 1, isDay: true }
};

let cache: { expiresAt: number; data: WeatherPulse[] } | null = null;

function weatherLabel(code: number, es = true): string {
  if (code === 0) return es ? 'Despejado' : 'Clear';
  if ([1, 2, 3].includes(code)) return es ? 'Parcialmente nublado' : 'Partly cloudy';
  if ([45, 48].includes(code)) return es ? 'Niebla' : 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return es ? 'Llovizna' : 'Drizzle';
  if ([61, 63, 65, 80, 81, 82].includes(code)) return es ? 'Lluvia' : 'Rain';
  if ([95, 96, 99].includes(code)) return es ? 'Tormenta' : 'Thunderstorm';
  return es ? 'Variable' : 'Variable';
}

export async function getDestinationWeather(force = false): Promise<(WeatherPulse & { labelEs: string; labelEn: string })[]> {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.data as any;

  const results: WeatherPulse[] = await Promise.all(Object.entries(COORDS).map(async ([regionId, c]) => {
    const fallback = FALLBACKS[regionId];
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(c.lat));
      url.searchParams.set('longitude', String(c.lon));
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day');
      url.searchParams.set('hourly', 'precipitation_probability');
      url.searchParams.set('forecast_days', '1');
      url.searchParams.set('timezone', 'America/Costa_Rica');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`weather_http_${response.status}`);
      const data: any = await response.json();
      const current = data.current || {};
      const hourly = data.hourly?.precipitation_probability || [];
      return {
        regionId, name: c.name,
        temperatureC: Number(current.temperature_2m ?? fallback.temperatureC),
        apparentTemperatureC: Number(current.apparent_temperature ?? fallback.apparentTemperatureC),
        humidity: Number(current.relative_humidity_2m ?? fallback.humidity),
        precipitationProbability: Number(hourly[0] ?? fallback.precipitationProbability),
        windKmh: Number(current.wind_speed_10m ?? fallback.windKmh),
        weatherCode: Number(current.weather_code ?? fallback.weatherCode),
        isDay: Boolean(current.is_day ?? 1),
        observedAt: String(current.time || new Date().toISOString()),
        source: 'open-meteo'
      };
    } catch {
      return { regionId, name: c.name, ...fallback, observedAt: new Date().toISOString(), source: 'fallback' };
    }
  }));

  cache = { expiresAt: Date.now() + 10 * 60 * 1000, data: results };
  return results.map(w => ({ ...w, labelEs: weatherLabel(w.weatherCode, true), labelEn: weatherLabel(w.weatherCode, false) })) as any;
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
