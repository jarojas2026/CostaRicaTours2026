
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

  if (!tour || !isOpen) return null;

  const totalUSD = (tour.priceUSD * adults) + (tour.priceUSD * 0.7 * children);
  const totalCRC = Math.round(totalUSD * 515);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !fullName || !email) return;
    setIsSubmitting(true);

    const bookingPayload: BookingRequest = {
      bookingId: `CR-PV-${Math.floor(100000 + Math.random() * 900000)}`,
      tourId: tour.id,
      tourName: tour.title[language],
      date: selectedDate,
      time: tour.departureTimes[0],
      adults,
      children,
      pickupHotel,
      specialRequests,
      totalUSD,
      totalCRC,
      paymentMethod,
      customer: { fullName, email, phone: '', country: '' },
      status: 'pendiente_pago',
      createdAt: new Date().toISOString()
    };

    try {
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
      <div className="bg-white p-6 rounded-2xl w-full max-w-4xl relative text-stone-900 my-8">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-stone-900 z-10 bg-white/80 rounded-full p-1">
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
                <label className="text-xs font-bold block mb-1">Date</label>
                <input required type="date" className="w-full p-2 border rounded-lg" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Adults</label>
                <input type="number" min="1" className="w-full p-2 border rounded-lg" value={adults} onChange={e => setAdults(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold block mb-1">Full Name</label>
                <input required type="text" className="w-full p-2 border rounded-lg" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Email</label>
                <input required type="email" className="w-full p-2 border rounded-lg" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Payment Method</label>
              <select className="w-full p-2 border rounded-lg" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
                <option value="credit_card">Credit Card (Stripe)</option>
                <option value="paypal">PayPal</option>
                <option value="sinpe_movil">SINPE Móvil (CR Only)</option>
                <option value="pay_at_pickup">Pay at Pickup</option>
              </select>
            </div>

            <button disabled={isSubmitting} type="submit" className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl mt-6">
              {isSubmitting ? 'Processing...' : 'Confirm Booking'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
