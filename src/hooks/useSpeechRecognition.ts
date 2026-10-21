import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Dictado por voz con la Web Speech API del navegador (sin backend ni claves).
 * `supported` es false en navegadores sin SpeechRecognition (p. ej. Firefox):
 * en ese caso la UI debe ocultar el botón de micrófono.
 */
type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function speechLangFor(language: string): string {
  return language === 'es' ? 'es-CR' : 'en-US';
}

export function useSpeechRecognition(language: string, onFinalText: (text: string) => void) {
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const onFinalRef = useRef(onFinalText);
  onFinalRef.current = onFinalText;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    recognitionRef.current?.abort();
    const recognition = new Ctor();
    recognition.lang = speechLangFor(language);
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      let text = '';
      for (let i = event.resultIndex ?? 0; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) text += event.results[i][0]?.transcript ?? '';
      }
      text = text.trim();
      if (text) onFinalRef.current(text);
    };
    recognition.onerror = (event: any) => {
      setError(String(event?.error || 'speech_error'));
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setError(null);
    try {
      recognition.start();
      setListening(true);
    } catch (e: any) {
      setError(String(e?.message || 'speech_start_failed'));
      setListening(false);
    }
  }, [language]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, error, start, stop, toggle };
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof (window as any).SpeechSynthesisUtterance === 'function';
}
