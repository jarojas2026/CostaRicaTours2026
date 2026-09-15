import { GoogleGenAI } from '@google/genai';
import { db } from '../src/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function checkFraudRisk(bookingData: any) {
  try {
    const prompt = `Analiza los siguientes datos de una nueva reserva turística y evalúa el riesgo de fraude.
Solo debes basarte en los datos proporcionados. No inventes señales.
Datos de la reserva:
- Monto total: $${bookingData.totalAmount || bookingData.totalPrice || 0}
- Cantidad de personas: ${bookingData.guests || bookingData.adults || 0}
- Tour: ${bookingData.tourName || 'Desconocido'}
- Correo electrónico: ${bookingData.email || 'Desconocido'}
- Fecha y hora de la transacción: ${new Date().toISOString()}

Evalúa el riesgo en tres niveles: "bajo", "medio" o "alto", y provee una breve justificación basada estrictamente en los datos (por ejemplo, correos electrónicos anómalos, montos excesivamente altos sin previo aviso, etc. Si todo parece normal, di "bajo").

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
      
      // If we have a booking ID, update the firestore document
      if (bookingData.id || bookingData.bookingId) {
        const id = bookingData.id || bookingData.bookingId;
        await updateDoc(doc(db, 'bookings', id), {
          fraudRiskScore: parsed.riskScore,
          fraudRiskJustification: parsed.justification
        });
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
