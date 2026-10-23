/**
 * A successful empty Firestore sample is evidence of zero within that sample.
 * A missing database or failed read provides no evidence about journey counts.
 */
export const JOURNEY_SAMPLE_LIMIT = 100;
const SOURCE = 'firestore:traveler_journeys' as const;

type JourneyDocument = { id: string; data(): Record<string, any> };
type JourneySnapshot = { docs: readonly JourneyDocument[] };
type JourneyCounts = {
  discovery: number;
  verification: number;
  readyToQuote: number;
  recovery: number;
  total: number;
};

function unavailablePipeline() {
  return {
    state: 'unavailable' as const,
    source: SOURCE,
    limit: JOURNEY_SAMPLE_LIMIT,
    discovery: null,
    verification: null,
    readyToQuote: null,
    recovery: null,
    total: null,
  };
}

/** Read a bounded sample without hiding read failures behind an empty result. */
export async function getJourneyPipelineSample(readSnapshot: (() => Promise<JourneySnapshot>) | null) {
  if (!readSnapshot) return { documents: [] as JourneyDocument[], pipeline: unavailablePipeline() };
  try {
    const snapshot = await readSnapshot();
    const documents = Array.from(snapshot.docs);
    const counts: JourneyCounts = {
      discovery: 0, verification: 0, readyToQuote: 0, recovery: 0, total: documents.length,
    };
    for (const document of documents) {
      const journey = document.data();
      const stage = String(journey.sales?.stage || journey.status || '').toUpperCase();
      if (stage === 'DISCOVERY' || stage === 'PLANNING') counts.discovery++;
      else if (stage === 'VERIFICATION' || stage === 'VERIFICATION_COMPLETE') counts.verification++;
      else if (stage === 'READY_TO_QUOTE') counts.readyToQuote++;
      else if (stage === 'RECOVERY') counts.recovery++;
    }
    return {
      documents,
      pipeline: { state: 'sample' as const, source: SOURCE, limit: JOURNEY_SAMPLE_LIMIT, ...counts },
    };
  } catch {
    return { documents: [] as JourneyDocument[], pipeline: unavailablePipeline() };
  }
}
