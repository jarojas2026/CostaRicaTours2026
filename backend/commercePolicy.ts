/** Pure commerce rules shared by the reservation and payment boundaries. */
export function reservationQuote(tour: any, adultsInput: unknown, childrenInput: unknown) {
  const adults = Number(adultsInput ?? 1);
  const children = Number(childrenInput ?? 0);
  if (!Number.isSafeInteger(adults) || adults < 1 || !Number.isSafeInteger(children) || children < 0 || adults + children > 200) {
    throw new Error('Indique entre 1 y 200 viajeros, con al menos un adulto y cantidades enteras.');
  }
  if (!tour || tour.catalogStatus !== 'bookable' || !String(tour.providerId || '').trim()) {
    throw new Error('Esta experiencia requiere una cotización y un proveedor vinculado antes de reservar.');
  }
  const price = Number(tour.priceUSD);
  if (!Number.isFinite(price) || price <= 0 || price > 100000) throw new Error('La tarifa del proveedor no está verificada.');
  // Preserve the existing published child tariff (70%) unless explicitly supplied.
  const childPrice = tour.childPriceUSD == null ? Math.round(price * 70) / 100 : Number(tour.childPriceUSD);
  if (!Number.isFinite(childPrice) || childPrice < 0 || childPrice > 100000) throw new Error('Tarifa infantil inválida.');
  const totalCents = Math.round(price * 100) * adults + Math.round(childPrice * 100) * children;
  return { adults, children, passengers: adults + children, totalUSD: totalCents / 100, unitPriceUSD: price, childPriceUSD: childPrice };
}

export function assertServiceDate(date: string, now = new Date()) {
  const parsed = new Date(date + 'T12:00:00Z');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < today) {
    throw new Error('Seleccione una fecha válida, no anterior a hoy en Costa Rica.');
  }
}

export function slotAvailability(slot: any, tourId: string, providerId: string, date: string, time: string, passengers: number) {
  if (!slot || slot.active !== true || slot.tourId !== tourId || slot.providerId !== providerId || slot.date !== date || slot.time !== time) {
    throw new Error('El proveedor todavía no ha publicado cupos para esta fecha y horario.');
  }
  const capacity = Number(slot.maxCapacity);
  const booked = Number(slot.bookedSeats);
  if (!Number.isSafeInteger(capacity) || capacity < 1 || !Number.isSafeInteger(booked) || booked < 0 || booked > capacity) {
    throw new Error('El inventario requiere revisión del operador.');
  }
  if (!Number.isSafeInteger(passengers) || passengers < 1 || booked + passengers > capacity) {
    throw new Error('No hay suficientes cupos publicados para este grupo.');
  }
  return { maxCapacity: capacity, bookedSeats: booked, remainingSeats: capacity - booked };
}

export function checkoutQuote(booking: any) {
  if (!booking || !['pending', 'payment_pending', 'pendiente_pago', 'provider_pending', 'hold'].includes(String(booking.status || '').toLowerCase()) || booking.availabilityReleased === true || booking.paymentStatus !== 'pending') {
    throw new Error('La reserva no está disponible para cobrar.');
  }
  const providerStatus = String(booking.serviceOrderStatus || booking.providerStatus || '').toLowerCase();
  if (!booking.providerId || !booking.providerConfirmedAt || !['accepted', 'confirmed', 'confirmada'].includes(providerStatus)) {
    throw new Error('Falta la confirmación del proveedor. No se generó ningún cobro.');
  }
  assertServiceDate(String(booking.date || ''));
  const amount = Number(booking.totalUSD);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100))) throw new Error('Importe de reserva inválido.');
  return { totalUSD: Math.round(amount * 100) / 100, totalCents: Math.round(amount * 100) };
}

export function checkoutOrigin(env: Record<string, string | undefined> = process.env) {
  const url = new URL(env.APP_URL || env.PUBLIC_BASE_URL || '');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Configure APP_URL con el origen HTTPS público de la tienda.');
  }
  return url.origin;
}
