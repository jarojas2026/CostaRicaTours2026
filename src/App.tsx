import React, { useState, useEffect } from 'react';
import { TOURS, REGIONS } from './data/toursData';
import { Tour, Language, Currency, TourCategory, TourRegion, BookingRequest } from './types';
import { detectBrowserLanguage, getLangText, fetchExchangeRates } from './utils/i18n';
import { Header } from './components/Header';
import { OurStory } from './components/OurStory';
import { DestinationsCarousel } from './components/DestinationsCarousel';
import { HeroSection } from './components/HeroSection';
import { ServicesSection } from './components/ServicesSection';
import { ToursGrid } from './components/ToursGrid';
import { TourCard } from './components/TourCard';
import { TourDetailModal } from './components/TourDetailModal';
import { InteractiveMap } from './components/InteractiveMap';
import { AIAssistant } from './components/AIAssistant';
import { ItineraryPlanner } from './components/ItineraryPlanner';
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
import { AdminDashboard } from './components/AdminDashboard';
import { LocalBusesModal } from './components/LocalBusesModal';
import { FormsManagerModal } from './components/FormsManagerModal';
import { NationalTransportSection } from './components/NationalTransportSection';
import { TicoCultureSection } from './components/TicoCultureSection';
import { HomeQuickNav } from './components/HomeQuickNav';
import { BottomNav } from './components/BottomNav';
import { FlightTrackerGadget } from './components/FlightTrackerGadget';
import { LiveTouristIntelligence } from './components/LiveTouristIntelligence';
import { Compass, ArrowLeft, Home, ChevronRight, Plane } from 'lucide-react';

import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
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
  const filteredTours = TOURS.filter(t => {
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
    <div className="min-h-screen bg-emerald-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-white relative pb-16 xl:pb-0">
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
      <main className="flex-1 space-y-0 pb-20 xl:pb-0">
        
        {/* Dynamic Breadcrumbs & Quick Return Bar for Sub-pages */}
        {activeTab !== 'home' && (
          <div className="bg-emerald-900/60 border-b border-emerald-500/20 py-2.5 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Breadcrumb path */}
              <div className="flex items-center gap-2 text-emerald-200">
                <button
                  onClick={() => setActiveTab('home')}
                  className="flex items-center gap-1 hover:text-amber-400 font-bold transition-colors cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Inicio' : 'Home'}</span>
                </button>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                <span className="font-black text-amber-400 flex items-center gap-1.5">
                  {activeTab === 'tours' && `🧭 ${language === 'es' ? 'Catálogo de Tours y Aventuras' : 'Tours & Adventures Catalog'}`}
                  {activeTab === 'flights' && `✈️ ${language === 'es' ? 'Rastreador en Vivo & Reserva de Vuelos a Costa Rica' : 'Live Flight Radar & Booking to Costa Rica'}`}
                  {activeTab === 'map' && `🗺️ ${language === 'es' ? 'Mapa Interactivo de Costa Rica' : 'Interactive Map of Costa Rica'}`}
                  {activeTab === 'ai' && `🤖 ${language === 'es' ? 'Ecosistema de 8 Agentes IA Especializados' : '8 Specialized AI Agents Hub'}`}
                  {activeTab === 'itinerary' && `✨ ${language === 'es' ? 'Planificador Inteligente de Itinerarios' : 'AI Trip Planner'}`}
                  {activeTab === 'culture' && `🇨🇷 ${language === 'es' ? 'Rincón Tico: Cultura, Comida y Café' : 'Tico Culture & Slang'}`}
                  {activeTab === 'tools' && `🚐 ${language === 'es' ? 'Transporte, Shuttles & Buses' : 'Transport & Shuttles'}`}
                </span>
              </div>

              {/* Quick Action Navigation Links */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('home')}
                  className="flex items-center gap-1 text-[11px] font-bold bg-emerald-950 hover:bg-emerald-800 text-emerald-200 hover:text-white px-3 py-1 rounded-full border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>{language === 'es' ? 'Volver al Inicio' : 'Back to Home'}</span>
                </button>

                {activeTab !== 'tours' && (
                  <button
                    onClick={() => setActiveTab('tours')}
                    className="hidden sm:flex items-center gap-1 text-[11px] font-bold bg-emerald-950 hover:bg-emerald-800 text-amber-300 hover:text-amber-200 px-3 py-1 rounded-full border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    <span>{language === 'es' ? 'Ver Tours (+20)' : 'View Tours (20+)'}</span>
                  </button>
                )}

                {activeTab !== 'flights' && (
                  <button
                    onClick={() => setActiveTab('flights')}
                    className="hidden sm:flex items-center gap-1 text-[11px] font-bold bg-emerald-950 hover:bg-emerald-800 text-amber-300 hover:text-amber-200 px-3 py-1 rounded-full border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    <Plane className="w-3 h-3 text-amber-400" />
                    <span>{language === 'es' ? 'Vuelos' : 'Flights'}</span>
                  </button>
                )}

                {activeTab !== 'ai' && (
                  <button
                    onClick={() => setActiveTab('ai')}
                    className="hidden md:flex items-center gap-1 text-[11px] font-black bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-emerald-950 px-3 py-1 rounded-full border border-amber-500/40 transition-colors cursor-pointer"
                  >
                    <span>🤖 {language === 'es' ? 'Consultar 8 Agentes IA' : 'Ask 8 AI Agents'}</span>
                  </button>
                )}
              </div>
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

            {/* Live Flight Radar & Airport Transfers Gadget */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <FlightTrackerGadget
                language={language}
                currency={currency}
                onBookingSuccess={handleBookingSuccess}
                onAskAI={(prompt) => {
                  setActiveTab('ai');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>

            {/* Live Google-Grounded Tourist Intelligence */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <LiveTouristIntelligence
                language={language}
                onAskAgent={(q) => {
                  setActiveTab('ai');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>

            {/* Destinations Carousel */}
            <DestinationsCarousel 
              language={language}
              onSelectRegion={(reg) => {
                setSelectedRegion(reg);
                setActiveTab('tours');
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
              }}
            />

            {/* Marketplace Vision & Story */}
            <OurStory language={language} />

          </div>
        )}

        {/* Tab: Flights to Costa Rica (Dedicated Radar & Booking) */}
        {activeTab === 'flights' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <FlightTrackerGadget
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
            <TicoCultureSection language={language} />
          </div>
        )}

        {/* Tab Tools: Transport & Useful Info */}
        {activeTab === 'tools' && (
          <div className="space-y-12 py-8">
            {/* Live Flight Radar & Airport Transfers Gadget */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <FlightTrackerGadget
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
          <div>
            <InteractiveMap
              language={language}
              currency={currency}
              tours={filteredTours}
              selectedRegion={selectedRegion}
              onSelectRegion={(reg) => {
                setSelectedRegion(reg);
                setActiveTab('tours');
              }}
              onExploreRegionTours={(reg) => {
                setSelectedRegion(reg);
                setActiveTab('tours');
              }}
              onExitMap={() => setActiveTab('tours')}
              onSelectTour={(t) => setSelectedTour(t)}
            />
          </div>
        )}

        {/* Tab 3: AI Concierge Chat */}
        {activeTab === 'ai' && (
          <div className="space-y-8 pb-12">
            <AIAssistant
              language={language}
              onSelectTour={(t) => setSelectedTour(t)}
              userBookings={myBookings}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

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
            <ItineraryPlanner
              language={language}
              onSelectTour={(t) => setSelectedTour(t)}
            />
          </div>
        )}

      </main>

      {/* Tour Details Booking Modal */}
      {selectedTour && (
        <TourDetailModal
          tour={selectedTour}
          isOpen={!!selectedTour}
          language={language}
          currency={currency}
          onClose={() => setSelectedTour(null)}
          onConfirmBooking={handleBookingSuccess}
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
        onSelectTour={(t) => setSelectedTour(t)}
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
      <AdminDashboard 
        isOpen={isAdminDashboardOpen} 
        onClose={() => setIsAdminDashboardOpen(false)} 
        language={language} 
      />
      <Footer language={language} onOpenLegal={() => setIsLegalModalOpen(true)} />
      <CookiesBanner language={language} />

    </div>
  );
}
