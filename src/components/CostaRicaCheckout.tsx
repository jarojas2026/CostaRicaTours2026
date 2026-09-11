import React, { useState } from 'react';
import { CreditCard, Smartphone, CheckCircle, X, ShieldCheck, DollarSign } from 'lucide-react';

interface CostaRicaCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  tourId?: string;
  tourTitle: string;
  priceUsd: number;
  initialDate?: string;
  onSuccess?: (bookingId: string) => void;
}

export const CostaRicaCheckout: React.FC<CostaRicaCheckoutProps> = ({
  isOpen,
  onClose,
  tourId = 'tour-default',
  tourTitle,
  priceUsd,
  initialDate,
  onSuccess
}) => {
  if (!isOpen) return null;

  const [currency, setCurrency] = useState<'USD' | 'CRC'>('USD');
  const [method, setMethod] = useState<'sinpe' | 'paypal' | 'credit_card'>('sinpe');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [pickupHotel, setPickupHotel] = useState('');
  const [sinpeRef, setSinpeRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedBookingId, setCompletedBookingId] = useState<string | null>(null);

  const exchangeRate = 515;
  const totalUSD = (priceUsd * adults) + (priceUsd * 0.65 * children);
  const totalCRC = Math.round(totalUSD * exchangeRate);

  const totalDisplay =
    currency === 'USD'
      ? `$${totalUSD.toFixed(2)} USD`
      : `₡${totalCRC.toLocaleString('es-CR')} CRC`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const generatedId = `CR-PV-${Math.floor(100000 + Math.random() * 900000)}`;
      const payload = {
        bookingId: generatedId,
        tourId,
        tourName: tourTitle,
        date,
        time: '08:00 AM',
        adults,
        children,
        pickupHotel: pickupHotel || 'Recepción del Hotel',
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        currency,
        totalUSD,
        totalAmount: currency === 'USD' ? totalUSD : totalCRC,
        paymentMethod: method === 'sinpe' ? 'sinpe_movil' : method,
        sinpeReference: method === 'sinpe' ? sinpeRef : undefined,
        status: method === 'sinpe' ? 'pendiente_pago' : 'confirmada',
        paymentStatus: method === 'sinpe' ? 'pending' : 'completed'
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al procesar la reserva');
      }

      // Si es SINPE Móvil y el usuario ya ingresó el comprobante, notificar validación
      if (method === 'sinpe' && sinpeRef.trim()) {
        fetch('/api/sinpe/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: generatedId,
            sinpeReference: sinpeRef,
            customerPhone: phone
          })
        }).catch(() => {});
      }

      setCompletedBookingId(generatedId);
      if (onSuccess) onSuccess(generatedId);
    } catch (err: any) {
      console.error('Error al reservar:', err);
      setError(err.message || 'Error al procesar la solicitud. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-slate-900 border border-emerald-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition p-1.5 rounded-full hover:bg-slate-100"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {completedBookingId ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-1">¡Pura Vida! Reserva Registrada</h3>
            <p className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-full inline-block mb-4">
              Reserva #{completedBookingId}
            </p>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Tu experiencia para <strong>{tourTitle}</strong> ha sido guardada. Te hemos enviado la
              confirmación con el punto de encuentro en Waze y detalles por WhatsApp y correo electrónico.
            </p>
            {method === 'sinpe' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 text-left mb-6">
                <span className="font-bold block mb-1">Recordatorio SINPE Móvil:</span>
                Recuerda que si no has enviado el comprobante <strong>{sinpeRef || 'bancario'}</strong>, puedes
                reenviarlo por WhatsApp a nuestro soporte (+506 8795-9148 / +506 8888-8888).
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-700/20 transition"
            >
              Cerrar y Ver Mi Reserva
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-between items-start pr-6 mb-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Reserva Inmediata</span>
                <h2 className="text-xl font-black text-slate-900 leading-tight">{tourTitle}</h2>
              </div>
            </div>

            {/* Resumen y Selector de Moneda */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total a Pagar</p>
                <p className="text-2xl font-black text-emerald-950">{totalDisplay}</p>
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    currency === 'USD' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('CRC')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    currency === 'CRC' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  CRC (₡)
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            {/* Pasajeros y Fecha */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adultos</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={adults}
                  onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Niños</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={children}
                  onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Datos del Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Laura Castro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  required
                  type="email"
                  placeholder="laura@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp (+506 o país)</label>
                <input
                  required
                  type="tel"
                  placeholder="+506 8888-8888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hotel / Punto Recogida</label>
                <input
                  type="text"
                  placeholder="Hotel Arenal Springs, etc."
                  value={pickupHotel}
                  onChange={(e) => setPickupHotel(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Selector de Método de Pago */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Método de Pago</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('sinpe')}
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                    method === 'sinpe'
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-900">SINPE Móvil</span>
                    <span className="text-[10px] text-slate-500">Costa Rica</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('paypal')}
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                    method === 'paypal'
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-900">PayPal / Tarjeta</span>
                    <span className="text-[10px] text-slate-500">Internacional</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Caja de Ayuda para SINPE Móvil */}
            {method === 'sinpe' && (
              <div className="p-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-2 text-xs text-slate-700">
                <div className="flex justify-between items-baseline">
                  <span>Transferir al SINPE Móvil:</span>
                  <span className="font-black text-emerald-800 text-sm">+506 8795-9148</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Monto sugerido en colones: <strong>₡{totalCRC.toLocaleString('es-CR')}</strong>
                </div>
                <input
                  required
                  type="text"
                  value={sinpeRef}
                  onChange={(e) => setSinpeRef(e.target.value)}
                  placeholder="Número de comprobante bancario (ej: 481923)"
                  className="w-full border border-slate-300 rounded-xl p-2 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Garantía Pura Vida con operadores costarricenses certificados.</span>
            </div>

            <button
              type="submit"
              disabled={loading || (method === 'sinpe' && !sinpeRef.trim())}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-700/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Procesando Reserva...</span>
              ) : (
                <span>Confirmar Reserva ({totalDisplay})</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
