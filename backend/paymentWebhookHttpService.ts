import type { Request, Response } from 'express';
import { getBookingById } from './bookingService';
import { STRIPE_DISABLED_REASON } from './stripeModeGuard';
import { processPayPalWebhook, processStripeWebhook, webhookCorrelationId } from './paymentWebhookService';
import { emitOperationalEvent } from './operationalEventBus';
import { advanceReservationLifecycle } from './reservationLifecycleOrchestrator';

function headerMap(req: Request): Record<string, string | string[] | undefined> {
  return req.headers as Record<string, string | string[] | undefined>;
}

type WebhookResult = Awaited<ReturnType<typeof processStripeWebhook>>;

async function emitPaymentSignal(provider: 'stripe' | 'paypal', result: WebhookResult): Promise<void> {
  if (!result.accepted || result.duplicate || !result.bookingId) return;
  await emitOperationalEvent({
    type: 'payment.verified',
    source: `payment-webhook:${provider}`,
    payload: {
      entityType: 'booking',
      entityId: result.bookingId,
      bookingId: result.bookingId,
      provider,
      eventId: result.eventId,
      correlationId: webhookCorrelationId(provider, result.eventId)
    }
  });
}

/**
 * Continues the canonical reservation state machine immediately after a verified
 * payment. A downstream provider/email failure must never turn a valid payment
 * webhook into a failed acknowledgement: the periodic lifecycle sweep remains the
 * recovery path for deferred work.
 */
async function advanceVerifiedPayment(provider: 'stripe' | 'paypal', result: WebhookResult) {
  if (!result.accepted || result.duplicate || !result.bookingId) return null;
  const correlationId = webhookCorrelationId(provider, result.eventId);

  try {
    const booking = await getBookingById(result.bookingId);
    if (!booking) {
      await emitOperationalEvent({
        type: 'payment.lifecycle.deferred',
        source: `payment-webhook:${provider}`,
        payload: {
          bookingId: result.bookingId,
          provider,
          eventId: result.eventId,
          correlationId,
          reason: 'booking_not_found_after_reconciliation'
        }
      });
      return { status: 'deferred', reason: 'booking_not_found' };
    }

    const lifecycle = await advanceReservationLifecycle(booking);
    await emitOperationalEvent({
      type: lifecycle.status === 'error' ? 'payment.lifecycle.deferred' : 'payment.lifecycle.advanced',
      source: `payment-webhook:${provider}`,
      payload: {
        bookingId: result.bookingId,
        provider,
        eventId: result.eventId,
        correlationId,
        lifecycle
      }
    });
    return lifecycle;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_lifecycle_error';
    console.error('[payment-webhook][lifecycle]', { provider, bookingId: result.bookingId, correlationId, error: message });
    await emitOperationalEvent({
      type: 'payment.lifecycle.deferred',
      source: `payment-webhook:${provider}`,
      payload: {
        bookingId: result.bookingId,
        provider,
        eventId: result.eventId,
        correlationId,
        reason: message
      }
    }).catch(() => {});
    return { status: 'deferred', reason: message };
  }
}

async function finalizeVerifiedWebhook(provider: 'stripe' | 'paypal', result: WebhookResult) {
  await emitPaymentSignal(provider, result);
  return advanceVerifiedPayment(provider, result);
}

export async function handleStripeWebhook(_req: Request, res: Response): Promise<void> {
  res.status(410).json({
    accepted: false,
    error: 'stripe_disabled_by_product_policy',
    code: STRIPE_DISABLED_REASON
  });
}

export async function handlePayPalWebhook(req: Request, res: Response): Promise<void> {
  const eventId = String(req.body?.id || '').trim();
  const correlationId = webhookCorrelationId('paypal', eventId);
  res.setHeader('x-correlation-id', correlationId);

  try {
    const result = await processPayPalWebhook(headerMap(req), req.body);
    const lifecycle = await finalizeVerifiedWebhook('paypal', result);
    res.status(200).json({ ...result, lifecycle, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook PayPal rechazado.';
    console.error('[payment-webhook][paypal]', { correlationId, error: message });
    res.status(400).json({ accepted: false, error: message, correlationId });
  }
}
