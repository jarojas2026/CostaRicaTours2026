import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Clock3, Car, UserRound, MapPin, CalendarDays, Users, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

type ProviderOrder = {
  id: string; bookingId: string; tourName: string; date: string; time: string;
  adults: number; children: number; pickupLocation: string; wazeUrl?: string;
  providerName: string; status: string; notes?: string; assignedGuide?: string;
  assignedVehicle?: string; slaDeadline?: string;
  customer?: { name?: string; phone?: string; email?: string; dietaryRestrictions?: string; specialNeeds?: string };
};

export const ProviderPortalPage: React.FC = () => {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);
  const [order, setOrder] = useState<ProviderOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState<'confirm' | 'reject' | 'delay' | null>(null);
  const [guide, setGuide] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [delay, setDelay] = useState('15');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!token) { setError('Falta el enlace seguro de la solicitud.'); setLoading(false); return; }
    fetch('/api/provider/portal?token=' + encodeURIComponent(token))
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data?.error || 'No se pudo cargar la solicitud.'); return data; })
      .then(data => {
        setOrder(data.order);
        setGuide(data.order.assignedGuide || '');
        setVehicle(data.order.assignedVehicle || '');
        setNotes(data.order.notes || '');
      })
      .catch(e => setError(e.message || 'No se pudo cargar la solicitud.'))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (selectedAction: 'confirm' | 'reject' | 'delay') => {
    setSaving(true); setError(''); setMessage('');
    try {
      const r = await fetch('/api/provider/portal/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token, action: selectedAction, assignedGuide: guide, assignedVehicle: vehicle,
          estimatedDelayMinutes: selectedAction === 'delay' ? Number(delay) : undefined,
          notes
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || data?.message || 'No se pudo registrar la respuesta.');
      setMessage(data.message || 'Respuesta registrada.');
      setOrder(prev => prev ? { ...prev, ...data.order } : prev);
      setAction(null);
    } catch (e: any) {
      setError(e.message || 'No se pudo registrar la respuesta.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#041711] text-white flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-emerald-400" /></div>;

  return (
    <main className="min-h-screen bg-[#041711] text-slate-100 px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl border border-emerald-500/30 bg-[#08291e] shadow-2xl overflow-hidden">
          <header className="p-6 sm:p-8 bg-gradient-to-br from-emerald-950 to-[#08291e] border-b border-emerald-500/20">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-black uppercase tracking-widest"><ShieldCheck className="w-4 h-4" /> Portal operativo seguro</div>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">Solicitud de reserva</h1>
            <p className="text-emerald-100/70 text-sm mt-2">{order?.providerName || 'Proveedor asignado'} · {order?.id}</p>
          </header>

          {error && <div className="m-5 p-4 rounded-2xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-sm flex gap-2"><AlertTriangle className="w-5 h-5 shrink-0" />{error}</div>}
          {message && <div className="m-5 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-sm flex gap-2"><CheckCircle2 className="w-5 h-5 shrink-0" />{message}</div>}

          {order && !error && (
            <div className="p-5 sm:p-8 space-y-5">
              <section className="grid sm:grid-cols-2 gap-3">
                <Info icon={<CalendarDays />} label="Fecha y hora" value={order.date + ' · ' + order.time} />
                <Info icon={<Users />} label="Pasajeros" value={order.adults + ' adultos · ' + order.children + ' niños'} />
                <Info icon={<MapPin />} label="Pick-up" value={order.pickupLocation || 'Por definir'} />
                <Info icon={<UserRound />} label="Cliente" value={order.customer?.name || 'Cliente'} />
              </section>

              <div className="rounded-2xl bg-slate-950/50 border border-slate-800 p-4">
                <div className="text-xs text-slate-500 uppercase font-black tracking-wider">Experiencia solicitada</div>
                <div className="text-lg font-bold mt-1">{order.tourName}</div>
                <div className="text-xs text-slate-400 mt-2">Reserva #{order.bookingId}</div>
                {order.customer?.phone && <div className="text-xs text-slate-400 mt-1">Contacto operativo: {order.customer.phone}</div>}
                {order.customer?.specialNeeds && <div className="mt-3 p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-amber-100 text-sm"><b>Requerimiento especial:</b> {order.customer.specialNeeds}</div>}
                {order.customer?.dietaryRestrictions && <div className="mt-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-amber-100 text-sm"><b>Restricción alimentaria:</b> {order.customer.dietaryRestrictions}</div>}
                {order.wazeUrl && <a href={order.wazeUrl} target="_blank" rel="noreferrer" className="inline-flex mt-3 text-sm font-bold text-sky-300 hover:text-white">Abrir ubicación en Waze →</a>}
              </div>

              {['dispatched','reassigned'].includes(order.status) ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Guía / responsable asignado" value={guide} onChange={setGuide} icon={<UserRound />} placeholder="Nombre del guía" />
                    <Field label="Vehículo / placa" value={vehicle} onChange={setVehicle} icon={<Car />} placeholder="Vehículo o placa" />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Notas operativas</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} maxLength={1200} className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-3 text-sm outline-none focus:border-emerald-500" placeholder="Cupo, condiciones, instrucciones o información relevante..." />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <ActionButton onClick={() => setAction('confirm')} tone="green" icon={<CheckCircle2 />} text="Aceptar reserva" />
                    <ActionButton onClick={() => setAction('delay')} tone="amber" icon={<Clock3 />} text="Proponer ajuste" />
                    <ActionButton onClick={() => setAction('reject')} tone="red" icon={<XCircle />} text="Rechazar" />
                  </div>

                  {action === 'delay' && <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4"><label className="text-xs font-bold text-amber-200">Demora / ajuste estimado (minutos)</label><input type="number" min="5" max="1440" value={delay} onChange={e => setDelay(e.target.value)} className="mt-2 w-full rounded-xl bg-slate-950 border border-slate-700 p-3" /><Confirm onClick={() => submit('delay')} saving={saving} label="Enviar ajuste al centro de operaciones" /></div>}
                  {action === 'reject' && <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4"><p className="text-sm text-rose-100">Indique en las notas por qué no puede atender esta solicitud. El sistema buscará un proveedor compatible si existe.</p><Confirm onClick={() => submit('reject')} saving={saving} label="Confirmar rechazo" /></div>}
                  {action === 'confirm' && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4"><p className="text-sm text-emerald-100">Al aceptar, la reserva se marcará como confirmada y se enviará la actualización al viajero.</p><Confirm onClick={() => submit('confirm')} saving={saving} label="Confirmar y enviar" /></div>}
                </>
              ) : (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" /><p className="font-bold mt-2">Estado actual: {order.status}</p><p className="text-sm text-slate-400 mt-1">Esta solicitud ya recibió una respuesta.</p></div>
              )}
            </div>
          )}
        </div>
        <p className="text-center text-xs text-slate-500 mt-5">Costa Rica Tours · El enlace está firmado y tiene caducidad automática.</p>
      </div>
    </main>
  );
};

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-950/50 border border-slate-800 p-4"><div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">{React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}{label}</div><div className="font-semibold mt-1 text-sm">{value}</div></div>;
}
function Field({ label, value, onChange, icon, placeholder }: any) {
  return <div><label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">{label}</label><div className="relative"><span className="absolute left-3 top-3 text-slate-500">{React.cloneElement(icon, { className: 'w-4 h-4' })}</span><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={180} className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-3 pl-10 text-sm outline-none focus:border-emerald-500" /></div></div>;
}
function ActionButton({ onClick, tone, icon, text }: any) {
  const cls = tone === 'green' ? 'bg-emerald-600 hover:bg-emerald-500' : tone === 'amber' ? 'bg-amber-600 hover:bg-amber-500 text-stone-950' : 'bg-rose-700 hover:bg-rose-600';
  return <button onClick={onClick} className={cls + ' rounded-2xl p-3 font-black text-sm flex items-center justify-center gap-2 transition'}>{icon}{text}</button>;
}
function Confirm({ onClick, saving, label }: any) {
  return <button disabled={saving} onClick={onClick} className="mt-3 w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 p-3 font-bold text-sm disabled:opacity-50">{saving ? 'Registrando...' : label}</button>;
}
