import type { Language } from '../types';

/**
 * Locale registry. Adding a language (PT/FR/DE…) is a data change:
 *   1. add its code to `Language` in src/types.ts (if missing),
 *   2. add an entry here with `enabled: false`,
 *   3. create src/i18n/messages/<code>.ts typed as `Messages` and register it
 *      in src/i18n/index.ts,
 *   4. flip `enabled: true` once the UI is fully translated (QA in mobile).
 * Disabled locales never reach the selector or auto-detection; their browsers
 * get English, the international default.
 */
export interface LocaleConfig {
  code: Language;
  /** BCP 47 tag for <html lang>, Intl formatting and speech recognition. */
  bcp47: string;
  /** Open Graph locale (og:locale). */
  ogLocale: string;
  /** English name (selector tooltip / docs). */
  name: string;
  nativeName: string;
  flag: string;
  enabled: boolean;
}

export const LOCALES: Record<Language, LocaleConfig> = {
  es: { code: 'es', bcp47: 'es-CR', ogLocale: 'es_CR', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', enabled: true },
  en: { code: 'en', bcp47: 'en-US', ogLocale: 'en_US', name: 'English', nativeName: 'English', flag: '🇺🇸', enabled: true },
  de: { code: 'de', bcp47: 'de-DE', ogLocale: 'de_DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', enabled: false },
  fr: { code: 'fr', bcp47: 'fr-FR', ogLocale: 'fr_FR', name: 'French', nativeName: 'Français', flag: '🇫🇷', enabled: false },
  zh: { code: 'zh', bcp47: 'zh-CN', ogLocale: 'zh_CN', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', enabled: false },
  ja: { code: 'ja', bcp47: 'ja-JP', ogLocale: 'ja_JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', enabled: false },
};

/** Fallback for any browser language we do not serve yet. */
export const DEFAULT_LANGUAGE: Language = 'en';

export const ENABLED_LANGUAGES: Language[] = (Object.keys(LOCALES) as Language[]).filter(code => LOCALES[code].enabled);

export function isEnabledLanguage(value: unknown): value is Language {
  return typeof value === 'string' && value in LOCALES && LOCALES[value as Language].enabled;
}

/** "es-419" → "es" when that language is enabled, otherwise null. */
export function enabledLanguageFromTag(tag: string | null | undefined): Language | null {
  if (!tag) return null;
  const base = tag.trim().toLowerCase().split(/[-_]/)[0];
  return isEnabledLanguage(base) ? base : null;
}

export function localeTag(language: Language): string {
  return (LOCALES[language] ?? LOCALES[DEFAULT_LANGUAGE]).bcp47;
}

/** Short code for <html lang> / hreflang ("es", "en"). */
export function htmlLang(language: Language): string {
  return isEnabledLanguage(language) ? language : DEFAULT_LANGUAGE;
}
