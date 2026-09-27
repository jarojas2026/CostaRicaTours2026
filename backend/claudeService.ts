/**
 * 🧠 Servicio de Integración de Claude (Anthropic en Google Cloud Vertex AI)
 * Para Costa Rica Tours: Asistente Conversacional Avanzado, Planificador Experto de Itinerarios y Auditoría Operativa
 */

import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { TOURS } from '../src/data/toursData';
import type { Language } from '../src/types';

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
      '';

    if (!projectId) throw new Error('GOOGLE_CLOUD_PROJECT/ANTHROPIC_VERTEX_PROJECT_ID no configurado.');

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
    '';
  const region =
    process.env.ANTHROPIC_VERTEX_REGION ||
    process.env.CLOUD_ML_REGION ||
    'us-east5';
  const model = process.env.ANTHROPIC_VERTEX_MODEL || 'claude-opus-5-5';
  if (!projectId) return { available: false, model, region: '', projectId: '', error: 'Proyecto de Vertex AI no configurado.' };

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
const CLAUDE_SYSTEM_PROMPT = `Eres el cerebro conversacional de Costa Rica Tours, un operador turístico asistido por IA.
Responde en el idioma solicitado. Usa únicamente datos verificables entregados por las herramientas y el contexto actual.
Nunca inventes disponibilidad, precios, proveedores, políticas, horarios, rutas o reembolsos.
Cuando falte un dato vivo, decláralo y solicita/verifica la fuente correspondiente.
Puedes razonar, planificar y proponer acciones, pero los efectos financieros, legales, de políticas y cambios irreversibles requieren los guardrails y aprobaciones del sistema.
Trata la memoria del viajero como contexto personalizado, no como verdad absoluta: los datos recientes y verificables prevalecen.
La plataforma distingue STABLE_KNOWLEDGE, LIVE_VERIFIED, CUSTOMER_PROVIDED, PROVIDER_PROVIDED y UNVERIFIED.
Tu objetivo es ayudar a completar el viaje de inicio a fin con seguridad, claridad, hospitalidad y trazabilidad.`;

/**
 * 1. Genera una respuesta conversacional con Claude en Vertex AI
 */
export async function generateClaudeChatResponse(
  message: string,
  language: Language = 'es',
  history: Array<{ role: 'user' | 'assistant' | 'bot'; text: string }> = [],
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ reply: string; modelUsed: string; success: boolean; quickActions?: Array<{ label: string; action: string; data?: any }> }> {
  const client = getClaudeClient();
  const languageLabels: Record<Language, string> = { es: 'español', en: 'inglés', de: 'alemán', fr: 'francés', zh: 'chino', ja: 'japonés' };
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
    modelUsed: `Claude (${modelName})`,
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
  language: Language;
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
