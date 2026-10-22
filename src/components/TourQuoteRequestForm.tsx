import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Language } from '../types';
import { buildTourQuoteLeadPayload, TOUR_QUOTE_ENDPOINT, type TourQuoteError } from '../../shared/tourQuoteRequest';
import { formGuardFields } from '../../shared/formAbuse';
import { HoneypotField } from './HoneypotField';
import { RequestFollowUpWhatsApp } from './RequestFollowUpWhatsApp';
import { isPublicRequestReference } from '../../shared/requestConfirmation';

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

type QuoteField = 'name' | 'email' | 'people' | 'consent';
const FIELD_ORDER: QuoteField[] = ['name', 'email', 'people', 'consent'];
const FIELD_ERROR: Record<QuoteField, TourQuoteError> = { name: 'name_required', email: 'email_invalid', people: 'people_invalid', consent: 'consent_required' };
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

/** Todos los campos inválidos a la vez (el contrato compartido sólo devuelve el primero). */
function invalidFields(input: { name: string; email: string; people: string; consent: boolean }): QuoteField[] {
  const out: QuoteField[] = [];
  if (input.name.replace(/\s+/g, ' ').trim().length < 2) out.push('name');
  if (!EMAIL_RE.test(input.email.trim().toLowerCase())) out.push('email');
  const people = Number(input.people);
  if (!Number.isInteger(people) || people < 1 || people > 60) out.push('people');
  if (!input.consent) out.push('consent');
  return out;
}

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
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  const [startedAt] = useState(() => Date.now());
  const [honeypot, setHoneypot] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<QuoteField, string>>>({});
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    people: useRef<HTMLInputElement>(null),
    consent: useRef<HTMLInputElement>(null),
  };
  const clearField = (field: QuoteField) => {
    if (fieldErrors[field]) setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  };
  const a11y = (field: QuoteField) => ({
    'aria-invalid': fieldErrors[field] ? true : undefined,
    'aria-describedby': fieldErrors[field] ? `tour-quote-error-${field}` : undefined,
  });
  const fieldError = (field: QuoteField) => fieldErrors[field]
    ? <span id={`tour-quote-error-${field}`} role="alert" data-testid={`tour-quote-error-${field}`} className="mt-1 block text-xs font-bold text-amber-300">{fieldErrors[field]}</span>
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending.current || state === 'sent') return;
    setError(null);
    const invalid = invalidFields({ name, email, people, consent });
    setFieldErrors(Object.fromEntries(invalid.map(field => [field, ERRORS[FIELD_ERROR[field]][lang]])));
    if (invalid.length) {
      const first = FIELD_ORDER.find(field => invalid.includes(field));
      if (first) fieldRefs[first].current?.focus();
      return;
    }
    const built = buildTourQuoteLeadPayload({ tourId, name, email, approxDate, people, message, consent, language: lang });
    if (!built.ok) { setError(ERRORS[built.error][lang]); return; }
    sending.current = true;
    setState('sending');
    try {
      const res = await fetch(TOUR_QUOTE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...built.payload, ...formGuardFields(startedAt, honeypot) }),
      });
      if (res.status === 429 || res.status === 400) {
        const body = await res.json().catch(() => ({}));
        if (body?.code === 'rate_limited' || body?.code === 'too_fast') {
          setState('idle');
          setError(String(body.message));
          return;
        }
      }
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json().catch(() => ({}));
      // Solo una referencia corta del servidor (sin datos personales) si viene en la respuesta.
      setReference(isPublicRequestReference(body?.reference) ? body.reference : null);
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
        {reference && (
          <p className="mt-2 text-xs font-bold text-emerald-200" data-testid="tour-quote-reference">
            {es ? 'Número de referencia: ' : 'Reference number: '}<span className="font-mono">{reference}</span>
          </p>
        )}
        <RequestFollowUpWhatsApp reference={reference} language={lang} />
      </div>
    );
  }

  const disabled = state === 'sending';
  return (
    <form onSubmit={submit} noValidate aria-label={es ? 'Solicitar cotización' : 'Request a quote'} className="relative space-y-3">
      <h2 className="text-lg font-black text-white">{es ? 'Solicitar cotización' : 'Request a quote'}</h2>
      <p className="text-xs text-stone-400">{es ? 'No es una reserva ni un cobro. Confirmamos precio y cupo por escrito antes de cualquier pago; la identidad del operador se indica en la confirmación de la reserva.' : 'This is not a booking or a charge. We confirm price and availability in writing before any payment; the operator’s identity is provided in the booking confirmation.'}</p>
      <label className="block text-xs text-stone-300">{es ? 'Nombre' : 'Name'}
        <input ref={fieldRefs.name} required disabled={disabled} autoComplete="name" value={name} onChange={e => { setName(e.target.value); clearField('name'); }} {...a11y('name')} className={input} />
        {fieldError('name')}
      </label>
      <label className="block text-xs text-stone-300">{es ? 'Correo electrónico' : 'Email'}
        <input ref={fieldRefs.email} required disabled={disabled} type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); clearField('email'); }} {...a11y('email')} className={input} />
        {fieldError('email')}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-stone-300">{es ? 'Fecha aproximada' : 'Approximate date'}
          <input disabled={disabled} placeholder={es ? 'p. ej. marzo 2027' : 'e.g. March 2027'} value={approxDate} onChange={e => setApproxDate(e.target.value)} className={input} />
        </label>
        <label className="block text-xs text-stone-300">{es ? 'Personas' : 'People'}
          <input ref={fieldRefs.people} required disabled={disabled} type="number" min={1} max={60} inputMode="numeric" value={people} onChange={e => { setPeople(e.target.value); clearField('people'); }} {...a11y('people')} className={input} />
          {fieldError('people')}
        </label>
      </div>
      <label className="block text-xs text-stone-300">{es ? 'Mensaje' : 'Message'}
        <textarea disabled={disabled} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} className={`${input} min-h-20 resize-y`} />
      </label>
      <div>
      <label className="flex items-start gap-3 text-xs text-stone-300">
        <input ref={fieldRefs.consent} type="checkbox" required checked={consent} disabled={disabled} onChange={e => { setConsent(e.target.checked); clearField('consent'); }} {...a11y('consent')} className="mt-0.5" />
        <span>
          {es
            ? 'Autorizo el tratamiento de mi nombre, correo y mensaje para gestionar esta cotización, conforme a la Ley 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales.'
            : 'I authorize the processing of my name, email and message to handle this quote, under Costa Rica Law 8968 on personal data protection.'}{' '}
          <Link to="/privacy" className="underline">{es ? 'Política de privacidad' : 'Privacy policy'}</Link>
        </span>
      </label>
      {fieldError('consent')}
      </div>
      {error && <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">{error}</div>}
      <button type="submit" disabled={disabled} aria-busy={disabled} className="w-full rounded-2xl bg-emerald-500 py-3 font-black text-stone-950 hover:bg-emerald-400 disabled:opacity-50">
        {disabled ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Enviar solicitud' : 'Send request')}
      </button>
      {/* Al final del formulario: el foco automático toma el primer campo real. */}
      <HoneypotField value={honeypot} onChange={setHoneypot} />
    </form>
  );
};
