import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardCopy, Inbox, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Language } from '../types';
import { auth } from '../firebase';

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
}

export function LeadsPipelinePage({ language }: { language: Language }) {
  const es = language === 'es';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<LeadStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ status?: LeadStatus; note: string; evidence: string }>({ note: '', evidence: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/leads${filter ? `?status=${filter}` : ''}`, { headers: await authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Error');
      setLeads(Array.isArray(json.leads) ? json.leads : []);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

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
            <option value="">{es ? 'Todos' : 'All'}</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-stone-700 px-3 py-1.5 text-sm"><RefreshCw className="w-4 h-4" aria-hidden="true" />{es ? 'Actualizar' : 'Refresh'}</button>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      {loading ? <p className="text-stone-400">{es ? 'Cargando…' : 'Loading…'}</p> : leads.length === 0 ? <p className="text-stone-400">{es ? 'No hay leads.' : 'No leads.'}</p> : (
        <ul className="space-y-3">
          {leads.map(lead => {
            const r = lead.request || {};
            const stale = ['nuevo', 'cotizando', 'esperando_operador'].includes(lead.status) && hoursSince(lead.lastActivityAt) > 24;
            return (
              <li key={lead.id} className="rounded-2xl border border-stone-700 bg-stone-900/70 p-4">
                <button type="button" className="w-full text-left" onClick={() => setOpen(open === lead.id ? null : lead.id)} aria-expanded={open === lead.id}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-200">{lead.status}</span>
                    {stale && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-bold text-amber-200">{es ? `sin respuesta ${hoursSince(lead.lastActivityAt)}h` : `no reply ${hoursSince(lead.lastActivityAt)}h`}</span>}
                    <span className="font-semibold">{r.tourTitle || r.activityLabel || r.regionLabel || (es ? 'Consulta general' : 'General inquiry')}</span>
                    <span className="text-stone-400">· {r.date || (r.month ? `mes ${r.month}` : es ? 'sin fecha' : 'no date')} · {r.people ? `${r.people} pax` : 'pax ?'} · {lead.sources.join('+')} · ×{lead.inquiryCount}</span>
                  </div>
                  {lead.referenceQuote && <div className="text-xs text-amber-200 mt-1">{lead.referenceQuote.line}</div>}
                </button>
                {open === lead.id && (
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="flex items-center gap-1 text-xs text-stone-300"><ShieldCheck className="w-4 h-4" aria-hidden="true" />
                      {lead.consent.dataProcessing
                        ? `${es ? 'Consentimiento Ley 8968' : 'Consent (Ley 8968)'}: ${[lead.contact?.name, lead.contact?.email, lead.contact?.phone].filter(Boolean).join(' · ') || '—'}`
                        : es ? 'Sin consentimiento: datos de contacto no guardados.' : 'No consent: contact details not stored.'}
                    </div>
                    {lead.messageSnippet && <p className="text-stone-300 italic">“{lead.messageSnippet}”</p>}
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
