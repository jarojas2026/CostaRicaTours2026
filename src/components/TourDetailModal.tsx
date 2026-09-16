import React, { useState } from 'react';
import { 
  Star, Clock, MapPin, CheckCircle2, ShieldCheck, Calendar, Users, Hotel, 
  ChevronRight, ChevronLeft, X, AlertCircle, CreditCard, Smartphone, Banknote, 
  Lock, Sparkles, Check, Info, ArrowRight, Phone, Save, Wifi, WifiOff, Trash2
} from 'lucide-react';
import { Tour, Language, Currency, BookingRequest } from '../types';
import { getLangText, formatCurrency } from '../utils/i18n';

interface TourDetailModalProps {
  tour: Tour | null;
  isOpen?: boolean;
  onClose: () => void;
  language: Language;
  currency: Currency;
  onConfirmBooking?: (booking: BookingRequest) => void;
  onBookingSuccess?: (booking: BookingRequest) => void;
}

export const TourDetailModal: React.FC<TourDetailModalProps> = ({ 
  tour, isOpen, onClose, language, currency, onConfirmBooking, onBookingSuccess 
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pickupHotel, setPickupHotel] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'paypal' | 'sinpe_movil' | 'pay_at_pickup'>('credit_card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sinpeRef, setSinpeRef] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!tour || !isOpen) return null;

  const totalUSD = (tour.priceUSD * adults) + (tour.priceUSD * 0.7 * children);
  const totalCRC = Math.round(totalUSD * 515);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!selectedDate || !fullName || !email) {
      setErrorMessage(language === 'es' ? 'Por favor completa todos los campos requeridos.' : 'Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);

    const generatedBookingId = `CR-PV-${Math.floor(100000 + Math.random() * 900000)}`;
    const tourTitle = getLangText(tour.title, language, 'Tour de Costa Rica');
    const tourDescription = getLangText(tour.description, language, '');
    const departureTime = (tour.departureTimes && tour.departureTimes.length > 0) ? tour.departureTimes[0] : '08:00 AM';

    const bookingPayload: BookingRequest = {
      bookingId: generatedBookingId,
      tourId: tour.id,
      tourName: tourTitle,
      date: selectedDate,
      time: departureTime,
      adults,
      children,
      pickupHotel: pickupHotel || 'Recepción del Hotel',
      specialRequests,
      totalUSD,
      totalCRC,
      paymentMethod,
      customer: { fullName, email, phone: phone || '+506', country: 'CR' },
      status: paymentMethod === 'sinpe_movil' ? 'pendiente_pago' : 'confirmada',
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Envío EXCLUSIVO al backend /api/bookings (sin bypass directo en Firestore)
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookingPayload,
          customerName: fullName,
          customerEmail: email,
          customerPhone: phone,
          sinpeReference: paymentMethod === 'sinpe_movil' ? sinpeRef : undefined
        })
      });

      const bookingData = await bookingRes.json();

      if (!bookingRes.ok) {
        throw new Error(bookingData.message || bookingData.error || (language === 'es' ? 'Error al registrar la reserva en el servidor.' : 'Error creating reservation on server.'));
      }

      // Si es SINPE Móvil con referencia bancaria, enviamos verificación
      if (paymentMethod === 'sinpe_movil' && sinpeRef.trim()) {
        const sinpeRes = await fetch('/api/sinpe/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: generatedBookingId,
            sinpeReference: sinpeRef,
            customerPhone: phone
          })
        });
        if (!sinpeRes.ok) {
          console.warn('Verificación SINPE pendiente de revisión manual.');
        }
      }

      // Pasarela Stripe
      if (paymentMethod === 'credit_card') {
        const stripeRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/stripe/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tourId: tour.id,
            tourName: tourTitle,
            totalUSD,
            customerEmail: email,
            date: selectedDate,
            passengers: adults + children
          })
        });
        const stripeData = await stripeRes.json();
        if (stripeData.url) {
          window.location.href = stripeData.url;
          return;
        }
      } else if (paymentMethod === 'paypal') {
        // Pasarela PayPal
        const paypalRes = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ totalUSD, tourName: tourTitle })
        });
        const paypalData = await paypalRes.json();
        if (paypalData.url) {
          window.location.href = paypalData.url;
          return;
        }
      }

      // Éxito confirmado por backend
      const confirmedBooking = bookingData.booking || bookingPayload;
      if (onConfirmBooking) onConfirmBooking(confirmedBooking);
      if (onBookingSuccess) onBookingSuccess(confirmedBooking);

      setIsSubmitting(false);
      onClose();
    } catch (error: any) {
      console.error('Error al procesar reserva:', error);
      setErrorMessage(error.message || (language === 'es' ? 'Ocurrió un error al procesar tu solicitud.' : 'An error occurred processing your request.'));
      setIsSubmitting(false);
    }
  };

  const tourImage = Array.isArray(tour.gallery) && tour.gallery.length > 0 
    ? tour.gallery[0] 
    : (tour.image || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80');

  const modalTitle = getLangText(tour.title, language, 'Tour de Costa Rica');
  const modalDescription = getLangText(tour.description, language, '');

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto overscroll-contain">
      <div className="modal-panel w-full max-w-4xl relative my-4 sm:my-8">
        <button onClick={onClose} className="btn-close">
          <X size={24} />
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
          <div>
            <img src={tourImage} alt={modalTitle} className="w-full h-64 object-cover rounded-2xl mb-4 shadow-sm" />
            <h2 className="text-2xl font-black mb-2 uppercase text-stone-900">{modalTitle}</h2>
            <p className="text-sm text-stone-600 mb-4 leading-relaxed">{modalDescription}</p>
            <div className="flex items-center justify-between font-black text-xl mb-4 text-emerald-800 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <span className="text-sm uppercase tracking-wider text-emerald-900">{language === 'es' ? 'Total Calculado:' : 'Calculated Total:'}</span>
              <span>{currency === 'USD' ? `$${totalUSD} USD` : `₡${totalCRC.toLocaleString('es-CR')} CRC`}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-black text-lg border-b pb-2 text-stone-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              <span>{language === 'es' ? 'Detalles de la Reserva' : 'Booking Details'}</span>
            </h3>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">{language === 'es' ? 'Fecha del Tour' : 'Tour Date'}</label>
                <input required type="date" className="w-full p-2.5 border border-stone-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">{language === 'es' ? 'Adultos' : 'Adults'}</label>
                <input type="number" min="1" max="30" className="w-full p-2.5 border border-stone-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]" value={adults} onChange={e => setAdults(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">{language === 'es' ? 'Nombre Completo' : 'Full Name'}</label>
                <input required type="text" placeholder="Ej: María González" className="w-full p-2.5 border border-stone-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">{language === 'es' ? 'Correo Electrónico' : 'Email Address'}</label>
                <input required type="email" placeholder="maria@ejemplo.com" className="w-full p-2.5 border border-stone-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">{language === 'es' ? 'WhatsApp / Teléfono (+506)' : 'WhatsApp / Phone (+506)'}</label>
              <input required type="tel" placeholder="+506 8888-8888" className="w-full p-2.5 border border-stone-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">{language === 'es' ? 'Hotel / Lugar de Recogida' : 'Pickup Hotel / Location'}</label>
              <input type="text" placeholder="Ej: Hotel Real Intercontinental Escazú" className="w-full p-2.5 border border-stone-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]" value={pickupHotel} onChange={e => setPickupHotel(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">{language === 'es' ? 'Método de Pago' : 'Payment Method'}</label>
              <select className="w-full p-2.5 border border-stone-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px] bg-white" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
                <option value="sinpe_movil">📱 SINPE Móvil (Costa Rica ₡)</option>
                <option value="paypal">💳 PayPal Express</option>
                <option value="credit_card">💳 Tarjeta de Crédito / Débito (Stripe)</option>
                <option value="pay_at_pickup">💵 Pago al Abordar (Efectivo/Tarjeta)</option>
              </select>
            </div>

            {paymentMethod === 'sinpe_movil' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-2">
                <div className="flex justify-between items-baseline font-bold">
                  <span>Transferir al SINPE Móvil:</span>
                  <span className="text-sm text-emerald-800">+506 8795-9148</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Total en colones: <strong>₡{totalCRC.toLocaleString('es-CR')}</strong>. Ingresa el comprobante bancario para confirmación instantánea:
                </p>
                <input
                  type="text"
                  placeholder="Número de comprobante SINPE (ej: 492014)"
                  value={sinpeRef}
                  onChange={e => setSinpeRef(e.target.value)}
                  className="w-full p-2 border border-emerald-300 rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <button 
              disabled={isSubmitting} 
              type="submit" 
              className="w-full btn-primary disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'es' ? 'Validando con Servidor...' : 'Processing...'}</span>
                </>
              ) : (
                <span>{language === 'es' ? 'Confirmar Reserva Oficial' : 'Confirm Official Booking'}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TourDetailModal;
