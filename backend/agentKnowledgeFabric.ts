import { TOURS, REGIONS } from '../src/data/toursData';
import { retrieveRelevantMemory } from './memoryService';
import { getWeatherForRegion } from './weatherPulseService';
import { selectEvolvedSkill } from './skillEvolutionEngine';
import { EXTRA_AGENT_KNOWLEDGE, EXTENSION_AGENT_IDENTITIES, buildSkillInsights } from './agentSkillPack';

export type AgentIdentity = {
  id: string;
  mission: string;
  canRead: string[];
  canWrite: string[];
  escalation: string[];
  knowledge: string[];
};

// Los 7 agentes originales se conservan tal cual. El conocimiento adicional
// (agentSkillPack.ts) se SUMA al final y los agentes nuevos se agregan a la lista.
const BASE_AGENT_IDENTITIES: AgentIdentity[] = [
  {
    id: 'concierge', mission: 'Descubrir necesidades, orientar y mantener continuidad con el viajero.',
    canRead: ['catalog', 'availability', 'memory', 'weather'], canWrite: ['memory', 'tasks'], escalation: ['booking', 'support'],
    knowledge: [
      'Costa Rica tiene 2 estaciones: seca (dic-abr, mejor para playas Pacífico/Guanacaste) y verde/lluviosa (may-nov, mejor para volcanes/selva por vegetación exuberante, lluvias suelen ser en la tarde).',
      'Perfiles comunes: familias (priorizar tours cortos, seguros, con opción "fácil"), aventureros (canopy, rafting, volcanes), luna de miel (privados, Manuel Antonio/Monteverde), grupos senior (evitar "exigente", priorizar transporte cómodo).',
      'Nunca inventes disponibilidad ni precios — siempre consulta el catálogo real (TOURS) antes de prometer algo.',
      'Si el viajero menciona miedo a alturas, mareo, o movilidad reducida, evita recomendar canopy/rafting/exigente sin advertirlo explícitamente.'
    ]
  },
  {
    id: 'triage', mission: 'Clasificar intención, riesgo, urgencia y entidades.',
    canRead: ['conversation', 'booking', 'memory'], canWrite: ['tasks', 'memory'], escalation: ['supervisor'],
    knowledge: [
      'Urgente = tour es HOY o MAÑANA con problema activo (clima, transporte, pago fallido). Escalar directo a operations, no esperar.',
      'Riesgo de fraude: pagos de alto monto con cuenta nueva, múltiples reservas en minutos desde el mismo dispositivo, discrepancia entre país de tarjeta y país declarado del viajero.',
      'Intención de cancelación/reembolso siempre se marca como sensible — nunca prometer reembolso sin verificar política real de cancelación del tour.'
    ]
  },
  {
    id: 'booking', mission: 'Coordinar disponibilidad, cotización y estado de reserva.',
    canRead: ['catalog', 'availability', 'memory', 'payments'], canWrite: ['booking', 'tasks'], escalation: ['supervisor', 'payment'],
    knowledge: [
      'Todo precio se cotiza en USD (moneda base real del catálogo); conversión a CRC es solo referencial, nunca la fuente de verdad de cobro.',
      'Un "soft-hold" de cupo dura 15 minutos — si el cliente no completa el pago en ese tiempo, el cupo se libera automáticamente, avisa esto proactivamente.',
      'Nunca confirmes una reserva como "confirmada" sin verificación real de pago del lado del servidor — el estado visible al cliente debe reflejar el estado real en Firestore, no lo que el cliente afirma haber pagado.'
    ]
  },
  {
    id: 'provider_liaison', mission: 'Coordinar proveedores, guías, transporte y cambios operativos.',
    canRead: ['booking', 'provider', 'weather', 'memory'], canWrite: ['provider_tasks', 'booking_notes'], escalation: ['operations', 'supervisor'],
    knowledge: [
      'Un proveedor con status "prospecto" (sin acuerdo comercial firmado) NUNCA debe recibir pagos automáticos ni compromisos en su nombre — solo "activo" con email/PayPal configurado puede.',
      'Cambios de último momento (proveedor cancela, clima cierra ruta) requieren notificar al cliente en menos de 30 minutos idealmente, con alternativa concreta, no solo la mala noticia.'
    ]
  },
  {
    id: 'operations', mission: 'Resolver despacho, clima, rutas, retrasos y contingencias.',
    canRead: ['booking', 'provider', 'weather', 'memory'], canWrite: ['operations_tasks', 'booking_notes'], escalation: ['supervisor', 'human'],
    knowledge: [
      'Lluvia fuerte en La Fortuna/Arenal puede cerrar rutas de canopy por seguridad — siempre verificar clima real antes de confirmar operación del día.',
      'Cierres de carretera son comunes en temporada verde en rutas de montaña (Monteverde, Turrialba) — tener siempre ruta alterna o reprogramación lista antes de avisar al cliente.'
    ]
  },
  {
    id: 'supervisor', mission: 'Auditar decisiones, contradicciones, fallos y seguridad.',
    canRead: ['all_operational'], canWrite: ['lessons', 'tasks'], escalation: ['human'],
    knowledge: [
      'Cualquier agente que prometa un precio, disponibilidad, o política que contradiga los datos reales del catálogo/Firestore debe ser corregido y registrado como lección.',
      'Nunca permitir que ningún agente presente una simulación o dato inventado como si fuera real al viajero — esto es una violación de seguridad del sistema, no solo un error de contenido.'
    ]
  },
  {
    id: 'learning', mission: 'Convertir resultados y feedback en conocimiento reutilizable sin auto-modificar código.',
    canRead: ['events', 'outcomes', 'feedback'], canWrite: ['lessons', 'training_examples'], escalation: ['supervisor'],
    knowledge: [
      'Una lección solo se registra si viene de un resultado real observado (una reserva real, un feedback real) — nunca de una suposición sobre qué "probablemente" funciona mejor.'
    ]
  }
];

export const AGENT_IDENTITIES: AgentIdentity[] = [
  ...BASE_AGENT_IDENTITIES.map((agent) => ({
    ...agent,
    knowledge: [...agent.knowledge, ...(EXTRA_AGENT_KNOWLEDGE[agent.id] ?? [])]
  })),
  ...EXTENSION_AGENT_IDENTITIES
];

export async function buildAgentKnowledgeContext(input: {
  sessionId?: string;
  query: string;
  regionId?: string;
  includeTours?: boolean;
  agentId?: string;
}): Promise<string> {
  const memory = input.sessionId ? await retrieveRelevantMemory(input.sessionId, input.query, 6).catch(() => null) : null;
  const q = input.query.toLowerCase();
  const relevantTours = input.includeTours === false ? [] : TOURS.filter(t => {
    const hay = [t.id, t.title.es, t.title.en, t.region, t.category, t.description?.es, t.description?.en].join(' ').toLowerCase();
    return q.split(/\s+/).filter(Boolean).some(token => token.length > 3 && hay.includes(token));
  }).slice(0, 8);
  const region = input.regionId ? REGIONS.find(r => r.id === input.regionId) : undefined;
  const weather = input.regionId ? await getWeatherForRegion(input.regionId).catch(() => null) : null;
  const skillAgent = input.agentId || 'concierge';
  const identity = AGENT_IDENTITIES.find(a => a.id === skillAgent);
  const evolved = selectEvolvedSkill(skillAgent, input.query, input.sessionId || '');
  const skillHints = evolved ? `${evolved.name} v${evolved.version} [${evolved.lifecycle}/${evolved.exposure}] score=${evolved.routingScore}` : '';

  return [
    'FUENTE DE VERDAD OPERATIVA: usa los servicios de dominio; no inventes disponibilidad, precios, reservas ni políticas.',
    'AGENTES: comparte contexto mediante memoria/eventos; no dupliques preguntas que ya fueron respondidas.',
    identity?.knowledge?.length ? `CONOCIMIENTO ESPECIALIZADO (${identity.id}):\n- ${identity.knowledge.join('\n- ')}` : '',
    ...buildSkillInsights(input.query),
    memory?.summary ? `MEMORIA DEL VIAJERO: ${memory.summary}` : '',
    memory?.relevantTurns?.length ? `CONTEXTO RELEVANTE: ${memory.relevantTurns.map(t => `${t.role}: ${t.text}`).join(' | ')}` : '',
    region ? `REGIÓN: ${region.name.es} / ${region.name.en}` : '',
    weather ? `CLIMA ACTUAL: ${weather.temperatureC}°C, ${weather.labelEs}, lluvia ${weather.precipitationProbability}%, viento ${weather.windKmh} km/h, fuente ${weather.source}` : '',
    skillHints ? `SKILLS DISPONIBLES: ${skillHints}` : '',
    relevantTours.length ? `TOURS RELEVANTES: ${relevantTours.map(t => JSON.stringify({ id: t.id, title: t.title.es, priceUSD: t.priceUSD, region: t.region, category: t.category })).join(' | ')}` : ''
  ].filter(Boolean).join('\n');
}
