import React, { useState, useEffect, Suspense, lazy } from 'react';
import { REGIONS } from './data/toursData';
import { useTours } from './contexts/ToursContext';
import { Tour, Language, Currency, TourCategory, TourRegion, BookingRequest } from './types';
import { detectBrowserLanguage, getLangText, fetchExchangeRates } from './utils/i18n';
import { Header } from './components/Header';
import { OurStory } from './components/OurStory';
import { DestinationsCarousel } from './components/DestinationsCarousel';
import { HeroSection } from './components/HeroSection';
import { ServicesSection } from './components/ServicesSection';
import { ToursGrid } from './components/ToursGrid';
import { TourCard } from './components/TourCard';
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
import { HomeQuickNav } from './components/HomeQuickNav';
import { HomeTrustSections } from './components/HomeTrustSections';
import { BottomNav } from './components/BottomNav';
import { FlightTrackerGadget } from './components/FlightTrackerGadget';
import { LiveTouristIntelligence } from './components/LiveTouristIntelligence';
import { Compass, ArrowLeft, Home, ChevronRight, Plane } from 'lucide-react';

// Code-splitting via React.lazy to reduce initial JS bundle size
const TourDetailModal = lazy(() => import('./components/TourDetailModal').then(m => ({ default: m.TourDetailModal })));
const ItineraryPlanner = lazy(() => import('./components/ItineraryPlanner').then(m => ({ default: m.ItineraryPlanner })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AIAssistant = lazy(() => import('./components/AIAssistant').then(m => ({ default: m.AIAssistant })));

import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const { tours: TOURS, loading: toursLoading } = useTours();
  const [language, setLanguage] = useState<Language>(detectBrowserLanguage);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [activeTab, setActiveTab] = useState<'home' | 'tours' | 'map' | 'ai' | 'itinerary' | 'bookings' | 'tools' | 'culture' | 'flights'>('home');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TourCategory | 'all'>('all');
  const [selectedRegion, setSelectedRegion] = useState<TourRegion | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'fácil' | 'moderado' | 'exigente'>('all');
  const [maxPrice, setMaxPrice] = useState<number>(200);

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
      // We simulate fetching the confirmed booking or we just show a success modal
      setRecentBooking({
        bookingId: "VERIFICANDO...",
        tourId: "procesando",
        tourName: "Tu Experiencia en Costa Rica",
        date: "Confirmando fecha...",
        time: "Confirmando hora...",
        adults: 1,
        children: 0,
        pickupHotel: "",
        specialRequests: "",
        totalUSD: 0,
        totalCRC: 0,
        paymentMethod: "credit_card",
        paymentStatus: "completed",
        status: "confirmada",
        createdAt: new Date().toISOString()
      });

      if (sessionId) {
        // Here we could fetch the specific booking by stripe session ID if we had a dedicated endpoint
        // For now, we clear the URL to avoid re-triggering
      }

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

  const [ratesLoaded, setRatesLoaded] = useState(false);
  useEffect(() => {
    fetchExchangeRates().then(() => setRatesLoaded(true));
    const handleRatesUpdate = () => setRatesLoaded(prev => !prev);
    window.addEventListener('exchangeRatesUpdated', handleRatesUpdate);
    return () => window.removeEventListener('exchangeRatesUpdated', handleRatesUpdate);
  }, []);



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

  // Filter logic
  const filteredTours = toursLoading ? [] : TOURS.filter(t => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = getLangText(t.title, language).toLowerCase().includes(q);
      const descMatch = getLangText(t.description, language).toLowerCase().includes(q);
      const placeMatch = t.location.placeName.toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !placeMatch) return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && t.category !== selectedCategory) {
      return false;
    }

    // Region filter
    if (selectedRegion !== 'all' && t.region !== selectedRegion) {
      return false;
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all' && t.difficulty !== selectedDifficulty) {
      return false;
    }

    // Price filter
    if (t.priceUSD > maxPrice) {
      return false;
    }

    return true;
  });

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
  } else if (activeTab === 'map') {
    whatsappMessage = language === 'es'
      ? `Hola Costa Rica Tours (costaricatours.es), estoy buscando tours en la región de ${selectedRegion !== 'all' ? selectedRegion : 'Costa Rica'}.`
      : `Hello Costa Rica Tours (costaricatours.es), I'm looking for tours in the ${selectedRegion !== 'all' ? selectedRegion : 'Costa Rica'} region.`;
  }

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#041711] text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950 relative pb-16 xl:pb-0">
      <AmbientBackground />
      {/* Top Header Navigation */}
      <Header
        language={language}
        setLanguage={setLanguage}
        currency={currency}
        setCurrency={setCurrency}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        bookingsCount={myBookings.length}
        onOpenBookingList={() => setIsBookingsModalOpen(true)}
        onOpenCustomFunnel={() => setIsCustomFunnelOpen(true)}
        onOpenLocalBuses={() => setIsLocalBusesOpen(true)}
        onOpenFormsManager={() => setIsFormsManagerModalOpen(true)}
      />

      {/* Main Content Areas based on activeTab */}
      <main className={`flex-1 space-y-0 relative z-10 isolate ${activeTab === 'map' ? 'pb-0' : 'pb-20 lg:pb-0'}`}>
        
        {/* Dynamic Breadcrumbs & Quick Return Bar for Sub-pages (Except full-screen map) */}
        {activeTab !== 'home' && activeTab !== 'map' && (
          <div className="bg-[#02130c]/90 backdrop-blur-md border-b border-emerald-500/20 py-2 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
              {/* Breadcrumb path */}
              <div className="flex items-center gap-2 text-stone-300 min-w-0">
                <button
                  onClick={() => setActiveTab('home')}
                  className="flex items-center gap-1 text-emerald-200/80 hover:text-amber-400 font-bold transition-colors cursor-pointer shrink-0"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Inicio' : 'Home'}</span>
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-500/40 shrink-0" />
                <span className="font-bold text-amber-400 truncate flex items-center gap-1.5">
                  {activeTab === 'tours' && `🧭 ${language === 'es' ? 'Catálogo de Tours y Aventuras' : 'Tours & Adventures Catalog'}`}
                  {activeTab === 'flights' && `✈️ ${language === 'es' ? 'Rastreador en Vivo de Vuelos a Costa Rica' : 'Live Flight Radar to Costa Rica'}`}
                  {activeTab === 'ai' && `🤖 ${language === 'es' ? 'Motor Inteligente & Asistente Turístico' : 'AI Concierge & Automations'}`}
                  {activeTab === 'itinerary' && `✨ ${language === 'es' ? 'Planificador Inteligente de Itinerarios' : 'AI Trip Planner'}`}
                  {activeTab === 'culture' && `🇨🇷 ${language === 'es' ? 'Rincón Tico: Cultura, Comida y Café' : 'Tico Culture & Slang'}`}
                  {activeTab === 'tools' && `🚐 ${language === 'es' ? 'Transporte, Shuttles & Buses' : 'Transport & Shuttles'}`}
                </span>
              </div>

              {/* Quick Return Pill */}
              <button
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1.5 text-[11px] font-bold bg-[#041910] hover:bg-[#07261b] text-emerald-200 hover:text-white px-3 py-1 rounded-full border border-emerald-500/30 transition-all cursor-pointer shrink-0 shadow-sm"
              >
                <ArrowLeft className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">{language === 'es' ? 'Volver al Inicio' : 'Back to Home'}</span>
                <span className="sm:hidden">{language === 'es' ? 'Inicio' : 'Home'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 0: Home / Discover */}
        {activeTab === 'home' && (
          <div className="space-y-12">
            
            {/* Hero Section */}
            <HeroSection
              language={language}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              onOpenItineraryPlanner={() => {
                setActiveTab('itinerary');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onExploreTours={() => {
                setActiveTab('tours');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenCustomFunnel={() => setIsCustomFunnelOpen(true)}
            />
            {/* Quick Navigation Hub & Curated Highlights */}
            <HomeQuickNav
              language={language}
              currency={currency}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setActiveTab('tours');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectTour={(t) => setSelectedTour(t)}
              onOpenCustomFunnel={() => setIsCustomFunnelOpen(true)}
            />

            {/* Trust & Conversion Sections: How it works, Testimonials, Official Partners & VIP CTA */}
            <HomeTrustSections
              language={language}
              onOpenCustomFunnel={() => setIsCustomFunnelOpen(true)}
              onOpenItineraryPlanner={() => {
                setActiveTab('itinerary');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onExploreTours={() => {
                setActiveTab('tours');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

          </div>
        )}

        {/* Tab: Flights to Costa Rica (Dedicated Radar & Booking) */}
        {activeTab === 'flights' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <FlightTrackerGadget
                onBack={() => setActiveTab("home")}
              standalone
              language={language}
              currency={currency}
              onBookingSuccess={handleBookingSuccess}
              onAskAI={(prompt) => {
                setActiveTab('ai');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            <LiveTouristIntelligence
              language={language}
              onAskAgent={(q) => {
                setActiveTab('ai');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* Tab: Authentic Costa Rican Culture (Rincón Tico) */}
        {activeTab === 'culture' && (
          <div className="py-8">
            <TicoCultureSection language={language} onBack={() => setActiveTab('home')} onExploreTours={() => setActiveTab('tours')} />
          </div>
        )}

        {/* Tab Tools: Transport & Useful Info */}
        {activeTab === 'tools' && (
          <div className="space-y-12 py-8">
            {/* Live Flight Radar & Airport Transfers Gadget */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <FlightTrackerGadget
                onBack={() => setActiveTab("home")}
                language={language}
                currency={currency}
                onBookingSuccess={handleBookingSuccess}
                onAskAI={(prompt) => {
                  setActiveTab('ai');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>

            {/* Traveler Toolkit Section for International Tourists */}
            <TravelerToolkit
              language={language}
              currency={currency}
              onOpenTripBuilder={() => setIsCustomFunnelOpen(true)}
              onOpenLocalBuses={() => setIsLocalBusesOpen(true)}
            />

            {/* National Transport & Shuttles Section */}
            <NationalTransportSection
              language={language}
              currency={currency}
              onOpenLocalBuses={() => setIsLocalBusesOpen(true)}
              onOpenTripBuilder={() => setIsCustomFunnelOpen(true)}
            />

            {/* Live Microclimate Radar & Gear Packing */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <MicroclimateRadar language={language} />
            </div>

            {/* Live Tourist Grounded Search */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <LiveTouristIntelligence
                language={language}
                onAskAgent={(q) => {
                  setActiveTab('ai');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          </div>
        )}

        {/* Tab 1: Catalog */}
        {activeTab === 'tours' && (
          <div className="space-y-12 py-8">
            
            {/* Filter Bar & Tour Catalog Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-12">
              <ToursGrid
                onBack={() => setActiveTab("home")}
                tours={filteredTours}
                language={language}
                currency={currency}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedRegion={selectedRegion}
                setSelectedRegion={setSelectedRegion}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                difficultyFilter={selectedDifficulty}
                setDifficultyFilter={setSelectedDifficulty}
                maxPrice={maxPrice}
                setMaxPrice={setMaxPrice}
                onSelectTour={(t) => setSelectedTour(t)}
                onOpenMap={() => setActiveTab('map')}
              />
            </div>

          </div>
        )}

        {/* Tab 2: Interactive Map */}
        {activeTab === 'map' && (
          <div className="w-full">
            <InteractiveMap
              language={language}
              currency={currency}
              tours={toursLoading ? [] : TOURS}
              selectedRegion={selectedRegion}
              onSelectRegion={(reg) => {
                setSelectedRegion(reg);
              }}
              onExploreRegionTours={(reg) => {
                setSelectedRegion(reg);
                setActiveTab('tours');
              }}
              onExitMap={() => setActiveTab('tours')}
              onSelectTour={(t) => setSelectedTour(t)}
              onOpenItineraryTab={() => setIsCustomFunnelOpen(true)}
              onOpenLocalBusesModal={() => setIsLocalBusesOpen(true)}
            />
          </div>
        )}

        {/* Tab 3: AI Concierge Chat */}
        {activeTab === 'ai' && (
          <div className="space-y-8 pb-12">
            <Suspense fallback={
              <div className="py-24 text-center text-emerald-400 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div>
                <span className="font-semibold">{language === 'es' ? 'Cargando Asistente Virtual...' : 'Loading AI Assistant...'}</span>
              </div>
            }>
              <AIAssistant
                onBack={() => setActiveTab("home")}
                language={language}
                onSelectTour={(t) => setSelectedTour(t)}
                userBookings={myBookings}
                onNavigateTab={(tab) => {
                  setActiveTab(tab);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </Suspense>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <LiveTouristIntelligence
                language={language}
                onAskAgent={(q) => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          </div>
        )}

        {/* Tab 4: AI Itinerary Generator */}
        {activeTab === 'itinerary' && (
          <div>
            <Suspense fallback={
              <div className="py-24 text-center text-emerald-400 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div>
                <span className="font-semibold">{language === 'es' ? 'Cargando Planificador Inteligente...' : 'Loading AI Trip Planner...'}</span>
              </div>
            }>
              <ItineraryPlanner
                onBack={() => setActiveTab("home")}
                language={language}
                onSelectTour={(t) => setSelectedTour(t)}
              />
            </Suspense>
          </div>
        )}

      </main>

      {/* Tour Details Booking Modal */}
      {selectedTour && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#07241a] border border-emerald-500/30 rounded-2xl p-6 text-stone-100 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div>
              <span>{language === 'es' ? 'Cargando detalles del tour...' : 'Loading tour details...'}</span>
            </div>
          </div>
        }>
          <TourDetailModal
            tour={selectedTour}
            isOpen={!!selectedTour}
            language={language}
            currency={currency}
            onClose={() => setSelectedTour(null)}
            onConfirmBooking={handleBookingSuccess}
            onBookingSuccess={handleBookingSuccess}
          />
        </Suspense>
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
        onSelectTour={(t) => setSelectedTour(t)}
        onOpenItineraryPlanner={() => {
          setIsCustomFunnelOpen(false);
          setActiveTab('itinerary');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* AI Eco-Vision Photo & Wildlife Scanner Modal */}

      {/* Live Costa Rica Search Grounding Modal */}

      {/* AI Creative Studio Modal */}

      {/* Live Voice Assistant Modal */}

      {/* Local Costa Rica Bus Transport Modal */}
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

      {/* Floating Central AI Hub */}

      {/* Mobile Bottom Navigation */}
      <BottomNav language={language} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Floating WhatsApp Action Widget */}
      <FloatingWhatsApp language={language} initialMessage={whatsappMessage} onOpenAIAssistant={() => setActiveTab('ai')} onSelectTour={setSelectedTour} />

      {/* Footer */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        language={language}
      />
      {isAdminDashboardOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#07241a] border border-amber-500/30 rounded-2xl p-6 text-stone-100 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div>
              <span>{language === 'es' ? 'Cargando Panel Administrativo...' : 'Loading Admin Dashboard...'}</span>
            </div>
          </div>
        }>
          <AdminDashboard 
            isOpen={isAdminDashboardOpen} 
            onClose={() => setIsAdminDashboardOpen(false)} 
            language={language} 
          />
        </Suspense>
      )}
      <Footer language={language} onOpenLegal={() => setIsLegalModalOpen(true)} />
      <CookiesBanner language={language} />

    </div>
  );
}
