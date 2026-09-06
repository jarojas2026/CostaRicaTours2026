const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors")({ origin: true }); // Permitir peticiones desde Netlify o cualquier origen

admin.initializeApp();

// ==========================================
// 🚀 ENDPOINT: STRIPE CHECKOUT
// ==========================================
exports.createStripeCheckout = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { tourId, tourName, totalUSD, customerEmail, date, passengers, returnUrl } = req.body;
      
      if (!process.env.STRIPE_SECRET_KEY) {
        console.warn("⚠️ STRIPE_SECRET_KEY no configurada en Cloud Functions.");
        return res.json({ url: `${returnUrl}?booking=success` });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: tourName || "Tour Costa Rica Tours" },
            unit_amount: Math.round(totalUSD * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${returnUrl}?booking=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnUrl}?booking=canceled`,
        customer_email: customerEmail,
      });

      res.json({ url: session.url, id: session.id });
    } catch (err) {
      console.error("Error en Stripe:", err);
      res.status(500).json({ error: err.message });
    }
  });
});

// ==========================================
// 🚀 ENDPOINT: PAYPAL ORDER
// ==========================================
exports.createPayPalOrder = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { totalUSD, tourName, returnUrl } = req.body;
      const paypalClientId = process.env.PAYPAL_CLIENT_ID;
      const paypalSecret = process.env.PAYPAL_SECRET;
      
      if (!paypalClientId || !paypalSecret) {
        console.warn("⚠️ PAYPAL variables no configuradas.");
        return res.json({ url: `${returnUrl}?booking=success`, id: "mock_paypal_id" });
      }
      
      // Node 18+ nativo soporta fetch globalmente
      const authStr = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');
      const authRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
          'Authorization': `Basic ${authStr}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      const authData = await authRes.json();
      
      if (authData.access_token) {
        const orderRes = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authData.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{
              amount: { currency_code: 'USD', value: totalUSD.toString() },
              description: tourName
            }],
            application_context: {
              return_url: `${returnUrl}?booking=success`,
              cancel_url: `${returnUrl}?booking=canceled`
            }
          })
        });
        const orderData = await orderRes.json();
        const approveLink = orderData.links?.find(link => link.rel === 'approve')?.href;
        res.json({ url: approveLink || `${returnUrl}?booking=success`, id: orderData.id });
      } else {
        res.status(401).json({ error: 'Fallo al autenticar con PayPal' });
      }
    } catch (err) {
      console.error("Error en PayPal:", err);
      res.status(500).json({ error: err.message });
    }
  });
});

// ==========================================
// 🚀 ENDPOINT: WEBHOOK N8N (Notificación)
// ==========================================
exports.notifyN8N = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const booking = req.body;
      const N8N_URL = process.env.N8N_BOOKING_WEBHOOK_URL;
      
      if (N8N_URL && (booking.status === "confirmada" || booking.paymentStatus === "completed")) {
        await fetch(N8N_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(booking)
        });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("Error notificando a n8n:", err);
      res.status(500).json({ error: err.message });
    }
  });
});
