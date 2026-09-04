import React, { useState } from 'react';
import { 
  X, Plane, Calendar, User, Mail, Phone, Globe, ShieldCheck, 
  CheckCircle2, Clock, Luggage, MapPin, Sparkles, CreditCard, 
  ArrowRight, Award, Car, Check
} from 'lucide-react';
import { FlightRoute, Language, Currency, BookingRequest } from '../types';
import { formatCurrency, getLangText } from '../utils/i18n';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface FlightBookingModalProps {
  flight: FlightRoute;
  isOpen: boolean;
  language: Language;
  currency: Currency;
  onClose: () => void;
  onBookingSuccess: (booking: BookingRequest) => void;
}

export const FlightBookingModal: React.FC<FlightBookingModalProps> = ({
  flight,
  isOpen,
  language,
  currency,
  onClose,
  onBookingSuccess,
}) => {
  const [departureDate, setDepartureDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [passengersCount, setPassengersCount] = useState(1);
  const [selectedCabin, setSelectedCabin] = useState<'Economy' | 'Business'>(flight.cabinClass === 'Business' ? 'Business' : 'Economy');
  const [includeAirportTransfer, setIncludeAirportTransfer] = useState(true);
  const [includeWelcomeSimKit, setIncludeWelcomeSimKit] = useState(true);

  // Customer info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pay_at_pickup' | 'sinpe_movil'>('credit_card');

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const basePrice = selectedCabin === 'Business' ? flight.basePriceUSD * 2.5 : flight.basePriceUSD;
  const transferPrice = includeAirportTransfer ? 45 : 0;
  const simKitPrice = includeWelcomeSimKit ? 15 : 0;
  const pricePerPerson = basePrice + transferPrice + simKitPrice;
  const totalUSD = pricePerPerson * passengersCount;
  const totalCRC = Math.round(totalUSD * 515);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    setIsSubmitting(true);
    const pnrCode = `CR-AIR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newBooking: BookingRequest = {
      bookingId: pnrCode,
      tourId: `flight-${flight.airlineCode.toLowerCase()}-${flight.originAirportCode.toLowerCase()}-${flight.destinationAirportCode.toLowerCase()}`,
      tourName: `${flight.airline} (${flight.flightNumber}) • ${flight.originAirportCode} ➔ ${flight.destinationAirportCode}`,
      date: departureDate,
      time: flight.departureTime,
      adults: passengersCount,
      children: 0,
      pickupHotel: includeAirportTransfer 
        ? `Recepción Receptiva VIP en Aeropuerto ${flight.destinationAirportCode} (Vuelo ${flight.flightNumber})` 
        : `Llegada Aeropuerto ${flight.destinationAirportCode}`,
      specialRequests: `${specialRequests ? specialRequests + ' | ' : ''}Pasaporte: ${passportNumber || 'N/A'}${includeWelcomeSimKit ? ' | Incluye Chip SIM + Asistencia Pura Vida' : ''}`,
      totalUSD,
      totalCRC,
      customer: {
        fullName,
        email,
        phone: phone || '+506 8795-9148',
        country: flight.originCountry,
      },
      paymentMethod,
      paymentStatus: paymentMethod === 'pay_at_pickup' ? 'on_arrival' : 'completed',
      flightDetails: {
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        originCode: flight.originAirportCode,
        originCity: getLangText(flight.originCity, language),
        destinationCode: flight.destinationAirportCode,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        cabinClass: selectedCabin,
        includesBaggage: true,
        includesAirportTransfer: includeAirportTransfer,
        passengerCount: passengersCount,
        pnrLocator: pnrCode,
      },
      status: 'confirmada',
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Post to backend
      
      if (paymentMethod === 'credit_card') {
        const stripeRes = await fetch('/api/stripe/create-checkout-session', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             tourId: 'flight-' + flight.flightNumber,
             tourName: 'Vuelo Privado ' + flight.flightNumber + ' - ' + flight.airline,
             totalUSD: flight.priceUSD * (passengersCount),
             customerEmail: email,
             date: flight.departureDate,
             passengers: passengersCount
           })
        });
        const stripeData = await stripeRes.json();
        if (stripeData.url) {
           window.location.href = stripeData.url;
           return;
        } else {
           throw new Error(stripeData.error || 'Error al conectar con Stripe');
        }
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking),
      });
      const data = await res.json();

      // 2. Save in Firestore if logged in
      const currentUser = auth.currentUser;
      await addDoc(collection(db, 'bookings'), { ...newBooking, userId: currentUser ? currentUser.uid : 'anonymous', createdAt: serverTimestamp() });

      onBookingSuccess(data.booking || newBooking);
      onClose();
    } catch (err) {
      console.error('Error booking flight:', err);
      onBookingSuccess(newBooking);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-950 border-2 border-orange-400/80 rounded-[2rem] max-w-2xl w-full shadow-2xl overflow-hidden my-6 animate-fade-in text-white">
        
        {/* Modal Header */}
        <div className="bg-stone-900/90 p-5 sm:p-6 border-b border-teal-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-400 text-stone-950 flex items-center justify-center font-black shadow-lg">
              <Plane className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-orange-400/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-400/40">
                  {flight.airline} • {flight.flightNumber}
                </span>
                <span className="text-[10px] bg-stone-800 text-stone-200 px-2 py-0.5 rounded-full font-bold">
                  {flight.aircraft}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                {language === 'es' ? 'Reserva de Vuelo a Costa Rica' : 'Book Flight to Costa Rica'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-stone-950/80 hover:bg-stone-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Flight Route Summary Bar */}
        <div className="bg-stone-950 p-4 sm:p-5 border-b border-teal-500/20">
          <div className="flex items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-2xl font-black text-orange-400">{flight.originAirportCode}</span>
              <p className="text-xs text-neutral-300 font-bold">{getLangText(flight.originCity, language)}</p>
              <span className="text-[11px] text-teal-300 font-mono">{flight.departureTime}</span>
            </div>

            <div className="flex-1 flex flex-col items-center px-4">
              <span className="text-[10px] text-neutral-400 font-bold mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-orange-400" />
                {flight.duration} ({flight.stops === 0 ? (language === 'es' ? 'Directo' : 'Direct') : `${flight.stops} stop`})
              </span>
              <div className="w-full h-0.5 bg-teal-500/40 relative flex items-center justify-center">
                <Plane className="w-4 h-4 text-orange-400 absolute" />
              </div>
              <span className="text-[9px] text-teal-400 font-semibold mt-1">
                {getLangText(flight.frequency, language)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-2xl font-black text-orange-400">{flight.destinationAirportCode}</span>
              <p className="text-xs text-neutral-300 font-bold">{getLangText(flight.destinationCity, language)}</p>
              <span className="text-[11px] text-teal-300 font-mono">{flight.arrivalTime}</span>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          
          {/* Flight Date & Passengers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-200 uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                {language === 'es' ? 'Fecha de Salida' : 'Departure Date'}
              </label>
              <input
                type="date"
                required
                value={departureDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full bg-stone-900/60 border border-teal-500/30 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-orange-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-200 uppercase flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-orange-400" />
                {language === 'es' ? 'Pasajeros' : 'Passengers'}
              </label>
              <select
                value={passengersCount}
                onChange={(e) => setPassengersCount(Number(e.target.value))}
                className="w-full bg-stone-900/60 border border-teal-500/30 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-orange-400 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                  <option key={num} value={num} className="bg-stone-950 text-white">
                    {num} {num === 1 ? (language === 'es' ? 'Pasajero' : 'Passenger') : (language === 'es' ? 'Pasajeros' : 'Passengers')}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-200 uppercase flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-orange-400" />
                {language === 'es' ? 'Clase de Cabina' : 'Cabin Class'}
              </label>
              <select
                value={selectedCabin}
                onChange={(e) => setSelectedCabin(e.target.value as any)}
                className="w-full bg-stone-900/60 border border-teal-500/30 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-orange-400 cursor-pointer"
              >
                <option value="Economy" className="bg-stone-950 text-white">Economy Class</option>
                <option value="Business" className="bg-stone-950 text-white">Business Class (VIP)</option>
              </select>
            </div>
          </div>

          {/* Add-ons for Costa Rica Tours Package */}
          <div className="bg-stone-900/40 p-4 rounded-2xl border border-teal-500/30 space-y-3">
            <span className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {language === 'es' ? 'Servicios Receptivos Integrados de Costa Rica Tours:' : 'Integrated Costa Rica Tours Airport Services:'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-950/80 border border-teal-500/30 cursor-pointer hover:border-orange-400 transition-colors">
                <input
                  type="checkbox"
                  checked={includeAirportTransfer}
                  onChange={(e) => setIncludeAirportTransfer(e.target.checked)}
                  className="w-4 h-4 accent-orange-400 rounded mt-0.5"
                />
                <div>
                  <span className="text-xs font-black text-white flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-orange-400" />
                    {language === 'es' ? 'Traslado Receptivo VIP Aeropuerto' : 'VIP Airport Meet & Transfer'}
                  </span>
                  <p className="text-[11px] text-neutral-300 mt-0.5 leading-tight">
                    {language === 'es' 
                      ? 'Chofer certificado con cartel a tu nombre + agua embotellada al hotel (+ $45 USD)'
                      : 'Driver with sign in arrival hall + bottled water to your hotel (+ $45 USD)'}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-950/80 border border-teal-500/30 cursor-pointer hover:border-orange-400 transition-colors">
                <input
                  type="checkbox"
                  checked={includeWelcomeSimKit}
                  onChange={(e) => setIncludeWelcomeSimKit(e.target.checked)}
                  className="w-4 h-4 accent-orange-400 rounded mt-0.5"
                />
                <div>
                  <span className="text-xs font-black text-white flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-teal-400" />
                    {language === 'es' ? 'Kit SIM 4G/5G + Soporte WhatsApp' : '4G/5G SIM Kit + 24/7 Concierge'}
                  </span>
                  <p className="text-[11px] text-neutral-300 mt-0.5 leading-tight">
                    {language === 'es' 
                      ? 'Chip prepago 10GB listo para usar + asistencia 24h (+ $15 USD)'
                      : '10GB prepaid SIM card active upon arrival + 24/7 support (+ $15 USD)'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Passenger Information */}
          <div className="space-y-3">
            <span className="text-xs font-black text-stone-200 uppercase tracking-wider block">
              {language === 'es' ? 'Datos del Pasajero Titular:' : 'Lead Passenger Details:'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-300">
                  {language === 'es' ? 'Nombre y Apellidos (como en Pasaporte) *' : 'Full Name (as in Passport) *'}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Carlos Fernandez"
                  className="w-full bg-stone-900/60 border border-teal-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-300">
                  {language === 'es' ? 'Correo Electrónico (para Voucher & PNR) *' : 'Email (for Voucher & PNR) *'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-stone-900/60 border border-teal-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-300">
                  {language === 'es' ? 'Teléfono / WhatsApp *' : 'Phone / WhatsApp *'}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full bg-stone-900/60 border border-teal-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-300">
                  {language === 'es' ? 'Número de Pasaporte (opcional)' : 'Passport Number (optional)'}
                </label>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  placeholder="P12345678"
                  className="w-full bg-stone-900/60 border border-teal-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-200 uppercase block">
              {language === 'es' ? 'Método de Pago:' : 'Payment Method:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'credit_card', label: language === 'es' ? 'Tarjeta de Crédito / Débito' : 'Credit / Debit Card', icon: <CreditCard className="w-3.5 h-3.5" /> },
                { id: 'pay_at_pickup', label: language === 'es' ? 'Pago a la Llegada en CR' : 'Pay Upon Arrival in CR', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                { id: 'sinpe_movil', label: 'SINPE Móvil / Transfer', icon: <Phone className="w-3.5 h-3.5" /> },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === m.id
                      ? 'bg-orange-400 text-stone-950 border-orange-400 font-black shadow-md'
                      : 'bg-stone-900/60 text-neutral-300 border-teal-500/20 hover:bg-stone-800/80'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Total Summary & Submit */}
          <div className="bg-stone-900/80 p-4 rounded-2xl border border-orange-400/40 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-neutral-300 font-bold block">
                {language === 'es' ? 'Total Vuelo + Servicios Receptivos:' : 'Total Flight + Services:'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-orange-400">
                  {formatCurrency(totalUSD, currency)}
                </span>
                <span className="text-xs text-teal-300 font-mono">
                  (₡{totalCRC.toLocaleString()} CRC)
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                {language === 'es' ? 'Incluye equipaje de mano 10kg + maleta 23kg + tasas aéreas' : 'Includes 10kg carry-on + 23kg checked bag + airport taxes'}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-400 hover:bg-orange-300 text-stone-950 font-black px-6 py-3.5 rounded-full text-xs uppercase tracking-wider transition-all shadow-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{language === 'es' ? 'Confirmando PNR...' : 'Confirming PNR...'}</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{language === 'es' ? 'Confirmar Reserva de Vuelo' : 'Confirm Flight Booking'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
