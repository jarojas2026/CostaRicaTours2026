/**
 * Bloqueo de clave Stripe en vivo (P1): fuerza modo TEST hasta lanzamiento.
 * Regla: si STRIPE_SECRET_KEY empieza con sk_live_ y ALLOW_STRIPE_LIVE !== 'true',
 * se lanza error explícito (nunca se cobra en vivo sin consentimiento explícito).
 * Aditivo: no modifica bookingService/payments; se importa y llama desde ellos.
 */
export type StripeModeCheck = { mode: 'test' | 'live' | 'none'; blocked: boolean; reason?: string };

export function checkStripeMode(key?: string): StripeModeCheck {
  const k = (key || process.env.STRIPE_SECRET_KEY || '').trim();
  if (!k) return { mode: 'none', blocked: false };
  if (k.startsWith('sk_live_')) {
    const allow = process.env.ALLOW_STRIPE_LIVE === 'true';
    if (allow) return { mode: 'live', blocked: false };
    return { mode: 'live', blocked: true, reason: 'Clave Stripe en vivo detectada. Set ALLOW_STRIPE_LIVE=true solo en lanzamiento.' };
  }
  return { mode: 'test', blocked: false };
}

export function assertStripeTestMode(key?: string): void {
  const c = checkStripeMode(key);
  if (c.blocked) throw new Error(`STRIPE_LIVE_BLOCKED: ${c.reason}`);
}
