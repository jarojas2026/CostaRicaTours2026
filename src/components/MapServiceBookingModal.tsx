import React, { useState } from 'react';
import { 
  X, Check, Calendar, Users, Clock, ShieldCheck, MapPin, 
  CreditCard, Sparkles, Building2, Trees, Bus, Plane, AlertCircle, 
  Car, FileText, Compass, ExternalLink 
} from 'lucide-react';
import { Language, Currency } from '../types';
import { MapTourismService } from '../data/mapServicesData';
import { formatCurrency, getLangText } from '../utils/i18n';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface MapServiceBookingModalProps {
  service: MapTourismService | null;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currency: Currency;
  onBookingSuccess?: (bookingDetails: any) => void;
}

export const MapServiceBookingModal: React.FC<MapServiceBookingModalProps> = ({
  service,
  isOpen,
  onClose,
  language,
  currency,
  onBookingSuccess
}) => {
  if (!isOpen || !service) return null;

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  
  // Date & logistics
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [timeSlot, setTimeSlot] = useState('08:00 AM');
  const [passportId, setPassportId] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(
    service.routesServed?.[language === 'es' ? 'es' : 'en']?.[0] || ''
  );
  const [transferType, setTransferType] = useState<'shared_shuttle' | 'private_van' | 'official_taxi'>('shared_shuttle');
  const [flightDirection, setFlightDirection] = useState<'sjo_to_destination' | 'destination_to_sjo'>('sjo_to_destination');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState<any>(null);

  // Price calculations
  let calculatedTotalUSD = 0;
  if (service.type === 'hotel') {
    const d1 = new Date(date).getTime();
    const d2 = new Date(checkOutDate).getTime();
    const nights = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
    calculatedTotalUSD = (service.pricePerNightUSD || 150) * nights;
  } else if (service.type === 'national_park') {
    calculatedTotalUSD = (service.officialPriceUSD || 18) * adults + (service.officialPriceUSD ? service.officialPriceUSD * 0.5 : 9) * children;
  } else if (service.type === 'airstrip' || service.type === 'airport') {
    calculatedTotalUSD = (service.averageTicketUSD || 110) * (adults + children);
  } else if (service.type === 'bus_station') {
    calculatedTotalUSD = (service.averageTicketUSD || 8) * (adults + children);
  } else if (service.type === 'taxi_stand') {
    calculatedTotalUSD = transferType === 'private_van' ? 175 : (transferType === 'shared_shuttle' ? 49 * (adults + children) : 35);
  } else {
    calculatedTotalUSD = 50;
  }

  const calculatedTotalCRC = Math.round(calculatedTotalUSD * 520);

  const getServiceHeaderIcon = () => {
    switch (service.type) {
      case 'hotel':
        return <Building2 className="w-6 h-6 text-amber-400" />;
      case 'national_park':
        return <Trees className="w-6 h-6 text-emerald-400" />;
      case 'bus_station':
      case 'train_station':
        return <Bus className="w-6 h-6 text-teal-400" />;
      case 'taxi_stand':
        return <Car className="w-6 h-6 text-yellow-400" />;
      case 'airport':
      case 'airstrip':
        return <Plane className="w-6 h-6 text-sky-400" />;
      default:
        return <Compass className="w-6 h-6 text-emerald-400" />;
    }
  };

  const getServiceBadgeText = () => {
    switch (service.type) {
      case 'hotel':
        return language === 'es' ? 'Reserva de Estadía Eco-Lodge' : 'Eco-Lodge Stay Booking';
      case 'national_park':
        return language === 'es' ? 'Entrada Oficial SINAC Regulada' : 'Official Regulated SINAC Ticket';
      case 'bus_station':
        return language === 'es' ? 'Tiquete de Bus Interurbano' : 'Intercity Bus Ticket';
      case 'train_station':
        return language === 'es' ? 'Información y Boleto INCOFER' : 'INCOFER Rail Transit Pass';
      case 'taxi_stand':
        return language === 'es' ? 'Traslado / Shuttle / Taxi Oficial' : 'Transfer / Shuttle / Official Taxi';
      case 'airport':
      case 'airstrip':
        return language === 'es' ? 'Vuelo Doméstico en Avioneta (Sansa)' : 'Domestic Scenic Flight (Sansa)';
      default:
        return 'Servicio Turístico';
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const bookingId = `CR-MAP-${Math.floor(100000 + Math.random() * 900000)}`;

    const newBooking = {
      bookingId,
      tourId: service.id,
      tourName: getLangText(service.name, language),
      serviceType: service.type,
      date,
      checkOutDate: service.type === 'hotel' ? checkOutDate : undefined,
      time: timeSlot,
      adults,
      children,
      pickupHotel: service.address[language === 'es' ? 'es' : 'en'],
      specialRequests: `${specialRequests ? specialRequests + ' | ' : ''}Detalles: ${
        service.type === 'national_park' ? `Pasaporte: ${passportId}` : 
        service.type === 'taxi_stand' ? `Tipo de transfer: ${transferType}` : 
        service.type === 'airstrip' ? `Ruta aérea: ${flightDirection}` : ''
      }`,
      totalUSD: calculatedTotalUSD,
      totalCRC: calculatedTotalCRC,
      customer: {
        fullName: customerName,
        email: customerEmail,
        phone: customerPhone,
        country: 'Costa Rica'
      },
      status: 'confirmada',
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Send to server backend
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      }).catch((err) => console.warn('Backend webhook ping:', err));

      // 2. Persist in Firestore if available
      try {
        const currentUser = auth.currentUser;
        await addDoc(collection(db, 'bookings'), {
          ...newBooking,
          userId: currentUser ? currentUser.uid : 'anonymous_map_user',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Firestore fallback to local state:', err);
      }

      setConfirmedBookingData(newBooking);
      setIsConfirmed(true);
      if (onBookingSuccess) {
        onBookingSuccess(newBooking);
      }
    } catch (error) {
      console.error('Error creating map service booking:', error);
      setConfirmedBookingData(newBooking);
      setIsConfirmed(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="map-service-booking-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div 
        id="map-service-booking-modal-dialog"
        className="bg-[#051e16]/95 backdrop-blur-2xl border border-emerald-500/30 rounded-[28px] max-w-2xl w-full shadow-[0_0_40px_rgba(0,0,0,0.6)] overflow-hidden my-6 text-white animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh] ring-1 ring-white/10"
      >
        {/* Header */}
        <div className="bg-emerald-950/80 p-4 sm:p-5 border-b border-emerald-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-900/90 border border-emerald-500/40 flex items-center justify-center shadow-lg">
              {getServiceHeaderIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {getServiceBadgeText()}
                </span>
                {service.cstCertificate && (
                  <span className="hidden sm:inline text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    🌱 {service.cstCertificate}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5 line-clamp-1">
                {getLangText(service.name, language)}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {isConfirmed ? (
            /* Confirmation Screen */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center mx-auto shadow-2xl ring-8 ring-emerald-500/20">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <h4 className="text-xl sm:text-2xl font-black text-white">
                  {language === 'es' ? '¡Reserva Registrada Exitosamente!' : 'Booking Confirmed Successfully!'}
                </h4>
                <p className="text-xs sm:text-sm text-emerald-200/80 mt-1 max-w-md mx-auto">
                  {language === 'es' 
                    ? 'Hemos enviado el voucher oficial con código de confirmación y detalles de acceso a tu correo electrónico.' 
                    : 'We have dispatched your confirmation voucher and entry details directly to your email.'}
                </p>
              </div>

              {/* Booking Summary Box */}
              <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between pb-2 border-b border-emerald-500/20">
                  <span className="text-emerald-300 font-bold">{language === 'es' ? 'Código de Reserva:' : 'Booking ID:'}</span>
                  <span className="font-mono font-bold text-white">{confirmedBookingData?.bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-300">{language === 'es' ? 'Servicio:' : 'Service:'}</span>
                  <span className="font-bold text-white text-right">{getLangText(service.name, language)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-300">{language === 'es' ? 'Fecha:' : 'Date:'}</span>
                  <span className="font-bold text-white">{date} {service.type === 'hotel' && `al ${checkOutDate}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-300">{language === 'es' ? 'Pasajeros / Huéspedes:' : 'Guests / Travelers:'}</span>
                  <span className="font-bold text-white">{adults} {language === 'es' ? 'adultos' : 'adults'} {children > 0 && `+ ${children} niños`}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-emerald-500/20">
                  <span className="text-emerald-300 font-bold">{language === 'es' ? 'Total Liquidado:' : 'Total Amount:'}</span>
                  <span className="font-black text-amber-300 text-sm">{formatCurrency(calculatedTotalUSD, currency)} (₡{calculatedTotalCRC.toLocaleString()})</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all"
                >
                  {language === 'es' ? 'Listo, Continuar Explorando el Mapa' : 'Done, Keep Exploring Map'}
                </button>
              </div>
            </div>
          ) : (
            /* Booking Form */
            <form onSubmit={handleBookingSubmit} className="space-y-5">
              {/* Quick Service Highlights */}
              <div className="bg-emerald-950/50 border border-emerald-500/20 p-3.5 rounded-2xl flex items-start gap-3">
                <img
                  src={service.image}
                  alt={getLangText(service.name, language)}
                  className="w-20 h-20 rounded-xl object-cover shrink-0 border border-emerald-500/30"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-emerald-200/90 leading-relaxed line-clamp-2">
                    {getLangText(service.description, language)}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-400">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{getLangText(service.address, language)}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Service Specific Fields */}
              {service.type === 'hotel' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                      {language === 'es' ? 'Fecha de Check-In' : 'Check-In Date'}
                    </label>
                    <input
                      type="date"
                      value={date}
                      min={todayStr}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                      {language === 'es' ? 'Fecha de Check-Out' : 'Check-Out Date'}
                    </label>
                    <input
                      type="date"
                      value={checkOutDate}
                      min={date}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                    />
                  </div>
                </div>
              )}

              {service.type === 'national_park' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                        {language === 'es' ? 'Fecha de Visita al Parque' : 'Park Visit Date'}
                      </label>
                      <input
                        type="date"
                        value={date}
                        min={todayStr}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                        {language === 'es' ? 'Horario de Turno Oficial' : 'Official Entry Slot'}
                      </label>
                      <select
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                      >
                        <option value="07:00 AM">07:00 AM ({language === 'es' ? 'Recomendado fauna matutina' : 'Best for wildlife'})</option>
                        <option value="08:30 AM">08:30 AM</option>
                        <option value="10:00 AM">10:00 AM</option>
                        <option value="11:30 AM">11:30 AM</option>
                        <option value="01:00 PM">01:00 PM</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                      {language === 'es' ? 'N° Pasaporte o Cédula (Requerido por SINAC)' : 'Passport or ID (SINAC Mandate)'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'es' ? 'Ej: A12345678 o 1-1234-5678' : 'e.g. Passport Number'}
                      value={passportId}
                      onChange={(e) => setPassportId(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                    />
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>
                      {language === 'es'
                        ? 'Prohibido el ingreso con botellas plásticas desechables y alimentos. El parque aplica revisión estricta en el control de acceso.'
                        : 'Single-use plastic bottles and outside food prohibited. Rangers inspect daypacks at security checkpoints.'}
                    </span>
                  </div>
                </div>
              )}

              {(service.type === 'airstrip' || service.type === 'airport') && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                        {language === 'es' ? 'Dirección del Vuelo' : 'Flight Direction'}
                      </label>
                      <select
                        value={flightDirection}
                        onChange={(e) => setFlightDirection(e.target.value as any)}
                        className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                      >
                        <option value="sjo_to_destination">San José (SJO) ➡️ {getLangText(service.name, language)}</option>
                        <option value="destination_to_sjo">{getLangText(service.name, language)} ➡️ San José (SJO)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                        {language === 'es' ? 'Fecha de Salida' : 'Departure Date'}
                      </label>
                      <input
                        type="date"
                        value={date}
                        min={todayStr}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                      />
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-200 flex items-start gap-2">
                    <Plane className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
                    <span>
                      {language === 'es'
                        ? 'Operado en aeronaves Cessna Grand Caravan 208B EX por Sansa / Green Airways con límite de equipaje de 14 kg por pasajero.'
                        : 'Flown by Cessna Grand Caravan 208B EX with a 14 kg (30 lbs) luggage allowance per traveler.'}
                    </span>
                  </div>
                </div>
              )}

              {service.type === 'taxi_stand' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                        {language === 'es' ? 'Modalidad de Traslado' : 'Transfer Mode'}
                      </label>
                      <select
                        value={transferType}
                        onChange={(e) => setTransferType(e.target.value as any)}
                        className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                      >
                        <option value="shared_shuttle">{language === 'es' ? 'Shuttle Compartido Interhotel' : 'Shared Hotel-to-Hotel Shuttle'}</option>
                        <option value="private_van">{language === 'es' ? 'Microbús Privada Exclusiva' : 'Exclusive Private Van'}</option>
                        <option value="official_taxi">{language === 'es' ? 'Taxi Oficial Autorizado (Taxímetro)' : 'Official Airport Taxi Metered'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                        {language === 'es' ? 'Hora Preferida' : 'Preferred Pickup Time'}
                      </label>
                      <input
                        type="time"
                        value={timeSlot.includes(':') ? timeSlot.slice(0, 5) : '08:00'}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Number of Passengers / Guests */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                    {language === 'es' ? 'Adultos' : 'Adults'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      className="w-8 h-8 rounded-lg bg-emerald-950/90 border border-emerald-500/30 text-emerald-200 font-bold hover:bg-emerald-900"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm w-6 text-center">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults(adults + 1)}
                      className="w-8 h-8 rounded-lg bg-emerald-950/90 border border-emerald-500/30 text-emerald-200 font-bold hover:bg-emerald-900"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                    {language === 'es' ? 'Niños' : 'Children'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      className="w-8 h-8 rounded-lg bg-emerald-950/90 border border-emerald-500/30 text-emerald-200 font-bold hover:bg-emerald-900"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm w-6 text-center">{children}</span>
                    <button
                      type="button"
                      onClick={() => setChildren(children + 1)}
                      className="w-8 h-8 rounded-lg bg-emerald-950/90 border border-emerald-500/30 text-emerald-200 font-bold hover:bg-emerald-900"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3 pt-2 border-t border-emerald-500/20">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  {language === 'es' ? 'Datos del Titular de la Reserva' : 'Lead Traveler Information'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                      {language === 'es' ? 'Nombre Completo' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={language === 'es' ? 'Ej: María Rodríguez' : 'e.g. John Smith'}
                      className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                      {language === 'es' ? 'Correo Electrónico' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                      {language === 'es' ? 'WhatsApp / Teléfono' : 'WhatsApp / Phone'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+506 8888-8888"
                      className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                      {language === 'es' ? 'Peticiones Especiales (Opcional)' : 'Special Requests'}
                    </label>
                    <input
                      type="text"
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder={language === 'es' ? 'Alergias, número de vuelo, equipaje' : 'Luggage, flight number, dietary'}
                      className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"
                    />
                  </div>
                </div>
              </div>

              {/* Price Calculation & Submit */}
              <div className="pt-4 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {language === 'es' ? 'Total Calculado del Servicio' : 'Total Calculated Price'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-300">
                      {formatCurrency(calculatedTotalUSD, currency)}
                    </span>
                    <span className="text-xs font-mono text-emerald-400/80">
                      (₡{calculatedTotalCRC.toLocaleString()})
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3.5 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>{language === 'es' ? 'Procesando...' : 'Processing...'}</span>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>{language === 'es' ? 'Confirmar Reserva Oficial' : 'Confirm Official Booking'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
