import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * The legacy Cloud Run route `/api/itinerary/book` creates a booking from a
 * generated itinerary using a flat synthetic daily amount. A generated plan is
 * a proposal, not verified inventory or a provider-confirmed package, so the
 * public web surface must not convert it directly into a reservation.
 *
 * Keep this compatibility route fail-closed until the planner is migrated to a
 * quote/proforma workflow backed by live component availability and pricing.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store, max-age=0');
  return res.status(409).json({
    success: false,
    error: 'custom_itinerary_requires_quote',
    message: 'El itinerario generado es una propuesta. Antes de reservar debemos verificar precios, cupos y logística de cada servicio y preparar una cotización.',
    nextAction: 'request_quote',
  });
}
