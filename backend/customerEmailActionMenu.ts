/**
 * Customer-facing next-step menu for a plain-text email thread.
 * No booking IDs, prices, provider names or personal information are interpolated.
 * Replying creates an inquiry for verification, never a booking mutation.
 */
export function customerEmailActionMenu(language: unknown): string {
  const en = typeof language === 'string' && /^en(?:[-_]|$)/i.test(language);
  return en
    ? [
      'You can continue directly in this email thread. Reply with the number and your request:',
      '1. Change the date or time',
      '2. Change the number of travelers',
      '3. Add a tour, transfer, or lodging',
      '4. Request cancellation or review a refund',
      '5. Ask a question or request an alternative',
      'We will review any change against real availability, terms, and price. This email does not confirm a booking, cancellation, payment, or refund.'
    ].join('\n')
    : [
      'Puedes continuar directamente en este mismo correo. Responde con el número y lo que necesitas:',
      '1. Cambiar fecha u hora',
      '2. Cambiar cantidad de viajeros',
      '3. Agregar tour, traslado u hospedaje',
      '4. Solicitar cancelación o revisar un reembolso',
      '5. Hacer una consulta o pedir otra alternativa',
      'Verificaremos cualquier cambio según disponibilidad real, condiciones y precio. Este correo no confirma reserva, cancelación, pago ni reembolso.'
    ].join('\n');
}

export function customerReviewAcknowledgement(language: unknown): string {
  const en = typeof language === 'string' && /^en(?:[-_]|$)/i.test(language);
  const intro = en
    ? 'We received your reply and recorded it for review. No requested booking change or cancellation has been applied. We will confirm the next steps after verification.'
    : 'Recibimos tu respuesta y quedó registrada para revisión. No se ha aplicado ningún cambio ni cancelación de reserva. Confirmaremos los siguientes pasos después de verificar.';
  return intro + '\n\n' + customerEmailActionMenu(language);
}
