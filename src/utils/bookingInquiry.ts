export function bookingInquiry(input: { language: string; tour: string; date: string; adults: number; children: number; pickup: string }) {
  return input.language === 'es'
    ? `SOLICITUD DE RESERVA — PENDIENTE DE VERIFICACIÓN\nTour: ${input.tour}\nFecha: ${input.date || 'Por definir'}\nAdultos: ${input.adults}\nNiños: ${input.children}\nRecogida: ${input.pickup || 'Por definir'}\nSolicito disponibilidad y condiciones. Si el servidor falló, comprobar si ya existe una solicitud antes de crear otra. Este mensaje no confirma reserva ni pago.`
    : `BOOKING INQUIRY — PENDING VERIFICATION\nTour: ${input.tour}\nDate: ${input.date || 'To be arranged'}\nAdults: ${input.adults}\nChildren: ${input.children}\nPickup: ${input.pickup || 'To be arranged'}\nPlease check availability and terms. If the server failed, check for an existing request before creating another. This message does not confirm a booking or payment.`;
}
