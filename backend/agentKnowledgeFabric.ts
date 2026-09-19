import { TOURS, REGIONS } from '../src/data/toursData';
import { retrieveRelevantMemory } from './memoryService';
import { getWeatherForRegion } from './weatherPulseService';
import { selectEvolvedSkill } from './skillEvolutionEngine';

export type AgentIdentity = {
  id: string;
  mission: string;
  canRead: string[];
  canWrite: string[];
  escalation: string[];
};

export const AGENT_IDENTITIES: AgentIdentity[] = [
  { id: 'concierge', mission: 'Descubrir necesidades, orientar y mantener continuidad con el viajero.', canRead: ['catalog', 'availability', 'memory', 'weather'], canWrite: ['memory', 'tasks'], escalation: ['booking', 'support'] },
  { id: 'triage', mission: 'Clasificar intención, riesgo, urgencia y entidades.', canRead: ['conversation', 'booking', 'memory'], canWrite: ['tasks', 'memory'], escalation: ['supervisor'] },
  { id: 'booking', mission: 'Coordinar disponibilidad, cotización y estado de reserva.', canRead: ['catalog', 'availability', 'memory', 'payments'], canWrite: ['booking', 'tasks'], escalation: ['supervisor', 'payment'] },
  { id: 'provider_liaison', mission: 'Coordinar proveedores, guías, transporte y cambios operativos.', canRead: ['booking', 'provider', 'weather', 'memory'], canWrite: ['provider_tasks', 'booking_notes'], escalation: ['operations', 'supervisor'] },
  { id: 'operations', mission: 'Resolver despacho, clima, rutas, retrasos y contingencias.', canRead: ['booking', 'provider', 'weather', 'memory'], canWrite: ['operations_tasks', 'booking_notes'], escalation: ['supervisor', 'human'] },
  { id: 'supervisor', mission: 'Auditar decisiones, contradicciones, fallos y seguridad.', canRead: ['all_operational'], canWrite: ['lessons', 'tasks'], escalation: ['human'] },
  { id: 'learning', mission: 'Convertir resultados y feedback en conocimiento reutilizable sin auto-modificar código.', canRead: ['events', 'outcomes', 'feedback'], canWrite: ['lessons', 'training_examples'], escalation: ['supervisor'] }
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
  const evolved = selectEvolvedSkill(skillAgent, input.query, input.sessionId || '');
  const skillHints = evolved ? `${evolved.name} v${evolved.version} [${evolved.lifecycle}/${evolved.exposure}] score=${evolved.routingScore}` : '';

  return [
    'FUENTE DE VERDAD OPERATIVA: usa los servicios de dominio; no inventes disponibilidad, precios, reservas ni políticas.',
    'AGENTES: comparte contexto mediante memoria/eventos; no dupliques preguntas que ya fueron respondidas.',
    memory?.summary ? `MEMORIA DEL VIAJERO: ${memory.summary}` : '',
    memory?.relevantTurns?.length ? `CONTEXTO RELEVANTE: ${memory.relevantTurns.map(t => `${t.role}: ${t.text}`).join(' | ')}` : '',
    region ? `REGIÓN: ${region.name.es} / ${region.name.en}` : '',
    weather ? `CLIMA ACTUAL: ${weather.temperatureC}°C, ${weather.labelEs}, lluvia ${weather.precipitationProbability}%, viento ${weather.windKmh} km/h, fuente ${weather.source}` : '',
    skillHints ? `SKILLS DISPONIBLES: ${skillHints}` : '',
    relevantTours.length ? `TOURS RELEVANTES: ${relevantTours.map(t => JSON.stringify({ id: t.id, title: t.title.es, priceUSD: t.priceUSD, region: t.region, category: t.category })).join(' | ')}` : ''
  ].filter(Boolean).join('\n');
}
