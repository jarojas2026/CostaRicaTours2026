/**
 * Política de pagos Costa Rica Tours para Costa Rica.
 *
 * Stripe no se utiliza en esta plataforma: no crear checkout ni aceptar
 * webhooks que puedan mutar reservas. Esta decisión de producto no constituye
 * una conclusión jurídica general sobre Stripe en Costa Rica.
 *
 * El tipo de resultado se conserva por compatibilidad con consumidores antiguos.
 */
export type StripeModeCheck = { mode: 'test' | 'live' | 'none'; blocked: boolean; reason?: string };

export const STRIPE_DISABLED_REASON = 'STRIPE_DISABLED_IN_COSTA_RICA_TOURS';

export function checkStripeMode(key?: string): StripeModeCheck {
  const k = (key || process.env.STRIPE_SECRET_KEY || '').trim();
  if (!k) return { mode: 'none', blocked: true, reason: STRIPE_DISABLED_REASON };
  const mode = k.startsWith('sk_live_') || k.startsWith('rk_live_') ? 'live' : 'test';
  return { mode, blocked: true, reason: STRIPE_DISABLED_REASON };
}

export function assertStripeTestMode(_key?: string): void {
  throw new Error(`${STRIPE_DISABLED_REASON}: Stripe está deshabilitado por política de la plataforma.`);
}
