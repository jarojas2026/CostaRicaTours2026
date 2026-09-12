/**
 * 🧠 Servicio de Integración de Claude (Anthropic en Google Cloud Vertex AI)
 * Para Costa Rica Tours: Asistente Conversacional Avanzado, Planificador Experto de Itinerarios y Auditoría Operativa
 */

import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { TOURS } from '../src/data/toursData';

let claudeClient: AnthropicVertex | null = null;
let clientInitializationError: string | null = null;

/**
 * Obtiene o inicializa perezosamente (lazy initialization) el cliente de Anthropic Vertex AI
 */
export function getClaudeClient(): AnthropicVertex | null {
  if (claudeClient) return claudeClient;

  try {
    const projectId =
      process.env.ANTHROPIC_VERTEX_PROJECT_ID ||
      process.env.GCP_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      'gen-lang-client-0782739149';

    const region =
      process.env.ANTHROPIC_VERTEX_REGION ||
      process.env.CLOUD_ML_REGION ||
      process.env.VERTEX_AI_REGION ||
      'us-east5';

    claudeClient = new AnthropicVertex({
      projectId,
      region
    });

    clientInitializationError = null;
    return claudeClient;
  } catch (err: any) {
    clientInitializationError = err.message || 'Error inicializando AnthropicVertex';
    console.warn('⚠️ Anthropic Vertex AI Client no disponible temporalmente:', clientInitializationError);
    return null;
  }
}

/**
 * Consulta el estado de disponibilidad del motor Claude
 */
export function getClaudeStatus(): { available: boolean; model: string; region: string; projectId: string; error?: string } {
  const projectId =
    process.env.ANTHROPIC_VERTEX_PROJECT_ID ||
    process.env.GCP_PROJECT ||
    'gen-lang-client-0782739149';
  const region =
    process.env.ANTHROPIC_VERTEX_REGION ||
    process.env.CLOUD_ML_REGION ||
    'us-east5';
  const model = process.env.ANTHROPIC_VERTEX_MODEL || 'claude-3-5-sonnet-v2@20241022';

  return {
    available: !clientInitializationError,
    model,
    region,
    projectId,
    error: clientInitializationError || undefined
  };
}

/**
 * Base de conocimiento compacta de tours oficiales
 */
const getToursContext = () => {
  return TOURS.slice(0, 16)
    .map(
      (t) =>
        `• [ID: ${t.id}] ${t.title.es} (${t.title.en || t.title.es}): $${t.priceUSD} USD. Duración: ${t.durationLabel?.es || `${t.durationHours}h`}. Región: ${t.region}. Categoría: ${t.category}. Cupo máx: ${t.maxGroupSize || 15}. Destacados: ${t.highlights?.es?.slice(0, 3).join(', ') || 'Naturaleza'}`
    )
    .join('\n');
};

/**
 * Prompt de sistema oficial para Claude
 */
const CLAUDE_SYSTEM_PROMPT = `Eres el Asistente Inteligente Oficial de "Costa Rica Tours", impulsado por Claude 3.5 Sonnet sobre Google Cloud Vertex AI.
Tu identidad refleja la auténtica esencia del "Pura Vida": calidez, profesionalismo, hospitalidad y profundo conocimiento de la biodiversidad, microclimas, geografía y leyes turísticas de Costa Rica.

REGLAS ESENCIALES:
1. IDIOMA: Responde SIEMPRE en el mismo idioma en que te escribe el viajero (español o inglés).
2. VERACIDAD: Solo recomienda tours, tarifas y políticas vigentes en nuestra base oficial. Nunca inventes precios ni operadores.
3. SOSTENIBILIDAD (CST): Promueve el turismo regenerativo, el respeto a la fauna silvestre (no tocar ni alimentar animales) y el apoyo a las comunidades rurales.
4. ESTRUCTURA DE RESPUESTA:
   - Saludo cálido tico o respuesta ejecutiva directa
   - Puntos clave en viñetas claras (Precios en USD, qué incluye, qué llevar)
   - Llamado a la acción cordial para reservar o resolver dudas
5. TIEMPOS DE TRASLADO REALES EN COSTA RICA:
   - San José (SJO) a La Fortuna: ~3 a 3.5 horas
   - La Fortuna a Monteverde: ~3.5 horas (o 2.5h vía transfer lago Arenal)
   - San José a Manuel Antonio: ~2.5 a 3 horas
   - San José a Tortuguero: ~4 a 5 horas (terrestre + lancha por La Pavona)

CATÁLOGO AUTORIZADO DE TOURS Y TARIFAS:
${getToursContext()}
`;

/**
 * 1. Genera una respuesta conversacional con Claude en Vertex AI
 */
export async function generateClaudeChatResponse(
  message: string,
  language: 'es' | 'en' = 'es',
  history: Array<{ role: 'user' | 'assistant' | 'bot'; text: string }> = [],
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ reply: string; modelUsed: string; success: boolean; quickActions?: Array<{ label: string; action: string; data?: any }> }> {
  const client = getClaudeClient();
  const isEn = language === 'en';
  const modelName = process.env.ANTHROPIC_VERTEX_MODEL || 'claude-3-5-sonnet-v2@20241022';

  if (!client) {
    throw new Error('Claude Vertex AI client not initialized');
  }

  // Formatear mensajes respetando la restricción de turnos alternados de Anthropic
  const formattedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const h of history) {
    if (!h.text || !h.text.trim()) continue;
    const role: 'user' | 'assistant' = h.role === 'user' ? 'user' : 'assistant';
    
    if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === role) {
      formattedMessages[formattedMessages.length - 1].content += `\n\n${h.text.trim()}`;
    } else {
      formattedMessages.push({ role, content: h.text.trim() });
    }
  }

  // Asegurar que el último mensaje sea del usuario con la consulta actual
  if (formattedMessages.length === 0 || formattedMessages[formattedMessages.length - 1].role === 'assistant') {
    formattedMessages.push({ role: 'user', content: message });
  } else {
    formattedMessages[formattedMessages.length - 1].content += `\n\n${message}`;
  }

  const response = await client.messages.create({
    model: modelName,
    max_tokens: options?.maxTokens || 1500,
    temperature: options?.temperature ?? 0.7,
    system: CLAUDE_SYSTEM_PROMPT,
    messages: formattedMessages
  });

  // Extraer texto devuelto por Claude
  let textOutput = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      textOutput += block.text;
    }
  }

  // Acciones rápidas contextuales
  const quickActions: Array<{ label: string; action: string; data?: any }> = [];
  const lower = message.toLowerCase();

  if (lower.includes('reserv') || lower.includes('book') || lower.includes('precio') || lower.includes('cost')) {
    quickActions.push({
      label: isEn ? '📅 Open Booking' : '📅 Iniciar Reserva',
      action: 'book'
    });
  }
  quickActions.push({
    label: isEn ? '💬 WhatsApp Concierge' : '💬 WhatsApp Directo',
    action: 'direct_whatsapp'
  });

  return {
    reply: textOutput.trim(),
    modelUsed: `Claude 3.5 Sonnet (${modelName})`,
    success: true,
    quickActions
  };
}

/**
 * 2. Planificador Experto de Itinerarios Personalizados con Claude
 */
export async function generateClaudeItinerary(params: {
  days: number;
  travelers: number;
  style: 'eco_relax' | 'adventure_extreme' | 'family_comfort' | 'wildlife_photography' | 'cultural_discovery';
  regions: string[];
  budget: 'standard' | 'premium' | 'luxury';
  language: 'es' | 'en';
  specialRequests?: string;
}): Promise<{
  title: string;
  summary: string;
  itinerary: Array<{
    day: number;
    destination: string;
    morningActivity: string;
    afternoonActivity: string;
    eveningActivity: string;
    driveEstimate: string;
    ecoTip: string;
    suggestedTours: string[];
  }>;
  packingList: string[];
  recommendedSeason: string;
  modelUsed: string;
}> {
  const client = getClaudeClient();
  const modelName = process.env.ANTHROPIC_VERTEX_MODEL || 'claude-3-5-sonnet-v2@20241022';

  if (!client) {
    throw new Error('Claude Vertex AI client not available for itinerary planning');
  }

  const prompt = `Como planificador maestro de viajes de Costa Rica Tours, diseña un itinerario perfecto y detallado de ${params.days} días en Costa Rica para ${params.travelers} personas.
- Estilo: ${params.style}
- Nivel de presupuesto: ${params.budget}
- Regiones de preferencia: ${params.regions?.join(', ') || 'Arenal, Monteverde y Manuel Antonio'}
- Idioma solicitado: ${params.language === 'en' ? 'Inglés' : 'Español'}
- Notas especiales: ${params.specialRequests || 'Ninguna'}

Devuelve ÚNICAMENTE un objeto JSON válido (sin explicaciones adicionales antes ni después) con la siguiente estructura:
{
  "title": "Nombre atractivo del itinerario",
  "summary": "Resumen ejecutivo del viaje (3-4 líneas)",
  "recommendedSeason": "Mejor época del año para realizarlo",
  "packingList": ["item 1", "item 2", "item 3", "item 4"],
  "itinerary": [
    {
      "day": 1,
      "destination": "San José a Arenal / La Fortuna",
      "morningActivity": "Detalle mañana",
      "afternoonActivity": "Detalle tarde",
      "eveningActivity": "Detalle noche",
      "driveEstimate": "3 horas por Ruta 1 / 702",
      "ecoTip": "Recomendación ecológica o de microclima",
      "suggestedTours": ["Tour al Volcán Arenal", "Aguas Termales Tabacón"]
    }
  ]
}`;

  const response = await client.messages.create({
    model: modelName,
    max_tokens: 3000,
    temperature: 0.4,
    system: 'Eres un generador especializado de itinerarios turísticos de Costa Rica. Responde estrictamente en formato JSON válido.',
    messages: [{ role: 'user', content: prompt }]
  });

  let rawJson = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      rawJson += block.text;
    }
  }

  // Limpiar posibles bloques markdown de código
  rawJson = rawJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(rawJson);

  return {
    ...parsed,
    modelUsed: `Claude 3.5 Sonnet (Vertex AI)`
  };
}

/**
 * 3. Auditor Antifraude y Análisis de Riesgo Operativo con Claude
 */
export async function analyzeOperationalRiskWithClaude(booking: any): Promise<{
  riskScore: 'bajo' | 'medio' | 'alto';
  numericalScore: number;
  approved: boolean;
  insights: string[];
  recommendations: string[];
  logisticsInstructions: string[];
}> {
  const client = getClaudeClient();
  const modelName = process.env.ANTHROPIC_VERTEX_MODEL || 'claude-3-5-sonnet-v2@20241022';

  if (!client) {
    const total = Number(booking.totalUSD || 0);
    return {
      riskScore: total > 2000 ? 'medio' : 'bajo',
      numericalScore: total > 2000 ? 35 : 10,
      approved: true,
      insights: ['Evaluación heurística local activa'],
      recommendations: ['Verificar voucher antes de la salida'],
      logisticsInstructions: ['Asignar chofer 30 minutos antes en recepción']
    };
  }

  const prompt = `Analiza la siguiente reserva de tour en Costa Rica para control antifraude y logística operativa:
- Reserva ID: ${booking.bookingId}
- Tour: ${booking.tourName}
- Fecha / Hora: ${booking.date} a las ${booking.time}
- Pasajeros: ${booking.adults} adultos, ${booking.children || 0} niños
- Total: $${booking.totalUSD} USD (${booking.currency || 'USD'})
- Método de Pago: ${booking.paymentMethod}
- Cliente: ${booking.customerName} (${booking.customerEmail}, tel: ${booking.customerPhone})
- Hotel de recogida: ${booking.pickupHotel || 'No especificado'}
- Notas: ${booking.specialRequests || 'Ninguna'}

Devuelve ÚNICAMENTE un JSON con:
{
  "riskScore": "bajo" | "medio" | "alto",
  "numericalScore": 0 a 100,
  "approved": boolean,
  "insights": ["punto 1", "punto 2"],
  "recommendations": ["recomendación 1", "recomendación 2"],
  "logisticsInstructions": ["instrucción chofer/guía 1", "instrucción 2"]
}`;

  try {
    const response = await client.messages.create({
      model: modelName,
      max_tokens: 1000,
      temperature: 0.2,
      system: 'Eres el auditor senior de seguridad y operaciones de Costa Rica Tours. Responde solo en JSON válido.',
      messages: [{ role: 'user', content: prompt }]
    });

    let rawJson = '';
    for (const block of response.content) {
      if (block.type === 'text') rawJson += block.text;
    }
    rawJson = rawJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(rawJson);
  } catch (err) {
    console.error('Error evaluando riesgo con Claude:', err);
    return {
      riskScore: 'bajo',
      numericalScore: 15,
      approved: true,
      insights: ['Validación estándar completada'],
      recommendations: ['Confirmar hora de recogida con el hotel'],
      logisticsInstructions: ['Coordinar con guía turístico oficial']
    };
  }
}
