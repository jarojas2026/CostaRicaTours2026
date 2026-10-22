/** Customer-safe copy: never interpolate internal messages, provider data or mail text. */
export type ProviderNoticeAction = 'confirm' | 'reject' | 'delay' | 'no_show' | 'complete';

const COPY = {
  es: {
    subject: 'Actualización de tu solicitud • Costa Rica Tours',
    confirm: 'Recibimos una aceptación operativa para tu solicitud. Esto no confirma el pago ni la reserva final. Consulta el estado de tu reserva para conocer los pasos pendientes.',
    reject: 'La opción solicitada no pudo ser aceptada. Tu solicitud requiere revisar alternativas; todavía no hay una alternativa confirmada.',
    delay: 'Se registró un aviso de demora relacionado con tu servicio. Revisa las actualizaciones de tu reserva antes de modificar tus planes.',
    no_show: 'Recibimos un reporte de no presentación relacionado con tu servicio. El reporte requiere revisión; si no coincide con lo ocurrido, solicita asistencia desde tu reserva.',
    complete: 'Se registró un reporte de servicio completado. Si necesitas ayuda o el reporte no coincide con lo ocurrido, solicita asistencia desde tu reserva.',
    unknown: 'Recibimos una actualización relacionada con tu solicitud. Consulta el estado de tu reserva o solicita asistencia.'
  },
  en: {
    subject: 'Update on your request • Costa Rica Tours',
    confirm: 'We received an operational acceptance for your request. This does not confirm payment or the final booking. Check your booking status for any remaining steps.',
    reject: 'The requested option could not be accepted. Your request requires a review of alternatives; no alternative has been confirmed yet.',
    delay: 'A delay notice has been recorded for your service. Check your booking updates before changing your plans.',
    no_show: 'We received a no-show report related to your service. The report requires review; if it does not match what happened, request assistance through your booking.',
    complete: 'A service completion report has been recorded. If you need help or the report does not match what happened, request assistance through your booking.',
    unknown: 'We received an update related to your request. Check your booking status or request assistance.'
  }
} as const;

export function buildProviderCustomerNotice(action: unknown, language: unknown = 'es') {
  const copy = COPY[typeof language === 'string' && /^en(?:[-_]|$)/i.test(language) ? 'en' : 'es'];
  const key = typeof action === 'string' && ['confirm', 'reject', 'delay', 'no_show', 'complete'].includes(action)
    ? action as ProviderNoticeAction : 'unknown';
  const text = copy[key];
  return { subject: copy.subject, text, html: `<p>${text}</p>` };
}
