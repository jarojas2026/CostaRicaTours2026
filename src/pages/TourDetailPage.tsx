import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, MapPin, ShieldCheck, Calendar, Users,
  ChevronRight, Lock, Sparkles, Check, Info,
  Phone, Smartphone, ArrowLeft, MessageCircle
} from 'lucide-react';
import { Tour, Language, Currency, BookingRequest } from '../types';
import { getLangText, formatCurrency } from '../utils/i18n';
import { OPERATORS } from '../data/toursData';
import { useTours } from '../contexts/ToursContext';
import { getUsdToCrcRate } from '../utils/currencies';
import { LazyImage } from '../components/LazyImage';
import { useTourMedia } from '../hooks/useTourMedia';

interface TourDetailPageProps {
  language: Language;
  currency: Currency;
}

export const TourDetailPage: React.FC<TourDetailPageProps> = ({ language, currency }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tours: TOURS, loading } = useTours();

  const [tour, setTour] = useState<Tour | null>(() => TOURS.find(t => t.id === id || t.slug === id) || null);
  const [selectedDate, setSelectedDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pickupHotel, setPickupHotel] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'paypal' | 'sinpe_movil' | 'pay_at_pickup'>('credit_card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityState, setAvailabilityState] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sinpeRef, setSinpeRef] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { assets: mediaAssets, loading: mediaLoading, error: mediaError } = useTourMedia(
    tour?.id,
    tour ? { image: tour.image, gallery: tour.gallery, title: getLangText(tour.title, language) } : undefined
  );

  useEffect(() => {
    if (TOURS.length > 0) {
      const foundTour = TOURS.find(t => t.id === id || t.slug === id);
      if (foundTour) setTour(foundTour);
      else if (!loading) navigate('/tours');
    }
  }, [id, TOURS, loading, navigate]);

  useEffect(() => {
    setAvailabilityState('idle');
    setErrorMessage(null);
  }, [selectedDate, adults, children, tour?.id]);

  if (loading || !tour) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const totalUSD = (tour.priceUSD * adults) + (tour.priceUSD * 0.7 * children);
  const crcRate = getUsdToCrcRate();
  const totalCRC = crcRate > 0 ? Math.round(totalUSD * crcRate) : 0;
  const bookingTime = tour.departureTimes?.[0] || '08:00 AM';
  const passengers = adults + children;

  const checkAvailability = async () => {
    if (!selectedDate) {
      setErrorMessage(language === 'es' ? 'Selecciona una fecha para verificar disponibilidad.' : 'Select a date to verify availability.');
      return false;
    }

    setAvailabilityState('checking');
    setErrorMessage(null);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        time: bookingTime,
        seats: String(passengers),
      });
      const response = await fetch(`/api/tours/${encodeURIComponent(tour.id)}/availability?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.available !== true) {
        setAvailabilityState('unavailable');
        setErrorMessage(
          data.reason || data.message ||
          (language === 'es'
            ? 'No puedo verificar el cupo todavía. Puedes intentar de nuevo o solicitar ayuda.'
            : 'I cannot verify availability yet. Please try again or request assistance.')
        );
        return false;
      }
      setAvailabilityState('available');
      return true;
    } catch {
      setAvailabilityState('unavailable');
      setErrorMessage(language === 'es'
        ? 'No puedo verificar el cupo todavía porque el servicio de disponibilidad no respondió.'
        : 'I cannot verify availability yet because the availability service did not respond.');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedDate || !fullName.trim() || !email.trim()) {
      setErrorMessage(language === 'es' ? 'Completa fecha, nombre y correo para continuar.' : 'Complete date, name and email to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const available = availabilityState === 'available' ? true : await checkAvailability();
      if (!available) return;

      const tourTitle = getLangText(tour.title, language, 'Tour de Costa Rica');
      const idempotencyKey = globalThis.crypto?.randomUUID?.() || `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const bookingPayload: BookingRequest & { sinpeReference?: string; currency?: Currency } = {
        tourId: tour.id,
        tourName: tourTitle,
        date: selectedDate,
        time: bookingTime,
        adults,
        children,
        pickupHotel: pickupHotel.trim(),
        specialRequests: specialRequests.trim(),
        totalUSD,
        totalCRC,
        currency,
        paymentMethod,
        ...(paymentMethod === 'sinpe_movil' && sinpeRef.trim() ? { sinpeReference: sinpeRef.trim() } : {}),
        customer: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          country: 'unspecified'
        }
      };

      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(bookingPayload)
      });
      const bookingData = await bookingRes.json().catch(() => ({}));

      if (!bookingRes.ok) {
        throw new Error(bookingData.message || bookingData.error || (language === 'es' ? 'No se pudo registrar la solicitud.' : 'The request could not be recorded.'));
      }

      const bookingId = String(bookingData.booking?.bookingId || '');
      if (bookingId) sessionStorage.setItem('crt_last_booking_id', bookingId);

      if (paymentMethod === 'credit_card') {
        const stripeRes = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            tourId: tour.id,
            tourName: tourTitle,
            totalUSD,
            customerEmail: email.trim(),
            date: selectedDate,
            passengers,
            adults,
            children
          })
        });
        const stripeData = await stripeRes.json().catch(() => ({}));
        if (!stripeRes.ok) throw new Error(stripeData.error || (language === 'es' ? 'El pago con tarjeta no está disponible.' : 'Card payment is unavailable.'));
        if (stripeData.url) {
          window.location.href = stripeData.url;
          return;
        }
      }

      if (paymentMethod === 'paypal') {
        const paypalRes = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, tourId: tour.id, tourName: tourTitle, totalUSD, date: selectedDate, adults, children })
        });
        const paypalData = await paypalRes.json().catch(() => ({}));
        if (!paypalRes.ok) throw new Error(paypalData.error || (language === 'es' ? 'PayPal no está disponible.' : 'PayPal is unavailable.'));
        if (paypalData.url) {
          window.location.href = paypalData.url;
          return;
        }
      }

      navigate('/trip', { state: { bookingId } });
    } catch (error: any) {
      setErrorMessage(error?.message || (language === 'es' ? 'No se pudo procesar la solicitud.' : 'The request could not be processed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const operator = tour.operatorId ? OPERATORS.find(op => op.id === tour.operatorId) : null;
  const gallery = mediaAssets.length > 0
    ? mediaAssets.map(asset => asset.url)
    : (Array.isArray(tour.gallery) && tour.gallery.length > 0 ? tour.gallery : [tour.image]);

  return (
    <div className="bg-stone-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-stone-900 rounded-full border border-white/5 text-stone-400 hover:text-white transition-colors"
            aria-label={language === 'es' ? 'Volver' : 'Go back'}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-stone-500">
            <span>Tours</span>
            <ChevronRight size={12} />
            <span>{getLangText(tour.region, language as any)}</span>
            <ChevronRight size={12} />
            <span className="text-emerald-500">{getLangText(tour.title, language)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <div className="relative aspect-[16/9] rounded-[2.5rem] overflow-hidden group">
              <LazyImage
                src={gallery[Math.min(activeImageIndex, gallery.length - 1)]}
                alt={mediaAssets[Math.min(activeImageIndex, mediaAssets.length - 1)]?.alt || getLangText(tour.title, language)}
                className="transition-transform duration-700 group-hover:scale-105"
                fetchPriority="high"
              />
              {mediaLoading && <div className="absolute top-4 left-4 px-3 py-2 rounded-full bg-stone-950/75 text-[10px] font-black uppercase tracking-widest text-stone-200 backdrop-blur-sm">{language === 'es' ? 'Cargando imágenes' : 'Loading images'}</div>}
              {mediaError && <div className="absolute top-4 left-4 px-3 py-2 rounded-full bg-amber-950/75 text-[10px] font-bold text-amber-200 backdrop-blur-sm">{language === 'es' ? 'Galería local disponible' : 'Local gallery available'}</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-emerald-500 scale-110 shadow-lg shadow-emerald-500/20' : 'border-white/20'}`}
                    aria-label={`${language === 'es' ? 'Ver imagen' : 'View image'} ${idx + 1}`}
                  >
                    <LazyImage src={img} className="w-full h-full object-cover" alt={mediaAssets[idx]?.alt || getLangText(tour.title, language)} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 text-emerald-400 font-black uppercase tracking-[0.2em] text-xs">
                <MapPin className="w-4 h-4" />
                <span>{tour.location?.placeName || 'Costa Rica'}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight">{getLangText(tour.title, language)}</h1>

              <div className="flex flex-wrap gap-4">
                <div className="px-5 py-3 bg-stone-900 rounded-2xl border border-white/5 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span className="text-stone-300 font-bold">{tour.duration || getLangText(tour.durationLabel, language)}</span>
                </div>
                <div className="px-5 py-3 bg-stone-900 rounded-2xl border border-white/5 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span className="text-stone-300 font-bold">{language === 'es' ? 'Cupo verificado al solicitar' : 'Availability checked when requested'}</span>
                </div>
                <div className="px-5 py-3 bg-stone-900 rounded-2xl border border-white/5 flex items-center gap-3">
                  <Users className="w-5 h-5 text-emerald-500" />
                  <span className="text-stone-300 font-bold">{tour.maxGroupSize ? `${language === 'es' ? 'Máx.' : 'Max'} ${tour.maxGroupSize}` : (language === 'es' ? 'Tamaño sujeto al operador' : 'Group size subject to operator')}</span>
                </div>
              </div>
            </div>

            <div className="prose prose-invert prose-stone max-w-none">
              <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-6">{language === 'es' ? 'Sobre esta experiencia' : 'About this experience'}</h3>
              <p className="text-stone-400 text-lg leading-relaxed">{getLangText(tour.description, language)}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-stone-900/50 rounded-[2rem] border border-white/5 space-y-4">
                <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  {language === 'es' ? 'Qué incluye' : 'What is included'}
                </h4>
                <ul className="space-y-3">
                  {(Array.isArray(tour.inclusions) ? tour.inclusions : (tour.inclusions?.[language] || tour.inclusions?.es || tour.inclusions?.en || [])).map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-stone-400 text-sm">
                      <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-8 bg-stone-900/50 rounded-[2rem] border border-white/5 space-y-4">
                <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Info className="w-5 h-5 text-emerald-500" />
                  {language === 'es' ? 'Qué llevar' : 'What to bring'}
                </h4>
                <ul className="space-y-3">
                  {(Array.isArray(tour.whatToBring) ? tour.whatToBring : (tour.whatToBring?.[language] || tour.whatToBring?.es || tour.whatToBring?.en || [])).map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-stone-400 text-sm">
                      <Check className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {tour.itinerarySteps && tour.itinerarySteps.length > 0 && (
              <div className="space-y-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-wider">{language === 'es' ? 'Itinerario' : 'Itinerary'}</h3>
                <div className="space-y-8 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-stone-800">
                  {tour.itinerarySteps.map((step, i) => (
                    <div key={i} className="relative pl-12">
                      <div className="absolute left-0 top-1.5 w-8 h-8 bg-stone-900 border-2 border-emerald-500 rounded-full flex items-center justify-center z-10">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      </div>
                      <div className="p-6 bg-stone-900/30 rounded-2xl border border-white/5">
                        <div className="text-emerald-500 font-black text-xs uppercase mb-1">{step.time}</div>
                        <h5 className="text-white font-bold mb-2">{getLangText(step.title, language)}</h5>
                        <p className="text-stone-400 text-sm">{getLangText(step.desc, language)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="p-8 bg-stone-900 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                <div className="mb-8">
                  <div className="text-stone-500 text-xs font-black uppercase tracking-widest mb-2">{language === 'es' ? 'Precio de catálogo' : 'Catalog price'}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-emerald-400">{formatCurrency(totalUSD, currency)}</span>
                    <span className="text-stone-400 text-xs font-bold uppercase">{currency} / total</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                    {language === 'es' ? 'El cupo y las condiciones operativas se verifican antes de presentar la reserva como confirmada.' : 'Availability and operational conditions are verified before a booking is shown as confirmed.'}
                  </p>
                </div>

                {operator && (
                  <div className="mb-6 p-4 bg-stone-950/70 rounded-2xl border border-emerald-500/20 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      {language === 'es' ? 'Operador asociado en catálogo' : 'Catalog operator reference'}
                    </span>
                    <div className="text-sm font-black text-white">{operator.name}</div>
                    <div className="text-xs text-stone-400">{operator.location}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] ml-4">{language === 'es' ? 'Fecha de viaje' : 'Travel date'}</label>
                    <input required type="date" className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] ml-4">{language === 'es' ? 'Adultos' : 'Adults'}</label>
                      <select className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none" value={adults} onChange={e => setAdults(Number(e.target.value))}>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] ml-4">{language === 'es' ? 'Niños' : 'Children'}</label>
                      <select className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none" value={children} onChange={e => setChildren(Number(e.target.value))}>
                        {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>

                  <button type="button" onClick={checkAvailability} disabled={!selectedDate || availabilityState === 'checking'} className="w-full border border-emerald-500/40 bg-emerald-950/50 hover:bg-emerald-950 text-emerald-200 font-bold py-3 rounded-2xl disabled:opacity-50">
                    {availabilityState === 'checking'
                      ? (language === 'es' ? 'Verificando cupo…' : 'Checking availability…')
                      : (language === 'es' ? 'Verificar disponibilidad real' : 'Check live availability')}
                  </button>

                  {availabilityState === 'available' && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-200">
                      {language === 'es' ? 'Disponibilidad verificada para esta solicitud. La confirmación final requiere completar el proceso de pago y coordinación con el proveedor.' : 'Availability verified for this request. Final confirmation still requires payment and provider coordination.'}
                    </div>
                  )}

                  <div className="space-y-3 pt-2 border-t border-white/10">
                    <input required type="text" autoComplete="name" placeholder={language === 'es' ? 'Nombre completo' : 'Full name'} value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500" />
                    <input required type="email" autoComplete="email" placeholder={language === 'es' ? 'Correo electrónico' : 'Email address'} value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500" />
                    <input type="tel" autoComplete="tel" placeholder={language === 'es' ? 'Teléfono / WhatsApp (opcional)' : 'Phone / WhatsApp (optional)'} value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500" />
                    <input type="text" placeholder={language === 'es' ? 'Hotel o punto de encuentro (opcional)' : 'Hotel or meeting point (optional)'} value={pickupHotel} onChange={e => setPickupHotel(e.target.value)} className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500" />
                    <textarea placeholder={language === 'es' ? 'Solicitudes especiales (opcional)' : 'Special requests (optional)'} value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} className="w-full min-h-20 bg-stone-950/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500 resize-y" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] ml-4">{language === 'es' ? 'Forma de continuar' : 'How to continue'}</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-emerald-500">
                      <option value="credit_card">{language === 'es' ? 'Tarjeta · Stripe' : 'Card · Stripe'}</option>
                      <option value="paypal">PayPal</option>
                      <option value="sinpe_movil">SINPE Móvil</option>
                      <option value="pay_at_pickup">{language === 'es' ? 'Solicitar coordinación antes del pago' : 'Request coordination before payment'}</option>
                    </select>
                  </div>

                  {paymentMethod === 'sinpe_movil' && (
                    <input type="text" placeholder={language === 'es' ? 'Referencia SINPE (si ya realizaste el pago)' : 'SINPE reference (if already paid)'} value={sinpeRef} onChange={e => setSinpeRef(e.target.value)} className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500" />
                  )}

                  {errorMessage && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-xs leading-relaxed text-amber-200">{errorMessage}</div>
                  )}

                  <button disabled={isSubmitting} type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black py-5 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50">
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" /> : <><Calendar className="w-5 h-5" /><span>{language === 'es' ? 'Verificar y enviar solicitud' : 'Verify and submit request'}</span></>}
                  </button>

                  <div className="grid grid-cols-3 gap-2 py-2 text-center">
                    <div className="flex flex-col items-center gap-1"><Lock size={16} className="text-emerald-500/60" /><span className="text-[8px] font-black text-stone-600 uppercase tracking-widest">{language === 'es' ? 'Verificación' : 'Verification'}</span></div>
                    <div className="flex flex-col items-center gap-1"><ShieldCheck size={16} className="text-emerald-500/60" /><span className="text-[8px] font-black text-stone-600 uppercase tracking-widest">{language === 'es' ? 'Estado visible' : 'Visible status'}</span></div>
                    <div className="flex flex-col items-center gap-1"><Smartphone size={16} className="text-emerald-500/60" /><span className="text-[8px] font-black text-stone-600 uppercase tracking-widest">{language === 'es' ? 'Asistencia' : 'Assistance'}</span></div>
                  </div>
                </form>
              </div>

              <div className="p-8 bg-stone-950 border border-white/5 rounded-[2.5rem] space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center"><Phone className="w-6 h-6 text-amber-500" /></div>
                  <div>
                    <h5 className="text-white font-bold text-sm">{language === 'es' ? '¿Necesitas ayuda?' : 'Need help?'}</h5>
                    <p className="text-stone-500 text-xs">{language === 'es' ? 'Asistencia por WhatsApp' : 'Assistance via WhatsApp'}</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/50687959148?text=${encodeURIComponent(language === 'es' ? `Hola, estoy interesado en el tour ${getLangText(tour.title, language)}. Quisiera consultar disponibilidad para ${selectedDate || '[fecha]'} para ${passengers} personas.` : `Hello, I am interested in the tour ${getLangText(tour.title, language)}. I would like to check availability for ${selectedDate || '[date]'} for ${passengers} people.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center bg-[#25D366] hover:bg-[#20ba59] text-stone-950 font-black py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>{language === 'es' ? 'Consultar por WhatsApp' : 'Inquire via WhatsApp'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
