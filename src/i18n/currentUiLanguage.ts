import type { Language } from '../types';

/**
 * Idioma activo de la interfaz para componentes que no lo reciben por prop (p. ej. las etiquetas
 * <MyLabel> del Header, que no se puede modificar). App lo fija en cada render, antes que sus hijos.
 */
let currentUiLanguage: Language | null = null;

export function setCurrentUiLanguage(language: Language): void {
  currentUiLanguage = language;
}

export function getCurrentUiLanguage(fallback: Language = 'en'): Language {
  return currentUiLanguage ?? fallback;
}
