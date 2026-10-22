/**
 * Deterministic safety hints for inbound tourism email.
 * Classification confidence never grants authority to mutate a booking.
 * Keep this pure so risk cases are testable without Gmail, Firestore or AI keys.
 */
export function looksLikeTravelRequest(input: unknown): boolean {
  const text = String(input ?? '');
  return /reserv|availability|disponib|tour|excurs|traslado|transfer|cotiz|quote|price|precio|booking|viaje|travel|itinerario|hotel|lodging|alojamiento|pasajer|personas|travelers?|guests?|hu[eé]sped|servici|actividad|pregunt|consulta|somos\s+\d+/i.test(text);
}

/** Customer email is *not* identity verification for a cancellation or change. */
export function isSensitiveCustomerEmail(input: unknown): boolean {
  const text = String(input ?? '');
  const sensitive = /refund|reembolso|devoluci[oó]n|chargeback|fraud|estafa|demanda|lawyer|legal|emergency|emergencia|medical|m[eé]dic|password|contrase[nñ]a|credit card|tarjeta|cancel|anulaci[oó]n|anular|cambi(?:ar|o|amos|e|en)|modific|reprogram|pospon|reagendar|reschedul|postpone|change(?:s|d)?\s+(?:the|my|our|your|date|booking|reservation|passengers|guests)|add\s+(?:a|an|more|extra)|a[nñ]ad(?:ir|e|imos)|agregar|extra\s+(?:service|tour|activity|traslado)/i;
  const partyChange = /(?:ahora|finalmente|en\s+realidad|instead|actually|now)\s+(?:somos|seremos|vamos\s+a\s+ser|we\s+are|we(?:'ll|\s+will)\s+be|there\s+are)\s+\d+/i;
  return sensitive.test(text) || partyChange.test(text);
}


/**
 * Replies commonly quote our previous email, including an action menu.
 * Only the newest message may drive an intent; quoted prompts cannot be
 * interpreted as fresh cancellation or provider-confirmation commands.
 * The raw provider message remains in Gmail/Outlook and can be reviewed there.
 */
export function newestEmailReply(input: unknown): string {
  const lines = String(input ?? '').replace(/\r\n?/g, '\n').split('\n');
  const fresh: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^>/.test(trimmed) ||
      /^on .{5,200} wrote:\s*$/i.test(trimmed) ||
      /^el .{5,200} escribi[oó]:\s*$/i.test(trimmed) ||
      /^-{2,}\s*(original message|mensaje original)\s*-*/i.test(trimmed) ||
      /^from:\s+.+@.+$/i.test(trimmed) ||
      /^de:\s+.+@.+$/i.test(trimmed)) break;
    fresh.push(line);
  }
  return fresh.join('\n').trim().slice(0, 12000);
}
