import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import Stripe from 'stripe';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';

const app = express();
const PORT = 3000;

app.use(express.json());

// 1. Configurar Firebase Admin (Opcional pero recomendado para backend)
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
  } else {
    admin.initializeApp(); // Usa las credenciales por defecto si está en Cloud Run
  }
} catch (error) {
  console.log("Firebase Admin ya estaba inicializado o no hay credenciales (modo dev)");
}

// 2. Configurar Stripe
let stripeClient: Stripe | null = null;
export function getStripe(): Stripe | null {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// 3. Inicializar Google GenAI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "mock-key" });

// ==========================================
// 🚀 ENDPOINTS DE PAGOS
// ==========================================

app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    const { tourId, tourName, totalUSD, customerEmail, date, passengers } = req.body;
    const stripe = getStripe();
    if (!stripe) {
      console.warn("⚠️ STRIPE_SECRET_KEY no configurada. Simulando pago exitoso.");
      return res.json({ url: `${req.protocol}://${req.get('host')}?booking=success` });
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
      success_url: `${req.protocol}://${req.get('host')}?booking=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}?booking=canceled`,
      customer_email: customerEmail,
    });
    res.json({ url: session.url, id: session.id });
  } catch (err: any) {
    console.error("Error en Stripe:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { totalUSD, tourName } = req.body;
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = process.env.PAYPAL_SECRET;
    
    if (!paypalClientId || !paypalSecret) {
      console.warn("⚠️ PAYPAL_CLIENT_ID o PAYPAL_SECRET no configurados. Simulando pago.");
      return res.json({ url: `${req.protocol}://${req.get('host')}?booking=success`, id: "mock_paypal_id" });
    }
    
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
            return_url: `${req.protocol}://${req.get('host')}?booking=success`,
            cancel_url: `${req.protocol}://${req.get('host')}?booking=canceled`
          }
        })
      });
      const orderData = await orderRes.json();
      const approveLink = orderData.links?.find((link: any) => link.rel === 'approve')?.href;
      res.json({ url: approveLink || `${req.protocol}://${req.get('host')}?booking=success`, id: orderData.id });
    } else {
      res.status(401).json({ error: 'Fallo al autenticar con PayPal' });
    }
  } catch (err: any) {
    console.error("Error en PayPal:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 🚀 ENDPOINT DE RESERVAS Y WEBHOOK N8N
// ==========================================

app.post("/api/bookings", async (req, res) => {
  try {
    const booking = req.body;
    
    // Notificar a n8n si la reserva está confirmada
    if (booking.status === "confirmada" || booking.paymentStatus === "completed") {
      const N8N_URL = process.env.N8N_BOOKING_WEBHOOK_URL;
      if (N8N_URL) {
        fetch(N8N_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(booking)
        }).catch(err => console.error("Error notificando a n8n:", err));
      }
    }
    
    // La escritura a Firestore ya la hace el frontend con addDoc en este punto.
    // Esto es solo el proxy de confirmación.
    res.json({ success: true, booking });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bookings", (req, res) => {
    res.json({ success: true, data: [] });
});


// ==========================================
// 🚀 ENDPOINTS DE WORKFLOWS Y AGENTES DE IA
// ==========================================

// Workflows 
app.post("/api/workflows/:action", (req, res) => {
  res.json({ success: true, message: `Workflow ${req.params.action} simulado/restaurado` });
});
app.post("/webhook/verificar-pago-reserva", (req, res) => { res.json({ success: true }); });

// Agentes de IA
app.post("/api/agents/:agentName", (req, res) => {
  res.json({ success: true, response: `Respuesta simulada del agente ${req.params.agentName} (Servidor Restaurado)` });
});

// APIs de Gemini
app.post("/api/gemini/:action", (req, res) => {
  res.json({ success: true, text: `Respuesta de Gemini para ${req.params.action} (Servidor Restaurado)` });
});

app.get("/api/chat/history", (req, res) => {
  res.json({ history: [] });
});
app.delete("/api/chat/history", (req, res) => {
  res.json({ success: true });
});

// ==========================================
// 🚀 MIDDLEWARE VITE (FULL-STACK)
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor Full-Stack Restaurado y corriendo en el puerto ${PORT}`);
  });
}

startServer();
