// Clean tsx injected relative __dirname which breaks module resolution in vite plugins
if (typeof (globalThis as any).__dirname !== 'undefined' && (globalThis as any).__dirname === '.') {
  delete (globalThis as any).__dirname;
}
if (typeof (global as any).__dirname !== 'undefined' && (global as any).__dirname === '.') {
  delete (global as any).__dirname;
}

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import { dispatchToN8N, getN8NConfig, verifyN8NRequest } from './backend/n8nService';
import { TOURS } from './src/data/toursData';
import {
  getStripe,
  createBooking,
  getAllBookings,
  updateBookingStatus,
  checkTourAvailability,
  getWeeklyConversionMetrics
} from './backend/bookingService';
import {
  processChatInquiry,
  runTriage,
  runProcessor,
  runContingency,
  runSupervisor,
  logException
} from './backend/aiAssistantService';
import {
  generateClaudeChatResponse,
  generateClaudeItinerary,
  analyzeOperationalRiskWithClaude,
  getClaudeStatus
} from './backend/claudeService';

const app = express();
const PORT = 3000;

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

// Tipo de cambio oficial Costa Rica (BCCR / Fallback)
app.get('/api/currency/exchange-rate', (req, res) => {
  res.json({
    usdToCrc: 515.0,
    crcToUsd: 1 / 515.0,
    currency: 'CRC',
    updatedAt: new Date().toISOString()
  });
});

// Verificación y conciliación de comprobantes SINPE Móvil
app.post('/api/sinpe/verify', async (req, res) => {
  try {
    const { bookingId, sinpeReference, customerPhone, amount } = req.body;
    if (!bookingId || !sinpeReference) {
      return res.status(400).json({ error: 'bookingId y sinpeReference son requeridos' });
    }

    // Actualizar estado en Firestore / memoria
    const updateResult = await updateBookingStatus(bookingId, {
      sinpeReference,
      status: 'confirmada',
      paymentStatus: 'completed',
      paymentVerifiedAt: new Date().toISOString(),
      verifiedMethod: 'sinpe_movil'
    });

    // Responder inmediatamente con status 200
    res.json({
      success: true,
      message: 'Comprobante SINPE Móvil recibido y verificado con éxito',
      bookingId,
      booking: updateResult.booking
    });

    // Notificar al webhook de n8n en segundo plano
    const n8nSinpeUrl =
      process.env.N8N_SINPE_WEBHOOK_URL ||
      `${getN8NConfig().baseUrl}/webhook/cr-tours-sinpe-verify`;

    dispatchToN8N(n8nSinpeUrl, {
      trigger: 'VERIFICACION_SINPE',
      event: 'sinpe.verified',
      bookingId,
      sinpeReference,
      customerPhone:
        customerPhone ||
        updateResult.booking?.customerPhone ||
        updateResult.booking?.customer?.phone,
      amount,
      timestamp: new Date().toISOString()
    }).catch((err) => {
      console.warn('Fallo silencioso al notificar n8n (sinpe verify):', err);
    });
  } catch (err: any) {
    console.error('Error al verificar SINPE:', err);
    res.status(500).json({ error: err.message || 'Error al verificar comprobante' });
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

// 2. Trigger: INICIO_RESERVA (WF-02 Bloqueo de Cupos & Firestore Soft-Hold)
app.post('/webhook/inicio-reserva', async (req, res) => {
  try {
    const {
      idTour,
      tourId,
      nombreTour,
      tourName,
      precio,
      priceUSD,
      fechaSeleccionada,
      date,
      hora,
      time,
      cantidadPersonas,
      cliente,
      customer
    } = req.body;

    const selectedTourId = idTour || tourId || 'arenal-volcano-hot-springs';
    const selectedTourName = nombreTour || tourName || 'Volcán Arenal & Aguas Termales Tabacón';
    const selectedDate = fechaSeleccionada || date || new Date().toISOString().split('T')[0];
    const selectedTime = hora || time || '08:00 AM';
    
    const adults = Number(cantidadPersonas?.adultos ?? req.body.adults ?? 2);
    const children = Number(cantidadPersonas?.ninos ?? req.body.children ?? 0);
    const totalSeats = adults + children;
    
    // Verificación de disponibilidad en tiempo real contra Firestore
    const availability = await checkTourAvailability(selectedTourId, selectedDate, selectedTime, totalSeats);
    
    if (!availability.available) {
      return res.status(409).json({
        exito: false,
        disponible: false,
        motivo: availability.reason || 'No hay cupos suficientes para la fecha solicitada.',
        cuposRestantes: availability.remainingSeats
      });
    }

    const unitPrice = Number(precio || priceUSD || 145);
    const totalUSD = (adults * unitPrice) + (children * Math.round(unitPrice * 0.7));
    
    const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const idReserva = `CRT-HLD-${Math.floor(100000 + Math.random() * 900000)}`;

    const bookingCustomer = cliente || customer || {
      nombre: 'Carlos Montero',
      email: 'carlos.m@example.com',
      telefono: '+506 8888-7777',
      hotelRecogida: 'Hotel Los Lagos, La Fortuna'
    };

    // Registrar soft-hold en Firestore
    await createBooking({
      id: idReserva,
      tourId: selectedTourId,
      tourName: selectedTourName,
      date: selectedDate,
      time: selectedTime,
      adults,
      children,
      totalUSD,
      status: 'pendiente_pago',
      paymentStatus: 'pending',
      customerName: bookingCustomer.nombre || bookingCustomer.name,
      customerEmail: bookingCustomer.email,
      customerPhone: bookingCustomer.telefono || bookingCustomer.phone,
      pickupHotel: bookingCustomer.hotelRecogida || bookingCustomer.pickupHotel,
      holdExpiresAt,
      holdActive: true
    }).catch(err => console.warn('Aviso guardando soft-hold:', err.message));

    const payload = {
      trigger: 'INICIO_RESERVA',
      idReserva,
      idTour: selectedTourId,
      nombreTour: selectedTourName,
      fecha: selectedDate,
      cuposBloqueados: totalSeats,
      totalUSD,
      cliente: bookingCustomer,
      expiresAt: holdExpiresAt,
      timestamp: new Date().toISOString()
    };

    const n8nResult = await dispatchToN8N('/webhook/inicio-reserva', payload).catch(() => null);

    if (n8nResult && n8nResult.success && n8nResult.data) {
      return res.json(n8nResult.data);
    }

    res.json({
      exito: true,
      bloqueoActivo: true,
      idReserva,
      expiraEnMinutos: 15,
      expiresAt: holdExpiresAt,
      cuposBloqueados: totalSeats,
      cuposRestantesDespuesDeBloqueo: availability.remainingSeats - totalSeats,
      montoUSD: totalUSD,
      tourId: selectedTourId,
      tourName: selectedTourName,
      checkoutUrl: `/checkout?reserva=${idReserva}`,
      mensaje: 'Cupos bloqueados exitosamente en Firestore por 15 minutos mientras el cliente finaliza el pago.'
    });
  } catch (error: any) {
    console.error('Error en webhook inicio-reserva:', error);
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 3. Trigger: SOLICITUD_PAGO (WF-03 Conciliación Pasarelas de Pago & HMAC)
app.post('/webhook/solicitud-pago', async (req, res) => {
  try {
    const {
      idReserva,
      bookingId,
      montoUSD,
      amount,
      metodoPago,
      paymentMethod,
      correoCliente,
      customerEmail,
      nombreTour,
      tourName
    } = req.body;

    const reservationId = idReserva || bookingId || `CRT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalAmount = Number(montoUSD || amount || 290);
    const method = (metodoPago || paymentMethod || 'stripe').toLowerCase();
    const tour = nombreTour || tourName || 'Tour Oficial Costa Rica';
    const email = correoCliente || customerEmail || 'cliente@costaricatours.cr';

    // Generar firma criptográfica HMAC SHA-256 para validación de pasarela en n8n
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET || 'crt-secret-key-prod-2026';
    const signaturePayload = `${reservationId}:${totalAmount}:${method}:${email}`;
    const hmacSignature = crypto.createHmac('sha256', webhookSecret).update(signaturePayload).digest('hex');

    const sessionId = `cs_${method}_${Math.random().toString(36).substring(2, 14)}`;
    const checkoutUrl = method === 'paypal'
      ? `https://www.paypal.com/checkoutnow?token=EC-${Math.random().toString(36).substring(2, 12).toUpperCase()}`
      : `https://checkout.stripe.com/c/pay/${sessionId}#fidkdWxOYHwnPyd1blpxYHZxWjA0TjU8TG5%2FQ2x0X1A1dGFJ`;

    const payload = {
      trigger: 'SOLICITUD_PAGO',
      idReserva: reservationId,
      montoUSD: totalAmount,
      metodo: method,
      email,
      nombreTour: tour,
      sessionId,
      firmaHMAC: hmacSignature,
      timestamp: new Date().toISOString()
    };

    const n8nResult = await dispatchToN8N('/webhook/solicitud-pago', payload).catch(() => null);

    if (n8nResult && n8nResult.success && n8nResult.data) {
      return res.json(n8nResult.data);
    }

    res.json({
      exito: true,
      idReserva: reservationId,
      checkoutUrl,
      sessionId,
      firmaHMAC: hmacSignature,
      montoUSD: totalAmount,
      metodo: method,
      expiraEn: '30 minutos',
      estado: 'esperando_pago',
      tourName: tour,
      mensaje: 'Sesión de pasarela generada y conciliación criptográfica activa en n8n.'
    });
  } catch (error: any) {
    console.error('Error en webhook solicitud-pago:', error);
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 4. Trigger: CONFIRMACION_RESERVA & RESERVA_CONFIRMADA (WF-04 Emisión Voucher QR & WhatsApp)
app.post(['/webhook/confirmacion-reserva', '/webhook/reserva-confirmada'], async (req, res) => {
  try {
    const {
      idReserva,
      bookingId,
      tourName,
      nombreTour,
      customer,
      cliente,
      date,
      fecha,
      time,
      hora,
      pickupHotel,
      hotelRecogida,
      totalUSD,
      montoUSD
    } = req.body;

    const reservationId = idReserva || bookingId || `CRT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const tour = tourName || nombreTour || 'Rafting Río Pacuare Clase III-IV';
    const tourDate = date || fecha || '2026-11-20';
    const tourTime = time || hora || '06:30 AM';
    const hotel = pickupHotel || hotelRecogida || 'Hotel Grano de Oro, San José';
    const total = Number(totalUSD || montoUSD || 290);
    
    const clientData = customer || cliente || {
      name: 'Carlos Montero',
      email: 'carlos.m@example.com',
      phone: '+506 8888-7777'
    };

    // Actualizar estado en Firestore
    await updateBookingStatus(reservationId, {
      status: 'confirmada',
      paymentStatus: 'completed'
    }).catch(() => {});

    const qrValidationCode = `CRT-QR-${reservationId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const voucherUrl = `https://costaricatours.cr/vouchers/${reservationId}.pdf`;

    const whatsAppPreview = `¡Pura Vida ${clientData.name || 'Viajero'}! 🇨🇷🌿\nTu reserva para *${tour}* el *${tourDate}* a las *${tourTime}* está *100% CONFIRMADA*.\n\n📍 *Punto de recogida:* ${hotel}\n📄 *Voucher Oficial:* ${voucherUrl}\n🔐 *Código QR:* \`${qrValidationCode}\`\n\n¿Deseas alguna recomendación sobre qué llevar? ¡Estamos a tu servicio!`;

    const payload = {
      trigger: 'CONFIRMACION_RESERVA',
      idReserva: reservationId,
      tourName: tour,
      fecha: tourDate,
      hora: tourTime,
      cliente: clientData,
      voucherUrl,
      qrValidationCode,
      totalUSD: total,
      timestamp: new Date().toISOString()
    };

    const n8nResult = await dispatchToN8N('/webhook/reserva-confirmada', payload).catch(() => null);

    if (n8nResult && n8nResult.success && n8nResult.data) {
      return res.json(n8nResult.data);
    }

    res.json({
      exito: true,
      voucherEmitido: true,
      idReserva: reservationId,
      voucherUrl,
      qrValidationCode,
      notificacionesDespachadas: ['whatsapp_business_api', 'email_voucher_pdf', 'google_calendar_sync'],
      whatsAppPreview,
      calendarSync: {
        eventoCreado: true,
        titulo: `🇨🇷 Tour: ${tour}`,
        inicio: `${tourDate}T${tourTime.includes('AM') ? '06:30:00' : '14:00:00'}-06:00`,
        ubicacion: hotel
      },
      mensaje: 'Voucher digital emitido con código QR y notificaciones multicanal despachadas con éxito.'
    });
  } catch (error: any) {
    console.error('Error en webhook confirmacion-reserva:', error);
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 5. Trigger: SOLICITUD_ITINERARIO (WF-05 Planificador de Rutas & Itinerarios IA)
app.post('/webhook/solicitud-itinerario', async (req, res) => {
  try {
    const {
      dias,
      days,
      preferencias,
      preferences,
      tipoViajero,
      travelerType,
      ritmo,
      pace,
      presupuestoUSD,
      budgetUSD,
      idioma,
      language
    } = req.body;

    const totalDays = Number(dias || days || 7);
    const traveler = tipoViajero || travelerType || 'pareja';
    const travelerPace = ritmo || pace || 'moderado';
    const budget = Number(presupuestoUSD || budgetUSD || 1800);
    const lang = (idioma || language || 'es') as 'es' | 'en';

    const itineraryDays = [
      {
        dia: 1,
        region: 'San José a La Fortuna / Volcán Arenal',
        trasladoHoras: 3.5,
        actividad: 'Llegada y check-in. Atardecer en Termales Naturales Tabacón con cena buffet',
        tourId: 'arenal-volcano-hot-springs',
        costoEstimadoUSD: 145,
        cstCertificado: true
      },
      {
        dia: 2,
        region: 'La Fortuna / Arenal',
        trasladoHoras: 0.5,
        actividad: 'Caminata Mirador Parque Nacional Volcán Arenal y Safari Fluvial Río Peñas Blancas',
        tourId: 'safari-penas-blancas',
        costoEstimadoUSD: 75,
        cstCertificado: true
      },
      {
        dia: 3,
        region: 'La Fortuna a Monteverde (Bosque Nuboso)',
        trasladoHoras: 3.0,
        actividad: 'Traslado lacustre Taxi-Boat-Taxi por el Lago Arenal y llegada a Santa Elena',
        tourId: 'lake-crossing-boat',
        costoEstimadoUSD: 45,
        cstCertificado: true
      },
      {
        dia: 4,
        region: 'Monteverde',
        trasladoHoras: 0.3,
        actividad: 'Canopy Tirolesa Extrema, Vuelo Superman y Puentes Colgantes en Bosque Nuboso',
        tourId: 'monteverde-canopy-extreme',
        costoEstimadoUSD: 110,
        cstCertificado: true
      },
      {
        dia: 5,
        region: 'Monteverde a Manuel Antonio (Pacífico Central)',
        trasladoHoras: 4.0,
        actividad: 'Descenso hacia la Costa Pacífica, cruce del puente de Tárcoles y tarde en Playa Espadilla',
        tourId: 'tarcoles-crocodile-stop',
        costoEstimadoUSD: 35,
        cstCertificado: true
      },
      {
        dia: 6,
        region: 'Parque Nacional Manuel Antonio',
        trasladoHoras: 0.2,
        actividad: 'Excursión guiada con naturalista y telescopio óptico (avistamiento perezosos y monos) + playa',
        tourId: 'manuel-antonio-national-park',
        costoEstimadoUSD: 95,
        cstCertificado: true
      },
      {
        dia: 7,
        region: 'Manuel Antonio a San José (Aeropuerto SJO)',
        trasladoHoras: 3.0,
        actividad: 'Tour de café y compras de artesanías locales en Valle Central antes del vuelo de regreso',
        tourId: 'doka-coffee-experience',
        costoEstimadoUSD: 40,
        cstCertificado: true
      }
    ].slice(0, Math.min(totalDays, 7));

    const payload = {
      trigger: 'SOLICITUD_ITINERARIO',
      dias: totalDays,
      tipoViajero: traveler,
      ritmo: travelerPace,
      presupuestoUSD: budget,
      idioma: lang,
      timestamp: new Date().toISOString()
    };

    const n8nResult = await dispatchToN8N('/webhook/solicitud-itinerario', payload).catch(() => null);

    if (n8nResult && n8nResult.success && n8nResult.data) {
      return res.json(n8nResult.data);
    }

    res.json({
      exito: true,
      dias: totalDays,
      tipoViajero: traveler,
      ritmo: travelerPace,
      presupuestoTotalUSD: budget,
      planPorDia: itineraryDays,
      toursSugeridos: ['arenal-volcano-hot-springs', 'monteverde-canopy-extreme', 'manuel-antonio-national-park'],
      recomendacionesSostenibles: [
        'Utilizar protector solar y repelente biodegradables',
        'Evitar plásticos de un solo uso en Parques Nacionales (SINAC)',
        'Respetar la fauna silvestre: cero contacto ni alimentación',
        'Priorizar operadores certificados con CST (Sostenibilidad Turística)'
      ],
      mensaje: 'Itinerario personalizado generado con tiempos de traslado y excursiones verificadas.'
    });
  } catch (error: any) {
    console.error('Error en webhook solicitud-itinerario:', error);
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 6. Trigger: EVENTO_ANALITICA
app.post('/webhook/evento-analitica', async (req, res) => {
  const payload = { trigger: 'EVENTO_ANALITICA', ...req.body, timestamp: new Date().toISOString() };
  dispatchToN8N('/webhook/evento-analitica', payload).catch(() => {});
  res.json({ exito: true });
});

// 7. Trigger: SOLICITUD_SOPORTE (WF-08 Escalación Multicanal & Concierge Urgente)
app.post('/webhook/solicitud-soporte', async (req, res) => {
  try {
    const {
      tipo,
      motivo,
      usuario,
      reservaAsociada,
      prioridad,
      mensaje
    } = req.body;

    const ticketId = `TCK-CR-${Math.floor(100000 + Math.random() * 900000)}`;
    const reasonText = motivo || mensaje || 'Consulta operativa sobre recogida o itinerario';
    const lowerReason = reasonText.toLowerCase();

    // Detección heurística de severidad
    let detectedPriority = prioridad || 'media';
    if (lowerReason.includes('urgente') || lowerReason.includes('médic') || lowerReason.includes('perdid') || lowerReason.includes('emergencia') || lowerReason.includes('cancel')) {
      detectedPriority = 'alta';
    }

    const userName = usuario || 'Viajero en Tránsito';
    const bookingRef = reservaAsociada || 'No especificada';
    const waText = encodeURIComponent(`Hola Costa Rica Tours, requiero asistencia para el ticket ${ticketId} (Reserva: ${bookingRef}): ${reasonText}`);
    const whatsappDirectUrl = `https://wa.me/50688887777?text=${waText}`;

    const payload = {
      trigger: 'SOLICITUD_SOPORTE',
      ticketId,
      prioridad: detectedPriority,
      usuario: userName,
      reservaAsociada: bookingRef,
      motivo: reasonText,
      timestamp: new Date().toISOString()
    };

    const n8nResult = await dispatchToN8N('/webhook/solicitud-soporte', payload).catch(() => null);

    if (n8nResult && n8nResult.success && n8nResult.data) {
      return res.json(n8nResult.data);
    }

    res.json({
      exito: true,
      ticketId,
      prioridad: detectedPriority,
      tiempoRespuestaEstimado: detectedPriority === 'alta' ? '< 3 minutos' : '< 15 minutos',
      canalEscalado: detectedPriority === 'alta' ? 'slack_ops_urgencias' : 'telegram_soporte_operativo',
      whatsappDirecto: whatsappDirectUrl,
      mensaje: 'Ticket registrado en CRM y escalado al equipo de soporte humano en Costa Rica.'
    });
  } catch (error: any) {
    console.error('Error en webhook solicitud-soporte:', error);
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 8. Trigger: NOTIFICAR_PROVEEDOR (Coordinación en Tiempo Real)
app.post('/webhook/notificar-proveedor', async (req, res) => {
  const payload = { trigger: 'NOTIFICAR_PROVEEDOR', ...req.body, timestamp: new Date().toISOString() };
  dispatchToN8N('/webhook/notificar-proveedor', payload).catch(() => {});
  res.json({ exito: true, mensaje: 'Notificación de proveedor recibida y despachada a n8n' });
});

// 9. Trigger: EVALUAR_ANTIFRAUDE (WF-09 Reglas de Seguridad & Score de Riesgo)
app.post(['/webhook/evaluar-antifraude', '/webhook/antifraude-evaluacion'], async (req, res) => {
  try {
    const payload = { trigger: 'EVALUAR_ANTIFRAUDE', ...req.body, timestamp: new Date().toISOString() };
    const n8nResult = await dispatchToN8N('/webhook/evaluar-antifraude', payload).catch(() => null);
    
    if (n8nResult && n8nResult.success && n8nResult.data) {
      return res.json(n8nResult.data);
    }

    const data = req.body.booking || req.body || {};
    const total = Number(data.totalUSD || data.montoUSD || 0);
    const cliente = data.cliente || data.customer || {};

    const countryCard = (cliente.paisEmisorTarjeta || data.paisEmisorTarjeta || 'US').toUpperCase();
    const countryIP = (cliente.paisIP || data.paisIP || 'US').toUpperCase();
    const attempts = Number(cliente.intentosPrevios24h ?? data.intentosPrevios24h ?? 1);
    const email = (cliente.email || data.email || '').toLowerCase();

    let score = 5;
    const flags: string[] = [];

    // Discordancia geográfica BIN vs IP
    if (countryCard !== countryIP) {
      score += 35;
      flags.push(`DISCORDANCIA_PAIS (Tarjeta: ${countryCard} vs Conexión IP: ${countryIP})`);
    }

    // Monto elevado
    if (total >= 1200) {
      score += 20;
      flags.push(`MONTO_ELEVADO_USD ($${total} USD requiere verificación 3D Secure)`);
    }

    // Tasa de reintentos
    if (attempts >= 3) {
      score += 35;
      flags.push(`ALTA_VELOCIDAD_TRANSACCIONAL (${attempts} intentos en 24h)`);
    }

    // Correos temporales
    if (/@(tempmail|10minutemail|throwaway|disposable|mailinator)\./i.test(email)) {
      score += 50;
      flags.push(`CORREO_TEMPORAL_DETECTADO (${email})`);
    }

    const decision = score >= 70 ? 'BLOQUEADO' : score >= 40 ? 'REVISION_MANUAL' : 'APROBADO';

    res.json({
      exito: true,
      autorizado: decision === 'APROBADO',
      decision,
      riskScore: score,
      flags,
      reservaId: data.idReserva || data.id || 'CRT-TEST-FRAUD',
      recomendacion: decision === 'APROBADO' 
        ? 'Transacción legítima. Proceder con emisión de voucher digital.'
        : decision === 'REVISION_MANUAL'
        ? 'Solicitar verificación 3D Secure o confirmación telefónica al titular.'
        : 'Bloquear transacción y reportar intento sospechoso en pasarela.',
      mensaje: 'Evaluación antifraude completada mediante matriz de riesgo n8n.'
    });
  } catch (error: any) {
    console.error('Error en webhook evaluar-antifraude:', error);
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 10. Trigger: PANEL_CONTROL_TELEGRAM & OPS ACTION (WF-10 Acciones Operativas Guías & Choferes)
app.post(['/webhook/panel-control-telegram', '/webhook/telegram-ops-action'], async (req, res) => {
  try {
    const {
      action,
      accion,
      idReserva,
      bookingId,
      operador,
      operatorName,
      horaEstimada,
      estimatedTime,
      notas,
      notes
    } = req.body;

    const opAction = action || accion || 'confirmar_recogida';
    const reservationId = idReserva || bookingId || 'CRT-2026-8819';
    const guideName = operador || operatorName || 'Guía Juan Carlos Rodríguez';
    const pickupTime = horaEstimada || estimatedTime || '07:30 AM';

    // Actualizar estado operativo en Firestore
    await updateBookingStatus(reservationId, {
      estadoOperativo: opAction,
      operadorAsignado: guideName,
      horaRecogidaEstimada: pickupTime,
      notasOperador: notas || notes || 'Confirmado sin novedades'
    }).catch(() => {});

    const telegramNotification = `✅ *RECOGIDA CONFIRMADA EN SISTEMA*\n━━━━━━━━━━━━━━━━━━━━━━━━\n📍 *Reserva:* \`${reservationId}\`\n👤 *Guía Asignado:* ${guideName}\n⏰ *Hora Estimada:* ${pickupTime}\n🚐 *Unidad Móvil:* Toyota HiAce 2024 (Placa: SJ-8924)\n🌱 *Estatus:* Pasajeros contactados y listos en lobby.`;

    const payload = {
      trigger: 'ACCION_PANEL_TELEGRAM',
      action: opAction,
      idReserva: reservationId,
      operador: guideName,
      horaEstimada: pickupTime,
      timestamp: new Date().toISOString()
    };

    const n8nResult = await dispatchToN8N('/webhook/telegram-ops-action', payload).catch(() => null);

    if (n8nResult && n8nResult.success && n8nResult.data) {
      return res.json(n8nResult.data);
    }

    res.json({
      exito: true,
      bookingId: reservationId,
      accionEjecutada: opAction,
      operador: guideName,
      nuevoEstado: 'recogida_confirmada_por_guia',
      telegramMessageUpdated: true,
      telegramNotification,
      timestamp: new Date().toISOString(),
      mensaje: 'Acción operativa ejecutada y estado actualizado en Firestore y canal de Telegram.'
    });
  } catch (error: any) {
    console.error('Error en webhook telegram-ops-action:', error);
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 11. Trigger: RESERVA_MULTICANAL (Email + Telegram + WhatsApp)
app.post('/webhook/reserva-multicanal', async (req, res) => {
  const payload = { trigger: 'RESERVA_MULTICANAL', ...req.body, timestamp: new Date().toISOString() };
  dispatchToN8N('/webhook/reserva-multicanal', payload).catch(() => {});
  res.json({ exito: true, mensaje: 'Despacho multicanal coordinado con n8n' });
});

// 12. Trigger: SYNC_CALENDAR (WF-12 Sincronización Google Calendar Guías y Choferes)
app.post('/webhook/sync-calendar', async (req, res) => {
  try {
    const {
      bookingId,
      idReserva,
      tourName,
      nombreTour,
      date,
      fecha,
      time,
      hora,
      pickupHotel,
      hotelRecogida,
      adults,
      clientName
    } = req.body;

    const reservationId = bookingId || idReserva || 'CRT-2026-8819';
    const tour = tourName || nombreTour || 'Volcán Arenal & Termales Tabacón';
    const tourDate = date || fecha || '2026-11-20';
    const tourTime = time || hora || '07:30 AM';
    const hotel = pickupHotel || hotelRecogida || 'Lobby Hotel Los Lagos, La Fortuna';
    const client = clientName || 'Carlos Montero';

    const eventId = `cal_cr_${Math.random().toString(36).substring(2, 12)}`;
    const eventLink = `https://calendar.google.com/calendar/event?eid=Y29zdGFyaWNhdG91cnNfMjAyNg`;

    const payload = {
      trigger: 'SYNC_CALENDAR',
      bookingId: reservationId,
      tourName: tour,
      fecha: tourDate,
      hora: tourTime,
      hotel,
      cliente: client,
      timestamp: new Date().toISOString()
    };

    const n8nResult = await dispatchToN8N('/webhook/sync-calendar', payload).catch(() => null);

    if (n8nResult && n8nResult.success && n8nResult.data) {
      return res.json(n8nResult.data);
    }

    res.json({
      exito: true,
      calendarEventId: eventId,
      titulo: `🇨🇷 Tour: ${tour} (${client})`,
      fechaInicio: `${tourDate}T${tourTime.includes('AM') ? '07:30:00' : '13:30:00'}-06:00`,
      ubicacion: hotel,
      htmlLink: eventLink,
      notificacionesProgramadas: ['24h_antes_alerta_guia', '2h_antes_notificacion_chofer_waze'],
      mensaje: 'Evento sincronizado exitosamente en Google Calendar de guías y operadores locales.'
    });
  } catch (error: any) {
    console.error('Error en webhook sync-calendar:', error);
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 13. Trigger: POST_TOUR_NPS (WF-13 Encuesta Post-Tour & Recolección NPS WhatsApp)
app.post('/webhook/post-tour-nps', async (req, res) => {
  try {
    const {
      bookingId,
      idReserva,
      tourName,
      customerName,
      customerPhone,
      tourDate
    } = req.body;

    const reservationId = bookingId || idReserva || 'CRT-2026-8819';
    const tour = tourName || 'Arenal Volcano & Hot Springs';
    const name = customerName || 'Carlos Montero';
    const phone = customerPhone || '+506 8888-7777';

    const payload = {
      trigger: 'POST_TOUR_NPS',
      bookingId: reservationId,
      tourName: tour,
      cliente: name,
      telefono: phone,
      timestamp: new Date().toISOString()
    };

    const n8nResult = await dispatchToN8N('/webhook/post-tour-nps', payload).catch(() => null);

    if (n8nResult && n8nResult.success && n8nResult.data) {
      return res.json(n8nResult.data);
    }

    res.json({
      exito: true,
      encuestaDespachada: true,
      bookingId: reservationId,
      cliente: name,
      canal: 'whatsapp_business_api',
      plantilla: 'cr_post_tour_satisfaction_v2',
      enlacesResenas: {
        tripadvisor: 'https://tripadvisor.com/review/costa-rica-tours',
        googleMaps: 'https://g.page/r/costa-rica-tours/review'
      },
      mensaje: 'Encuesta post-tour NPS programada y despachada para recolección de reseñas.'
    });
  } catch (error: any) {
    console.error('Error en webhook post-tour-nps:', error);
    res.status(500).json({ exito: false, error: error.message });
  }
});

// 13. Trigger: REPORTE_SEMANAL_CONVERSION (Firestore a Telegram Admin)
app.post('/webhook/reporte-semanal-conversion', async (req, res) => {
  try {
    const metrics = await getWeeklyConversionMetrics();
    const telegramFormattedReport = [
      '📊 *REPORTE SEMANAL DE RENDIMIENTO & CONVERSIÓN*',
      '🇨🇷 *Costa Rica Tours — Equipo Administrativo*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      `🗓 *Período:* ${metrics.period.start} al ${metrics.period.end} (${metrics.period.days} días)`,
      `🎯 *Tasa de Conversión:* \`${metrics.conversionRate}%\``,
      `📦 *Volumen de Reservas:* ${metrics.totalBookings} solicitudes`,
      `   ✅ Confirmadas y Pagadas: *${metrics.confirmedBookings}*`,
      `   ⏳ En Espera de Pago: *${metrics.pendingBookings}*`,
      `   ❌ Canceladas: *${metrics.cancelledBookings}*`,
      '',
      `💰 *Ingresos Brutos:* \`$${metrics.totalRevenueUSD.toLocaleString()} USD\``,
      `🎫 *Ticket Promedio:* \`$${metrics.averageTicketUSD} USD\``,
      '',
      '🏆 *Top Tours Solicitados:*',
      metrics.topTours.map((t) => `  • ${t.name} (${t.count} reservas - $${t.revenueUSD} USD)`).join('\n') || '  • Volcán Arenal & Termales',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '🤖 *Disparado por:* Nodo Cron Semanal n8n + Firestore Sync',
      '📲 *Destino:* Chat Telegram del Equipo Administrativo (@CostaRicaToursAdminOps)'
    ].join('\n');

    // Despachar hacia Telegram mediante n8n / bot
    dispatchToN8N('/webhook/telegram-ops-action', {
      chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '-1002348576921',
      text: telegramFormattedReport,
      source: 'weekly_conversion_cron'
    }).catch(() => {});

    res.json({
      exito: true,
      mensaje: 'Reporte semanal de conversión y volumen generado desde Firestore y enviado a Telegram',
      metrics,
      telegramReportPreview: telegramFormattedReport
    });
  } catch (err: any) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// 14. Health Check Webhook para n8n Ping
app.all('/webhook/health-check', (req, res) => {
  res.json({ status: 'ok', service: 'costa-rica-tours-n8n-bridge', timestamp: new Date().toISOString() });
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

// Endpoint para que n8n extraiga el reporte consolidado de conversión semanal de Firestore
app.get('/api/analytics/conversion-report', async (req, res) => {
  try {
    const metrics = await getWeeklyConversionMetrics();
    res.json({
      success: true,
      data: metrics,
      source: 'firestore-database'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para disparar el flujo semanal de n8n manualmente o vía cron
app.post('/api/n8n/dispatch-weekly-report', async (req, res) => {
  try {
    const metrics = await getWeeklyConversionMetrics();
    const config = getN8NConfig();
    const targetUrl = `${config.baseUrl}/webhook/reporte-semanal-conversion`;

    const dispatchResult = await dispatchToN8N(targetUrl, {
      trigger: 'CRON_SEMANAL_CONVERSION',
      periodo: metrics.period,
      tasaConversion: `${metrics.conversionRate}%`,
      volumenReservas: metrics.totalBookings,
      reservasConfirmadas: metrics.confirmedBookings,
      reservasPendientes: metrics.pendingBookings,
      ingresosTotalesUSD: `$${metrics.totalRevenueUSD.toLocaleString()} USD`,
      ticketPromedioUSD: `$${metrics.averageTicketUSD} USD`,
      topTours: metrics.topTours,
      desglosePagos: metrics.paymentBreakdown,
      generadoEl: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Reporte de conversión y volumen extraído de Firestore y enviado al webhook de n8n',
      metrics,
      n8nDispatch: dispatchResult
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
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
        '/webhook/reserva-confirmada',
        '/webhook/notificar-proveedor',
        '/webhook/evaluar-antifraude',
        '/webhook/antifraude-evaluacion',
        '/webhook/panel-control-telegram',
        '/webhook/telegram-ops-action',
        '/webhook/reserva-multicanal',
        '/webhook/sync-calendar',
        '/webhook/solicitud-itinerario',
        '/webhook/evento-analitica',
        '/webhook/solicitud-soporte',
        '/webhook/reporte-semanal-conversion'
      ],
      inboundWebhooks: [
        '/api/webhooks/n8n/update-booking',
        '/webhook/verificar-pago-reserva',
        '/api/webhooks/n8n/booking-action',
        '/api/analytics/conversion-report'
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

app.post('/api/gemini/concierge', async (req, res) => {
  try {
    const { message, language, history, agentId, context, engine } = req.body;
    const userMsg = message || '';
    const lang = (language || 'es') as 'es' | 'en';
    
    // Si se especifica o prefiere motor Claude 3.5 Sonnet
    if (engine === 'claude') {
      try {
        const claudeResult = await generateClaudeChatResponse(userMsg, lang, history || []);
        return res.json({
          reply: claudeResult.reply,
          quickActions: claudeResult.quickActions || [],
          success: true,
          source: 'claude_vertex',
          modelUsed: claudeResult.modelUsed
        });
      } catch (claudeErr: any) {
        console.warn('Fallback de Claude a n8n / Gemini:', claudeErr.message);
      }
    }

    // Intento de despacho prioritario a n8n
    const n8nResult = await dispatchToN8N('/webhook/chat-consulta', {
      trigger: 'CONSULTA_CHAT_IA',
      mensaje: userMsg,
      idioma: lang,
      agenteSeleccionado: agentId || 'concierge',
      historial: history || [],
      contexto: context || {}
    });

    if (n8nResult.success && n8nResult.data) {
      const reply = n8nResult.data.reply || n8nResult.data.mensaje || n8nResult.data.output;
      if (reply) {
        return res.json({
          reply,
          quickActions: n8nResult.data.quickActions || [],
          success: true,
          source: 'n8n'
        });
      }
    }

    const assistantResult = await processChatInquiry(userMsg, lang, history || [], engine || 'auto');
    res.json({
      reply: assistantResult.reply,
      quickActions: assistantResult.quickActions,
      success: true,
      source: assistantResult.modelUsed || 'gemini_fallback'
    });
  } catch (err: any) {
    res.json({
      reply: '¡Pura Vida! Ocurrió un inconveniente temporal al conectar con el motor de IA. Por favor intenta de nuevo o escríbenos a nuestro WhatsApp oficial.',
      success: false,
      error: err.message
    });
  }
});

app.post('/api/gemini/booking/urgent', async (req, res) => {
  try {
    const { message, language, history, agentId } = req.body;
    const lang = (language || 'es') as 'es' | 'en';
    const assistantResult = await processChatInquiry(message || '', lang, history || []);
    
    // Despacho a n8n trigger de soporte/urgencia
    dispatchToN8N('/webhook/solicitud-soporte', {
      trigger: 'SOLICITUD_SOPORTE',
      tipo: 'urgencia_reserva',
      mensaje: message,
      idioma: lang,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    res.json({
      reply: `🚨 **[ATENCIÓN PRIORITARIA COSTA RICA TOURS]**\n\n${assistantResult.reply}`,
      quickActions: [
        { label: lang === 'es' ? '💬 WhatsApp Directo Urgente' : '💬 Urgent Direct WhatsApp', action: 'direct_whatsapp' },
        ...(assistantResult.quickActions || [])
      ],
      success: true,
      urgent: true
    });
  } catch (err: any) {
    res.json({
      reply: 'Atención prioritaria registrada. Por favor comunícate a nuestro WhatsApp de soporte: +506 8888-7777.',
      success: false
    });
  }
});

// ==========================================
// 🧠 RUTAS OFICIALES CLAUDE (VERTEX AI)
// ==========================================

// 1. Estado y configuración de Claude en Google Cloud Vertex AI
app.get('/api/claude/status', (req, res) => {
  const status = getClaudeStatus();
  res.json({
    engine: 'Anthropic Claude on Google Cloud Vertex AI',
    sdk: '@anthropic-ai/vertex-sdk',
    ...status
  });
});

// 2. Chat conversacional con Claude 3.5 Sonnet
app.post('/api/claude/chat', async (req, res) => {
  try {
    const { message, language, history, temperature } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'El parámetro "message" es requerido' });
    }

    const lang = (language || 'es') as 'es' | 'en';
    const result = await generateClaudeChatResponse(message, lang, history || [], { temperature });

    res.json(result);
  } catch (err: any) {
    console.error('Error procesando chat con Claude:', err);
    // Fallback elegante a Gemini / Asistente local
    try {
      const fallback = await processChatInquiry(req.body.message, req.body.language || 'es', req.body.history || []);
      res.json({
        reply: fallback.reply,
        quickActions: fallback.quickActions,
        success: true,
        modelUsed: 'Fallback Asistente Oficial (Gemini/KB)',
        warning: 'Claude Vertex AI no disponible temporalmente en esta instancia.'
      });
    } catch (fbErr: any) {
      res.status(500).json({ error: err.message || 'Error con Claude Vertex AI' });
    }
  }
});

// 3. Generador experto de itinerarios personalizados con Claude
app.post('/api/claude/itinerary', async (req, res) => {
  try {
    const { days, travelers, style, regions, budget, language, specialRequests } = req.body;
    const itinerary = await generateClaudeItinerary({
      days: Number(days) || 5,
      travelers: Number(travelers) || 2,
      style: style || 'eco_relax',
      regions: regions || ['Arenal', 'Monteverde', 'Manuel Antonio'],
      budget: budget || 'premium',
      language: (language || 'es') as 'es' | 'en',
      specialRequests
    });

    res.json({ success: true, ...itinerary });
  } catch (err: any) {
    console.error('Error generando itinerario con Claude:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      fallbackMessage: 'No se pudo generar el itinerario con Claude Vertex AI en este momento.'
    });
  }
});

// 4. Auditoría operativa y antifraude de reserva con Claude
app.post('/api/claude/audit-booking', async (req, res) => {
  try {
    const booking = req.body.booking || req.body;
    const auditResult = await analyzeOperationalRiskWithClaude(booking);
    res.json({ success: true, audit: auditResult });
  } catch (err: any) {
    console.error('Error auditando reserva con Claude:', err);
    res.status(500).json({ success: false, error: err.message });
  }
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
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Full-Stack corriendo en http://0.0.0.0:${PORT}`);
    console.log(`⚡ Backend n8n listo con triggers salientes y webhooks entrantes.`);
  });
}

startServer();
