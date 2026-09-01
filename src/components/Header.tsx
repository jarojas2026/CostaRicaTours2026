import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Globe, 
  Sparkles, 
  ChevronDown, 
  Mail, 
  MessageCircle, 
  LogIn, 
  LogOut, 
  Bus, 
  Menu, 
  X, 
  Compass, 
  Map, 
  Coffee, 
  Bot, 
  Clock,
  ShieldCheck,
  Plane
} from 'lucide-react';
import { Language, Currency } from '../types';
import { SUPPORTED_LANGUAGES, UI_TRANSLATIONS } from '../utils/i18n';
import { CURRENCIES } from '../utils/currencies';
import { auth, signInWithGoogle, signOut } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  activeTab?: 'home' | 'tours' | 'map' | 'culture' | 'ai' | 'itinerary' | 'bookings' | 'tools' | 'flights';
  setActiveTab?: (tab: 'home' | 'tours' | 'map' | 'culture' | 'ai' | 'itinerary' | 'bookings' | 'tools' | 'flights') => void;
  bookingsCount?: number;
  onOpenBookingList?: () => void;
  cartCount?: number;
  onOpenCart?: () => void;
  onOpenConcierge?: () => void;
  onOpenItineraryPlanner?: () => void;
  onOpenCustomFunnel?: () => void;
  onOpenLocalBuses?: () => void;
  onOpenFormsManager?: () => void;
  activeSection?: string;
  setActiveSection?: (sec: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  setLanguage,
  currency,
  setCurrency,
  activeTab,
  setActiveTab,
  bookingsCount,
  onOpenBookingList,
  cartCount,
  onOpenCart,
  onOpenItineraryPlanner,
  onOpenCustomFunnel,
  onOpenLocalBuses,
  activeSection,
  setActiveSection
}) => {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const [currencyPrompt, setCurrencyPrompt] = useState<{
    isOpen: boolean;
    targetLang: Language;
    suggestedCurrency: Currency;
  } | null>(null);

  const getSuggestedCurrency = (lang: Language): Currency => {
    switch (lang) {
      case 'es': return 'CRC';
      case 'de':
      case 'fr': return 'EUR';
      case 'en':
      case 'zh':
      case 'ja': return 'USD';
      default: return 'USD';
    }
  };

  const handleLanguageSelect = (langCode: Language) => {
    setIsLangMenuOpen(false);
    const suggested = getSuggestedCurrency(langCode);
    if (suggested !== currency) {
      setLanguage(langCode);
      setCurrencyPrompt({
        isOpen: true,
        targetLang: langCode,
        suggestedCurrency: suggested
      });
    } else {
      setLanguage(langCode);
    }
  };

  const acceptCurrencyChange = () => {
    if (currencyPrompt) {
      setCurrency(currencyPrompt.suggestedCurrency);
      setCurrencyPrompt(null);
    }
  };

  const declineCurrencyChange = () => {
    setCurrencyPrompt(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const currentLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  const t = (key: string) => UI_TRANSLATIONS[key]?.[language] || UI_TRANSLATIONS[key]?.['es'] || key;
  const currentTab = activeTab || activeSection || 'home';

  const handleTabChange = (tab: any) => {
    if (setActiveTab) setActiveTab(tab);
    if (setActiveSection) setActiveSection(tab);
    setIsMobileDrawerOpen(false);
  };

  const handleOpenBookings = () => {
    if (onOpenBookingList) onOpenBookingList();
    else if (onOpenCart) onOpenCart();
    setIsMobileDrawerOpen(false);
  };

  const handleOpenItinerary = () => {
    if (onOpenItineraryPlanner) onOpenItineraryPlanner();
    else handleTabChange('itinerary');
  };

  const count = bookingsCount !== undefined ? bookingsCount : (cartCount || 0);

  return (
    <>
      {/* Structural Spacer: Prevents content clipping under fixed header */}
      <div className="w-full h-[94px] sm:h-[100px] shrink-0" aria-hidden="true" />
      
      <header id="main-header" className="w-full fixed top-0 left-0 right-0 z-50 bg-[#071C10]/95 backdrop-blur-md border-b border-emerald-500/25 text-neutral-100 shadow-xl transition-all duration-200">
        
        {/* Top Assistance & Trust Strip */}
        <div className="bg-[#05140B] text-xs px-3 sm:px-6 py-1 border-b border-emerald-900/60 text-emerald-200/90">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            
            <div className="flex items-center gap-2 sm:gap-3 text-[11px] whitespace-nowrap overflow-x-auto hide-scrollbar">
              <span className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>{language === 'es' ? '🇨🇷 Agencia Receptiva Oficial' : '🇨🇷 Official Receptive Agency'}</span>
              </span>

              <span className="hidden sm:inline text-emerald-800">•</span>
              
              <a
                href="https://wa.me/50687959148?text=Hola%20Costa%20Rica%20Tours%20(costaricatours.es),%20quisiera%20consultar%20sobre%20los%20tours%20y%20traslados."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-100 hover:text-white font-bold transition-colors"
              >
                <MessageCircle className="w-3 h-3 text-[#25D366]" />
                <span>WhatsApp 24/7: <strong className="text-white">+506 8795-9148</strong></span>
              </a>

              <span className="hidden lg:inline text-emerald-800">•</span>

              <a
                href="mailto:info@costaricatours.es"
                className="hidden lg:inline-flex items-center gap-1 text-emerald-300 hover:text-white transition-colors"
              >
                <Mail className="w-3 h-3 text-emerald-400" />
                <span>info@costaricatours.es</span>
              </a>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-amber-300 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'es' ? 'Tarifas Oficiales Directas' : 'Guaranteed Direct Rates'}</span>
            </div>

          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 lg:gap-4">
          
          {/* Brand Logo */}
          <button
            onClick={() => handleTabChange('home')}
            className="flex items-center gap-2 sm:gap-2.5 group text-left cursor-pointer shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-base sm:text-lg shadow-md group-hover:scale-105 transition-transform border border-emerald-400">
              🇨🇷
            </div>
            <div className="whitespace-nowrap">
              <div className="text-xs sm:text-base font-black tracking-tight uppercase leading-none text-white flex items-center gap-1">
                <span>Costa Rica</span>
                <span className="text-amber-400">Tours</span>
              </div>
              <span className="text-[8px] sm:text-[9px] tracking-wider uppercase font-bold text-emerald-300 block mt-0.5">
                costaricatours.es
              </span>
            </div>
          </button>

          {/* Desktop Primary Navigation Links (Active on 2xl & xl screens) */}
          <nav className="hidden 2xl:flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => handleTabChange('home')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                currentTab === 'home' 
                  ? 'text-amber-300 bg-emerald-900 font-black border border-amber-400/40 shadow-sm' 
                  : 'text-neutral-200 hover:text-amber-300 hover:bg-emerald-900/40'
              }`}
            >
              {language === 'es' ? 'Inicio' : 'Home'}
            </button>
            
            <button
              onClick={() => handleTabChange('tours')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'tours' 
                  ? 'text-amber-300 bg-emerald-900 font-black border border-amber-400/40 shadow-sm' 
                  : 'text-neutral-200 hover:text-amber-300 hover:bg-emerald-900/40'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'es' ? 'Tours (+20)' : 'Tours (20+)'}</span>
            </button>
            
            <button
              onClick={() => handleTabChange('map')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'map' 
                  ? 'text-amber-300 bg-emerald-900 font-black border border-amber-400/40 shadow-sm' 
                  : 'text-neutral-200 hover:text-amber-300 hover:bg-emerald-900/40'
              }`}
            >
              <Map className="w-3.5 h-3.5 text-teal-400" />
              <span>{language === 'es' ? 'Mapa' : 'Map'}</span>
            </button>

            <button
              onClick={() => handleTabChange('flights')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'flights' 
                  ? 'text-amber-300 bg-emerald-900 font-black border border-amber-400 shadow-md' 
                  : 'text-emerald-200 bg-emerald-950/60 border border-emerald-500/30 hover:border-amber-400/60 hover:text-amber-300'
              }`}
            >
              <Plane className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'es' ? 'Vuelos' : 'Flights'}</span>
              <span className="bg-amber-400 text-emerald-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                Live
              </span>
            </button>

            <button
              onClick={() => handleTabChange('ai')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'ai' 
                  ? 'text-amber-300 bg-emerald-900 font-black border border-amber-400 shadow-md' 
                  : 'text-emerald-200 bg-emerald-950/60 border border-emerald-500/30 hover:border-amber-400/60 hover:text-amber-300'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'es' ? '8 Agentes IA' : '8 AI Agents'}</span>
              <span className="bg-amber-400 text-emerald-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                Smart
              </span>
            </button>

            <button
              onClick={handleOpenItinerary}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'itinerary' 
                  ? 'text-purple-300 bg-purple-950 font-black border border-purple-400 shadow-sm' 
                  : 'text-neutral-200 hover:text-purple-300 hover:bg-purple-950/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{language === 'es' ? 'Itinerario' : 'Itinerary'}</span>
            </button>

            <button
              onClick={() => handleTabChange('tools')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'tools' 
                  ? 'text-amber-300 bg-emerald-900 font-black border border-amber-400/40 shadow-sm' 
                  : 'text-neutral-200 hover:text-amber-300 hover:bg-emerald-900/40'
              }`}
            >
              <Bus className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'es' ? 'Transporte' : 'Transport'}</span>
            </button>

            <button
              onClick={() => handleTabChange('culture')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'culture' 
                  ? 'text-amber-300 bg-emerald-900 font-black border border-amber-400/40 shadow-sm' 
                  : 'text-neutral-200 hover:text-amber-300 hover:bg-emerald-900/40'
              }`}
            >
              <Coffee className="w-3.5 h-3.5 text-amber-300" />
              <span>{language === 'es' ? 'Rincón Tico' : 'Culture'}</span>
            </button>
          </nav>

          {/* Medium Desktop Compact Nav (for xl screens 1280px-1536px) */}
          <nav className="hidden xl:flex 2xl:hidden items-center gap-1 text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => handleTabChange('home')}
              className={`px-2 py-1.5 rounded-lg transition-all ${
                currentTab === 'home' ? 'text-amber-300 bg-emerald-900 font-black' : 'text-neutral-200 hover:text-amber-300'
              }`}
            >
              {language === 'es' ? 'Inicio' : 'Home'}
            </button>
            <button
              onClick={() => handleTabChange('tours')}
              className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                currentTab === 'tours' ? 'text-amber-300 bg-emerald-900 font-black' : 'text-neutral-200 hover:text-amber-300'
              }`}
            >
              <Compass className="w-3 h-3 text-amber-400" />
              <span>Tours</span>
            </button>
            <button
              onClick={() => handleTabChange('map')}
              className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                currentTab === 'map' ? 'text-amber-300 bg-emerald-900 font-black' : 'text-neutral-200 hover:text-amber-300'
              }`}
            >
              <Map className="w-3 h-3 text-teal-400" />
              <span>{language === 'es' ? 'Mapa' : 'Map'}</span>
            </button>
            <button
              onClick={() => handleTabChange('flights')}
              className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                currentTab === 'flights' ? 'text-amber-300 bg-emerald-900 font-black border border-amber-400/60' : 'text-emerald-200 bg-emerald-950/60 hover:text-amber-300'
              }`}
            >
              <Plane className="w-3 h-3 text-amber-400" />
              <span>{language === 'es' ? 'Vuelos' : 'Flights'}</span>
            </button>
            <button
              onClick={() => handleTabChange('ai')}
              className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                currentTab === 'ai' ? 'text-amber-300 bg-emerald-900 font-black border border-amber-400/60' : 'text-emerald-200 bg-emerald-950/60 hover:text-amber-300'
              }`}
            >
              <Bot className="w-3 h-3 text-amber-400" />
              <span>IA</span>
            </button>
            <button
              onClick={handleOpenItinerary}
              className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                currentTab === 'itinerary' ? 'text-purple-300 bg-purple-950 font-black' : 'text-neutral-200 hover:text-purple-300'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>{language === 'es' ? 'Itinerario' : 'Planner'}</span>
            </button>
            <button
              onClick={() => handleTabChange('tools')}
              className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                currentTab === 'tools' ? 'text-amber-300 bg-emerald-900 font-black' : 'text-neutral-200 hover:text-amber-300'
              }`}
            >
              <Bus className="w-3 h-3 text-emerald-400" />
              <span>{language === 'es' ? 'Shuttles' : 'Shuttles'}</span>
            </button>
            <button
              onClick={() => handleTabChange('culture')}
              className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                currentTab === 'culture' ? 'text-amber-300 bg-emerald-900 font-black' : 'text-neutral-200 hover:text-amber-300'
              }`}
            >
              <Coffee className="w-3 h-3 text-amber-300" />
              <span>Tico</span>
            </button>
          </nav>

          {/* Right Action Tools & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Currency Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsCurrencyMenuOpen(!isCurrencyMenuOpen);
                  setIsLangMenuOpen(false);
                }}
                className="flex items-center gap-1 bg-emerald-900/70 hover:bg-emerald-800 px-2 sm:px-2.5 py-1.5 rounded-xl border border-emerald-500/40 text-[11px] font-bold text-white transition-all cursor-pointer"
                title="Seleccionar Moneda / Currency"
              >
                <span className="font-mono text-amber-400 font-black">{currency}</span>
                <ChevronDown className={`w-3 h-3 text-emerald-300 transition-transform ${isCurrencyMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCurrencyMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCurrencyMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-44 max-h-60 overflow-y-auto bg-[#071F12] rounded-2xl shadow-2xl border border-emerald-500/40 z-50 p-1.5 animate-fade-in modal-scrollable">
                    <div className="px-2 py-1 text-[10px] font-black text-emerald-400 uppercase border-b border-emerald-900/80 mb-1">
                      {language === 'es' ? 'Moneda de Pago' : 'Payment Currency'}
                    </div>
                    {CURRENCIES.map((curr) => (
                      <button
                        key={curr}
                        onClick={() => {
                          setCurrency(curr);
                          setIsCurrencyMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${
                          currency === curr
                            ? 'bg-amber-500 text-stone-950 font-black'
                            : 'text-neutral-200 hover:bg-emerald-800/80 hover:text-white'
                        }`}
                      >
                        <span>{curr}</span>
                        {curr === 'USD' && <span className="text-[10px] opacity-70">USD ($)</span>}
                        {curr === 'CRC' && <span className="text-[10px] opacity-70">Colones (₡)</span>}
                        {curr === 'EUR' && <span className="text-[10px] opacity-70">Euros (€)</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsLangMenuOpen(!isLangMenuOpen);
                  setIsCurrencyMenuOpen(false);
                }}
                className="flex items-center gap-1 bg-emerald-900/70 hover:bg-emerald-800 px-2 sm:px-2.5 py-1.5 rounded-xl border border-emerald-500/40 text-[11px] font-bold text-white transition-all cursor-pointer"
                title="Seleccionar Idioma / Language"
              >
                <span className="text-sm leading-none">{currentLangInfo.flag}</span>
                <span className="font-mono text-emerald-200 font-bold uppercase">{currentLangInfo.code}</span>
                <ChevronDown className={`w-3 h-3 text-emerald-300 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-[#071F12] rounded-2xl shadow-2xl border border-emerald-500/40 z-50 p-1.5 animate-fade-in">
                    <div className="px-2 py-1 text-[10px] font-black text-emerald-400 uppercase border-b border-emerald-900/80 mb-1">
                      🌍 Idioma / Language
                    </div>
                    {SUPPORTED_LANGUAGES.map((langItem) => (
                      <button
                        key={langItem.code}
                        onClick={() => handleLanguageSelect(langItem.code)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                          language === langItem.code
                            ? 'bg-amber-500 text-stone-950 font-black'
                            : 'text-neutral-200 hover:bg-emerald-800/80 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">{langItem.flag}</span>
                          <span>{langItem.nativeName}</span>
                        </span>
                        <span className="text-[10px] font-mono opacity-70 uppercase">
                          {langItem.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Custom Trip Funnel CTA (Compact & adaptive) */}
            {onOpenCustomFunnel && (
              <button
                onClick={onOpenCustomFunnel}
                className="hidden lg:inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 px-2.5 sm:px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-tight shadow-md hover:scale-105 transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{language === 'es' ? 'Armar Viaje' : 'Custom Trip'}</span>
              </button>
            )}

            {/* My Bookings Button */}
            <button
              onClick={handleOpenBookings}
              className="relative flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs border border-emerald-500/40 transition-all hover:scale-105 cursor-pointer shadow-sm shrink-0"
              aria-label={language === 'es' ? 'Ver mis reservas' : 'View my bookings'}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline text-[11px] font-black uppercase whitespace-nowrap">
                {language === 'es' ? 'Reservas' : 'Bookings'}
              </span>
              {count > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-black text-[10px] flex items-center justify-center border-2 border-emerald-950 shadow-sm animate-pulse">
                  {count}
                </span>
              )}
            </button>

            {/* Google User Profile / Sign-in */}
            {user ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`} 
                  alt="Avatar" 
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover border border-amber-400/50" 
                  title={user.displayName || user.email || ''}
                />
                <button 
                  onClick={signOut} 
                  className="text-neutral-400 hover:text-red-400 transition-colors p-1" 
                  title={language === 'es' ? 'Cerrar Sesión' : 'Sign Out'}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="hidden xl:flex items-center gap-1 text-[11px] font-bold bg-emerald-950 hover:bg-emerald-900 text-neutral-200 px-2.5 py-1.5 rounded-xl border border-emerald-600/30 transition-colors shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('signIn')}</span>
              </button>
            )}

            {/* Mobile / Tablet Drawer Hamburger Button (Visible on screens < 1280px) */}
            <button
              onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
              className="xl:hidden p-2 rounded-xl bg-emerald-900/90 hover:bg-emerald-800 text-white border border-emerald-500/40 transition-colors cursor-pointer shrink-0"
              aria-label="Abrir Menú"
            >
              {isMobileDrawerOpen ? <X className="w-4 h-4 text-amber-400" /> : <Menu className="w-4 h-4 text-white" />}
            </button>

          </div>
        </div>

        {/* Practical Mobile & Tablet Navigation Drawer */}
        {isMobileDrawerOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] xl:hidden"
              onClick={() => setIsMobileDrawerOpen(false)}
            />
            
            <div className="fixed top-[95px] left-2 right-2 sm:left-4 sm:right-4 max-h-[82vh] bg-[#071C10] border border-emerald-500/40 rounded-3xl z-[100] shadow-2xl p-4 sm:p-5 overflow-y-auto xl:hidden space-y-4 animate-fade-in modal-scrollable">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
                    🇨🇷
                  </div>
                  <div>
                    <span className="text-xs font-black text-white uppercase tracking-wider block">
                      Costa Rica <span className="text-amber-400">Tours</span>
                    </span>
                    <span className="text-[8px] text-emerald-300 font-bold uppercase tracking-widest">
                      Agencia Receptiva Oficial
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {user ? (
                    <div className="flex items-center gap-1.5 bg-emerald-950 px-2 py-1 rounded-xl border border-emerald-800">
                      <img 
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`} 
                        alt="Avatar" 
                        className="w-5 h-5 rounded-full" 
                      />
                      <button onClick={signOut} className="text-red-400 text-xs font-bold ml-1">
                        Salir
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        signInWithGoogle();
                        setIsMobileDrawerOpen(false);
                      }}
                      className="flex items-center gap-1 text-[10px] font-black bg-emerald-900 text-amber-300 px-2.5 py-1 rounded-xl border border-amber-400/30 uppercase"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>{t('signIn')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-1.5 rounded-xl bg-emerald-950 text-emerald-300 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Trip Builder & Bookings Action Bar in Drawer */}
              <div className="grid grid-cols-2 gap-2">
                {onOpenCustomFunnel && (
                  <button
                    onClick={() => {
                      onOpenCustomFunnel();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 p-2.5 rounded-2xl font-black text-xs uppercase shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{language === 'es' ? 'Armar Viaje' : 'Custom Trip'}</span>
                  </button>
                )}

                <button
                  onClick={handleOpenBookings}
                  className="flex items-center justify-center gap-1.5 bg-emerald-800 text-white p-2.5 rounded-2xl font-black text-xs uppercase border border-emerald-600/50"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'es' ? 'Mis Reservas' : 'My Bookings'}</span>
                  {count > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 font-black text-[9px] flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </button>
              </div>

              {/* Section 1: Tours & Destinos */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-black tracking-widest text-emerald-400 px-1 block">
                  {language === 'es' ? 'Experiencias & Destinos' : 'Experiences & Destinations'}
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTabChange('home')}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-colors text-left ${
                      currentTab === 'home' ? 'bg-amber-500 text-stone-950 font-black' : 'bg-emerald-900/40 text-neutral-100 hover:bg-emerald-900/80 border border-emerald-800/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🏠</span>
                      <span className="text-xs font-bold">{language === 'es' ? 'Inicio' : 'Home'}</span>
                    </span>
                    <span className="text-[9px] uppercase opacity-70">{language === 'es' ? 'Principal' : 'Main'}</span>
                  </button>

                  <button
                    onClick={() => handleTabChange('tours')}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-colors text-left ${
                      currentTab === 'tours' ? 'bg-amber-500 text-stone-950 font-black' : 'bg-emerald-900/40 text-neutral-100 hover:bg-emerald-900/80 border border-emerald-800/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold">{t('toursAndAdventures')}</span>
                    </span>
                    <span className="text-[9px] uppercase bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full font-black border border-amber-400/30">
                      +20 Tours
                    </span>
                  </button>

                  <button
                    onClick={() => handleTabChange('map')}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-colors text-left ${
                      currentTab === 'map' ? 'bg-amber-500 text-stone-950 font-black' : 'bg-emerald-900/40 text-neutral-100 hover:bg-emerald-900/80 border border-emerald-800/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Map className="w-4 h-4 text-teal-400" />
                      <span className="text-xs font-bold">{t('interactiveMap')}</span>
                    </span>
                    <span className="text-[9px] uppercase opacity-70">{language === 'es' ? 'Por Regiones' : 'By Region'}</span>
                  </button>

                  <button
                    onClick={() => handleTabChange('culture')}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-colors text-left ${
                      currentTab === 'culture' ? 'bg-amber-500 text-stone-950 font-black' : 'bg-emerald-900/40 text-neutral-100 hover:bg-emerald-900/80 border border-emerald-800/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-amber-300" />
                      <span className="text-xs font-bold">{language === 'es' ? 'Rincón Tico (Cultura)' : 'Tico Culture & Slang'}</span>
                    </span>
                    <span className="text-[9px] uppercase opacity-70">100% Tico</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Inteligencia Artificial & Planificación */}
              <div className="space-y-1.5 pt-2 border-t border-emerald-900/60">
                <span className="text-[9px] uppercase font-black tracking-widest text-amber-400 px-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {language === 'es' ? 'Inteligencia Artificial Especializada' : 'Specialized Artificial Intelligence'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTabChange('ai')}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-colors text-left border ${
                      currentTab === 'ai' 
                        ? 'bg-amber-500 text-stone-950 font-black border-amber-300 shadow-md' 
                        : 'bg-emerald-950/80 border-amber-500/30 text-amber-200 hover:bg-emerald-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold">{language === 'es' ? '8 Agentes IA Especializados' : '8 Specialized AI Agents'}</span>
                    </span>
                    <span className="text-[9px] uppercase bg-amber-400 text-emerald-950 px-2 py-0.5 rounded-full font-black">
                      8 Flujos
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      handleOpenItinerary();
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-colors text-left border ${
                      currentTab === 'itinerary'
                        ? 'bg-purple-600 text-white font-black border-purple-300'
                        : 'bg-purple-950/60 border-purple-500/40 text-purple-200 hover:bg-purple-900/80'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-300" />
                      <span className="text-xs font-bold">{t('aiPlanner')}</span>
                    </span>
                    <span className="text-[9px] uppercase bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded-full font-bold">
                      Gratis
                    </span>
                  </button>
                </div>
              </div>

              {/* Section 3: Movilidad & Logística */}
              <div className="space-y-1.5 pt-2 border-t border-emerald-900/60">
                <span className="text-[9px] uppercase font-black tracking-widest text-emerald-400 px-1 block">
                  {language === 'es' ? 'Transporte & Movilidad' : 'Transport & Logistics'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleTabChange('flights')}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-colors text-left border ${
                      currentTab === 'flights' ? 'bg-amber-500 text-stone-950 font-black border-amber-300' : 'bg-emerald-900/40 text-neutral-100 hover:bg-emerald-900/80 border-emerald-800/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold">{language === 'es' ? 'Vuelos a Costa Rica' : 'Flights to CR'}</span>
                    </span>
                    <span className="text-[9px] uppercase bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full font-black">
                      Live
                    </span>
                  </button>

                  <button
                    onClick={() => handleTabChange('tools')}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-colors text-left ${
                      currentTab === 'tools' ? 'bg-amber-500 text-stone-950 font-black' : 'bg-emerald-900/40 text-neutral-100 hover:bg-emerald-900/80 border border-emerald-800/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Bus className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold">{language === 'es' ? 'Shuttles & Guía' : 'Shuttles & Guide'}</span>
                    </span>
                    <span className="text-[9px] uppercase opacity-70">SINAC / 4x4</span>
                  </button>

                  {onOpenLocalBuses && (
                    <button
                      onClick={() => {
                        onOpenLocalBuses();
                        setIsMobileDrawerOpen(false);
                      }}
                      className="flex items-center justify-between p-3 rounded-2xl bg-emerald-900/30 text-emerald-200 hover:bg-emerald-900/80 transition-colors text-left border border-emerald-800/40"
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#E67E22]" />
                        <span className="text-xs font-bold">{t('localBuses')}</span>
                      </span>
                      <span className="text-[9px] uppercase opacity-70">Rutas</span>
                    </button>
                  )}
                </div>
              </div>

              {/* WhatsApp Support in Drawer */}
              <div className="pt-3 border-t border-emerald-900/80 space-y-2">
                <a
                  href="https://wa.me/50687959148?text=Hola%20Costa%20Rica%20Tours%20(costaricatours.es),%20quisiera%20ayuda%20para%20reservar."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] p-3 rounded-2xl font-black text-xs uppercase border border-[#25D366]/40 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp 24/7: +506 8795-9148</span>
                </a>
              </div>

            </div>
          </>
        )}

      </header>

      {/* Currency Change Modal */}
      {currencyPrompt?.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0B2516] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-fade-in border border-emerald-500/40 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-black uppercase text-white">
                {t('suggestCurrencyChangeTitle')}
              </h3>
            </div>
            
            <p className="text-sm text-emerald-200/90 mb-6 font-medium leading-relaxed">
              {t('suggestCurrencyChangeDesc')} <strong className="font-black text-amber-400 text-base">{currencyPrompt.suggestedCurrency}</strong>?
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={declineCurrencyChange}
                className="flex-1 px-4 py-3 rounded-xl font-bold uppercase text-xs text-neutral-300 bg-emerald-950 hover:bg-emerald-900 transition-colors border border-emerald-700/50 cursor-pointer"
              >
                {t('noKeepCurrent')}
              </button>
              <button 
                onClick={acceptCurrencyChange}
                className="flex-1 px-4 py-3 rounded-xl font-black uppercase text-xs text-stone-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {t('yesChangeIt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
