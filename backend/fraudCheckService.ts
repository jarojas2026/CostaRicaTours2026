import { GoogleGenAI } from '@google/genai';
import { getFirestoreDb } from './bookingService';

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export async function checkFraudRisk(bookingData: any) {
  try {
    const ai = getAI();
    if (!ai) {
      return { success: true, fraudRisk: { riskScore: 'bajo', justification: 'IA no configurada, aprobado por defecto.' } };
    }

    const prompt = `Analiza los siguientes datos de una nueva reserva turística y evalúa el riesgo de fraude.
Datos de la reserva:
- Monto total: $${bookingData.totalAmount || bookingData.totalPrice || bookingData.totalUSD || 0}
- Cantidad de personas: ${bookingData.guests || bookingData.adults || 0}
- Tour: ${bookingData.tourName || 'Desconocido'}
- Correo electrónico: ${bookingData.email || bookingData.customerEmail || 'Desconocido'}
- Fecha y hora de la transacción: ${new Date().toISOString()}

Evalúa el riesgo en tres niveles: "bajo", "medio" o "alto", y provee una breve justificación basada estrictamente en los datos.

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "riskScore": "bajo|medio|alto",
  "justification": "tu justificación breve aquí"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text || '{}';
    try {
      const parsed = JSON.parse(resultText);
      
      if (bookingData.id || bookingData.bookingId) {
        const id = bookingData.id || bookingData.bookingId;
        const db = getFirestoreDb();
        if (db) {
          await db.collection('bookings').doc(id).update({
            fraudRiskScore: parsed.riskScore,
            fraudRiskJustification: parsed.justification
          });
        }
      }

      return { success: true, fraudRisk: parsed };
    } catch (e) {
      console.error('Failed to parse Gemini fraud JSON:', e);
      return { success: false, error: 'Error analizando la respuesta de fraude' };
    }
  } catch (err: any) {
    console.error('Fraud check error:', err);
    return { success: false, error: err.message || 'Error en validación antifraude' };
  }
}
