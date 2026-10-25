import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardCopy, Inbox, RefreshCw, ShieldCheck, Trash2, Undo2 } from 'lucide-react';
import type { Language } from '../types';
import { auth } from '../firebase';
import { LeadPaymentPanel } from '../components/LeadPaymentPanel';
import { SupplierPayoutsPanel } from '../components/SupplierPayoutsPanel';

type LeadStatus = 'nuevo' | 'cotizando' | 'esperando_operador' | 'confirmado_por_escrito' | 'pagado' | 'cancelado';

const NEXT: Record<LeadStatus, LeadStatus[]> = {
  nuevo: ['cotizando', 'cancelado'],
  cotizando: ['esperando_operador', 'cancelado'],
  esperando_operador: ['confirmado_por_escrito', 'cotizando', 'cancelado'],
  confirmado_por_escrito: ['pagado', 'cancelado'],
  pagado: [],
  cancelado: [],
};
const STATUSES = Object.keys(NEXT) as LeadStatus[];
const NEEDS_EVIDENCE: LeadStatus[] = ['confirmado_por_escrito', 'pagado'];
type TriageState = 'activo' | 'spam' | 'duplicado' | 'descartado';
type Priority = 'alta' | 'media' | 'baja';
const TRIAGE_STATES: TriageState[] = ['activo', 'spam', 'duplicado', 'descartado'];
const PRIORITIES: Priority[] = ['alta', 'media', 'baja'];
const TRIAGE_LABEL: Record<TriageState, { es: string; en: string }> = {
  activo: { es: 'Activo', en: 'Active' },
  spam: { es: 'Spam', en: 'Spam' },
  duplicado: { es: 'Duplicado', en: 'Duplicate' },
  descartado: { es: 'Descartado', en: 'Discarded' },
};
const PRIORITY_LABEL: Record<Priority, { es: string; en: string }> = {
  alta: { es: 'Prioridad alta', en: 'High priority' },
  media: { es: 'Prioridad media', en: 'Medium priority' },
  baja: { es: 'Prioridad baja', en: 'Low priority' },
};
const PRIORITY_CLASS: Record<Priority, string> = {
  alta: 'bg-rose-500/20 text-rose-200',
  media: 'bg-sky-500/20 text-sky-200',
  baja: 'bg-stone-500/20 text-stone-300',
};
const REASON_LABEL: Record<string, { es: string; en: string }> = {
  sin_contacto_valido: { es: 'sin contacto válido', en: 'no valid contact' },
  texto_basura: { es: 'texto sin contenido', en: 'empty/junk text' },
  duplicado_24h: { es: 'mismo correo y tour en 24 h', en: 'same email and tour within 24h' },
  descartado_manual: { es: 'descartado a mano', en: 'manually discarded' },
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Lead {
  id: string;
  status: LeadStatus;
  sources: string[];
  createdAt: string;
  lastActivityAt: string;
  inquiryCount: number;
  language: 'es' | 'en';
  request: Record<string, any>;
  referenceQuote?: { line: string };
  consent: { dataProcessing: boolean };
  contact: { name?: string; email?: string; phone?: string } | null;
  contactRedacted: boolean;
  messageSnippet?: string;
  operatorCandidates: Array<{ operatorId: string; name: string; region: string; reasons: string[] }>;
  quoteRequestDrafts: Array<{ operatorId: string; operatorName: string; language: 'es' | 'en'; subject: string; body: string }>;
  triage?: { state: TriageState; priority: Priority; reasons: string[]; auto: boolean; duplicateOf?: string };
  bookingId?: string;
  followUp?: { status: 'borrador_no_enviado' | 'enviado' | 'envio_fallido'; language: 'es' | 'en'; missing: Array<'fecha' | 'pax'>; to?: string; subject: string; body: string; sentAt?: string; error?: string };
}

const FOLLOW_UP_STATUS: Record<NonNullable<Lead['followUp']>['status'], { es: string; en: string }> = {
  borrador_no_enviado: { es: 'borrador, no enviado', en: 'draft, not sent' },
  enviado: { es: 'enviado', en: 'sent' },
  envio_fallido: { es: 'envío fallido', en: 'send failed' },
};
const MISSING_LABEL: Record<'fecha' | 'pax', { es: string; en: string }> = {
  fecha: { es: 'fecha', en: 'date' },
  pax: { es: 'pax', en: 'party size' },
};

export function LeadsPipelinePage({ language }: { language: Language }) {
  const es = language === 'es';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<LeadStatus | ''>('');
  const [triageFilter, setTriageFilter] = useState<TriageState | ''>('activo');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ status?: LeadStatus; note: string; evidence: string }>({ note: '', evidence: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (triageFilter) params.set('triage', triageFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      const qs = params.toString();
      const res = await fetch(`/api/admin/leads${qs ? `?${qs}` : ''}`, { headers: await authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Error');
      setLeads(Array.isArray(json.leads) ? json.leads : []);
      setSelected(new Set());
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, [filter, triageFilter, priorityFilter]);

  useEffect(() => { void load(); }, [load]);

  const changeStatus = async (lead: Lead) => {
    if (!form.status) return;
    setError('');
    const res = await fetch(`/api/admin/leads/${lead.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ status: form.status, note: form.note || undefined, evidence: form.evidence || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.message || json.error || 'Error'); return; }
    setForm({ note: '', evidence: '' });
    await load();
  };

  const bulkTriage = async (action: 'descartar' | 'restaurar', ids: string[]) => {
    if (!ids.length) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/leads/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ ids, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || json.error || 'Error');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allSelected = leads.length > 0 && leads.every(l => selected.has(l.id));

  const hoursSince = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 3_600_000);

  return (
    <section className="max-w-6xl mx-auto px-4 py-10 text-stone-100" data-leads-pipeline="true">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Inbox className="w-6 h-6 text-emerald-400" aria-hidden="true" />{es ? 'Pipeline de leads' : 'Leads pipeline'}</h1>
          <p className="text-xs text-stone-400 mt-1">{es ? 'Operadores = prospectos sin contrato. Los borradores no se envían automáticamente. Precios: referencia, sujeto a confirmación.' : 'Operators are unsigned prospects. Drafts are never sent automatically. Prices are references, subject to confirmation.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label={es ? 'Filtrar por estado' : 'Filter by status'} value={filter} onChange={e => setFilter(e.target.value as LeadStatus | '')} className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-sm">
            <option value="">{es ? 'Todos los estados' : 'All statuses'}</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label={es ? 'Filtrar por triaje' : 'Filter by triage'} value={triageFilter} onChange={e => setTriageFilter(e.target.value as TriageState | '')} className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-sm" data-leads-triage-filter="true">
            <option value="">{es ? 'Todo el triaje' : 'Any triage'}</option>
            {TRIAGE_STATES.map(t => <option key={t} value={t}>{TRIAGE_LABEL[t][es ? 'es' : 'en']}</option>)}
          </select>
          <select aria-label={es ? 'Filtrar por prioridad' : 'Filter by priority'} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as Priority | '')} className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-sm" data-leads-priority-filter="true">
            <option value="">{es ? 'Toda prioridad' : 'Any priority'}</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p][es ? 'es' : 'en']}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-stone-700 px-3 py-1.5 text-sm"><RefreshCw className="w-4 h-4" aria-hidden="true" />{es ? 'Actualizar' : 'Refresh'}</button>
        </div>
      </div>
      {leads.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(leads.map(l => l.id)))} aria-label={es ? 'Seleccionar todos' : 'Select all'} className="h-4 w-4 accent-emerald-500" />
            {es ? 'Seleccionar todos' : 'Select all'}
          </label>
          <button type="button" disabled={!selected.size || busy} onClick={() => void bulkTriage('descartar', Array.from(selected))} className="inline-flex items-center gap-1 rounded-lg border border-rose-500/50 px-3 py-1.5 font-bold text-rose-200 disabled:opacity-40" data-leads-discard="true">
            <Trash2 className="w-4 h-4" aria-hidden="true" />{es ? `Descartar seleccionados (${selected.size})` : `Discard selected (${selected.size})`}
          </button>
          <button type="button" disabled={!selected.size || busy} onClick={() => void bulkTriage('restaurar', Array.from(selected))} className="inline-flex items-center gap-1 rounded-lg border border-stone-600 px-3 py-1.5 disabled:opacity-40">
            <Undo2 className="w-4 h-4" aria-hidden="true" />{es ? 'Restaurar' : 'Restore'}
          </button>
        </div>
      )}
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      {loading ? <p className="text-stone-400">{es ? 'Cargando…' : 'Loading…'}</p> : leads.length === 0 ? <p className="text-stone-400">{es ? 'No hay leads.' : 'No leads.'}</p> : (
        <ul className="space-y-3">
          {leads.map(lead => {
            const r = lead.request || {};
            const t = lead.triage;
            const stale = (!t || t.state === 'activo') && ['nuevo', 'cotizando', 'esperando_operador'].includes(lead.status) && hoursSince(lead.lastActivityAt) > 24;
            return (
              <li key={lead.id} className={`rounded-2xl border border-stone-700 bg-stone-900/70 p-4 ${t && t.state !== 'activo' ? 'opacity-70' : ''}`}>
                <div className="flex items-start gap-3">
                <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggle(lead.id)} aria-label={es ? `Seleccionar lead ${lead.id}` : `Select lead ${lead.id}`} className="mt-1 h-4 w-4 shrink-0 accent-emerald-500" />
                <button type="button" className="w-full text-left" onClick={() => setOpen(open === lead.id ? null : lead.id)} aria-expanded={open === lead.id}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-200">{lead.status}</span>
                    {t && <span className={`rounded-full px-2 py-0.5 font-bold ${PRIORITY_CLASS[t.priority]}`}>{PRIORITY_LABEL[t.priority][es ? 'es' : 'en']}</span>}
                    {lead.followUp && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-bold text-amber-200">{es ? 'Falta' : 'Missing'}: {lead.followUp.missing.map(m => MISSING_LABEL[m][es ? 'es' : 'en']).join(' + ')}</span>}
                    {t && t.state !== 'activo' && <span className="rounded-full bg-stone-700 px-2 py-0.5 font-bold text-stone-200" title={t.reasons.map(r => REASON_LABEL[r]?.[es ? 'es' : 'en'] || r).join(', ')}>{TRIAGE_LABEL[t.state][es ? 'es' : 'en']}{t.reasons.length ? ` · ${t.reasons.map(r => REASON_LABEL[r]?.[es ? 'es' : 'en'] || r).join(', ')}` : ''}</span>}
                    {stale && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-bold text-amber-200">{es ? `sin respuesta ${hoursSince(lead.lastActivityAt)}h` : `no reply ${hoursSince(lead.lastActivityAt)}h`}</span>}
                    <span className="font-semibold">{r.tourTitle || r.activityLabel || r.regionLabel || (es ? 'Consulta general' : 'General inquiry')}</span>
                    <span className="text-stone-400">· {r.date || (r.month ? `mes ${r.month}` : es ? 'sin fecha' : 'no date')} · {r.people ? `${r.people} pax` : 'pax ?'} · {lead.sources.join('+')} · ×{lead.inquiryCount}</span>
                  </div>
                  {lead.referenceQuote && <div className="text-xs text-amber-200 mt-1">{lead.referenceQuote.line}</div>}
                </button>
                </div>
                {open === lead.id && (
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="flex items-center gap-1 text-xs text-stone-300"><ShieldCheck className="w-4 h-4" aria-hidden="true" />
                      {lead.consent.dataProcessing
                        ? `${es ? 'Consentimiento Ley 8968' : 'Consent (Ley 8968)'}: ${[lead.contact?.name, lead.contact?.email, lead.contact?.phone].filter(Boolean).join(' · ') || '—'}`
                        : es ? 'Sin consentimiento: datos de contacto no guardados.' : 'No consent: contact details not stored.'}
                    </div>
                    {lead.messageSnippet && <p className="text-stone-300 italic">“{lead.messageSnippet}”</p>}
                    {t && t.state !== 'activo' && (
                      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-700 p-2 text-xs text-stone-300">
                        <span>{es ? 'Triaje' : 'Triage'}: {TRIAGE_LABEL[t.state][es ? 'es' : 'en']} ({t.auto ? (es ? 'automático' : 'automatic') : (es ? 'manual' : 'manual')}){t.duplicateOf ? ` · ${es ? 'duplicado de' : 'duplicate of'} ${t.duplicateOf}` : ''}</span>
                        <button type="button" disabled={busy} onClick={() => void bulkTriage('restaurar', [lead.id])} className="inline-flex items-center gap-1 rounded-lg border border-stone-600 px-2 py-1"><Undo2 className="w-3.5 h-3.5" aria-hidden="true" />{es ? 'Restaurar' : 'Restore'}</button>
                      </div>
                    )}
                    {lead.followUp && (
                      <div className="rounded-xl border border-amber-500/30 p-3" data-lead-followup="true">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-amber-100">{es ? 'Correo para completar datos' : 'Follow-up to complete details'} · {lead.followUp.language.toUpperCase()} · {FOLLOW_UP_STATUS[lead.followUp.status][es ? 'es' : 'en']}{lead.followUp.sentAt ? ` (${new Date(lead.followUp.sentAt).toLocaleString(es ? 'es-CR' : 'en-US')})` : ''}</strong>
                          <button type="button" onClick={() => void navigator.clipboard?.writeText(`${lead.followUp!.subject}\n\n${lead.followUp!.body}`)} className="inline-flex items-center gap-1 text-xs text-emerald-300"><ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" />{es ? 'Copiar' : 'Copy'}</button>
                        </div>
                        {lead.followUp.to && <div className="text-xs text-stone-400 mt-1">{es ? 'Para' : 'To'}: {lead.followUp.to}</div>}
                        <pre className="whitespace-pre-wrap text-xs text-stone-300 mt-1">{lead.followUp.subject}{'\n\n'}{lead.followUp.body}</pre>
                        {lead.followUp.error && <p className="text-xs text-red-300 mt-1">{lead.followUp.error}</p>}
                      </div>
                    )}
                    <LeadPaymentPanel leadId={lead.id} bookingId={lead.bookingId} es={es} onChanged={() => void load()} />
                    <SupplierPayoutsPanel leadId={lead.id} es={es} />
                    <div>
                      <h2 className="font-bold text-stone-200">{es ? 'Operadores candidatos (prospectos)' : 'Candidate operators (prospects)'}</h2>
                      {lead.operatorCandidates.length === 0 ? <p className="text-stone-400">{es ? 'Sin coincidencias.' : 'No matches.'}</p> : (
                        <ul className="list-disc pl-5 text-stone-300">{lead.operatorCandidates.map(c => <li key={c.operatorId}>{c.name} — {c.region} ({c.reasons.join(', ')})</li>)}</ul>
                      )}
                    </div>
                    {lead.quoteRequestDrafts.length > 0 && (
                      <details>
                        <summary className="cursor-pointer font-bold text-stone-200">{es ? 'Borradores de solicitud de cotización (no enviados)' : 'Quote-request drafts (not sent)'}</summary>
                        <div className="mt-2 space-y-2">
                          {lead.quoteRequestDrafts.map(d => (
                            <div key={`${d.operatorId}-${d.language}`} className="rounded-xl border border-stone-700 p-3">
                              <div className="flex items-center justify-between gap-2"><strong>{d.operatorName} · {d.language.toUpperCase()}</strong>
                                <button type="button" onClick={() => void navigator.clipboard?.writeText(`${d.subject}\n\n${d.body}`)} className="inline-flex items-center gap-1 text-xs text-emerald-300"><ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" />{es ? 'Copiar' : 'Copy'}</button>
                              </div>
                              <pre className="whitespace-pre-wrap text-xs text-stone-300 mt-1">{d.subject}{'\n\n'}{d.body}</pre>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    {NEXT[lead.status].length > 0 && (
                      <div className="flex flex-wrap items-end gap-2">
                        <select aria-label={es ? 'Nuevo estado' : 'New status'} value={form.status || ''} onChange={e => setForm(f => ({ ...f, status: (e.target.value || undefined) as LeadStatus | undefined }))} className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1.5">
                          <option value="">{es ? 'Cambiar estado…' : 'Change status…'}</option>
                          {NEXT[lead.status].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {form.status && NEEDS_EVIDENCE.includes(form.status) && (
                          <input value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))} placeholder={es ? 'Evidencia escrita (ref. correo/WhatsApp/comprobante)' : 'Written evidence (email/WhatsApp/receipt ref.)'} className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1.5 min-w-64" />
                        )}
                        <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder={es ? 'Nota (opcional)' : 'Note (optional)'} className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1.5" />
                        <button type="button" disabled={!form.status} onClick={() => void changeStatus(lead)} className="rounded-lg bg-emerald-500 px-3 py-1.5 font-bold text-stone-950 disabled:opacity-50">{es ? 'Guardar' : 'Save'}</button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
