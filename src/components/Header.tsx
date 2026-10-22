import React, { useState, useEffect, useRef, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Globe,
  Sparkles,
  ChevronDown,
  MessageCircle,
  LogIn,
  LogOut,
  Bus,
  Compass,
  Map,
  MapPin,
  Coffee,
  Bot,
  Clock,
  ShieldCheck,
  Plane,
  Palette,
  Home,
  Heart,
  Mail,
  User as UserIcon,
  FileText,
  Check
} from 'lucide-react';
import { Language, Currency } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { SUPPORTED_LANGUAGES, UI_TRANSLATIONS } from '../utils/i18n';
import { useAvailableCurrencies } from '../hooks/useMoney';
import { auth, signInWithGoogle, signOut } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { requestCustomerIntake } from '../utils/customerIntake';

type HeaderTab = 'home' | 'tours' | 'map' | 'culture' | 'ai' | 'itinerary' | 'bookings' | 'tools' | 'flights' | 'workspace' | 'destinations' | 'activities' | 'about' | 'blog';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  activeTab?: HeaderTab | 'admin';
  setActiveTab?: (tab: HeaderTab) => void;
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

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

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
  const navigate = useNavigate();
  const es = language === 'es';
  const availableCurrencyList = useAvailableCurrencies();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelId = useId();
  const menuTitleId = useId();

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
      default: return 'USD';
    }
  };

  const handleLanguageSelect = (langCode: Language) => {
    if (langCode === language) return;
    const suggested = getSuggestedCurrency(langCode);
    setLanguage(langCode);
    if (suggested !== currency) {
      setIsMenuOpen(false);
      setCurrencyPrompt({ isOpen: true, targetLang: langCode, suggestedCurrency: suggested });
    }
  };

  const acceptCurrencyChange = () => {
    if (currencyPrompt) {
      setCurrency(currencyPrompt.suggestedCurrency);
      setCurrencyPrompt(null);
    }
  };

  const declineCurrencyChange = () => setCurrencyPrompt(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 25);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close the compact menu on outside click and on Escape (focus returns to its button).
  useEffect(() => {
    if (!isMenuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    const firstFocusable = document.getElementById(menuPanelId)?.querySelector<HTMLElement>('button, a, select');
    firstFocusable?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen, menuPanelId]);

  const t = (key: string) => UI_TRANSLATIONS[key]?.[language] || UI_TRANSLATIONS[key]?.['es'] || key;
  const currentTab = activeTab || activeSection || 'home';
  const count = bookingsCount !== undefined ? bookingsCount : (cartCount || 0);

  const closeMenu = () => setIsMenuOpen(false);

  const go = (path: string) => {
    navigate(path);
    closeMenu();
  };

  const handleOpenBookings = () => {
    if (onOpenBookingList) onOpenBookingList();
    else if (onOpenCart) onOpenCart();
    closeMenu();
  };

  const handleOpenItinerary = () => {
    if (setActiveTab) setActiveTab('itinerary');
    if (setActiveSection) setActiveSection('itinerary');
    if (onOpenItineraryPlanner) onOpenItineraryPlanner();
    else if (onOpenCustomFunnel) onOpenCustomFunnel();
    closeMenu();
  };

  const handleQuote = () => {
    closeMenu();
    if (onOpenCustomFunnel) {
      onOpenCustomFunnel();
      return;
    }
    requestCustomerIntake({
      message: es
        ? 'Quisiera una cotización para tours en Costa Rica, con disponibilidad y precio verificados.'
        : 'I would like a quote for Costa Rica tours, with verified availability and pricing.',
      language, source: 'header:quote'
    });
  };

  const primaryNav = [
    { id: 'tours', to: '/tours', label: 'Tours', icon: Compass, match: ['tours', 'tour'] },
    { id: 'destinations', to: '/destinations', label: es ? 'Destinos' : 'Destinations', icon: MapPin, match: ['destinations'] },
    { id: 'map', to: '/map', label: es ? 'Mapa' : 'Map', icon: Map, match: ['map'] },
    { id: 'ai', to: '/ai', label: es ? 'Asistente' : 'Assistant', icon: Bot, match: ['ai'] },
  ];

  const moreNav = [
    { id: 'home', to: '/', label: es ? 'Inicio' : 'Home', icon: Home },
    { id: 'activities', to: '/activities', label: es ? 'Actividades' : 'Activities', icon: Palette },
    { id: 'blog', to: '/blog', label: 'Blog', icon: Mail },
    { id: 'culture', to: '/culture', label: es ? 'Cultura tica' : 'Tico culture', icon: Coffee },
    { id: 'flights', to: '/flights', label: es ? 'Vuelos' : 'Flights', icon: Plane },
    { id: 'tools', to: '/tools', label: es ? 'Shuttles y guía' : 'Shuttles & guide', icon: Bus },
  ];

  const isActive = (match: string[]) => match.includes(String(currentTab));

  const menuItemClass = `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-stone-100 hover:bg-white/5 transition-colors text-left cursor-pointer ${focusRing}`;
  const sectionLabelClass = 'px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400/90';

  const avatarUrl = user ? (user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`) : '';

  return (
    <>
      <header id="main-header" className={`sticky top-0 z-[70] w-full max-w-full bg-[#031710]/90 backdrop-blur-xl border-b border-white/10 text-white transition-shadow duration-300 ${isScrolled ? 'shadow-lg shadow-black/30' : ''}`}>

        {/* Slim utility bar: one trust line + AI inquiry. Collapses on scroll. */}
        <div className={`bg-[#010e08]/80 border-b border-white/5 text-stone-300 transition-all duration-300 overflow-hidden ${
          isScrolled ? 'max-h-0 opacity-0 border-b-0 pointer-events-none' : 'max-h-10 opacity-100'
        }`}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1 flex items-center justify-between gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{es ? 'Cupo y precio se confirman antes de pagar' : 'Availability and price confirmed before payment'}</span>
            </span>
            <button
              type="button"
              onClick={() => requestCustomerIntake({
                message: es
                  ? 'Quisiera consultar sobre tours y traslados en Costa Rica. ¿Qué opciones pueden verificar para mi viaje?'
                  : 'I would like to ask about Costa Rica tours and transfers. What options can you verify for my trip?',
                language, source: 'header:assistance'
              })}
              className={`hidden sm:inline-flex items-center gap-1.5 shrink-0 text-stone-300 hover:text-emerald-300 font-medium transition-colors rounded ${focusRing}`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" aria-hidden="true" />
              <span>{es ? 'Consulta por IA → WhatsApp' : 'AI inquiry → WhatsApp'}</span>
            </button>
          </div>
        </div>

        {/* Main bar */}
        <div className={`w-full max-w-7xl min-w-0 mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 lg:gap-6 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-2.5'}`}>

          <Link to="/" aria-label={es ? 'Costa Rica Tours, inicio' : 'Costa Rica Tours, home'} className={`flex items-center gap-2 group shrink-0 rounded-xl ${focusRing}`}>
            <span className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-900/30 group-hover:scale-105 transition-transform" aria-hidden="true">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-stone-950" />
            </span>
            <span className="whitespace-nowrap leading-tight">
              <span className="block text-[15px] sm:text-xl font-extrabold tracking-tight text-white">
                Costa Rica <span className="text-amber-400">Tours</span>
              </span>
              <span className="hidden sm:block text-[10px] tracking-wider uppercase font-semibold text-emerald-400">
                {es ? 'Tours y planificación' : 'Tours & trip planning'}
              </span>
            </span>
          </Link>

          {/* Primary navigation (tablet and up; on phones it lives in the menu and the bottom bar). */}
          <nav aria-label={es ? 'Navegación principal' : 'Main navigation'} className="hidden md:flex items-center gap-1 min-w-0">
            {primaryNav.map(({ id, to, label, icon: Icon, match }) => {
              const active = isActive(match);
              return (
                <Link
                  key={id}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={`relative inline-flex items-center gap-1.5 px-3 lg:px-3.5 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${focusRing} ${
                    active ? 'bg-white/10 text-white' : 'text-stone-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${id === 'ai' ? 'text-amber-400' : active ? 'text-emerald-300' : 'text-stone-400'}`} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={handleQuote}
              className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 font-extrabold text-sm px-3.5 sm:px-4 py-2 shadow-md shadow-orange-900/30 transition-colors whitespace-nowrap ${focusRing}`}
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              <span>{es ? 'Cotizar' : 'Get a quote'}</span>
            </button>

            {/* Compact account menu, available at every width. */}
            <div className="relative">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setIsMenuOpen(open => !open)}
                aria-expanded={isMenuOpen}
                aria-controls={menuPanelId}
                aria-haspopup="dialog"
                aria-label={es
                  ? `Menú de cuenta y preferencias${count > 0 ? `, ${count} reservas` : ''}`
                  : `Account and preferences menu${count > 0 ? `, ${count} bookings` : ''}`}
                className={`relative flex items-center gap-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 pl-1 pr-1.5 sm:pr-2 py-1 transition-colors ${focusRing}`}
              >
                {user ? (
                  <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-emerald-900/80 flex items-center justify-center" aria-hidden="true">
                    <UserIcon className="w-4 h-4 text-emerald-200" />
                  </span>
                )}
                <span className="hidden sm:inline font-mono text-[11px] font-bold text-stone-300" aria-hidden="true">
                  {language.toUpperCase()} · {currency}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-stone-950 font-black text-[10px] flex items-center justify-center border-2 border-[#031710]" aria-hidden="true">
                    {count}
                  </span>
                )}
              </button>

              {isMenuOpen && (
                <div
                  id={menuPanelId}
                  role="dialog"
                  aria-modal="false"
                  aria-labelledby={menuTitleId}
                  className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-5.5rem)] overflow-y-auto modal-scrollable rounded-2xl border border-white/10 bg-[#061f17] shadow-2xl shadow-black/50 p-2 z-[100] text-white animate-fade-in"
                >
                  <h2 id={menuTitleId} className="sr-only">{es ? 'Cuenta y preferencias' : 'Account and preferences'}</h2>

                  {/* Account */}
                  {user ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
                      <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{user.displayName || (es ? 'Mi cuenta' : 'My account')}</p>
                        {user.email && <p className="text-[11px] text-stone-400 truncate">{user.email}</p>}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { closeMenu(); signInWithGoogle(); }}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-sm font-extrabold transition-colors ${focusRing}`}
                    >
                      <LogIn className="w-4 h-4" aria-hidden="true" />
                      <span>{t('signIn')}</span>
                    </button>
                  )}

                  {/* Primary navigation for phones */}
                  <div className="md:hidden">
                    <p className={sectionLabelClass}>{es ? 'Explorar' : 'Explore'}</p>
                    {primaryNav.map(({ id, to, label, icon: Icon, match }) => (
                      <Link key={id} to={to} onClick={closeMenu} aria-current={isActive(match) ? 'page' : undefined} className={`${menuItemClass} ${isActive(match) ? 'bg-white/10' : ''}`}>
                        <Icon className="w-4 h-4 text-emerald-300" aria-hidden="true" />
                        <span>{label}</span>
                      </Link>
                    ))}
                  </div>

                  {/* My trip */}
                  <p className={sectionLabelClass}>{es ? 'Mi viaje' : 'My trip'}</p>
                  <button type="button" onClick={handleOpenBookings} className={menuItemClass}>
                    <ShoppingBag className="w-4 h-4 text-orange-400" aria-hidden="true" />
                    <span className="flex-1">{t('myBookings')}</span>
                    {count > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-stone-950 text-[11px] font-black flex items-center justify-center">{count}</span>}
                  </button>
                  <button type="button" onClick={() => go('/tours?favorites=1')} className={menuItemClass}>
                    <Heart className="w-4 h-4 text-rose-400" aria-hidden="true" />
                    <span>{es ? 'Favoritos' : 'Favorites'}</span>
                  </button>
                  <button type="button" onClick={handleOpenItinerary} className={menuItemClass}>
                    <Sparkles className="w-4 h-4 text-amber-300" aria-hidden="true" />
                    <span>{es ? 'Armar mi viaje' : 'Build my trip'}</span>
                  </button>

                  {/* Preferences */}
                  <p className={sectionLabelClass}>{es ? 'Preferencias' : 'Preferences'}</p>
                  <div className="px-3 py-1.5">
                    <p id={`${menuPanelId}-lang`} className="flex items-center gap-1.5 text-xs font-semibold text-stone-300 mb-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                      {es ? 'Idioma' : 'Language'}
                    </p>
                    <div role="group" aria-labelledby={`${menuPanelId}-lang`} className="grid grid-cols-2 gap-1.5">
                      {SUPPORTED_LANGUAGES.map(item => {
                        const selected = item.code === language;
                        return (
                          <button
                            key={item.code}
                            type="button"
                            lang={item.code}
                            aria-pressed={selected}
                            onClick={() => handleLanguageSelect(item.code)}
                            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold border transition-colors ${focusRing} ${
                              selected ? 'bg-emerald-500 text-stone-950 border-emerald-400' : 'bg-white/5 text-stone-200 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                            <span>{item.nativeName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="block px-3 py-1.5 text-xs font-semibold text-stone-300">
                    <span className="block mb-1.5">{es ? 'Moneda' : 'Currency'}</span>
                    <select
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value as Currency)}
                      className={`w-full rounded-lg border border-white/10 bg-[#03140d] px-2.5 py-2 text-sm text-white ${focusRing}`}
                    >
                      {(availableCurrencyList.includes(currency) ? availableCurrencyList : [...availableCurrencyList, currency]).map(item => <option key={item} value={item} disabled={!availableCurrencyList.includes(item)}>{item}{availableCurrencyList.includes(item) ? '' : (es ? ' (sin tasa)' : ' (no rate)')}</option>)}
                    </select>
                  </label>

                  {/* More */}
                  <p className={sectionLabelClass}>{es ? 'Más' : 'More'}</p>
                  {moreNav.map(({ id, to, label, icon: Icon }) => (
                    <Link key={id} to={to} onClick={closeMenu} aria-current={currentTab === id ? 'page' : undefined} className={menuItemClass}>
                      <Icon className="w-4 h-4 text-stone-400" aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  ))}
                  {onOpenLocalBuses && (
                    <button type="button" onClick={() => { closeMenu(); onOpenLocalBuses(); }} className={menuItemClass}>
                      <Clock className="w-4 h-4 text-stone-400" aria-hidden="true" />
                      <span>{t('localBuses')}</span>
                    </button>
                  )}
                  <div className="px-3 py-2">
                    <PWAInstallButton language={language} />
                  </div>

                  {user && (
                    <div className="border-t border-white/10 mt-1 pt-1">
                      <button type="button" onClick={() => { closeMenu(); signOut(); }} className={`${menuItemClass} text-rose-300`}>
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        <span>{es ? 'Cerrar sesión' : 'Sign out'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Currency Change Modal */}
      {currencyPrompt?.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="currency-prompt-title">
          <div className="bg-[#07241a] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-fade-in border border-emerald-500/40 text-stone-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 text-amber-400" aria-hidden="true" />
              </div>
              <h3 id="currency-prompt-title" className="text-lg sm:text-xl font-black uppercase text-white">
                {t('suggestCurrencyChangeTitle')}
              </h3>
            </div>

            <p className="text-sm text-stone-200 mb-6 font-medium leading-relaxed">
              {t('suggestCurrencyChangeDesc')} <strong className="font-black text-amber-400 text-base">{currencyPrompt.suggestedCurrency}</strong>?
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={declineCurrencyChange}
                className={`flex-1 px-4 py-3 rounded-xl font-bold uppercase text-xs text-stone-300 bg-emerald-950/80 hover:bg-emerald-900 transition-colors border border-emerald-500/30 cursor-pointer ${focusRing}`}
              >
                {t('noKeepCurrent')}
              </button>
              <button
                type="button"
                autoFocus
                onClick={acceptCurrencyChange}
                className={`flex-1 px-4 py-3 rounded-xl font-black uppercase text-xs text-stone-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer ${focusRing}`}
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
