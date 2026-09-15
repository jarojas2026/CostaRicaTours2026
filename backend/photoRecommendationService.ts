import { GoogleGenAI } from '@google/genai';
import { TOURS } from '../src/data/toursData';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getPhotoRecommendations(base64Image: string) {
  try {
    // 1. Ask Gemini to analyze the image and return a JSON list of identified concepts/keywords
    const prompt = `Analyze this photo and identify the main tourism-related elements (e.g., beach, volcano, jungle, extreme adventure, wildlife, relaxation, culture, etc.). 
    Return ONLY a raw JSON object with a single property 'keywords' which is an array of strings in English.
    Example: {"keywords": ["beach", "ocean", "relaxation", "sunset"]}`;

    // Remove the data:image/jpeg;base64, part if present
    const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    // We assume JPEG for simplicity if it's base64 encoded by our frontend
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
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', e);
      return { success: false, error: 'Error analizando la imagen' };
    }

    if (keywords.length === 0) {
      return { success: true, tours: [], message: 'No se encontraron elementos turísticos claros en la imagen.' };
    }

    // 2. Score tours based on keywords match
    // Simple approach: string matching keywords against tour descriptions/categories
    const scoredTours = TOURS.map(tour => {
      let score = 0;
      const textToSearch = `${tour.title.en} ${tour.title.es} ${tour.description.en} ${tour.description.es} ${tour.category} ${tour.region}`.toLowerCase();
      
      keywords.forEach(kw => {
        if (textToSearch.includes(kw.toLowerCase())) {
          score += 1;
        }
      });
      return { tour, score };
    });

    // 3. Get top 3 tours
    const topTours = scoredTours
      .filter(t => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(t => t.tour);

    if (topTours.length === 0) {
      return { success: true, tours: [], message: 'No encontramos tours en nuestro catálogo que coincidan exactamente con esta foto, pero tenemos muchas más opciones.' };
    }

    // 4. Generate reasons for why they match
    const recommendedTours = [];
    for (const tour of topTours) {
      const reasonPrompt = `The user uploaded a photo with these elements: ${keywords.join(', ')}. 
      We are recommending the tour "${tour.title.es}" which has this description: "${tour.description.es}".
      Write a very brief (1-2 sentences) reason in Spanish explaining why this tour is a great match for their photo. Be enthusiastic.
      Return ONLY the reason string, nothing else.`;

      const reasonResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [reasonPrompt]
      });

      recommendedTours.push({
        ...tour,
        matchReason: reasonResponse.text?.trim() || 'Este tour tiene los elementos que buscas.'
      });
    }

    return { success: true, tours: recommendedTours, keywords };

  } catch (error: any) {
    console.error('Photo recommendation error:', error);
    return { success: false, error: error.message || 'Error procesando la recomendación' };
  }
}
