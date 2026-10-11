import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, RefreshCw, ShieldCheck, Plus, Pencil, Send } from 'lucide-react';
import { auth } from '../firebase';
import type { Language } from '../types';

type Article = {
  id: string; version: number; status: string; visibility: string; category: string;
  titleEs: string; titleEn: string; bodyEs: string; bodyEn: string;
  sourceUrl: string; sourceRef: string; verifiedAt: string; expiresAt: string;
};
type FormData = Pick<Article, 'titleEs'|'titleEn'|'bodyEs'|'bodyEn'|'sourceUrl'|'sourceRef'|'category'|'visibility'|'status'> & {
  verifiedAt: string; expiresAt: string;
};
const initial: FormData = {
  titleEs: '', titleEn: '', bodyEs: '', bodyEn: '', sourceUrl: '', sourceRef: '',
  category: 'support', visibility: 'public', status: 'draft', verifiedAt: '', expiresAt: ''
};
const classes = 'w-full rounded-xl border border-white/15 bg-[#06150f] px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none';
const timeToInput = (iso: string) => iso ? iso.slice(0, 16) : '';
const timeToIso = (value: string) => value ? new Date(value).toISOString() : '';

export function KnowledgeCityPanel({ language }: { language: Language }) {
  const es = language === 'es';
  const [overview, setOverview] = useState<any>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [form, setForm] = useState<FormData>(initial);
  const [editing, setEditing] = useState<Article | null>(null);
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const authorized = useCallback(async (path: string, init: RequestInit = {}) => {
    const user = auth.currentUser;
    if (!user) throw new Error(es ? 'Acceso administrativo requerido.' : 'Administrator sign-in required.');
    const token = await user.getIdToken();
    const response = await fetch('/api/admin/knowledge/' + path, {
      ...init,
      headers: { Authorization: 'Bearer ' + token, ...(init.body ? { 'Content-Type': 'application/json' } : {}) }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Knowledge request failed');
    return data;
  }, [es]);

  const load = useCallback(async () => {
    try {
      const [summary, list] = await Promise.all([authorized('overview'), authorized('articles')]);
      setOverview(summary);
      setArticles(list.articles || []);
      setError('');
    } catch (err: any) { setError(err?.message || 'Error'); }
  }, [authorized]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => { void load(); }, 60000);
    return () => window.clearInterval(interval);
  }, [load]);

  const setField = (key: keyof FormData, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const edit = (article: Article) => {
    setEditing(article);
    setForm({
      titleEs: article.titleEs, titleEn: article.titleEn, bodyEs: article.bodyEs, bodyEn: article.bodyEn,
      sourceUrl: article.sourceUrl || '', sourceRef: article.sourceRef || '',
      category: article.category, visibility: article.visibility, status: article.status,
      verifiedAt: timeToInput(article.verifiedAt), expiresAt: timeToInput(article.expiresAt)
    });
    setAttested(false);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.status === 'published' && !attested) {
      setError(es ? 'Confirma la verificación de la fuente antes de publicar.' : 'Confirm that the source was verified before publishing.');
      return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      const payload = {
        ...form,
        verifiedAt: timeToIso(form.verifiedAt),
        expiresAt: timeToIso(form.expiresAt),
        ...(editing ? { expectedVersion: editing.version } : {})
      };
      await authorized(editing ? 'articles/' + editing.id : 'articles', {
        method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload)
      });
      setMessage(es ? 'Conocimiento guardado con revisión y versión.' : 'Knowledge saved with review and versioning.');
      setEditing(null); setForm(initial); setAttested(false);
      await load();
    } catch (err: any) { setError(err?.message || 'Error'); }
    finally { setBusy(false); }
  };

  const field = (key: keyof FormData, label: string, multi = false) =>
    <label key={key} className="block text-xs font-bold text-stone-300">
      {label}
      {multi
        ? <textarea className={classes + ' mt-1 min-h-24'} value={form[key]} onChange={e => setField(key, e.target.value)} maxLength={3000} required/>
        : <input className={classes + ' mt-1'} value={form[key]} onChange={e => setField(key, e.target.value)}
            type={key === 'verifiedAt' || key === 'expiresAt' ? 'datetime-local' : 'text'}
            required={['titleEs','titleEn','bodyEs','bodyEn'].includes(key)} />}
    </label>;

  return <section aria-label="Knowledge City" className="rounded-3xl border border-emerald-500/20 bg-[#061a13] p-5 md:p-7 space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-black text-white"><BookOpen className="text-amber-300"/>Knowledge City</h2>
        <p className="mt-1 text-xs text-stone-400">{es ? 'Ventas, soporte y artículos aprobados de una misma fuente de verdad. Datos muestreados, no totales contables.' : 'Sales, support and approved knowledge from a shared source of truth. Sampled figures, not accounting totals.'}</p>
      </div>
      <button type="button" className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs text-white" onClick={() => void load()}><RefreshCw size={15}/>{es ? 'Actualizar' : 'Refresh'}</button>
    </header>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        [es ? 'Publicados vigentes' : 'Published and current', overview?.knowledge?.published],
        [es ? 'Vencidos' : 'Expired', overview?.knowledge?.expired],
        [es ? 'Reservas pendientes (muestra)' : 'Pending bookings (sample)', overview?.sales?.awaitingAction],
        [es ? 'Atención por revisar (muestra)' : 'Support requiring review (sample)', overview?.support?.pendingReview]
      ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="text-2xl font-black text-white">{value ?? '—'}</div><div className="mt-1 text-xs text-stone-400">{label}</div>
      </div>)}
    </div>
    <div className="flex flex-wrap gap-3 text-xs text-stone-400">
      <span>{es ? 'Ventas' : 'Sales'}: {overview?.synchronization?.sales || '—'}</span>
      <span>{es ? 'Soporte' : 'Support'}: {overview?.synchronization?.support || '—'}</span>
      <span>Knowledge: {overview?.synchronization?.knowledge || '—'}</span>
      <span>{overview?.generatedAt || ''}</span>
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={e => void save(e)} className="rounded-2xl bg-black/20 p-4 space-y-3">
        <h3 className="flex items-center gap-2 font-bold text-white">{editing ? <Pencil size={16}/> : <Plus size={16}/>} {editing ? (es ? 'Editar artículo' : 'Edit article') : (es ? 'Crear conocimiento' : 'Create knowledge')}</h3>
        <div className="grid sm:grid-cols-2 gap-3">{field('titleEs', 'Título ES')}{field('titleEn', 'Title EN')}</div>
        {field('bodyEs', es ? 'Respuesta ES' : 'Spanish answer', true)}
        {field('bodyEn', es ? 'Respuesta EN' : 'English answer', true)}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs text-stone-300">{es ? 'Categoría' : 'Category'}<select className={classes + ' mt-1'} value={form.category} onChange={e => setField('category', e.target.value)}>{['sales','support','logistics','policies','destinations','operations'].map(v => <option key={v}>{v}</option>)}</select></label>
          <label className="text-xs text-stone-300">{es ? 'Visibilidad' : 'Visibility'}<select className={classes + ' mt-1'} value={form.visibility} onChange={e => setField('visibility', e.target.value)}><option value="public">public</option><option value="internal">internal</option></select></label>
          <label className="text-xs text-stone-300">{es ? 'Estado' : 'Status'}<select className={classes + ' mt-1'} value={form.status} onChange={e => setField('status', e.target.value)}><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></label>
          {field('sourceUrl', 'HTTPS source URL')}
          {field('sourceRef', es ? 'Referencia interna (catalog:..., policy:...)' : 'Internal reference (catalog:..., policy:...)')}
          {field('verifiedAt', es ? 'Verificado el (fecha y hora)' : 'Verified on (date and time)')}
          {field('expiresAt', es ? 'Vence el (fecha y hora)' : 'Expires on (date and time)')}
        </div>
        {form.status === 'published' && <label className="flex items-start gap-2 text-xs text-amber-200"><input type="checkbox" checked={attested} onChange={e => setAttested(e.target.checked)}/><ShieldCheck size={15}/>{es ? 'He revisado la fuente, fecha y vigencia. Autorizo esta publicación.' : 'I reviewed the source, verification date and expiry. I authorize this publication.'}</label>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 font-black text-stone-950 disabled:opacity-50"><Send size={15}/>{busy ? '…' : (es ? 'Guardar' : 'Save')}</button>
          {editing && <button type="button" onClick={() => {setEditing(null);setForm(initial);setAttested(false);}} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white">{es ? 'Cancelar' : 'Cancel'}</button>}
        </div>
      </form>
      <div className="rounded-2xl bg-black/20 p-4">
        <h3 className="mb-3 font-bold text-white">{es ? 'Biblioteca y control editorial' : 'Library and editorial control'} ({articles.length})</h3>
        <div className="max-h-[720px] overflow-y-auto space-y-2">
          {articles.map(article => <div key={article.id} className="rounded-xl border border-white/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <b className="text-sm text-white">{es ? article.titleEs : article.titleEn}</b>
              <button type="button" onClick={() => edit(article)} className="rounded-lg border border-white/20 p-2 text-amber-200" aria-label={es ? 'Editar artículo' : 'Edit article'}><Pencil size={14}/></button>
            </div>
            <div className="mt-1 text-xs text-stone-400">{article.category} · {article.status} · {article.visibility} · v{article.version}</div>
            <div className="mt-1 text-[11px] text-stone-500">{es ? 'Vence:' : 'Expires:'} {article.expiresAt || '—'}</div>
          </div>)}
          {!articles.length && <p className="text-sm text-stone-400">{es ? 'Todavía no hay artículos aprobados. Crea un borrador para comenzar.' : 'No approved articles yet. Create a draft to get started.'}</p>}
        </div>
      </div>
    </div>
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
  </section>;
}
