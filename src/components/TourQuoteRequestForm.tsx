import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Language } from '../types';
import { buildTourQuoteLeadPayload, QUOTE_HONEYPOT_FIELD, TOUR_QUOTE_ENDPOINT, type TourQuoteError } from '../../shared/tourQuoteRequest';

interface Props {
  tourId: string;
  language: Language;
}

const ERRORS: Record<TourQuoteError, { es: string; en: string }> = {
  consent_required: { es: 'Debes aceptar el tratamiento de tus datos (Ley 8968) para enviar la solicitud.', en: 'You must accept the processing of your data (Law 8968) to send the request.' },
  tour_required: { es: 'No pudimos identificar el tour.', en: 'We could not identify the tour.' },
  name_required: { es: 'Escribe tu nombre.', en: 'Enter your name.' },
  email_invalid: { es: 'Escribe un correo válido.', en: 'Enter a valid email.' },
  people_invalid: { es: 'Indica un número de personas entre 1 y 60.', en: 'Enter a number of people between 1 and 60.' },
};

const input = 'w-full rounded-2xl border border-white/10 bg-stone-950/50 px-5 py-3 text-white placeholder-stone-500 focus:border-emerald-500 focus:outline-none disabled:opacity-60';

/** Solicitud de cotización (no es reserva ni pago) con consentimiento Ley 8968 obligatorio. */
export const TourQuoteRequestForm: React.FC<Props> = ({ tourId, language }) => {
  const es = language === 'es';
  const lang = es ? 'es' : 'en';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [approxDate, setApproxDate] = useState('');
  const [people, setPeople] = useState('2');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  const startedAt = useRef(Date.now());
  const [trap, setTrap] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending.current || state === 'sent') return;
    setError(null);
    const built = buildTourQuoteLeadPayload({ tourId, name, email, approxDate, people, message, consent, language: lang });
    if (!built.ok) { setError(ERRORS[built.error][lang]); return; }
    sending.current = true;
    setState('sending');
    try {
      const res = await fetch(TOUR_QUOTE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...built.payload, [QUOTE_HONEYPOT_FIELD]: trap, elapsedMs: Date.now() - startedAt.current }),
      });
      if (res.status === 429) {
        setState('idle');
        setError(es ? 'Demasiadas solicitudes desde esta conexión. Inténtalo más tarde o escríbenos por WhatsApp.' : 'Too many requests from this connection. Try later or message us on WhatsApp.');
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setState('sent');
    } catch {
      setState('idle');
      setError(es ? 'No pudimos enviar la solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.' : 'We could not send the request. Try again or message us on WhatsApp.');
    } finally {
      sending.current = false;
    }
  };

  if (state === 'sent') {
    return (
      <div role="status" data-testid="tour-quote-success" className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-4 text-sm text-emerald-100">
        {es ? 'Solicitud recibida. Te enviaremos la cotización con disponibilidad y precio confirmados antes de cualquier pago.' : 'Request received. We will send you a quote with confirmed availability and price before any payment.'}
      </div>
    );
  }

  const disabled = state === 'sending';
  return (
    <form onSubmit={submit} noValidate aria-label={es ? 'Solicitar cotización' : 'Request a quote'} className="space-y-3">
      <h2 className="text-lg font-black text-white">{es ? 'Solicitar cotización' : 'Request a quote'}</h2>
      <p className="text-xs text-stone-400">{es ? 'No es una reserva ni un cobro. Confirmamos precio y cupo por escrito antes de cualquier pago; la identidad del operador se indica en la confirmación de la reserva.' : 'This is not a booking or a charge. We confirm price and availability in writing before any payment; the operator’s identity is provided in the booking confirmation.'}</p>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>Website<input tabIndex={-1} autoComplete="off" name={QUOTE_HONEYPOT_FIELD} value={trap} onChange={e => setTrap(e.target.value)} /></label>
      </div>
      <label className="block text-xs text-stone-300">{es ? 'Nombre' : 'Name'}
        <input required disabled={disabled} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className={input} />
      </label>
      <label className="block text-xs text-stone-300">{es ? 'Correo electrónico' : 'Email'}
        <input required disabled={disabled} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={input} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-stone-300">{es ? 'Fecha aproximada' : 'Approximate date'}
          <input disabled={disabled} placeholder={es ? 'p. ej. marzo 2027' : 'e.g. March 2027'} value={approxDate} onChange={e => setApproxDate(e.target.value)} className={input} />
        </label>
        <label className="block text-xs text-stone-300">{es ? 'Personas' : 'People'}
          <input required disabled={disabled} type="number" min={1} max={60} inputMode="numeric" value={people} onChange={e => setPeople(e.target.value)} className={input} />
        </label>
      </div>
      <label className="block text-xs text-stone-300">{es ? 'Mensaje' : 'Message'}
        <textarea disabled={disabled} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} className={`${input} min-h-20 resize-y`} />
      </label>
      <label className="flex items-start gap-3 text-xs text-stone-300">
        <input type="checkbox" required checked={consent} disabled={disabled} onChange={e => setConsent(e.target.checked)} className="mt-0.5" />
        <span>
          {es
            ? 'Autorizo el tratamiento de mi nombre, correo y mensaje para gestionar esta cotización, conforme a la Ley 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales.'
            : 'I authorize the processing of my name, email and message to handle this quote, under Costa Rica Law 8968 on personal data protection.'}{' '}
          <Link to="/privacy" className="underline">{es ? 'Política de privacidad' : 'Privacy policy'}</Link>
        </span>
      </label>
      {error && <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">{error}</div>}
      <button type="submit" disabled={disabled || !consent} className="w-full rounded-2xl bg-emerald-500 py-3 font-black text-stone-950 hover:bg-emerald-400 disabled:opacity-50">
        {disabled ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Enviar solicitud' : 'Send request')}
      </button>
    </form>
  );
};
