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
        .text(`Titular: ${booking.customerName || 'Cliente de ejemplo'}`, 55, startY + 32)
        .text(`Email: ${booking.customerEmail || 'cliente@example.com'}`, 55, startY + 48)
        .text(`WhatsApp / Teléfono: ${booking.customerPhone || '+506 0000-0000'}`, 55, startY + 64)
        .text(`Composición: ${booking.adults || 0} Adultos + ${booking.children || 0} Niños`, 55, startY + 80);

      doc.text(`Fecha Inicio: ${booking.date || '2026-10-15'} (${booking.time || '09:00 AM'})`, 310, startY + 32)
        .text(`Modalidad: Family Budget, Relaxing & Safe`, 310, startY + 48)
        .text(`Duración: 15 Días / 14 Noches`, 310, startY + 64);

      doc.fillColor('#047857')
        .font('Helvetica-Bold')
        .text(`Inversión Total: $${booking.totalUSD || 2450} USD (Pagado / Confirmado)`, 310, startY + 80);

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
        .text('• Vuelos Domésticos Sansa: Conexiones rápidas para evitar trayectos agotadores a la menor de 3 años.', 55, transportY + 26)
        .text('• Transporte Terrestre Privado: Minivan ejecutiva con aire acondicionado y silla infantil ISOFIX homologada.', 55, transportY + 39)
        .text('• Punto de Encuentro / Recogida: Recepción VIP en Aeropuerto Internacional Juan Santamaría (SJO).', 55, transportY + 52);

      // --- ITINERARIO DÍA POR DÍA ---
      const itinY = transportY + 75;
      doc.fillColor('#0f766e')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('ITINERARIO OFICIAL DE 15 DÍAS: COSTA RICA FAMILIAR DE COSTA A COSTA', 40, itinY);

      const days = [
        {
          period: 'Días 1 - 2: Bienvenida & Llegada a San José / Arenal',
          desc: 'Recepción personalizada en Aeropuerto SJO. Traslado seguro con silla de bebé hacia La Fortuna. Check-in en eco-resort familiar con piscinas de aguas termales relajantes a temperatura segura.'
        },
        {
          period: 'Días 3 - 4: Volcán Arenal & Experiencia Sensorial Infantil',
          desc: 'Senderos 100% accesibles y planos en Parque Nacional Arenal (aptos para cochecito). Tarde en Mariposario y taller artesanal del chocolate costarricense, ideal para la niña de 3 años.'
        },
        {
          period: 'Días 5 - 7: Bosque Nuboso de Monteverde & Puentes Seguros',
          desc: 'Paseo en lancha serena por el Lago Arenal y ascenso a Monteverde. Puentes colgantes con doble barandilla de seguridad alta. Visita al Santuario de Perezosos y jardín de colibríes.'
        },
        {
          period: 'Días 8 - 10: Vuelo Doméstico a Guanacaste (Playas Mansas del Pacífico Norte)',
          desc: 'Vuelo interno corto (40 min) para máxima comodidad. Alojamiento frente a playas tipo alberca sin oleaje fuerte (Hermosa / Papagayo). Atardecer en catamarán suave con delfines.'
        },
        {
          period: 'Días 11 - 12: Parque Nacional Manuel Antonio (Naturaleza & Playa)',
          desc: 'Traslado costero privado. Senderos de madera planos y playa tranquila dentro del Parque Nacional protegida por la bahía. Avistamiento de monos cariblancos, iguanas y perezosos.'
        },
        {
          period: 'Días 13 - 14: Valle del General / Pérez Zeledón & Valle Central',
          desc: 'Visita a granjas orgánicas rurales y cuna del café de especialidad. Almuerzo tradicional en ambiente campestre relajado. Retorno al Valle Central y compras de artesanías.'
        },
        {
          period: 'Día 15: Despedida & Traslado al Aeropuerto SJO',
          desc: 'Desayuno familiar con frutas tropicales. Traslado ejecutivo al Aeropuerto Internacional SJO para el vuelo de regreso con asistencia de equipaje y embarque prioritario.'
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
        .text('• Asistencia y Concierge 24/7 vía WhatsApp: +506 8795 9148  |  Atención a Viviana: +506 0000-0000.', 50, currentY + 48);

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
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vale Oficial e Itinerario - Reserva #${booking.bookingId}</title>
      <style>
        :root {
          --primary: #047857;
          --primary-dark: #041711;
          --accent: #f59e0b;
          --bg-light: #f8fafc;
          --border: #e2e8f0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 30px;
          background: #ffffff;
          line-height: 1.5;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 35px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid var(--primary);
          padding-bottom: 20px;
        }
        .logo-box h1 {
          color: var(--primary);
          margin: 0;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }
        .logo-box p {
          color: #64748b;
          font-size: 12px;
          margin: 4px 0 0 0;
        }
        .badge-box {
          text-align: right;
        }
        .badge {
          background: #d1fae5;
          color: #065f46;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .action-bar {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 12px;
          padding: 15px 20px;
          margin: 25px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }
        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #059669;
          color: white;
          box-shadow: 0 2px 4px rgba(5,150,105,0.25);
        }
        .btn-primary:hover {
          background: #047857;
        }
        .btn-outline {
          background: white;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 25px 0;
        }
        .card {
          background: var(--bg-light);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
        }
        .card-title {
          font-size: 14px;
          font-weight: 800;
          color: #0f766e;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 6px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 8px;
        }
        .info-row span:first-child {
          color: #64748b;
          font-weight: 500;
        }
        .info-row span:last-child {
          font-weight: 700;
          color: #0f172a;
        }
        .table-itin {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 13px;
        }
        .table-itin th {
          background: #f1f5f9;
          color: #334155;
          text-align: left;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          font-weight: 700;
        }
        .table-itin td {
          padding: 12px 14px;
          border: 1px solid #cbd5e1;
          vertical-align: top;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
          border-top: 1px solid var(--border);
          padding-top: 20px;
        }
        @media print {
          body { padding: 0; }
          .container { border: none; box-shadow: none; padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-box">
            <h1>🌿 Costa Rica Tours</h1>
            <p>Plataforma Oficial de Ecoturismo & Experiencias Sostenibles CST</p>
          </div>
          <div class="badge-box">
            <span class="badge">RESERVA OFICIAL CONFIRMADA</span>
            <div style="font-size: 12px; color: #64748b; margin-top: 5px;">ID: #${booking.bookingId}</div>
          </div>
        </div>

        <div class="action-bar no-print">
          <div>
            <strong style="color: #065f46; font-size: 14px;">📄 Expediente Digital Listo para Descarga</strong>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #047857;">Guarde su vale e itinerario oficial en su dispositivo móvil para acceso offline.</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <a href="/api/bookings/${booking.bookingId}/download-pdf" class="btn btn-primary">
              📥 Descargar Archivo PDF
            </a>
            <button onclick="window.print()" class="btn btn-outline">
              🖨️ Imprimir
            </button>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-title">👤 Datos del Titular y Pasajeros</div>
            <div class="info-row"><span>Titular:</span><span>${booking.customerName || 'Cliente de ejemplo'}</span></div>
            <div class="info-row"><span>Correo Electrónico:</span><span>${booking.customerEmail || 'cliente@example.com'}</span></div>
            <div class="info-row"><span>WhatsApp / Teléfono:</span><span>${booking.customerPhone || '+506 0000-0000'}</span></div>
            <div class="info-row"><span>Pasajeros:</span><span>${booking.adults || 0} Adultos + ${booking.children || 0} Niños</span></div>
            <div class="info-row"><span>Concepto:</span><span>Family Budget, Relaxing & Safe</span></div>
          </div>
          <div class="card">
            <div class="card-title">🌴 Detalles del Paquete y Logística</div>
            <div class="info-row"><span>Paquete:</span><span>${booking.tourName}</span></div>
            <div class="info-row"><span>Duración:</span><span>15 Días / 14 Noches</span></div>
            <div class="info-row"><span>Fecha Inicio:</span><span>${booking.date} (${booking.time || '09:00 AM'})</span></div>
            <div class="info-row"><span>Vuelos Domésticos:</span><span>Sansa Airlines Incluidos</span></div>
            <div class="info-row"><span>Inversión Total:</span><span style="color: #047857; font-size: 15px;">$${booking.totalUSD || 2450} USD (Confirmado)</span></div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 25px; background: #ecfdf5; border-color: #a7f3d0;">
          <div class="card-title" style="color: #065f46; border-color: #a7f3d0;">👶 Logística y Seguridad Especial para Niños y Bebés</div>
          <ul style="margin: 0; padding-left: 20px; font-size: 12.5px; color: #047857; line-height: 1.6;">
            <li><strong>Silla de Auto Homologada:</strong> Minivan privada dotada con asiento de retención infantil ISOFIX para la bebé de 3 años.</li>
            <li><strong>Ritmo Pausado (Relaxing & Safe):</strong> Tiempos de descanso amplios, sin actividades extremas y con senderos planos y seguros.</li>
            <li><strong>Hoteles Familiares Seleccionados:</strong> Piscinas con áreas de chapoteo infantiles, cunas y menús adaptados para niños pequeños.</li>
            <li><strong>Asistencia Pediátrica 24/7:</strong> Seguro de cobertura médica con teleasistencia pediátrica durante todo el viaje.</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-title">🗺️ Itinerario Completo (15 Días: Costa Rica de Costa a Costa)</div>
          <table class="table-itin">
            <thead>
              <tr>
                <th style="width: 18%;">Días</th>
                <th style="width: 25%;">Destino & Enfoque</th>
                <th>Servicios y Actividades Ofrecidas</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Días 1 - 2</strong></td>
                <td><strong>San José / Arenal</strong><br><span style="color: #64748b; font-size: 11px;">Valle Central a Norte</span></td>
                <td>Recepción VIP en Aeropuerto SJO. Traslado seguro hacia La Fortuna de San Carlos. Check-in en eco-resort con aguas termales naturales seguras para niños. Tiempo de descanso familiar.</td>
              </tr>
              <tr>
                <td><strong>Días 3 - 4</strong></td>
                <td><strong>La Fortuna / Arenal</strong><br><span style="color: #64748b; font-size: 11px;">Volcanes y Selva</span></td>
                <td>Caminata suave en senderos pavimentados del Parque Nacional Arenal (100% apto para cochecito). Taller interactivo de chocolate y visita al mariposario con colibríes.</td>
              </tr>
              <tr>
                <td><strong>Días 5 - 7</strong></td>
                <td><strong>Monteverde</strong><br><span style="color: #64748b; font-size: 11px;">Bosque Nuboso</span></td>
                <td>Paseo tranquilo en lancha por el Lago Arenal y ascenso a Monteverde. Puentes colgantes seguros con doble barandilla alta. Visita al santuario de perezosos y jardín de orquídeas.</td>
              </tr>
              <tr>
                <td><strong>Días 8 - 10</strong></td>
                <td><strong>Guanacaste (Golfo de Papagayo)</strong><br><span style="color: #64748b; font-size: 11px;">Playas Mansas del Pacífico</span></td>
                <td><strong>Vuelo doméstico Sansa (40 min)</strong> para evitar trayectos largos. Playas de arena dorada y oleaje suave tipo piscina, ideales para la bebé. Atardecer en catamarán familiar con delfines.</td>
              </tr>
              <tr>
                <td><strong>Días 11 - 12</strong></td>
                <td><strong>Manuel Antonio & Quepos</strong><br><span style="color: #64748b; font-size: 11px;">Fauna & Océano Pacífico Sur</span></td>
                <td>Traslado costero privado. Recorrido por las pasarelas accesibles del Parque Nacional Manuel Antonio. Baño seguro en Playa Manuel Antonio (sin corrientes) y avistamiento de fauna amigable.</td>
              </tr>
              <tr>
                <td><strong>Días 13 - 14</strong></td>
                <td><strong>Pérez Zeledón & Valle Central</strong><br><span style="color: #64748b; font-size: 11px;">Montaña y Cultura Rural</span></td>
                <td>Turismo rural comunitario en Pérez Zeledón. Degustación gastronómica tradicional en granjas familiares. Retorno cómodo al Valle Central y compras de artesanías locales.</td>
              </tr>
              <tr>
                <td><strong>Día 15</strong></td>
                <td><strong>Despedida de Costa Rica</strong><br><span style="color: #64748b; font-size: 11px;">Aeropuerto SJO</span></td>
                <td>Desayuno familiar con frutas frescas costarricenses, check-out y traslado privado al Aeropuerto Internacional SJO con asistencia preferencial de equipaje y vuelo de retorno.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin-top: 25px; padding: 15px 20px; background: #f8fafc; border: 1px solid var(--border); border-radius: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: #0f172a; font-size: 13px;">📞 Asistencia y Mostrador 24/7</strong>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">WhatsApp de soporte oficial: +506 8795 9148 | Canal prioritario para el cliente: +506 0000-0000</p>
            </div>
            <a href="https://wa.me/50687959148" class="btn" style="background: #25D366; color: #000; font-weight: 800; font-size: 12px;">
              💬 Chat WhatsApp
            </a>
          </div>
        </div>

        <div class="footer">
          <p>Costa Rica Tours © 2026 • Operadores Oficiales Certificados CST • Documento de Viaje con Validez Legal</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
