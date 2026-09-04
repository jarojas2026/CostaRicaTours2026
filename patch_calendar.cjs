const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

if (!content.includes("from 'googleapis'")) {
  content = content.replace(
    'import dotenv from "dotenv";',
    'import dotenv from "dotenv";\nimport { google } from "googleapis";'
  );
}

const calendarEndpoint = `
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

    // Assuming booking.date is "YYYY-MM-DD" and time is something like "08:00"
    // We'll create a generic 8-hour block or use the specific time if available.
    // For simplicity, let's create an all-day event or a 4-hour block.
    const startDate = new Date(\`\${booking.date}T08:00:00Z\`);
    if (isNaN(startDate.getTime())) {
       // fallback if date parse fails
       startDate.setTime(Date.now() + 86400000);
    }
    const endDate = new Date(startDate.getTime() + (4 * 60 * 60 * 1000)); // + 4 hours

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
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "America/Costa_Rica",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "America/Costa_Rica",
      },
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
`;

if (!content.includes('/api/calendar/sync')) {
  // Insert before the error handler
  content = content.replace(
    '// Verificación Server-Side de Pagos (PayPal)',
    calendarEndpoint + '\n  // Verificación Server-Side de Pagos (PayPal)'
  );
}

fs.writeFileSync('server.ts', content);
console.log('Calendar endpoint added');
