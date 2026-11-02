import React, { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, RefreshCw } from 'lucide-react';
import { auth } from '../firebase';

/**
 * "Reservas del asistente" en /admin/leads (solo dueño, solo lectura).
 *
 * Lista las reservas que el chat del cliente crea en `agent_bookings` (status 'pendiente_pago'),
 * más nuevas primero, desde GET /api/admin/agent-bookings (requireOwner). No cambia estados, no
 * cobra ni envía nada: el dueño verifica disponibilidad y envía las instrucciones de pago por su
 * canal. Para operadores (sin rol de dueño) el endpoint responde 403 y el panel no se muestra.
 */

interface AgentBookingRow {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  tourId: string;
  tourTitle: string;
  date: string;
  pax: number | null;
  totalPrice: number | null;
  currency: string;
  language: string | null;
  paymentInstructionsSent: boolean;
  supplierVerified: boolean;
  createdAt: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function AgentBookingsPanel({ es }: { es: boolean }) {
  const [rows, setRows] = useState<AgentBookingRow[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch('/api/admin/agent-bookings?limit=50', { headers: await authHeaders() });
      if (res.status === 401 || res.status === 403) { setState('forbidden'); return; }
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) { setState('error'); return; }
      setRows(Array.isArray(json.bookings) ? json.bookings : []);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (state === 'forbidden') return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-stone-900/70 p-4" data-agent-bookings-panel="true">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="font-bold text-amber-100 flex items-center gap-2"><CalendarCheck className="w-5 h-5" aria-hidden="true" />{es ? 'Reservas del asistente (pendientes de pago)' : 'Assistant bookings (pending payment)'}</h2>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-stone-700 px-3 py-1 text-xs"><RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />{es ? 'Actualizar' : 'Refresh'}</button>
      </div>
      <p className="text-xs text-stone-400 mb-2">{es ? 'Solo lectura. Verifica disponibilidad con el operador y envía al cliente las instrucciones de pago por tu canal. Nada se cobró.' : 'Read only. Verify availability with the operator and send the customer payment instructions through your channel. Nothing was charged.'}</p>
      {state === 'loading' ? <p className="text-sm text-stone-400">{es ? 'Cargando…' : 'Loading…'}</p>
        : state === 'error' ? <p role="alert" className="text-sm text-red-300">{es ? 'No se pudieron cargar las reservas.' : 'Could not load bookings.'}</p>
        : rows.length === 0 ? <p className="text-sm text-stone-400">{es ? 'Sin reservas del asistente.' : 'No assistant bookings.'}</p>
        : (
          <ul className="space-y-2 text-sm">
            {rows.map(b => (
              <li key={b.id} className="rounded-xl border border-stone-700 p-2 flex flex-wrap items-center gap-2" data-agent-booking-row={b.bookingNumber}>
                <span className="font-mono font-bold text-amber-200">{b.bookingNumber}</span>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-100">{b.status}</span>
                <span className="font-semibold">{b.tourTitle || b.tourId || '—'}</span>
                <span className="text-stone-400">· {b.date || '—'} · {b.pax ?? '?'} pax · {b.totalPrice != null ? `${b.currency} ${b.totalPrice.toFixed(2)}` : '—'} · {(b.language || '—').toUpperCase()}</span>
                <span className="text-xs text-stone-500">{b.createdAt ? new Date(b.createdAt).toLocaleString(es ? 'es-CR' : 'en-US', { timeZone: 'America/Costa_Rica' }) : ''}</span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
