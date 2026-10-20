import type { MapTourismService } from '../data/mapServicesData';

/**
 * Precios de referencia de los servicios del mapa.
 *
 * Regla: nunca se inventa un precio. Si el servicio no trae un precio real (> 0)
 * con fuente verificable (priceSource: URL https + fecha de revisión), se devuelve null: la UI muestra "Precio a consultar" / "Price on request",
 * no calcula total y deriva a solicitud de cotización.
 */

export const PRICE_ON_REQUEST = { es: 'Precio a consultar', en: 'Price on request' } as const;

/** Todo precio mostrado del mapa es de referencia; se confirma antes de cualquier pago. */
export const REFERENCE_PRICE_NOTE = { es: 'Precio de referencia, sujeto a confirmación', en: 'Reference price, subject to confirmation' } as const;

const realPrice = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Precio unitario real del servicio (noche, entrada o pasaje) o null si no hay uno publicado. */
type PricedService = Pick<MapTourismService, 'type' | 'pricePerNightUSD' | 'officialPriceUSD' | 'averageTicketUSD' | 'priceSource'>;

/** true solo si el precio cita una página https y una fecha de revisión AAAA-MM-DD. */
export function hasVerifiablePriceSource(service: Pick<MapTourismService, 'priceSource'>): boolean {
  const src = service.priceSource;
  return Boolean(src && /^https:\/\/\S+$/.test(String(src.url || '')) && /^\d{4}-\d{2}-\d{2}$/.test(String(src.checkedAt || '')));
}

export function getMapServiceUnitPriceUSD(service: PricedService): number | null {
  if (!hasVerifiablePriceSource(service)) return null;
  switch (service.type) {
    case 'hotel':
      return realPrice(service.pricePerNightUSD);
    case 'national_park':
      return realPrice(service.officialPriceUSD);
    case 'airport':
    case 'airstrip':
    case 'bus_station':
      return realPrice(service.averageTicketUSD);
    default:
      // Trenes, taxis y shuttles: sin tarifa publicada en los datos → a consultar.
      return null;
  }
}

export interface MapServiceEstimateInput {
  checkIn?: string;
  checkOut?: string;
  adults: number;
  children: number;
}

/** Total estimado (USD) solo cuando hay precio real; null = "Precio a consultar". */
export function estimateMapServiceTotalUSD(
  service: PricedService,
  input: MapServiceEstimateInput
): number | null {
  const unit = getMapServiceUnitPriceUSD(service);
  if (unit === null) return null;
  const adults = Math.max(0, Number(input.adults) || 0);
  const children = Math.max(0, Number(input.children) || 0);
  if (service.type === 'hotel') {
    const d1 = new Date(String(input.checkIn || '')).getTime();
    const d2 = new Date(String(input.checkOut || '')).getTime();
    const nights = Number.isFinite(d1) && Number.isFinite(d2) ? Math.max(1, Math.round((d2 - d1) / 86_400_000)) : 1;
    return unit * nights;
  }
  if (service.type === 'national_park') return unit * adults + unit * 0.5 * children;
  return unit * (adults + children);
}
