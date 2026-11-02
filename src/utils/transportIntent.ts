/** Shared intent guard for transfer quotations. It deliberately separates transport from tour catalogue recommendations. */
export function isTransportInquiry(input: string): boolean {
  const normalized = String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return /\b(transfers?|airport transfer|shuttles?|traslados?|transporte|transportation|transport service|servicio de transporte|taxi|private driver|chofer|conductor|airport pickup|pickup service|drop[- ]?off)\b/.test(normalized);
}

export function transportQuoteReply(language: 'es' | 'en'): string {
  return language === 'es'
    ? 'Con gusto te cotizamos el traslado. Para preparar la cotización, indicanos: origen, destino, fecha del traslado y cantidad de personas. La tarifa y la disponibilidad deben verificarse para esa ruta y fecha; todavía no hay un precio ni una reserva confirmados.'
    : 'We can prepare a transfer quote for you. Please provide: pickup location, destination, transfer date, and number of travelers. The rate and availability must be checked for that route and date; no price or booking is confirmed yet.';
}
