import type { Request, Response } from 'express';
import { processPayPalWebhook, processStripeWebhook, webhookCorrelationId } from './paymentWebhookService';
import { emitOperationalEvent } from './operationalEventBus';

function headerMap(req: Request): Record<string, string | string[] | undefined> {
  return req.headers as Record<string, string | string[] | undefined>;
}

async function emitPaymentSignal(provider: 'stripe' | 'paypal', result: Awaited<ReturnType<typeof processStripeWebhook>>): Promise<void> {
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

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const signature = typeof req.headers['stripe-signature'] === 'string' ? req.headers['stripe-signature'] : undefined;
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const correlationId = webhookCorrelationId('stripe', signature?.slice(0, 48));
  res.setHeader('x-correlation-id', correlationId);

  if (!rawBody) {
    res.status(400).json({ accepted: false, error: 'Raw body requerido para verificar Stripe.', correlationId });
    return;
  }

  try {
    const result = await processStripeWebhook(rawBody, signature);
    await emitPaymentSignal('stripe', result);
    res.status(200).json({ ...result, correlationId: webhookCorrelationId('stripe', result.eventId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook Stripe rechazado.';
    console.error('[payment-webhook][stripe]', { correlationId, error: message });
    res.status(400).json({ accepted: false, error: message, correlationId });
  }
}

export async function handlePayPalWebhook(req: Request, res: Response): Promise<void> {
  const eventId = String(req.body?.id || '').trim();
  const correlationId = webhookCorrelationId('paypal', eventId);
  res.setHeader('x-correlation-id', correlationId);

  try {
    const result = await processPayPalWebhook(headerMap(req), req.body);
    await emitPaymentSignal('paypal', result);
    res.status(200).json({ ...result, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook PayPal rechazado.';
    console.error('[payment-webhook][paypal]', { correlationId, error: message });
    res.status(400).json({ accepted: false, error: message, correlationId });
  }
}
