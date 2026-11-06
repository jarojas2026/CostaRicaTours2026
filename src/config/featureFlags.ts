/**
 * Banderas de funciones del frontend (Vite). Ausente/false = oculto; 'true' = activar explícitamente.
 * Se lee con acceso seguro para que los tests de node (sin import.meta.env) no fallen.
 */
const env: Record<string, string | undefined> = ((import.meta as any).env || {}) as Record<string, string | undefined>;

export function isFlagOn(value: string | undefined | null): boolean {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

/** Digital City (masterplan, /ciudad, /participar): oculta por defecto. VITE_SHOW_DIGITAL_CITY=true la muestra. */
export const SHOW_DIGITAL_CITY = isFlagOn(env.VITE_SHOW_DIGITAL_CITY);
