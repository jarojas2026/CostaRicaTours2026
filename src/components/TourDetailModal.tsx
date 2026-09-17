import React, { useState } from 'react';
import { 
  Star, Clock, MapPin, CheckCircle2, ShieldCheck, Calendar, Users, Hotel, 
  ChevronRight, ChevronLeft, X, AlertCircle, CreditCard, Smartphone, Banknote, 
  Lock, Sparkles, Check, Info, ArrowRight, Phone, Save, Wifi, WifiOff, Trash2
} from 'lucide-react';
import { Tour, Language, Currency, BookingRequest, OperatorProfile } from '../types';
import { getLangText, formatCurrency } from '../utils/i18n';
import { OPERATORS } from '../data/toursData';

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

  const operator = tour.operatorId ? OPERATORS.find(op => op.id === tour.operatorId) : null;

  const modalTitle = getLangText(tour.title, language, 'Tour de Costa Rica');
  const modalDescription = getLangText(tour.description, language, '');

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain">
      <div className="modal-panel w-full max-w-5xl relative my-4 sm:my-8 bg-stone-900 border-emerald-500/20 text-stone-100 rounded-[2.5rem] overflow-hidden">
        <button onClick={onClose} className="btn-close absolute top-6 right-6 z-20 bg-stone-950/50 backdrop-blur-md hover:bg-stone-950 transition-colors p-2 rounded-full border border-white/10">
          <X size={24} className="text-white" />
        </button>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Left Column: Info */}
          <div className="p-8 md:p-12 space-y-8 bg-stone-950/20 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-black uppercase tracking-[0.2em] text-[10px] mb-4">
                <MapPin className="w-3.5 h-3.5" />
                <span>{tour.location?.placeName || 'Costa Rica'}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tighter leading-tight text-white">{modalTitle}</h2>
              
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="px-4 py-2 bg-stone-900 rounded-full border border-white/5 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-stone-300 font-bold">{tour.duration || getLangText(tour.durationLabel, language)}</span>
                </div>
                <div className="px-4 py-2 bg-stone-900 rounded-full border border-white/5 flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-stone-300 font-bold">{tour.rating} (150+)</span>
                </div>
                <div className="px-4 py-2 bg-stone-900 rounded-full border border-white/5 flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span className="text-stone-300 font-bold">{language === 'es' ? 'Grupos Pequeños' : 'Small Groups'}</span>
                </div>
              </div>

              <div className="prose prose-invert prose-stone max-w-none mb-10">
                <p className="text-stone-400 leading-relaxed text-lg">{modalDescription}</p>
              </div>

              {/* Operator Info */}
              {operator && (
                <div className="p-6 bg-stone-900/50 border border-emerald-500/10 rounded-3xl mb-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                      <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-stone-500 text-[10px] uppercase font-black tracking-widest">{language === 'es' ? 'Operado por' : 'Operated by'}</div>
                      <div className="text-white font-bold text-lg">{operator.name}</div>
                    </div>
                  </div>
                  <p className="text-stone-400 text-sm italic mb-4">"{getLangText(operator.tagline, language)}"</p>
                  <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'es' ? 'Operador Local Verificado' : 'Verified Local Operator'}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-bold text-white uppercase tracking-widest text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {language === 'es' ? 'Lo que incluye' : 'What is included'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(tour.inclusions[language] || tour.inclusions.es || []).slice(0, 6).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-stone-400 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="p-8 md:p-12 bg-stone-900/50 border-l border-white/5">
            <div className="mb-10">
              <div className="text-stone-500 text-xs font-black uppercase tracking-widest mb-2">{language === 'es' ? 'Desde' : 'From'}</div>
              <div className="text-4xl md:text-5xl font-black text-emerald-400 mb-1">
                {currency === 'USD' ? `$${totalUSD}` : `₡${totalCRC.toLocaleString('es-CR')}`}
              </div>
              <div className="text-stone-500 text-xs">{language === 'es' ? 'Precio por persona' : 'Price per person'}</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-500 uppercase tracking-widest ml-4">{language === 'es' ? 'Fecha' : 'Date'}</label>
                    <input required type="date" className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-500 uppercase tracking-widest ml-4">{language === 'es' ? 'Adultos' : 'Adults'}</label>
                    <input type="number" min="1" max="30" className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors" value={adults} onChange={e => setAdults(Number(e.target.value))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-500 uppercase tracking-widest ml-4">{language === 'es' ? 'Nombre Completo' : 'Full Name'}</label>
                  <input required type="text" className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-500 uppercase tracking-widest ml-4">{language === 'es' ? 'Email' : 'Email'}</label>
                  <input required type="email" className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors" value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-500 uppercase tracking-widest ml-4">{language === 'es' ? 'Teléfono / WhatsApp' : 'Phone / WhatsApp'}</label>
                  <input required type="tel" className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-500 uppercase tracking-widest ml-4">{language === 'es' ? 'Método de Pago' : 'Payment Method'}</label>
                  <select className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
                    <option value="sinpe_movil">📱 SINPE Móvil (Costa Rica ₡)</option>
                    <option value="paypal">💳 PayPal Express</option>
                    <option value="credit_card">💳 Tarjeta (Stripe)</option>
                    <option value="pay_at_pickup">💵 Pago al Abordar</option>
                  </select>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button 
                disabled={isSubmitting} 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black py-5 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CreditCard className="w-5 h-5" />
                )}
                <span>{language === 'es' ? 'Confirmar Reserva Oficial' : 'Confirm Official Booking'}</span>
              </button>
              
              <div className="flex items-center justify-center gap-4 text-[10px] text-stone-500 uppercase font-black tracking-widest">
                <div className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {language === 'es' ? 'Pago Seguro' : 'Secure Payment'}
                </div>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {language === 'es' ? 'Garantía Local' : 'Local Guarantee'}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourDetailModal;
