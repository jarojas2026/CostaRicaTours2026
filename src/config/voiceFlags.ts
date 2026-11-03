/**
 * Banderas de voz del sitio (sin costo: el dictado usa la Web Speech API del navegador, no el backend de voz).
 * VITE_VOICE_DICTATION=off apaga los micrófonos de /ai y /conserje sin borrar código: se muestra "Próximamente".
 * El estado del agente telefónico se consulta aparte en GET /api/voice/health.
 */
export function isVoiceDictationEnabled(flag: string | undefined | null): boolean {
  return String(flag ?? '').trim().toLowerCase() !== 'off';
}

const env: Record<string, string | undefined> = ((import.meta as any).env || {}) as Record<string, string | undefined>;

export const VOICE_DICTATION_ENABLED = isVoiceDictationEnabled(env.VITE_VOICE_DICTATION);
