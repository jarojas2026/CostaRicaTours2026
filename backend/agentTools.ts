/**
 * Unified, typed capability registry for the AI swarm.
 * These tools call the application's existing domain services instead of duplicating logic.
 */
import { TOURS } from '../src/data/toursData';
import { assessTripFit, buildPackingList, buildRouteStrategy, getDestinationIntelligence, screenActivitySuitability } from './tourismIntelligenceEngine';
import { buildTripJourney, adaptTravelerJourney } from './travelJourneyOrchestrator';
import { getDestinationWeather } from './weatherPulseService';
import { checkTourAvailability, findBookingByCodeOrEmail } from './bookingService';
import { getOperationalMemory, retrieveRelevantMemory } from './memoryService';
import {
  COMPANY_FACTS,
  compareTours,
  getCancellationPolicy,
  planItineraryOutline,
  quotePrice,
  seasonAdvice,
  whatsappHandoffLink
} from './agentSkillPack';

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
  },
  compare_tours: {
    description: 'Compare 2-4 catalog tours side by side (price, duration, difficulty, rating, age minimum).',
    sideEffect: false
  },
  quote_price: {
    description: 'Estimate the total for a tour and party size from the catalog. The server calculates the final total at booking.',
    sideEffect: false
  },
  plan_itinerary: {
    description: 'Draft a day-by-day outline from the real catalog by interests/regions. Not a guarantee of availability.',
    sideEffect: false
  },
  whatsapp_handoff: {
    description: 'Build a contextual WhatsApp link (tour, date, people) to hand the traveler to a human.',
    sideEffect: false
  },
  cancellation_policy: {
    description: 'Return the declared cancellation policy text without promising refunds beyond it.',
    sideEffect: false
  },
  season_advice: {
    description: 'General seasonal guidance for a month (dry/green season, typical whale-watching windows).',
    sideEffect: false
  },
  trip_fit: {
    description: 'Match traveler profile, interests, trip length and airport constraints to destination options.',
    sideEffect: false
  },
  packing_list: {
    description: 'Build a practical Costa Rica packing list from activities, regions and traveler profile.',
    sideEffect: false
  },
  activity_safety_check: {
    description: 'Screen activity suitability and identify facts that must be verified before booking.',
    sideEffect: false
  },
  route_strategy: {
    description: 'Evaluate geographic transfer burden and create a route strategy without inventing live travel times.',
    sideEffect: false
  },
  destination_intelligence: {
    description: 'Return stable expert knowledge for a Costa Rica destination with explicit live-verification requirements.',
    sideEffect: false
  },
  build_trip_journey: {
    description: 'Build or rebuild a complete traveler journey using memory, catalog, live availability, weather, route strategy, itinerary and sales next steps.',
    sideEffect: false
  },
  adapt_trip_journey: {
    description: 'Adapt an existing traveler journey when dates, weather, preferences or operational conditions change.',
    sideEffect: false
  },
  live_destination_weather: {
    description: 'Return current cached/live weather for Costa Rica destination regions with source classification.',
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
    case 'compare_tours': {
      const ids = Array.isArray(args.tourIds) ? args.tourIds.map((x: unknown) => String(x)) : [];
      if (ids.length < 2) throw new Error('tourIds requiere al menos 2 tours');
      return compareTours(ids);
    }
    case 'quote_price': {
      const tourId = String(args.tourId || '').trim();
      if (!tourId) throw new Error('tourId requerido');
      return quotePrice({ tourId, adults: Number(args.adults), children: Number(args.children) });
    }
    case 'plan_itinerary':
      return planItineraryOutline({
        days: Number(args.days),
        interests: Array.isArray(args.interests) ? args.interests.map((x: unknown) => String(x)) : [],
        regions: Array.isArray(args.regions) ? args.regions.map((x: unknown) => String(x)) : []
      });
    case 'whatsapp_handoff':
      return {
        url: whatsappHandoffLink({
          tourTitle: args.tourTitle ? String(args.tourTitle) : undefined,
          date: args.date ? String(args.date) : undefined,
          people: args.people ? Number(args.people) : undefined,
          language: args.language === 'en' ? 'en' : 'es',
          note: args.note ? String(args.note) : undefined
        }),
        phone: COMPANY_FACTS.whatsappDisplay
      };
    case 'cancellation_policy':
      return getCancellationPolicy(args.tourId ? String(args.tourId) : undefined);
    case 'season_advice':
      return seasonAdvice(Number(args.month));
    case 'trip_fit':
      return assessTripFit({
        query: args.query ? String(args.query) : '',
        days: Number(args.days),
        airport: args.airport ? String(args.airport) : undefined,
        profile: args.profile,
        intensity: args.intensity,
        regions: Array.isArray(args.regions) ? args.regions.map((x: unknown) => String(x)) : undefined
      });
    case 'packing_list':
      return buildPackingList({
        activities: Array.isArray(args.activities) ? args.activities.map((x: unknown) => String(x)) : [],
        regions: Array.isArray(args.regions) ? args.regions.map((x: unknown) => String(x)) : [],
        profile: args.profile
      });
    case 'activity_safety_check':
      return screenActivitySuitability({
        activity: String(args.activity || ''),
        age: args.age !== undefined ? Number(args.age) : undefined,
        canSwim: args.canSwim === undefined ? undefined : Boolean(args.canSwim),
        mobility: args.mobility ? String(args.mobility) : undefined,
        fearOfHeights: args.fearOfHeights === undefined ? undefined : Boolean(args.fearOfHeights),
        medicalConstraint: args.medicalConstraint ? String(args.medicalConstraint) : undefined
      });
    case 'route_strategy':
      return buildRouteStrategy({
        regions: Array.isArray(args.regions) ? args.regions.map((x: unknown) => String(x)) : [],
        days: Number(args.days),
        arrivalAirport: args.arrivalAirport ? String(args.arrivalAirport) : undefined,
        departureAirport: args.departureAirport ? String(args.departureAirport) : undefined
      });
    case 'destination_intelligence':
      return getDestinationIntelligence(String(args.regionId || ''));
    case 'build_trip_journey':
      return buildTripJourney({
        sessionId: args.sessionId ? String(args.sessionId) : undefined,
        query: args.query ? String(args.query) : '', days: Number(args.days), travelers: Number(args.travelers),
        profile: args.profile, regions: Array.isArray(args.regions) ? args.regions.map((x: unknown) => String(x)) : undefined,
        arrivalAirport: args.arrivalAirport ? String(args.arrivalAirport) : undefined,
        departureAirport: args.departureAirport ? String(args.departureAirport) : undefined,
        date: args.date ? String(args.date) : undefined, time: args.time ? String(args.time) : undefined,
        selectedTourIds: Array.isArray(args.selectedTourIds) ? args.selectedTourIds.map((x: unknown) => String(x)) : undefined,
        activities: Array.isArray(args.activities) ? args.activities.map((x: unknown) => String(x)) : undefined,
        language: args.language === 'en' ? 'en' : 'es'
      });
    case 'adapt_trip_journey':
      if (!args.journeyId) throw new Error('journeyId requerido');
      return adaptTravelerJourney(String(args.journeyId), {
        sessionId: args.sessionId ? String(args.sessionId) : undefined,
        query: args.query ? String(args.query) : undefined, days: args.days === undefined ? undefined : Number(args.days),
        travelers: args.travelers === undefined ? undefined : Number(args.travelers), profile: args.profile,
        regions: Array.isArray(args.regions) ? args.regions.map((x: unknown) => String(x)) : undefined,
        arrivalAirport: args.arrivalAirport ? String(args.arrivalAirport) : undefined,
        departureAirport: args.departureAirport ? String(args.departureAirport) : undefined,
        date: args.date ? String(args.date) : undefined, time: args.time ? String(args.time) : undefined,
        selectedTourIds: Array.isArray(args.selectedTourIds) ? args.selectedTourIds.map((x: unknown) => String(x)) : undefined,
        activities: Array.isArray(args.activities) ? args.activities.map((x: unknown) => String(x)) : undefined,
        language: args.language === 'en' ? 'en' : undefined
      });
    case 'live_destination_weather':
      return getDestinationWeather();
  }
}

/**
 * Declaraciones oficiales de herramientas estructuradas para Function Calling de Gemini SDK
 */
export const GEMINI_FUNCTION_DECLARATIONS = [
  {
    name: 'build_trip_journey',
    description: 'Build a complete Costa Rica trip from traveler memory, expert intelligence, authoritative catalog, live weather, live availability, itinerary and sales next step.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sessionId: { type: 'STRING' }, query: { type: 'STRING' }, days: { type: 'NUMBER' }, travelers: { type: 'NUMBER' },
        profile: { type: 'STRING' }, regions: { type: 'ARRAY', items: { type: 'STRING' } },
        arrivalAirport: { type: 'STRING' }, departureAirport: { type: 'STRING' }, date: { type: 'STRING' }, time: { type: 'STRING' },
        selectedTourIds: { type: 'ARRAY', items: { type: 'STRING' } }, activities: { type: 'ARRAY', items: { type: 'STRING' } },
        language: { type: 'STRING' }
      }
    }
  },
  {
    name: 'adapt_trip_journey',
    description: 'Adapt an existing journey when the traveler changes dates, preferences or operational conditions.',
    parameters: {
      type: 'OBJECT',
      properties: {
        journeyId: { type: 'STRING' }, sessionId: { type: 'STRING' }, query: { type: 'STRING' }, days: { type: 'NUMBER' }, travelers: { type: 'NUMBER' },
        profile: { type: 'STRING' }, regions: { type: 'ARRAY', items: { type: 'STRING' } }, arrivalAirport: { type: 'STRING' },
        departureAirport: { type: 'STRING' }, date: { type: 'STRING' }, time: { type: 'STRING' },
        selectedTourIds: { type: 'ARRAY', items: { type: 'STRING' } }, activities: { type: 'ARRAY', items: { type: 'STRING' } },
        language: { type: 'STRING' }
      },
      required: ['journeyId']
    }
  },
  {
    name: 'live_destination_weather',
    description: 'Return current weather for supported Costa Rica destination regions.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'search_tours',
    description: 'Search the authoritative catalog of Costa Rica tours and activities by text, region, or category.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search term or keyword (e.g., ballenas, rafting, tabacon, arenal, manuel antonio)' },
        region: { type: 'STRING', description: 'Costa Rica region (e.g., Guanacaste, Arenal, Monteverde, Manuel Antonio, Osa)' },
        category: { type: 'STRING', description: 'Activity category (e.g., wildlife, adventure, beaches, volcanoes, water)' }
      }
    }
  },
  {
    name: 'check_availability',
    description: 'Check live Firestore availability and capacity for a specific tour, date, and party size.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tourId: { type: 'STRING', description: 'Tour ID slug' },
        date: { type: 'STRING', description: 'Tour date in YYYY-MM-DD format' },
        time: { type: 'STRING', description: 'Optional time slot (e.g., 08:00 AM)' },
        seats: { type: 'NUMBER', description: 'Number of participants requested' }
      },
      required: ['tourId', 'date']
    }
  },
  {
    name: 'lookup_booking',
    description: 'Look up an existing booking reservation by confirmation code or customer email.',
    parameters: {
      type: 'OBJECT',
      properties: {
        bookingId: { type: 'STRING', description: 'Reservation code (e.g. CR-PV-123456)' },
        email: { type: 'STRING', description: 'Customer email' }
      }
    }
  },
  {
    name: 'quote_price',
    description: 'Calculate an accurate price quote for a tour based on adults and children.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tourId: { type: 'STRING', description: 'Tour ID' },
        adults: { type: 'NUMBER', description: 'Number of adults' },
        children: { type: 'NUMBER', description: 'Number of children' }
      },
      required: ['tourId', 'adults']
    }
  },
  {
    name: 'compare_tours',
    description: 'Compare 2-4 tours side-by-side on duration, price, rating, difficulty, and location.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tourIds: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Array of tour IDs to compare'
        }
      },
      required: ['tourIds']
    }
  },
  {
    name: 'cancellation_policy',
    description: 'Retrieve official cancellation policy terms and refund timelines.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tourId: { type: 'STRING', description: 'Optional tour ID' }
      }
    }
  },
  {
    name: 'whatsapp_handoff',
    description: 'Generate a contextual WhatsApp link for direct booking or human agent assistance.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tourTitle: { type: 'STRING', description: 'Tour title' },
        date: { type: 'STRING', description: 'Target date' },
        people: { type: 'NUMBER', description: 'Number of people' },
        language: { type: 'STRING', description: 'es or en' },
        note: { type: 'STRING', description: 'Context note' }
      }
    }
  },
  {
    name: 'trip_fit',
    description: 'Match traveler profile, interests, trip length and airport constraints to destination options. This is planning guidance, not a live availability promise.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Traveler goals and preferences' },
        days: { type: 'NUMBER', description: 'Trip length in days' },
        airport: { type: 'STRING', description: 'Arrival airport such as SJO or LIR' },
        profile: { type: 'STRING', description: 'family, couple, honeymoon, adventure, wildlife, senior, relaxed, photography, accessibility' },
        intensity: { type: 'STRING', description: 'easy, moderate, active or high' },
        regions: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Optional preferred regions' }
      }
    }
  },
  {
    name: 'packing_list',
    description: 'Build a practical packing list for activities and Costa Rica regions.',
    parameters: {
      type: 'OBJECT',
      properties: {
        activities: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Activities such as beach, rafting, canopy, wildlife or hiking' },
        regions: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Regions such as Monteverde, Arenal, Caribbean or Osa' },
        profile: { type: 'STRING', description: 'Optional traveler profile' }
      }
    }
  },
  {
    name: 'activity_safety_check',
    description: 'Screen activity suitability. Never auto-confirms safety; identifies what must be verified with the operator.',
    parameters: {
      type: 'OBJECT',
      properties: {
        activity: { type: 'STRING', description: 'Activity name' },
        age: { type: 'NUMBER', description: 'Participant age when relevant' },
        canSwim: { type: 'BOOLEAN', description: 'Whether participant can swim' },
        mobility: { type: 'STRING', description: 'Voluntarily disclosed mobility/access need' },
        fearOfHeights: { type: 'BOOLEAN', description: 'Voluntarily disclosed fear of heights' },
        medicalConstraint: { type: 'STRING', description: 'Voluntarily disclosed medical constraint; do not diagnose' }
      },
      required: ['activity']
    }
  },
  {
    name: 'route_strategy',
    description: 'Evaluate geographic transfer burden and create a route strategy without inventing live travel times.',
    parameters: {
      type: 'OBJECT',
      properties: {
        regions: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Requested destination regions' },
        days: { type: 'NUMBER', description: 'Trip length' },
        arrivalAirport: { type: 'STRING', description: 'Arrival airport' },
        departureAirport: { type: 'STRING', description: 'Departure airport' }
      },
      required: ['regions', 'days']
    }
  },
  {
    name: 'destination_intelligence',
    description: 'Return stable expert knowledge for a destination and list the live facts that require verification.',
    parameters: {
      type: 'OBJECT',
      properties: { regionId: { type: 'STRING', description: 'Destination region id such as arenal, monteverde, guanacaste, manuel_antonio, caribe_sur or osa' } },
      required: ['regionId']
    }
  }
];
