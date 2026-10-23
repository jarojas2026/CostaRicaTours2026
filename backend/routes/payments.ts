/**
 * Pagos: webhooks firmados, checkout y verificación SINPE.
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import express from 'express';
import { requireOperator } from '../authMiddleware';
import { checkoutQuote, checkoutOrigin } from '../commercePolicy';
import { getStripe, getBookingById, updateBookingStatus } from '../bookingService';
import { handleStripeWebhook, handlePayPalWebhook } from '../paymentWebhookHttpService';
import { executeSinpeVerification } from '../sinpeService';
import { createRouter, paymentLimiter } from './shared';

/** Webhooks firmados de Stripe y PayPal. */
export const paymentWebhooksRouter = createRouter();

// Signed payment webhooks. Stripe uses the byte-exact rawBody captured by
// express.json({ verify }) in backend/app.ts; PayPal verifies its provider signature before
// any booking/payment state is mutated. These routes intentionally do not use
// application auth because the payment-provider signature is the authorization.
paymentWebhooksRouter.post('/api/webhooks/stripe', handleStripeWebhook);
paymentWebhooksRouter.post('/api/webhooks/paypal', handlePayPalWebhook);

/** Checkout Stripe/PayPal y retornos de pago. */
export const checkoutRouter = createRouter();

// ==========================================
// 💳 PASARELAS DE PAGO (STRIPE & PAYPAL)
// ==========================================

/**
 * Checkout Stripe (TEST mientras ALLOW_STRIPE_LIVE !== 'true') para una reserva pendiente.
 * Misma lógica que antes vivía dentro de POST /api/stripe/create-checkout-session; se exporta
 * para reutilizarla desde POST /api/admin/leads/:id/payment-link sin duplicar la llamada a Stripe.
 */
export async function createStripeCheckoutForBooking(bookingId: unknown): Promise<{ status: number; body: any }> {
  try {
    const booking = await getBookingById(String(bookingId || ''));
    if (!booking || booking.paymentStatus === 'completed') {
      return { status: 409, body: { error: 'La reserva no existe o ya tiene un pago verificado.' } };
    }
    let payment;
    try { payment = checkoutQuote(booking); }
    catch (error: any) { return { status: 409, body: { error: error.message } }; }
    const returnOrigin = checkoutOrigin();
    const stripe = getStripe();
    if (!stripe) {
      console.error('🔴 STRIPE_SECRET_KEY no configurada. Se rechaza el intento de pago.');
      return { status: 503, body: { error: 'Pagos no disponibles: Stripe no está configurado en el servidor.' } };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: booking.tourName || 'Tour Costa Rica Tours' },
            unit_amount: payment.totalCents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      client_reference_id: booking.bookingId,
      metadata: { bookingId: booking.bookingId },
      success_url: `${returnOrigin}/?booking=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnOrigin}/?booking=canceled`,
      customer_email: booking.customerEmail || undefined
    });
    return { status: 200, body: { url: session.url, id: session.id } };
  } catch (err: any) {
    console.error('Error en Stripe:', err);
    return { status: 500, body: { error: err.message } };
  }
}

checkoutRouter.post('/api/stripe/create-checkout-session', paymentLimiter, async (req, res) => {
  const result = await createStripeCheckoutForBooking(req.body?.bookingId);
  res.status(result.status).json(result.body);
});

checkoutRouter.post('/api/paypal/create-order', paymentLimiter, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await getBookingById(String(bookingId || ''));
    if (!booking || booking.paymentStatus === 'completed') {
      return res.status(409).json({ error: 'La reserva no existe o ya tiene un pago verificado.' });
    }
    let payment;
    try { payment = checkoutQuote(booking); }
    catch (error: any) { return res.status(409).json({ error: error.message }); }
    const returnOrigin = checkoutOrigin();
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = process.env.PAYPAL_SECRET;
    const paypalMode = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl =
      paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    if (!paypalClientId || !paypalSecret) {
      console.error('🔴 PAYPAL_CLIENT_ID/SECRET no configurados. Se rechaza el intento de pago.');
      return res.status(503).json({ error: 'Pagos no disponibles: PayPal no está configurado en el servidor.' });
    }

    const authStr = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');
    const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${authStr}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const authData = await authRes.json();

    if (authData.access_token) {
      const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              custom_id: booking.bookingId,
              amount: { currency_code: 'USD', value: payment.totalUSD.toFixed(2) },
              description: booking.tourName || 'Tour Costa Rica Tours'
            }
          ],
          application_context: {
            return_url: `${returnOrigin}/?booking=success&provider=paypal`,
            cancel_url: `${returnOrigin}/?booking=canceled`
          }
        })
      });
      const orderData = await orderRes.json();
      const approveLink = orderData.links?.find((link: any) => link.rel === 'approve')?.href;
      if (!orderRes.ok || !orderData.id || !approveLink) {
        return res.status(502).json({ error: 'PayPal no devolvió un enlace de aprobación. La reserva sigue pendiente de pago.' });
      }
      res.json({
        url: approveLink,
        id: orderData.id
      });
    } else {
      res.status(401).json({ error: 'Fallo al autenticar con PayPal' });
    }
  } catch (err: any) {
    console.error('Error en PayPal:', err);
    res.status(500).json({ error: err.message });
  }
});

// Payment returns never trust a browser query parameter as proof of payment.
// They retrieve the provider record, validate its booking reference and amount,
// then move only that pending booking to `paid`. Provider confirmation remains
// a separate lifecycle transition.
checkoutRouter.post('/api/payments/stripe/return', paymentLimiter, async (req, res) => {
  try {
    const sessionId = String(req.body?.sessionId || '').trim();
    const stripe = getStripe();
    if (!sessionId || !stripe) return res.status(400).json({ error: 'No se puede verificar el pago de tarjeta todavía.' });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const bookingId = String(session.metadata?.bookingId || session.client_reference_id || '').trim();
    const booking = await getBookingById(bookingId);
    const expectedCents = Math.round(Number(booking?.totalUSD || 0) * 100);
    if (!booking || session.payment_status !== 'paid' || session.currency !== 'usd' || session.amount_total !== expectedCents) {
      return res.status(409).json({ error: 'El pago no coincide con una reserva pendiente válida.' });
    }

    const result = await updateBookingStatus(bookingId, {
      status: 'paid',
      paymentStatus: 'completed',
      paymentVerifiedAt: new Date().toISOString(),
      paymentEvidence: { provider: 'stripe', sessionId: session.id, paymentIntent: session.payment_intent }
    });
    if (!result.success) return res.status(409).json(result);
    return res.json({ success: true, booking: result.booking });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'No se pudo verificar el pago de tarjeta.' });
  }
});

checkoutRouter.post('/api/payments/paypal/return', paymentLimiter, async (req, res) => {
  try {
    const orderId = String(req.body?.orderId || '').trim();
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = process.env.PAYPAL_SECRET;
    const paypalMode = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    if (!orderId || !paypalClientId || !paypalSecret) return res.status(400).json({ error: 'No se puede verificar PayPal todavía.' });

    const basic = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');
    const auth = await fetch(`${baseUrl}/v1/oauth2/token`, { method: 'POST', body: 'grant_type=client_credentials', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' } });
    const accessToken = (await auth.json()).access_token;
    if (!accessToken) return res.status(502).json({ error: 'PayPal no autorizó la verificación.' });

    let orderResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    let order = await orderResponse.json();
    if (order.status === 'APPROVED') {
      orderResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
      order = await orderResponse.json();
    }
    const unit = order.purchase_units?.[0];
    const bookingId = String(unit?.custom_id || '').trim();
    const booking = await getBookingById(bookingId);
    if (!booking || order.status !== 'COMPLETED' || unit?.amount?.currency_code !== 'USD' || Number(unit?.amount?.value) !== Number(booking.totalUSD)) {
      return res.status(409).json({ error: 'El pago de PayPal no coincide con una reserva pendiente válida.' });
    }
    const result = await updateBookingStatus(bookingId, {
      status: 'paid', paymentStatus: 'completed', paymentVerifiedAt: new Date().toISOString(),
      paymentEvidence: { provider: 'paypal', orderId: order.id }
    });
    if (!result.success) return res.status(409).json(result);
    return res.json({ success: true, booking: result.booking });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'No se pudo verificar el pago de PayPal.' });
  }
});

/** Verificación SINPE (operador). */
export const sinpeRouter = createRouter();

// Verificación y conciliación de comprobantes SINPE Móvil
sinpeRouter.post('/api/sinpe/verify', requireOperator, async (req, res) => {
  try {
    const { bookingId, sinpeReference, customerPhone, amount } = req.body;
    if (!bookingId || !sinpeReference) {
      return res.status(400).json({ error: 'bookingId y sinpeReference son requeridos' });
    }

    // Actualizar estado en Firestore / memoria con estado pendiente de aprobación humana
    const updateResult = await updateBookingStatus(bookingId, {
      sinpeReference,
      status: 'pendiente_pago',
      paymentStatus: 'pending',
      paymentVerifiedAt: new Date().toISOString(),
      verificationMethod: 'sinpe_movil_manual'
    });

    if (!updateResult.success) {
      return res.status(404).json(updateResult);
    }

    // Responder inmediatamente con status 200
    res.json({
      success: true,
      message: 'Comprobante SINPE Móvil registrado. En espera de verificación final por operador.',
      bookingId,
      booking: updateResult.booking
    });

    // La verificación SINPE continúa dentro del motor nativo; no depende de orquestadores externos.
  } catch (err: any) {
    console.error('Error al verificar SINPE:', err);
    res.status(500).json({ error: err.message || 'Error al verificar comprobante' });
  }
});

/** SINPE verify y webhooks. */
export const sinpeWebhooksRouter = createRouter();

// 8. Verificación y Conciliación Autónoma de Pagos SINPE Móvil (Webhook & API)
// /api/sinpe/verify is registered earlier with requireOperator; the public
// /api/payments/sinpe-verify alias now requires the same operator auth. The
// /webhook/* aliases keep their shared-secret (x-webhook-secret) contract.
sinpeWebhooksRouter.post('/api/payments/sinpe-verify', requireOperator, async (req, res) => {
  try {
    const result = await executeSinpeVerification(req.body, req.headers['x-webhook-secret'] as string);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

sinpeWebhooksRouter.post(['/webhook/cr-tours-sinpe-verify', '/webhook/sinpe-verify'], async (req, res) => {
  try {
    const authHeader = req.headers['x-webhook-secret'] as string;
    const result = await executeSinpeVerification(req.body, authHeader);
    res.json(result);
  } catch (error: any) {
    console.error('Error en verificación SINPE:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});
