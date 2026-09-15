import { GoogleGenAI } from '@google/genai';
import { db } from '../src/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getDemandForecast() {
  try {
    // 1. Fetch real bookings from the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('createdAt', '>=', Timestamp.fromDate(ninetyDaysAgo)));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: true, forecasts: [], message: 'No hay reservas suficientes en los últimos 90 días.' };
    }

    const bookings = snapshot.docs.map(doc => doc.data());
    
    // 2. Group by tourId and calculate trend
    // For simplicity, we'll split the 90 days into two 45-day periods to see the trend
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    const tourStats: Record<string, { name: string, period1Count: number, period2Count: number, total: number }> = {};

    bookings.forEach(booking => {
      const tourId = booking.tourId;
      const tourName = booking.tourName?.es || booking.tourName || 'Unknown Tour';
      const createdAt = booking.createdAt.toDate();

      if (!tourStats[tourId]) {
        tourStats[tourId] = { name: tourName, period1Count: 0, period2Count: 0, total: 0 };
      }

      tourStats[tourId].total += 1;
      
      // period1 is 90 to 45 days ago, period2 is 45 days ago to now
      if (createdAt < fortyFiveDaysAgo) {
        tourStats[tourId].period1Count += 1;
      } else {
        tourStats[tourId].period2Count += 1;
      }
    });

    // 3. Process with Gemini
    const forecasts = [];
    for (const [tourId, stats] of Object.entries(tourStats)) {
      if (stats.total < 10) {
        forecasts.push({
          tourId,
          tourName: stats.name,
          trend: 'insuficiente',
          suggestion: 'Datos insuficientes para predecir (menos de 10 reservas en 90 días).',
          period1Count: stats.period1Count,
          period2Count: stats.period2Count,
          total: stats.total
        });
        continue;
      }

      const trendDirection = stats.period2Count > stats.period1Count ? 'subiendo' : stats.period2Count < stats.period1Count ? 'bajando' : 'estable';
      
      const prompt = `Analiza la tendencia de demanda para el tour "${stats.name}".
En los primeros 45 días (hace 90 a 45 días) tuvo ${stats.period1Count} reservas.
En los últimos 45 días (hace 45 días a hoy) tuvo ${stats.period2Count} reservas.
La tendencia general parece estar ${trendDirection}.
Con base estrictamente en estos números reales, sugiere brevemente una acción de negocio (ej. "subir precio 10%", "promocionar más", "sin cambios") y tu razonamiento.
Responde de forma concisa.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      forecasts.push({
        tourId,
        tourName: stats.name,
        trend: trendDirection,
        suggestion: response.text?.trim() || 'Sin sugerencia clara',
        period1Count: stats.period1Count,
        period2Count: stats.period2Count,
        total: stats.total
      });
    }

    return { success: true, forecasts };
  } catch (err: any) {
    console.error('Demand forecast error:', err);
    return { success: false, error: err.message || 'Error calculando proyección' };
  }
}
