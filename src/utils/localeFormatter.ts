import { Language, Currency } from '../types';

export function formatDate(dateString: string, language: Language = 'es'): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const locale = language === 'es' ? 'es-CR' : 'en-US';
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatCurrencyAmount(amountUSD: number, currency: Currency = 'USD'): string {
  if (isNaN(amountUSD)) return '$0';
  if (currency === 'CRC') {
    const crcAmount = Math.round(amountUSD * 520); // standard exchange rate reference
    return `₡${crcAmount.toLocaleString('es-CR')}`;
  }
  return `$${amountUSD.toLocaleString('en-US')}`;
}
