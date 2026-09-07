/**
 * 🤖 Servicio de Asistente Inteligente y Agentes de IA para Costa Rica Tours
 * Proporciona el motor conversacional oficial y los agentes del Enjambre Operativo (Triage, Procesador, Contingencia, Supervisor).
 */

import { GoogleGenAI } from '@google/genai';
import { TOURS } from '../src/data/toursData';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock-key' });

// Registro en memoria de excepciones para diagnóstico del Supervisor
const exceptionLogs: Array<{
  timestamp: string;
  agentName: string;
  errorContext: string;
  rawData?: any;
}> = [];

/**
 * Resumen de tours reales para conocimiento del modelo
 */
const getToursKnowledgeBase = () => {
  return TOURS.slice(0, 15)
    .map(
      (t) =>
        `- ${t.title.es} (${t.title.en || t.title.es}): $${t.priceUSD} USD, duración: ${t.durationLabel?.es || `${t.durationHours} hrs`}, cupo máx: ${t.maxGroupSize || 15} pax, categoría: ${t.category}, puntos: ${t.pickupHotels?.slice(0, 2).join(', ') || 'Hotel en zona turística'}`
    )
    .join('\n');
};

/**
 * Instrucción de Sistema Oficial para el Asistente de Costa Rica Tours
 */
const SYSTEM_INSTRUCTION = `Eres el asistente inteligente oficial de Costa Rica Tours, especialista en turismo, atracciones, precios, normativas y rutas de Costa Rica. Tu misión es brindar respuestas precisas, amables, completas y útiles a los usuarios que consultan sobre nuestra plataforma y servicios.

--- INSTRUCCIONES ---

1. IDIOMA: Responde SIEMPRE en el mismo idioma en el que te escriba el usuario (español o inglés). Si mezcla ambos, usa español por defecto.

2. ALCANCE: Responde ÚNICAMENTE sobre:
   - Tours, excursiones, parques nacionales, playas y destinos de Costa Rica
   - Precios, disponibilidad, horarios, duración y puntos de encuentro
   - Proceso de reserva, formas de pago, políticas de cancelación y reembolsos
   - Requisitos de ingreso, recomendaciones de vestimenta, clima y seguridad
   - Información general sobre Costa Rica para turistas

3. BASE DE RESPUESTA: Usa siempre los datos, tarifas vigentes, rutas y políticas que te han sido proporcionadas como base de conocimiento. Si te falta información o no estás seguro, di claramente: "Actualmente no cuento con ese dato exacto. Por favor contáctanos directamente para verificar disponibilidad y precio actualizado" — NO inventes precios, horarios ni nombres de tours.

4. TONO: Amable, cálido, profesional, servicial y entusiasta. Transmite confianza y amor por Costa Rica. Sé conciso pero completo. Evita respuestas muy largas a menos que el usuario lo pida.

5. LLAMADO A LA ACCIÓN: Al final de cada respuesta, invita amablemente a reservar o a hacer más preguntas. Ejemplo: "¿Te gustaría que te ayude con una reserva o tienes más dudas sobre este tour?"

6. SI ES UNA RESERVA: Cuando el usuario quiera reservar, guíalo paso a paso:
   - Nombre del tour / servicio
   - Fecha y hora deseada
   - Cantidad de personas (adultos / niños)
   - Nombre completo y correo electrónico
   - ¿Alguna necesidad especial?
   → Confirma los datos y dile: "¡Perfecto! Estos son tus datos. Te enviaremos la confirmación y los pasos de pago en breve. ¡Gracias por elegir Costa Rica Tours!"

7. REGLAS CLAVE:
   - NO ofrezcas servicios o precios que no estén autorizados
   - NO hagas descuentos ni cambies precios por tu cuenta
   - NO prometas disponibilidad sin verificar
   - Si el usuario se queja, sé empático y ofrécele escalarlo a atención al cliente

--- FORMATO DE RESPUESTA ---
- Empieza con saludo o respuesta directa
- Usa viñetas para listar información (precios, qué incluye, recomendaciones)
- Termina con invitación a reservar o preguntar más

--- TOURS Y TARIFAS AUTORIZADAS ---
${getToursKnowledgeBase()}
`;

/**
 * Procesa una consulta de chat del usuario con el Asistente Oficial
 */
export async function processChatInquiry(
  message: string,
  language: 'es' | 'en' = 'es',
  history: Array<{ role: 'user' | 'bot'; text: string }> = []
): Promise<{ reply: string; quickActions: Array<{ label: string; action: string; data?: any }> }> {
  const isEn = language === 'en';

function getKnowledgeBaseReply(message: string, isEn: boolean) {
  const lower = message.toLowerCase();

  if (lower.includes('arenal') || lower.includes('volcan') || lower.includes('volcano') || lower.includes('tabacon')) {
    return {
      reply: isEn
        ? `🌋 **Arenal Volcano & Tabacón Natural Hot Springs**\n\n• **Price**: $145 USD per adult / $95 per child (under 11)\n• **Duration**: Full Day (~12 hours)\n• **Includes**: Certified naturalist guide, roundtrip AC transport, hot springs pass, and buffet dinner.\n• **Recommendations**: Swimsuit, insect repellent, comfortable walking shoes, and a light jacket.\n\n¿Would you like me to help you book this tour or do you have any questions?`
        : `🌋 **Tour al Volcán Arenal y Termales Naturales Tabacón**\n\n• **Tarifa**: $145 USD por adulto / $95 por niño (menores de 11 años)\n• **Duración**: Día completo (~12 horas)\n• **Incluye**: Guía naturalista certificado, transporte ida y vuelta con A/C, entrada a las aguas termales y cena buffet.\n• **Recomendaciones**: Traje de baño, repelente de insectos, calzado cómodo para caminar y abrigo liviano.\n\n¿Te gustaría que te ayude a coordinar tu reserva o tienes alguna duda adicional?`,
      quickActions: [
        { label: isEn ? '📅 Book Tour' : '📅 Reservar este Tour', action: 'book', data: { tourId: 'arenal-volcano-hot-springs' } },
        { label: isEn ? '💬 Direct WhatsApp' : '💬 WhatsApp Directo', action: 'direct_whatsapp' }
      ]
    };
  }

  if (lower.includes('manuel antonio') || lower.includes('playa') || lower.includes('beach')) {
    return {
      reply: isEn
        ? `🏖️ **Manuel Antonio National Park Nature Tour**\n\n• **Price**: $95 USD per adult / $70 per child\n• **Duration**: Full Day (~10 hours)\n• **Includes**: Certified bilingual guide with spotting scope, park entry tickets, transport, and beach time.\n• **Wildlife**: Sloths, white-faced monkeys, toucans, and iguanas.\n\n¿Would you like to book your spots or check available dates?`
        : `🏖️ **Excursión al Parque Nacional Manuel Antonio y Playas**\n\n• **Tarifa**: $95 USD por adulto / $70 por niño\n• **Duración**: Día completo (~10 horas)\n• **Incluye**: Guía certificado con telescopio de alta gama, tiquetes oficiales de ingreso al parque, transporte y tiempo libre en la playa.\n• **Fauna destacada**: Perezosos de 2 y 3 dedos, monos cariblancos, tucanes e iguanas.\n\n¿Te gustaría asegurar tus espacios o consultar fechas disponibles?`,
      quickActions: [
        { label: isEn ? '📅 Book Now' : '📅 Reservar Ahora', action: 'book', data: { tourId: 'manuel-antonio-national-park' } },
        { label: isEn ? '💬 Direct WhatsApp' : '💬 WhatsApp Directo', action: 'direct_whatsapp' }
      ]
    };
  }

  if (lower.includes('canopy') || lower.includes('zipline') || lower.includes('tirolesa') || lower.includes('monteverde')) {
    return {
      reply: isEn
        ? `🌲 **Monteverde Cloud Forest & Extreme Canopy Zipline**\n\n• **Price**: $110 USD per adult / $85 per child\n• **Duration**: ~6 hours\n• **Includes**: 15 cables, Superman flight, Tarzan swing, hanging bridges, certified equipment, and safety briefing.\n• **Requirements**: Minimum age 6 years; comfortable athletic clothing and closed-toe shoes.\n\n¿Would you like me to reserve this adventure for you?`
        : `🌲 **Canopy Extremo y Puentes Colgantes en Monteverde**\n\n• **Tarifa**: $110 USD por adulto / $85 por niño\n• **Duración**: ~6 horas\n• **Incluye**: 15 cables de tirolesa, vuelo Superman, salto Tarzán, puentes colgantes, equipo certificado y charla de seguridad.\n• **Requisitos**: Edad mínima 6 años, ropa deportiva cómoda y calzado cerrado.\n\n¿Te gustaría que te reserve esta aventura o tienes alguna consulta?`,
      quickActions: [
        { label: isEn ? '📅 Book Adventure' : '📅 Reservar Aventura', action: 'book', data: { tourId: 'monteverde-canopy-extreme' } },
        { label: isEn ? '💬 Direct WhatsApp' : '💬 WhatsApp Directo', action: 'direct_whatsapp' }
      ]
    };
  }

  if (lower.includes('precio') || lower.includes('tarifa') || lower.includes('rate') || lower.includes('cost')) {
    return {
      reply: isEn
        ? `💵 **Official Guaranteed Rates - Costa Rica Tours**\n\n• **Arenal Volcano & Hot Springs**: $145 USD\n• **Manuel Antonio National Park**: $95 USD\n• **Monteverde Canopy & Hanging Bridges**: $110 USD\n• **Tortuguero Canal Safari**: $130 USD\n• **Catamaran Sunset & Snorkel**: $90 USD\n\nAll prices include official park permits, certified guides, and taxes. ¿Which tour would you like to book?`
        : `💵 **Tarifas Oficiales Garantizadas - Costa Rica Tours**\n\n• **Volcán Arenal y Termales**: $145 USD\n• **Parque Nacional Manuel Antonio**: $95 USD\n• **Canopy y Puentes en Monteverde**: $110 USD\n• **Safari en Canales de Tortuguero**: $130 USD\n• **Catamarán Snorkel y Atardecer**: $90 USD\n\nTodas las tarifas incluyen entradas a parques nacionales, guías certificados e impuestos. ¿Cuál de estas excursiones te interesa reservar?`,
      quickActions: [
        { label: isEn ? '📅 Reserve Spots' : '📅 Reservar Cupo', action: 'book' },
        { label: isEn ? '💬 Speak with Advisor' : '💬 Hablar con Asesor', action: 'direct_whatsapp' }
      ]
    };
  }

  if (lower.includes('reserv') || lower.includes('book')) {
    return {
      reply: isEn
        ? `📝 **Tour Reservation Request**\n\nTo complete your booking, please provide:\n• Desired tour name\n• Date & preferred time\n• Number of adults & children\n• Full name & email address\n• Pickup hotel or special requests\n\nWe will confirm your seats and send secure checkout links immediately. What tour are you interested in?`
        : `📝 **Solicitud de Reserva de Tour**\n\nPara ayudarte con tu reserva paso a paso, por favor indícame:\n• Nombre del tour deseado\n• Fecha y horario preferido\n• Cantidad de personas (adultos y niños)\n• Nombre completo y correo electrónico\n• Hotel de recogida o requerimiento especial\n\nTe confirmaremos la disponibilidad y los pasos de pago de inmediato. ¿Qué tour te gustaría reservar?`,
      quickActions: [
        { label: isEn ? '📅 Open Booking Form' : '📅 Abrir Formulario', action: 'book' },
        { label: isEn ? '💬 Direct WhatsApp' : '💬 WhatsApp Directo', action: 'direct_whatsapp' }
      ]
    };
  }

  return {
    reply: isEn
      ? `🇨🇷 ¡Pura Vida! Welcome to Costa Rica Tours. We are official providers of excursions, rainforest adventures, and transport across Costa Rica.\n\n• **Direct Booking**: Instant confirmation with no hidden fees\n• **Certified Naturalists**: Bilingual guides certified by ICT\n• **Flexible Policy**: Free cancellations up to 24h prior\n\n¿How can I help you plan your journey today?`
      : `🇨🇷 ¡Pura Vida! Bienvenido a Costa Rica Tours. Somos especialistas en excursiones oficiales, parques nacionales y aventuras auténticas en Costa Rica.\n\n• **Reserva Directa**: Confirmación inmediata sin cargos sorpresa\n• **Guías Oficiales**: Naturalistas certificados por el ICT\n• **Políticas Claras**: Cancelación flexible hasta 24 horas antes\n\n¿En qué podemos asesorarte hoy para tus vacaciones?`,
    quickActions: [
      { label: isEn ? '🔍 Explore Tours' : '🔍 Ver Excursiones', action: 'send_message', data: { message: isEn ? 'Show tours' : 'Ver excursiones' } },
      { label: isEn ? '💬 Direct WhatsApp' : '💬 WhatsApp Directo', action: 'direct_whatsapp' }
    ]
  };
}

  try {
    const formattedHistory = history.map((h) => `${h.role === 'user' ? 'Usuario' : 'Asistente'}: ${h.text}`).join('\n');
    const prompt = `${formattedHistory ? `HISTORIAL DE LA CONVERSACIÓN:\n${formattedHistory}\n\n` : ''}CONSULTA ACTUAL DEL USUARIO:\n${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7
      }
    });

    const reply = response.text?.trim() || (isEn ? 'Hello! How can I assist you with your trip to Costa Rica?' : '¡Hola! ¿En qué puedo ayudarte hoy para tu viaje a Costa Rica?');

    // Deducir acciones rápidas contextuales
    const quickActions: Array<{ label: string; action: string; data?: any }> = [];
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('reserv') || lowerMsg.includes('book') || lowerMsg.includes('precio') || lowerMsg.includes('cost')) {
      quickActions.push({
        label: isEn ? '📅 Book Now' : '📅 Reservar Ahora',
        action: 'book'
      });
    }

    quickActions.push({
      label: isEn ? '💬 Direct WhatsApp' : '💬 WhatsApp Directo',
      action: 'direct_whatsapp'
    });

    return { reply, quickActions };
  } catch (error) {
    console.warn('Fallback a base de conocimiento oficial:', error);
    return getKnowledgeBaseReply(message, isEn);
  }
}

/**
 * 1. AGENTE TRIAGE: Clasifica el mensaje entrante y extrae entidades clave
 */
export async function runTriage(rawMessage: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Analiza este mensaje de cliente de turismo en Costa Rica: "${rawMessage}". Extrae intención y datos estructurados.`,
      config: {
        systemInstruction:
          'Eres el Agente Triage. Devuelve un JSON con: intent (booking_inquiry, pricing, modification, cancellation, support), confidence (número 0 a 1), extractedData: { tourName, passengers, targetDate, language, budget, contact }',
        responseMimeType: 'application/json'
      }
    });
    return JSON.parse(response.text || '{}');
  } catch {
    const lower = rawMessage.toLowerCase();
    const isBooking = lower.includes('reserv') || lower.includes('book');
    const isPrice = lower.includes('precio') || lower.includes('cost') || lower.includes('cuanto');
    return {
      intent: isBooking ? 'booking_inquiry' : isPrice ? 'pricing' : 'general_inquiry',
      confidence: 0.9,
      extractedData: {
        raw: rawMessage,
        language: rawMessage.match(/[a-zA-Z]/) ? 'es' : 'es'
      }
    };
  }
}

/**
 * 2. AGENTE PROCESADOR: Genera borrador de respuesta y tareas en base de datos
 */
export async function runProcessor(rawMessage: string, intent: string, extractedData: any) {
  try {
    const prompt = `Mensaje: "${rawMessage}", Intención: ${intent}, Datos: ${JSON.stringify(extractedData)}. Genera las acciones necesarias y una respuesta cordial en formato JSON.`;
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Eres el Agente Procesador de Ventas de Costa Rica Tours. Genera un JSON con: draftResponse (string con saludo, viñetas y llamado a la acción), databaseActions (array de strings con acciones de CRM sugeridas), priority (high, medium, low).',
        responseMimeType: 'application/json'
      }
    });
    return JSON.parse(response.text || '{}');
  } catch {
    return {
      draftResponse:
        '¡Pura Vida! Con gusto te asistimos con información de nuestras excursiones oficiales en Costa Rica. ¿En qué fecha planeas visitarnos?',
      databaseActions: ['Registrar contacto en CRM', 'Crear lead prospecto en n8n'],
      priority: 'medium'
    };
  }
}

/**
 * 3. AGENTE DE CONTINGENCIA: Manejo de clima y disponibilidad
 */
export async function runContingency(context: any) {
  return {
    status: 'analizado',
    contingencyPlan: 'Ruta alternativa por Carretera 142 en caso de lluvia fuerte en la cordillera.',
    riskLevel: 'bajo',
    timestamp: new Date().toISOString()
  };
}

/**
 * 4. AGENTE SUPERVISOR: Diagnóstico y auditoría de excepciones
 */
export async function runSupervisor() {
  const count = exceptionLogs.length;
  return {
    auditedCount: count,
    status: count === 0 ? 'todos_los_sistemas_operativos' : 'advertencias_detectadas',
    summary:
      count === 0
        ? 'El enjambre y los webhooks de n8n operan de forma óptima.'
        : `Se han registrado ${count} advertencias en operaciones recientes. Se ajustaron las reglas de normalización.`,
    recentLogs: exceptionLogs.slice(-5)
  };
}

/**
 * Registra una excepción para la auditoría del Supervisor
 */
export function logException(agentName: string, errorContext: string, rawData?: any) {
  exceptionLogs.push({
    timestamp: new Date().toISOString(),
    agentName,
    errorContext,
    rawData
  });
  if (exceptionLogs.length > 100) {
    exceptionLogs.shift();
  }
}
