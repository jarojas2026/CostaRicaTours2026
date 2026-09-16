import { GoogleGenAI } from '@google/genai';
import { getFirestoreDb } from './bookingService';

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export async function getDemandForecast() {
  try {
    const db = getFirestoreDb();
    if (!db) {
      return { success: false, error: 'Base de datos Firestore no disponible' };
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const snapshot = await db.collection('bookings')
      .where('createdAt', '>=', ninetyDaysAgo.getTime())
      .get();
      
    if (snapshot.empty) {
      return { success: true, forecasts: [], message: 'No hay reservas suficientes en los últimos 90 días.' };
    }

    const bookings = snapshot.docs.map(doc => doc.data());
    
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    const tourStats: Record<string, { name: string, period1Count: number, period2Count: number, total: number }> = {};

    bookings.forEach(booking => {
      const tourId = booking.tourId || booking.idReserva || 'tour';
      const tourName = booking.tourName?.es || booking.tourName || 'Tour';
      const createdAtVal = booking.createdAt ? Number(booking.createdAt) : Date.now();
      const createdAt = new Date(createdAtVal);

      if (!tourStats[tourId]) {
        tourStats[tourId] = { name: tourName, period1Count: 0, period2Count: 0, total: 0 };
      }

      tourStats[tourId].total += 1;
      
      if (createdAt < fortyFiveDaysAgo) {
        tourStats[tourId].period1Count += 1;
      } else {
        tourStats[tourId].period2Count += 1;
      }
    });

    const ai = getAI();
    const forecasts = [];
    for (const [tourId, stats] of Object.entries(tourStats)) {
      if (stats.total < 5 || !ai) {
        forecasts.push({
          tourId,
          tourName: stats.name,
          trend: 'insuficiente',
          suggestion: 'Datos insuficientes o IA no configurada.',
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
Sugiere brevemente una acción de negocio (ej. "subir precio 10%", "promocionar más", "sin cambios"). Responde de forma concisa.`;

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
