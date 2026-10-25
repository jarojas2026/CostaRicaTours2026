import React, { useState } from 'react';
import { CheckCircle2, History, Landmark, Plus, RefreshCw, XCircle } from 'lucide-react';
import { auth } from '../firebase';
import {
  SUPPLIER_PAYOUT_STATE_LABEL, describeSupplierPayoutError, formatCRC,
  validateManualPaymentForm, validateSupplierPayoutForm, type SupplierPayoutView,
} from './supplierPayoutMessages';

/**
 * "Pagos a proveedores" de un lead en /admin/leads (solo dueño).
 *
 * Registro MANUAL: el dueño paga al proveedor por SINPE o transferencia FUERA de la plataforma
 * y aquí lo registra. Esta pantalla no ejecuta pagos, no llama a SINPE ni a bancos y no pide
 * números SINPE de clientes (docs/REGLAS_PLATAFORMA.md §7, Ley 7786 art. 15).
 *
 * Endpoints (backend/leadSupplierPayouts.ts, requireOwner):
 * - GET  /api/admin/leads/:id/supplier-payouts
 * - POST /api/admin/leads/:id/supplier-payouts
 * - POST /api/admin/leads/:id/supplier-payouts/:payoutId/approve | mark-paid | cancel
 */

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function newRequestId(): string {
  const c: any = (globalThis as any).crypto;
  return c?.randomUUID ? `req_${c.randomUUID().replace(/-/g, '')}` : `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function todayCR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
}

export function SupplierPayoutsPanel({ leadId, es }: { leadId: string; es: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [payouts, setPayouts] = useState<SupplierPayoutView[]>([]);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ proveedor: '', montoCRC: '', concepto: '' });
  const [requestId, setRequestId] = useState(newRequestId);
  const [paying, setPaying] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ metodo: 'sinpe' as 'sinpe' | 'transferencia', referencia: '', fechaPago: todayCR(), note: '' });

  const base = `/api/admin/leads/${encodeURIComponent(leadId)}/supplier-payouts`;
  const call = async (path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(await authHeaders()) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    let json: any = {};
    try { json = await res.json(); } catch { /* sin JSON */ }
    return { ok: res.ok, status: res.status, json };
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch (e: any) { setError(e?.message || 'Error'); } finally { setBusy(false); }
  };

  const apply = (r: { ok: boolean; status: number; json: any }) => {
    if (!r.ok) { setError(describeSupplierPayoutError(r.status, r.json, es)); return false; }
    if (Array.isArray(r.json.payouts)) setPayouts(r.json.payouts);
    return true;
  };

  const load = () => run(async () => {
    const r = await call('');
    if (apply(r)) { setVerified(Boolean(r.json.pagoClienteVerificado)); setLoaded(true); }
  });

  const create = () => run(async () => {
    const invalid = validateSupplierPayoutForm(form, es);
    if (invalid) { setError(invalid); return; }
    const r = await call('', { proveedor: form.proveedor.trim(), montoCRC: form.montoCRC.trim(), concepto: form.concepto.trim(), clientRequestId: requestId });
    if (apply(r)) { setForm({ proveedor: '', montoCRC: '', concepto: '' }); setRequestId(newRequestId()); }
  });

  const approve = (id: string) => run(async () => { apply(await call(`/${encodeURIComponent(id)}/approve`, {})); });

  const markPaid = (id: string) => run(async () => {
    const invalid = validateManualPaymentForm(payForm, es);
    if (invalid) { setError(invalid); return; }
    const r = await call(`/${encodeURIComponent(id)}/mark-paid`, { metodo: payForm.metodo, referencia: payForm.referencia.trim(), fechaPago: payForm.fechaPago, note: payForm.note.trim() || undefined });
    if (apply(r)) { setPaying(null); setPayForm({ metodo: 'sinpe', referencia: '', fechaPago: todayCR(), note: '' }); }
  });

  const cancel = (id: string) => run(async () => {
    const reason = window.prompt(es ? 'Motivo de la cancelación' : 'Cancellation reason') || '';
    if (reason.trim().length < 3) { setError(es ? 'Motivo de cancelación requerido.' : 'Cancellation reason required.'); return; }
    apply(await call(`/${encodeURIComponent(id)}/cancel`, { reason: reason.trim() }));
  });

  const input = 'bg-stone-950 border border-stone-700 rounded-lg px-2 py-1.5';

  return (
    <div className="rounded-xl border border-emerald-500/30 p-3 space-y-2" data-supplier-payouts="true">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="inline-flex items-center gap-1 text-emerald-100"><Landmark className="w-4 h-4" aria-hidden="true" />{es ? 'Pagos a proveedores (registro manual)' : 'Supplier payments (manual record)'}</strong>
        <button type="button" disabled={busy} onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-stone-600 px-3 py-1.5 text-xs disabled:opacity-40"><RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />{loaded ? (es ? 'Actualizar' : 'Refresh') : (es ? 'Ver pagos a proveedores' : 'Show supplier payments')}</button>
      </div>
      <p className="text-xs text-stone-400">{es
        ? 'El sistema no realiza pagos ni transferencias SINPE. Pagás al proveedor fuera de la plataforma y aquí solo registrás referencia y fecha. Solo se puede registrar cuando el pago del cliente está verificado por el servidor.'
        : 'The system does not make payments or SINPE transfers. You pay the supplier outside the platform and only record the reference and date here. It can only be recorded once the customer payment is verified by the server.'}</p>

      {loaded && verified === false && (
        <p className="text-xs text-amber-200" data-supplier-payouts-blocked="true">{es ? 'Pago del cliente sin verificar: no se pueden crear pagos a proveedores.' : 'Customer payment not verified: supplier payments cannot be created.'}</p>
      )}

      {loaded && verified && (
        <div className="flex flex-wrap items-end gap-2">
          <input value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })} aria-label={es ? 'Proveedor' : 'Supplier'} placeholder={es ? 'Proveedor' : 'Supplier'} maxLength={120} className={input} />
          <input value={form.montoCRC} onChange={e => setForm({ ...form, montoCRC: e.target.value })} aria-label={es ? 'Monto en colones' : 'Amount in CRC'} placeholder="₡" inputMode="decimal" className={`${input} w-28`} />
          <input value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} aria-label={es ? 'Concepto' : 'Concept'} placeholder={es ? 'Concepto (tour, transporte…)' : 'Concept (tour, transport…)'} maxLength={300} className={`${input} flex-1 min-w-[10rem]`} />
          <button type="button" disabled={busy} onClick={() => void create()} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 font-bold text-stone-950 disabled:opacity-50" data-supplier-payout-create="true"><Plus className="w-4 h-4" aria-hidden="true" />{es ? 'Crear (pendiente de aprobación)' : 'Create (pending approval)'}</button>
        </div>
      )}

      {loaded && payouts.length === 0 && <p className="text-xs text-stone-400">{es ? 'Sin pagos a proveedores registrados.' : 'No supplier payments recorded.'}</p>}

      {payouts.length > 0 && (
        <ul className="space-y-2">
          {payouts.map(p => (
            <li key={p.id} className="rounded-lg border border-stone-700 p-2 text-xs text-stone-300" data-supplier-payout-state={p.estado}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><strong className="text-stone-100">{p.proveedor}</strong> · {formatCRC(p.montoCRC, es)} · {p.concepto}</span>
                <span className="rounded-full bg-stone-800 px-2 py-0.5 font-bold">{SUPPLIER_PAYOUT_STATE_LABEL[p.estado][es ? 'es' : 'en']}</span>
              </div>
              {p.estado === 'pagado_manual' && (
                <div className="mt-1 text-stone-400">{es ? 'Pagado fuera del sistema' : 'Paid outside the system'}: {p.metodo === 'sinpe' ? 'SINPE' : (es ? 'transferencia' : 'transfer')} · {es ? 'ref.' : 'ref.'} {p.referencia} · {p.fechaPago}</div>
              )}
              {p.estado === 'cancelado' && p.motivoCancelacion && <div className="mt-1 text-stone-400">{es ? 'Motivo' : 'Reason'}: {p.motivoCancelacion}</div>}
              <div className="mt-2 flex flex-wrap gap-2">
                {p.estado === 'pendiente_aprobacion' && (
                  <button type="button" disabled={busy} onClick={() => void approve(p.id)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/50 px-2 py-1 text-emerald-100 disabled:opacity-40"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />{es ? 'Aprobar' : 'Approve'}</button>
                )}
                {p.estado === 'aprobado' && paying !== p.id && (
                  <button type="button" disabled={busy} onClick={() => setPaying(p.id)} className="inline-flex items-center gap-1 rounded-lg border border-sky-500/50 px-2 py-1 text-sky-100 disabled:opacity-40">{es ? 'Registrar pago manual' : 'Record manual payment'}</button>
                )}
                {(p.estado === 'pendiente_aprobacion' || p.estado === 'aprobado') && (
                  <button type="button" disabled={busy} onClick={() => void cancel(p.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-2 py-1 text-red-200 disabled:opacity-40"><XCircle className="w-3.5 h-3.5" aria-hidden="true" />{es ? 'Cancelar' : 'Cancel'}</button>
                )}
              </div>
              {paying === p.id && (
                <div className="mt-2 flex flex-wrap items-end gap-2" data-supplier-payout-markpaid="true">
                  <select value={payForm.metodo} onChange={e => setPayForm({ ...payForm, metodo: e.target.value as 'sinpe' | 'transferencia' })} aria-label={es ? 'Método' : 'Method'} className={input}>
                    <option value="sinpe">SINPE</option>
                    <option value="transferencia">{es ? 'Transferencia' : 'Bank transfer'}</option>
                  </select>
                  <input value={payForm.referencia} onChange={e => setPayForm({ ...payForm, referencia: e.target.value })} aria-label={es ? 'Referencia del comprobante' : 'Receipt reference'} placeholder={es ? 'Referencia' : 'Reference'} maxLength={40} className={input} />
                  <input type="date" value={payForm.fechaPago} max={todayCR()} onChange={e => setPayForm({ ...payForm, fechaPago: e.target.value })} aria-label={es ? 'Fecha del pago' : 'Payment date'} className={input} />
                  <input value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} aria-label={es ? 'Nota' : 'Note'} placeholder={es ? 'Nota (opcional)' : 'Note (optional)'} maxLength={300} className={input} />
                  <button type="button" disabled={busy} onClick={() => void markPaid(p.id)} className="rounded-lg bg-sky-500 px-3 py-1.5 font-bold text-stone-950 disabled:opacity-50">{es ? 'Guardar registro' : 'Save record'}</button>
                  <button type="button" onClick={() => setPaying(null)} className="rounded-lg border border-stone-600 px-3 py-1.5">{es ? 'Cerrar' : 'Close'}</button>
                  <span className="w-full text-stone-400">{es ? 'Registrá solo un pago que ya hiciste vos desde tu banco.' : 'Only record a payment you already made from your bank.'}</span>
                </div>
              )}
              <details className="mt-2">
                <summary className="inline-flex cursor-pointer items-center gap-1 text-stone-400"><History className="w-3.5 h-3.5" aria-hidden="true" />{es ? 'Historial' : 'History'}</summary>
                <ol className="mt-1 list-decimal pl-5 text-stone-400">
                  {p.audit.map((a, i) => (
                    <li key={`${a.at}-${i}`}>{new Date(a.at).toLocaleString(es ? 'es-CR' : 'en-US')} · {a.by} · {a.from ? `${a.from} → ` : ''}{a.to}{a.note ? ` · ${a.note}` : ''}</li>
                  ))}
                </ol>
              </details>
            </li>
          ))}
        </ul>
      )}

      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
