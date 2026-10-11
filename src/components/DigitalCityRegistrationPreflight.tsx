import React, { useState } from 'react';
import { Building2, Globe2, ShieldCheck, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { auth } from '../firebase';
import type { Language } from '../types';
import { DIGITAL_CITY_ENTITY_KINDS, type DigitalCityEntityKind } from '../../backend/digitalCityRegistrationPolicy';

type PreflightResult = {
  status: 'invalid' | 'needs_information' | 'ready_for_moderation';
  requirements: string[];
  countryCode: string | null;
  publishable: false;
  bookable: false;
  paymentEnabled: false;
  persisted: false;
};

const labelByKind: Record<DigitalCityEntityKind, { es: string; en: string }> = {
  individual: { es: 'Persona', en: 'Person' },
  freelancer: { es: 'Profesional independiente', en: 'Freelancer' },
  microbusiness: { es: 'Microempresa', en: 'Microbusiness' },
  company: { es: 'Empresa', en: 'Company' },
  community: { es: 'Comunidad', en: 'Community' },
  association: { es: 'Asociación o cooperativa', en: 'Association or cooperative' },
  institution: { es: 'Institución', en: 'Institution' },
  public_place: { es: 'Espacio público', en: 'Public place' },
  private_place: { es: 'Espacio privado', en: 'Private place' },
  event_organizer: { es: 'Organizador de eventos', en: 'Event organizer' }
};

const reasonLabels: Record<string, { es: string; en: string }> = {
  entity_kind_invalid: { es: 'Selecciona un tipo válido.', en: 'Choose a valid entity type.' },
  country_code_invalid: { es: 'Introduce un código de país de dos letras.', en: 'Enter a two-letter country code.' },
  display_name_required: { es: 'Indica un nombre válido (máximo 160 caracteres).', en: 'Enter a valid name (maximum 160 characters).' },
  locality_required: { es: 'Indica la localidad (máximo 160 caracteres).', en: 'Enter a locality (maximum 160 characters).' },
  publication_consent_required: { es: 'Falta consentimiento para solicitar publicación.', en: 'Consent to request publication is missing.' },
  representation_evidence_required: { es: 'Debe acreditarse la representación de esta entidad.', en: 'Evidence of authority to represent this entity is required.' },
  public_source_required: { es: 'Un espacio público requiere una referencia externa HTTPS.', en: 'A public place requires an external HTTPS reference.' },
  source_url_invalid: { es: 'La fuente debe ser una URL HTTPS válida.', en: 'Source must be a valid HTTPS URL.' }
};

export function DigitalCityRegistrationPreflight({ language }: { language: Language }) {
  const es = language === 'es';
  const [kind, setKind] = useState<DigitalCityEntityKind>('microbusiness');
  const [countryCode, setCountryCode] = useState('CR');
  const [displayName, setDisplayName] = useState('');
  const [locality, setLocality] = useState('');
  const [consent, setConsent] = useState(false);
  const [representsEntity, setRepresentsEntity] = useState(false);
  const [officialSourceUrl, setOfficialSourceUrl] = useState('');
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const evaluate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error(es ? 'Se necesita sesión administrativa.' : 'An administrator session is required.');
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/digital-city/registration/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ kind, countryCode, displayName, locality, consentToPublication: consent,
          representsEntity, officialSourceUrl })
      });
      const json = await response.json();
      if (!response.ok && !json.status) throw new Error(json.error || 'Service unavailable');
      setResult(json);
    } catch (err: any) {
      setError(err?.message || (es ? 'Error de evaluación.' : 'Evaluation failed.'));
    } finally {
      setBusy(false);
    }
  };

  return <section aria-label={es ? 'Inscripción a la ciudad digital' : 'Digital city registration'} className="rounded-3xl border border-emerald-500/20 bg-[#061d14] p-5 md:p-7 space-y-4">
    <header>
      <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-wider"><Globe2 size={17}/>{es ? 'Costa Rica y el mundo' : 'Costa Rica and the world'}</div>
      <h2 className="mt-2 text-xl font-black text-white">{es ? 'Laboratorio de inscripción universal' : 'Universal registration preflight'}</h2>
      <p className="mt-2 text-xs text-stone-300">{es
        ? 'Verifica condiciones mínimas antes de diseñar una inscripción real. Esta herramienta no registra, publica, valida identidades ni autoriza ventas.'
        : 'Check minimum criteria before building a real registration. This tool does not register, publish, verify identities or authorize sales.'}</p>
    </header>
    <form onSubmit={e => void evaluate(e)} className="grid md:grid-cols-2 gap-3 text-xs">
      <label className="text-stone-200">{es ? 'Tipo de participante' : 'Participant type'}
        <select className="mt-1 w-full rounded-xl border border-white/20 bg-[#092b20] p-3 text-white" value={kind} onChange={e => { setKind(e.target.value as DigitalCityEntityKind); setResult(null); }}>
          {DIGITAL_CITY_ENTITY_KINDS.map(k => <option key={k} value={k}>{labelByKind[k][es ? 'es' : 'en']}</option>)}
        </select>
      </label>
      <label className="text-stone-200">{es ? 'País (código de 2 letras)' : 'Country (two-letter code)'}
        <input className="mt-1 w-full rounded-xl border border-white/20 bg-[#092b20] p-3 text-white" value={countryCode} onChange={e => setCountryCode(e.target.value.toUpperCase())} maxLength={2} placeholder="CR" required/>
      </label>
      <label className="text-stone-200">{es ? 'Nombre propuesto' : 'Proposed name'}
        <input className="mt-1 w-full rounded-xl border border-white/20 bg-[#092b20] p-3 text-white" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={160} required/>
      </label>
      <label className="text-stone-200">{es ? 'Localidad' : 'Locality'}
        <input className="mt-1 w-full rounded-xl border border-white/20 bg-[#092b20] p-3 text-white" value={locality} onChange={e => setLocality(e.target.value)} maxLength={160} required/>
      </label>
      <label className="md:col-span-2 text-stone-200">{es ? 'Fuente de información pública (HTTPS, si aplica)' : 'Public information source (HTTPS, where applicable)'}
        <input type="url" className="mt-1 w-full rounded-xl border border-white/20 bg-[#092b20] p-3 text-white" value={officialSourceUrl} onChange={e => setOfficialSourceUrl(e.target.value)} placeholder="https://" maxLength={600}/>
      </label>
      <label className="md:col-span-2 flex items-start gap-2 text-stone-200"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1"/>
        {es ? 'Se declara consentimiento para solicitar publicación del contenido.' : 'Consent to request publication is declared.'}</label>
      <label className="md:col-span-2 flex items-start gap-2 text-stone-200"><input type="checkbox" checked={representsEntity} onChange={e => setRepresentsEntity(e.target.checked)} className="mt-1"/>
        {es ? 'La persona declara estar autorizada para representar la entidad (requiere verificación posterior).' : 'The applicant claims authority to represent the entity (requires later verification).'}</label>
      <button type="submit" disabled={busy} className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-black text-stone-950 disabled:opacity-50">
        <ClipboardCheck size={16}/>{busy ? '…' : es ? 'Evaluar requisitos' : 'Evaluate requirements'}
      </button>
    </form>
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    {result && <div role="status" className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-2 text-xs">
      <h3 className="font-bold text-white flex items-center gap-2">{result.status === 'ready_for_moderation' ? <ShieldCheck size={16} className="text-amber-300"/> : <AlertTriangle size={16} className="text-amber-300"/>}
        {result.status === 'ready_for_moderation'
          ? (es ? 'Datos aptos para revisión humana' : 'Information ready for human review')
          : (es ? 'Requisitos pendientes' : 'Requirements pending')}</h3>
      {result.requirements.map((key, i) => <p key={key + i} className="text-stone-300">• {reasonLabels[key]?.[es ? 'es' : 'en'] || key}</p>)}
      <p className="text-amber-200">{es ? 'No se ha guardado ni publicado ningún registro. Reservas y cobros permanecen deshabilitados.' : 'No record was saved or published. Booking and payments remain disabled.'}</p>
    </div>}
    <p className="text-[11px] text-stone-500 flex items-center gap-2"><Building2 size={14}/>{es ? 'La ampliación mundial requiere reglas locales por país, consentimiento, moderación y contratos.' : 'Global expansion requires country-specific rules, consent, moderation and contracts.'}</p>
  </section>;
}
