import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookingRequest, Language, Currency } from '../types';
import { X, Ticket, Calendar, MapPin, Search, Compass, CheckCircle2, Loader2 } from 'lucide-react';

interface MyBookingsModalProps {
  bookings: BookingRequest[];
  language: Language;
  currency: Currency;
  onClose: () => void;
  onSelectBooking: (b: BookingRequest) => void;
  onExploreTours?: () => void;
}

type BookingStage = {
  labelEs: string;
  labelEn: string;
  descriptionEs: string;
  descriptionEn: string;
  confirmed: boolean;
  terminal?: boolean;
};

function getBookingStage(booking: BookingRequest): BookingStage {
  const raw = String((booking as any).lifecycle || booking.status || '').trim().toLowerCase();
  const providerStatus = String((booking as any).serviceOrderStatus || '').trim().toLowerCase();

  if (['cancelada', 'cancelled', 'refunded', 'expirada', 'expired'].includes(raw)) {
    return {
      labelEs: raw.includes('refund') ? 'Reembolsada' : raw.includes('expir') ? 'Expirada' : 'Cancelada',
      labelEn: raw.includes('refund') ? 'Refunded' : raw.includes('expir') ? 'Expired' : 'Cancelled',
      descriptionEs: 'Esta solicitud ya no está activa.',
      descriptionEn: 'This request is no longer active.',
      confirmed: false,
      terminal: true,
    };
  }

  if (['completed', 'completada'].includes(raw)) {
    return {
      labelEs: 'Servicio completado',
      labelEn: 'Service completed',
      descriptionEs: 'La operación fue completada.',
      descriptionEn: 'The operation was completed.',
      confirmed: true,
      terminal: true,
    };
  }

  if (['confirmed', 'confirmada'].includes(raw)) {
    return {
      labelEs: 'Reserva confirmada',
      labelEn: 'Booking confirmed',
      descriptionEs: 'La reserva completó el ciclo de confirmación operativa. Tu voucher puede estar disponible.',
      descriptionEn: 'The booking completed the operational confirmation lifecycle. Your voucher may be available.',
      confirmed: true,
    };
  }

  if (['confirmed', 'confirmada'].includes(providerStatus)) {
    return {
      labelEs: 'Proveedor confirmó · finalizando',
      labelEn: 'Provider confirmed · finalizing',
      descriptionEs: 'El proveedor confirmó la operación. El sistema está finalizando la confirmación de la reserva antes de habilitar el voucher.',
      descriptionEn: 'The provider confirmed the operation. The system is finalizing the booking confirmation before enabling the voucher.',
      confirmed: false,
    };
  }

  if (['provider_pending', 'provider-pending'].includes(raw) || ['pending', 'pendiente'].includes(providerStatus)) {
    return {
      labelEs: 'Esperando al proveedor',
      labelEn: 'Waiting for provider',
      descriptionEs: 'El pago ya fue procesado y estamos esperando la confirmación operativa del proveedor.',
      descriptionEn: 'Payment has been processed and we are waiting for the provider’s operational confirmation.',
      confirmed: false,
    };
  }

  if (['paid', 'pagada'].includes(raw) || booking.paymentStatus === 'completed') {
    return {
      labelEs: 'Pago verificado',
      labelEn: 'Payment verified',
      descriptionEs: 'El pago está verificado. La reserva todavía requiere confirmación operativa del proveedor.',
      descriptionEn: 'Payment is verified. The booking still requires operational confirmation from the provider.',
      confirmed: false,
    };
  }

  if (['hold', 'solicitada', 'requested'].includes(raw)) {
    return {
      labelEs: 'Solicitud registrada',
      labelEn: 'Request recorded',
      descriptionEs: 'Recibimos la solicitud. La disponibilidad y el pago aún pueden requerir verificación.',
      descriptionEn: 'We received the request. Availability and payment may still require verification.',
      confirmed: false,
    };
  }

  return {
    labelEs: 'Pendiente de verificación',
    labelEn: 'Pending verification',
    descriptionEs: 'La reserva todavía no está confirmada. Estamos verificando los datos operativos necesarios.',
    descriptionEn: 'The booking is not yet confirmed. We are verifying the required operational details.',
    confirmed: false,
  };
}

export const MyBookingsModal: React.FC<MyBookingsModalProps> = ({
  bookings,
  language,
  currency,
  onClose,
  onSelectBooking,
  onExploreTours,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const isEs = language === 'es';

  const filteredBookings = bookings.filter(b => {
    const q = searchQuery.toLowerCase();
    const bId = b.bookingId || '';
    return (
      bId.toLowerCase().includes(q) ||
      b.tourName.toLowerCase().includes(q) ||
      (b.customer?.email && b.customer.email.toLowerCase().includes(q)) ||
      (b.customer?.fullName && b.customer.fullName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#051c14] border border-emerald-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative text-stone-100 my-8 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center text-emerald-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                {isEs ? 'Mis Reservas' : 'My Bookings'}
              </h3>
              <span className="text-xs text-stone-400">
                {bookings.length} {isEs ? 'solicitudes y reservas registradas' : 'requests and bookings recorded'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-stone-900/90 hover:bg-amber-500 text-stone-300 hover:text-stone-950 border border-white/20 hover:border-amber-400 flex items-center justify-center transition-all cursor-pointer shadow-lg"
            title={isEs ? 'Cerrar' : 'Close'}
            aria-label={isEs ? 'Cerrar modal' : 'Close modal'}
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-4 text-xs text-emerald-100/80">
          {isEs
            ? 'Una reserva solo aparece como confirmada después de la verificación de pago y la confirmación operativa del proveedor.'
            : 'A booking is shown as confirmed only after payment verification and the provider’s operational confirmation.'}
        </div>

        <Link to="/admin" onClick={onClose} className="inline-flex rounded-xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-300">
          {isEs ? 'Administración · Acceso del propietario' : 'Administration · Owner access'}
        </Link>

        {bookings.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEs ? 'Buscar por ID, email o tour...' : 'Search by booking ID, email or tour...'}
              className="w-full bg-white border border-black/10 focus:border-orange-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none"
            />
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto border border-black/10 text-3xl">🎟️</div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">{isEs ? 'Aún no tenés reservas' : 'No bookings yet'}</h4>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                {isEs ? 'Explorá el catálogo y enviá una solicitud cuando encuentres la experiencia adecuada.' : 'Explore the catalog and send a request when you find the right experience.'}
              </p>
            </div>
            {onExploreTours && (
              <button
                onClick={() => {
                  onClose();
                  onExploreTours();
                }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-stone-950 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>{isEs ? 'Explorar tours' : 'Explore tours'}</span>
              </button>
            )}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-8 text-xs text-stone-400">
            {isEs ? 'No se encontraron reservas con ese criterio.' : 'No bookings found matching your search.'}
          </div>
        ) : (
          <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-1">
            {filteredBookings.map((b, idx) => {
              const stage = getBookingStage(b);
              const statusLabel = isEs ? stage.labelEs : stage.labelEn;
              const statusDescription = isEs ? stage.descriptionEs : stage.descriptionEn;
              return (
                <div
                  key={b.bookingId || idx}
                  onClick={() => onSelectBooking(b)}
                  className="bg-white hover:bg-stone-100 p-4 rounded-2xl border border-black/10 hover:border-orange-500 transition-colors cursor-pointer space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="bg-orange-500 text-stone-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      ID: {b.bookingId || '—'}
                    </span>
                    <span className="text-xs text-stone-600 font-bold">
                      {currency === 'CRC' ? `₡${Math.round(b.totalCRC || 0).toLocaleString()}` : `$${b.totalUSD} USD`}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-stone-900 uppercase">{b.tourName}</h4>

                  <div className="rounded-xl border border-black/10 bg-stone-50 px-3 py-3">
                    <div className="flex items-center gap-2 text-xs font-black text-stone-900">
                      {stage.confirmed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Loader2 className="w-4 h-4 text-amber-600" />}
                      <span>{statusLabel}</span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-stone-600">{statusDescription}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-orange-500" />
                      <span>{b.date} {b.time ? `(${b.time})` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate">{b.pickupHotel || (isEs ? 'Punto de encuentro por confirmar' : 'Meeting point to be confirmed')}</span>
                    </div>
                  </div>

                  {b.electronicInvoice?.wantsInvoice && (
                    <div className="text-[10px] text-teal-700 font-bold flex items-center gap-1">🧾 {isEs ? 'Factura electrónica solicitada' : 'Electronic invoice requested'}</div>
                  )}

                  <div className="pt-2 border-t border-black/10 flex items-center justify-between gap-3 text-[11px] text-stone-600">
                    <span className="truncate">{isEs ? 'Titular' : 'Traveler'}: {b.customer?.fullName || '—'}</span>
                    <span className="text-orange-500 font-bold flex items-center gap-1 shrink-0">
                      {stage.confirmed ? (isEs ? 'Ver voucher' : 'View voucher') : (isEs ? 'Ver detalles' : 'View details')}
                      <Ticket className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-emerald-500/20">
          <a
            href="https://wa.me/50687959148?text=Hola,%20quisiera%20consultar%20sobre%20mis%20reservas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>{isEs ? 'Soporte por WhatsApp' : 'WhatsApp support'}</span>
          </a>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex-1 bg-stone-100 hover:bg-stone-200 text-stone-900 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            {isEs ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
