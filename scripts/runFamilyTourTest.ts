import { createBooking } from '../backend/bookingService';
import { sendEmail } from '../backend/notificationService';
import { executeCustomerProformaConfirmation } from '../backend/nativeWorkflows';

const TEST_EMAIL = 'test@example.com';
const TEST_ADMIN_EMAIL = 'test@example.com';

async function runCliente de pruebaTest() {
  console.log(`🚀 [TEST CLIENTE_PRUEBA MARÍN] Iniciando simulación de reserva de 15 días (Familia: 2 adultos + 1 bebé de 3 años)...`);

  const bookingPayload = {
    bookingId: `CR-FAM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    tourId: 'costa-rica-essential-15days-family',
    tourName: 'Costa Rica Familiar 15 Días: Relax, Volcanes y Playas Seguras (Especial Bebé 3 Años)',
    date: '2026-10-15',
    time: '09:00 AM',
    adults: 2,
    children: 1, // 1 bebé de 3 años
    pickupHotel: 'Aeropuerto SJO / Hoteles Ecológicos Familiares Seleccionados',
    specialRequests: 'Pasajeros: 2 adultos + 1 bebé (3 años). Estilo: Familiar, presupuesto moderado (family budget), relajado y seguro. Incluye vuelos internos cortos y traslados privados con silla para bebé certificada. WhatsApp de contacto: .',
    totalUSD: 2450,
    currency: 'USD',
    paymentMethod: 'credit_card',
    customerName: 'Cliente Prueba Familiar',
    customerEmail: TEST_EMAIL,
    customerPhone: '',
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

    // Despacho del flujo oficial de Proforma con PDF e Itinerario hacia Cliente de prueba por Correo y WhatsApp
    console.log(`\n📲 [DISPARO OFICIAL WHATSAPP Y PROFORMA] Ejecutando envío oficial a Cliente de ejemplo ()...`);
    const proformaResult = await executeCustomerProformaConfirmation({
      bookingId: bId,
      customerName: bookingPayload.customerName,
      customerEmail: TEST_EMAIL,
      customerPhone: bookingPayload.customerPhone,
      adults: bookingPayload.adults,
      children: bookingPayload.children,
      tourName: bookingPayload.tourName,
      startDate: bookingPayload.date,
      time: bookingPayload.time,
      totalUSD: bookingPayload.totalUSD,
      specialRequests: bookingPayload.specialRequests
    });

    console.log(`\n======================================================`);
    console.log(`✅ [RESULTADO PROFORMA Y WHATSAPP CLIENTE CLIENTE_PRUEBA]`);
    console.log(`   ID Reserva: #${proformaResult.bookingId}`);
    console.log(`   PDF Generado: ${proformaResult.pdfGenerated ? 'SÍ' : 'NO'}`);
    console.log(`   Email Enviado: ${proformaResult.emailSent ? 'SÍ' : 'NO'} (${TEST_EMAIL})`);
    console.log(`   WhatsApp Despachado: ${proformaResult.whatsappSent ? 'SÍ' : 'NO'} ()`);
    console.log(`   Link Descarga PDF: ${proformaResult.downloadPdfUrl}`);
    console.log(`   Link Aprobación Cliente: ${proformaResult.approvalUrl}`);
    console.log(`   Enlace Directo WhatsApp:`);
    console.log(`   👉 ${proformaResult.whatsappUrl}`);
    console.log(`======================================================\n`);

  } catch (err: any) {
    console.error(`❌ [ERROR] Falló simulación de prueba para Cliente de prueba:`, err);
  }
}

runCliente de pruebaTest().catch(console.error);
