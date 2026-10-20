import type { Currency, Language } from '../types';
import { DEFAULT_LANGUAGE, enabledLanguageFromTag } from './locales';

/**
 * First-visit language/currency detection. An explicit choice made in the
 * selector is stored and always wins over detection on later visits.
 */
export const LANGUAGE_STORAGE_KEY = 'crt_language';
export const CURRENCY_STORAGE_KEY = 'crt_currency';

/** Euro area (incl. Bulgaria since 2026) and microstates that use the euro. */
const EUROZONE = new Set([
  'AT', 'BE', 'BG', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
  'AD', 'MC', 'SM', 'VA', 'ME', 'XK',
]);

const EUROZONE_TIMEZONES = new Set([
  'Europe/Vienna', 'Europe/Brussels', 'Europe/Sofia', 'Asia/Nicosia', 'Europe/Nicosia', 'Asia/Famagusta', 'Europe/Berlin', 'Europe/Busingen',
  'Europe/Tallinn', 'Europe/Madrid', 'Africa/Ceuta', 'Atlantic/Canary', 'Europe/Helsinki', 'Europe/Paris', 'Europe/Athens', 'Europe/Zagreb',
  'Europe/Dublin', 'Europe/Rome', 'Europe/Vilnius', 'Europe/Luxembourg', 'Europe/Riga', 'Europe/Malta', 'Europe/Amsterdam', 'Europe/Lisbon',
  'Atlantic/Madeira', 'Atlantic/Azores', 'Europe/Ljubljana', 'Europe/Bratislava', 'Europe/Andorra', 'Europe/Monaco', 'Europe/San_Marino',
  'Europe/Vatican', 'Europe/Podgorica',
]);

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function browserLanguages(): string[] {
  if (typeof navigator === 'undefined') return [];
  const list = navigator.languages && navigator.languages.length > 0 ? Array.from(navigator.languages) : [navigator.language || ''];
  return list.filter(Boolean);
}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/** First enabled language in the browser preference list; English otherwise. */
export function detectLanguage(languages: readonly string[] = browserLanguages()): Language {
  for (const tag of languages) {
    const lang = enabledLanguageFromTag(tag);
    if (lang) return lang;
  }
  return DEFAULT_LANGUAGE;
}

/** Explicit ISO-3166 region from a tag ("es-CR" → "CR", "es-419" → null). */
export function regionFromTag(tag: string): string | null {
  const parts = tag.split(/[-_]/).slice(1);
  const region = parts.find(part => /^[A-Za-z]{2}$/.test(part));
  return region ? region.toUpperCase() : null;
}

/**
 * Region used for the default currency. The Costa Rica time zone wins (a tico
 * with an es-ES/en-US browser still wants colones), then the first explicit
 * region in navigator.languages, then a euro-area time zone.
 */
export function detectRegion(languages: readonly string[] = browserLanguages(), timeZone: string = browserTimeZone()): string | null {
  if (timeZone === 'America/Costa_Rica') return 'CR';
  for (const tag of languages) {
    const region = regionFromTag(tag);
    if (region) return region;
  }
  if (EUROZONE_TIMEZONES.has(timeZone)) return 'EU';
  return null;
}

export function currencyForRegion(region: string | null): Currency {
  if (region === 'CR') return 'CRC';
  if (region === 'EU' || (region && EUROZONE.has(region))) return 'EUR';
  return 'USD';
}

export function detectCurrency(languages?: readonly string[], timeZone?: string): Currency {
  return currencyForRegion(detectRegion(languages, timeZone));
}

/** `?lang=en` on a shared link shows that language without overwriting the saved choice. */
export function languageFromQuery(search: string = typeof window !== 'undefined' ? window.location.search : ''): Language | null {
  try {
    return enabledLanguageFromTag(new URLSearchParams(search).get('lang'));
  } catch {
    return null;
  }
}

export function readStoredLanguage(): Language | null {
  return enabledLanguageFromTag(safeStorage()?.getItem(LANGUAGE_STORAGE_KEY));
}

export function readStoredCurrency(): Currency | null {
  const value = safeStorage()?.getItem(CURRENCY_STORAGE_KEY);
  return value && /^[A-Z]{3}$/.test(value) ? value : null;
}

export function rememberLanguage(language: Language): void {
  try { safeStorage()?.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* private mode */ }
}

export function rememberCurrency(currency: Currency): void {
  try { safeStorage()?.setItem(CURRENCY_STORAGE_KEY, currency); } catch { /* private mode */ }
}

export function getInitialLanguage(): Language {
  return languageFromQuery() ?? readStoredLanguage() ?? detectLanguage();
}

export function getInitialCurrency(): Currency {
  return readStoredCurrency() ?? detectCurrency();
}
