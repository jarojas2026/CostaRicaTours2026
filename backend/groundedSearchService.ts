import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key.startsWith('AQ.') || key.length < 20) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

export interface GroundedSearchResult {
  success: boolean;
  answer: string;
  sources: Array<{ uri: string; title: string }>;
  searchQueries?: string[];
  modelUsed: string;
}

const SYSTEM_INSTRUCTION_ES = `Eres el Especialista de Información Turística en Vivo de Costa Rica para la plataforma oficial Costa Rica Tours.
Tu objetivo es proporcionar información verificada y precisa en tiempo real a viajeros internacionales y locales utilizando Google Search Grounding.
Especialidades prioritarias:
1. Estado y compra de entradas de Parques Nacionales de Costa Rica (SINAC: servirr.sinac.go.cr, Parque Nacional Manuel Antonio, Volcán Poás, Corcovado, Marino Ballena).
2. Horarios y tarifas actualizadas de ferris (Puntarenas a Paquera / Naranjo - Naviera Tambor y Coonatramar).
3. Estado de carreteras y alertas climáticas del MOPT / CNE (Ruta 32, Cerro de la Muerte, Ruta 27).
4. Temporadas actuales de avistamiento de fauna (Ballenas jorobadas en Uvita/Golfo Dulce, desove de tortugas en Tortuguero/Ostional, quetzales en Monteverde/San Gerardo de Dota).
5. Tipo de cambio del Dólar estadounidense frente al Colón costarricense según Banco Central de Costa Rica (BCCR).
6. Requisitos de entrada y recomendaciones para turistas.

Reglas:
- Sé conciso, cálido, profesional y directo.
- Menciona fuentes oficiales verificadas (SINAC, ICT, BCCR, MOPT).
- Si hay un horario o tarifa específica, cítala con claridad.`;

const SYSTEM_INSTRUCTION_EN = `You are the Live Costa Rica Tourist Intelligence Specialist for the official Costa Rica Tours platform.
Your objective is to provide up-to-date, verified real-time information to international travelers using Google Search Grounding.
Priority specialties:
1. National Parks status and entry tickets (SINAC: servirr.sinac.go.cr, Manuel Antonio, Poas Volcano, Corcovado, Marino Ballena).
2. Ferry schedules and fares (Puntarenas to Paquera / Naranjo - Naviera Tambor & Coonatramar).
3. Road conditions and transit alerts from MOPT / CNE (Route 32, Cerro de la Muerte, Route 27).
4. Current wildlife viewing seasons (Humpback whales in Uvita/Golfo Dulce, sea turtles in Tortuguero/Ostional, quetzals).
5. Current official exchange rates USD/CRC according to Central Bank of Costa Rica (BCCR).
6. Official entry requirements and safety advisories for Costa Rica.

Rules:
- Be concise, warm, professional, and clear.
- Prioritize official sources (SINAC, ICT, BCCR, MOPT).
- Include verified operational advice.`;

/**
 * Realiza una búsqueda de información turística en tiempo real en Costa Rica utilizando Google Search Grounding y gemini-3.5-flash.
 */
export async function performGroundedSearch(
  query: string,
  language: 'es' | 'en' = 'es'
): Promise<GroundedSearchResult> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) {
    return {
      success: false,
      answer: language === 'es' ? 'Por favor ingresa una consulta válida.' : 'Please enter a valid search query.',
      sources: [],
      modelUsed: 'gemini-3.5-flash'
    };
  }

  const ai = getAI();
  if (!ai) {
    return {
      success: true,
      answer:
        language === 'es'
          ? 'Los Parques Nacionales de Costa Rica operan normalmente con reserva previa en servirr.sinac.go.cr. Para Manuel Antonio y Volcán Poás se recomienda adquirir entradas con antelación en línea. El ferry de Paquera opera con salidas regulares desde Puntarenas.'
          : 'Costa Rica National Parks are operating with online reservations required at servirr.sinac.go.cr. For Manuel Antonio and Poás Volcano, reserve tickets well in advance. Paquera ferry runs regular daily departures from Puntarenas.',
      sources: [
        { uri: 'https://servir.sinac.go.cr', title: 'SINAC - Sistema Nacional de Áreas de Conservación' },
        { uri: 'https://www.visitcostarica.com', title: 'ICT - Instituto Costarricense de Turismo' }
      ],
      modelUsed: 'deterministic-knowledge'
    };
  }

  try {
    const systemInstruction = language === 'es' ? SYSTEM_INSTRUCTION_ES : SYSTEM_INSTRUCTION_EN;
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: cleanQuery,
      config: {
        systemInstruction,
        temperature: 0.2,
        tools: [{ googleSearch: {} }]
      }
    });

    const answer = response.text?.trim() || (language === 'es' ? 'No se pudo obtener información detallada.' : 'No detailed information could be retrieved.');
    
    // Extraer fuentes de Search Grounding
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: Array<{ uri: string; title: string }> = [];
    const seenUris = new Set<string>();

    for (const chunk of rawChunks) {
      const uri = chunk.web?.uri;
      const title = chunk.web?.title || uri || 'Fuente Web';
      if (uri && !seenUris.has(uri)) {
        seenUris.add(uri);
        sources.push({ uri, title });
      }
    }

    const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    return {
      success: true,
      answer,
      sources,
      searchQueries,
      modelUsed: 'gemini-3.5-flash'
    };
  } catch (error: any) {
    console.error('Error al ejecutar Google Search Grounding con gemini-3.5-flash:', error);
    return {
      success: false,
      answer:
        language === 'es'
          ? `Información de respaldo: Para trámites de Parques Nacionales ingrese al portal oficial SINAC (servirr.sinac.go.cr). Si consulta el ferry a Paquera, verifique el estado en Naviera Tambor o Coonatramar.`
          : `Fallback notice: For National Park reservations please visit official SINAC (servirr.sinac.go.cr). For Paquera ferries, check Naviera Tambor or Coonatramar portals directly.`,
      sources: [
        { uri: 'https://servir.sinac.go.cr', title: 'SINAC Oficial Costa Rica' },
        { uri: 'https://www.ict.go.cr', title: 'Instituto Costarricense de Turismo' }
      ],
      modelUsed: 'gemini-3.5-flash-fallback'
    };
  }
}
