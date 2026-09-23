import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { REGIONS } from './data/toursData';
import { useTours } from './contexts/ToursContext';
import { Tour, Language, Currency, TourCategory, TourRegion, BookingRequest } from './types';
import { detectBrowserLanguage, getLangText, fetchExchangeRates } from './utils/i18n';
import { Header } from './components/Header';
import { TourDetailModal } from './components/TourDetailModal';
import { InteractiveMap } from './components/InteractiveMap';
import { BookingConfirmationModal } from './components/BookingConfirmationModal';
import { MyBookingsModal } from './components/MyBookingsModal';
import { Footer } from './components/Footer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { CustomFunnelModal } from './components/CustomFunnelModal';
import { TravelerToolkit } from './components/TravelerToolkit';
import { MicroclimateRadar } from './components/MicroclimateRadar';
import { AmbientBackground } from './components/AmbientBackground';
import { LegalModal } from './components/LegalModal';
import { CookiesBanner } from './components/CookiesBanner';
import { LocalBusesModal } from './components/LocalBusesModal';
import { FormsManagerModal } from './components/FormsManagerModal';
import { NationalTransportSection } from './components/NationalTransportSection';
import { TicoCultureSection } from './components/TicoCultureSection';
import { Home as HomePage } from './pages/Home';
import { ToursPage } from './pages/ToursPage';
import { TourDetailPage } from './pages/TourDetailPage';
import { DestinationsSection } from './components/DestinationsSection';
import { CategoriesSection } from './components/CategoriesSection';
import { BlogSection } from './components/BlogSection';
import { AboutSection } from './components/AboutSection';
import { BottomNav } from './components/BottomNav';
import { SEOHead } from './components/SEOHead';
import { OfflineBanner } from './components/OfflineBanner';
import { DigitalCounterWidget } from './components/DigitalCounterWidget';
import { Home, ChevronRight, ArrowLeft } from 'lucide-react';
import { AdminRouteGuard } from './components/AdminRouteGuard';

// Code-splitting via React.lazy to reduce initial JS bundle size
const ItineraryPlanner = lazy(() => import('./components/ItineraryPlanner').then(m => ({ default: m.ItineraryPlanner })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AIAssistant = lazy(() => import('./components/AIAssistant').then(m => ({ default: m.AIAssistant })));
const FlightTrackerGadget = lazy(() => import('./components/FlightTrackerGadget').then(m => ({ default: m.FlightTrackerGadget })));
const LiveTouristIntelligence = lazy(() => import('./components/LiveTouristIntelligence').then(m => ({ default: m.LiveTouristIntelligence })));
const PhotoTourFinder = lazy(() => import('./components/PhotoTourFinder').then(m => ({ default: m.PhotoTourFinder })));
const GoogleWorkspaceHub = lazy(() => import('./components/GoogleWorkspaceHub').then(m => ({ default: m.GoogleWorkspaceHub })));
const CounterDeskPage = lazy(() => import('./pages/CounterDeskPage').then(m => ({ default: m.CounterDeskPage })));
const AutonomousOperationsPage = lazy(() => import('./pages/AutonomousOperationsPage').then(m => ({ default: m.default })));

import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tours: TOURS, loading: toursLoading } = useTours();
  const [language, setLanguage] = useState<Language>(detectBrowserLanguage);
  const [currency, setCurrency] = useState<Currency>('USD');

  // Active path for UI state
  const activeTab = location.pathname.split('/')[1] || 'home';

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TourCategory | 'all'>('all');
  const [selectedRegion, setSelectedRegion] = useState<TourRegion | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'fácil' | 'moderado' | 'exigente'>('all');
  const [maxPrice, setMaxPrice] = useState<number>(500);

  // Shareable catalog state: filters/search survive refresh, back/forward and copied links.
  useEffect(() => {
    const q = searchParams.get('q');
    const category = searchParams.get('category') as TourCategory | null;
    const region = searchParams.get('region') as TourRegion | null;
    const difficulty = searchParams.get('difficulty') as 'fácil' | 'moderado' | 'exigente' | null;
    const price = Number(searchParams.get('maxPrice'));
    if (location.pathname === '/tours') {
      if (q !== null) setSearchQuery(q);
      if (category && category !== 'all') setSelectedCategory(category);
      if (region && region !== 'all') setSelectedRegion(region);
      if (difficulty && ['fácil', 'moderado', 'exigente'].includes(difficulty)) setSelectedDifficulty(difficulty);
      if (Number.isFinite(price) && price > 0) setMaxPrice(price);
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    if (location.pathname !== '/tours') return;
    const next = new URLSearchParams();
    if (searchQuery.trim()) next.set('q', searchQuery.trim());
    if (selectedCategory !== 'all') next.set('category', selectedCategory);
    if (selectedRegion !== 'all') next.set('region', selectedRegion);
    if (selectedDifficulty !== 'all') next.set('difficulty', selectedDifficulty);
    if (maxPrice < 500) next.set('maxPrice', String(maxPrice));
    const current = searchParams.toString();
    if (next.toString() !== current) setSearchParams(next, { replace: true });
  }, [location.pathname, searchQuery, selectedCategory, selectedRegion, selectedDifficulty, maxPrice, searchParams, setSearchParams]);

  // Keep SPA navigation feeling native: every route starts at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  // Modals state
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [recentBooking, setRecentBooking] = useState<BookingRequest | null>(null);
  const [myBookings, setMyBookings] = useState<BookingRequest[]>([]);
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [isCustomFunnelOpen, setIsCustomFunnelOpen] = useState(false);
  const [isLocalBusesOpen, setIsLocalBusesOpen] = useState(false);
  const [isFormsManagerModalOpen, setIsFormsManagerModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // Check URL parameters for successful payment redirect (Stripe/PayPal)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('booking') === 'success') {
      const sessionId = params.get('session_id');
      setRecentBooking({
        bookingId: "VERIFICANDO...",
        tourId: "procesando",
        tourName: "Tu Experiencia en Costa Rica",
        customer: {
          fullName: "Verificando...",
          email: "",
          phone: "",
          country: ""
        },
        date: "Confirmando fecha...",
        time: "Confirmando hora...",
        adults: 1,
        children: 0,
        pickupHotel: "",
        specialRequests: "",
        totalUSD: 0,
        totalCRC: 0,
        paymentMethod: "credit_card",
        status: "pendiente_pago",
        createdAt: new Date().toISOString()
      });

      // Cleanup URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('booking') === 'canceled') {
      alert(language === 'es' ? 'El pago fue cancelado. Puedes volver a intentarlo cuando gustes.' : 'Payment was canceled. You can try again whenever you are ready.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [language]);

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
    setMyBookings(prev => [booking, ...prev]);
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
      <SEOHead language={language} />
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

              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 text-[11px] font-bold bg-[#041910] hover:bg-[#07261b] text-emerald-200 hover:text-white px-3 py-1 rounded-full border border-emerald-500/30 transition-all cursor-pointer shrink-0 shadow-sm"
              >
                <ArrowLeft className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">{language === 'es' ? 'Volver al Inicio' : 'Back to Home'}</span>
                <span className="sm:hidden">{language === 'es' ? 'Inicio' : 'Home'}</span>
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
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
              <ToursPage
                language={language}
                currency={currency}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedRegion={selectedRegion}
                setSelectedRegion={setSelectedRegion}
                onSelectTour={setSelectedTour}
              />
            } />

            <Route path="/tour/:id" element={
              <TourDetailPage language={language} currency={currency} />
            } />

            <Route path="/destinations" element={
              <div className="max-w-7xl mx-auto px-4 py-16 space-y-12">
                <div className="text-center">
                  <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
                    {language === 'es' ? 'Destinos de Costa Rica' : 'Costa Rica Destinations'}
                  </h2>
                </div>
                <DestinationsSection 
                  language={language}
                  onSelectRegion={(regionId) => {
                    setSelectedRegion(regionId as any);
                    navigate('/tours');
                  }}
                />
              </div>
            } />

            <Route path="/activities" element={
              <div className="max-w-7xl mx-auto px-4 py-16 space-y-12">
                <div className="text-center">
                  <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
                    {language === 'es' ? 'Actividades & Aventuras' : 'Activities & Adventures'}
                  </h2>
                </div>
                <CategoriesSection 
                  language={language} 
                  onSelectCategory={(catId) => {
                    setSelectedCategory(catId as any);
                    navigate('/tours');
                  }}
                />
              </div>
            } />

            <Route path="/map" element={
              <div className="w-full min-h-[calc(100vh-80px)]">
                <InteractiveMap
                  language={language}
                  currency={currency}
                  tours={toursLoading ? [] : TOURS}
                  selectedRegion={selectedRegion}
                  onSelectRegion={setSelectedRegion}
                  onExploreRegionTours={(reg) => {
                    setSelectedRegion(reg);
                    navigate('/tours');
                  }}
                  onExitMap={() => navigate('/tours')}
                  onSelectTour={(t) => navigate(`/tour/${t.id}`)}
                  onOpenItineraryTab={() => setIsCustomFunnelOpen(true)}
                  onOpenLocalBusesModal={() => setIsLocalBusesOpen(true)}
                />
              </div>
            } />

            <Route path="/ai" element={
              <div className="space-y-8 pb-12 py-8">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  <Suspense fallback={<div className="h-40 animate-pulse bg-emerald-950/20 rounded-2xl" />}>
                    <PhotoTourFinder />
                  </Suspense>
                </div>
                <Suspense fallback={<div className="py-24 text-center text-emerald-400">Cargando...</div>}>
                  <AIAssistant
                    language={language}
                    onSelectTour={(t) => navigate(`/tour/${t.id}`)}
                    userBookings={myBookings}
                  />
                </Suspense>
              </div>
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

            <Route path="/blog" element={<div className="py-12"><BlogSection language={language} /></div>} />
            <Route path="/about" element={<div className="py-12"><AboutSection language={language} /></div>} />
            <Route path="/culture" element={<TicoCultureSection language={language} onExploreTours={() => navigate('/tours')} />} />
            
            <Route path="/tools" element={
              <div className="space-y-12 py-8">
                <TravelerToolkit
                  language={language}
                  currency={currency}
                  onOpenTripBuilder={() => setIsCustomFunnelOpen(true)}
                  onOpenLocalBuses={() => setIsLocalBusesOpen(true)}
                />
                <NationalTransportSection
                  language={language}
                  currency={currency}
                  onOpenLocalBuses={() => setIsLocalBusesOpen(true)}
                  onOpenTripBuilder={() => setIsCustomFunnelOpen(true)}
                />
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
              <Suspense fallback={<div className="py-24 text-center text-amber-300">Cargando Centro de Control...</div>}>
                <AutonomousOperationsPage language={language} />
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

            <Route path="*" element={
              <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
                <div className="max-w-xl text-center rounded-3xl border border-emerald-500/20 bg-[#061d15]/80 backdrop-blur-xl p-8 sm:p-12 shadow-2xl">
                  <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 text-3xl">404</div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{language === 'es' ? 'Esta ruta se perdió en la selva.' : 'This route got lost in the jungle.'}</h2>
                  <p className="mt-3 text-stone-300">{language === 'es' ? 'Puedes explorar nuestros tours, pedir ayuda a la IA o volver al inicio.' : 'Explore our tours, ask the AI concierge, or return home.'}</p>
                  <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <button onClick={() => navigate('/tours')} className="px-5 py-3 rounded-xl bg-emerald-400 text-stone-950 font-black hover:bg-emerald-300 transition">{language === 'es' ? 'Explorar tours' : 'Explore tours'}</button>
                    <button onClick={() => navigate('/ai')} className="px-5 py-3 rounded-xl border border-emerald-400/30 bg-emerald-950/50 text-emerald-100 font-bold hover:bg-emerald-900/60 transition">{language === 'es' ? 'Hablar con IA' : 'Ask AI'}</button>
                    <button onClick={() => navigate('/')} className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 text-stone-200 font-bold hover:bg-white/10 transition">{language === 'es' ? 'Inicio' : 'Home'}</button>
                  </div>
                </div>
              </div>
            } />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Tour Detail Modal */}
      {selectedTour && (
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
      )}

      {/* Booking Confirmation Voucher Modal */}
      {recentBooking && (
        <BookingConfirmationModal
          booking={recentBooking}
          isOpen={!!recentBooking}
          language={language}
          currency={currency}
          onClose={() => setRecentBooking(null)}
        />
      )}

      {/* My Bookings List Drawer/Modal */}
      {isBookingsModalOpen && (
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
      )}

      {/* Custom Travel Package Builder Modal */}
      <CustomFunnelModal
        isOpen={isCustomFunnelOpen}
        onClose={() => setIsCustomFunnelOpen(false)}
        language={language}
        currency={currency}
        onSelectTour={(t) => navigate(`/tour/${t.id}`)}
      />

      <LocalBusesModal
        isOpen={isLocalBusesOpen}
        onClose={() => setIsLocalBusesOpen(false)}
        language={language}
        currency={currency}
      />
      
      <FormsManagerModal
        isOpen={isFormsManagerModalOpen}
        onClose={() => setIsFormsManagerModalOpen(false)}
        language={language}
      />

      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        language={language}
      />

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
      <DigitalCounterWidget language={language} currency={currency} onSelectTour={(t) => navigate(`/tour/${t.id}`)} />
      <FloatingWhatsApp language={language} initialMessage={whatsappMessage} onOpenAIAssistant={() => navigate('/ai')} />
      <Footer language={language} onOpenLegal={() => setIsLegalModalOpen(true)} />
      <CookiesBanner language={language} />
    </div>
  );
}
