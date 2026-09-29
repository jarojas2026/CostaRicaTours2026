// Retain the key after a timeout or payment failure; changing the request starts
// a new attempt. No customer data is written to browser storage.
export function createBookingAttempt() {
  let fingerprint = '';
  let key = '';
  return (payload: unknown) => {
    const next = JSON.stringify(payload);
    if (next !== fingerprint) {
      fingerprint = next;
      key = crypto.randomUUID();
    }
    return key;
  };
}

export function requirePaymentUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Payment link unavailable / Enlace de pago no disponible');
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['checkout.stripe.com', 'www.paypal.com', 'www.sandbox.paypal.com'].includes(url.hostname)) {
    throw new Error('Invalid payment link / Enlace de pago no válido');
  }
  return url.href;
}
