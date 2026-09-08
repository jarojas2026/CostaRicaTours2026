import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import { dispatchToN8N, getN8NConfig, verifyN8NRequest } from './backend/n8nService';
import {
  getStripe,
  createBooking,
  getAllBookings,
  updateBookingStatus,
  checkTourAvailability
} from './backend/bookingService';
import {
  processChatInquiry,
  runTriage,
  runProcessor,
  runContingency,
  runSupervisor,
  logException
} from './backend/aiAssistantService';

const app = express();
// Cloud Run asigna el puerto dinámicamente vía la variable de entorno PORT.
// process.env siempre entrega texto, así que lo convertimos a número.
// En desarrollo local (donde esa variable no existe) usamos 3000 como antes.
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// ==========================================
// 💳 PASARELAS DE PAGO (STRIPE & PAYPAL)
// ==========================================

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { tourName, totalUSD, customerEmail } = req.body;
    const stripe = getStripe();
    if (!stripe) {
      console.warn('⚠️ STRIPE_SECRET_KEY no configurada. Simulando enlace de pago.');
      return res.json({ url: `${req.protocol}://${req.get('host')}?booking=success` });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: tourName || 'Tour Costa Rica Tours' },
            unit_amount: Math.round(Number(totalUSD || 0) * 100)
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}?booking=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}?booking=canceled`,
      customer_email: customerEmail
    });
    res.json({ url: session.url, id: session.id });
  } catch (err: any) {
    console.error('Error en Stripe:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { totalUSD, tourName } = req.body;
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = process.env.PAYPAL_SECRET;
    const paypalMode = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl =
      paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    if (!paypalClientId || !paypalSecret) {
      console.warn('⚠️ PAYPAL_CLIENT_ID o PAYPAL_SECRET no configurados. Simulando pago.');
      return res.json({
        url: `${req.protocol}://${req.get('host')}?booking=success`,
        id: 'mock_paypal_id'
      });
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
              amount: { currency_code: 'USD', value: (totalUSD || 0).toString() },
              description: tourName || 'Tour Costa Rica Tours'
            }
          ],
          application_context: {
            return_url: `${req.protocol}://${req.get('host')}?booking=success`,
            cancel_url: `${req.protocol}://${req.get('host')}?booking=canceled`
          }
        })
      });
      const orderData = await orderRes.json();
      const approveLink = orderData.links?.find((link: any) => link.rel === 'approve')?.href;
      res.json({
        url: approveLink || `${req.protocol}://${req.get('host')}?booking=success`,
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

// ==========================================
// 📅 INTEGRACIÓN GOOGLE CALENDAR
// ==========================================

app.post('/api/calendar/sync', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token Bearer requerido' });
    }
    const token = authHeader.split(' ')[1];
    const { booking } = req.body;
    if (!booking) {
      return res.status(400).json({ error: 'Datos de reserva requeridos' });
    }

    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const startDate = new Date(`${booking.date}T08:00:00Z`);
    if (isNaN(startDate.getTime())) {
      startDate.setTime(Date.now() + 86400000);
    }
    const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000);

    const event = {
      summary: `Reserva Confirmada: ${booking.tourName}`,
      location: booking.pickupHotel || 'Costa Rica',
      description: `
        ID Reserva: ${booking.bookingId}
        Cliente: ${booking.customer?.name || booking.customerName || 'No especificado'}
        Email: ${booking.customer?.email || booking.customerEmail || 'No especificado'}
        Pasajeros: ${(booking.adults || 0) + (booking.children || 0)}
        Método de Pago: ${booking.paymentMethod}
      `,
      start: { dateTime: startDate.toISOString(), timeZone: 'America/Costa_Rica' },
      end: { dateTime: endDate.toISOString(), timeZone: 'America/Costa_Rica' }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    });
    res.json({ success: true, eventLink: response.data.htmlLink });
  } catch (error: any) {
    console.error('Error sincronizando calendario:', error);
    res.status(500).json({ error: error.message || 'Fallo al sincronizar con Google Calendar' });
  }
});

// ==========================================
// 📦 SISTEMA DE RESERVAS Y DISPONIBILIDAD (FIRESTORE)
// ==========================================

// Consulta de disponibilidad de cupos por tour
app.get('/api/tours/:id/availability', async (req, res) => {
  try {
    const { date, time, seats } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'El parámetro "date" es requerido.' });
    }

    const result = await checkTourAvailability(
      req.params.id,
      String(date),
      time ? String(time) : undefined,
      seats ? Number(seats) : 1
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Crear reserva (con verificación server-side de pago, cupos en Firestore y notificación a n8n)
app.post('/api/bookings', async (req, res) => {
  try {
    const result = await createBooking(req.body);

    if (result.conflict) {
      return res.status(409).json(result);
    }

    res.status(201).json({ success: true, booking: result.booking });
  } catch (err: any) {
    console.error('Error al procesar reserva:', err);
    res.status(500).json({ error: err.message || 'Error interno al crear la reserva' });
  }
});

// Listar todas las reservas (desde Firestore)
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await getAllBookings();
    res.json({ success: true, bookings, data: bookings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar una reserva
app.patch('/api/bookings/:id', async (req, res) => {
  try {
    const result = await updateBookingStatus(req.params.id, req.body);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ⚡ TRIGGERS SALIENTES PARA N8N (DESDE FRONTEND)
// ==========================================

// 1. Trigger: CONSULTA_CHAT_IA
app.post('/webhook/chat-consulta', async (req, res) => {
  const { mensaje, message, idioma, language, contexto, context, agenteSeleccionado } = req.body;
  const userMsg = mensaje || message || '';
  const lang = (idioma || language || 'es') as 'es' | 'en';
  const chatHistory = contexto?.historialChat || context?.chatHistory || [];

  // Intento de despacho prioritario a n8n si hay webhook configurado
  const n8nResult = await dispatchToN8N('/webhook/chat-consulta', req.body);

  if (n8nResult.success && n8nResult.data) {
    const data = n8nResult.data;
    const reply = data.reply || data.mensaje || data.output || data.response || null;
    if (reply) {
      return res.json({
        exito: true,
        datos: {
          reply,
          quickActions: data.quickActions || [],
          agente: agenteSeleccionado || 'n8n_agent',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Fallback inteligente con el Asistente Oficial de Costa Rica Tours (Gemini)
  const assistantResult = await processChatInquiry(userMsg, lang, chatHistory);

  res.json({
    exito: true,
    datos: {
      reply: assistantResult.reply,
      quickActions: assistantResult.quickActions,
      agente: agenteSeleccionado || 'asistente_pura_vida_ia',
      timestamp: new Date().toISOString()
    }
  });
});

// 2. Trigger: INICIO_RESERVA
app.post('/webhook/inicio-reserva', async (req, res) => {
  const payload = { trigger: 'INICIO_RESERVA', ...req.body, timestamp: new Date().toISOString() };
  dispatchToN8N('/webhook/inicio-reserva', payload).catch(() => {});
  res.json({ exito: true, mensaje: 'Inicio de reserva recibido y despachado a n8n' });
});

// 3. Trigger: SOLICITUD_PAGO
app.post('/webhook/solicitud-pago', async (req, res) => {
  const payload = { trigger: 'SOLICITUD_PAGO', ...req.body, timestamp: new Date().toISOString() };
  dispatchToN8N('/webhook/solicitud-pago', payload).catch(() => {});
  res.json({ exito: true, mensaje: 'Solicitud de pago recibida y despachada a n8n' });
});

// 4. Trigger: CONFIRMACION_RESERVA
app.post('/webhook/confirmacion-reserva', async (req, res) => {
  const payload = { trigger: 'CONFIRMACION_RESERVA', ...req.body, timestamp: new Date().toISOString() };
  dispatchToN8N('/webhook/confirmacion-reserva', payload).catch(() => {});
  res.json({ exito: true, mensaje: 'Confirmación de reserva recibida y despachada a n8n' });
});

// 5. Trigger: SOLICITUD_ITINERARIO
app.post('/webhook/solicitud-itinerario', async (req, res) => {
  const payload = { trigger: 'SOLICITUD_ITINERARIO', ...req.body, timestamp: new Date().toISOString() };
  dispatchToN8N('/webhook/solicitud-itinerario', payload).catch(() => {});
  res.json({ exito: true, mensaje: 'Solicitud de itinerario recibida y despachada a n8n' });
});

// 6. Trigger: EVENTO_ANALITICA
app.post('/webhook/evento-analitica', async (req, res) => {
  const payload = { trigger: 'EVENTO_ANALITICA', ...req.body, timestamp: new Date().toISOString() };
  dispatchToN8N('/webhook/evento-analitica', payload).catch(() => {});
  res.json({ exito: true });
});

// 7. Trigger: SOLICITUD_SOPORTE
app.post('/webhook/solicitud-soporte', async (req, res) => {
  const payload = { trigger: 'SOLICITUD_SOPORTE', ...req.body, timestamp: new Date().toISOString() };
  dispatchToN8N('/webhook/solicitud-soporte', payload).catch(() => {});
  res.json({ exito: true, mensaje: 'Solicitud de soporte recibida y despachada a n8n' });
});

// ==========================================
// 📥 WEBHOOKS ENTRANTES DESDE N8N (CALLBACKS)
// ==========================================

// Endpoint para que n8n actualice una reserva en Firestore
app.post('/api/webhooks/n8n/update-booking', async (req, res) => {
  if (!verifyN8NRequest(req.headers)) {
    return res.status(401).json({ error: 'Credenciales de n8n inválidas' });
  }

  const { bookingId, status, paymentStatus, notes, voucherUrl, operatorAssigned } = req.body;
  if (!bookingId) {
    return res.status(400).json({ error: 'Se requiere "bookingId"' });
  }

  const result = await updateBookingStatus(bookingId, {
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(notes ? { notes } : {}),
    ...(voucherUrl ? { voucherUrl } : {}),
    ...(operatorAssigned ? { operatorAssigned } : {}),
    n8nLastUpdated: new Date().toISOString()
  });

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json({ success: true, message: 'Reserva actualizada desde n8n', booking: result.booking });
});

// Callback de verificación de pago de reserva
app.post('/webhook/verificar-pago-reserva', async (req, res) => {
  const { bookingId, paymentStatus, status } = req.body;
  if (bookingId) {
    await updateBookingStatus(bookingId, {
      paymentStatus: paymentStatus || 'completed',
      status: status || 'confirmada',
      verifiedByWebhook: true
    });
  }
  res.json({ success: true, message: 'Pago verificado correctamente' });
});

// Acciones ejecutivas disparadas por n8n (cancelar, re-agendar, emitir voucher)
app.post('/api/webhooks/n8n/booking-action', async (req, res) => {
  if (!verifyN8NRequest(req.headers)) {
    return res.status(401).json({ error: 'Credenciales de n8n inválidas' });
  }

  const { bookingId, action, payload } = req.body;
  if (!bookingId || !action) {
    return res.status(400).json({ error: 'Faltan bookingId y action' });
  }

  let updates: any = {};
  if (action === 'confirm') {
    updates = { status: 'confirmada', paymentStatus: 'completed' };
  } else if (action === 'cancel') {
    updates = { status: 'cancelada', cancellationReason: payload?.reason || 'Cancelado por n8n' };
  } else if (action === 'reschedule') {
    updates = { date: payload?.date, time: payload?.time || '08:00 AM' };
  } else if (action === 'add_voucher') {
    updates = { voucherUrl: payload?.voucherUrl, voucherCode: payload?.voucherCode };
  }

  const result = await updateBookingStatus(bookingId, updates);
  res.json({ success: result.success, action, booking: result.booking });
});

// ==========================================
// 🔍 ESTADO Y DIAGNÓSTICO DE N8N
// ==========================================

app.get('/api/n8n/status', (req, res) => {
  const config = getN8NConfig();
  const isCustomConfigured = !config.baseUrl.includes('tu-instancia-n8n');

  res.json({
    status: 'ok',
    configured: isCustomConfigured,
    baseUrl: isCustomConfigured ? config.baseUrl : 'Sin configurar (Modo Simulación / Fallback IA Activo)',
    endpoints: {
      outboundTriggers: [
        '/webhook/chat-consulta',
        '/webhook/inicio-reserva',
        '/webhook/solicitud-pago',
        '/webhook/confirmacion-reserva',
        '/webhook/solicitud-itinerario',
        '/webhook/evento-analitica',
        '/webhook/solicitud-soporte'
      ],
      inboundWebhooks: [
        '/api/webhooks/n8n/update-booking',
        '/webhook/verificar-pago-reserva',
        '/api/webhooks/n8n/booking-action'
      ]
    },
    authSecurity: {
      secretConfigured: Boolean(process.env.N8N_WEBHOOK_SECRET),
      apiKeyConfigured: Boolean(process.env.N8N_API_KEY)
    }
  });
});

app.post('/api/n8n/test-connection', async (req, res) => {
  const testResult = await dispatchToN8N('/webhook/health-check', {
    ping: 'costa-rica-tours-test',
    timestamp: new Date().toISOString()
  });

  res.json({
    connected: testResult.success,
    status: testResult.status || null,
    details: testResult.data || testResult.error
  });
});

// ==========================================
// 🤖 AGENTES DEL ENJAMBRE (TRIAGE, PROCESADOR, SUPERVISOR)
// ==========================================

app.post('/api/agents/triage', async (req, res) => {
  const result = await runTriage(req.body.rawMessage || '');
  res.json(result);
});

app.post('/api/agents/processor', async (req, res) => {
  const { rawMessage, intent, extractedData } = req.body;
  const result = await runProcessor(rawMessage || '', intent || '', extractedData || {});
  res.json(result);
});

app.post('/api/agents/contingency', async (req, res) => {
  const result = await runContingency(req.body);
  res.json(result);
});

app.post('/api/agents/supervisor', async (req, res) => {
  const result = await runSupervisor();
  res.json(result);
});

app.post('/api/agents/log_exception', (req, res) => {
  const { agentName, errorContext, rawData } = req.body;
  logException(agentName || 'UnknownAgent', errorContext || 'Error', rawData);
  res.json({ success: true });
});

// Compatibilidad de rutas generales
app.post('/api/workflows/:action', (req, res) => {
  res.json({ success: true, message: `Workflow ${req.params.action} procesado con éxito` });
});

app.post('/api/gemini/:action', (req, res) => {
  res.json({ success: true, text: `Respuesta de Gemini para ${req.params.action}` });
});

app.get('/api/chat/history', (req, res) => {
  res.json({ history: [] });
});

app.delete('/api/chat/history', (req, res) => {
  res.json({ success: true });
});

// ==========================================
// 🚀 MIDDLEWARE VITE (FULL-STACK SPA + BACKEND)
// ==========================================

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Full-Stack corriendo en http://0.0.0.0:${PORT}`);
    console.log(`⚡ Backend n8n listo con triggers salientes y webhooks entrantes.`);
  });
}

startServer();
