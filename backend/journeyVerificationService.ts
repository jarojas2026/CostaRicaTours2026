import { checkTourAvailability } from './bookingService';
import { validateTripPlan } from './tourismIntelligenceEngine';

export type JourneyAvailabilityStatus = 'available' | 'limited' | 'unavailable' | 'requires_confirmation';

export async function verifyJourneyAvailability(params: {
  catalog?: Array<{ id: string; selected?: boolean; [key: string]: any }>;
  date?: string;
  time?: string;
  travelers?: number;
}) {
  const selected = (params.catalog || []).filter(t => t.selected || !(params.catalog || []).some(x => x.selected)).slice(0, 8);
  if (!params.date) {
    return {
      status: 'date_required' as const,
      verifiedAt: null,
      items: [],
      summary: 'Se requiere una fecha para consultar disponibilidad real.'
    };
  }
  if (!selected.length) {
    return {
      status: 'requires_confirmation' as const,
      verifiedAt: new Date().toISOString(),
      items: [],
      summary: 'No hay experiencias seleccionadas para verificar.'
    };
  }

  const seats = Math.max(1, Math.min(50, Number(params.travelers) || 1));
  const items = await Promise.all(selected.map(async tour => {
    try {
      const result = await checkTourAvailability(String(tour.id), String(params.date), params.time ? String(params.time) : undefined, seats);
      const status: JourneyAvailabilityStatus = result.available
        ? (result.remainingSeats <= seats * 2 ? 'limited' : 'available')
        : 'unavailable';
      return {
        tourId: tour.id,
        status,
        available: result.available,
        remainingSeats: result.remainingSeats,
        maxCapacity: result.maxCapacity,
        reason: result.reason,
        verifiedAt: new Date().toISOString(),
        source: 'bookingService'
      };
    } catch (error) {
      return {
        tourId: tour.id,
        status: 'requires_confirmation' as const,
        available: false,
        reason: error instanceof Error ? error.message : 'No se pudo verificar disponibilidad.',
        verifiedAt: new Date().toISOString(),
        source: 'bookingService'
      };
    }
  }));

  const unavailable = items.filter(item => item.status === 'unavailable').length;
  const confirmation = items.filter(item => item.status === 'requires_confirmation').length;
  const limited = items.filter(item => item.status === 'limited').length;
  const status = unavailable === items.length ? 'unavailable'
    : confirmation || unavailable ? 'requires_confirmation'
    : limited ? 'limited'
    : 'available';

  return {
    status,
    verifiedAt: new Date().toISOString(),
    items,
    summary: status === 'available'
      ? 'Las experiencias seleccionadas tienen cupo según la consulta operativa realizada.'
      : status === 'limited'
        ? 'Hay cupos, pero algunas experiencias requieren atención por capacidad limitada.'
        : status === 'unavailable'
          ? 'Las experiencias seleccionadas no tienen cupo suficiente para el grupo solicitado.'
          : 'La disponibilidad requiere confirmación operativa antes de reservar.'
  };
}

export function validateJourneyState(params: {
  days?: number;
  regions?: string[];
  itinerary?: Array<{ day?: number; region?: string; tourId?: string }>;
  weatherRisk?: boolean;
  availability?: Array<{ tourId?: string; status?: string }>;
}) {
  return validateTripPlan(params);
}


export async function observeJourneyState(params: {
  catalog?: Array<{ id: string; selected?: boolean; [key: string]: any }>;
  date?: string;
  time?: string;
  travelers?: number;
  previousAvailability?: Array<{ tourId?: string; status?: string; remainingSeats?: number }>;
}) {
  const availability = await verifyJourneyAvailability({
    catalog: params.catalog,
    date: params.date,
    time: params.time,
    travelers: params.travelers
  });

  const previous = new Map(
    (params.previousAvailability || []).map(item => [String(item.tourId || ''), item])
  );

  const changes = availability.items.map((item: any) => {
    const before = previous.get(String(item.tourId));
    if (!before) {
      return {
        tourId: item.tourId,
        type: 'new_verification',
        severity: 'info',
        from: null,
        to: item.status,
        reason: 'No existía una verificación previa para comparar.'
      };
    }
    const statusChanged = before.status !== item.status;
    const capacityChanged = typeof before.remainingSeats === 'number'
      && typeof item.remainingSeats === 'number'
      && before.remainingSeats !== item.remainingSeats;
    return {
      tourId: item.tourId,
      type: statusChanged ? 'availability_status_changed' : capacityChanged ? 'capacity_changed' : 'unchanged',
      severity: statusChanged && item.status === 'unavailable' ? 'blocking'
        : statusChanged && item.status === 'requires_confirmation' ? 'warning'
        : capacityChanged ? 'info'
        : 'none',
      from: { status: before.status, remainingSeats: before.remainingSeats },
      to: { status: item.status, remainingSeats: item.remainingSeats },
      reason: statusChanged
        ? `El estado operativo cambió de ${before.status || 'desconocido'} a ${item.status}.`
        : capacityChanged
          ? 'La capacidad disponible cambió desde la última verificación.'
          : 'No se detectó un cambio operativo en esta verificación.'
    };
  });

  const affectedTourIds = changes
    .filter(change => change.severity === 'blocking' || change.severity === 'warning')
    .map(change => change.tourId);

  return {
    observedAt: availability.verifiedAt,
    status: availability.status,
    summary: availability.summary,
    availability,
    changes,
    affectedTourIds,
    replanningRequired: affectedTourIds.length > 0,
    policy: {
      autoMutation: false,
      recommendation: affectedTourIds.length
        ? 'Revisar y adaptar solo los elementos afectados; conservar las preferencias del viajero.'
        : 'Conservar el itinerario actual y continuar con el siguiente paso de verificación.'
    }
  };
}


export async function guardianReplanJourney(params: {
  catalog?: Array<{ id: string; selected?: boolean; [key: string]: any }>;
  date?: string;
  time?: string;
  travelers?: number;
  previousAvailability?: Array<{ tourId?: string; status?: string; remainingSeats?: number }>;
  days?: number;
  regions?: string[];
  itinerary?: Array<{ day?: number; region?: string; tourId?: string; [key: string]: any }>;
}) {
  const observation = await observeJourneyState({
    catalog: params.catalog,
    date: params.date,
    time: params.time,
    travelers: params.travelers,
    previousAvailability: params.previousAvailability
  });

  const affected = new Set(observation.affectedTourIds);
  const preservedItinerary = (params.itinerary || []).map(item => ({
    ...item,
    guardianStatus: item.tourId && affected.has(String(item.tourId))
      ? 'affected_requires_adaptation'
      : 'preserved'
  }));

  const affectedDays = [...new Set(
    preservedItinerary
      .filter(item => item.guardianStatus === 'affected_requires_adaptation')
      .map(item => item.day)
      .filter((day): day is number => typeof day === 'number')
  )];

  return {
    observedAt: observation.observedAt,
    status: observation.status,
    changes: observation.changes,
    affectedTourIds: observation.affectedTourIds,
    affectedDays,
    itinerary: preservedItinerary,
    requiresAdaptation: affectedDays.length > 0 || observation.replanningRequired,
    adaptationPolicy: {
      scope: affectedDays.length ? 'affected_days_only' : 'no_change',
      preserve: ['traveler_preferences', 'budget', 'pace', 'regions', 'trip_dates', 'confirmed_choices'],
      neverAutoChange: ['traveler_preferences', 'confirmed_choices', 'payment_state'],
      nextAction: affectedDays.length
        ? 'Adaptar únicamente los días afectados usando el catálogo y disponibilidad nuevamente verificados.'
        : 'Mantener el itinerario y continuar con la siguiente verificación operativa.'
    }
  };
}
