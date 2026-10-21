import React, { useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth';
import { Building2, ClipboardCheck, Globe2, ShieldCheck } from 'lucide-react';
import { auth } from '../firebase';
import { DIGITAL_CITY_ENTITY_KINDS, type DigitalCityEntityKind } from '../../backend/digitalCityRegistrationPolicy';
import type { Language } from '../types';
import { CountrySelect } from '../components/CountrySelect';
import { HoneypotField } from '../components/HoneypotField';
import { formGuardFields } from '../../shared/formAbuse';

type Mine = {
  id: string; kind: DigitalCityEntityKind; displayName: string; countryCode: string;
  locality: string; status: string; createdAt: string; moderationReason: string | null;
  officialSourceUrl?: string; representationDeclared?: boolean; revision?: number
};
const types: Record<DigitalCityEntityKind, [string, string]> = {
  individual: ['Persona', 'Person'], freelancer: ['Profesional independiente', 'Freelancer'],
  microbusiness: ['Microempresa', 'Microbusiness'], company: ['Empresa', 'Company'],
  community: ['Comunidad', 'Community'], association: ['Asociación', 'Association'],
  institution: ['Institución', 'Institution'], public_place: ['Espacio público', 'Public place'],
  private_place: ['Espacio privado', 'Private place'], event_organizer: ['Organizador de eventos', 'Event organizer']
};

export function DigitalCityJoinPage({ language, onOpenPrivacy }: { language: Language; onOpenPrivacy: () => void }) {
  const es = language === 'es';
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [kind, setKind] = useState<DigitalCityEntityKind>('microbusiness');
  const [countryCode, setCountryCode] = useState('CR');
  const [displayName, setDisplayName] = useState('');
  const [locality, setLocality] = useState('');
  const [officialSourceUrl, setOfficialSourceUrl] = useState('');
  const [consentToPublication, setConsentToPublication] = useState(false);
  const [representsEntity, setRepresentsEntity] = useState(false);
  const [mine, setMine] = useState<Mine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<{ id: string; revision: number } | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const request = async (path: string, init: RequestInit = {}) => {
    const signedUser = auth.currentUser;
    if (!signedUser) throw new Error(es ? 'Inicia sesión para continuar.' : 'Sign in to continue.');
    const token = await signedUser.getIdToken();
    const response = await fetch('/api/digital-city/applications' + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || (es ? 'Servicio no disponible.' : 'Service unavailable.'));
    return body;
  };

  useEffect(() => {
    if (!user) { setMine([]); return; }
    let current = true;
    request('/mine').then(body => { if (current) setMine(body.applications || []); })
      .catch(() => { if (current) setMine([]); });
    return () => { current = false; };
  }, [user?.uid, language]);

  const signIn = async () => {
    setBusy(true); setError('');
    try {
      // Do not reuse legacy Google auth provider with Gmail/Calendar scopes.
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) { setError(e?.message || 'Authentication failed'); }
    finally { setBusy(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      const result = await request(editing ? '/' + encodeURIComponent(editing.id) + '/resubmit' : '', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({ kind, countryCode, displayName, locality,
          officialSourceUrl, consentToPublication, representsEntity,
          ...(editing ? { expectedRevision: editing.revision } : formGuardFields(startedAt, honeypot)) })
      });
      setSuccess(es
        ? (editing ? 'Corrección enviada de forma privada para nueva revisión.' : 'Solicitud privada recibida para revisión. No es un registro público ni permite vender.')
        : (editing ? 'Private correction submitted for review.' : 'Private application received for review. This is not a public listing or permission to sell.'));
      setMine((await request('/mine')).applications || []);
      if (editing || !result.idempotent) {
        setEditing(null); setDisplayName(''); setLocality(''); setOfficialSourceUrl('');
        setConsentToPublication(false); setRepresentsEntity(false);
      }
    } catch (e: any) { setError(e?.message || 'Submission failed'); }
    finally { setBusy(false); }
  };

  const correct = (item: Mine) => {
    setEditing({ id: item.id, revision: item.revision || 1 });
    setKind(item.kind); setCountryCode(item.countryCode); setDisplayName(item.displayName);
    setLocality(item.locality); setOfficialSourceUrl(item.officialSourceUrl || '');
    setRepresentsEntity(item.representationDeclared === true);
    setConsentToPublication(false);
    setError(''); setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const withdraw = async (item: Mine) => {
    const confirmed = window.confirm(es
      ? '¿Retirar este expediente? Se borrarán los campos de nombre, localidad y enlace público del expediente activo, pero se conservarán metadatos mínimos y una auditoría.'
      : 'Withdraw this application? Name, locality and public URL will be cleared from the active record; minimal metadata and audit entries remain.');
    if (!confirmed) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await request('/' + encodeURIComponent(item.id) + '/withdraw', {
        method: 'POST', body: JSON.stringify({ expectedRevision: item.revision || 1 })
      });
      setMine((await request('/mine')).applications || []);
      if (editing?.id === item.id) setEditing(null);
      setSuccess(es ? 'Solicitud retirada. Esto no constituye eliminación legal completa.' : 'Application withdrawn. This is not complete legal erasure.');
    } catch (err: any) { setError(err?.message || 'Withdrawal failed'); }
    finally { setBusy(false); }
  };

  const inputClass = 'mt-1 w-full rounded-xl border border-emerald-500/25 bg-[#082c20] px-3 py-3 text-white focus:outline-2 focus:outline-amber-300';
  return <main className="mx-auto max-w-5xl px-4 py-10 text-stone-100 space-y-6">
    <header className="rounded-3xl border border-emerald-500/25 bg-[#061d14] p-6">
      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-widest"><Globe2 size={18}/>{es ? 'La ciudad digital de Costa Rica' : 'Costa Rica digital city'}</div>
      <h1 className="mt-2 text-3xl sm:text-4xl font-black">{es ? 'Participa en la ciudad digital' : 'Join the digital city'}</h1>
      <p className="mt-3 text-sm text-stone-300">{es
        ? 'Para guías, personas, emprendimientos, comunidades, empresas, entidades y lugares. Costa Rica es nuestro origen; otras regiones se evaluarán según sus normas locales.'
        : 'For guides, people, local enterprises, communities, companies, institutions and places. We begin in Costa Rica; other regions require local review.'}</p>
      <p className="mt-2 flex items-center gap-2 text-xs text-amber-200"><ShieldCheck size={16}/>{es ? 'Toda solicitud permanece privada hasta una revisión autorizada.' : 'Every request stays private until authorized review.'}</p>
    </header>

    {!user ? <section className="rounded-2xl border border-white/10 bg-[#071b13] p-5 space-y-4">
      <h2 className="font-bold text-white">{es ? 'Identificación segura' : 'Secure identification'}</h2>
      <p className="text-xs text-stone-300">{es ? 'Necesitas una cuenta Google con correo verificado. No solicitamos acceso a Gmail ni Calendar.' : 'A verified Google account is required. Gmail and Calendar permissions are not requested.'}</p>
      <button type="button" disabled={busy} onClick={() => void signIn()} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-stone-950">{es ? 'Continuar con Google' : 'Continue with Google'}</button>
    </section> : <section className="rounded-2xl border border-white/10 bg-[#071b13] p-5 space-y-4">
      <h2 className="flex items-center gap-2 font-bold text-white"><Building2 size={18}/>{editing ? (es ? 'Corregir solicitud existente' : 'Correct an existing application') : (es ? 'Nueva solicitud' : 'New application')}</h2>
      {editing && <button type="button" onClick={() => { setEditing(null); setConsentToPublication(false); }} className="text-xs underline text-amber-200">{es ? 'Cancelar edición' : 'Cancel edit'}</button>}
      <p className="text-xs text-stone-400">{es ? 'Sesión identificada. Límite de 3 solicitudes nuevas por día. Los datos introducidos no demuestran representación legal.' : 'Signed in. Maximum 3 new applications per day. Submitted information does not prove legal representation.'}</p>
      <form onSubmit={e => void submit(e)} className="relative grid gap-4 sm:grid-cols-2 text-xs">
        <HoneypotField value={honeypot} onChange={setHoneypot} />
        <label>{es ? 'Participante' : 'Participant'}<select value={kind} onChange={e => setKind(e.target.value as DigitalCityEntityKind)} disabled={editing !== null} className={inputClass}>
          {DIGITAL_CITY_ENTITY_KINDS.map(type => <option key={type} value={type}>{types[type][es ? 0 : 1]}</option>)}
        </select></label>
        <CountrySelect label={es ? 'País' : 'Country'} language={language} value={countryCode} onChange={setCountryCode} disabled={editing !== null} name="countryCode" required/>
        <label>{es ? 'Nombre del participante o entidad' : 'Participant or entity name'}<input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={160} className={inputClass} required/></label>
        <label>{es ? 'Localidad' : 'Locality'}<input value={locality} onChange={e => setLocality(e.target.value)} maxLength={160} className={inputClass} required/></label>
        <label className="sm:col-span-2">{es ? 'Fuente pública HTTPS (requerida para espacios públicos)' : 'Public HTTPS source (required for public places)'}<input type="url" value={officialSourceUrl} onChange={e => setOfficialSourceUrl(e.target.value)} maxLength={600} placeholder="https://" className={inputClass}/></label>
        <div className="sm:col-span-2 text-xs text-stone-300"><button type="button" onClick={onOpenPrivacy} className="font-semibold underline text-amber-200">{es ? 'Leer nuestra política de privacidad' : 'Read our privacy policy'}</button><p className="mt-1">{es ? 'Tus datos se utilizarán para evaluar esta solicitud y no se publicarán automáticamente.' : 'Your information will be used to evaluate this application and will not be published automatically.'}</p></div>
        <label className="sm:col-span-2 flex gap-2 items-start"><input type="checkbox" checked={consentToPublication} onChange={e => setConsentToPublication(e.target.checked)} className="mt-0.5"/>{es ? 'Autorizo presentar esta información para solicitar una futura publicación; nada se publica de inmediato.' : 'I consent to submitting this information for possible future publication; nothing is published now.'}</label>
        <label className="sm:col-span-2 flex gap-2 items-start"><input type="checkbox" checked={representsEntity} onChange={e => setRepresentsEntity(e.target.checked)} className="mt-0.5"/>{es ? 'Declaro estar autorizado para representar a la entidad, sujeto a verificación.' : 'I declare authority to represent this entity, subject to verification.'}</label>
        <button disabled={busy || !consentToPublication} type="submit" className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-stone-950 disabled:opacity-50"><ClipboardCheck size={17}/>{busy ? '…' : editing ? (es ? 'Reenviar corrección' : 'Resubmit correction') : es ? 'Enviar solicitud privada' : 'Submit private application'}</button>
      </form>
    </section>}
    {error && <p role="alert" className="rounded-xl bg-rose-950/40 p-3 text-rose-200 text-sm">{error}</p>}
    {success && <p role="status" className="rounded-xl bg-emerald-950/50 p-3 text-emerald-200 text-sm">{success}</p>}
    {user && <section className="rounded-2xl border border-white/10 bg-[#071b13] p-5 space-y-3">
      <h2 className="font-bold">{es ? 'Mis solicitudes privadas' : 'My private applications'}</h2>
      {mine.map(item => <div key={item.id} className="rounded-xl border border-white/10 p-3 text-sm">
        <b>{item.displayName}</b><p className="text-xs text-stone-400">{item.kind} · {item.countryCode} · {item.locality}</p>
        <p className="text-xs text-amber-200">{es ? 'Estado' : 'Status'}: {item.status}</p>
        {item.moderationReason && <p className="mt-1 text-xs text-stone-300">{item.moderationReason}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {item.status === 'needs_information' && <button type="button" disabled={busy} onClick={() => correct(item)}
            className="rounded-lg border border-amber-400/40 px-3 py-2 text-xs text-amber-200">{es ? 'Corregir y reenviar' : 'Correct and resubmit'}</button>}
          {item.status !== 'withdrawn' && <button type="button" disabled={busy} onClick={() => void withdraw(item)}
            className="rounded-lg border border-rose-400/40 px-3 py-2 text-xs text-rose-200">{es ? 'Retirar solicitud' : 'Withdraw application'}</button>}
        </div>
      </div>)}
      {!mine.length && <p className="text-xs text-stone-400">{es ? 'No hay solicitudes guardadas.' : 'No saved applications.'}</p>}
    </section>}
  </main>;
}
