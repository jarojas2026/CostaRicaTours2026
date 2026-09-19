import React, { useState, useEffect } from 'react';
import { 
  Star, Clock, MapPin, CheckCircle2, ShieldCheck, Calendar, Users, Hotel, 
  ChevronRight, ChevronLeft, X, AlertCircle, CreditCard, Smartphone, Banknote, 
  Lock, Sparkles, Check, Info, ArrowRight, Phone, MessageCircle, Share2, Heart
} from 'lucide-react';
import { Tour, Language, Currency, BookingRequest } from '../types';
import { getLangText, formatCurrency } from '../utils/i18n';
import { OPERATORS } from '../data/toursData';
import { LazyImage } from './LazyImage';

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
  tour, isOpen = true, onClose, language, currency, onConfirmBooking, onBookingSuccess 
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
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!tour || !isOpen) return null;

  const totalUSD = (tour.priceUSD * adults) + (tour.priceUSD * 0.7 * children);
  const totalCRC = Math.round(totalUSD * 515);

  const galleryImages: string[] = Array.isArray(tour.gallery) && tour.gallery.length > 0 
    ? tour.gallery 
    : [tour.image || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80'];

  const operator = tour.operatorId ? OPERATORS.find(op => op.id === tour.operatorId) : null;
  const modalTitle = getLangText(tour.title, language, 'Tour de Costa Rica');
  const modalDescription = getLangText(tour.description, language, '');

  // Safe inclusions & what to bring extraction across any language
  const inclusions: string[] = Array.isArray(tour.inclusions) 
    ? tour.inclusions 
    : (tour.inclusions?.[language] || tour.inclusions?.es || tour.inclusions?.en || []);

  const whatToBring: string[] = Array.isArray(tour.whatToBring) 
    ? tour.whatToBring 
    : (tour.whatToBring?.[language] || tour.whatToBring?.es || tour.whatToBring?.en || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!selectedDate || !fullName || !email) {
      setErrorMessage(language === 'es' ? 'Por favor completa todos los campos requeridos.' : 'Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);

    const generatedBookingId = `CR-PV-${Math.floor(100000 + Math.random() * 900000)}`;
    const departureTime = (tour.departureTimes && tour.departureTimes.length > 0) ? tour.departureTimes[0] : '08:00 AM';

    const bookingPayload: BookingRequest = {
      bookingId: generatedBookingId,
      tourId: tour.id,
      tourName: modalTitle,
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
            tourName: modalTitle,
            totalUSD,
            customerEmail: email,
            date: selectedDate,
            passengers: adults + children,
            adults,
            children
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
          body: JSON.stringify({ totalUSD, tourName: modalTitle, tourId: tour.id, passengers: adults + children, adults, children })
        });
        const paypalData = await paypalRes.json();
        if (paypalData.url) {
          window.location.href = paypalData.url;
          return;
        }
      }

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

  const whatsappInquiryUrl = `https://wa.me/50687959148?text=${encodeURIComponent(
    language === 'es'
      ? `Hola, estoy interesado en el tour "${modalTitle}" en ${tour.location?.placeName || 'Costa Rica'}. Quisiera consultar disponibilidad para ${selectedDate || '[fecha]'} para ${adults + children} personas.`
      : `Hello, I'm interested in the tour "${modalTitle}" in ${tour.location?.placeName || 'Costa Rica'}. I'd like to check availability for ${selectedDate || '[date]'} for ${adults + children} people.`
  )}`;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#051c14] border border-emerald-500/30 text-stone-100 rounded-3xl shadow-2xl shadow-black/90 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Control Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#03150e]/95 backdrop-blur-md border-b border-emerald-500/20">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 truncate">
              {tour.location?.placeName || 'Costa Rica'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={whatsappInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-stone-950 text-xs font-bold rounded-full border border-[#25D366]/40 transition-all cursor-pointer"
              title="WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            {/* High-contrast Close Button */}
            <button
              onClick={onClose}
              type="button"
              className="w-10 h-10 rounded-full bg-stone-900/90 hover:bg-amber-500 text-stone-300 hover:text-stone-950 border border-white/20 hover:border-amber-400 flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer"
              aria-label="Cerrar modal"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-emerald-950/40">
          {/* Hero Image Showcase */}
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-stone-950 overflow-hidden">
            <LazyImage 
              src={galleryImages[activeImageIdx]} 
              alt={modalTitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#051c14] via-transparent to-black/40 pointer-events-none" />

            {/* Thumbnails Navigation */}
            {galleryImages.length > 1 && (
              <div className="absolute bottom-3 left-4 right-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none z-10">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`shrink-0 w-16 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      activeImageIdx === idx ? 'border-amber-400 scale-105 shadow-md shadow-amber-400/30' : 'border-white/30 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-emerald-500/20">
            {/* Left Column (Details) */}
            <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-3">
                  {modalTitle}
                </h2>
                {tour.subtitle && (
                  <p className="text-stone-300 text-sm sm:text-base font-medium">
                    {getLangText(tour.subtitle, language)}
                  </p>
                )}
              </div>

              {/* Key Chips */}
              <div className="flex flex-wrap gap-2.5">
                <div className="px-3.5 py-1.5 bg-[#03150e] rounded-full border border-emerald-500/30 flex items-center gap-2 text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-stone-200 font-bold">{tour.duration || getLangText(tour.durationLabel, language)}</span>
                </div>
                <div className="px-3.5 py-1.5 bg-[#03150e] rounded-full border border-emerald-500/30 flex items-center gap-2 text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-white font-bold">{tour.rating}</span>
                  <span className="text-stone-400">({tour.reviewsCount || 120}+ reviews)</span>
                </div>
                <div className="px-3.5 py-1.5 bg-[#03150e] rounded-full border border-emerald-500/30 flex items-center gap-2 text-xs">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-stone-200 font-bold">{language === 'es' ? 'Grupos Pequeños' : 'Small Groups'}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  {language === 'es' ? 'Descripción de la Experiencia' : 'Experience Description'}
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed whitespace-pre-line">
                  {modalDescription}
                </p>
              </div>

              {/* Inclusions */}
              {inclusions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>{language === 'es' ? '¿Qué incluye este tour?' : 'What is included?'}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {inclusions.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-stone-200">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What to Bring */}
              {whatToBring.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <Info className="w-4 h-4" />
                    <span>{language === 'es' ? '¿Qué llevar?' : 'What to bring?'}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {whatToBring.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-stone-300">
                        <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Operator Badge */}
              {operator && (
                <div className="p-4 bg-[#03150e] border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      {language === 'es' ? 'Operador Local Verificado' : 'Verified Local Operator'}
                    </div>
                    <div className="text-sm font-black text-white truncate">{operator.name}</div>
                    <div className="text-xs text-stone-400 truncate">{operator.location}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (Booking Form) */}
            <div className="lg:col-span-5 p-6 sm:p-8 bg-[#041910] space-y-5">
              <div className="p-4 bg-[#03150e] rounded-2xl border border-emerald-500/30">
                <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
                  {language === 'es' ? 'Tarifa Total Estimada' : 'Estimated Total Fare'}
                </div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400">
                  {currency === 'USD' ? `$${totalUSD} USD` : `₡${totalCRC.toLocaleString('es-CR')} CRC`}
                </div>
                <div className="text-[11px] text-stone-400 mt-1">
                  {adults} {language === 'es' ? 'Adultos' : 'Adults'}{children > 0 ? ` + ${children} ${language === 'es' ? 'Niños' : 'Children'}` : ''}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      {language === 'es' ? 'Fecha de Viaje' : 'Travel Date'} *
                    </label>
                    <input 
                      required 
                      type="date" 
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors" 
                      value={selectedDate} 
                      onChange={e => setSelectedDate(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      {language === 'es' ? 'Adultos' : 'Adults'}
                    </label>
                    <select 
                      className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                      value={adults}
                      onChange={e => setAdults(Number(e.target.value))}
                    >
                      {[1,2,3,4,5,6,7,8,9,10,12,15,20].map(n => (
                        <option key={n} value={n} className="bg-stone-900">{n} {n === 1 ? (language === 'es' ? 'Adulto' : 'Adult') : (language === 'es' ? 'Adultos' : 'Adults')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      {language === 'es' ? 'Niños (-12)' : 'Children (-12)'}
                    </label>
                    <select 
                      className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                      value={children}
                      onChange={e => setChildren(Number(e.target.value))}
                    >
                      {[0,1,2,3,4,5,6].map(n => (
                        <option key={n} value={n} className="bg-stone-900">{n} {language === 'es' ? 'Niños' : 'Children'}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      {language === 'es' ? 'Hotel / Pickup' : 'Pickup Hotel'}
                    </label>
                    <input 
                      type="text" 
                      placeholder={language === 'es' ? 'Ej: Hotel Arenal' : 'Ex: Arenal Lodge'}
                      className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                      value={pickupHotel}
                      onChange={e => setPickupHotel(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                    {language === 'es' ? 'Nombre Completo' : 'Full Name'} *
                  </label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ej: María González"
                    className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      {language === 'es' ? 'Email de Contacto' : 'Email Address'} *
                    </label>
                    <input 
                      required 
                      type="email" 
                      placeholder="maria@ejemplo.com"
                      className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      WhatsApp (+506) *
                    </label>
                    <input 
                      required 
                      type="tel" 
                      placeholder="+506 8888-8888"
                      className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                    {language === 'es' ? 'Método de Pago' : 'Payment Method'}
                  </label>
                  <select 
                    className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors" 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="credit_card" className="bg-stone-900">💳 Tarjeta de Crédito / Débito (Stripe)</option>
                    <option value="paypal" className="bg-stone-900">💳 PayPal Express</option>
                    <option value="sinpe_movil" className="bg-stone-900">📱 SINPE Móvil (Costa Rica ₡)</option>
                    <option value="pay_at_pickup" className="bg-stone-900">💵 Pago en Efectivo al Abordar</option>
                  </select>
                </div>

                {paymentMethod === 'sinpe_movil' && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-xs">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>SINPE Móvil Oficial: +506 8795 9148</span>
                    </div>
                    <p className="text-stone-300 text-[11px]">
                      {language === 'es' ? 'Envía el comprobante bancario o ingresa el número de referencia:' : 'Send bank receipt or enter reference code:'}
                    </p>
                    <input
                      type="text"
                      placeholder="Ej: SINPE-849201"
                      className="w-full bg-stone-950 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      value={sinpeRef}
                      onChange={e => setSinpeRef(e.target.value)}
                    />
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Primary Booking Button */}
                <button 
                  disabled={isSubmitting} 
                  type="submit" 
                  className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-stone-950 font-black py-3.5 px-6 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>{language === 'es' ? 'Confirmar Reserva Oficial' : 'Confirm Official Booking'}</span>
                </button>

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-stone-400 font-bold uppercase tracking-wider pt-1">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>SSL 256-bit</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>{language === 'es' ? 'Garantía 100%' : '100% Guaranteed'}</span>
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourDetailModal;

