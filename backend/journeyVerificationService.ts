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
