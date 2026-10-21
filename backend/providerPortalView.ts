/**
 * Proyección mínima de una orden para el portal del proveedor (Ley 8968, CR).
 *
 * Regla de minimización de datos personales:
 * - El proveedor recibe SOLO lo necesario para operar el servicio: nombre de
 *   pila + inicial del apellido, nº de personas, fecha/hora, idioma, punto de
 *   recogida (si aplica) y notas operativas (necesidades especiales,
 *   restricciones alimentarias, notas de la reserva).
 * - NUNCA se entregan email, teléfono, documento de identidad, dirección,
 *   historial de reservas ni pagos del cliente.
 * - Excepción: un dato de contacto sólo podría añadirse si la reserva está
 *   confirmada Y el dato es imprescindible para prestar el servicio; aun así,
 *   el contacto con el cliente se canaliza por Costa Rica Tours, por lo que hoy
 *   el portal no expone ninguno. Cualquier cambio a esta regla requiere
 *   actualizar tests/providerPortalPrivacy.contract.test.ts.
 */

export interface ProviderPortalCustomerView {
  displayName: string;
  language?: string;
  specialNeeds?: string;
  dietaryRestrictions?: string;
}

/** "María José Pérez Solís" → "María P." ; vacío → "Cliente". */
export function minimizeCustomerName(name: unknown): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Cliente';
  const first = parts[0];
  const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1].charAt(0).toUpperCase()}.` : '';
  return `${first}${lastInitial}`;
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 500) : undefined);

export function toProviderPortalOrder(order: any) {
  const c = order?.customer || {};
  const customer: ProviderPortalCustomerView = { displayName: minimizeCustomerName(c.name) };
  const language = str(c.language) || str(order?.language) || str(order?.locale);
  if (language) customer.language = language;
  const specialNeeds = str(c.specialNeeds);
  if (specialNeeds) customer.specialNeeds = specialNeeds;
  const dietary = str(c.dietaryRestrictions);
  if (dietary) customer.dietaryRestrictions = dietary;

  return {
    id: order.id,
    bookingId: order.bookingId,
    tourId: order.tourId,
    tourName: order.tourName,
    providerId: order.providerId,
    providerName: order.providerName,
    date: order.date,
    time: order.time,
    adults: Number(order.adults) || 0,
    children: Number(order.children) || 0,
    pickupLocation: order.pickupLocation || '',
    wazeUrl: order.wazeUrl || '',
    customer,
    status: order.status,
    notes: order.notes || '',
    assignedGuide: order.assignedGuide || '',
    assignedVehicle: order.assignedVehicle || '',
    slaDeadline: order.slaDeadline,
  };
}
