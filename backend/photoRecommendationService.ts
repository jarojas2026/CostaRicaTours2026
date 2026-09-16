import { GoogleGenAI } from '@google/genai';
import { TOURS } from '../src/data/toursData';

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export async function getPhotoRecommendations(base64Image: string) {
  try {
    const ai = getAI();
    if (!ai) {
      return { success: false, error: 'API Key de Gemini no configurada en el servidor' };
    }

    const prompt = `Analyze this photo and identify the main tourism-related elements (e.g., beach, volcano, jungle, extreme adventure, wildlife, relaxation, culture, etc.). 
    Return ONLY a raw JSON object with a single property 'keywords' which is an array of strings in English.
    Example: {"keywords": ["beach", "ocean", "relaxation", "sunset"]}`;

    const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt,
        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text || '{}';
    let keywords: string[] = [];
    try {
      const parsed = JSON.parse(resultText);
      keywords = parsed.keywords || [];
    } catch {
      keywords = [];
    }

    // Match keywords with TOURS
    const scoredTours = TOURS.map(tour => {
      let score = 0;
      const textToSearch = `${tour.title} ${tour.summary} ${tour.location} ${tour.category}`.toLowerCase();
      
      keywords.forEach(kw => {
        if (textToSearch.includes(kw.toLowerCase())) {
          score += 2;
        }
      });

      // Boost based on category matching common keywords
      if (keywords.includes('beach') && tour.category === 'playa') score += 5;
      if (keywords.includes('volcano') && tour.category === 'aventura') score += 5;
      if (keywords.includes('wildlife') && tour.category === 'naturaleza') score += 5;

      return { tour, score };
    });

    scoredTours.sort((a, b) => b.score - a.score);
    const topTours = scoredTours.filter(st => st.score > 0).slice(0, 3).map(st => st.tour);

    if (topTours.length === 0) {
      return { success: true, keywords, tours: TOURS.slice(0, 3) };
    }

    return { success: true, keywords, tours: topTours };
  } catch (err: any) {
    console.error('Photo recommendation error:', err);
    return { success: false, error: err.message || 'Error procesando la imagen' };
  }
}
