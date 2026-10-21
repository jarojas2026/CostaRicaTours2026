import { sendEmail } from './notificationService';

/**
 * Resultado veraz de un envío de correo (#325).
 * Nunca se considera "enviado" si el transporte devolvió success:false o lanzó error.
 * No incluye destinatario ni contenido (Ley 8968: sin PII en registros).
 */
export type EmailDeliveryOutcome = {
  success: boolean;
  id?: string;
  error?: string;
  attempts: number;
};

/** Máximo de intentos por envío (inmediatos) y por proceso programado entre ejecuciones. */
export const MAX_EMAIL_DELIVERY_ATTEMPTS = 2;

type EmailPayload = Parameters<typeof sendEmail>[0];

function safeError(error: unknown): string {
  const raw = typeof error === 'string' ? error : (error as any)?.message || 'email_send_failed';
  // Sin direcciones de correo ni teléfonos en el registro de fallo.
  return String(raw)
    .replace(/[^\s@<>]+@[^\s@<>]+/g, '[email]')
    .replace(/\+?\d[\d\s-]{6,}\d/g, '[phone]')
    .slice(0, 200);
}

export async function sendEmailWithOutcome(
  payload: EmailPayload,
  maxAttempts: number = MAX_EMAIL_DELIVERY_ATTEMPTS,
  sender: (p: EmailPayload) => Promise<{ success: boolean; id?: string; error?: string }> = sendEmail
): Promise<EmailDeliveryOutcome> {
  const limit = Math.max(1, Math.min(maxAttempts, MAX_EMAIL_DELIVERY_ATTEMPTS));
  let lastError = 'email_send_failed';
  for (let attempt = 1; attempt <= limit; attempt++) {
    try {
      const result = await sender(payload);
      if (result && result.success === true) {
        return { success: true, id: result.id, attempts: attempt };
      }
      lastError = safeError(result?.error || 'email_send_failed');
      // Sin transporte configurado reintentar no cambia el resultado.
      if (lastError === 'email_transport_unconfigured') return { success: false, error: lastError, attempts: attempt };
    } catch (error) {
      lastError = safeError(error);
    }
  }
  return { success: false, error: lastError, attempts: limit };
}

/**
 * Campos a persistir cuando un proceso programado no pudo enviar el correo.
 * El flag `<prefix>Sent` NO se toca: queda pendiente. Tras MAX intentos acumulados
 * el proceso deja de reintentar y el estado queda `failed` para revisión humana.
 */
export function emailFailurePatch(prefix: string, previousAttempts: unknown, outcome: EmailDeliveryOutcome) {
  const attempts = (Number(previousAttempts) || 0) + 1;
  return {
    [`${prefix}DeliveryStatus`]: attempts >= MAX_EMAIL_DELIVERY_ATTEMPTS ? 'failed' : 'pending',
    [`${prefix}DeliveryAttempts`]: attempts,
    [`${prefix}DeliveryError`]: outcome.error || 'email_send_failed',
    [`${prefix}DeliveryFailedAt`]: new Date().toISOString(),
  };
}

/** ¿Se agotaron los reintentos entre ejecuciones de un proceso programado? */
export function emailRetriesExhausted(previousAttempts: unknown): boolean {
  return (Number(previousAttempts) || 0) >= MAX_EMAIL_DELIVERY_ATTEMPTS;
}
