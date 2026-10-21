import React, { useCallback, useEffect, useState } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, AlertTriangle, LogOut } from 'lucide-react';
import { auth, signInWithGoogle, signOut } from '../firebase';
import { HorizontalBarChart, MonthlyBarChart } from '../components/provider/ProviderSvgCharts';

/**
 * Portal de proveedores v2 (#319–#321): sesión de miembro del proveedor.
 * Todo dato viene del servidor ya acotado al proveedor del token; aquí no se
 * calcula ningún monto. Sin datos de contacto del viajero.
 */

type Me = { providerId: string; providerRole: 'owner' | 'manager' | 'staff' };
type Order = {
  id: string; bookingId?: string; tourName?: string; date?: string; time?: string; status: string;
  adults: number; children: number; pickupLocation?: string; slaDeadline?: string;
  customer?: { displayName?: string; language?: string; specialNeeds?: string; dietaryRestrictions?: string };
};
type Agg = { bookings: number; netUSD: number | null; linesWithoutNet: number; grossUSD?: number | null };
type Sales = { meta: { showGross: boolean; showCommission?: boolean; computedAt: string; sourceCount: number; profileCommissionRate?: number | null; definition: string }; totals: Agg; byMonth: Array<Agg & { period: string }>; byService: Array<Agg & { tourId: string | null; tourName: string | null }>; commissionRates?: number[] };
type Settlements = { periods: Array<{ period: string; totals: Record<string, number | null>; lines: Array<{ bookingRef: string; serviceDate: string; tourName: string | null; netUSD: number | null; netSource: string; settlementStatus: string; settlementReason: string | null }> }> };

const REJECT_REASONS: Array<[string, string]> = [['sin_cupo', 'Sin cupo'], ['clima', 'Clima'], ['mantenimiento', 'Mantenimiento'], ['otro', 'Otro (describa)']];
const STATUS_LABEL: Record<string, string> = { paid: 'Pagado', processing: 'En proceso', eligible: 'Elegible', pending_eligibility: 'Pendiente', blocked: 'Bloqueado' };
const usd = (n: number | null | undefined) => (typeof n === 'number' ? '$' + n.toLocaleString('es-CR', { maximumFractionDigits: 2 }) : 'No disponible');
const pct = (r: number) => (r * 100).toLocaleString('es-CR', { maximumFractionDigits: 2 }) + '%';

export const ProviderPortalV2: React.FC = () => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<'orders' | 'sales' | 'settlements'>('orders');
  const [error, setError] = useState('');

  useEffect(() => onIdTokenChanged(auth, (u) => { setUser(u); setMe(null); setError(''); }), []);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    if (!user) throw new Error('Inicie sesión.');
    const token = await user.getIdToken();
    const r = await fetch(path, { ...init, headers: { ...(init?.headers || {}), Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || 'No se pudo completar la solicitud.');
    return data;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api('/api/provider/v2/me').then((d) => setMe(d.provider)).catch((e) => setError(e.message));
  }, [user, api]);

  if (user === undefined) return <Shell><Loader2 className="animate-spin w-8 h-8 text-emerald-400 mx-auto" /></Shell>;
  if (!user) {
    return (
      <Shell>
        <p className="text-sm text-slate-300">Inicie sesión con la cuenta registrada para su empresa. Si recibió un enlace por correo para una solicitud puntual, ábralo directamente.</p>
        <button onClick={() => signInWithGoogle().catch(() => setError('No se pudo iniciar sesión.'))} className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 p-3 font-black text-sm">Iniciar sesión</button>
        {error && <Err text={error} />}
      </Shell>
    );
  }
  if (!me) return <Shell>{error ? <Err text={error} /> : <Loader2 className="animate-spin w-8 h-8 text-emerald-400 mx-auto" />}<SignOut /></Shell>;

  const tabs: Array<[typeof tab, string]> = [['orders', 'Solicitudes'], ...(me.providerRole !== 'staff' ? [['sales', 'Ventas'] as [typeof tab, string]] : []), ...(me.providerRole === 'owner' ? [['settlements', 'Liquidaciones'] as [typeof tab, string]] : [])];
  return (
    <Shell wide>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} aria-pressed={tab === key} className={(tab === key ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800') + ' rounded-xl px-4 py-2 text-sm font-bold'}>{label}</button>
        ))}
        <span className="ml-auto text-xs text-slate-400">Rol: {me.providerRole}</span>
      </div>
      {tab === 'orders' && <OrdersTab api={api} canDecide={me.providerRole !== 'staff'} />}
      {tab === 'sales' && <SalesTab api={api} />}
      {tab === 'settlements' && <SettlementsTab api={api} />}
      <SignOut />
    </Shell>
  );
};

function OrdersTab({ api, canDecide }: { api: (p: string, i?: RequestInit) => Promise<any>; canDecide: boolean }) {
  const [filter, setFilter] = useState('pending');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [reason, setReason] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setOrders(null); setError('');
    api('/api/provider/v2/orders?status=' + filter).then((d) => setOrders(d.orders || [])).catch((e) => setError(e.message));
  }, [api, filter]);
  useEffect(load, [load]);

  const decide = async (order: Order, decision: 'accept' | 'reject') => {
    if (busy) return;
    setBusy(order.id); setError(''); setMessage('');
    try {
      await api(`/api/provider/v2/orders/${encodeURIComponent(order.id)}/${decision}`, { method: 'POST', body: JSON.stringify({ reason: reason[order.id], notes: notes[order.id] || '' }) });
      setMessage(decision === 'accept' ? 'Aceptación registrada. El pago y el aviso al viajero se verifican por separado.' : 'Rechazo registrado. Costa Rica Tours gestionará la reasignación.');
      load();
    } catch (e: any) { setError(e.message); } finally { setBusy(''); }
  };

  return (
    <section className="space-y-4">
      <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar solicitudes" className="rounded-xl bg-slate-950 border border-slate-700 p-2 text-sm">
        <option value="pending">Pendientes</option><option value="confirmed">Confirmadas</option><option value="closed">Cerradas</option><option value="all">Todas</option>
      </select>
      {error && <Err text={error} />}
      {message && <p className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-sm flex gap-2"><CheckCircle2 className="w-5 h-5 shrink-0" />{message}</p>}
      {orders === null && !error && <Loader2 className="animate-spin w-6 h-6 text-emerald-400" />}
      {orders?.length === 0 && <p className="text-sm text-slate-400">No hay solicitudes en esta vista.</p>}
      {orders?.map((o) => (
        <article key={o.id} className="rounded-2xl bg-slate-950/50 border border-slate-800 p-4 space-y-2">
          <div className="flex flex-wrap justify-between gap-2"><b>{o.tourName || 'Servicio'}</b><span className="text-xs text-slate-400">{o.status}</span></div>
          <p className="text-sm text-slate-300">{[o.date, o.time].filter(Boolean).join(' · ')} · {o.adults} adultos · {o.children} niños · {o.customer?.displayName || 'Cliente'}{o.customer?.language ? ' · ' + o.customer.language : ''}</p>
          {o.pickupLocation && <p className="text-xs text-slate-400">Pick-up: {o.pickupLocation}</p>}
          {o.customer?.specialNeeds && <p className="text-xs text-amber-200">Requerimiento especial: {o.customer.specialNeeds}</p>}
          {o.customer?.dietaryRestrictions && <p className="text-xs text-amber-200">Restricción alimentaria: {o.customer.dietaryRestrictions}</p>}
          {canDecide && ['dispatched', 'reassigned'].includes(o.status) && (
            <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2 pt-2">
              <select value={reason[o.id] || ''} onChange={(e) => setReason({ ...reason, [o.id]: e.target.value })} aria-label="Motivo de rechazo" className="rounded-xl bg-slate-950 border border-slate-700 p-2 text-sm">
                <option value="">Motivo (solo si rechaza)</option>
                {REJECT_REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input value={notes[o.id] || ''} onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })} maxLength={1200} placeholder="Notas" aria-label="Notas" className="rounded-xl bg-slate-950 border border-slate-700 p-2 text-sm" />
              <button disabled={!!busy} onClick={() => decide(o, 'accept')} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-black flex items-center gap-1 disabled:opacity-50"><CheckCircle2 className="w-4 h-4" />Aceptar</button>
              <button disabled={!!busy || !reason[o.id]} onClick={() => decide(o, 'reject')} className="rounded-xl bg-rose-700 hover:bg-rose-600 px-3 py-2 text-sm font-black flex items-center gap-1 disabled:opacity-50"><XCircle className="w-4 h-4" />Rechazar</button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

function SalesTab({ api }: { api: (p: string) => Promise<any> }) {
  const [sales, setSales] = useState<Sales | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/api/provider/v2/sales?months=12').then(setSales).catch((e) => setError(e.message)); }, [api]);
  if (error) return <Err text={error} />;
  if (!sales) return <Loader2 className="animate-spin w-6 h-6 text-emerald-400" />;
  // #347: el % de comisión solo llega si PROVIDER_PORTAL_SHOW_COMMISSION=true.
  const rates = sales.meta.showCommission && sales.commissionRates ? (sales.commissionRates.length ? sales.commissionRates.map(pct).join(', ') : 'No registrada') : null;
  return (
    <section className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-3">
        <Tile label="Neto a recibir" value={usd(sales.totals.netUSD)} />
        <Tile label="Reservas con pago verificado" value={String(sales.totals.bookings)} />
        {rates !== null && <Tile label="Comisión pactada" value={rates} />}
        {sales.meta.showGross && <Tile label="Precio al cliente (bruto)" value={usd(sales.totals.grossUSD)} />}
      </div>
      {sales.totals.linesWithoutNet > 0 && <p className="text-xs text-amber-200">{sales.totals.linesWithoutNet} reserva(s) sin neto: faltan condiciones registradas; Costa Rica Tours lo está revisando.</p>}
      <MonthlyBarChart title="Neto por mes (fecha de servicio)" data={sales.byMonth.map((m) => ({ label: m.period, value: m.netUSD, hint: m.bookings + ' reservas' }))} />
      <HorizontalBarChart title="Neto por servicio" data={sales.byService.map((s) => ({ label: s.tourName || s.tourId || 'Servicio', value: s.netUSD, hint: s.bookings + ' reservas' }))} />
      <p className="text-xs text-slate-500">{sales.meta.definition} Calculado {new Date(sales.meta.computedAt).toLocaleString('es-CR')} · {sales.meta.sourceCount} reservas fuente. Montos no pagados son estimados.</p>
    </section>
  );
}

function SettlementsTab({ api }: { api: (p: string) => Promise<any> }) {
  const [data, setData] = useState<Settlements | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/api/provider/v2/settlements?months=12').then(setData).catch((e) => setError(e.message)); }, [api]);
  if (error) return <Err text={error} />;
  if (!data) return <Loader2 className="animate-spin w-6 h-6 text-emerald-400" />;
  if (!data.periods.length) return <p className="text-sm text-slate-400">Sin liquidaciones en el período.</p>;
  return (
    <section className="space-y-5">
      {data.periods.map((p) => (
        <div key={p.period} className="rounded-2xl bg-slate-950/50 border border-slate-800 p-4">
          <h3 className="font-black">{p.period}</h3>
          <p className="text-xs text-slate-400 mt-1">Pagado {usd(p.totals.paidUSD)} · Elegible {usd(p.totals.eligibleUSD)} · Pendiente {usd(p.totals.pendingUSD)} · Bloqueado {usd(p.totals.blockedUSD)}</p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-400"><th className="py-1">Reserva</th><th>Fecha</th><th>Servicio</th><th>Neto</th><th>Estado</th></tr></thead>
              <tbody>
                {p.lines.map((l) => (
                  <tr key={l.bookingRef + l.serviceDate} className="border-t border-slate-800">
                    <td className="py-1 font-mono">{l.bookingRef}</td><td>{l.serviceDate}</td><td>{l.tourName || '—'}</td>
                    <td>{usd(l.netUSD)}{l.netSource === 'estimated' ? ' (est.)' : ''}</td>
                    <td>{STATUS_LABEL[l.settlementStatus] || l.settlementStatus}{l.settlementReason ? ' · ' + l.settlementReason : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-500">Las liquidaciones siguen la política de pagos de Costa Rica Tours: solo después del servicio, con pago y confirmación verificados. Este portal no ejecuta pagos.</p>
    </section>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="min-h-screen bg-[#041711] text-slate-100 px-4 py-8 sm:py-12">
      <div className={(wide ? 'max-w-5xl' : 'max-w-md') + ' mx-auto rounded-3xl border border-emerald-500/30 bg-[#08291e] p-6 sm:p-8 shadow-2xl'}>
        <div className="flex items-center gap-2 text-emerald-300 text-xs font-black uppercase tracking-widest mb-4"><ShieldCheck className="w-4 h-4" /> Portal de proveedores</div>
        {children}
      </div>
    </main>
  );
}
function Tile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-950/50 border border-slate-800 p-4"><div className="text-xs text-slate-400 uppercase font-bold">{label}</div><div className="font-black text-lg mt-1">{value}</div></div>;
}
function Err({ text }: { text: string }) {
  return <p role="alert" className="mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-sm flex gap-2"><AlertTriangle className="w-5 h-5 shrink-0" />{text}</p>;
}
function SignOut() {
  return <button onClick={() => signOut()} className="mt-6 text-xs text-slate-400 hover:text-white inline-flex items-center gap-1"><LogOut className="w-3 h-3" />Cerrar sesión</button>;
}
