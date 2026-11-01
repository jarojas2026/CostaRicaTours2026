import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, Trash2, MessageCircle, ClipboardList, ShieldCheck } from 'lucide-react';
import type { Language } from '../types';
import type { CatalogTourLike } from '../utils/tripRequestParser';
import { useTours } from '../contexts/ToursContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { withStorageScope } from '../hooks/useStorageScope';
import { getPersonalItem, setPersonalItem, removePersonalItem } from '../utils/privateStorage';
import { requestCustomerIntake } from '../utils/customerIntake';
import {
  answerVoiceConcierge, hotelDisplayName, parseTranscript, sanitizeHotelSlug, serializeTranscript,
  voiceConciergeGreeting, voiceLanguageOf, VOICE_TRANSCRIPT_KEY, type VoiceTranscriptEntry,
} from '../utils/voiceConcierge';

export interface VoiceConciergeProps {
  language: Language;
  /** Modo hotel: slug simple (p. ej. "hotel-del-rio"); solo cambia el saludo. */
  hotel?: string;
  /** Catálogo opcional (tests); por defecto el del contexto de tours. */
  tours?: readonly CatalogTourLike[];
  onSelectTour?: (tourId: string) => void;
}

const COPY = {
  es: {
    title: 'Conserje de voz', beta: 'Prototipo', hotelBadge: 'Modo hotel',
    micStart: 'Hablar con el conserje', micStop: 'Dejar de escuchar', listening: 'Escuchando… habla ahora',
    fallback: 'Tu navegador no permite dictado por voz. Escribe tu pregunta y el conserje te responde igual.',
    readOn: 'Leer respuestas en voz alta: activado', readOff: 'Leer respuestas en voz alta: desactivado',
    placeholder: 'Escribe tu pregunta…', send: 'Enviar', clear: 'Borrar conversación',
    request: 'Enviar solicitud al equipo', requestSending: 'Enviando solicitud…', requestSent: 'Solicitud recibida: una persona del equipo la revisa. No es una reserva ni un cobro.', requestFailed: 'No pudimos enviar la solicitud. Escríbenos por WhatsApp.',
    whatsapp: 'Escribir por WhatsApp', viewTour: 'Ver tour',
    gap: 'Pregunta no cubierta todavía (anotada para el equipo).',
    privacy: 'No guardamos audio: el navegador convierte tu voz en texto. Solo el texto de esta conversación queda en este navegador (sin cuenta, solo durante esta visita).',
    rules: 'El conserje no confirma reservas, precios finales ni pagos: eso lo confirma una persona del equipo.',
    micError: 'No pudimos usar el micrófono. Revisa el permiso del navegador o escribe tu pregunta.',
    you: 'Tú', concierge: 'Conserje',
  },
  en: {
    title: 'Voice concierge', beta: 'Prototype', hotelBadge: 'Hotel mode',
    micStart: 'Talk to the concierge', micStop: 'Stop listening', listening: 'Listening… speak now',
    fallback: "Your browser doesn't support voice dictation. Type your question and the concierge will still answer.",
    readOn: 'Read answers aloud: on', readOff: 'Read answers aloud: off',
    placeholder: 'Type your question…', send: 'Send', clear: 'Clear conversation',
    request: 'Send request to our team', requestSending: 'Sending request…', requestSent: 'Request received: a person from our team will review it. It is not a booking or a charge.', requestFailed: "We couldn't send the request. Message us on WhatsApp.",
    whatsapp: 'Message us on WhatsApp', viewTour: 'View tour',
    gap: 'Question not covered yet (noted for the team).',
    privacy: "We don't store audio: your browser turns your voice into text. Only this conversation's text stays in this browser (without an account, only for this visit).",
    rules: "The concierge doesn't confirm bookings, final prices or payments: a person from our team does.",
    micError: "We couldn't use the microphone. Check the browser permission or type your question.",
    you: 'You', concierge: 'Concierge',
  },
} as const;

let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq += 1)}`;

const VoiceConciergeComponent: React.FC<VoiceConciergeProps> = ({ language, hotel, tours: toursProp, onSelectTour }) => {
  const lang = voiceLanguageOf(language);
  const c = COPY[lang];
  const hotelSlug = sanitizeHotelSlug(hotel);
  const { tours: contextTours } = useTours();
  const tours = (toursProp ?? contextTours) as readonly CatalogTourLike[];

  const greeting = useMemo<VoiceTranscriptEntry>(() => ({
    id: 'greeting', sender: 'concierge', text: voiceConciergeGreeting(lang, hotelSlug), intent: 'greeting',
  }), [lang, hotelSlug]);

  // Solo texto, nunca audio. privateStorage: visitante = sessionStorage; usuario = clave por uid.
  const [entries, setEntries] = useState<VoiceTranscriptEntry[]>(() => parseTranscript(getPersonalItem(VOICE_TRANSCRIPT_KEY)));
  const [input, setInput] = useState('');
  const [readAloud, setReadAloud] = useState(true);
  const [sentRequests, setSentRequests] = useState<Record<string, 'sending' | 'sent' | 'failed'>>({});
  const endRef = useRef<HTMLDivElement>(null);

  const tts = useSpeechSynthesis(lang);

  useEffect(() => {
    try {
      if (entries.length) setPersonalItem(VOICE_TRANSCRIPT_KEY, serializeTranscript(entries));
    } catch { /* almacenamiento bloqueado: la conversación sigue en memoria */ }
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [entries]);

  const ask = (raw: string, via: 'voice' | 'text') => {
    const text = raw.trim();
    if (!text) return;
    const answer = answerVoiceConcierge(text, tours, { language: lang });
    const guest: VoiceTranscriptEntry = { id: newId('g'), sender: 'guest', text, via };
    const reply: VoiceTranscriptEntry = {
      id: newId('c'), sender: 'concierge', text: answer.reply, intent: answer.intent,
      capabilityGap: answer.capabilityGap, offerRequest: answer.offerRequest, whatsappUrl: answer.whatsappUrl, tours: answer.tours,
    };
    // TODO(capability-gap): la plataforma aún no tiene registro de preguntas no cubiertas;
    // `capabilityGap` queda marcado en la respuesta para conectarlo cuando exista.
    setEntries(prev => [...prev, guest, reply]);
    setInput('');
    if (readAloud && tts.supported) tts.speak(answer.reply);
  };

  // Dictado: el texto final se envía al conserje (respuesta local, sin costo ni red).
  const speech = useSpeechRecognition(lang, (text) => ask(text, 'voice'));

  const handleMic = () => {
    if (!speech.listening) tts.cancel();
    speech.toggle();
  };

  const sendRequest = (entry: VoiceTranscriptEntry) => {
    const idx = entries.findIndex(e => e.id === entry.id);
    const question = [...entries.slice(0, idx)].reverse().find(e => e.sender === 'guest')?.text || entry.text;
    requestCustomerIntake({
      message: question,
      language: lang,
      source: 'voice_concierge',
      context: { channel: 'voice_concierge', intent: entry.intent, capabilityGap: Boolean(entry.capabilityGap), ...(hotelSlug ? { hotel: hotelSlug } : {}) },
      onResult: (result) => setSentRequests(prev => ({ ...prev, [entry.id]: result.ok ? 'sent' : 'failed' })),
    });
    setSentRequests(prev => ({ ...prev, [entry.id]: 'sending' }));
  };

  const clear = () => {
    tts.cancel();
    setEntries([]);
    setSentRequests({});
    try { removePersonalItem(VOICE_TRANSCRIPT_KEY); } catch { /* noop */ }
  };

  const all = [greeting, ...entries];

  return (
    <section data-testid="voice-concierge" aria-labelledby="voice-concierge-title" className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-stone-950/80 p-4 text-white sm:p-6">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <h1 id="voice-concierge-title" className="text-2xl font-black">{c.title}</h1>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-200">{c.beta}</span>
        {hotelSlug && (
          <span data-testid="voice-concierge-hotel" className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-200">
            {c.hotelBadge}: {hotelDisplayName(hotelSlug)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {tts.supported && (
            <button type="button" data-testid="voice-concierge-read-aloud" aria-pressed={readAloud}
              aria-label={readAloud ? c.readOn : c.readOff} title={readAloud ? c.readOn : c.readOff}
              onClick={() => { if (readAloud) tts.cancel(); setReadAloud(v => !v); }}
              className="rounded-lg border border-white/15 p-2 hover:bg-white/5">
              {readAloud ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
            </button>
          )}
          <button type="button" onClick={clear} aria-label={c.clear} title={c.clear} className="rounded-lg border border-white/15 p-2 hover:bg-white/5">
            <Trash2 size={18} aria-hidden />
          </button>
        </div>
      </header>

      <div role="log" aria-live="polite" aria-label={c.title} className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
        {all.map(entry => (
          <div key={entry.id} className={entry.sender === 'guest' ? 'ml-8 rounded-2xl bg-emerald-600/20 p-3' : 'mr-8 rounded-2xl bg-white/5 p-3'}>
            <p className="mb-1 text-xs font-bold text-stone-400">{entry.sender === 'guest' ? c.you : c.concierge}{entry.via === 'voice' ? ' 🎙️' : ''}</p>
            <p className="whitespace-pre-line text-sm leading-relaxed">{entry.text}</p>
            {entry.tours?.length ? (
              <ul className="mt-2 space-y-1 text-sm">
                {entry.tours.map(t => (
                  <li key={t.tourId} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{t.title}</span>
                    {t.referenceLine && <span className="text-xs text-stone-400">{t.referenceLine}</span>}
                    {onSelectTour && (
                      <button type="button" onClick={() => onSelectTour(t.tourId)} className="text-xs font-bold text-emerald-300 underline">{c.viewTour}</button>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            {entry.capabilityGap && <p data-testid="voice-concierge-gap" className="mt-2 text-xs text-amber-200">{c.gap}</p>}
            {entry.sender === 'concierge' && entry.offerRequest && (
              <div className="mt-2 flex flex-wrap gap-2">
                {sentRequests[entry.id] === 'failed' && <p role="alert" className="w-full text-xs text-rose-200">{c.requestFailed}</p>}
                {sentRequests[entry.id] && sentRequests[entry.id] !== 'failed'
                  ? <p role="status" className="text-xs font-bold text-emerald-300">{sentRequests[entry.id] === 'sent' ? c.requestSent : c.requestSending}</p>
                  : (
                    <button type="button" data-testid="voice-concierge-request" onClick={() => sendRequest(entry)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-stone-950">
                      <ClipboardList size={14} aria-hidden />{c.request}
                    </button>
                  )}
                {entry.whatsappUrl && (
                  <a href={entry.whatsappUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold">
                    <MessageCircle size={14} aria-hidden />{c.whatsapp}
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {speech.listening && (
        <p role="status" data-testid="voice-concierge-listening" className="mt-3 flex items-center gap-2 text-sm font-bold text-rose-300">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" aria-hidden />{c.listening}
        </p>
      )}
      {speech.error && !speech.listening && <p role="alert" className="mt-3 text-xs text-rose-200">{c.micError}</p>}
      {!speech.supported && <p data-testid="voice-concierge-fallback" className="mt-3 text-xs text-stone-300">{c.fallback}</p>}

      <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); ask(input, 'text'); }}>
        {speech.supported && (
          <button type="button" data-testid="voice-concierge-mic" onClick={handleMic}
            aria-label={speech.listening ? c.micStop : c.micStart} aria-pressed={speech.listening} title={speech.listening ? c.micStop : c.micStart}
            className={`shrink-0 rounded-full p-3 ${speech.listening ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-stone-950'}`}>
            {speech.listening ? <MicOff size={20} aria-hidden /> : <Mic size={20} aria-hidden />}
          </button>
        )}
        <label htmlFor="voice-concierge-input" className="sr-only">{c.placeholder}</label>
        <input id="voice-concierge-input" data-testid="voice-concierge-input" value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={c.placeholder} maxLength={1000} autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
        <button type="submit" aria-label={c.send} className="shrink-0 rounded-xl bg-white/10 p-3 hover:bg-white/15"><Send size={18} aria-hidden /></button>
      </form>

      <p className="mt-3 flex items-start gap-1 text-[11px] text-stone-400"><ShieldCheck size={12} className="mt-0.5 shrink-0" aria-hidden />{c.privacy}</p>
      <p className="mt-1 text-[11px] text-stone-400">{c.rules}</p>
    </section>
  );
};

/** Se remonta al cambiar de identidad: nunca muestra la conversación de otra persona. */
export const VoiceConcierge = withStorageScope(VoiceConciergeComponent);
export default VoiceConcierge;
