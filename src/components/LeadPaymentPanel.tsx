import React, { useState } from 'react';
import { CreditCard, ClipboardCopy, Link2, RefreshCw } from 'lucide-react';
import { auth } from '../firebase';
import { describeLeadPaymentError, describeVoucherReason, isValidBookingIdInput, type LeadPaymentStatusView } from './leadPaymentMessages';

/**
 * Panel de pago de un lead en /admin/leads (solo dueño).
 *
 * Usa los endpoints ya existentes en backend (#439 / #441):
 * - POST /api/admin/leads/:id/link-booking   enlaza una reserva existente al lead
 * - POST /api/admin/leads/:id/payment-link   genera checkout Stripe TEST de esa reserva
 * - GET  /api/admin/leads/:id/payment-status solo lectura del estado de pago
 *
 * La UI nunca marca nada como pagado: el pago solo se confirma por webhook firmado
 * o retorno verificado en el servidor. No hay modo LIVE desde aquí.
 */

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function LeadPaymentPanel({ leadId, bookingId: initialBookingId, es, onChanged }: { leadId: string; bookingId?: string; es: boolean; onChanged?: () => void }) {
  const [bookingId, setBookingId] = useState(initialBookingId || '');
  const [bookingInput, setBookingInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState<{ url: string; mode?: string } | null>(null);
  const [status, setStatus] = useState<LeadPaymentStatusView | null>(null);

  const call = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/${path}`, {
      ...init,
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(await authHeaders()) },
    });
    let json: any = {};
    try { json = await res.json(); } catch { /* respuesta sin JSON */ }
    return { ok: res.ok, status: res.status, json };
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch (e: any) { setError(e?.message || 'Error'); } finally { setBusy(false); }
  };

  const linkBooking = () => run(async () => {
    const id = bookingInput.trim();
    if (!isValidBookingIdInput(id)) { setError(es ? 'ID de reserva inválido (A-Z, 0-9, _ o -).' : 'Invalid booking ID (A-Z, 0-9, _ or -).'); return; }
    const r = await call('link-booking', { method: 'POST', body: JSON.stringify({ bookingId: id }) });
    if (!r.ok) { setError(describeLeadPaymentError(r.status, r.json, es)); return; }
    setBookingId(String(r.json.bookingId || id));
    setBookingInput('');
    onChanged?.();
  });

  const createLink = () => run(async () => {
    const r = await call('payment-link', { method: 'POST' });
    if (!r.ok || !r.json?.url) { setError(describeLeadPaymentError(r.status, r.json, es)); return; }
    setLink({ url: String(r.json.url), mode: r.json.mode });
  });

  const loadStatus = () => run(async () => {
    const r = await call('payment-status');
    if (!r.ok) { setError(describeLeadPaymentError(r.status, r.json, es)); return; }
    setStatus(r.json as LeadPaymentStatusView);
  });

  return (
    <div className="rounded-xl border border-sky-500/30 p-3 space-y-2" data-lead-payment="true">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="inline-flex items-center gap-1 text-sky-100"><CreditCard className="w-4 h-4" aria-hidden="true" />{es ? 'Pago (Stripe TEST)' : 'Payment (Stripe TEST)'}</strong>
        <span className="text-xs text-stone-400">{bookingId ? `${es ? 'Reserva' : 'Booking'}: ${bookingId}` : (es ? 'Sin reserva enlazada' : 'No linked booking')}</span>
      </div>

      {!bookingId && (
        <div className="flex flex-wrap items-end gap-2">
          <input value={bookingInput} onChange={e => setBookingInput(e.target.value)} aria-label={es ? 'ID de reserva' : 'Booking ID'} placeholder={es ? 'ID de reserva existente' : 'Existing booking ID'} className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1.5" data-lead-booking-input="true" />
          <button type="button" disabled={busy || !bookingInput.trim()} onClick={() => void linkBooking()} className="inline-flex items-center gap-1 rounded-lg border border-sky-500/50 px-3 py-1.5 text-sky-100 disabled:opacity-40"><Link2 className="w-4 h-4" aria-hidden="true" />{es ? 'Enlazar reserva' : 'Link booking'}</button>
        </div>
      )}

      {bookingId && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={() => void createLink()} className="rounded-lg bg-sky-500 px-3 py-1.5 font-bold text-stone-950 disabled:opacity-50" data-lead-payment-link="true">{es ? 'Generar enlace de pago' : 'Create payment link'}</button>
          <button type="button" disabled={busy} onClick={() => void loadStatus()} className="inline-flex items-center gap-1 rounded-lg border border-stone-600 px-3 py-1.5 disabled:opacity-40"><RefreshCw className="w-4 h-4" aria-hidden="true" />{es ? 'Ver estado de pago' : 'Check payment status'}</button>
        </div>
      )}

      {link && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-bold text-amber-200">{(link.mode || 'test').toUpperCase()}</span>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="break-all text-sky-300 underline">{link.url}</a>
          <button type="button" onClick={() => void navigator.clipboard?.writeText(link.url)} className="inline-flex items-center gap-1 text-emerald-300"><ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" />{es ? 'Copiar' : 'Copy'}</button>
          <span className="w-full text-stone-400">{es ? 'Pendiente: solo cuenta como pagado cuando Stripe lo confirme.' : 'Pending: counts as paid only once Stripe confirms it.'}</span>
        </div>
      )}

      {status && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-stone-300" data-lead-payment-status="true">
          <dt>{es ? 'Estado' : 'Status'}</dt><dd>{status.paymentStatus || (es ? 'sin pago' : 'no payment')}</dd>
          <dt>{es ? 'Monto verificado' : 'Verified amount'}</dt><dd>{status.montoVerificado != null ? `$${status.montoVerificado.toFixed(2)} ${status.moneda || 'USD'}` : '—'}</dd>
          <dt>{es ? 'Verificado el' : 'Verified at'}</dt><dd>{status.paymentVerifiedAt ? new Date(status.paymentVerifiedAt).toLocaleString(es ? 'es-CR' : 'en-US') : '—'}</dd>
          <dt>Voucher</dt><dd>{status.voucherElegible ? (es ? 'disponible' : 'available') : `${es ? 'no disponible' : 'not available'}${status.voucherMotivo ? ` (${describeVoucherReason(status.voucherMotivo, es)})` : ''}`}</dd>
        </dl>
      )}

      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
