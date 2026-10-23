export function directWhatsAppUrl(message: string): string {
  return `https://wa.me/50687959148?text=${encodeURIComponent(message)}`;
}

/** Prepares a draft only: no AI request, booking, payment or message is sent. */
export function whatsappInquiryUrl(message: string, language: string): string {
  const disclaimer = language === 'es'
    ? 'Esta consulta no confirma disponibilidad ni reserva y no realiza ningún cobro.'
    : 'This inquiry does not confirm availability or a booking and does not make any payment.';
  return directWhatsAppUrl(`${message.trim()}\n\n${disclaimer}`);
}
