import React, { useState, useEffect, useRef } from 'react';
import { createBookingAttempt, requirePaymentUrl } from '../utils/bookingAttempt';
import { bookingInquiry } from '../utils/bookingInquiry';
import { directWhatsAppUrl } from '../utils/directWhatsApp';
import { 
  Star, Clock, CheckCircle2, ShieldCheck, Calendar, Users, X, AlertCircle, CreditCard, Smartphone,
  Lock, Sparkles, Check, Info, MessageCircle
} from 'lucide-react';
import { Tour, Language, Currency, BookingRequest } from '../types';
import { getLangText } from '../utils/i18n';
import { getUsdToCrcRate } from '../utils/currencies';
import { OPERATORS } from '../data/toursData';
import { LazyImage } from './LazyImage';
import { isBookableTour } from '../utils/tourListing';

interface TourDetailModalProps {
  tour: Tour | null;
  isOpen?: boolean;
  onClose: () => void;
  language: Language;
  currency: Currency;
  onConfirmBooking?: (booking: BookingRequest) => void;
  onBookingSuccess?: (booking: BookingRequest) => void;
}

type ProviderCheckState = 'idle' | 'checking' | 'confirmed' | 'pending' | 'unavailable';

export const TourDetailModal: React.FC<TourDetailModalProps> = ({ 
  tour, isOpen = true, onClose, language, currency, onConfirmBooking, onBookingSuccess 
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pickupHotel, setPickupHotel] = useState('');
  const [specialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'paypal' | 'sinpe_movil' | 'pay_at_pickup'>('credit_card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sinpeRef, setSinpeRef] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [providerCheckState, setProviderCheckState] = useState<ProviderCheckState>('idle');
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const attempt = useRef(createBookingAttempt());
  const submitting = useRef(false);

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

  const childPrice = tour.childPriceUSD ?? Math.round(tour.priceUSD * 70) / 100;
  const totalUSD = (Math.round(tour.priceUSD * 100) * adults + Math.round(childPrice * 100) * children) / 100;
  const crcRate = getUsdToCrcRate();
  const totalCRC = crcRate > 0 ? Math.round(totalUSD * crcRate) : 0;

  const galleryImages: string[] = Array.isArray(tour.gallery) && tour.gallery.length > 0 
    ? tour.gallery 
    : [tour.image || 'https://images.unsplash.com/photo-1651261932254-fd342bc4d999?auto=format&fit=crop&w=1200&q=85'];

  const operator = tour.operatorId ? OPERATORS.find(op => op.id === tour.operatorId) : null;
  const isBookable = isBookableTour(tour);
  const hasVerifiedRating = isBookable && tour.reviewsVerified === true && tour.reviewsCount > 0;
  const modalTitle = getLangText(tour.title, language, 'Tour de Costa Rica');
  const modalDescription = getLangText(tour.description, language, '');

  const inclusions: string[] = Array.isArray(tour.inclusions) 
    ? tour.inclusions 
    : (tour.inclusions?.[language] || tour.inclusions?.es || tour.inclusions?.en || []);

  const whatToBring: string[] = Array.isArray(tour.whatToBring) 
    ? tour.whatToBring 
    : (tour.whatToBring?.[language] || tour.whatToBring?.es || tour.whatToBring?.en || []);

  const buildBookingRequest = () => {
    const departureTime = selectedTime || tour.departureTimes?.[0] || '08:00 AM';
    const bookingPayload: BookingRequest = {
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
      customer: { fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), country: 'unspecified' }
    };
    const requestBody = {
      ...bookingPayload,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      sinpeReference: undefined
    };
    const idempotencyKey = attempt.current({ ...bookingPayload, sinpeRef });
    return { bookingPayload, requestBody, idempotencyKey };
  };

  /**
   * Reconsulta el mismo expediente usando el contrato idempotente de /api/bookings.
   * No abre el endpoint operacional /api/provider/status al público y no crea una
   * segunda reserva: la misma Idempotency-Key + el mismo cuerpo devuelve el booking
   * existente, ya enriquecido por la respuesta del proveedor.
   */
  const waitForProviderResponse = async (maxWaitMs = 60_000): Promise<ProviderCheckState> => {
    const deadline = Date.now() + maxWaitMs;
    setProviderCheckState('checking');

    while (Date.now() < deadline) {
      try {
        const { requestBody, idempotencyKey } = buildBookingRequest();
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify(requestBody),
          cache: 'no-store'
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.booking) {
          const providerStatus = String(data.booking.providerStatus || '').toLowerCase();
          const serviceOrderStatus = String(data.booking.serviceOrderStatus || '').toLowerCase();
          if (
            data.booking.providerConfirmedAt ||
            ['confirmed', 'confirmada', 'available', 'accepted'].includes(providerStatus) ||
            ['confirmed', 'confirmada', 'available', 'accepted'].includes(serviceOrderStatus)
          ) {
            setProviderCheckState('confirmed');
            return 'confirmed';
          }
          if (
            ['rejected', 'declined', 'unavailable', 'cancelled', 'canceled'].includes(providerStatus) ||
            ['rejected', 'declined', 'unavailable', 'cancelled', 'canceled'].includes(serviceOrderStatus)
          ) {
            setProviderCheckState('unavailable');
            return 'unavailable';
          }
        }
      } catch (error) {
        console.warn('Provider-backed booking replay failed:', error);
      }

      await new Promise(resolve => window.setTimeout(resolve, 3000));
    }

    setProviderCheckState('pending');
    return 'pending';
  };

  const continueToOnlinePayment = async (bookingId: string) => {
    if (paymentMethod === 'credit_card') {
      const stripeRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
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
      if (!stripeRes.ok) throw new Error(stripeData.error || 'Pago no disponible / Payment unavailable');
      window.location.href = requirePaymentUrl(stripeData.url);
      return true;
    }

    if (paymentMethod === 'paypal') {
      const paypalRes = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, totalUSD, tourName: modalTitle, tourId: tour.id, passengers: adults + children, adults, children })
      });
      const paypalData = await paypalRes.json();
      if (!paypalRes.ok) throw new Error(paypalData.error || 'PayPal no disponible / PayPal unavailable');
      window.location.href = requirePaymentUrl(paypalData.url);
      return true;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setErrorMessage(null);
    setStatusMessage(null);
    if (!selectedDate || !fullName || !email || !phone) {
      setErrorMessage(language === 'es' ? 'Por favor completa todos los campos requeridos.' : 'Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    submitting.current = true;

    const { bookingPayload, requestBody, idempotencyKey } = buildBookingRequest();

    try {
      let bookingId: string = pendingBookingId || '';
      let confirmedBooking: any = null;

      if (!bookingId) {
        setStatusMessage(language === 'es'
          ? 'Registrando tu solicitud y consultando al proveedor real. No se realizará ningún cobro hasta confirmar disponibilidad.'
          : 'Registering your request and checking with the real provider. No charge will be made until availability is confirmed.');

        const bookingRes = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify(requestBody)
        });

        const bookingData = await bookingRes.json();

        if (!bookingRes.ok || !bookingData.booking?.bookingId) {
          throw new Error(bookingData.message || bookingData.error || (language === 'es' ? 'Error al registrar la solicitud en el servidor.' : 'Error creating the request on server.'));
        }

        bookingId = String(bookingData.booking.bookingId);
        confirmedBooking = bookingData.booking;
        setPendingBookingId(bookingId);
        sessionStorage.setItem('crt_last_booking_id', bookingId);
      }

      setStatusMessage(language === 'es'
        ? `Solicitud ${bookingId} enviada. Esperando respuesta del proveedor para ${selectedDate}.`
        : `Request ${bookingId} sent. Waiting for the provider response for ${selectedDate}.`);

      const providerResult = await waitForProviderResponse();

      if (providerResult === 'unavailable') {
        setStatusMessage(language === 'es'
          ? 'El proveedor no confirmó el espacio solicitado. No se realizó ningún cobro. Revisaremos alternativas para la misma fecha.'
          : 'The provider did not confirm the requested space. No charge was made. We will review alternatives for the same date.');
        return;
      }

      if (providerResult !== 'confirmed') {
        setStatusMessage(language === 'es'
          ? `La solicitud ${bookingId} sigue en espera del proveedor. No se realizó ningún cobro. Puedes volver a pulsar el botón para revisar la respuesta sin crear otra solicitud.`
          : `Request ${bookingId} is still waiting for the provider. No charge was made. You can press the button again to check the response without creating another request.`);
        return;
      }

      setStatusMessage(language === 'es'
        ? 'Disponibilidad confirmada por el proveedor. Ahora sí podemos continuar con el método de pago elegido.'
        : 'Availability confirmed by the provider. We can now continue with your selected payment method.');

      const redirected = await continueToOnlinePayment(bookingId);
      if (redirected) return;

      if (paymentMethod === 'sinpe_movil') {
        setStatusMessage(language === 'es'
          ? `Disponibilidad confirmada para ${bookingId}. Ahora puedes realizar SINPE al +506 8795 9148. La reserva no se marcará como pagada hasta que el comprobante sea verificado por el servidor.`
          : `Availability confirmed for ${bookingId}. You may now complete SINPE to +506 8795 9148. The booking will not be marked paid until the receipt is verified by the server.`);
        return;
      }

      if (paymentMethod === 'pay_at_pickup') {
        setStatusMessage(language === 'es'
          ? `Disponibilidad confirmada para ${bookingId}. Elegiste pago al abordar; la solicitud queda registrada y sujeta a las reglas finales del proveedor. No se realizó un cobro online.`
          : `Availability confirmed for ${bookingId}. You selected pay at pickup; the request is recorded and remains subject to the provider's final rules. No online charge was made.`);
        if (confirmedBooking) {
          if (onBookingSuccess) onBookingSuccess(confirmedBooking);
          else if (onConfirmBooking) onConfirmBooking(confirmedBooking);
        }
      }
    } catch (error: any) {
      console.error('Error al procesar reserva:', error);
      setErrorMessage(error.message || (language === 'es' ? 'Ocurrió un error al procesar tu solicitud.' : 'An error occurred processing your request.'));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const whatsappInquiryUrl = directWhatsAppUrl(bookingInquiry({ language, tour: modalTitle, date: selectedDate, adults, children, pickup: pickupHotel }));

  const requestLocked = Boolean(pendingBookingId);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#051c14] border border-emerald-500/30 text-stone-100 rounded-3xl shadow-2xl shadow-black/90 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
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

            <button
              onClick={onClose}
              type="button"
              className="w-10 h-10 rounded-full bg-stone-900/90 hover:bg-amber-500 text-stone-300 hover:text-stone-950 border border-white/20 hover:border-amber-400 flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer"
              aria-label={language === 'es' ? 'Cerrar' : 'Close'}
              title={language === 'es' ? 'Cerrar (Esc)' : 'Close (Esc)'}
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-emerald-950/40">
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-stone-950 overflow-hidden">
            <LazyImage 
              src={galleryImages[activeImageIdx]} 
              alt={modalTitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#051c14] via-transparent to-black/40 pointer-events-none" />

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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-emerald-500/20">
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

              <div className="flex flex-wrap gap-2.5">
                <div className="px-3.5 py-1.5 bg-[#03150e] rounded-full border border-emerald-500/30 flex items-center gap-2 text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-stone-200 font-bold">{tour.duration || getLangText(tour.durationLabel, language)}</span>
                </div>
                {hasVerifiedRating && <div className="px-3.5 py-1.5 bg-[#03150e] rounded-full border border-emerald-500/30 flex items-center gap-2 text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-white font-bold">{tour.rating}</span>
                  <span className="text-stone-400">({tour.reviewsCount} {language === 'es' ? 'reseñas verificadas' : 'verified reviews'})</span>
                </div>}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  {language === 'es' ? 'Descripción de la Experiencia' : 'Experience Description'}
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed whitespace-pre-line">
                  {modalDescription}
                </p>
              </div>

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

              {operator?.verifiedBadge && isBookable && (
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

            <div className="lg:col-span-5 p-6 sm:p-8 bg-[#041910] space-y-5">
              {isBookable ? <>
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

              <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-wide">
                <div className={`rounded-xl border p-2 text-center ${pendingBookingId ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-stone-400'}`}>{language === 'es' ? '1. Solicitud' : '1. Request'}</div>
                <div className={`rounded-xl border p-2 text-center ${providerCheckState === 'confirmed' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : providerCheckState === 'checking' || providerCheckState === 'pending' ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/5 text-stone-400'}`}>{language === 'es' ? '2. Proveedor' : '2. Provider'}</div>
                <div className={`rounded-xl border p-2 text-center ${providerCheckState === 'confirmed' ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/5 text-stone-400'}`}>{language === 'es' ? '3. Pago' : '3. Payment'}</div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-xs text-stone-300">
                  {language === 'es' ? 'Horario publicado por el proveedor' : 'Provider departure time'}
                  <select required disabled={requestLocked} value={selectedTime || tour.departureTimes?.[0] || ''} onChange={e => setSelectedTime(e.target.value)} className="mt-2 w-full rounded-xl bg-stone-950 border border-white/15 p-3">
                    {(tour.departureTimes || []).map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                </label>
                {tour.cancellationPolicy && <p className="text-xs text-stone-300">{language === 'es' ? 'Cancelación: ' : 'Cancellation: '}{tour.cancellationPolicy}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      {language === 'es' ? 'Fecha de Viaje' : 'Travel Date'} *
                    </label>
                    <input 
                      required 
                      disabled={requestLocked}
                      type="date" 
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-60" 
                      value={selectedDate} 
                      aria-label={language === 'es' ? 'Fecha de viaje' : 'Travel date'}
                      onChange={e => { setSelectedDate(e.target.value); setProviderCheckState('idle'); setStatusMessage(null); }} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      {language === 'es' ? 'Adultos' : 'Adults'}
                    </label>
                    <select 
                      disabled={requestLocked}
                      className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-60"
                      value={adults}
                      aria-label={language === 'es' ? 'Adultos' : 'Adults'}
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
                      disabled={requestLocked}
                      className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-60"
                      value={children}
                      aria-label={language === 'es' ? 'Niños' : 'Children'}
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
                      disabled={requestLocked}
                      type="text" 
                      placeholder={language === 'es' ? 'Ej: Hotel Arenal' : 'Ex: Arenal Lodge'}
                      className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-60"
                      value={pickupHotel}
                      aria-label={language === 'es' ? 'Hotel o punto de encuentro' : 'Hotel or meeting point'}
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
                    disabled={requestLocked}
                    type="text" 
                    placeholder="Ej: María González"
                    className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-60" 
                    value={fullName} 
                    autoComplete="name"
                    aria-label={language === 'es' ? 'Nombre completo' : 'Full name'}
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
                      disabled={requestLocked}
                      type="email" 
                      placeholder="maria@ejemplo.com"
                      className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-60" 
                      value={email} 
                      autoComplete="email"
                      aria-label={language === 'es' ? 'Correo electrónico' : 'Email address'}
                      onChange={e => setEmail(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      WhatsApp / Phone *
                    </label>
                    <input 
                      required 
                      disabled={requestLocked}
                      type="tel" 
                      placeholder="+506 8888-8888"
                      className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-60" 
                      value={phone} 
                      autoComplete="tel"
                      aria-label={language === 'es' ? 'Teléfono con código de país' : 'Phone with country code'}
                      onChange={e => setPhone(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                    {language === 'es' ? 'Método de pago preferido (después de disponibilidad)' : 'Preferred payment method (after availability)'}
                  </label>
                  <select 
                    disabled={requestLocked}
                    className="w-full bg-stone-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-60" 
                    value={paymentMethod} 
                    aria-label={language === 'es' ? 'Método de pago' : 'Payment method'}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="credit_card" className="bg-stone-900">💳 Tarjeta de Crédito / Débito (Stripe)</option>
                    <option value="paypal" className="bg-stone-900">💳 PayPal Express</option>
                    <option value="sinpe_movil" className="bg-stone-900">📱 SINPE Móvil (Costa Rica ₡)</option>
                    <option value="pay_at_pickup" className="bg-stone-900">💵 Pago en Efectivo al Abordar</option>
                  </select>
                </div>

                {requestLocked && providerCheckState !== 'confirmed' && (
                  <p className="text-[11px] text-stone-400">
                    {language === 'es'
                      ? 'Los datos quedan bloqueados mientras consultamos este mismo expediente para evitar solicitudes duplicadas.'
                      : 'Details are locked while this same request is checked to prevent duplicate bookings.'}
                  </p>
                )}

                {paymentMethod === 'sinpe_movil' && (
                  <div className={`p-3 rounded-xl space-y-1.5 text-xs border ${providerCheckState === 'confirmed' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                    <div className={`font-bold flex items-center gap-1.5 ${providerCheckState === 'confirmed' ? 'text-emerald-300' : 'text-amber-400'}`}>
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>{providerCheckState === 'confirmed' ? 'SINPE Móvil Oficial: +506 8795 9148' : (language === 'es' ? 'Primero confirmamos disponibilidad' : 'Availability is confirmed first')}</span>
                    </div>
                    <p className="text-stone-300 text-[11px]">
                      {providerCheckState === 'confirmed'
                        ? (language === 'es' ? 'El proveedor confirmó espacio. El pago sólo contará cuando el comprobante sea verificado por el servidor.' : 'The provider confirmed space. Payment only counts after the receipt is server-verified.')
                        : (language === 'es' ? 'No realices la transferencia todavía. Enviaremos la solicitud al proveedor y habilitaremos el pago cuando confirme el espacio.' : 'Do not transfer yet. We will ask the provider first and enable payment only after the space is confirmed.')}
                    </p>
                    {providerCheckState === 'confirmed' && (
                      <input
                        type="text"
                        placeholder="Ej: SINPE-849201"
                        className="w-full bg-stone-950 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        value={sinpeRef}
                        aria-label={language === 'es' ? 'Referencia SINPE' : 'SINPE reference'}
                        onChange={e => setSinpeRef(e.target.value)}
                      />
                    )}
                  </div>
                )}

                {statusMessage && (
                  <div role="status" className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${providerCheckState === 'confirmed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'}`}>
                    {providerCheckState === 'confirmed' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <Clock className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span>{statusMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div role="alert" className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <div><span>{errorMessage}</span><a href={whatsappInquiryUrl} target="_blank" rel="noopener noreferrer" className="block mt-2 underline font-bold">{language === 'es' ? 'Continuar la solicitud por WhatsApp (sin confirmar reserva)' : 'Continue inquiry on WhatsApp (not a confirmed booking)'}</a></div>
                  </div>
                )}

                <button 
                  disabled={isSubmitting} 
                  type="submit" 
                  className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-stone-950 font-black py-3.5 px-6 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  ) : providerCheckState === 'confirmed' ? (
                    <CreditCard className="w-4 h-4" />
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                  <span>
                    {pendingBookingId
                      ? (providerCheckState === 'confirmed'
                          ? (language === 'es' ? 'Continuar al pago' : 'Continue to payment')
                          : (language === 'es' ? 'Revisar respuesta del proveedor' : 'Check provider response'))
                      : (language === 'es' ? 'Consultar disponibilidad y solicitar reserva' : 'Check availability & request booking')}
                  </span>
                </button>

                <div className="flex items-center justify-center gap-4 text-[10px] text-stone-400 font-bold uppercase tracking-wider pt-1">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>{language === 'es' ? 'Sin cobro antes de disponibilidad' : 'No charge before availability'}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>{language === 'es' ? 'Proveedor verificado' : 'Verified provider'}</span>
                  </span>
                </div>
              </form>
              </> : (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                    {language === 'es' ? 'Ficha de exploración · no reservable todavía' : 'Discovery listing · not bookable yet'}
                  </div>
                  <h3 className="mt-2 text-xl font-black text-white">
                    {language === 'es' ? 'Confirma primero quién opera esta experiencia' : 'First confirm who operates this experience'}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-300">
                    {language === 'es'
                      ? 'Esta ficha es una referencia para explorar Costa Rica. El operador, la tarifa actual y los cupos no están conectados a inventario verificado, así que no acepta reservas ni pagos desde aquí.'
                      : 'This listing is a reference for exploring Costa Rica. The operator, current price and availability are not connected to verified inventory, so booking and payment are not enabled here.'}
                  </p>
                  <a href={whatsappInquiryUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-black text-stone-950 hover:bg-[#20ba59]">
                    <MessageCircle className="w-4 h-4" />
                    {language === 'es' ? 'Preguntar por opciones verificables' : 'Ask for verifiable options'}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourDetailModal;
