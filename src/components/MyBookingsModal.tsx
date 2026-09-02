import React from 'react';
import { BookingRequest, Language, Currency } from '../types';
import { X, Ticket, Calendar, Clock, MapPin, Share2, CheckCircle2 } from 'lucide-react';

interface MyBookingsModalProps {
  bookings: BookingRequest[];
  language: Language;
  currency: Currency;
  onClose: () => void;
  onSelectBooking: (b: BookingRequest) => void;
}

export const MyBookingsModal: React.FC<MyBookingsModalProps> = ({
  bookings,
  language,
  currency,
  onClose,
  onSelectBooking,
}) => {
  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-stone-900 border-2 border-white/10 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl relative text-white my-8 p-6 sm:p-8 space-y-6">
        
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-neutral-900">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-orange-400 uppercase">
                {language === 'es' ? 'Mis Reservas Confirmadas' : 'My Confirmed Bookings'}
              </h3>
              <span className="text-xs text-[#A7F3D0]">
                {bookings.length} {language === 'es' ? 'vouchers registrados' : 'vouchers registered'}
              </span>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-white hover:text-[#FF8C00]">
            <X className="w-6 h-6" />
          </button>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="text-4xl">🎟️</div>
            <p className="text-sm text-[#A7F3D0]">
              {language === 'es'
                ? 'Aún no tienes reservas registradas en esta sesión.'
                : 'You have no active tour bookings in this session.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {bookings.map((b, idx) => (
              <div
                key={b.bookingId || idx}
                onClick={() => onSelectBooking(b)}
                className="bg-stone-950 hover:bg-neutral-700 p-4 rounded-2xl border border-white/10 hover:border-orange-500 transition-colors cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="bg-orange-500 text-neutral-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                    ID: {b.bookingId}
                  </span>
                  <span className="text-xs text-[#A7F3D0] font-bold">
                    ${b.totalUSD} USD
                  </span>
                </div>

                <h4 className="text-sm font-black text-white uppercase">{b.tourName}</h4>

                <div className="grid grid-cols-2 gap-2 text-xs text-[#A7F3D0]">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-orange-400" />
                    <span>{b.date} ({b.time})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-400" />
                    <span>Hotel: {(b.pickupHotel || "").slice(0, 20)}...</span>
                  </div>
                </div>

                {b.electronicInvoice?.wantsInvoice && (
                  <div className="text-[10px] text-teal-300 font-bold flex items-center gap-1 mb-2">
                    🧾 {language === 'es' ? 'Factura Electrónica' : 'Electronic Invoice'}
                  </div>
                )}

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#A7F3D0]">
                  <span>Titular: {b.customer.fullName}</span>
                  <span className="text-orange-400 font-bold flex items-center gap-1">
                    Ver Voucher <Ticket className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href="https://wa.me/50687959148?text=Hola,%20quisiera%20consultar%20sobre%20mis%20reservas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-black py-3 rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            <span>WhatsApp SOPORTE 8795-9148</span>
          </a>
          <button
            onClick={onClose}
            className="flex-1 bg-orange-500 text-neutral-900 hover:bg-orange-500 font-black py-3 rounded-full text-xs uppercase tracking-wider transition-colors"
          >
            {language === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
