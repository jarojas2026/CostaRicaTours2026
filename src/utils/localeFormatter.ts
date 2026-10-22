import { formatPrice, formatUSD } from './money';
import { getRatesSnapshot } from './exchangeRates';
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

export function formatCurrencyAmount(amountUSD: number, currency: Currency = 'USD', language: Language = 'es'): string {
  if (isNaN(amountUSD)) return formatUSD(0);
  return formatPrice(amountUSD, currency, language, getRatesSnapshot());
}
