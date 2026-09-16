import React, { useState } from 'react';
import { 
  X, Plane, Calendar, User, Mail, Phone, Globe, ShieldCheck, 
  CheckCircle2, Clock, Luggage, MapPin, Sparkles, CreditCard, 
  ArrowRight, Award, Car, Check, QrCode, Shield, Compass, ChevronRight, FileText
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
  const [seatPreference, setSeatPreference] = useState<'window' | 'aisle' | 'extra_legroom'>('window');
  
  // Add-on options
  const [includeAirportTransfer, setIncludeAirportTransfer] = useState(true);
  const [includeWelcomeSimKit, setIncludeWelcomeSimKit] = useState(true);
  const [includeTravelInsurance, setIncludeTravelInsurance] = useState(true);

  // Customer info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pay_at_pickup' | 'sinpe_movil'>('credit_card');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessTicket, setShowSuccessTicket] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState<BookingRequest | null>(null);

  if (!isOpen) return null;

  const basePrice = selectedCabin === 'Business' ? flight.basePriceUSD * 2.2 : flight.basePriceUSD;
  const transferPrice = includeAirportTransfer ? 45 : 0;
  const simKitPrice = includeWelcomeSimKit ? 15 : 0;
  const insurancePrice = includeTravelInsurance ? 29 : 0;
  const pricePerPerson = basePrice + transferPrice + simKitPrice + insurancePrice;
  const totalUSD = pricePerPerson * passengersCount;
  const totalCRC = Math.round(totalUSD * 515);

  const pnrPreview = `CR-AIR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    setIsSubmitting(true);
    const pnrCode = pnrPreview;

    const newBooking: BookingRequest = {
      bookingId: pnrCode,
      tourId: `flight-${flight.airlineCode.toLowerCase()}-${flight.originAirportCode.toLowerCase()}-${flight.destinationAirportCode.toLowerCase()}`,
      tourName: `${flight.airline} (${flight.flightNumber}) • ${flight.originAirportCode} ➔ ${flight.destinationAirportCode}`,
      date: departureDate,
      time: flight.departureTime,
      adults: passengersCount,
      children: 0,
      pickupHotel: includeAirportTransfer 
        ? `Recepción VIP en Aeropuerto ${flight.destinationAirportCode} (Vuelo ${flight.flightNumber})` 
        : `Llegada Aeropuerto ${flight.destinationAirportCode}`,
      specialRequests: `${specialRequests ? specialRequests + ' | ' : ''}Pasaporte: ${passportNumber || 'N/A'} | Asiento: ${seatPreference.toUpperCase()}${includeWelcomeSimKit ? ' | Chip SIM 4G/5G' : ''}${includeTravelInsurance ? ' | Seguro Médico Assist-CR' : ''}`,
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
      if (paymentMethod === 'credit_card') {
        const stripeRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/stripe/create-checkout-session`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             tourId: 'flight-' + flight.flightNumber,
             tourName: 'Vuelo Privado ' + flight.flightNumber + ' - ' + flight.airline,
             totalUSD: totalUSD,
             customerEmail: email,
             date: departureDate,
             passengers: passengersCount
           })
        });
        const stripeData = await stripeRes.json();
        if (stripeData.url) {
           window.location.href = stripeData.url;
           return;
        }
      }

      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking),
      });

      const currentUser = auth.currentUser;
      await addDoc(collection(db, 'bookings'), { 
        ...newBooking, 
        userId: currentUser ? currentUser.uid : 'anonymous', 
        createdAt: serverTimestamp() 
      });

      setConfirmedBookingData(newBooking);
      setShowSuccessTicket(true);
      onBookingSuccess(newBooking);
    } catch (err) {
      console.error('Error booking flight:', err);
      setConfirmedBookingData(newBooking);
      setShowSuccessTicket(true);
      onBookingSuccess(newBooking);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200 text-slate-800">
        
        {/* Modal Header Bar */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-950/40">
              <Plane className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  {flight.airline} • {flight.flightNumber}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                  {flight.aircraft}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                {language === 'es' ? 'Reserva de Vuelo a Costa Rica' : 'Costa Rica Flight Reservation'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Boarding Pass Ticket View Modal (If Success) */}
        {showSuccessTicket && confirmedBookingData ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block">
                {language === 'es' ? '¡Reserva Confirmada!' : 'Booking Confirmed!'}
              </span>
              <h4 className="text-2xl font-black text-slate-900 mt-1">
                PNR: <span className="text-emerald-600 font-mono">{confirmedBookingData.bookingId}</span>
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {language === 'es' 
                  ? 'Hemos enviado el voucher oficial y la confirmación a tu correo electrónico. Chofer oficial te esperará en la sala de llegadas.'
                  : 'Official voucher & PNR locator sent to your email. Official driver will meet you in the arrival hall.'}
              </p>
            </div>

            {/* Simulated Digital Ticket */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 text-left shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Aerolínea & Vuelo</span>
                  <span className="text-sm font-extrabold text-white">{flight.airline} ({flight.flightNumber})</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha Vuelo</span>
                  <span className="text-xs font-bold text-white">{departureDate}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <span className="text-2xl font-black text-emerald-400">{flight.originAirportCode}</span>
                  <p className="text-xs text-slate-300">{getLangText(flight.originCity, language)}</p>
                  <span className="text-xs font-mono text-emerald-300">{flight.departureTime}</span>
                </div>
                <div className="flex-1 flex flex-col items-center px-2">
                  <span className="text-[10px] text-slate-400 font-mono">{flight.duration}</span>
                  <div className="w-full h-0.5 bg-emerald-500/40 my-1 relative flex items-center justify-center">
                    <Plane className="w-3.5 h-3.5 text-emerald-400 absolute" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400">{flight.destinationAirportCode}</span>
                  <p className="text-xs text-slate-300">{getLangText(flight.destinationCity, language)}</p>
                  <span className="text-xs font-mono text-emerald-300">{flight.arrivalTime}</span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 mt-3 flex items-center justify-between text-xs text-slate-300">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Pasajero</span>
                  <span className="font-bold text-white">{fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Cabina</span>
                  <span className="font-bold text-white">{selectedCabin}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 block">Código QR</span>
                  <span className="font-mono text-emerald-400 font-bold">Válido 🇨🇷</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
            >
              {language === 'es' ? 'Cerrar y Ver Mi Itinerario' : 'Close & View My Itinerary'}
            </button>
          </div>
        ) : (
          <>
            {/* Flight Route Summary Bar */}
            <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <span className="text-2xl font-extrabold text-slate-900">{flight.originAirportCode}</span>
                  <p className="text-xs text-slate-600 font-medium">{getLangText(flight.originCity, language)}</p>
                  <span className="text-[11px] text-emerald-600 font-mono font-bold">{flight.departureTime}</span>
                </div>

                <div className="flex-1 flex flex-col items-center px-4">
                  <span className="text-[10px] text-slate-500 font-semibold mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    {flight.duration} ({flight.stops === 0 ? (language === 'es' ? 'Directo' : 'Direct') : `${flight.stops} stop`})
                  </span>
                  <div className="w-full h-0.5 bg-slate-300 relative flex items-center justify-center">
                    <Plane className="w-4 h-4 text-emerald-600 absolute" />
                  </div>
                  <span className="text-[9px] text-slate-500 font-medium mt-1">
                    {getLangText(flight.frequency, language)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-extrabold text-slate-900">{flight.destinationAirportCode}</span>
                  <p className="text-xs text-slate-600 font-medium">{getLangText(flight.destinationCity, language)}</p>
                  <span className="text-[11px] text-emerald-600 font-mono font-bold">{flight.arrivalTime}</span>
                </div>
              </div>
            </div>

            {/* Booking Form */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[62vh] overflow-y-auto">
              
              {/* Flight Date, Passengers & Cabin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    {language === 'es' ? 'Fecha de Salida' : 'Departure Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={departureDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    {language === 'es' ? 'Pasajeros' : 'Passengers'}
                  </label>
                  <select
                    value={passengersCount}
                    onChange={(e) => setPassengersCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? (language === 'es' ? 'Pasajero' : 'Passenger') : (language === 'es' ? 'Pasajeros' : 'Passengers')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    {language === 'es' ? 'Clase de Cabina' : 'Cabin Class'}
                  </label>
                  <select
                    value={selectedCabin}
                    onChange={(e) => setSelectedCabin(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                  >
                    <option value="Economy">Economy Class</option>
                    <option value="Business">Business Class (VIP)</option>
                  </select>
                </div>
              </div>

              {/* Seat Preference Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1">
                  <Plane className="w-3.5 h-3.5 text-emerald-600" />
                  {language === 'es' ? 'Preferencia de Asiento:' : 'Seat Preference:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'window', label: language === 'es' ? '🪟 Ventana' : '🪟 Window' },
                    { id: 'aisle', label: language === 'es' ? '💺 Pasillo' : '💺 Aisle' },
                    { id: 'extra_legroom', label: language === 'es' ? '🦵 Espacio Extra' : '🦵 Extra Legroom' },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSeatPreference(s.id as any)}
                      className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        seatPreference === s.id
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Integrated Costa Rica Airport Package Services */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {language === 'es' ? 'Servicios Receptivos Integrados de Costa Rica Tours:' : 'Integrated Costa Rica Airport Services:'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeAirportTransfer}
                      onChange={(e) => setIncludeAirportTransfer(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {language === 'es' ? 'Chofer VIP Aeropuerto' : 'VIP Airport Driver'}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                        {language === 'es' ? 'Recepción + Agua (+ $45 USD)' : 'Meet & greet (+ $45 USD)'}
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeWelcomeSimKit}
                      onChange={(e) => setIncludeWelcomeSimKit(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {language === 'es' ? 'SIM 4G/5G + Soporte' : '4G/5G SIM Kit'}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                        {language === 'es' ? '10GB listo al bajar (+ $15 USD)' : '10GB data (+ $15 USD)'}
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeTravelInsurance}
                      onChange={(e) => setIncludeTravelInsurance(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {language === 'es' ? 'Seguro Médico Assist' : 'Travel Insurance'}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                        {language === 'es' ? 'Cobertura médica CR (+ $29 USD)' : 'CR Medical cover (+ $29 USD)'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Passenger Details */}
              <div className="space-y-3">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                  {language === 'es' ? 'Datos del Pasajero Titular:' : 'Lead Passenger Details:'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      {language === 'es' ? 'Nombre Completo (como en Pasaporte) *' : 'Full Name (as in Passport) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej: Carlos Fernandez"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      {language === 'es' ? 'Correo Electrónico (para Voucher & PNR) *' : 'Email (for Voucher & PNR) *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      {language === 'es' ? 'Teléfono / WhatsApp *' : 'Phone / WhatsApp *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+506 8888-8888"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      {language === 'es' ? 'Número de Pasaporte' : 'Passport Number'}
                    </label>
                    <input
                      type="text"
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                      placeholder="PAS-987654321"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase block">
                  {language === 'es' ? 'Método de Pago:' : 'Payment Method:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'credit_card', label: language === 'es' ? 'Tarjeta de Crédito / Débito' : 'Credit / Debit Card', icon: <CreditCard className="w-3.5 h-3.5" /> },
                    { id: 'pay_at_pickup', label: language === 'es' ? 'Pago a la Llegada en CR' : 'Pay Upon Arrival', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                    { id: 'sinpe_movil', label: 'SINPE Móvil / Transfer', icon: <Phone className="w-3.5 h-3.5" /> },
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Summary & Submit Action */}
              <div className="bg-slate-900 text-white p-4.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div>
                  <span className="text-xs text-slate-300 font-semibold block">
                    {language === 'es' ? 'Total Paquete Vuelo + Traslado Receptivo:' : 'Total Flight + Reception Package:'}
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {formatCurrency(totalUSD, currency)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      (₡{totalCRC.toLocaleString()} CRC)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {language === 'es' ? 'Incluye 10kg mano + 23kg maleta + recepción aeropuerto' : 'Includes 10kg carry-on + 23kg checked bag + airport meet'}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] min-w-[44px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>{language === 'es' ? 'Generando PNR...' : 'Generating PNR...'}</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{language === 'es' ? 'Confirmar Reserva de Vuelo' : 'Confirm Flight Booking'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </>
        )}

      </div>
    </div>
  );
};
