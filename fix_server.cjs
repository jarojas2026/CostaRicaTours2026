const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.post\("\/api\/bookings", async \(req, res\) => \{[\s\S]*?\n\}\);(\n|\r)+app\.get\("\/api\/bookings"/;

const newEndpoint = `
// --- GOOGLE CALENDAR NATIVE INTEGRATION ---
app.post("/api/calendar/sync", express.json(), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No Bearer token provided" });
    }
    const token = authHeader.split(" ")[1];
    const { booking } = req.body;
    if (!booking) {
      return res.status(400).json({ error: "Booking data required" });
    }
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    const startDate = new Date(\`\${booking.date}T08:00:00Z\`);
    if (isNaN(startDate.getTime())) {
       startDate.setTime(Date.now() + 86400000);
    }
    const endDate = new Date(startDate.getTime() + (4 * 60 * 60 * 1000));
    const event = {
      summary: \`Reserva Confirmada: \${booking.tourName}\`,
      location: booking.pickupHotel || "Costa Rica",
      description: \`
        Booking ID: \${booking.bookingId}
        Cliente: \${booking.customerName || "No especificado"}
        Email: \${booking.customerEmail || "No especificado"}
        Pasajeros: \${(booking.adults || 0) + (booking.children || 0)}
        Método de Pago: \${booking.paymentMethod}
      \`,
      start: { dateTime: startDate.toISOString(), timeZone: "America/Costa_Rica" },
      end: { dateTime: endDate.toISOString(), timeZone: "America/Costa_Rica" },
    };
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });
    res.json({ success: true, eventLink: response.data.htmlLink });
  } catch (error: any) {
    console.error("Calendar Sync Error:", error);
    res.status(500).json({ error: error.message || "Failed to sync with calendar" });
  }
});
// ------------------------------------------

app.post("/api/bookings", async (req, res) => {
  const bookingsCol = getBookingsCollection();
  if (!bookingsCol) {
    return res.status(503).json({ error: "La base de datos no está disponible. Intentá de nuevo en unos minutos." });
  }

  const {
    tourId,
    tourName,
    date,
    time,
    adults,
    children,
    pickupHotel,
    totalUSD,
    customer,
    electronicInvoice,
    paymentMethod,
    specialRequests,
    flightDetails,
    paypalOrderId,
    stripeSessionId
  } = req.body;

  if (!tourId || !date) {
    return res.status(400).json({ error: "Faltan datos obligatorios: tourId y date." });
  }

  const numAdults = Number(adults) || 1;
  const numChildren = Number(children) || 0;
  const bookingTime = time || "08:00 AM";

  const tourDef = TOURS.find((t) => t.id === tourId);
  if (tourDef?.maxGroupSize) {
    const existingSnapshot = await bookingsCol
      .where("tourId", "==", tourId)
      .where("date", "==", date)
      .where("time", "==", bookingTime)
      .get();

    let alreadyBooked = 0;
    existingSnapshot.forEach((doc) => {
      const b = doc.data();
      if (b.status !== "cancelada") {
        alreadyBooked += (b.adults || 0) + (b.children || 0);
      }
    });

    if (alreadyBooked + numAdults + numChildren > tourDef.maxGroupSize) {
      return res.status(409).json({
        error: "sin_disponibilidad",
        message: "No queda cupo suficiente para ese tour en esa fecha y horario.",
        cuposDisponibles: Math.max(0, tourDef.maxGroupSize - alreadyBooked)
      });
    }
  }

  const bookingId = \`CR-PV-\${Math.floor(100000 + Math.random() * 900000)}\`;
  const pnrLocator = flightDetails ? \`PNR-\${Math.random().toString(36).substring(2, 8).toUpperCase()}\` : undefined;

  let agentInsights = null;
  if (ai) {
    try {
      const prompt = \`Analiza la siguiente reserva turística y automatiza las tareas operativas requeridas.
      Detalles de la reserva:
      - Tour: \${tourName}
      - Fecha y Hora: \${date} \${bookingTime}
      - Pasajeros: \${numAdults} adultos, \${numChildren} niños
      - Hotel/Recogida: \${pickupHotel || 'No especificado'}
      - Notas especiales del cliente: \${specialRequests || 'Ninguna'}
        
      Genera las etiquetas operativas, evaluación de riesgos logísticos e instrucciones automatizadas para el operador local.\`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Eres el Agente Operativo Automático de Costa Rica Tours. Tu trabajo corre en el backend y es procesar las reservas, analizando la logística para automatizar la operación turística. Debes generar un JSON estructurado con las instrucciones para el operador local.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              automatedTags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Etiquetas automáticas asignadas" },
              riskAssessment: { type: Type.STRING, description: "Evaluación de riesgos" },
              operationalInstructions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Instrucciones paso a paso" }
            }
          }
        }
      });

      if (response.text) {
        agentInsights = JSON.parse(response.text);
      }
    } catch (e) {
      console.error("AI Booking Automation Error:", e);
    }
  }

  // Verificación Server-Side de Pagos
  let finalStatus = "pendiente_pago";
  let finalPaymentStatus = "pending";

  if (paymentMethod === "paypal" && paypalOrderId) {
    try {
      const paypalClientId = process.env.PAYPAL_CLIENT_ID;
      const paypalSecret = process.env.PAYPAL_SECRET;
      const paypalMode = process.env.PAYPAL_MODE || "sandbox";
      const baseUrl = paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
        
      if (paypalClientId && paypalSecret) {
        const authStr = Buffer.from(\`\${paypalClientId}:\${paypalSecret}\`).toString('base64');
        const authRes = await fetch(\`\${baseUrl}/v1/oauth2/token\`, {
          method: 'POST',
          body: 'grant_type=client_credentials',
          headers: {
            'Authorization': \`Basic \${authStr}\`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        const authData = await authRes.json();
          
        if (authData.access_token) {
          const orderRes = await fetch(\`\${baseUrl}/v2/checkout/orders/\${paypalOrderId}\`, {
            headers: { 'Authorization': \`Bearer \${authData.access_token}\` }
          });
          const orderData = await orderRes.json();
            
          if (orderData.status === 'COMPLETED') {
            finalStatus = "confirmada";
            finalPaymentStatus = "completed";
          }
        }
      } else {
        console.warn("PAYPAL_CLIENT_ID or PAYPAL_SECRET not configured.");
      }
    } catch (err) {
      console.error("Error verifying PayPal order:", err);
    }
  } else if ((paymentMethod === "credit_card" || paymentMethod === "stripe") && stripeSessionId) {
    try {
      const stripe = getStripe();
      if (stripe) {
        const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
        if (session.payment_status === 'paid') {
          finalStatus = "confirmada";
          finalPaymentStatus = "completed";
        }
      }
    } catch (err) {
      console.error("Error verifying Stripe session:", err);
    }
  }

  const newBooking = {
    bookingId,
    tourId,
    tourName,
    date,
    time: bookingTime,
    adults: numAdults,
    children: numChildren,
    pickupHotel: pickupHotel || (flightDetails ? \`Aeropuerto \${flightDetails.destinationCode} (Vuelo \${flightDetails.flightNumber})\` : "Recepción del Hotel"),
    specialRequests,
    totalUSD,
    totalCRC: Math.round((totalUSD || 0) * 515),
    paymentMethod: paymentMethod || "credit_card",
    paymentStatus: finalPaymentStatus,
    customer,
    electronicInvoice,
    flightDetails: flightDetails ? {
      ...flightDetails,
      pnrLocator: flightDetails.pnrLocator || pnrLocator
    } : undefined,
    createdAt: new Date().toISOString(),
    status: finalStatus,
    agentInsights
  };

  try {
    await bookingsCol.doc(bookingId).set(newBooking);
  } catch (error) {
    console.error("Error guardando la reserva en Firestore:", error);
    return res.status(500).json({ error: "No se pudo guardar la reserva. Intentá de nuevo." });
  }

  // Avisar a n8n de que entró una reserva nueva, SOLO si ya está confirmada o pago verificado.
  if (finalStatus === "confirmada") {
    const N8N_URL = process.env.N8N_BOOKING_WEBHOOK_URL || "https://costaricatours.app.n8n.cloud/webhook-test/mi-api";
    if (N8N_URL) {
      fetch(N8N_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBooking)
      }).catch((err) => console.error("Error notificando a n8n:", err));
    }
  }

  res.status(201).json({ success: true, booking: newBooking });
});

app.get("/api/bookings"`;

server = server.replace(regex, newEndpoint);
fs.writeFileSync('server.ts', server);
console.log("Updated server.ts successfully");
