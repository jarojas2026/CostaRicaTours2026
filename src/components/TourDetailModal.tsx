import React, { useState, useEffect, useRef } from 'react';
import { Tour, Language, Currency, BookingRequest } from '../types';
import { getLangText, formatCurrency } from '../utils/i18n';
import { LazyImage } from './LazyImage';
import { 
  Star, Clock, MapPin, CheckCircle2, ShieldCheck, Calendar, Users, Hotel, 
  ChevronRight, ChevronLeft, X, AlertCircle, CreditCard, Smartphone, Banknote, 
  Lock, Sparkles, Check, Info, ArrowRight, Phone, Save, Wifi, WifiOff, Trash2
} from 'lucide-react';

const DRAFT_STORAGE_KEY = 'costa_rica_tour_booking_draft';

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
  tour,
  isOpen,
  onClose,
  language,
  currency,
  onConfirmBooking,
  onBookingSuccess
}) => {
  const isModalOpen = isOpen !== undefined ? isOpen : !!tour;
  const handleConfirm = onConfirmBooking || onBookingSuccess;

  // Multi-step booking funnel state: 1: Details, 2: Traveler info, 3: Payment
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState(tour?.departureTimes[0] || '08:00 AM');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pickupHotel, setPickupHotel] = useState(tour?.pickupHotels[0] || 'Recepción del Hotel');
  const [specialRequests, setSpecialRequests] = useState('');

  // Traveler contact info
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCountry, setCustomerCountry] = useState('Costa Rica / USA');

  // Payment method & info
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'sinpe_movil' | 'pay_at_pickup' | 'paypal'>('credit_card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [sinpePhoneOrRef, setSinpePhoneOrRef] = useState('');
  const [isTestCardApplied, setIsTestCardApplied] = useState(false);
  
  // Facturación Electrónica Hacienda Costa Rica
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [invoiceIdType, setInvoiceIdType] = useState('cedula_fisica');
  const [invoiceIdNumber, setInvoiceIdNumber] = useState('');
  const [invoiceLegalName, setInvoiceLegalName] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoicePhone, setInvoicePhone] = useState('');
  const [invoiceProvincia, setInvoiceProvincia] = useState('San José');
  const [invoiceCanton, setInvoiceCanton] = useState('');
  const [invoiceDistrito, setInvoiceDistrito] = useState('');
  const [invoiceAddress, setInvoiceAddress] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save & Offline state
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [restoredDraftNotice, setRestoredDraftNotice] = useState(false);
  const hasRestoredRef = useRef(false);

  // Network connection listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Restore draft on open
  useEffect(() => {
    if (isModalOpen && tour && !hasRestoredRef.current) {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft) {
            let restored = false;
            if (draft.customerName) { setCustomerName(draft.customerName); restored = true; }
            if (draft.customerEmail) { setCustomerEmail(draft.customerEmail); restored = true; }
            if (draft.customerPhone) { setCustomerPhone(draft.customerPhone); restored = true; }
            if (draft.customerCountry) setCustomerCountry(draft.customerCountry);
            if (draft.specialRequests) { setSpecialRequests(draft.specialRequests); restored = true; }
            if (draft.wantsInvoice !== undefined) setWantsInvoice(draft.wantsInvoice);
            if (draft.invoiceIdType) setInvoiceIdType(draft.invoiceIdType);
            if (draft.invoiceIdNumber) setInvoiceIdNumber(draft.invoiceIdNumber);
            if (draft.invoiceLegalName) setInvoiceLegalName(draft.invoiceLegalName);
            if (draft.invoiceEmail) setInvoiceEmail(draft.invoiceEmail);
            if (draft.invoicePhone) setInvoicePhone(draft.invoicePhone);
            if (draft.invoiceProvincia) setInvoiceProvincia(draft.invoiceProvincia);
            if (draft.invoiceCanton) setInvoiceCanton(draft.invoiceCanton);
            if (draft.invoiceDistrito) setInvoiceDistrito(draft.invoiceDistrito);
            if (draft.invoiceAddress) setInvoiceAddress(draft.invoiceAddress);
            if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);

            // If draft is for the same tour, restore step and tour-specific details
            if (draft.tourId === tour.id) {
              if (draft.selectedDate) setSelectedDate(draft.selectedDate);
              if (draft.selectedTime) setSelectedTime(draft.selectedTime);
              if (draft.adults) setAdults(draft.adults);
              if (draft.children !== undefined) setChildren(draft.children);
              if (draft.pickupHotel) setPickupHotel(draft.pickupHotel);
              if (draft.currentStep && draft.currentStep > 1) setCurrentStep(draft.currentStep);
            }

            if (restored) {
              setRestoredDraftNotice(true);
              if (draft.savedAt) {
                setLastSavedTime(draft.savedAt);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error reading booking draft from localStorage:', e);
      }
      hasRestoredRef.current = true;
    }
  }, [isModalOpen, tour]);

  // Periodic Auto-Save into localStorage
  useEffect(() => {
    if (!isModalOpen || !tour) return;

    const performSave = () => {
      // Check if user has entered any custom data worth saving
      const hasUserData = Boolean(
        customerName.trim() || 
        customerEmail.trim() || 
        customerPhone.trim() || 
        specialRequests.trim() || 
        wantsInvoice || 
        invoiceIdNumber.trim() ||
        adults !== 2 || 
        children !== 0 ||
        currentStep > 1
      );

      if (!hasUserData) return;

      const now = new Date();
      const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const draftPayload = {
        tourId: tour.id,
        tourName: getLangText(tour.title, 'es'),
        selectedDate,
        selectedTime,
        adults,
        children,
        pickupHotel,
        specialRequests,
        customerName,
        customerEmail,
        customerPhone,
        customerCountry,
        paymentMethod,
        wantsInvoice,
        invoiceIdType,
        invoiceIdNumber,
        invoiceLegalName,
        invoiceEmail,
        invoicePhone,
        invoiceProvincia,
        invoiceCanton,
        invoiceDistrito,
        invoiceAddress,
        currentStep,
        savedAt: timeFormatted,
        updatedAt: now.toISOString()
      };

      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
        setLastSavedTime(timeFormatted);
      } catch (err) {
        console.warn('Could not save booking draft:', err);
      }
    };

    // Save with debounce
    const debounceTimer = setTimeout(performSave, 400);

    // Periodic backup timer every 3 seconds
    const intervalTimer = setInterval(performSave, 3000);

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(intervalTimer);
    };
  }, [
    isModalOpen, tour, selectedDate, selectedTime, adults, children,
    pickupHotel, specialRequests, customerName, customerEmail, customerPhone,
    customerCountry, paymentMethod, wantsInvoice, invoiceIdType, invoiceIdNumber,
    invoiceLegalName, invoiceEmail, invoicePhone, invoiceProvincia, invoiceCanton,
    invoiceDistrito, invoiceAddress, currentStep
  ]);

  // Discard draft handler
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setSpecialRequests('');
    setWantsInvoice(false);
    setInvoiceIdNumber('');
    setInvoiceLegalName('');
    setInvoiceEmail('');
    setInvoicePhone('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardHolder('');
    setSinpePhoneOrRef('');
    setRestoredDraftNotice(false);
    setLastSavedTime(null);
    setCurrentStep(1);
  };

  React.useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      if (tour && (tour as any).tentativeDate) {
        setSelectedDate((tour as any).tentativeDate);
      } else {
        const storedDate = sessionStorage.getItem('tentative_travel_date');
        if (storedDate) {
          setSelectedDate(storedDate);
        }
      }
    } else {
      document.body.style.overflow = '';
      setCurrentStep(1);
      hasRestoredRef.current = false;
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, tour]);

  if (!isModalOpen || !tour) return null;

  const tourTitle = getLangText(tour.title, language);
  const tourDesc = getLangText(tour.description, language);
  const tourHighlights = getLangText(tour.highlights, language, []);
  const tourInclusions = getLangText(tour.inclusions, language, []);
  const tourExclusions = getLangText(tour.exclusions, language, []);
  const tourWhatToBring = getLangText(tour.whatToBring, language, []);

  // Quick dates
  const today = new Date();
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const in3DaysDate = new Date(today);
  in3DaysDate.setDate(today.getDate() + 3);
  const in3DaysStr = in3DaysDate.toISOString().split('T')[0];

  const in7DaysDate = new Date(today);
  in7DaysDate.setDate(today.getDate() + 7);
  const in7DaysStr = in7DaysDate.toISOString().split('T')[0];

  // Calculation (Children 50% discount)
  const childPriceUSD = Math.round(tour.priceUSD * 0.5);
  const adultsSubtotalUSD = adults * tour.priceUSD;
  const childrenSubtotalUSD = children * childPriceUSD;
  const baseTotalUSD = adultsSubtotalUSD + childrenSubtotalUSD;
  
  // Group discount (10% off for 5+ people)
  const totalPax = adults + children;
  const isGroupDiscount = totalPax >= 5;
  const discountUSD = isGroupDiscount ? Math.round(baseTotalUSD * 0.10) : 0;
  const totalUSD = baseTotalUSD - discountUSD;
  const totalCRC = Math.round(totalUSD * 515);

  const formatPrice = (usdVal: number) => {
    return `${formatCurrency(usdVal, currency)} ${currency}`;
  };

  // Demo test card helper
  const handleApplyDemoCard = () => {
    setCardNumber('4242 •••• •••• 4242');
    setCardExpiry('12/28');
    setCardCvv('789');
    setCardHolder(customerName || 'Carlos Rodríguez (Demo)');
    setIsTestCardApplied(true);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
      val = `${val.substring(0, 2)}/${val.substring(2, 4)}`;
    }
    setCardExpiry(val);
  };

  const validateStep1 = () => {
    if (!selectedDate) {
      alert(language === 'es' ? 'Por favor selecciona la fecha del tour.' : 'Please select the tour date.');
      return false;
    }
    if (adults < 1) {
      alert(language === 'es' ? 'Debes incluir al menos 1 adulto.' : 'Must include at least 1 adult.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!customerName.trim()) {
      alert(language === 'es' ? 'Por favor ingresa el nombre del titular.' : 'Please enter the lead traveler full name.');
      return false;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      alert(language === 'es' ? 'Por favor ingresa un correo electrónico válido para enviar el voucher.' : 'Please enter a valid email address for the voucher.');
      return false;
    }
    if (!customerPhone.trim()) {
      alert(language === 'es' ? 'Por favor ingresa un teléfono o WhatsApp de contacto.' : 'Please enter a contact phone or WhatsApp.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (wantsInvoice) {
      const idClean = invoiceIdNumber.replace(/[-\s]/g, '');
      if (invoiceIdType === 'cedula_fisica' && idClean.length !== 9) {
        alert(language === 'es' ? 'La Cédula Física debe tener exactamente 9 dígitos.' : 'Physical ID must be exactly 9 digits.');
        return;
      }
      if ((invoiceIdType === 'cedula_juridica' || invoiceIdType === 'nite') && idClean.length !== 10) {
        alert(language === 'es' ? 'La Cédula Jurídica/NITE debe tener exactamente 10 dígitos.' : 'Legal ID/NITE must be exactly 10 digits.');
        return;
      }
      if (invoiceIdType === 'dimex' && (idClean.length < 11 || idClean.length > 12)) {
        alert(language === 'es' ? 'El DIMEX debe tener 11 o 12 dígitos.' : 'DIMEX must be 11 or 12 digits.');
        return;
      }
    }

    const finalName = customerName.trim() || 'Carlos Rodríguez';
    const finalEmail = customerEmail.trim() || 'carlos.rodriguez@gmail.com';
    const finalPhone = customerPhone.trim() || '+506 8888-7777';

    // Determine status based on payment method
    let bookingStatus: 'confirmada' | 'pagada' | 'solicitada' = 'confirmada';
    let paymentStatus: 'completed' | 'on_arrival' | 'pending' = 'completed';

    if (paymentMethod === 'pay_at_pickup') {
      bookingStatus = 'confirmada';
      paymentStatus = 'on_arrival';
    } else if (paymentMethod === 'credit_card' || paymentMethod === 'paypal') {
      bookingStatus = 'pagada';
      paymentStatus = 'completed';
    } else if (paymentMethod === 'sinpe_movil') {
      bookingStatus = sinpePhoneOrRef ? 'pagada' : 'solicitada';
      paymentStatus = sinpePhoneOrRef ? 'completed' : 'pending';
    }

    setIsSubmitting(true);
    const bookingPayload: BookingRequest = {
      tourId: tour.id,
      tourName: tourTitle,
      date: selectedDate || tomorrowStr,
      time: selectedTime || (tour.departureTimes && tour.departureTimes[0]) || '08:00 AM',
      adults: adults || 1,
      children: children || 0,
      pickupHotel: pickupHotel || (tour.pickupHotels && tour.pickupHotels[0]) || 'Recepción del Hotel',
      specialRequests: specialRequests.trim() || undefined,
      totalUSD,
      totalCRC,
      paymentMethod,
      paymentStatus,
      status: bookingStatus,
      customer: {
        fullName: finalName,
        email: finalEmail,
        phone: finalPhone,
        country: customerCountry || 'Costa Rica / Internacional'
      },
      ...(wantsInvoice && {
        electronicInvoice: {
          wantsInvoice,
          idType: invoiceIdType,
          idNumber: invoiceIdNumber,
          legalName: invoiceLegalName || finalName,
          email: invoiceEmail || finalEmail,
          phone: invoicePhone || finalPhone,
          provincia: invoiceProvincia,
          canton: invoiceCanton,
          distrito: invoiceDistrito,
          address: invoiceAddress
        }
      })
    };

    try {
      
      if (paymentMethod === 'credit_card') {
        const stripeRes = await fetch('/api/stripe/create-checkout-session', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             tourId: tour.id,
             tourName: tourTitle,
             totalUSD,
             customerEmail: finalEmail,
             date: selectedDate || tomorrowStr,
             passengers: (adults || 1) + (children || 0)
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

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload)
      });
      const data = await response.json();
      let finalBooking = bookingPayload;
      if (data.success && data.booking) {
        finalBooking = data.booking;
      } else {
        finalBooking = { 
          ...bookingPayload, 
          bookingId: `CR-PV-${Math.floor(100000 + Math.random() * 900000)}` 
        };
      }

      // Add to Firestore if user is authenticated
      import('../firebase').then(({ db, auth }) => {
        import('firebase/firestore').then(({ collection, addDoc, serverTimestamp }) => { addDoc(collection(db, 'bookings'), { ...finalBooking, userId: auth.currentUser ? auth.currentUser.uid : 'anonymous', createdAt: serverTimestamp() }).catch(console.error); });
      });

      if (handleConfirm) handleConfirm(finalBooking);
    } catch (err) {
      const fallbackBooking = { 
        ...bookingPayload, 
        bookingId: `CR-PV-${Math.floor(100000 + Math.random() * 900000)}` 
      };
      
      import('../firebase').then(({ db, auth }) => {
        import('firebase/firestore').then(({ collection, addDoc, serverTimestamp }) => { addDoc(collection(db, 'bookings'), { ...fallbackBooking, userId: auth.currentUser ? auth.currentUser.uid : 'anonymous', createdAt: serverTimestamp() }).catch(console.error); });
      });

      if (handleConfirm) handleConfirm(fallbackBooking);
    } finally {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {
        console.warn(e);
      }
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1A10]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#102A1C] text-stone-100 border border-[#2D663B]/40 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] modal-scrollable overflow-y-auto shadow-2xl relative">
        
        {/* Sticky Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 w-10 h-10 bg-[#0C1E14]/90 hover:bg-[#1E4D2B] text-stone-200 rounded-full flex items-center justify-center border border-[#2D663B]/60 transition-colors shadow-lg cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Header */}
        <div className="relative h-60 sm:h-72 w-full overflow-hidden">
          <LazyImage src={tour.image} alt={tourTitle} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#102A1C] via-[#102A1C]/60 to-transparent" />

          <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-8 sm:right-8 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#1E4D2B] text-[#F5EEDC] text-[10px] font-black uppercase px-3 py-1 rounded-full border border-[#3E6D4B] shadow-xs">
                📍 {tour.location?.placeName || tour.region}
              </span>
              {tour.region === 'sjo' && (
                <span className="bg-[#D97736] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-xs">
                  🚌 {language === 'es' ? 'Salida desde: San José' : 'Departs from: San Jose'}
                </span>
              )}
              <span className="bg-[#0C1E14]/85 text-[#F5EEDC] text-[10px] font-black uppercase px-3 py-1 rounded-full border border-[#2D663B]/60 flex items-center gap-1">
                <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
                {tour.rating} ({tour.reviewsCount} {language === 'es' ? 'reseñas' : 'reviews'})
              </span>
            </div>

            <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-white uppercase leading-tight drop-shadow-md">
              {tourTitle}
            </h2>
          </div>
        </div>

        {/* Content Body Grid */}
        <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Details & Inclusions */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Operator and Rate Guarantee Ribbon */}
            <div className="bg-gradient-to-r from-[#173D26] to-[#122F1E] p-4 rounded-2xl border border-[#2D663B] flex items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E4D2B] flex items-center justify-center border border-[#3E6D4B] shrink-0">
                  <ShieldCheck className="w-5 h-5 text-orange-300" />
                </div>
                <div>
                  <span className="font-black text-white uppercase text-[11px] block">
                    {language === 'es' ? 'Operación Receptiva Oficial' : 'Official Inbound Operations'}: <span className="text-orange-300">Costa Rica Tours (costaricatours.es)</span>
                  </span>
                  <span className="text-[10px] text-stone-300 block">
                    {language === 'es' 
                      ? 'Tarifa oficial verificada • Seguro de responsabilidad civil • Voucher con código QR' 
                      : 'Verified official rate • Full liability insurance • QR voucher'}
                  </span>
                </div>
              </div>
              <span className="hidden sm:inline-block bg-[#2D663B] text-[#F5EEDC] text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-[#488257] whitespace-nowrap">
                {language === 'es' ? 'Verificado' : 'Verified'}
              </span>
            </div>

            {/* Trust & Policy Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] font-semibold">
              <div className="flex items-center gap-2 bg-[#0C1E14]/70 p-3 rounded-xl border border-[#2D663B]/50 text-stone-200">
                <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
                <span>{language === 'es' ? 'Cancelación GRATIS hasta 48h antes' : 'FREE cancellation up to 48h prior'}</span>
              </div>
              <div className="flex items-center gap-2 bg-[#0C1E14]/70 p-3 rounded-xl border border-[#2D663B]/50 text-stone-200">
                <Users className="w-4 h-4 text-[#A8D5BA] shrink-0" />
                <span>{language === 'es' ? 'Guía local experto • Grupos reducidos' : 'Expert local guide • Small groups'}</span>
              </div>
            </div>

            {/* Rain & Weather Policy */}
            <div className="bg-[#0C1E14]/40 p-4 rounded-xl border border-[#2D663B]/40 text-[11px] text-stone-200 space-y-1">
              <span className="font-bold text-orange-300 uppercase block flex items-center gap-1.5">
                🌧️ {language === 'es' ? 'Política de Clima y Lluvia Tropical:' : 'Tropical Rain & Weather Policy:'}
              </span>
              <p className="text-stone-300 leading-relaxed">
                {language === 'es' 
                  ? 'Operamos en cualquier condición climática segura (ponchos y equipo incluidos). En caso de alerta climática extrema: reprogramación o reembolso 100% garantizado.'
                  : 'We operate rain or shine with full safety equipment. In case of extreme weather alerts: 100% refund or free rescheduling.'}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-orange-300 uppercase tracking-wider">
                {language === 'es' ? 'Resumen de la Experiencia' : 'Tour Experience'}
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                {tourDesc}
              </p>
            </div>

            {/* Highlights */}
            <div className="bg-[#0C1E14]/60 p-5 rounded-2xl border border-[#2D663B]/50 space-y-3">
              <h3 className="text-xs font-black text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>{language === 'es' ? 'Puntos Destacados' : 'Key Highlights'}</span>
              </h3>
              <ul className="space-y-2">
                {tourHighlights.map((hl, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-200">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>{hl}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Inclusions & Exclusions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#0C1E14]/60 p-4 rounded-xl border border-[#2D663B]/40 space-y-2">
                <span className="text-[11px] font-black text-[#A8D5BA] uppercase block">
                  ✅ {language === 'es' ? '¿Qué Incluye?' : 'What is Included?'}
                </span>
                <ul className="space-y-1.5 text-xs text-stone-300">
                  {tourInclusions.map((inc, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-teal-400">•</span>
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#0C1E14]/60 p-4 rounded-xl border border-[#2D663B]/40 space-y-2">
                <span className="text-[11px] font-black text-rose-300 uppercase block">
                  ❌ {language === 'es' ? 'No Incluye' : 'Exclusions'}
                </span>
                <ul className="space-y-1.5 text-xs text-stone-400">
                  {tourExclusions.map((exc, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-400">•</span>
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Medical Restrictions */}
            {tour.medicalRestrictions && (
              <div className="bg-red-950/40 p-4 rounded-xl border border-red-500/30 space-y-2 text-xs">
                <span className="font-black text-red-300 uppercase block flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  {language === 'es' ? 'Restricciones y Recomendaciones Físicas' : 'Physical & Health Restrictions'}
                </span>
                <ul className="space-y-1 text-red-200/90">
                  {tour.medicalRestrictions[language]?.map((rest, i) => (
                    <li key={i}>• {rest}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* What to bring */}
            <div className="bg-[#0C1E14]/60 p-4 rounded-xl border border-[#2D663B]/40 space-y-2 text-xs">
              <span className="font-black text-orange-300 uppercase block">
                🎒 {language === 'es' ? '¿Qué debes llevar?' : 'What to Bring'}
              </span>
              <p className="text-stone-300 leading-relaxed">
                {tourWhatToBring.join(' • ')}
              </p>
              <div className="mt-2 pt-2 border-t border-[#2D663B]/40 text-[10px] text-stone-400">
                🌿 {language === 'es' ? 'Por favor utilizar protector solar y repelente biodegradable amigable con la fauna.' : 'Please use biodegradable reef & wildlife-safe sunscreen and repellent.'}
              </div>
            </div>

          </div>

          {/* Right Column: Complete 3-Step Booking & Payment Engine */}
          <div className="lg:col-span-5">
            <div className="bg-[#FAF8F5] text-stone-900 p-5 sm:p-6 rounded-[2rem] border-2 border-[#2D663B] space-y-5 shadow-2xl sticky top-6">
              
              {/* Draft Restored Banner */}
              {restoredDraftNotice && (
                <div className="bg-[#EBF5EE] border border-[#2D663B]/40 text-[#1E4D2B] p-3 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                    <div>
                      <p className="font-black text-[11px] leading-tight">
                        {language === 'es' ? '¡Borrador de reserva recuperado!' : 'Saved booking draft restored!'}
                      </p>
                      <p className="text-[10px] text-stone-600">
                        {language === 'es' ? 'Tus datos anteriores se cargaron automáticamente.' : 'Your previous inputs were loaded automatically.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="text-[10px] text-red-700 hover:text-red-900 font-black flex items-center gap-1 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                    title={language === 'es' ? 'Descartar borrador y limpiar campos' : 'Discard draft and clear inputs'}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{language === 'es' ? 'Limpiar' : 'Clear'}</span>
                  </button>
                </div>
              )}

              {/* Offline Warning Banner */}
              {!isOnline && (
                <div className="bg-amber-50 border border-orange-300 text-amber-900 p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2 shadow-xs">
                  <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {language === 'es' 
                      ? 'Sin conexión a internet. Tu borrador se sigue guardando localmente en tu navegador.' 
                      : 'No internet connection. Your draft is still automatically saved on your browser.'}
                  </span>
                </div>
              )}

              {/* Header Price & Step Tracker */}
              <div className="border-b border-stone-200 pb-4">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1E4D2B] bg-[#E4ECE6] px-2.5 py-0.5 rounded-full border border-[#BCD4C2]">
                    {language === 'es' ? 'Reserva Receptiva Segura' : 'Secure Booking'}
                  </span>
                  <div className="flex items-center gap-2">
                    {lastSavedTime && (
                      <span className="text-[9px] text-stone-800 font-bold flex items-center gap-1 bg-stone-100/80 px-2 py-0.5 rounded-md border border-teal-300">
                        <Save className="w-2.5 h-2.5 text-teal-600" />
                        <span>{language === 'es' ? `Guardado (${lastSavedTime})` : `Autosaved (${lastSavedTime})`}</span>
                      </span>
                    )}
                    <span className="text-[10px] font-black uppercase text-stone-500">
                      {language === 'es' ? `Paso ${currentStep} de 3` : `Step ${currentStep} of 3`}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between">
                  <h3 className="text-2xl sm:text-3xl font-black text-[#1E4D2B] tracking-tight">
                    {formatPrice(totalUSD)}
                  </h3>
                  <span className="text-xs text-stone-500 font-semibold">
                    {currency === 'USD' ? `(₡${totalCRC.toLocaleString()} CRC)` : `($${totalUSD} USD)`}
                  </span>
                </div>

                {isGroupDiscount && (
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-black text-[#1E4D2B] bg-[#E8F0EA] px-2 py-0.5 rounded-md border border-[#BCD4C2]">
                    <span>🎁 10% {language === 'es' ? 'Descuento de Grupo (5+ personas)' : 'Group Discount (5+ pax)'}</span>
                  </div>
                )}
                
                <div className="text-[10px] text-stone-500 flex items-center justify-between mt-1">
                  <span>{language === 'es' ? 'Tarifa final (13% IVA incluido)' : 'Final price (13% VAT included)'}</span>
                  <span className="text-teal-700 font-bold">✓ {language === 'es' ? 'Sin cargos ocultos' : 'No hidden fees'}</span>
                </div>

                {/* Visual Step Progress Bar */}
                <div className="grid grid-cols-3 gap-1.5 mt-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className={`h-1.5 rounded-full transition-all ${
                      currentStep >= 1 ? 'bg-[#1E4D2B]' : 'bg-stone-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => validateStep1() && setCurrentStep(2)}
                    className={`h-1.5 rounded-full transition-all ${
                      currentStep >= 2 ? 'bg-[#1E4D2B]' : 'bg-stone-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => validateStep1() && validateStep2() && setCurrentStep(3)}
                    className={`h-1.5 rounded-full transition-all ${
                      currentStep === 3 ? 'bg-[#1E4D2B]' : 'bg-stone-200'
                    }`}
                  />
                </div>
              </div>

              {/* STEP 1: Date, Time, Passengers & Hotel */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {/* Date selection with Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-stone-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#1E4D2B]" />
                        <span>{language === 'es' ? 'Fecha de Viaje:' : 'Travel Date:'}</span>
                      </span>
                      <span className="text-[9px] text-[#1E4D2B] font-bold">
                        {language === 'es' ? 'Cupos 2026 Disponibles' : '2026 Slots Available'}
                      </span>
                    </label>

                    <input
                      type="date"
                      min={tomorrowStr}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-[#FAF8F5] text-stone-900 font-bold text-xs px-3 py-2.5 rounded-xl border-2 border-stone-300 focus:outline-none focus:border-[#1E4D2B] focus:ring-2 focus:ring-[#1E4D2B]/20 shadow-2xs"
                      required
                    />

                    {/* Quick presets */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedDate(tomorrowStr)}
                        className={`text-[9px] font-black py-1 px-1 rounded-lg transition-all border ${
                          selectedDate === tomorrowStr
                            ? 'bg-[#1E4D2B] text-[#F5EEDC] border-[#14391F]'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {language === 'es' ? 'Mañana' : 'Tomorrow'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDate(in3DaysStr)}
                        className={`text-[9px] font-black py-1 px-1 rounded-lg transition-all border ${
                          selectedDate === in3DaysStr
                            ? 'bg-[#1E4D2B] text-[#F5EEDC] border-[#14391F]'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        +3 {language === 'es' ? 'Días' : 'Days'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDate(in7DaysStr)}
                        className={`text-[9px] font-black py-1 px-1 rounded-lg transition-all border ${
                          selectedDate === in7DaysStr
                            ? 'bg-[#1E4D2B] text-[#F5EEDC] border-[#14391F]'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        +1 {language === 'es' ? 'Semana' : 'Week'}
                      </button>
                    </div>
                  </div>

                  {/* Horario */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-stone-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#1E4D2B]" />
                      <span>{language === 'es' ? 'Horario de Salida:' : 'Departure Time:'}</span>
                    </label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full bg-[#FAF8F5] text-stone-900 font-bold text-xs px-3 py-2.5 rounded-xl border-2 border-stone-300 focus:outline-none focus:border-[#1E4D2B]"
                    >
                      {tour.departureTimes.map((tm, idx) => (
                        <option key={idx} value={tm}>{tm} (Hora Local Costa Rica / UTC-6)</option>
                      ))}
                    </select>
                  </div>

                  {/* Passengers Counter */}
                  <div className="grid grid-cols-2 gap-3 bg-[#F3EFEA] p-3 rounded-2xl border border-stone-300">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase text-stone-700">
                          {language === 'es' ? 'Adultos:' : 'Adults:'}
                        </span>
                        <span className="text-[10px] font-bold text-stone-500">${tour.priceUSD}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAdults(Math.max(1, adults - 1))}
                          className="w-8 h-8 rounded-lg bg-white border border-stone-300 text-stone-800 font-black text-sm flex items-center justify-center hover:bg-stone-100 active:scale-95"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-black text-sm text-stone-900">{adults}</span>
                        <button
                          type="button"
                          onClick={() => setAdults(Math.min(20, adults + 1))}
                          className="w-8 h-8 rounded-lg bg-white border border-stone-300 text-stone-800 font-black text-sm flex items-center justify-center hover:bg-stone-100 active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase text-stone-700">
                          {language === 'es' ? 'Niños (-50%):' : 'Kids (-50%):'}
                        </span>
                        <span className="text-[10px] font-bold text-[#1E4D2B]">${childPriceUSD}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setChildren(Math.max(0, children - 1))}
                          className="w-8 h-8 rounded-lg bg-white border border-stone-300 text-stone-800 font-black text-sm flex items-center justify-center hover:bg-stone-100 active:scale-95"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-black text-sm text-stone-900">{children}</span>
                        <button
                          type="button"
                          onClick={() => setChildren(Math.min(10, children + 1))}
                          className="w-8 h-8 rounded-lg bg-white border border-stone-300 text-stone-800 font-black text-sm flex items-center justify-center hover:bg-stone-100 active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pickup Hotel */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-stone-700 flex items-center gap-1">
                      <Hotel className="w-3.5 h-3.5 text-[#1E4D2B]" />
                      <span>{language === 'es' ? 'Punto de Recogida / Hotel:' : 'Hotel Pickup Location:'}</span>
                    </label>
                    <select
                      value={pickupHotel}
                      onChange={(e) => setPickupHotel(e.target.value)}
                      className="w-full bg-[#FAF8F5] text-stone-900 font-bold text-xs px-3 py-2.5 rounded-xl border-2 border-stone-300 focus:outline-none focus:border-[#1E4D2B]"
                    >
                      {tour.pickupHotels.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                      <option value="Otro Hotel / Airbnb / Coordinar por WhatsApp">
                        {language === 'es' ? 'Otro Hotel o Airbnb (Coordinar por WhatsApp)' : 'Other Hotel or Airbnb (Coordinate on WhatsApp)'}
                      </option>
                    </select>
                  </div>

                  {/* Button Next Step */}
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep1()) setCurrentStep(2);
                    }}
                    className="w-full bg-[#1E4D2B] hover:bg-[#14391F] text-[#FAF8F5] font-black text-xs uppercase py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{language === 'es' ? 'Continuar: Datos del Viajero' : 'Continue: Traveler Info'}</span>
                    <ChevronRight className="w-4 h-4 text-orange-300" />
                  </button>
                </div>
              )}

              {/* STEP 2: Traveler Contact Information */}
              {currentStep === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-[#1E4D2B]">
                      {language === 'es' ? 'Datos del Huésped / Titular' : 'Lead Traveler Details'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-[10px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-0.5"
                    >
                      <ChevronLeft className="w-3 h-3" /> {language === 'es' ? 'Atrás' : 'Back'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-stone-600 block mb-0.5">
                        {language === 'es' ? 'Nombre Completo *' : 'Full Name *'}
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Laura Méndez / John Smith"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-white text-stone-900 text-xs px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-stone-600 block mb-0.5">
                        {language === 'es' ? 'Correo Electrónico (para Voucher oficial) *' : 'Email Address (for official voucher) *'}
                      </label>
                      <input
                        type="email"
                        placeholder="viajero@ejemplo.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full bg-white text-stone-900 text-xs px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-stone-600 block mb-0.5">
                        {language === 'es' ? 'Teléfono / WhatsApp (con código de país) *' : 'Phone / WhatsApp (with country code) *'}
                      </label>
                      <input
                        type="tel"
                        placeholder="+506 8888-7777 / +1 415-555-2671"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-white text-stone-900 text-xs px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-stone-600 block mb-0.5">
                        {language === 'es' ? 'Requisitos Especiales / Dietas / Alergias (Opcional):' : 'Special Requests / Dietary Needs (Optional):'}
                      </label>
                      <input
                        type="text"
                        placeholder={language === 'es' ? 'Ej: Vegetariano, silla para bebé, etc.' : 'e.g. Vegetarian, baby booster seat'}
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        className="w-full bg-white text-stone-900 text-xs px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:border-[#1E4D2B]"
                      />
                    </div>
                  </div>

                  {/* Facturación Electrónica Checkbox */}
                  <div className="pt-2 border-t border-stone-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wantsInvoice}
                        onChange={(e) => setWantsInvoice(e.target.checked)}
                        className="w-4 h-4 rounded text-[#1E4D2B] border-stone-300 focus:ring-[#1E4D2B]"
                      />
                      <span className="text-[11px] font-bold text-stone-700">
                        {language === 'es' ? 'Requiero Factura Electrónica (Hacienda Costa Rica)' : 'Require Electronic Invoice (Costa Rica)'}
                      </span>
                    </label>

                    {wantsInvoice && (
                      <div className="space-y-2 mt-2 p-3 bg-stone-100 rounded-xl border border-stone-300 text-xs">
                        <select
                          value={invoiceIdType}
                          onChange={(e) => setInvoiceIdType(e.target.value)}
                          className="w-full bg-white text-stone-900 text-xs px-3 py-2 rounded-lg border border-stone-300"
                        >
                          <option value="cedula_fisica">Cédula Física (9 dígitos)</option>
                          <option value="cedula_juridica">Cédula Jurídica (10 dígitos)</option>
                          <option value="dimex">DIMEX (11 o 12 dígitos)</option>
                          <option value="nite">NITE (10 dígitos)</option>
                          <option value="pasaporte">Pasaporte extranjero</option>
                        </select>

                        <input
                          type="text"
                          placeholder={language === 'es' ? 'Número de Cédula/Identificación *' : 'ID Number *'}
                          value={invoiceIdNumber}
                          onChange={(e) => setInvoiceIdNumber(e.target.value)}
                          className="w-full bg-white text-stone-900 text-xs px-3 py-2 rounded-lg border border-stone-300"
                        />

                        <input
                          type="text"
                          placeholder={language === 'es' ? 'Razón Social o Nombre Legal *' : 'Legal Name *'}
                          value={invoiceLegalName}
                          onChange={(e) => setInvoiceLegalName(e.target.value)}
                          className="w-full bg-white text-stone-900 text-xs px-3 py-2 rounded-lg border border-stone-300"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="w-1/3 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs uppercase py-3 rounded-xl transition-all"
                    >
                      {language === 'es' ? 'Atrás' : 'Back'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep2()) setCurrentStep(3);
                      }}
                      className="w-2/3 bg-[#1E4D2B] hover:bg-[#14391F] text-[#FAF8F5] font-black text-xs uppercase py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <span>{language === 'es' ? 'Ir al Paso de Pago' : 'Go to Payment'}</span>
                      <ChevronRight className="w-4 h-4 text-orange-300" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Payment Method Selection & Instant Confirmation */}
              {currentStep === 3 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-[#1E4D2B]">
                      {language === 'es' ? 'Selecciona Método de Pago' : 'Select Payment Method'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-[10px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-0.5"
                    >
                      <ChevronLeft className="w-3 h-3" /> {language === 'es' ? 'Atrás' : 'Back'}
                    </button>
                  </div>

                  {/* Payment Method Selector Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Card */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('credit_card')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        paymentMethod === 'credit_card'
                          ? 'bg-[#EAE4DC] border-2 border-[#1E4D2B] shadow-xs'
                          : 'bg-white border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <CreditCard className="w-4 h-4 text-[#1E4D2B]" />
                        {paymentMethod === 'credit_card' && <Check className="w-3.5 h-3.5 text-[#1E4D2B]" />}
                      </div>
                      <span className="text-[11px] font-black text-stone-900 leading-tight">
                        {language === 'es' ? 'Tarjeta Crédito/Débito' : 'Credit/Debit Card'}
                      </span>
                      <span className="text-[8.5px] text-stone-500">Visa, MC, AMEX</span>
                    </button>

                    {/* SINPE Móvil */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('sinpe_movil')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        paymentMethod === 'sinpe_movil'
                          ? 'bg-[#EAE4DC] border-2 border-[#1E4D2B] shadow-xs'
                          : 'bg-white border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Smartphone className="w-4 h-4 text-[#1E4D2B]" />
                        {paymentMethod === 'sinpe_movil' && <Check className="w-3.5 h-3.5 text-[#1E4D2B]" />}
                      </div>
                      <span className="text-[11px] font-black text-stone-900 leading-tight">
                        SINPE Móvil (CR)
                      </span>
                      <span className="text-[8.5px] text-stone-500">+506 8795-9148</span>
                    </button>

                    {/* Pay at Pickup */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pay_at_pickup')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        paymentMethod === 'pay_at_pickup'
                          ? 'bg-[#EAE4DC] border-2 border-[#1E4D2B] shadow-xs'
                          : 'bg-white border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Banknote className="w-4 h-4 text-[#1E4D2B]" />
                        {paymentMethod === 'pay_at_pickup' && <Check className="w-3.5 h-3.5 text-[#1E4D2B]" />}
                      </div>
                      <span className="text-[11px] font-black text-stone-900 leading-tight">
                        {language === 'es' ? 'Pagar al Abordar' : 'Pay at Pickup'}
                      </span>
                      <span className="text-[8.5px] text-stone-500">{language === 'es' ? '$0 cobro ahora' : '$0 charge now'}</span>
                    </button>

                    {/* PayPal */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paypal')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        paymentMethod === 'paypal'
                          ? 'bg-[#EAE4DC] border-2 border-[#1E4D2B] shadow-xs'
                          : 'bg-white border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#003087] text-xs">PayPal</span>
                        {paymentMethod === 'paypal' && <Check className="w-3.5 h-3.5 text-[#1E4D2B]" />}
                      </div>
                      <span className="text-[11px] font-black text-stone-900 leading-tight">
                        PayPal Express
                      </span>
                      <span className="text-[8.5px] text-stone-500">{language === 'es' ? 'Checkout global' : 'Global checkout'}</span>
                    </button>
                  </div>

                  {/* Payment Details Container */}
                  {paymentMethod === 'credit_card' && (
                    <div className="bg-[#F3EFEA] p-3.5 rounded-2xl border border-stone-300 space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-stone-700 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-[#1E4D2B]" />
                          <span>{language === 'es' ? 'Pasarela Encriptada SSL 256-bit' : '256-bit SSL Encrypted'}</span>
                        </span>

                        <button
                          type="button"
                          onClick={handleApplyDemoCard}
                          className="text-[9px] font-bold text-[#1E4D2B] bg-white hover:bg-stone-100 border border-stone-300 px-2 py-0.5 rounded-md shadow-2xs cursor-pointer"
                        >
                          🧪 {language === 'es' ? 'Tarjeta Demo' : 'Demo Card'}
                        </button>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Número de Tarjeta (16 dígitos)"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          className="w-full bg-white text-stone-900 font-mono text-xs px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:border-[#1E4D2B]"
                          maxLength={19}
                          required={paymentMethod === 'credit_card'}
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="MM / AA"
                            value={cardExpiry}
                            onChange={handleCardExpiryChange}
                            className="w-full bg-white text-stone-900 font-mono text-xs px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:border-[#1E4D2B]"
                            maxLength={5}
                            required={paymentMethod === 'credit_card'}
                          />
                          <input
                            type="password"
                            placeholder="CVV (3 dígitos)"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.substring(0, 4))}
                            className="w-full bg-white text-stone-900 font-mono text-xs px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:border-[#1E4D2B]"
                            maxLength={4}
                            required={paymentMethod === 'credit_card'}
                          />
                        </div>

                        <input
                          type="text"
                          placeholder={language === 'es' ? 'Nombre en la Tarjeta' : 'Cardholder Name'}
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full bg-white text-stone-900 text-xs px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:border-[#1E4D2B]"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'sinpe_movil' && (
                    <div className="bg-[#EBF3ED] p-3.5 rounded-2xl border border-[#BCD4C2] space-y-2 text-xs animate-fade-in">
                      <div className="flex items-center gap-2 text-[#1E4D2B] font-black">
                        <Smartphone className="w-4 h-4" />
                        <span>SINPE Móvil Oficial Costa Rica</span>
                      </div>
                      <p className="text-[11px] text-stone-700 leading-snug">
                        Realiza la transferencia por <strong>₡{totalCRC.toLocaleString()} CRC</strong> al número:
                      </p>
                      <div className="bg-white p-2 rounded-xl border border-[#BCD4C2] flex items-center justify-between font-mono font-black text-sm text-[#1E4D2B]">
                        <span>📱 +506 8795-9148</span>
                        <span className="text-[10px] font-normal text-stone-500">Costa Rica Tours</span>
                      </div>
                      <input
                        type="text"
                        placeholder={language === 'es' ? 'Número de Comprobante / Teléfono que transfiere' : 'Confirmation # or Transfer Phone'}
                        value={sinpePhoneOrRef}
                        onChange={(e) => setSinpePhoneOrRef(e.target.value)}
                        className="w-full bg-white text-stone-900 text-xs px-3 py-2 rounded-xl border border-[#BCD4C2] focus:outline-none focus:border-[#1E4D2B]"
                      />
                    </div>
                  )}

                  {paymentMethod === 'pay_at_pickup' && (
                    <div className="bg-[#FAF4EB] p-3.5 rounded-2xl border border-[#E3CDAA] space-y-1.5 text-xs animate-fade-in">
                      <div className="flex items-center gap-1.5 text-[#8A5116] font-black">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{language === 'es' ? 'Reserva Garantizada sin Pago Inmediato' : 'Guaranteed Booking without Prepayment'}</span>
                      </div>
                      <p className="text-[11px] text-stone-700 leading-snug">
                        {language === 'es'
                          ? `Tu cupo queda 100% reservado. Cancelarás los $${totalUSD} USD (o ₡${totalCRC.toLocaleString()} CRC) en efectivo o tarjeta directamente al guía o chofer al momento del pickup.`
                          : `Your spot is 100% guaranteed. You will pay $${totalUSD} USD (or ₡${totalCRC.toLocaleString()} CRC) directly upon pickup in cash or card.`}
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'paypal' && (
                    <div className="bg-[#F0F5FA] p-3.5 rounded-2xl border border-[#BED4E8] space-y-1.5 text-xs animate-fade-in">
                      <div className="flex items-center gap-1.5 text-[#003087] font-black">
                        <Info className="w-4 h-4" />
                        <span>PayPal Express Internacional</span>
                      </div>
                      <p className="text-[11px] text-stone-700 leading-snug">
                        {language === 'es'
                          ? 'Se emitirá el voucher con código QR y enlace de liquidación protegido con la garantía del comprador PayPal.'
                          : 'Your booking voucher will be issued immediately with QR code and PayPal protection.'}
                      </p>
                    </div>
                  )}

                  {/* Summary Breakdown Box */}
                  <div className="bg-white p-3 rounded-xl border border-stone-200 text-xs space-y-1.5">
                    <div className="flex justify-between text-stone-600">
                      <span>{adults} {language === 'es' ? 'Adultos' : 'Adults'}:</span>
                      <span>${adultsSubtotalUSD} USD</span>
                    </div>
                    {children > 0 && (
                      <div className="flex justify-between text-stone-600">
                        <span>{children} {language === 'es' ? 'Niños (-50%)' : 'Kids (-50%)'}:</span>
                        <span>${childrenSubtotalUSD} USD</span>
                      </div>
                    )}
                    {isGroupDiscount && (
                      <div className="flex justify-between text-[#1E4D2B] font-bold">
                        <span>{language === 'es' ? 'Descuento Grupo (10%):' : 'Group Discount (10%):'}</span>
                        <span>-${discountUSD} USD</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-sm text-[#1E4D2B] border-t border-stone-200 pt-1.5 mt-1">
                      <span>{language === 'es' ? 'Total a Confirmar:' : 'Total to Confirm:'}</span>
                      <span>${totalUSD} USD</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#1E4D2B] hover:bg-[#14391F] disabled:opacity-75 text-[#FAF8F5] font-black text-sm uppercase py-4 px-6 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer border border-[#2D663B]"
                  >
                    <span>
                      {isSubmitting
                        ? (language === 'es' ? 'Procesando Reserva...' : 'Processing Booking...')
                        : (language === 'es' ? 'Confirmar Reserva y Emitir Voucher' : 'Confirm Booking & Issue Voucher')}
                    </span>
                    <ChevronRight className="w-4 h-4 text-orange-300" />
                  </button>

                  <div className="text-[10px] text-center text-stone-500 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1E4D2B]" />
                    <span>
                      {language === 'es' ? 'Garantía Pura Vida: Cancelación sin costo hasta 24h antes' : 'Pura Vida Guarantee: Free cancellation up to 24h prior'}
                    </span>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

