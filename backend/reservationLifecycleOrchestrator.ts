import { getPendingReservationLifecycleBookings, updateBookingStatus } from './bookingService';
import { dispatchServiceOrder, handleProviderAction } from './providerCommunicationService';
import { executeCustomerBookingConfirmation } from './nativeWorkflows';
import { getFirestoreDb } from './bookingService';
import { logAutomationExecution } from './nativeAutomationEngine';

type LifecycleResult = {
  bookingId: string;
  from: string;
  action: string;
  status: 'completed' | 'skipped' | 'error';
  message: string;
};

const CLAIM_STALE_MS = 15 * 60 * 1000;

async function alreadyProcessed(key: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;
  const ref = db.collection('reservation_lifecycle_events').doc(key.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 180));
  const snap = await ref.get();
  return snap.exists && String(snap.data()?.status) === 'completed';
}

async function claim(key: string, payload: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return true;
  const ref = db.collection('reservation_lifecycle_events').doc(key.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 180));
  try {
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        const data = snap.data() || {};
        const state = String(data.status || '');
        if (state === 'completed') throw new Error('already_claimed');
        if (state === 'processing') {
          const claimedAt = Date.parse(String(data.claimedAt || ''));
          if (Number.isFinite(claimedAt) && Date.now() - claimedAt < CLAIM_STALE_MS) throw new Error('already_claimed');
        }
      }
      const now = new Date().toISOString();
      tx.set(ref, { id: ref.id, status: 'processing', claimedAt: now, updatedAt: now, ...payload }, { merge: true });
    });
    return true;
  } catch (e: any) {
    if (e?.message === 'already_claimed') return false;
    throw e;
  }
}

async function finish(key: string, patch: any) {
  const db = getFirestoreDb();
  if (!db) return;
  await db.collection('reservation_lifecycle_events').doc(key.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 180)).set({
    ...patch,
    status: patch.status || 'completed',
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Orquestador canónico del ciclo de reserva.
 * No sustituye la máquina de estados: coordina los servicios existentes alrededor de ella.
 *
 * Flujo preferido de producción:
 * request/payment_pending -> provider inquiry -> provider confirmed -> payment -> paid -> confirmed
 *
 * Compatibilidad heredada:
 * paid -> provider_pending -> confirmed
 *
 * Cada paso es idempotente y queda trazado. Crear el documento nunca equivale a
 * disponibilidad confirmada ni a una reserva final. Cuando el cliente todavía no
 * ha pagado, se solicita primero evidencia operativa al proveedor para evitar cobrar
 * por un servicio que aún no ha sido aceptado.
 */
export async function advanceReservationLifecycle(booking: any): Promise<LifecycleResult> {
  const bookingId = String(booking.bookingId || booking.id || '');
  if (!bookingId) return { bookingId: '', from: 'unknown', action: 'skip', status: 'skipped', message: 'Reserva sin identificador.' };

  const status = String(booking.status || '').toLowerCase();
  const paymentStatus = String(booking.paymentStatus || '').toLowerCase();
  const from = status || paymentStatus || 'prospect';
  const paymentPending = ['pendiente_pago', 'payment_pending', 'pending'].includes(status)
    && !['paid', 'completed', 'approved'].includes(paymentStatus);
  const providerConfirmed = ['confirmed', 'confirmada'].includes(String(booking.serviceOrderStatus || '').toLowerCase())
    || ['confirmed', 'confirmada'].includes(String(booking.providerStatus || '').toLowerCase());

  // 1. Pago verificado: avanzar a paid sin saltarse la máquina de estados.
  if ((status === 'pendiente_pago' || status === 'payment_pending' || status === 'pending') &&
      ['paid', 'completed', 'approved'].includes(paymentStatus)) {
    const key = `${bookingId}:paid`;
    if (await alreadyProcessed(key)) return { bookingId, from, action: 'paid_already_processed', status: 'skipped', message: 'Pago ya procesado.' };
    if (!await claim(key, { bookingId, transition: 'paid' })) return { bookingId, from, action: 'paid_claimed', status: 'skipped', message: 'Otro proceso está avanzando el pago.' };

    const updated = await updateBookingStatus(bookingId, { status: 'paid', paymentStatus: 'paid', lifecycle: 'paid' });
    if (!updated.success) {
      await finish(key, { status: 'error', error: updated.error });
      return { bookingId, from, action: 'advance_paid', status: 'error', message: updated.error || 'No se pudo avanzar a paid.' };
    }
    await finish(key, { status: 'completed', action: 'advance_paid' });
    return { bookingId, from, action: 'advance_paid', status: 'completed', message: 'Reserva avanzada a paid.' };
  }

  // 2. Solicitud aún no pagada: consultar primero al proveedor real.
  // Esto convierte la creación de booking en una solicitud transaccional útil y evita
  // enviar al cliente a Stripe/PayPal antes de saber si el operador puede atenderla.
  if (paymentPending && !booking.serviceOrderId) {
    const key = `${bookingId}:prepayment-provider-dispatch`;
    if (await alreadyProcessed(key)) return { bookingId, from, action: 'prepayment_provider_dispatch_already_processed', status: 'skipped', message: 'Consulta al proveedor ya procesada.' };
    if (!await claim(key, { bookingId, transition: 'prepayment_provider_dispatch' })) return { bookingId, from, action: 'prepayment_provider_dispatch_claimed', status: 'skipped', message: 'Otro proceso está consultando al proveedor.' };

    try {
      const order = await dispatchServiceOrder({
        bookingId,
        tourId: String(booking.tourId || ''),
        tourName: String(booking.tourName || booking.tour?.name || 'Tour Costa Rica'),
        date: String(booking.date || ''),
        time: String(booking.time || '08:00 AM'),
        adults: Number(booking.adults || 0),
        children: Number(booking.children || 0),
        pickupLocation: String(booking.pickupHotel || booking.pickupLocation || ''),
        customer: {
          name: String(booking.customerName || booking.customer?.name || ''),
          phone: String(booking.customerPhone || booking.customer?.phone || ''),
          email: String(booking.customerEmail || booking.customer?.email || '')
        },
        totalUSD: Number(booking.totalUSD || booking.totalAmount || 0),
        providerId: booking.providerId
      });

      await updateBookingStatus(bookingId, {
        lifecycle: 'payment_pending',
        serviceOrderId: order.id,
        serviceOrderStatus: order.status,
        providerId: order.providerId,
        providerName: order.providerName,
        providerStatus: 'pending',
        providerDispatchedAt: new Date().toISOString()
      });
      await finish(key, { status: 'completed', action: 'prepayment_provider_dispatch', serviceOrderId: order.id });
      return { bookingId, from, action: 'prepayment_provider_dispatch', status: 'completed', message: `Consulta ${order.id} enviada al proveedor antes del cobro.` };
    } catch (error: any) {
      await finish(key, { status: 'error', action: 'prepayment_provider_dispatch', error: String(error?.message || error) });
      return { bookingId, from, action: 'prepayment_provider_dispatch', status: 'error', message: String(error?.message || error) };
    }
  }

  // 3. El proveedor confirmó mientras el cliente aún no ha pagado.
  // Mantener payment_pending, pero publicar evidencia de disponibilidad para que la UI
  // pueda habilitar el siguiente paso de cobro sin declarar la reserva confirmada.
  if (paymentPending && providerConfirmed && String(booking.providerStatus || '').toLowerCase() !== 'confirmed') {
    const key = `${bookingId}:provider-availability-confirmed`;
    if (await alreadyProcessed(key)) return { bookingId, from, action: 'provider_availability_already_processed', status: 'skipped', message: 'Disponibilidad del proveedor ya registrada.' };
    if (!await claim(key, { bookingId, transition: 'provider_availability_confirmed' })) return { bookingId, from, action: 'provider_availability_claimed', status: 'skipped', message: 'Otro proceso está registrando la disponibilidad.' };

    const updated = await updateBookingStatus(bookingId, {
      providerStatus: 'confirmed',
      providerConfirmedAt: booking.providerConfirmedAt || new Date().toISOString(),
      lifecycle: 'payment_pending'
    });
    if (!updated.success) {
      await finish(key, { status: 'error', error: updated.error });
      return { bookingId, from, action: 'provider_availability_confirmed', status: 'error', message: updated.error || 'No se pudo registrar la disponibilidad del proveedor.' };
    }
    await finish(key, { status: 'completed', action: 'provider_availability_confirmed' });
    return { bookingId, from, action: 'provider_availability_confirmed', status: 'completed', message: 'Proveedor confirmó disponibilidad; el pago puede solicitarse.' };
  }

  // 4. Compatibilidad heredada: reserva ya pagada sin orden, despachar al proveedor.
  if (status === 'paid' && !booking.serviceOrderId) {
    const key = `${bookingId}:provider-dispatch`;
    if (await alreadyProcessed(key)) return { bookingId, from, action: 'provider_dispatch_already_processed', status: 'skipped', message: 'Despacho ya procesado.' };
    if (!await claim(key, { bookingId, transition: 'provider_dispatch' })) return { bookingId, from, action: 'provider_dispatch_claimed', status: 'skipped', message: 'Otro proceso está despachando al proveedor.' };

    try {
      const order = await dispatchServiceOrder({
        bookingId,
        tourId: String(booking.tourId || ''),
        tourName: String(booking.tourName || booking.tour?.name || 'Tour Costa Rica'),
        date: String(booking.date || ''),
        time: String(booking.time || '08:00 AM'),
        adults: Number(booking.adults || 0),
        children: Number(booking.children || 0),
        pickupLocation: String(booking.pickupHotel || booking.pickupLocation || ''),
        customer: {
          name: String(booking.customerName || booking.customer?.name || ''),
          phone: String(booking.customerPhone || booking.customer?.phone || ''),
          email: String(booking.customerEmail || booking.customer?.email || '')
        },
        totalUSD: Number(booking.totalUSD || booking.totalAmount || 0),
        providerId: booking.providerId
      });
      await updateBookingStatus(bookingId, { status: 'provider_pending', lifecycle: 'provider_pending', serviceOrderId: order.id, serviceOrderStatus: order.status, providerId: order.providerId, providerName: order.providerName, providerStatus: 'pending' });
      await finish(key, { status: 'completed', action: 'provider_dispatch', serviceOrderId: order.id });
      return { bookingId, from, action: 'provider_dispatch', status: 'completed', message: `Orden ${order.id} despachada.` };
    } catch (error: any) {
      await finish(key, { status: 'error', action: 'provider_dispatch', error: String(error?.message || error) });
      return { bookingId, from, action: 'provider_dispatch', status: 'error', message: String(error?.message || error) };
    }
  }

  // 5. Proveedor confirmado + pago verificado: transición final a confirmed y notificar al cliente.
  if (['provider_pending', 'paid'].includes(status) && providerConfirmed) {
    const key = `${bookingId}:customer-confirmation`;
    if (await alreadyProcessed(key)) return { bookingId, from, action: 'customer_confirmation_already_processed', status: 'skipped', message: 'Cliente ya notificado.' };
    if (!await claim(key, { bookingId, transition: 'customer_confirmation' })) return { bookingId, from, action: 'customer_confirmation_claimed', status: 'skipped', message: 'Otro proceso está notificando al cliente.' };

    const transitioned = await updateBookingStatus(bookingId, { status: 'confirmed', lifecycle: 'confirmed', confirmedAt: new Date().toISOString(), providerStatus: 'confirmed' });
    if (!transitioned.success) {
      await finish(key, { status: 'error', error: transitioned.error });
      return { bookingId, from, action: 'confirm_transition', status: 'error', message: transitioned.error || 'Transición no permitida.' };
    }

    try {
      const notification = await executeCustomerBookingConfirmation({ booking: { ...booking, ...transitioned.booking, bookingId } });
      await finish(key, { status: notification.success ? 'completed' : 'error', action: 'customer_confirmation', customerNotified: notification.customerNotified, escalated: notification.escalated, message: notification.message });
      return { bookingId, from, action: 'customer_confirmation', status: notification.success ? 'completed' : 'error', message: notification.message };
    } catch (error: any) {
      await finish(key, { status: 'error', error: String(error?.message || error) });
      return { bookingId, from, action: 'customer_confirmation', status: 'error', message: String(error?.message || error) };
    }
  }

  return { bookingId, from, action: 'no_action', status: 'skipped', message: 'No hay transición autónoma pendiente para esta reserva.' };
}

export async function runReservationLifecycleSweep(limit = 100) {
  const started = Date.now();
  const bookings = await getPendingReservationLifecycleBookings(limit);
  const results: LifecycleResult[] = [];
  for (const booking of bookings) {
    try {
      results.push(await advanceReservationLifecycle(booking));
    } catch (error: any) {
      results.push({ bookingId: String(booking.bookingId || booking.id || ''), from: String(booking.status || ''), action: 'sweep_error', status: 'error', message: String(error?.message || error) });
    }
  }
  const errors = results.filter(r => r.status === 'error').length;
  logAutomationExecution('RESERVATION_LIFECYCLE_SWEEP', Date.now() - started, errors ? 'warning' : 'success', `Reservas revisadas: ${bookings.length}; acciones: ${results.filter(r => r.status === 'completed').length}; errores: ${errors}.`);
  return { scanned: bookings.length, results, errors, durationMs: Date.now() - started, checkedAt: new Date().toISOString() };
}
