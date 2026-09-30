import type { Request, Response } from 'express';
import { processPayPalWebhook, processStripeWebhook, webhookCorrelationId } from './paymentWebhookService';
import { emitOperationalEvent } from './operationalEventBus';

type Dependencies = {
  stripe: typeof processStripeWebhook;
  paypal: typeof processPayPalWebhook;
  emit: typeof emitOperationalEvent;
};

/** Reuse verified payment persistence; the canonical lifecycle owns fulfillment. */
export function createPaymentWebhookHandlers(dependencies: Dependencies = {
  stripe: processStripeWebhook, paypal: processPayPalWebhook, emit: emitOperationalEvent
}) {
  async function respond(provider: 'stripe' | 'paypal', res: Response, work: () => ReturnType<typeof processStripeWebhook>) {
    try {
      const result = await work();
      const correlationId = webhookCorrelationId(provider, result.eventId);
      res.setHeader('x-correlation-id', correlationId);
      if (result.accepted && !result.duplicate && result.bookingId) {
        // Payment has already been durably persisted. Optional agent telemetry
        // must not turn that accepted payment into a misleading rejection.
        try {
          await dependencies.emit({
            type: 'payment.verified',
            source: `payment-webhook:${provider}`,
            conversationId: result.bookingId,
            payload: {
              entityType: 'booking', entityId: result.bookingId,
              bookingId: result.bookingId, provider,
              eventId: result.eventId || null, correlationId
            }
          });
        } catch {
          console.warn('[payment-webhook] Payment persisted; agent signal unavailable', { provider, correlationId });
        }
      }
      res.status(result.accepted ? 200 : 400).json({ ...result, correlationId });
    } catch {
      // Provider retries can recover configuration/storage/network failures.
      // Never expose internal exception details or credentials to the caller.
      res.status(503).json({ accepted: false, error: 'payment_webhook_unavailable' });
    }
  }

  return {
    async stripe(req: Request, res: Response): Promise<void> {
      const signature = req.headers['stripe-signature'];
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (typeof signature !== 'string' || !signature.trim() || !Buffer.isBuffer(rawBody)) {
        res.status(400).json({ accepted: false, error: 'stripe_signature_and_raw_body_required' });
        return;
      }
      await respond('stripe', res, () => dependencies.stripe(rawBody, signature));
    },
    async paypal(req: Request, res: Response): Promise<void> {
      const headers = req.headers;
      const required = ['paypal-transmission-id', 'paypal-transmission-time', 'paypal-transmission-sig', 'paypal-cert-url', 'paypal-auth-algo'];
      if (!req.body?.id || required.some(name => typeof headers[name] !== 'string' || !String(headers[name]).trim())) {
        res.status(400).json({ accepted: false, error: 'paypal_signature_headers_and_event_required' });
        return;
      }
      await respond('paypal', res, () => dependencies.paypal(headers, req.body));
    }
  };
}

const handlers = createPaymentWebhookHandlers();
export const handleStripeWebhook = handlers.stripe;
export const handlePayPalWebhook = handlers.paypal;
