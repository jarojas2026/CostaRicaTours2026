import { getFirestoreDb } from './bookingService';
import { AGENT_IDENTITIES, type AgentIdentity } from './agentKnowledgeFabric';
import type {
  AgentOfficeId,
  AgentRecord,
  LocalizedText,
} from '../shared/agentOfficeTypes';

const COLLECTION = 'agents';
const REGISTRY_VERSION = 1;

type AgentProfileMetadata = {
  name: LocalizedText;
  office: AgentOfficeId;
  missionEn: string;
};

const AGENT_PROFILE_METADATA: Readonly<Record<string, AgentProfileMetadata>> = {
  concierge: {
    name: { es: 'Concierge', en: 'Concierge' },
    office: 'reception_sales',
    missionEn: 'Discover traveler needs, guide decisions and preserve continuity.',
  },
  triage: {
    name: { es: 'Clasificación', en: 'Triage' },
    office: 'reception_sales',
    missionEn: 'Classify intent, risk, urgency and relevant entities.',
  },
  booking: {
    name: { es: 'Reservas', en: 'Bookings' },
    office: 'reservations_availability',
    missionEn: 'Coordinate availability, quotes and booking state.',
  },
  provider_liaison: {
    name: { es: 'Enlace de proveedores', en: 'Provider Liaison' },
    office: 'providers_operators',
    missionEn: 'Coordinate providers, guides, transport and operational changes.',
  },
  operations: {
    name: { es: 'Operaciones', en: 'Operations' },
    office: 'providers_operators',
    missionEn: 'Resolve dispatch, weather, routing, delays and contingencies.',
  },
  supervisor: {
    name: { es: 'Supervisor', en: 'Supervisor' },
    office: 'verification_quality',
    missionEn: 'Audit decisions, contradictions, failures and safety.',
  },
  learning: {
    name: { es: 'Aprendizaje', en: 'Learning' },
    office: 'verification_quality',
    missionEn: 'Turn observed outcomes and feedback into reusable knowledge without self-modifying code.',
  },
  itinerary_planner: {
    name: { es: 'Planificador de itinerarios', en: 'Itinerary Planner' },
    office: 'reservations_availability',
    missionEn: 'Build coherent itineraries from the real catalog while respecting geography and traveler pace.',
  },
  conversion_advisor: {
    name: { es: 'Asesor de conversión', en: 'Conversion Advisor' },
    office: 'reception_sales',
    missionEn: 'Convert inquiries into bookings honestly by resolving questions, comparing options and proposing next steps.',
  },
  multilingual_support: {
    name: { es: 'Soporte multilingüe', en: 'Multilingual Support' },
    office: 'reception_sales',
    missionEn: 'Support travelers in their language while preserving accuracy and a warm tone.',
  },
  sustainability_guide: {
    name: { es: 'Guía de sostenibilidad', en: 'Sustainability Guide' },
    office: 'traveler_support',
    missionEn: 'Provide responsible-tourism guidance without making unsupported sustainability claims.',
  },
  safety_health: {
    name: { es: 'Seguridad y salud', en: 'Safety & Health' },
    office: 'traveler_support',
    missionEn: 'Provide prudent traveler safety and health guidance without medical diagnosis.',
  },
  payments_support: {
    name: { es: 'Soporte de pagos', en: 'Payments Support' },
    office: 'payments',
    missionEn: 'Explain payment methods, payment state and receipts without manipulating or simulating charges.',
  },
};

function metadataFor(identity: AgentIdentity): AgentProfileMetadata {
  const metadata = AGENT_PROFILE_METADATA[identity.id];
  if (!metadata) {
    throw new Error(`Agent "${identity.id}" has no explicit office/profile mapping. Registry sync fails closed until it is assigned deliberately.`);
  }
  return metadata;
}

export function buildAgentRegistrySeed(now = new Date()): AgentRecord[] {
  const timestamp = now.toISOString();
  return AGENT_IDENTITIES.map((identity) => {
    const metadata = metadataFor(identity);
    return {
      id: identity.id,
      name: metadata.name,
      office: metadata.office,
      mission: { es: identity.mission, en: metadata.missionEn },
      model: null,
      allowedTools: [],
      permissions: {
        read: [...identity.canRead],
        write: [...identity.canWrite],
        escalation: [...identity.escalation],
      },
      autonomyLevel: 0,
      status: 'no_signal',
      currentTask: null,
      lastHeartbeatAt: null,
      usageToday: null,
      version: REGISTRY_VERSION,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}

/**
 * Idempotently materializes the existing knowledge-fabric identities in Firestore.
 *
 * Existing runtime/governance fields are never reset by a profile sync. In
 * particular: autonomy, status, currentTask, heartbeat, usage, model and
 * allowedTools survive subsequent syncs.
 */
export async function syncAgentRegistryFromKnowledgeFabric(): Promise<{
  created: number;
  updated: number;
  total: number;
}> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible: no se puede sincronizar el registro de agentes.');

  const collection = db.collection(COLLECTION);
  const existingSnapshot = await collection.get();
  const existing = new Set(existingSnapshot.docs.map((doc) => doc.id));
  const now = new Date();
  const seeds = buildAgentRegistrySeed(now);
  const batch = db.batch();
  let created = 0;
  let updated = 0;

  for (const seed of seeds) {
    const ref = collection.doc(seed.id);
    if (existing.has(seed.id)) {
      batch.set(ref, {
        id: seed.id,
        name: seed.name,
        office: seed.office,
        mission: seed.mission,
        permissions: seed.permissions,
        version: seed.version,
        updatedAt: seed.updatedAt,
      }, { merge: true });
      updated += 1;
    } else {
      batch.create(ref, seed);
      created += 1;
    }
  }

  await batch.commit();
  return { created, updated, total: seeds.length };
}

export async function listRegisteredAgents(): Promise<AgentRecord[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  const snapshot = await db.collection(COLLECTION).orderBy('id', 'asc').get();
  return snapshot.docs.map((doc) => doc.data() as AgentRecord);
}

export async function getRegisteredAgent(agentId: string): Promise<AgentRecord | null> {
  const id = String(agentId || '').trim();
  if (!id) return null;
  const db = getFirestoreDb();
  if (!db) return null;
  const snapshot = await db.collection(COLLECTION).doc(id).get();
  return snapshot.exists ? snapshot.data() as AgentRecord : null;
}
