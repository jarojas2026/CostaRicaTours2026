/**
 * Selección explícita del transporte de correo por entorno.
 *
 * EMAIL_PROVIDER:
 *   auto (por defecto) → conducta histórica: Resend si hay RESEND_API_KEY, si no
 *                        SendGrid, si no SMTP (SMTP_USER + SMTP_PASS).
 *   smtp               → solo SMTP/Gmail (aunque existan claves de API).
 *   resend             → solo Resend (requiere dominio propio verificado: SPF/DKIM).
 *   sendgrid           → solo SendGrid.
 *   none               → ningún envío (interruptor de emergencia); sendEmail devuelve
 *                        success:false y el llamador conserva el estado pendiente.
 *
 * Solo decide QUÉ transporte puede usarse; nunca envía ni habilita autoenvío
 * (SUPERVISOR_AUTOSEND_ENABLED y LEAD_AUTOFOLLOWUP_ENABLED siguen mandando).
 * Claves solo en servidor; nunca VITE_*.
 */
type Env = NodeJS.ProcessEnv | Record<string, string | undefined>;
export type EmailTransportName = 'resend' | 'sendgrid' | 'smtp';
export type EmailProviderPreference = 'auto' | EmailTransportName | 'none';

const str = (v: string | undefined) => String(v ?? '').trim();

export function emailProviderPreference(env: Env = process.env): EmailProviderPreference {
  const raw = str(env.EMAIL_PROVIDER).toLowerCase();
  return (['auto', 'smtp', 'resend', 'sendgrid', 'none'] as const).includes(raw as EmailProviderPreference)
    ? raw as EmailProviderPreference : 'auto';
}

function configured(name: EmailTransportName, env: Env) {
  if (name === 'resend') return Boolean(str(env.RESEND_API_KEY));
  if (name === 'sendgrid') return Boolean(str(env.SENDGRID_API_KEY));
  return Boolean(str(env.SMTP_USER) && str(env.SMTP_PASS));
}

/** Transporte que sendEmail debe usar, o null si no hay ninguno permitido y configurado. */
export function selectedEmailTransport(env: Env = process.env): EmailTransportName | null {
  const pref = emailProviderPreference(env);
  if (pref === 'none') return null;
  if (pref !== 'auto') return configured(pref, env) ? pref : null;
  return (['resend', 'sendgrid', 'smtp'] as const).find(n => configured(n, env)) ?? null;
}

/** ¿Puede sendEmail usar este transporte? */
export function emailTransportAllowed(name: EmailTransportName, env: Env = process.env) {
  return selectedEmailTransport(env) === name;
}

/** Estado sin secretos para /admin. */
export function emailProviderStatus(env: Env = process.env) {
  const from = str(env.EMAIL_FROM);
  const domain = (from.match(/@([^>\s]+)/)?.[1] || '').toLowerCase();
  return {
    preference: emailProviderPreference(env),
    selected: selectedEmailTransport(env),
    fromDomain: domain || null,
    freeMailboxSender: /^(gmail\.com|googlemail\.com|outlook\.com|hotmail\.com|yahoo\.com)$/.test(domain),
  };
}
