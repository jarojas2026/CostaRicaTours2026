import PDFDocument from 'pdfkit';

export interface BookingPDFData {
  bookingId: string;
  tourName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  time?: string;
  adults: number;
  children: number;
  totalUSD: number;
  currency?: string;
  specialRequests?: string;
  flightDetails?: {
    flightNumber?: string;
    originCountry?: string;
    transportMode?: string;
  };
  pickupHotel?: string;
  createdAt?: string;
}

/**
 * Genera un PDF binario nativo de alta resolución con el Vale Oficial e Itinerario Detallado de 15 Días.
 */
export async function generateBookingPDFBuffer(booking: BookingPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Vale e Itinerario Oficial - Reserva #${booking.bookingId}`,
          Author: 'Costa Rica Tours 2026',
          Subject: 'Comprobante Oficial de Reserva Turística y Vuelo Interno',
          Keywords: 'Costa Rica, Tours, Ecoturismo, Itinerario Familiar'
        }
      });

      const buffers: Buffer[] = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // --- ENCABEZADO ---
      doc.rect(0, 0, 595.28, 70).fill('#041711');

      doc.fillColor('#10b981')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('COSTA RICA TOURS', 40, 20);

      doc.fillColor('#94a3b8')
        .fontSize(9)
        .font('Helvetica')
        .text('Plataforma Oficial de Ecoturismo y Experiencias Sostenibles CST 2026', 40, 44);

      doc.fillColor('#f59e0b')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('COMPROBANTE OFICIAL DE RESERVA', 320, 22, { align: 'right', width: 235 });

      doc.fillColor('#ffffff')
        .fontSize(9)
        .font('Helvetica')
        .text(`ID: #${booking.bookingId}  |  ESTADO: CONFIRMADA`, 320, 42, { align: 'right', width: 235 });

      doc.moveDown(3);

      // --- RECUADRO DE DATOS DEL CLIENTE Y GRUPO ---
      const startY = 85;
      doc.roundedRect(40, startY, 515.28, 95, 8).fillAndStroke('#f8fafc', '#cbd5e1');

      doc.fillColor('#065f46')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('DATOS DEL TITULAR Y PASAJEROS', 55, startY + 12);

      doc.fillColor('#1e293b')
        .fontSize(10)
        .font('Helvetica')
        .text(`Titular: ${booking.customerName || 'Cliente'}`, 55, startY + 32)
        .text(`Email: ${booking.customerEmail || 'No especificado'}`, 55, startY + 48)
        .text(`WhatsApp / Teléfono: ${booking.customerPhone || 'No especificado'}`, 55, startY + 64)
        .text(`Composición: ${booking.adults || 0} Adultos + ${booking.children || 0} Niños`, 55, startY + 80);

      doc.text(`Fecha Inicio: ${booking.date || 'No especificada'} (${booking.time || '09:00 AM'})`, 310, startY + 32)
        .text(`Modalidad: Modalidad según reserva`, 310, startY + 48)
        .text(`Duración: Duración según reserva`, 310, startY + 64);

      doc.fillColor('#047857')
        .font('Helvetica-Bold')
        .text(`Inversión Total: $${booking.totalUSD || 0} USD (Pagado / Confirmado)`, 310, startY + 80);

      // --- RECUADRO DE TRANSPORTE Y VUELOS ---
      const transportY = startY + 105;
      doc.roundedRect(40, transportY, 515.28, 65, 8).fillAndStroke('#ecfdf5', '#a7f3d0');

      doc.fillColor('#047857')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('LOGÍSTICA DE VUELOS Y TRANSPORTE SEGURO CON SILLA DE BEBÉ', 55, transportY + 10);

      doc.fillColor('#1e293b')
        .fontSize(9)
        .font('Helvetica')
        .text(`• Vuelos / conexiones: ${booking.flightDetails?.flightNumber || 'Según datos de reserva'}.`, 55, transportY + 26)
        .text(`• Transporte: ${booking.flightDetails?.transportMode || 'Según datos de reserva'}.`, 55, transportY + 39)
        .text(`• Punto de recogida: ${booking.pickupHotel || 'No especificado'}.`, 55, transportY + 52);

      // --- ITINERARIO DÍA POR DÍA ---
      const itinY = transportY + 75;
      doc.fillColor('#0f766e')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('ITINERARIO OFICIAL DE 15 DÍAS: COSTA RICA FAMILIAR DE COSTA A COSTA', 40, itinY);

      const days = [
        {
          period: 'Detalles de la reserva',
          desc: `Tour: ${booking.tourName || 'Experiencia Costa Rica'}. Fecha: ${booking.date || 'No especificada'}. Hora: ${booking.time || 'No especificada'}.`
        },
        {
          period: 'Grupo y logística',
          desc: `Pasajeros: ${(booking.adults || 0) + (booking.children || 0)}. Recogida: ${booking.pickupHotel || 'No especificada'}. Solicitudes: ${booking.specialRequests || 'Ninguna registrada'}.`
        }
      ];

      let currentY = itinY + 20;
      days.forEach((day, index) => {
        doc.fillColor('#065f46')
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .text(day.period, 40, currentY);

        currentY += 13;
        doc.fillColor('#334155')
          .fontSize(8.5)
          .font('Helvetica')
          .text(day.desc, 40, currentY, { width: 515, lineGap: 1.5 });

        currentY += 28;
      });

      // --- POLÍTICAS Y RECOMENDACIONES ---
      doc.rect(40, currentY + 5, 515.28, 55).fillAndStroke('#f1f5f9', '#cbd5e1');

      doc.fillColor('#0f172a')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('RECOMENDACIONES FAMILIARES Y PROTOCOLOS DE SEGURIDAD:', 50, currentY + 12);

      doc.fillColor('#475569')
        .fontSize(8)
        .font('Helvetica')
        .text('• Ropa cómoda, protector solar biodegradable infantil, repelente orgánico y cochecito plegable.', 50, currentY + 26)
        .text('• Todos los vehículos cuentan con botiquín de primeros auxilios pediátrico y choferes certificados.', 50, currentY + 37)
        .text('• Asistencia y Concierge 24/7 vía WhatsApp: +506 8795 9148  |  Canal de soporte según configuración.', 50, currentY + 48);

      // --- PIE DE PÁGINA ---
      doc.fillColor('#94a3b8')
        .fontSize(8)
        .font('Helvetica')
        .text('Costa Rica Tours 2026 • Documento Oficial Generado Electrónicamente • Operadores Certificados CST', 40, 800, { align: 'center', width: 515.28 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Genera la plantilla HTML imprimible de alta fidelidad para previsualización web y descarga PDF directa.
 */
export function generateBookingPrintableHTML(booking: BookingPDFData): string {
  const safe = (value: unknown, fallback = 'No especificado') =>
    String(value ?? fallback).replace(/[<>]/g, '');
  const passengers = (Number(booking.adults) || 0) + (Number(booking.children) || 0);
  const flight = booking.flightDetails
    ? [booking.flightDetails.flightNumber, booking.flightDetails.originCountry, booking.flightDetails.transportMode]
        .filter(Boolean).map(safe).join(' • ')
    : 'No especificado';

  return `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Comprobante de reserva #${safe(booking.bookingId)}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f1f5f9;color:#0f172a;margin:0;padding:24px}
.page{max-width:820px;margin:auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 35px rgba(0,0,0,.12)}
.header{background:#041711;color:#fff;padding:28px}.brand{font-size:24px;font-weight:900;color:#10b981}.muted{color:#94a3b8;font-size:12px}
.content{padding:28px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.card{border:1px solid #cbd5e1;border-radius:12px;padding:16px}.title{font-weight:800;color:#065f46;margin-bottom:10px}.row{display:flex;justify-content:space-between;gap:16px;padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:13px}.row:last-child{border-bottom:0}.note{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px;margin-top:16px}.btn{display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:11px 16px;border-radius:9px;font-weight:800;margin-top:16px}
@media(max-width:700px){.grid{grid-template-columns:1fr}}
@media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">COSTA RICA TOURS</div>
    <div>COMPROBANTE DE RESERVA #${safe(booking.bookingId)}</div>
    <div class="muted">Documento generado desde la reserva registrada en la plataforma.</div>
  </div>
  <div class="content">
    <div class="grid">
      <div class="card">
        <div class="title">Titular y grupo</div>
        <div class="row"><span>Nombre</span><strong>${safe(booking.customerName)}</strong></div>
        <div class="row"><span>Email</span><strong>${safe(booking.customerEmail)}</strong></div>
        <div class="row"><span>Teléfono</span><strong>${safe(booking.customerPhone)}</strong></div>
        <div class="row"><span>Pasajeros</span><strong>${passengers}</strong></div>
      </div>
      <div class="card">
        <div class="title">Reserva</div>
        <div class="row"><span>Tour</span><strong>${safe(booking.tourName)}</strong></div>
        <div class="row"><span>Fecha</span><strong>${safe(booking.date)}</strong></div>
        <div class="row"><span>Hora</span><strong>${safe(booking.time)}</strong></div>
        <div class="row"><span>Recogida</span><strong>${safe(booking.pickupHotel)}</strong></div>
        <div class="row"><span>Total</span><strong>${safe(booking.totalUSD, '0')} USD</strong></div>
      </div>
    </div>
    <div class="note">
      <div class="title">Logística</div>
      <p><strong>Vuelo / transporte:</strong> ${flight}</p>
      <p><strong>Solicitudes especiales:</strong> ${safe(booking.specialRequests, 'Ninguna registrada')}</p>
    </div>
    <button class="btn" onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>
</div>
</body>
</html>`;
}
