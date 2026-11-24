const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // Permitir peticiones desde Netlify o cualquier origen

admin.initializeApp();

// Stripe is excluded by product policy. Keep this legacy function name only
// to return a deterministic retirement response to any stale caller.
exports.createStripeCheckout = functions.https.onRequest((req, res) => {
  cors(req, res, () => res.status(410).json({
    error: "stripe_disabled_by_product_policy",
    message: "Online card payments are unavailable on Costa Rica Tours."
  }));
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
        return res.status(503).json({ error: "PayPal no está configurado. No se simula un pago." });
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

// ==========================================
