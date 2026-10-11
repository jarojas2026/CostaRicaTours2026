import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, ShieldCheck, XCircle, MessageSquareText } from 'lucide-react';
import { auth } from '../firebase';
import type { Language } from '../types';

type Application = {
  id: string; applicantUid: string; kind: string; displayName: string;
  locality: string; countryCode: string; status: string; createdAt: string;
  representationDeclared: boolean; officialSourceUrl: string
};

export function DigitalCityReviewQueue({ language }: { language: Language }) {
  const es = language === 'es';
  const [applications, setApplications] = useState<Application[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const request = async (path: string, options: RequestInit = {}) => {
    const user = auth.currentUser;
    if (!user) throw new Error(es ? 'Se requiere sesión administrativa.' : 'Admin session required.');
    const token = await user.getIdToken();
    const response = await fetch('/api/digital-city/applications/admin' + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Operation unavailable');
    return body;
  };
  const load = useCallback(async () => {
    try { setError(''); setApplications((await request('/queue')).applications || []); }
    catch (err: any) { setError(err.message || 'Service unavailable'); }
  }, [language]);
  useEffect(() => { void load(); }, [load]);

  const triage = async (id: string, status: 'under_review' | 'needs_information' | 'rejected') => {
    setBusy(id); setError(''); setMessage('');
    try {
      const explanation = (reason[id] || '').trim();
      if (explanation.length < 10) throw new Error(es ? 'Indica una justificación de al menos 10 caracteres.' : 'Provide at least 10 characters of justification.');
      await request('/' + encodeURIComponent(id) + '/triage', {
        method: 'POST', body: JSON.stringify({ status, reason: explanation })
      });
      setMessage(es ? 'Decisión interna guardada y auditada. No se ha publicado ningún perfil.' : 'Internal decision saved and audited. Nothing was published.');
      await load();
    } catch (err: any) { setError(err.message || 'Failed'); }
    finally { setBusy(null); }
  };

  return <section aria-label={es ? 'Expedientes de ciudad digital' : 'Digital city applications'} className="rounded-3xl border border-amber-400/20 bg-[#131c13] p-5 md:p-7 space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-xl font-black text-white"><ClipboardList className="text-amber-300"/>{es ? 'Solicitudes de participación' : 'Participation applications'}</h2>
        <p className="mt-2 text-xs text-stone-300">{es ? 'Bandeja privada: revisión administrativa, sin aprobación comercial automática.' : 'Private inbox: administrative review, without automatic commercial approval.'}</p>
      </div>
      <button type="button" onClick={() => void load()} className="rounded-xl border border-white/20 px-4 py-2 text-xs text-white flex items-center gap-2"><RefreshCw size={15}/>{es ? 'Actualizar' : 'Refresh'}</button>
    </header>
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    {message && <p role="status" className="text-xs text-emerald-300">{message}</p>}
    <div className="space-y-3">
      {applications.map(item => <article key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <b className="text-sm text-white">{item.displayName}</b>
          <span className="text-xs text-amber-200">{item.status}</span>
        </div>
        <p className="text-xs text-stone-300">{item.kind} · {item.countryCode} · {item.locality}</p>
        <p className="text-xs text-stone-500">{es ? 'Representación declarada' : 'Representation declared'}: {item.representationDeclared ? (es ? 'Sí (sin verificar)' : 'Yes (unverified)') : (es ? 'No' : 'No')}</p>
        {item.officialSourceUrl && <p className="text-xs text-stone-400 break-all">{es ? 'Fuente declarada' : 'Declared source'}: {item.officialSourceUrl}</p>}
        <label className="block text-xs text-stone-300">{es ? 'Justificación obligatoria (auditable)' : 'Required explanation (audited)'}
          <textarea maxLength={600} value={reason[item.id] || ''} onChange={e => setReason(r => ({ ...r, [item.id]: e.target.value }))} rows={2}
            className="mt-1 w-full rounded-xl border border-white/20 bg-[#0b241b] p-3 text-white" placeholder={es ? 'Describe la revisión o datos pendientes…' : 'Describe the review or missing information…'}/>
        </label>
        <div className="flex flex-wrap gap-2">
          {item.status === 'submitted' && <button disabled={busy !== null} onClick={() => void triage(item.id, 'under_review')}
            className="rounded-lg border border-amber-400/40 px-3 py-2 text-xs text-amber-200 flex gap-2 items-center"><ShieldCheck size={14}/>{es ? 'En revisión' : 'Mark under review'}</button>}
          <button disabled={busy !== null} onClick={() => void triage(item.id, 'needs_information')}
            className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white flex gap-2 items-center"><MessageSquareText size={14}/>{es ? 'Solicitar información' : 'Request information'}</button>
          <button disabled={busy !== null} onClick={() => void triage(item.id, 'rejected')}
            className="rounded-lg border border-rose-400/40 px-3 py-2 text-xs text-rose-200 flex gap-2 items-center"><XCircle size={14}/>{es ? 'Rechazar' : 'Reject'}</button>
        </div>
      </article>)}
      {!applications.length && !error && <p className="text-xs text-stone-400">{es ? 'No hay solicitudes pendientes en la muestra consultada.' : 'No pending applications in the current sample.'}</p>}
    </div>
    <p className="text-[11px] text-stone-500">{es ? 'Muestra limitada a 50 expedientes pendientes. Ninguna acción de esta pantalla activa catálogo, reservas ni pagos.' : 'Limited to 50 pending applications. No action on this screen enables catalog, bookings or payments.'}</p>
  </section>;
}
