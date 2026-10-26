import { useCallback, useEffect, useState } from 'react';
import { detectVoiceSupport, speakWithSynthesis } from '../utils/voiceConcierge';

/**
 * Lectura en voz alta con speechSynthesis del navegador (voz del sistema,
 * sin servicios pagos ni red). Si no hay soporte, `supported` es false y la
 * UI queda en modo solo texto.
 */
export function useSpeechSynthesis(language: string) {
  const [supported] = useState(() => detectVoiceSupport().synthesis);
  const [speaking, setSpeaking] = useState(false);

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!supported || typeof window === 'undefined') return false;
    const started = speakWithSynthesis(window.speechSynthesis, (window as any).SpeechSynthesisUtterance, text, language, {
      onEnd: () => setSpeaking(false),
    });
    setSpeaking(started);
    return started;
  }, [supported, language]);

  // Al salir de la página se corta cualquier lectura en curso.
  useEffect(() => () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  return { supported, speaking, speak, cancel };
}
