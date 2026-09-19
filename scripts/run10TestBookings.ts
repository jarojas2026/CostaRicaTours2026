import { createBooking } from '../backend/bookingService';
import { sendEmail } from '../backend/notificationService';

const TEST_EMAIL = 'gabw33d@gmail.com';

const scenarios = [
  {
    id: 'sc-1',
    tourId: 'whale-watching-uvita',
    tourName: 'Avistamiento de Ballenas y Delfines en Marino Ballena',
    country: 'Estados Unidos (Nueva York)',
    flight: 'United Airlines UA 1520 (JFK -> SJO)',
    transport: 'Traslado privado Aeropuerto SJO a Uvita + Lancha rápida certificada',
    date: '2026-10-10',
    time: '08:30 AM',
    adults: 2,
    children: 1,
    totalUSD: 310,
    customerName: 'Michael Smith',
    customerEmail: TEST_EMAIL,
    customerPhone: '+1 212 555 0198'
  },
  {
    id: 'sc-2',
    tourId: 'arenal-volcano-hotsprings',
    tourName: 'Volcán Arenal & Aguas Termales Naturales',
    country: 'Canadá (Vancouver)',
    flight: 'Air Canada AC 1810 (YVR -> LIR Liberia)',
    transport: 'Alquiler 4x4 SUV + Guía naturalista especializado',
    date: '2026-10-14',
    time: '01:00 PM',
    adults: 2,
    children: 0,
    totalUSD: 290,
    customerName: 'Emily Watson',
    customerEmail: TEST_EMAIL,
    customerPhone: '+1 604 555 4321'
  },
  {
    id: 'sc-3',
    tourId: 'pacuare-rafting-adventure',
    tourName: 'Rafting en el Río Pacuare (Clase III-IV)',
    country: 'Alemania (Fráncfort)',
    flight: 'Lufthansa LH 518 (FRA -> SJO)',
    transport: 'Shuttle turístico compartido San José - Base Pacuare - Siquirres',
    date: '2026-10-18',
    time: '06:00 AM',
    adults: 2,
    children: 0,
    totalUSD: 278,
    customerName: 'Lukas Weber',
    customerEmail: TEST_EMAIL,
    customerPhone: '+49 69 555 0144'
  },
  {
    id: 'sc-4',
    tourId: 'monteverde-cloudforest-canopy',
    tourName: 'Aventura de Canopy & Puentes Colgantes en Monteverde',
    country: 'Francia (París)',
    flight: 'Air France AF 430 (CDG -> SJO)',
    transport: 'Autobús turístico con aire acondicionado San José - Santa Elena',
    date: '2026-10-22',
    time: '09:00 AM',
    adults: 1,
    children: 1,
    totalUSD: 195,
    customerName: 'Camille Laurent',
    customerEmail: TEST_EMAIL,
    customerPhone: '+33 1 55 55 0188'
  },
  {
    id: 'sc-5',
    tourId: 'manuel-antonio-catamaran',
    tourName: 'Parque Nacional Manuel Antonio & Catamarán al Atardecer',
    country: 'Reino Unido (Londres)',
    flight: 'British Airways BA 223 (LHR -> SJO)',
    transport: 'Traslado ejecutivo puerta a puerta SJO - Quepos',
    date: '2026-10-26',
    time: '07:30 AM',
    adults: 2,
    children: 2,
    totalUSD: 460,
    customerName: 'Oliver Twist',
    customerEmail: TEST_EMAIL,
    customerPhone: '+44 20 7946 0921'
  },
  {
    id: 'sc-6',
    tourId: 'tortuguero-3days-package',
    tourName: 'Expedición 3 Días a Canales y Desove en Tortuguero',
    country: 'España (Madrid)',
    flight: 'Iberia IB 6317 (MAD -> SJO)',
    transport: 'Paquete todo incluido (Bus turistico + Bote fluvial a Tortuguero)',
    date: '2026-11-02',
    time: '05:30 AM',
    adults: 2,
    children: 0,
    totalUSD: 720,
    customerName: 'Carmen García',
    customerEmail: TEST_EMAIL,
    customerPhone: '+34 91 555 0173'
  },
  {
    id: 'sc-7',
    tourId: 'corcovado-national-park',
    tourName: 'Expedición Estación San Pedrillo - Parque Nacional Corcovado',
    country: 'Suiza (Zúrich)',
    flight: 'Edelweiss WK 34 (ZRH -> SJO) + Vuelo interno Sansa Airlines (SJO -> Drake Bay)',
    transport: 'Vuelo doméstico + Lancha rápida oceánica a Drake Bay',
    date: '2026-11-06',
    time: '06:00 AM',
    adults: 2,
    children: 0,
    totalUSD: 540,
    customerName: 'Hans Keller',
    customerEmail: TEST_EMAIL,
    customerPhone: '+41 44 555 0199'
  },
  {
    id: 'sc-8',
    tourId: 'catalinas-catamaran-snorkel',
    tourName: 'Catamarán de Lujo y Snorkel en Las Catalinas, Guanacaste',
    country: 'Estados Unidos (Miami)',
    flight: 'American Airlines AA 2705 (MIA -> LIR Liberia)',
    transport: 'Traslado privado Liberia Airport - Las Catalinas (Playa Danta)',
    date: '2026-11-10',
    time: '01:30 PM',
    adults: 4,
    children: 0,
    totalUSD: 680,
    customerName: 'Jessica Rodriguez',
    customerEmail: TEST_EMAIL,
    customerPhone: '+1 305 555 0122'
  },
  {
    id: 'sc-9',
    tourId: 'turrialba-coffee-chocolate',
    tourName: 'Ruta del Café, Cacao y Tradición Artesanal en Turrialba',
    country: 'Italia (Milán)',
    flight: 'ITA Airways (MXP -> SJO)',
    transport: 'Alquiler de vehículo SUV compacto + Guía local especializado',
    date: '2026-11-14',
    time: '09:30 AM',
    adults: 2,
    children: 1,
    totalUSD: 220,
    customerName: 'Marco Rossi',
    customerEmail: TEST_EMAIL,
    customerPhone: '+39 02 555 0155'
  },
  {
    id: 'sc-10',
    tourId: 'costa-rica-essential-10days',
    tourName: 'Paquete Integral "Costa Rica Esencial: Volcanes, Selva y Playas"',
    country: 'Japón (Tokio)',
    flight: 'United Airlines (NRT -> IAH -> SJO)',
    transport: 'Transporte privado interurbano completo (SJO - Arenal - Monteverde - Manuel Antonio - SJO)',
    date: '2026-11-20',
    time: '08:00 AM',
    adults: 2,
    children: 0,
    totalUSD: 2450,
    customerName: 'Kenji Sato',
    customerEmail: TEST_EMAIL,
    customerPhone: '+81 3 5555 0143'
  }
];

async function runTest() {
  console.log(`🚀 [TEST 10 RESERVAS REALES] Iniciando despacho de 10 situaciones hacia ${TEST_EMAIL}...`);
  let successCount = 0;

  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    console.log(`\n--------------------------------------------------`);
    console.log(`📌 Procesando Situación #${i + 1}: ${sc.tourName}`);
    console.log(`🌍 País de Origen: ${sc.country} | Vuelo: ${sc.flight}`);
    console.log(`🚗 Transporte: ${sc.transport}`);

    const bookingPayload = {
      bookingId: `CR-TEST-2026-${i + 1}-${Math.floor(1000 + Math.random() * 9000)}`,
      tourId: sc.tourId,
      tourName: sc.tourName,
      date: sc.date,
      time: sc.time,
      adults: sc.adults,
      children: sc.children,
      pickupHotel: `Vuelo ${sc.flight} / Alojamiento Turístico Asignado`,
      specialRequests: `Origen: ${sc.country}. Transporte: ${sc.transport}. Solicitud de prueba automatizada #2026.`,
      totalUSD: sc.totalUSD,
      currency: 'USD',
      paymentMethod: 'credit_card',
      customerName: sc.customerName,
      customerEmail: sc.customerEmail,
      customerPhone: sc.customerPhone,
      flightDetails: {
        flightNumber: sc.flight,
        originCountry: sc.country,
        transportMode: sc.transport
      }
    };

    try {
      const result = await createBooking(bookingPayload);
      if (!result.conflict && result.booking) {
        successCount++;
        console.log(`✅ [ÉXITO] Reserva ${result.booking.bookingId} creada exitosamente.`);

        // Enviar correo transaccional directo a gabw33d@gmail.com
        const emailRes = await sendEmail({
          to: TEST_EMAIL,
          subject: `[CONFIRMACIÓN DE RESERVA REAL #2026] ${sc.tourName} (${sc.country})`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #10b981; border-radius: 12px; background-color: #f8fafc;">
              <h2 style="color: #047857; margin-top: 0;">🌿 Costa Rica Tours - Comprobante Oficial de Reserva</h2>
              <p>Estimado/a <strong>${sc.customerName}</strong> (${sc.country}),</p>
              <p>Su reserva ha sido registrada y procesada exitosamente en nuestra plataforma oficial de mostrador.</p>
              
              <div style="background: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 15px 0;">
                <p><strong>ID de Reserva:</strong> #${result.booking.bookingId}</p>
                <p><strong>Experiencia:</strong> ${sc.tourName}</p>
                <p><strong>Fecha y Hora:</strong> ${sc.date} a las ${sc.time}</p>
                <p><strong>Pasajeros:</strong> ${sc.adults} Adultos${sc.children > 0 ? `, ${sc.children} Niños` : ''}</p>
                <p><strong>Vuelo / Origen:</strong> ${sc.flight}</p>
                <p><strong>Transporte Combinado:</strong> ${sc.transport}</p>
                <p><strong>Total Pagado:</strong> $${sc.totalUSD} USD</p>
              </div>

              <p>Operado con estándares de turismo sostenible y respaldo de operadores locales certificados en Costa Rica.</p>
              <p style="font-size: 12px; color: #64748b;">Atención 24/7 vía WhatsApp: +506 8795 9148 | Email: gabw33d@gmail.com</p>
            </div>
          `
        });

        if (emailRes.success) {
          console.log(`📧 [CORREO ENVIADO] Notificación de reserva #${result.booking.bookingId} despachada a ${TEST_EMAIL}`);
        } else {
          console.log(`⚠️ [CORREO AVISO] Fallo menor en envío de email: ${emailRes.error}`);
        }
      } else {
        console.log(`⚠️ [CONFLICTO DE CUPO] No se pudo crear: ${result.message}`);
      }
    } catch (err: any) {
      console.error(`❌ [ERROR] Falló situación #${i + 1}:`, err.message);
    }
  }

  console.log(`\n==================================================`);
  console.log(`🎯 Test finalizado. Se procesaron ${successCount} de ${scenarios.length} situaciones correctamente.`);
  console.log(`📬 Todos los comprobantes y confirmaciones fueron dirigidos a: ${TEST_EMAIL}`);
}

runTest().catch(console.error);
