
import React, { useState } from 'react';
import { 
  Star, Clock, MapPin, CheckCircle2, ShieldCheck, Calendar, Users, Hotel, 
  ChevronRight, ChevronLeft, X, AlertCircle, CreditCard, Smartphone, Banknote, 
  Lock, Sparkles, Check, Info, ArrowRight, Phone, Save, Wifi, WifiOff, Trash2
} from 'lucide-react';
import { Tour, Language, Currency, BookingRequest } from '../types';
import { getLangText, formatCurrency } from '../utils/i18n';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

  if (!tour || !isOpen) return null;

  const totalUSD = (tour.priceUSD * adults) + (tour.priceUSD * 0.7 * children);
  const totalCRC = Math.round(totalUSD * 515);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !fullName || !email) return;
    setIsSubmitting(true);

    const generatedBookingId = `CR-PV-${Math.floor(100000 + Math.random() * 900000)}`;

    const bookingPayload: BookingRequest = {
      bookingId: generatedBookingId,
      tourId: tour.id,
      tourName: tour.title[language],
      date: selectedDate,
      time: tour.departureTimes[0] || '08:00 AM',
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
      // Disparar persistencia y webhooks n8n a través del backend
      fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookingPayload,
          customerName: fullName,
          customerEmail: email,
          customerPhone: phone,
          sinpeReference: paymentMethod === 'sinpe_movil' ? sinpeRef : undefined
        })
      }).catch(() => {});

      if (paymentMethod === 'sinpe_movil' && sinpeRef.trim()) {
        fetch('/api/sinpe/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: generatedBookingId,
            sinpeReference: sinpeRef,
            customerPhone: phone
          })
        }).catch(() => {});
      }

      if (paymentMethod === 'credit_card') {
        const stripeRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/stripe/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tourId: tour.id,
            tourName: tour.title[language],
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
        const paypalRes = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ totalUSD, tourName: tour.title[language] })
        });
        const paypalData = await paypalRes.json();
        if (paypalData.url) {
          window.location.href = paypalData.url;
          return;
        }
      }

      await addDoc(collection(db, 'bookings'), { ...bookingPayload, createdAt: serverTimestamp() });
      if (onConfirmBooking) onConfirmBooking(bookingPayload);
      if (onBookingSuccess) onBookingSuccess(bookingPayload);

    } catch (error) {
      console.error(error);
      if (onConfirmBooking) onConfirmBooking(bookingPayload);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="modal-panel w-full max-w-4xl relative text-stone-900 my-8">
        <button onClick={onClose} className="min-h-[44px] min-w-[44px] btn-close">
          <X size={24} />
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <div>
            <img src={tour.images[0]} alt="Tour" className="w-full h-64 object-cover rounded-2xl mb-4" />
            <h2 className="text-2xl font-black mb-2 uppercase">{tour.title[language]}</h2>
            <p className="text-sm text-stone-600 mb-4">{tour.description[language]}</p>
            <div className="flex items-center justify-between font-bold text-xl mb-6 text-orange-500">
              <span>Total:</span>
              <span>{currency === 'USD' ? `$${totalUSD}` : `₡${totalCRC}`}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">Booking Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-modern">Date</label>
                <input required type="date" className="min-h-[44px] input-modern" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <div>
                <label className="label-modern">Adults</label>
                <input type="number" min="1" className="min-h-[44px] input-modern" value={adults} onChange={e => setAdults(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-modern">Full Name</label>
                <input required type="text" className="min-h-[44px] input-modern" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="label-modern">Email</label>
                <input required type="email" className="min-h-[44px] input-modern" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label-modern">WhatsApp / Teléfono (+506)</label>
              <input required type="tel" placeholder="+506 8888-8888" className="min-h-[44px] input-modern" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div>
              <label className="label-modern">Payment Method</label>
              <select className="min-h-[44px] input-modern" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
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
                  <span className="text-sm text-emerald-800">+506 8795-9148 / +506 8888-8888</span>
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

            <button disabled={isSubmitting} type="submit" className="min-h-[44px] min-w-[44px] btn-primary w-full mt-8">
              {isSubmitting ? 'Processing...' : 'Confirm Booking'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
