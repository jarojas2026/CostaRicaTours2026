/**
 * Unified, typed capability registry for the AI swarm.
 * These tools call the application's existing domain services instead of duplicating logic.
 */
import { TOURS } from '../src/data/toursData';
import { checkTourAvailability, findBookingByCodeOrEmail } from './bookingService';
import { getOperationalMemory, retrieveRelevantMemory } from './memoryService';

export const AGENT_TOOL_REGISTRY = {
  search_tours: {
    description: 'Search the authoritative tour catalog by text, region or category.',
    sideEffect: false
  },
  check_availability: {
    description: 'Check live Firestore-backed capacity for a tour/date/time.',
    sideEffect: false
  },
  lookup_booking: {
    description: 'Retrieve an existing booking by confirmation code or customer email.',
    sideEffect: false
  },
  recall_memory: {
    description: 'Retrieve persistent operational context and relevant prior turns for the current session.',
    sideEffect: false
  }
} as const;

export async function executeAgentTool(
  name: keyof typeof AGENT_TOOL_REGISTRY,
  args: Record<string, any>
): Promise<any> {
  switch (name) {
    case 'search_tours': {
      const q = String(args.query || '').toLowerCase().trim();
      const region = String(args.region || '').toLowerCase().trim();
      const category = String(args.category || '').toLowerCase().trim();
      return TOURS.filter((t) => {
        const hay = [t.id, t.title.es, t.title.en, t.region, t.category].join(' ').toLowerCase();
        return (!q || hay.includes(q)) &&
          (!region || t.region.toLowerCase() === region || hay.includes(region)) &&
          (!category || t.category.toLowerCase() === category || hay.includes(category));
      }).slice(0, 12).map((t) => ({
        id: t.id,
        title: t.title.es,
        titleEn: t.title.en,
        region: t.region,
        category: t.category,
        priceUSD: t.priceUSD,
        duration: t.durationLabel?.es || t.durationHours,
        maxGroupSize: t.maxGroupSize
      }));
    }
    case 'check_availability':
      return checkTourAvailability(
        String(args.tourId),
        String(args.date),
        args.time ? String(args.time) : undefined,
        Math.max(1, Number(args.seats || 1))
      );
    case 'lookup_booking': {
      const identifier = String(args.bookingId || args.email || '').trim();
      if (!identifier) throw new Error('bookingId o email requerido');
      return findBookingByCodeOrEmail(identifier);
    }
    case 'recall_memory': {
      const sessionId = String(args.sessionId || '');
      if (!sessionId) throw new Error('sessionId requerido');
      const memory = await getOperationalMemory(sessionId);
      const relevant = await retrieveRelevantMemory(sessionId, String(args.query || ''), 8);
      return { summary: relevant.summary || memory.summary, facts: relevant.facts, relevantTurns: relevant.relevantTurns };
    }
  }
}
