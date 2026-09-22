export async function buildTripJourney(params: any) {
  return {
    journeyId: 'jrn_' + Math.random().toString(36).substring(2, 9),
    status: 'optimized',
    itinerary: [
      { day: 1, title: 'Llegada y traslado', description: 'Recepción en SJO y traslado a su hotel.' },
      { day: 2, title: 'Aventura y Naturaleza', description: 'Exploración guiada con operadores locales certificados.' }
    ],
    totalEstimatedUSD: 1250,
    createdAt: new Date().toISOString()
  };
}

export async function getTravelerJourney(journeyId: string) {
  return {
    journeyId,
    status: 'active',
    itinerary: [],
    updatedAt: new Date().toISOString()
  };
}

export async function adaptTravelerJourney(journeyId: string, params: any) {
  return {
    journeyId,
    status: 'adapted',
    params,
    updatedAt: new Date().toISOString()
  };
}
