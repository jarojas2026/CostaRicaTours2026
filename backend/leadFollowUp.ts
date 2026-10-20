/**
 * Seguimiento automático para completar datos de un lead (fecha y/o pax).
 *
 * Plantillas fijas ES/EN en backend (sin llamadas a modelos: el texto es
 * predecible y aprobado por el dueño). Se elige el idioma del lead.
 *
 * Envío DETRÁS de LEAD_AUTOFOLLOWUP_ENABLED (por defecto false). Sin la flag
 * solo se guarda el borrador en el lead (`followUp`) y se muestra en
 * /admin/leads para copiarlo y enviarlo a mano.
 *
 * Nunca incluye nombres ni datos de operadores, ni precios.
 */

export type FollowUpMissing = 'fecha' | 'pax';
export type FollowUpStatus = 'borrador_no_enviado' | 'enviado' | 'envio_fallido';

export interface LeadFollowUp {
  status: FollowUpStatus;
  language: 'es' | 'en';
  missing: FollowUpMissing[];
  to?: string;
  subject: string;
  body: string;
  createdAt: string;
  sentAt?: string;
  error?: string;
}

export function isAutoFollowUpEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.LEAD_AUTOFOLLOWUP_ENABLED === 'true';
}

export interface FollowUpLeadView {
  id: string;
  language: 'es' | 'en';
  contact: { name?: string; email?: string } | null;
  request: { tourTitle?: string; activityLabel?: string; regionLabel?: string; date?: string; month?: number; people?: number };
}

export function missingLeadData(request: FollowUpLeadView['request']): FollowUpMissing[] {
  const missing: FollowUpMissing[] = [];
  if (!request.date && !request.month) missing.push('fecha');
  if (!request.people || request.people < 1) missing.push('pax');
  return missing;
}

/** Texto de las plantillas (exportado para revisión y pruebas). */
export const FOLLOW_UP_TEMPLATES = {
  es: {
    subject: (tour: string) => `Para cotizar ${tour} nos falta un dato`,
    greeting: (name: string) => `Hola ${name}:`,
    intro: (tour: string) => `Gracias por tu solicitud para "${tour}". Para confirmarte disponibilidad y precio con el operador local necesitamos completar esto:`,
    fecha: '• ¿Qué fecha te interesa? Si aún no es fija, un rango aproximado nos sirve.',
    pax: '• ¿Cuántas personas viajan? Indícanos adultos y niños (con la edad de los niños).',
    close: 'Responde a este correo con esos datos y te enviamos la cotización. No se ha hecho ningún cargo: no hay pago hasta que apruebes la cotización.',
    reference: (ref: string) => `Referencia: ${ref}`,
    signature: 'Costa Rica Tours',
    fallbackName: 'viajero',
    fallbackTour: 'tu experiencia en Costa Rica',
  },
  en: {
    subject: (tour: string) => `One more detail to quote ${tour}`,
    greeting: (name: string) => `Hi ${name},`,
    intro: (tour: string) => `Thanks for your request for "${tour}". To confirm availability and price with our local operator, we need a bit more information:`,
    fecha: '• What date are you interested in? If it is not fixed yet, an approximate range works.',
    pax: '• How many people are traveling? Please tell us adults and children (with the children\'s ages).',
    close: 'Just reply to this email with those details and we will send you the quote. You have not been charged: there is no payment until you approve the quote.',
    reference: (ref: string) => `Reference: ${ref}`,
    signature: 'Costa Rica Tours',
    fallbackName: 'traveler',
    fallbackTour: 'your Costa Rica experience',
  },
} as const;

/** Borrador de seguimiento o null si no falta nada / no hay correo. */
export function buildFollowUpDraft(lead: FollowUpLeadView, now: Date = new Date()): LeadFollowUp | null {
  const missing = missingLeadData(lead.request || {});
  const to = lead.contact?.email;
  if (!missing.length || !to) return null;
  const language = lead.language === 'en' ? 'en' : 'es';
  const t = FOLLOW_UP_TEMPLATES[language];
  const name = lead.contact?.name?.trim().split(/\s+/)[0] || t.fallbackName;
  const tour = lead.request.tourTitle || lead.request.activityLabel || lead.request.regionLabel || t.fallbackTour;
  const ref = lead.id.slice(-8).toUpperCase();
  const lines = [
    t.greeting(name),
    '',
    t.intro(tour),
    ...missing.map(m => t[m]),
    '',
    t.close,
    '',
    t.reference(ref),
    '',
    t.signature,
  ];
  return {
    status: 'borrador_no_enviado',
    language,
    missing,
    to,
    subject: t.subject(tour),
    body: lines.join('\n'),
    createdAt: now.toISOString(),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
}

export function followUpEmail(draft: LeadFollowUp): { to: string; subject: string; text: string; html: string } | null {
  if (!draft.to) return null;
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#0f172a">${draft.body.split('\n').map(l => l ? `<p style="margin:0 0 8px">${escapeHtml(l)}</p>` : '').join('')}</div>`;
  return { to: draft.to, subject: draft.subject, text: draft.body, html };
}
