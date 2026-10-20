import type { Language } from '../types';
import { UI_TRANSLATIONS } from '../utils/i18n';
import { DEFAULT_LANGUAGE } from './locales';
import { es, type MessageKey, type Messages } from './messages/es';
import { en } from './messages/en';

export * from './locales';
export * from './detect';
export type { MessageKey, Messages };

/**
 * Message catalogs per language. A new locale registers here with a full
 * `Messages` object (or `Partial<Messages>` while in progress: missing keys
 * fall back to English, never to a mix chosen at render time).
 */
const CATALOGS: Partial<Record<Language, Partial<Messages>>> = { es, en };

type Vars = Record<string, string | number>;

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/**
 * Single entry point for UI text. Looks up src/i18n/messages first and then the
 * legacy UI_TRANSLATIONS table, so components can migrate gradually.
 */
export function translate(language: Language, key: MessageKey | (string & {}), vars?: Vars): string {
  const k = key as MessageKey;
  const fromCatalog = CATALOGS[language]?.[k] ?? CATALOGS[DEFAULT_LANGUAGE]?.[k];
  if (fromCatalog !== undefined) return interpolate(fromCatalog, vars);
  const legacy = UI_TRANSLATIONS[key];
  if (legacy) return interpolate(legacy[language] || legacy[DEFAULT_LANGUAGE] || legacy.es || key, vars);
  return key;
}

export type TFunction = (key: MessageKey | (string & {}), vars?: Vars) => string;

export function createT(language: Language): TFunction {
  return (key, vars) => translate(language, key, vars);
}
