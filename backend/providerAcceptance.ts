import { normalizeBookingLifecycle } from './bookingStateMachine';

export function providerAcceptancePatch(booking: any, order: any, providerId: string, now: string) {
  if (order.providerId !== providerId || booking.providerId !== providerId) throw new Error('Proveedor asignado no coincide.');
  if (booking.serviceOrderId && booking.serviceOrderId !== order.id) throw new Error('Orden reemplazada; use el enlace vigente.');
  const lifecycle = normalizeBookingLifecycle(booking.status);
  if (['cancelled', 'refunded', 'completed', 'in_operation'].includes(lifecycle)) throw new Error('La reserva ya no admite aceptación.');
  if (!['dispatched', 'reassigned', 'confirmed'].includes(order.status)) throw new Error('La orden ya no admite aceptación.');
  const paid = booking.paymentStatus === 'completed';
  const confirmed = paid && ['paid', 'provider_pending', 'confirmed'].includes(lifecycle);
  return {
    serviceOrderId: order.id,
    serviceOrderStatus: 'confirmed',
    providerConfirmedAt: order.confirmedAt || now,
    providerStatus: 'accepted',
    ...(confirmed ? { status: 'confirmed', lifecycle: 'confirmed' } : {}),
    updatedAt: now,
  };
}

// Read and write both records in one transaction: no success on partial writes.
export async function acceptProviderOrder(db: any, orderId: string, providerId: string, details: { notes?: string; assignedGuide?: string; assignedVehicle?: string }) {
  if (!db) throw new Error('Confirmación no disponible sin Firestore.');
  return db.runTransaction(async (tx: any) => {
    const orderRef = db.collection('service_orders').doc(orderId);
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new Error('Orden no encontrada.');
    const order = { ...snap.data(), id: snap.id };
    const bookingRef = db.collection('bookings').doc(order.bookingId);
    const bookingSnap = await tx.get(bookingRef);
    if (!bookingSnap.exists) throw new Error('Reserva no encontrada.');
    const now = new Date().toISOString();
    const patch = providerAcceptancePatch(bookingSnap.data(), order, providerId, now);
    if (order.status === 'confirmed') {
      tx.update(bookingRef, patch);
      return order;
    }
    const updated = { ...order, status: 'confirmed', confirmedAt: now,
      notes: details.notes || order.notes || 'Aceptado por el proveedor',
      assignedGuide: details.assignedGuide || order.assignedGuide || '',
      assignedVehicle: details.assignedVehicle || order.assignedVehicle || '' };
    tx.update(orderRef, updated);
    tx.update(bookingRef, patch);
    return updated;
  });
}
