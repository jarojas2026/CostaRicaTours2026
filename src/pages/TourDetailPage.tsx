import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, Clock, MapPin, CheckCircle2, ShieldCheck, Calendar, Users, Hotel, 
  ChevronRight, ChevronLeft, X, AlertCircle, CreditCard, Smartphone, Banknote, 
  Lock, Sparkles, Check, Info, ArrowRight, Phone, Save, Wifi, WifiOff, Trash2,
  Heart, Share2, ArrowLeft, MessageCircle
} from 'lucide-react';
import { Tour, Language, Currency, BookingRequest, OperatorProfile } from '../types';
import { getLangText, formatCurrency } from '../utils/i18n';
import { OPERATORS } from '../data/toursData';
import { useTours } from '../contexts/ToursContext';

interface TourDetailPageProps {
  language: Language;
  currency: Currency;
}

export const TourDetailPage: React.FC<TourDetailPageProps> = ({ language, currency }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tours: TOURS, loading } = useTours();
  
  const [tour, setTour] = useState<Tour | null>(null);
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
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!loading && TOURS.length > 0) {
      const foundTour = TOURS.find(t => t.id === id);
      if (foundTour) {
        setTour(foundTour);
      } else {
        navigate('/tours');
      }
    }
  }, [id, TOURS, loading, navigate]);

  if (loading || !tour) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

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
    
    const bookingPayload: BookingRequest = {
      bookingId: generatedBookingId,
      tourId: tour.id,
      tourName: tourTitle,
      date: selectedDate,
      time: tour.departureTimes?.[0] || '08:00 AM',
      adults,
      children,
      pickupHotel: pickupHotel || 'Hotel',
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
        body: JSON.stringify(bookingPayload)
      });

      if (!bookingRes.ok) throw new Error('Error creating booking');

      if (paymentMethod === 'credit_card') {
        const stripeRes = await fetch('/api/stripe/create-checkout-session', {
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
      }

      // Success logic...
      setIsSubmitting(false);
      navigate('/bookings'); // Assume this page exists or will exist
    } catch (error: any) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
    }
  };

  const operator = tour.operatorId ? OPERATORS.find(op => op.id === tour.operatorId) : null;
  const gallery = Array.isArray(tour.gallery) && tour.gallery.length > 0 ? tour.gallery : [tour.image];

  return (
    <div className="bg-stone-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs & Back */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-stone-900 rounded-full border border-white/5 text-stone-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-stone-500">
            <span>{language === 'es' ? 'Tours' : 'Tours'}</span>
            <ChevronRight size={12} />
            <span>{getLangText(tour.region, language as any)}</span>
            <ChevronRight size={12} />
            <span className="text-emerald-500">{getLangText(tour.title, language)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Gallery Section */}
            <div className="relative aspect-[16/9] rounded-[2.5rem] overflow-hidden group">
              <img 
                src={gallery[activeImageIndex]} 
                alt={getLangText(tour.title, language)}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent" />
              
              {/* Thumbnails */}
              <div className="absolute bottom-6 left-6 right-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                      activeImageIndex === idx ? 'border-emerald-500 scale-110 shadow-lg shadow-emerald-500/20' : 'border-white/20'
                    }`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Stats */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-emerald-400 font-black uppercase tracking-[0.2em] text-xs">
                <MapPin className="w-4 h-4" />
                <span>{tour.location?.placeName || 'Costa Rica'}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight">
                {getLangText(tour.title, language)}
              </h1>
              
              <div className="flex flex-wrap gap-4">
                <div className="px-5 py-3 bg-stone-900 rounded-2xl border border-white/5 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span className="text-stone-300 font-bold">{tour.duration || getLangText(tour.durationLabel, language)}</span>
                </div>
                <div className="px-5 py-3 bg-stone-900 rounded-2xl border border-white/5 flex items-center gap-3">
                  <Star className="w-5 h-5 text-amber-500" />
                  <span className="text-stone-300 font-bold">{tour.rating} (150+ reviews)</span>
                </div>
                <div className="px-5 py-3 bg-stone-900 rounded-2xl border border-white/5 flex items-center gap-3">
                  <Users className="w-5 h-5 text-emerald-500" />
                  <span className="text-stone-300 font-bold">{language === 'es' ? 'Grupos Pequeños' : 'Small Groups'}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-invert prose-stone max-w-none">
              <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-6">{language === 'es' ? 'Sobre esta experiencia' : 'About this experience'}</h3>
              <p className="text-stone-400 text-lg leading-relaxed">{getLangText(tour.description, language)}</p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-stone-900/50 rounded-[2rem] border border-white/5 space-y-4">
                <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  {language === 'es' ? 'Qué incluye' : 'What is included'}
                </h4>
                <ul className="space-y-3">
                  {(Array.isArray(tour.inclusions) 
                    ? tour.inclusions 
                    : (tour.inclusions?.[language] || tour.inclusions?.es || tour.inclusions?.en || [])
                  ).map((item, i) => (
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
                  {(Array.isArray(tour.whatToBring) 
                    ? tour.whatToBring 
                    : (tour.whatToBring?.[language] || tour.whatToBring?.es || tour.whatToBring?.en || [])
                  ).map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-stone-400 text-sm">
                      <Check className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Itinerary */}
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

          {/* Sticky Sidebar: Booking Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="p-8 bg-stone-900 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                <div className="mb-8">
                  <div className="text-stone-500 text-xs font-black uppercase tracking-widest mb-2">{language === 'es' ? 'Desde' : 'From'}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-emerald-400">
                      {formatCurrency(totalUSD, currency)}
                    </span>
                    <span className="text-stone-400 text-xs font-bold uppercase">{currency} / {language === 'es' ? 'total' : 'total'}</span>
                  </div>
                </div>

                {operator && (
                  <div className="mb-6 p-4 bg-stone-950/70 rounded-2xl border border-emerald-500/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                        {language === 'es' ? 'Operador Oficial' : 'Verified Operator'}
                      </span>
                      <span className="text-[10px] text-emerald-300 font-bold">★ {operator.rating} ({operator.reviewsCount})</span>
                    </div>
                    <div className="text-sm font-black text-white">{operator.name}</div>
                    <div className="text-xs text-stone-400">{operator.location}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] ml-4">{language === 'es' ? 'Fecha de Viaje' : 'Travel Date'}</label>
                      <input 
                        required 
                        type="date" 
                        className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors" 
                        value={selectedDate} 
                        onChange={e => setSelectedDate(e.target.value)} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] ml-4">{language === 'es' ? 'Adultos' : 'Adults'}</label>
                        <select 
                          className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                          value={adults}
                          onChange={e => setAdults(Number(e.target.value))}
                        >
                          {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] ml-4">{language === 'es' ? 'Niños' : 'Children'}</label>
                        <select 
                          className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                          value={children}
                          onChange={e => setChildren(Number(e.target.value))}
                        >
                          {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <button 
                    disabled={isSubmitting}
                    type="submit" 
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black py-5 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Calendar className="w-5 h-5" />
                        <span>{language === 'es' ? 'Reservar Ahora' : 'Book Now'}</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-6 py-2">
                    <div className="flex flex-col items-center gap-1">
                      <Lock size={16} className="text-emerald-500/50" />
                      <span className="text-[8px] font-black text-stone-600 uppercase tracking-widest">{language === 'es' ? 'Seguro' : 'Secure'}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <ShieldCheck size={16} className="text-emerald-500/50" />
                      <span className="text-[8px] font-black text-stone-600 uppercase tracking-widest">{language === 'es' ? 'Garantizado' : 'Guaranteed'}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Smartphone size={16} className="text-emerald-500/50" />
                      <span className="text-[8px] font-black text-stone-600 uppercase tracking-widest">{language === 'es' ? 'Móvil' : 'Mobile'}</span>
                    </div>
                  </div>
                </form>
              </div>

              {/* Support Card */}
              <div className="p-8 bg-stone-950 border border-white/5 rounded-[2.5rem] space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                    <Phone className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h5 className="text-white font-bold text-sm">{language === 'es' ? '¿Necesitas ayuda?' : 'Need help?'}</h5>
                    <p className="text-stone-500 text-xs">{language === 'es' ? 'Soporte 24/7 vía WhatsApp' : '24/7 support via WhatsApp'}</p>
                  </div>
                </div>
                <a 
                  href={`https://wa.me/50687959148?text=${encodeURIComponent(
                    language === 'es'
                      ? `Hola, estoy interesado en el tour ${getLangText(tour.title, language)}. Quisiera consultar disponibilidad para ${selectedDate || '[fecha]'} para ${adults + children} personas.`
                      : `Hello, I am interested in the tour ${getLangText(tour.title, language)}. I would like to check availability for ${selectedDate || '[date]'} for ${adults + children} people.`
                  )}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-[#25D366] hover:bg-[#20ba59] text-stone-950 font-black py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
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
