import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { REGIONS } from './data/catalogMeta';
import { catalogSearchHref, readCatalogRouteFilters } from './utils/catalogRouteFilters';
import { useTours } from './contexts/ToursContext';
import { Tour, Language, Currency, TourCategory, TourRegion, BookingRequest } from './types';
import { getLangText, fetchExchangeRates } from './utils/i18n';
import { getInitialCurrency, getInitialLanguage, rememberCurrency, rememberLanguage } from './i18n';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { AmbientBackground } from './components/AmbientBackground';
import { CookiesBanner } from './components/CookiesBanner';
import { Home as HomePage } from './pages/Home';
import { BottomNav } from './components/BottomNav';
import { RouteMetadata } from './components/RouteMetadata';
import { OfflineBanner } from './components/OfflineBanner';
import { DigitalCounterWidget } from './components/DigitalCounterWidget';
import { Home, ChevronRight, Bot, MessageCircle, X, Loader2 } from 'lucide-react';
import { AdminRouteGuard } from './components/AdminRouteGuard';
import { directWhatsAppUrl } from './utils/directWhatsApp';
import { useSupportPanel } from './hooks/useSupportPanel';
import { TravelerCommandBar } from './components/TravelerCommandBar';

// Code-splitting via React.lazy to reduce initial JS bundle size
// Route-level sections (map, transport, culture, admin, provider portal) are
// loaded on demand so the index chunk stays under the 900 kB budget.
const InteractiveMap = lazy(() => import('./components/InteractiveMap').then(m => ({ default: m.InteractiveMap })));
const NationalTransportSection = lazy(() => import('./components/NationalTransportSection').then(m => ({ default: m.NationalTransportSection })));
const TicoCultureSection = lazy(() => import('./components/TicoCultureSection').then(m => ({ default: m.TicoCultureSection })));
const AdminControlCenterPage = lazy(() => import('./pages/AdminControlCenterPage').then(m => ({ default: m.AdminControlCenterPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const ProviderPortalPage = lazy(() => import('./pages/ProviderPortalPage').then(m => ({ default: m.ProviderPortalPage })));
const RouteFallback = () => <div className="py-24 text-center text-emerald-300">Cargando…</div>;
const ItineraryPlanner = lazy(() => import('./components/ItineraryPlanner').then(m => ({ default: m.ItineraryPlanner })));
const CustomFunnelModal = lazy(() => import('./components/CustomFunnelModal').then(m => ({ default: m.CustomFunnelModal })));
const TravelerToolkit = lazy(() => import('./components/TravelerToolkit').then(m => ({ default: m.TravelerToolkit })));
const LocalBusesModal = lazy(() => import('./components/LocalBusesModal').then(m => ({ default: m.LocalBusesModal })));
const FormsManagerModal = lazy(() => import('./components/FormsManagerModal').then(m => ({ default: m.FormsManagerModal })));
const TravelerOSPage = lazy(() => import('./pages/TravelerOSPage').then(m => ({ default: m.TravelerOSPage })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AIAssistant = lazy(() => import('./components/AIAssistant').then(m => ({ default: m.AIAssistant })));
const FlightTrackerGadget = lazy(() => import('./components/FlightTrackerGadget').then(m => ({ default: m.FlightTrackerGadget })));
const GoogleWorkspaceHub = lazy(() => import('./components/GoogleWorkspaceHub').then(m => ({ default: m.GoogleWorkspaceHub })));
const CounterDeskPage = lazy(() => import('./pages/CounterDeskPage').then(m => ({ default: m.CounterDeskPage })));
const AutonomousOperationsPage = lazy(() => import('./pages/AutonomousOperationsPage').then(m => ({ default: m.default })));
const EmailOperationsPage = lazy(() => import('./pages/EmailOperationsPage').then(m => ({ default: m.default })));
const LeadsPipelinePage = lazy(() => import('./pages/LeadsPipelinePage').then(m => ({ default: m.LeadsPipelinePage })));
const DigitalCityJoinPage = lazy(() => import('./pages/DigitalCityJoinPage').then(m => ({ default: m.DigitalCityJoinPage })));
const DigitalCityArchitecturePage = lazy(() => import('./pages/DigitalCityArchitecturePage').then(m => ({ default: m.DigitalCityArchitecturePage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then(m => ({ default: m.LegalPage })));
const TourDetailModal = lazy(() => import('./components/TourDetailModal').then(m => ({ default: m.TourDetailModal })));
const BookingConfirmationModal = lazy(() => import('./components/BookingConfirmationModal').then(m => ({ default: m.BookingConfirmationModal })));
const MyBookingsModal = lazy(() => import('./components/MyBookingsModal').then(m => ({ default: m.MyBookingsModal })));
const ToursPage = lazy(() => import('./pages/ToursPage').then(m => ({ default: m.ToursPage })));
const TourDetailPage = lazy(() => import('./pages/TourDetailPage').then(m => ({ default: m.TourDetailPage })));
const DestinationsSection = lazy(() => import('./components/DestinationsSection').then(m => ({ default: m.DestinationsSection })));
const CategoriesSection = lazy(() => import('./components/CategoriesSection').then(m => ({ default: m.CategoriesSection })));
const BlogSection = lazy(() => import('./components/BlogSection').then(m => ({ default: m.BlogSection })));
const AboutSection = lazy(() => import('./components/AboutSection').then(m => ({ default: m.AboutSection })));
// Customer-intake markdown renderer (react-markdown + micromark ≈ 100 kB) loads on first reply.
const IntakeReplyMarkdown = lazy(() => import('./components/IntakeReplyMarkdown'));
const BlogArticlePage = lazy(() => import('./pages/BlogArticlePage').then(m => ({ default: m.BlogArticlePage })));


import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tours: TOURS, loading: toursLoading } = useTours();
  // First visit: language from navigator.languages (ES/EN) and currency from the
  // browser region (CR→CRC, euro area→EUR, rest→USD). A choice made in the
  // selectors is saved and wins on later visits.
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const [currency, setCurrencyState] = useState<Currency>(getInitialCurrency);
  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    rememberLanguage(next);
  }, []);
  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);
    rememberCurrency(next);
  }, []);

  // Active path for UI state
  const activeTab = location.pathname.split('/')[1] || 'home';

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TourCategory | 'all'>('all');
  const [selectedRegion, setSelectedRegion] = useState<TourRegion | 'all'>('all');

  // One-way hydration from the URL avoids stale local filter state clobbering
  // /tours?category=... deep links before React finishes rendering.
  // The ToursPage writes filter changes directly to the URL.
  useEffect(() => {
    if (location.pathname !== '/tours') return;
    const filters = readCatalogRouteFilters(new URLSearchParams(location.search));
    setSearchQuery(filters.q);
    setSelectedCategory(filters.category);
    setSelectedRegion(filters.region);
  }, [location.pathname, location.search]);

  // Keep SPA navigation feeling native: every route starts at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  // Modals state
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [recentBooking, setRecentBooking] = useState<BookingRequest | null>(null);
  const [myBookings, setMyBookings] = useState<BookingRequest[]>([]);
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [isCustomFunnelOpen, setIsCustomFunnelOpen] = useState(false);
  const [isLocalBusesOpen, setIsLocalBusesOpen] = useState(false);
  const [isFormsManagerModalOpen, setIsFormsManagerModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeReply, setIntakeReply] = useState('');
  const [intakeHandoffUrl, setIntakeHandoffUrl] = useState<string | undefined>();
  const [intakeEscalated, setIntakeEscalated] = useState(false);
  const [intakeId, setIntakeId] = useState('');
  const [intakeMessage, setIntakeMessage] = useState('');
  useSupportPanel('intake', intakeOpen, setIntakeOpen);
  const [paymentReturnError, setPaymentReturnError] = useState('');

  // A payment return is only a prompt to ask the server to verify the provider.
  // It never creates a provisional "paid" booking from URL parameters.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('booking') === 'success') {
      const sessionId = params.get('session_id');
      const paypalOrderId = params.get('token');
      const endpoint = sessionId ? '/api/payments/stripe/return' : paypalOrderId ? '/api/payments/paypal/return' : '';
      if (!endpoint) {
        setPaymentReturnError(language === 'es' ? 'No recibimos una referencia de pago verificable.' : 'No verifiable payment reference was received.');
      } else {
        void fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionId ? { sessionId } : { orderId: paypalOrderId })
        }).then(async response => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.booking?.bookingId) throw new Error(data.error || 'Payment verification failed');
          setRecentBooking(data.booking);
          setMyBookings(previous => [data.booking, ...previous.filter(item => item.bookingId !== data.booking.bookingId)]);
        }).catch(error => {
          setPaymentReturnError(error.message || (language === 'es' ? 'El pago no pudo verificarse aún.' : 'The payment could not be verified yet.'));
        });
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('booking') === 'canceled') {
      alert(language === 'es' ? 'El pago fue cancelado. Puedes volver a intentarlo cuando gustes.' : 'Payment was canceled. You can try again whenever you are ready.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [language]);

  useEffect(() => {
    const handleCustomerIntake = async (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const message = String(detail.message || '').trim();
      if (!message) return;
      setIntakeOpen(true);
      setIntakeMessage(message);
      setIntakeLoading(true);
      setIntakeReply('');
      setIntakeHandoffUrl(undefined);
      setIntakeEscalated(false);
      setIntakeId('');
      try {
        const sessionId = detail.sessionId || localStorage.getItem('crt_customer_session') || `web_${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`;
        localStorage.setItem('crt_customer_session', sessionId);
        const response = await fetch('/api/customer-intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...detail,
            message,
            language,
            sessionId,
            source: detail.source || `web:${location.pathname}`
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'No se pudo procesar la solicitud.');
        setIntakeReply(data.customer?.reply || 'La IA recibió tu solicitud y está procesando la información.');
        setIntakeEscalated(Boolean(data.decision?.escalated));
        setIntakeHandoffUrl(data.customer?.handoffUrl);
        setIntakeId(data.intakeId || '');
        if (data.journey?.journeyId) {
          localStorage.setItem('crt_active_journey', String(data.journey.journeyId));
        }
        detail.onResult?.({
          ok: true,
          reply: data.customer?.reply,
          intakeId: data.intakeId || '',
          journeyId: data.journey?.journeyId,
          workflow: data.journey?.workflow
        });
      } catch (error: any) {
        const failureReply = language === 'es' ? 'No pudimos completar la consulta. No se ha confirmado ninguna reserva ni notificación al equipo. Puedes consultar directamente por WhatsApp.' : 'We could not complete the inquiry. No booking or team notification has been confirmed. You can contact us directly on WhatsApp.';
        setIntakeReply(failureReply);
        setIntakeEscalated(false);
        const handoffUrl = directWhatsAppUrl(message);
        setIntakeHandoffUrl(handoffUrl);
        detail.onResult?.({ ok: false, reply: failureReply, handoffUrl });
      } finally {
        setIntakeLoading(false);
      }
    };
    window.addEventListener('customer-intake-request', handleCustomerIntake as EventListener);
    return () => {
      window.removeEventListener('customer-intake-request', handleCustomerIntake as EventListener);
    };
  }, [language, location.pathname]);

  useEffect(() => {
    const handleOpenAdmin = () => setIsAdminDashboardOpen(true);
    document.addEventListener('open-admin-dashboard', handleOpenAdmin);
    return () => document.removeEventListener('open-admin-dashboard', handleOpenAdmin);
  }, []);

  useEffect(() => {
    fetchExchangeRates();
  }, []);

  // Ensure modal state does not conflict with direct /tour/:id SPA routing
  useEffect(() => {
    if (location.pathname.startsWith('/tour/')) {
      setSelectedTour(null);
    }
  }, [location.pathname]);

  // Load bookings from Firestore on mount
  useEffect(() => {
    let unsubscribeBookings: (() => void) | undefined;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
        unsubscribeBookings = onSnapshot(q, (snapshot) => {
          const bookingsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any;
          setMyBookings(bookingsData);
        }, (error) => {
          console.error("Bookings snapshot error:", error);
        });
      } else {
        if (unsubscribeBookings) {
          unsubscribeBookings();
          unsubscribeBookings = undefined;
        }
        setMyBookings([]);
      }
    });
    
    return () => {
      if (unsubscribeBookings) {
        unsubscribeBookings();
      }
      unsubscribeAuth();
    };
  }, []);

  const handleBookingSuccess = (booking: BookingRequest) => {
    setSelectedTour(null);
    setRecentBooking(booking);
    setMyBookings(prev => [booking, ...prev.filter(item => item.bookingId !== booking.bookingId)]);
  };

  // Dynamic WhatsApp Message context
  let whatsappMessage = undefined;
  if (selectedTour) {
    whatsappMessage = language === 'es' 
      ? `Hola Costa Rica Tours (costaricatours.es), quisiera más información sobre el tour: ${getLangText(selectedTour.title, 'es')}`
      : `Hello Costa Rica Tours (costaricatours.es), I would like more information about the tour: ${getLangText(selectedTour.title, 'en')}`;
  } else if (activeTab === 'flights') {
    whatsappMessage = language === 'es'
      ? 'Hola Costa Rica Tours (costaricatours.es), quisiera consultar sobre vuelos internacionales y traslados desde el aeropuerto hacia mi hotel/tour.'
      : 'Hello Costa Rica Tours (costaricatours.es), I would like to inquire about international flights and airport transfers to my hotel/tour.';
  } else if (activeTab === 'itinerary') {
    whatsappMessage = language === 'es'
      ? 'Hola Costa Rica Tours (costaricatours.es), necesito ayuda para planear mi itinerario en Costa Rica.'
      : 'Hello Costa Rica Tours (costaricatours.es), I need help planning my itinerary in Costa Rica.';
  } else if (activeTab === 'culture') {
    whatsappMessage = language === 'es'
      ? 'Hola Costa Rica Tours (costaricatours.es), tengo una pregunta sobre tradiciones y recomendaciones locales en Costa Rica.'
      : 'Hello Costa Rica Tours (costaricatours.es), I have a question about local traditions and tips in Costa Rica.';
  }

  // Filter labels for breadcrumbs
  const getActiveTabLabel = () => {
    switch(activeTab) {
      case 'tours': return `🧭 ${language === 'es' ? 'Catálogo de Tours y Aventuras' : 'Tours & Adventures Catalog'}`;
      case 'destinations': return `📍 ${language === 'es' ? 'Destinos de Costa Rica' : 'Costa Rica Destinations'}`;
      case 'activities': return `🧗 ${language === 'es' ? 'Actividades & Experiencias' : 'Activities & Experiences'}`;
      case 'blog': return `📝 ${language === 'es' ? 'Blog de Viajes' : 'Travel Blog'}`;
      case 'about': return `🌿 ${language === 'es' ? 'Sobre Nosotros' : 'About Us'}`;
      case 'flights': return `✈️ ${language === 'es' ? 'Rastreador en Vivo de Vuelos' : 'Live Flight Radar'}`;
      case 'ai': return `🤖 ${language === 'es' ? 'Asistente Turístico IA' : 'AI Concierge'}`;
      case 'itinerary': return `✨ ${language === 'es' ? 'Planificador Inteligente' : 'AI Trip Planner'}`;
      case 'culture': return `🇨🇷 ${language === 'es' ? 'Rincón Tico: Cultura' : 'Tico Culture'}`;
      case 'tools': return `🚐 ${language === 'es' ? 'Transporte & Guía' : 'Transport & Guide'}`;
      case 'workspace': return `✉️ 📅 Google Workspace`;
      case 'counter': return `🛎️ ${language === 'es' ? 'Mostrador Digital Full Stack' : 'Full-Stack Digital Counter'}`;
      case 'admin': return `🛡️ ${language === 'es' ? 'Centro de Control Administrativo' : 'Executive Control Center'}`;
      default: return '';
    }
  };

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-[#041711] text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950 relative pb-16 lg:pb-0">
      {intakeOpen && (
        <div className="fixed inset-0 z-[10050] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true" aria-label={language === 'es' ? 'Atención inteligente' : 'AI customer care'}>
          <div className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-emerald-400/25 bg-[#041711] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-500/15">
              <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-2xl bg-emerald-400/15 flex items-center justify-center"><Bot className="text-emerald-300" size={21}/></span><div><div className="text-[10px] uppercase tracking-widest font-black text-emerald-300">Costa Rica Tours AI</div><div className="font-black text-white">{language === 'es' ? 'Tu solicitud está siendo atendida' : 'Your request is being handled'}</div></div></div>
              <button type="button" aria-label={language === 'es' ? 'Cerrar consulta' : 'Close inquiry'} onClick={() => setIntakeOpen(false)} className="w-9 h-9 shrink-0 rounded-full bg-white/5 text-stone-300 hover:bg-white/10 flex items-center justify-center"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-2xl bg-black/20 border border-white/5 p-4 text-xs text-stone-400"><span className="font-bold text-stone-200">{language === 'es' ? 'Solicitud:' : 'Request:'}</span> {intakeMessage || (language === 'es' ? 'Solicitud recibida' : 'Request received')}</div>
              <div className="rounded-2xl bg-emerald-400/5 border border-emerald-400/15 p-5 min-h-[100px]">
                {intakeLoading ? <div className="flex items-center gap-3 text-emerald-200 text-sm"><Loader2 className="animate-spin" size={18}/>{language === 'es' ? 'Los agentes están analizando tu solicitud, disponibilidad y contexto...' : 'Our agents are analyzing your request, availability and context...'}</div> : (
                  <Suspense fallback={<p className="text-sm leading-relaxed text-stone-100 whitespace-pre-line">{intakeReply}</p>}>
                    <IntakeReplyMarkdown>{intakeReply}</IntakeReplyMarkdown>
                  </Suspense>
                )}
              </div>
              {!intakeLoading && intakeEscalated && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-100">{language === 'es' ? 'Esta solicitud necesita revisión humana; todavía no es una reserva confirmada.' : 'This inquiry needs human review; it is not a confirmed booking yet.'}</div>
              )}
              {!intakeLoading && intakeHandoffUrl && (
                <a data-human-handoff="true" href={intakeHandoffUrl} target="_blank" rel="noreferrer" className="w-full rounded-2xl bg-emerald-400 text-stone-950 font-black py-3 flex items-center justify-center gap-2"><MessageCircle size={17}/>{language === 'es' ? 'Continuar con un asesor por WhatsApp' : 'Continue with a human advisor on WhatsApp'}</a>
              )}
              {!intakeLoading && intakeId && <div className="text-[10px] text-stone-500 text-center">ID {intakeId}</div>}
            </div>
          </div>
        </div>
      )}

      <RouteMetadata language={language} />
      <OfflineBanner language={language} />
      <AmbientBackground />
      
      <Header
        language={language}
        setLanguage={setLanguage}
        currency={currency}
        setCurrency={setCurrency}
        activeTab={activeTab as any}
        bookingsCount={myBookings.length}
        onOpenBookingList={() => setIsBookingsModalOpen(true)}
        onOpenCustomFunnel={() => setIsCustomFunnelOpen(true)}
        onOpenLocalBuses={() => setIsLocalBusesOpen(true)}
        onOpenFormsManager={() => setIsFormsManagerModalOpen(true)}
      />

      <main className="flex-1 relative z-10 isolate flex flex-col">
        {/* Breadcrumbs for sub-pages */}
        {activeTab !== 'home' && activeTab !== 'map' && !location.pathname.startsWith('/tour/') && (
          <div className="bg-[#02130c]/90 backdrop-blur-md border-b border-emerald-500/20 py-2 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-stone-300 min-w-0">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-1 text-emerald-200/80 hover:text-amber-400 font-bold transition-colors cursor-pointer shrink-0"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Inicio' : 'Home'}</span>
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-500/40 shrink-0" />
                <span className="font-bold text-amber-400 truncate flex items-center gap-1.5">
                  {getActiveTabLabel()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* The "Smart travel hub" strip lives only on the home page. */}
        {activeTab === 'home' && (
          <div className="pt-4 sm:pt-5">
            <TravelerCommandBar
              language={language}
              activeTab={activeTab}
              onNavigate={(path) => navigate(path)}
              onOpenTripBuilder={() => setIsCustomFunnelOpen(true)}
            />
          </div>
        )}

        {paymentReturnError && (
          <div role="alert" className="mx-auto mt-4 max-w-5xl rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
            {paymentReturnError}
          </div>
        )}

        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/provider/portal" element={<Suspense fallback={<RouteFallback />}><ProviderPortalPage /></Suspense>} />
            <Route path="/ciudad" element={<Suspense fallback={<div className="py-12 text-center text-amber-200">Cargando ciudad digital…</div>}><DigitalCityArchitecturePage language={language} /></Suspense>} />
            <Route path="/participar" element={<Suspense fallback={<div className="py-12 text-center text-amber-200">Cargando…</div>}><DigitalCityJoinPage language={language} onOpenPrivacy={() => navigate('/privacy')} /></Suspense>} />

            <Route path="/" element={
              <HomePage
                language={language}
                currency={currency}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedRegion={selectedRegion}
                setSelectedRegion={setSelectedRegion}
                setIsCustomFunnelOpen={setIsCustomFunnelOpen}
                setSelectedTour={setSelectedTour}
              />
            } />

            <Route path="/tours" element={
              <Suspense fallback={<RouteFallback />}><ToursPage
                language={language}
                currency={currency}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedRegion={selectedRegion}
                setSelectedRegion={setSelectedRegion}
                onSelectTour={setSelectedTour}
              /></Suspense>
            } />

            <Route path="/tour/:id" element={
              <Suspense fallback={<RouteFallback />}><TourDetailPage language={language} currency={currency} onBookingSuccess={handleBookingSuccess} /></Suspense>
            } />

            <Route path="/destinations" element={
              <div className="max-w-7xl mx-auto px-4 py-16 space-y-12">
                <div className="text-center">
                  <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
                    {language === 'es' ? 'Destinos de Costa Rica' : 'Costa Rica Destinations'}
                  </h2>
                </div>
                <Suspense fallback={<RouteFallback />}>
                <DestinationsSection 
                  language={language}
                  onSelectRegion={(regionId) => {
                    setSelectedRegion(regionId as TourRegion);
                    navigate(catalogSearchHref({ region: regionId as TourRegion }));
                  }}
                />
                </Suspense>
              </div>
            } />

            <Route path="/activities" element={
              <div className="max-w-7xl mx-auto px-4 py-16 space-y-12">
                <div className="text-center">
                  <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
                    {language === 'es' ? 'Actividades & Aventuras' : 'Activities & Adventures'}
                  </h2>
                </div>
                <Suspense fallback={<RouteFallback />}>
                <CategoriesSection 
                  language={language} 
                  onSelectCategory={(catId) => {
                    setSelectedCategory(catId as TourCategory);
                    navigate(catalogSearchHref({ category: catId as TourCategory }));
                  }}
                />
                </Suspense>
              </div>
            } />

            <Route path="/map" element={
              <div className="w-full min-h-[calc(100vh-80px)]">
                <Suspense fallback={<RouteFallback />}>
                <InteractiveMap
                  language={language}
                  currency={currency}
                  tours={toursLoading ? [] : TOURS}
                  selectedRegion={selectedRegion}
                  onSelectRegion={setSelectedRegion}
                  onExploreRegionTours={(reg) => {
                    setSelectedRegion(reg);
                    navigate(catalogSearchHref({ region: reg }));
                  }}
                  onExitMap={() => navigate('/tours')}
                  onSelectTour={(t) => navigate(`/tour/${t.id}`)}
                  onOpenItineraryTab={() => setIsCustomFunnelOpen(true)}
                  onOpenLocalBusesModal={() => setIsLocalBusesOpen(true)}
                />
                </Suspense>
              </div>
            } />

            <Route path="/ai" element={
              <div className="w-full min-w-0 overflow-x-clip py-5 sm:py-8">
                <Suspense fallback={<div className="py-24 text-center text-emerald-400">Cargando...</div>}>
                  <AIAssistant
                    language={language}
                    onSelectTour={(t) => navigate(`/tour/${t.id}`)}
                    userBookings={myBookings}
                  />
                </Suspense>
              </div>
            } />

            <Route path="/trip" element={
              <Suspense fallback={<div className="py-24 text-center text-emerald-300">Cargando tu centro de viaje...</div>}>
                <TravelerOSPage
                  language={language}
                  onOpenTripBuilder={() => setIsCustomFunnelOpen(true)}
                  onOpenBookings={() => setIsBookingsModalOpen(true)}
                  bookings={myBookings}
                />
              </Suspense>
            } />

            <Route path="/itinerary" element={
              <Suspense fallback={<div className="py-24 text-center">Cargando...</div>}>
                <ItineraryPlanner
                  language={language}
                  onSelectTour={(t) => navigate(`/tour/${t.id}`)}
                />
              </Suspense>
            } />

            <Route path="/flights" element={
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <Suspense fallback={<div className="h-60 animate-pulse bg-emerald-950/20 rounded-2xl" />}>
                  <FlightTrackerGadget
                    language={language}
                    currency={currency}
                    onBookingSuccess={handleBookingSuccess}
                  />
                </Suspense>
              </div>
            } />

            <Route path="/blog" element={<div className="py-12"><Suspense fallback={<RouteFallback />}><BlogSection language={language} /></Suspense></div>} />
            <Route path="/blog/:slug" element={<Suspense fallback={<RouteFallback />}><BlogArticlePage language={language} /></Suspense>} />
            <Route path="/terms" element={<Suspense fallback={<RouteFallback />}><LegalPage pageId="terms" language={language} /></Suspense>} />
            <Route path="/cancellation" element={<Suspense fallback={<RouteFallback />}><LegalPage pageId="cancellation" language={language} /></Suspense>} />
            <Route path="/privacy" element={<Suspense fallback={<RouteFallback />}><LegalPage pageId="privacy" language={language} /></Suspense>} />
            <Route path="/sinac-escnna" element={<Suspense fallback={<RouteFallback />}><LegalPage pageId="sinac-escnna" language={language} /></Suspense>} />
            <Route path="/about" element={<div className="py-12"><Suspense fallback={<RouteFallback />}><AboutSection language={language} /></Suspense></div>} />
            <Route path="/culture" element={<Suspense fallback={<RouteFallback />}><TicoCultureSection language={language} onExploreTours={() => navigate('/tours')} /></Suspense>} />
            
            <Route path="/tools" element={
              <div className="space-y-12 py-8">
                <Suspense fallback={null}><TravelerToolkit
                  language={language}
                  currency={currency}
                  onOpenTripBuilder={() => setIsCustomFunnelOpen(true)}
                  onOpenLocalBuses={() => setIsLocalBusesOpen(true)}
                /></Suspense>
                <Suspense fallback={<RouteFallback />}><NationalTransportSection
                  language={language}
                  currency={currency}
                  onOpenLocalBuses={() => setIsLocalBusesOpen(true)}
                  onOpenTripBuilder={() => setIsCustomFunnelOpen(true)}
                /></Suspense>
              </div>
            } />

            <Route path="/counter" element={
              <Suspense fallback={<div className="py-24 text-center text-emerald-400">Cargando Mostrador Digital...</div>}>
                <CounterDeskPage language={language} />
              </Suspense>
            } />

            <Route path="/admin/ai-command" element={<AdminRouteGuard language={language === 'es' ? 'es' : 'en'}><Suspense fallback={<div className="py-24 text-center text-violet-300">Cargando sala de mando IA...</div>}><AutonomousOperationsPage language={language} /></Suspense></AdminRouteGuard>} />

            <Route path="/admin/ai-architecture" element={<AdminRouteGuard language={language === "es" ? "es" : "en"}><Suspense fallback={<div className="py-24 text-center text-violet-300">Cargando arquitectura IA...</div>}><AutonomousOperationsPage language={language} /></Suspense></AdminRouteGuard>} />

            <Route path="/admin" element={<AdminRouteGuard language={language === 'es' ? 'es' : 'en'}>
              <Suspense fallback={<RouteFallback />}><AdminControlCenterPage language={language} /></Suspense>
            </AdminRouteGuard>} />

            <Route path="/admin/leads" element={<AdminRouteGuard language={language === 'es' ? 'es' : 'en'}>
              <Suspense fallback={<RouteFallback />}><LeadsPipelinePage language={language} /></Suspense>
            </AdminRouteGuard>} />

            <Route path="/admin/email-operations" element={<AdminRouteGuard language={language === 'es' ? 'es' : 'en'}>
              <Suspense fallback={<div className="py-24 text-center text-sky-300">Cargando centro de correo...</div>}>
                <EmailOperationsPage language={language} />
              </Suspense>
            </AdminRouteGuard>} />

            <Route path="/admin/financial-legal" element={<AdminRouteGuard language={language === 'es' ? 'es' : 'en'}>
              <Suspense fallback={<div className="py-24 text-center text-amber-300">Cargando Gobierno Financiero...</div>}>
                <AutonomousOperationsPage language={language} />
              </Suspense>
            </AdminRouteGuard>} />

            <Route path="/ops" element={<AdminRouteGuard language={language === 'es' ? 'es' : 'en'}>
              <Suspense fallback={<div className="py-24 text-center text-emerald-400">Cargando Centro Operativo...</div>}>
                <AutonomousOperationsPage language={language} />
              </Suspense>
            </AdminRouteGuard>} />

            <Route path="/workspace" element={
              <div className="max-w-7xl mx-auto px-4 py-8">
                <Suspense fallback={<div>Cargando...</div>}>
                  <GoogleWorkspaceHub language={language === 'es' ? 'es' : 'en'} />
                </Suspense>
              </div>
            } />

            <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFoundPage language={language} /></Suspense>} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Tour Detail Modal */}
      {selectedTour && (
        <Suspense fallback={null}>
        <TourDetailModal
          tour={selectedTour}
          isOpen={!!selectedTour}
          onClose={() => setSelectedTour(null)}
          language={language}
          currency={currency}
          onConfirmBooking={(booking) => {
            setSelectedTour(null);
            setRecentBooking(booking);
            setMyBookings(prev => [booking, ...prev]);
          }}
          onBookingSuccess={handleBookingSuccess}
        />
        </Suspense>
      )}

      {/* Booking Confirmation Voucher Modal */}
      {recentBooking && (
        <Suspense fallback={null}>
        <BookingConfirmationModal
          booking={recentBooking}
          isOpen={!!recentBooking}
          language={language}
          currency={currency}
          onClose={() => setRecentBooking(null)}
        />
        </Suspense>
      )}

      {/* My Bookings List Drawer/Modal */}
      {isBookingsModalOpen && (
        <Suspense fallback={null}>
        <MyBookingsModal
          bookings={myBookings}
          language={language}
          currency={currency}
          onClose={() => setIsBookingsModalOpen(false)}
          onSelectBooking={(b) => {
            setIsBookingsModalOpen(false);
            setRecentBooking(b);
          }}
        />
        </Suspense>
      )}

      {/* Custom Travel Package Builder Modal */}
      {isCustomFunnelOpen && <Suspense fallback={null}><CustomFunnelModal
        isOpen={isCustomFunnelOpen}
        onClose={() => setIsCustomFunnelOpen(false)}
        language={language}
        currency={currency}
        onSelectTour={(t) => navigate(`/tour/${t.id}`)}
      /></Suspense>}

      {isLocalBusesOpen && <Suspense fallback={null}><LocalBusesModal
        isOpen={isLocalBusesOpen}
        onClose={() => setIsLocalBusesOpen(false)}
        language={language}
        currency={currency}
      /></Suspense>}
      
      {isFormsManagerModalOpen && <Suspense fallback={null}><FormsManagerModal
        isOpen={isFormsManagerModalOpen}
        onClose={() => setIsFormsManagerModalOpen(false)}
        language={language}
      /></Suspense>}


      {isAdminDashboardOpen && (
        <Suspense fallback={null}>
          <AdminDashboard 
            isOpen={isAdminDashboardOpen} 
            onClose={() => setIsAdminDashboardOpen(false)} 
            language={language} 
          />
        </Suspense>
      )}

      <BottomNav language={language} activeTab={activeTab} />
      {activeTab !== 'ai' && (
        <>
          <DigitalCounterWidget 
            language={language} 
            currency={currency} 
            selectedTour={selectedTour}
            onSelectTour={(t) => navigate(`/tour/${t.id}`)} 
          />
          <FloatingWhatsApp 
            language={language} 
            initialMessage={whatsappMessage} 
            onOpenAIAssistant={() => navigate('/ai')} 
            onSelectTour={(t) => navigate(`/tour/${t.id}`)}
          />
        </>
      )}
      <Footer language={language} />
      <CookiesBanner language={language} />
    </div>
  );
}
