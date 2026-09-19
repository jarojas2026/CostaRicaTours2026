import { createBooking } from '../backend/bookingService';
import { sendEmail } from '../backend/notificationService';

const VIVIANA_EMAIL = 'viviana19942011@gmail.com';
const TEST_ADMIN_EMAIL = 'gabw33d@gmail.com';

async function runVivianaTest() {
  console.log(`🚀 [TEST VIVIANA MARÍN] Iniciando simulación de reserva de 15 días (Familia: 2 adultos + 1 bebé de 3 años)...`);

  const bookingPayload = {
    bookingId: `CR-FAM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    tourId: 'costa-rica-essential-15days-family',
    tourName: 'Costa Rica Familiar 15 Días: Relax, Volcanes y Playas Seguras (Especial Bebé 3 Años)',
    date: '2026-10-15',
    time: '09:00 AM',
    adults: 2,
    children: 1, // 1 bebé de 3 años
    pickupHotel: 'Aeropuerto SJO / Hoteles Ecológicos Familiares Seleccionados',
    specialRequests: 'Pasajeros: 2 adultos + 1 bebé (3 años). Estilo: Familiar, presupuesto moderado (family budget), relajado y seguro. Incluye vuelos internos cortos y traslados privados con silla para bebé certificada. WhatsApp de contacto: +506 84005018.',
    totalUSD: 2450,
    currency: 'USD',
    paymentMethod: 'credit_card',
    customerName: 'Hester Viviana Marín Elizondo',
    customerEmail: VIVIANA_EMAIL,
    customerPhone: '+506 84005018',
    flightDetails: {
      flightNumber: 'Iberia / Avianca Vuelo Internacional + Sansa Doméstico',
      originCountry: 'Costa Rica / Internacional',
      transportMode: 'Traslados privados seguros con asientos infantiles ISOFIX y vuelos internos rápidos'
    }
  };

  try {
    const result = await createBooking(bookingPayload);
    const bId = result.booking ? result.booking.bookingId : bookingPayload.bookingId;
    console.log(`✅ [ÉXITO] Reserva familiar ${bId} registrada correctamente en el sistema.`);

    // Enviar correos transaccionales a Viviana y copia de control a gabw33d@gmail.com
    const recipients = [VIVIANA_EMAIL, TEST_ADMIN_EMAIL];

    for (const recipient of recipients) {
      const emailRes = await sendEmail({
        to: recipient,
        subject: `[VALE OFICIAL E ITINERARIO 15 DÍAS] Reserva Familiar #${bId} - Hester Viviana Marín Elizondo`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #1e293b; max-width: 680px; margin: auto; border: 1px solid #10b981; border-radius: 16px; background-color: #f8fafc;">
            <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #047857; margin: 0; font-size: 22px;">🌿 Costa Rica Tours - Comprobante e Itinerario Oficial</h2>
              <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">Plataforma Certificada de Ecoturismo y Experiencias Sostenibles</p>
            </div>

            <p>Estimada/o <strong>Hester Viviana Marín Elizondo</strong>,</p>
            <p>Nos complace confirmar el registro oficial de su paquete vacacional familiar de <strong>15 días por todo Costa Rica</strong>, diseñado especialmente bajo el concepto <em>Family Budget, Relaxing & Safe</em> para 2 adultos y 1 bebé de 3 años.</p>
            
            <div style="background: #ffffff; padding: 18px; border-radius: 12px; border-left: 5px solid #10b981; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <h3 style="margin-top: 0; color: #0f766e; font-size: 16px;">📋 Resumen de la Reserva</h3>
              <p style="margin: 6px 0;"><strong>ID de Reserva:</strong> #${bId}</p>
              <p style="margin: 6px 0;"><strong>Experiencia:</strong> ${bookingPayload.tourName}</p>
              <p style="margin: 6px 0;"><strong>Fecha de Inicio:</strong> ${bookingPayload.date} a las ${bookingPayload.time}</p>
              <p style="margin: 6px 0;"><strong>Pasajeros:</strong> 2 Adultos + 1 Bebé (3 años)</p>
              <p style="margin: 6px 0;"><strong>Contacto WhatsApp:</strong> +506 84005018</p>
              <p style="margin: 6px 0;"><strong>Inversión Total:</strong> $2,450 USD (Todo Incluido / Presupuesto Familiar)</p>
            </div>

            <div style="background: #ecfdf5; padding: 18px; border-radius: 12px; border: 1px solid #a7f3d0; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #065f46; font-size: 16px;">📥 Descarga de Vales y Documentación PDF</h3>
              <p style="font-size: 14px; color: #047857; margin-bottom: 12px;">Para su comodidad y seguridad migratoria/hotelera, hemos generado su expediente digital en formato PDF descargable:</p>
              <a href="https://ais-dev-bkbwi5trklm5ra7pjehfgn-650141017629.us-east1.run.app/api/bookings/${bId}/pdf" target="_blank" style="display: inline-block; background-color: #059669; color: white; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);">
                📄 Descargar Vale Oficial e Itinerario PDF (15 Días)
              </a>
            </div>

            <div style="background: #ffffff; padding: 18px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">🗺️ Itinerario Resumido (15 Días Costa Rica Esencial Familia)</h3>
              <ul style="padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.6;">
                <li><strong>Días 1-4 (Arenal / La Fortuna):</strong> Aguas termales relajantes aptas para familias, caminata suave en Parque Nacional Volcán Arenal (senderos pavimentados accesibles con coche de bebé) y mariposario.</li>
                <li><strong>Días 5-8 (Monteverde):</strong> Bosque nuboso, puentes colgantes seguros de baja altura con barandas dobles, tour guiado de café y chocolate artesanal.</li>
                <li><strong>Días 9-12 (Manuel Antonio & Quepos):</strong> Playas de aguas cristalinas sin fuerte oleaje dentro del Parque Nacional, avistamiento garantizado de monos cariblancos y perezosos.</li>
                <li><strong>Días 13-15 (Valle del General / Pérez Zeledón & San José):</strong> Turismo rural comunitario, despedida gastronómica y traslado privado con aire acondicionado hacia el Aeropuerto SJO.</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #64748b;">¿Desea realizar alguna consulta adicional? Contáctenos vía WhatsApp oficial: <a href="https://wa.me/50687959148" style="color: #059669; font-weight: bold;">+506 8795 9148</a></p>
              <p style="font-size: 11px; color: #94a3b8;">Costa Rica Tours © 2026 | Operadores Locales Certificados CST • Todos los derechos reservados.</p>
            </div>
          </div>
        `
      });

      if (emailRes.success) {
        console.log(`📧 [CORREO ENVIADO] Expediente y enlace PDF despachado exitosamente a ${recipient}`);
      } else {
        console.log(`⚠️ [AVISO EMAIL] No se pudo enviar a ${recipient}: ${emailRes.error}`);
      }
    }

  } catch (err: any) {
    console.error(`❌ [ERROR] Falló simulación de prueba para Viviana:`, err);
  }
}

runVivianaTest().catch(console.error);
