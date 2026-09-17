import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tour, TourCategory, TourRegion, Language, Currency } from '../types';
import { TourCard } from './TourCard';
import { LazyImage } from './LazyImage';
import { TourComparisonModal } from './TourComparisonModal';
import { REGIONS } from '../data/toursData';
import { formatCurrency, getLangText } from '../utils/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, Search, Filter, SlidersHorizontal, Sparkles, LayoutGrid, List, 
  Map, Heart, Scale, X, Flame, Leaf, Check, RotateCcw, ArrowUpDown, ArrowLeft, Mic, MicOff, Loader2,
  MapPin, ChevronDown, CheckCircle2, Clock, Star, Zap
} from 'lucide-react';

interface ToursGridProps {
  tours: Tour[];
  language: Language;
  currency: Currency;
  selectedCategory: TourCategory | 'all';
  setSelectedCategory: (cat: TourCategory | 'all') => void;
  selectedRegion: TourRegion | 'all';
  setSelectedRegion: (reg: TourRegion | 'all') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  difficultyFilter: 'all' | 'fácil' | 'moderado' | 'exigente';
  setDifficultyFilter: (diff: 'all' | 'fácil' | 'moderado' | 'exigente') => void;
  maxPrice: number;
  setMaxPrice: (price: number) => void;
  onSelectTour?: (tour: Tour) => void;
  onBack?: () => void;
  onOpenMap?: () => void;
}

export const ToursGrid: React.FC<ToursGridProps> = ({
  tours,
  language,
  currency,
  selectedCategory,
  setSelectedCategory,
  selectedRegion,
  setSelectedRegion,
  searchQuery,
  setSearchQuery,
  difficultyFilter,
  setDifficultyFilter,
  maxPrice,
  setMaxPrice,
  onOpenMap,
  onBack,
}) => {
  const navigate = useNavigate();
  // Local Catalog State
  const [currentPage, setCurrentPage] = useState(1);
  const [isListening, setIsListening] = useState(false);

  // Voice Search Handler
  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(language === 'es' ? 'Tu navegador no soporta búsqueda por voz. Usa Chrome.' : 'Browser does not support voice search. Use Chrome.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'es' ? 'es-CR' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'price_asc' | 'price_desc' | 'duration'>('popular');
  const [bestsellerOnly, setBestsellerOnly] = useState(false);
  const [ecoFriendlyOnly, setEcoFriendlyOnly] = useState(false);
  const [freeCancellationOnly, setFreeCancellationOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isFiltersDrawerOpen, setIsFiltersDrawerOpen] = useState(false);

  // Real-Time Reactive Sliders State ("Update Everything as Sliders Move")
  const [maxDurationHours, setMaxDurationHours] = useState<number>(14);
  const [minRating, setMinRating] = useState<number>(0);
  const [showLiveSliders, setShowLiveSliders] = useState<boolean>(false);
  const [isSliding, setIsSliding] = useState<boolean>(false);

  // Favorites / Wishlist LocalStorage Sync
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedRegion, searchQuery, difficultyFilter, maxPrice, maxDurationHours, minRating, sortBy, bestsellerOnly, ecoFriendlyOnly, freeCancellationOnly]);

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('costa_rica_favorite_tours');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('costa_rica_favorite_tours', JSON.stringify(favorites));
    } catch (e) {
      console.error(e);
    }
  }, [favorites]);

  const toggleFavorite = (tourId: string) => {
    setFavorites(prev => 
      prev.includes(tourId) ? prev.filter(id => id !== tourId) : [...prev, tourId]
    );
  };

  // Compare Dock State
  const [comparedTours, setComparedTours] = useState<Tour[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const toggleCompare = (tour: Tour) => {
    setComparedTours(prev => {
      const exists = prev.some(t => t.id === tour.id);
      if (exists) {
        return prev.filter(t => t.id !== tour.id);
      }
      if (prev.length >= 3) {
        alert(language === 'es' ? 'Puedes comparar un máximo de 3 tours a la vez.' : 'You can compare up to 3 tours at a time.');
        return prev;
      }
      return [...prev, tour];
    });
  };

  const removeComparedTour = (tourId: string) => {
    setComparedTours(prev => prev.filter(t => t.id !== tourId));
  };

  // Apply All Filtering & Sorting
  let processedTours = tours.filter(tour => {
    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = getLangText(tour.title, language).toLowerCase();
      const desc = getLangText(tour.description, language).toLowerCase();
      const place = tour.location.placeName.toLowerCase();
      if (!title.includes(q) && !desc.includes(q) && !place.includes(q)) return false;
    }

    // Category Filter
    if (selectedCategory !== 'all' && tour.category !== selectedCategory) return false;

    // Region Filter
    if (selectedRegion !== 'all' && tour.region !== selectedRegion) return false;

    // Difficulty Filter
    if (difficultyFilter !== 'all' && tour.difficulty !== difficultyFilter) return false;

    // Price Filter
    if (tour.priceUSD > maxPrice) return false;

    // Real-Time Duration Filter
    if (maxDurationHours < 14 && tour.durationHours > maxDurationHours) return false;

    // Real-Time Rating Filter
    if (minRating > 0 && tour.rating < minRating) return false;

    // Bestseller Toggle
    if (bestsellerOnly && !tour.bestseller) return false;

    // Eco-Friendly Toggle
    if (ecoFriendlyOnly) {
        const isEco = ['wildlife', 'canopy', 'rafting'].includes(tour.category) || (tour.description.es && tour.description.es.toLowerCase().includes('reserva'));
        if (!isEco) return false;
    }

    // Free Cancellation Toggle
    if (freeCancellationOnly && !tour.freeCancellation) return false;

    // Favorites Only Toggle
    if (favoritesOnly && !favorites.includes(tour.id)) return false;

    return true;
  });

  // Sorting Logic
  processedTours.sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'price_asc') return a.priceUSD - b.priceUSD;
    if (sortBy === 'price_desc') return b.priceUSD - a.priceUSD;
    if (sortBy === 'duration') return b.durationHours - a.durationHours;
    // 'popular' default sort
    return (b.reviewsCount * b.rating) - (a.reviewsCount * a.rating);
  });

  // Count active filters
  const activeFiltersCount = 
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedRegion !== 'all' ? 1 : 0) +
    (difficultyFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0) +
    (maxPrice < 200 ? 1 : 0) +
    (maxDurationHours < 14 ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (bestsellerOnly ? 1 : 0) +
    (ecoFriendlyOnly ? 1 : 0) +
    (favoritesOnly ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSelectedRegion('all');
    setDifficultyFilter('all');
    setSearchQuery('');
    setMaxPrice(200);
    setMaxDurationHours(14);
    setMinRating(0);
    setBestsellerOnly(false);
    setEcoFriendlyOnly(false);
    setFavoritesOnly(false);
  };

  return (
    <div className="space-y-6">
      {/* Modern Compact Search & Filter Island (Slim, Non-Intrusive, No Screen Obstruction) */}
      <div className="bg-[#051c14]/90 backdrop-blur-xl p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-emerald-500/25 shadow-xl space-y-3 text-stone-100 transition-all">
        
        {/* Main Search & Quick Command Bar */}
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          
          {/* Search Input with Voice Search and Quick Clear */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'es'
                  ? 'Buscar volcanes, playas, perezosos, rafting...'
                  : 'Search volcanoes, beaches, sloths, rafting...'
              }
              className="w-full bg-emerald-950/60 text-white text-xs sm:text-sm pl-10 pr-18 py-2.5 rounded-full border border-emerald-500/30 focus:outline-none focus:border-amber-400 focus:bg-emerald-950/90 transition-all placeholder:text-emerald-300/40 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white p-1"
                aria-label={language === 'es' ? 'Borrar búsqueda' : 'Clear search'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={startVoiceSearch}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                isListening 
                  ? 'bg-amber-400/20 text-amber-400 animate-pulse' 
                  : 'text-emerald-300/70 hover:text-amber-400 hover:bg-emerald-900/60'
              }`}
              title={language === 'es' ? 'Búsqueda por voz' : 'Voice Search'}
            >
              {isListening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Quick Action Capsules (Region, Filters Drawer Trigger, Sort, View Modes) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap shrink-0">
            
            {/* Region Selector Capsule */}
            <div className="relative">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value as any)}
                className="bg-emerald-950/70 hover:bg-emerald-900/80 text-stone-100 text-xs font-bold pl-7 pr-4 py-2 rounded-full border border-emerald-500/30 focus:outline-none focus:border-amber-400 cursor-pointer appearance-none transition-colors"
                aria-label={language === 'es' ? 'Filtrar por región' : 'Filter by region'}
              >
                <option value="all">📍 {language === 'es' ? 'Todas las Regiones' : 'All Regions'}</option>
                {REGIONS.map(reg => (
                  <option key={reg.id} value={reg.id}>
                    📍 {getLangText(reg.name, language).split('/')[0]}
                  </option>
                ))}
              </select>
              <MapPin className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Real-time Sliders Quick Toggle */}
            <button
              type="button"
              id="toggle-realtime-sliders-btn"
              onClick={() => setShowLiveSliders(!showLiveSliders)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                showLiveSliders || maxPrice < 200 || maxDurationHours < 14 || minRating > 0
                  ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200/90 border-emerald-500/30'
              }`}
              title={language === 'es' ? 'Controles deslizantes en tiempo real (precio, horas, rating)' : 'Real-time interactive sliders'}
            >
              <Zap className={`w-3.5 h-3.5 ${isSliding ? 'animate-bounce text-stone-950' : ''}`} />
              <span>{language === 'es' ? 'Sliders en Vivo' : 'Live Sliders'}</span>
              {(maxPrice < 200 || maxDurationHours < 14 || minRating > 0) && (
                <span className="w-2 h-2 rounded-full bg-emerald-950 animate-pulse"></span>
              )}
            </button>

            {/* Dedicated Filters Drawer Button */}
            <button
              type="button"
              onClick={() => setIsFiltersDrawerOpen(true)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                activeFiltersCount > 0
                  ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-100 hover:text-white border-emerald-500/30'
              }`}
              title={language === 'es' ? 'Abrir filtros y preferencias' : 'Open filters and preferences'}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Filtros' : 'Filters'}</span>
              {activeFiltersCount > 0 && (
                <span className="bg-stone-950 text-amber-400 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-emerald-950/70 hover:bg-emerald-900/80 text-stone-100 text-xs font-bold pl-7 pr-3 py-2 rounded-full border border-emerald-500/30 focus:outline-none focus:border-amber-400 cursor-pointer appearance-none transition-colors"
                aria-label={language === 'es' ? 'Ordenar tours' : 'Sort tours'}
              >
                <option value="popular">🔥 {language === 'es' ? 'Populares' : 'Popular'}</option>
                <option value="rating">⭐ {language === 'es' ? 'Calificación' : 'Top Rated'}</option>
                <option value="price_asc">💲 {language === 'es' ? 'Precio: Menor' : 'Price: Low'}</option>
                <option value="price_desc">💎 {language === 'es' ? 'Precio: Mayor' : 'Price: High'}</option>
                <option value="duration">⏱️ {language === 'es' ? 'Duración' : 'Duration'}</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-emerald-950/80 p-0.5 rounded-full border border-emerald-500/30">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full transition-colors ${
                  viewMode === 'grid' ? 'bg-amber-400 text-stone-950 font-black shadow-sm' : 'text-emerald-300/70 hover:text-white'
                }`}
                title={language === 'es' ? 'Vista Cuadrícula' : 'Grid View'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-full transition-colors ${
                  viewMode === 'list' ? 'bg-amber-400 text-stone-950 font-black shadow-sm' : 'text-emerald-300/70 hover:text-white'
                }`}
                title={language === 'es' ? 'Vista Lista' : 'List View'}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive Map Quick Launcher */}
            {onOpenMap && (
              <button
                type="button"
                onClick={onOpenMap}
                className="hidden sm:flex items-center gap-1 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 hover:text-amber-300 px-3 py-2 rounded-full border border-emerald-500/30 text-xs font-bold transition-all"
                title={language === 'es' ? 'Ver mapa interactivo' : 'View interactive map'}
              >
                <Map className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden lg:inline">{language === 'es' ? 'Mapa' : 'Map'}</span>
              </button>
            )}

          </div>
        </div>

        {/* Interactive Real-Time Sliders Island ("Update Everything in Real Time as Sliders Move") */}
        <AnimatePresence>
          {showLiveSliders && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-emerald-500/20 pt-3 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <span>⚡ {language === 'es' ? 'Ajuste en Tiempo Real' : 'Real-Time Tuning'}</span>
                  </span>
                  <span className="text-[10px] text-emerald-300/70 bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {language === 'es' ? 'Se actualiza inmediatamente al deslizar' : 'Updates immediately as sliders move'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-200 font-bold">
                    {language === 'es' ? `${processedTours.length} de ${tours.length} tours` : `${processedTours.length} of ${tours.length} tours`}
                  </span>
                  {(maxPrice < 200 || maxDurationHours < 14 || minRating > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMaxPrice(200);
                        setMaxDurationHours(14);
                        setMinRating(0);
                      }}
                      className="text-stone-400 hover:text-amber-400 text-[11px] underline cursor-pointer transition-colors"
                    >
                      {language === 'es' ? 'Restablecer sliders' : 'Reset sliders'}
                    </button>
                  )}
                </div>
              </div>

              {/* 3 Interactive Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* Slider 1: Presupuesto Máximo */}
                <div className="bg-emerald-950/70 border border-emerald-500/25 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-300 font-semibold flex items-center gap-1">
                      <span>💰</span>
                      <span>{language === 'es' ? 'Precio Máx:' : 'Max Price:'}</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30 text-[11px]">
                      {maxPrice >= 200 ? (language === 'es' ? 'Sin límite' : 'No limit') : `${formatCurrency(maxPrice, currency)} (${maxPrice} USD)`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={200}
                    step={5}
                    value={maxPrice}
                    onMouseDown={() => setIsSliding(true)}
                    onMouseUp={() => setIsSliding(false)}
                    onTouchStart={() => setIsSliding(true)}
                    onTouchEnd={() => setIsSliding(false)}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-emerald-900/80 rounded-lg"
                    aria-label={language === 'es' ? 'Filtrar por precio máximo' : 'Filter by max price'}
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                    <span>$40</span>
                    <span>$100</span>
                    <span>$150</span>
                    <span>$200+ USD</span>
                  </div>
                </div>

                {/* Slider 2: Duración Máxima en Horas */}
                <div className="bg-emerald-950/70 border border-emerald-500/25 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-300 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-teal-400" />
                      <span>{language === 'es' ? 'Duración Máx:' : 'Max Duration:'}</span>
                    </span>
                    <span className="font-mono font-bold text-teal-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30 text-[11px]">
                      {maxDurationHours >= 14 
                        ? (language === 'es' ? 'Cualquiera (1-14h)' : 'Any (1-14h)') 
                        : `${maxDurationHours}h ${maxDurationHours <= 4 ? (language === 'es' ? '(Medio día)' : '(Half-day)') : (language === 'es' ? '(Día completo)' : '(Full-day)')}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={14}
                    step={1}
                    value={maxDurationHours}
                    onMouseDown={() => setIsSliding(true)}
                    onMouseUp={() => setIsSliding(false)}
                    onTouchStart={() => setIsSliding(true)}
                    onTouchEnd={() => setIsSliding(false)}
                    onChange={(e) => setMaxDurationHours(Number(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer h-1.5 bg-emerald-900/80 rounded-lg"
                    aria-label={language === 'es' ? 'Filtrar por duración máxima' : 'Filter by max duration'}
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                    <span>2h</span>
                    <span>4h</span>
                    <span>8h</span>
                    <span>14h+</span>
                  </div>
                </div>

                {/* Slider 3: Calificación Mínima */}
                <div className="bg-emerald-950/70 border border-emerald-500/25 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-300 font-semibold flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{language === 'es' ? 'Calificación Mín:' : 'Min Rating:'}</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30 text-[11px]">
                      {minRating === 0 ? (language === 'es' ? 'Todas las notas' : 'All ratings') : `≥ ${minRating.toFixed(1)} ⭐`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={4.9}
                    step={0.1}
                    value={minRating}
                    onMouseDown={() => setIsSliding(true)}
                    onMouseUp={() => setIsSliding(false)}
                    onTouchStart={() => setIsSliding(true)}
                    onTouchEnd={() => setIsSliding(false)}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-emerald-900/80 rounded-lg"
                    aria-label={language === 'es' ? 'Filtrar por calificación mínima' : 'Filter by min rating'}
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                    <span>0.0</span>
                    <span>4.0 ⭐</span>
                    <span>4.5 ⭐</span>
                    <span>4.9 ⭐</span>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Horizontal Category Carousel (Slim Pills with Smooth Scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar pt-1 border-t border-emerald-500/15">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-amber-400 text-stone-950 border-amber-300 font-black shadow-sm'
                : 'bg-emerald-950/50 text-emerald-200/80 hover:text-white border-emerald-500/20 hover:border-emerald-500/40'
            }`}
          >
            ✨ {language === 'es' ? 'Todos' : 'All'}
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('combos')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
              selectedCategory === 'combos'
                ? 'bg-amber-400 text-stone-950 border-amber-300 font-black shadow-sm'
                : 'bg-emerald-950/50 text-emerald-200/80 hover:text-white border-emerald-500/20 hover:border-emerald-500/40'
            }`}
          >
            🚀 {language === 'es' ? 'Combos 3-en-1' : '3-in-1 Combos'}
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('volcanoes')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
              selectedCategory === 'volcanoes'
                ? 'bg-amber-400 text-stone-950 border-amber-300 font-black shadow-sm'
                : 'bg-emerald-950/50 text-emerald-200/80 hover:text-white border-emerald-500/20 hover:border-emerald-500/40'
            }`}
          >
            🌋 {language === 'es' ? 'Volcanes y Termales' : 'Volcanoes'}
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('canopy')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
              selectedCategory === 'canopy'
                ? 'bg-amber-400 text-stone-950 border-amber-300 font-black shadow-sm'
                : 'bg-emerald-950/50 text-emerald-200/80 hover:text-white border-emerald-500/20 hover:border-emerald-500/40'
            }`}
          >
            ⚡ {language === 'es' ? 'Canopy y Tirolesas' : 'Zipline'}
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('wildlife')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
              selectedCategory === 'wildlife'
                ? 'bg-amber-400 text-stone-950 border-amber-300 font-black shadow-sm'
                : 'bg-emerald-950/50 text-emerald-200/80 hover:text-white border-emerald-500/20 hover:border-emerald-500/40'
            }`}
          >
            🦥 {language === 'es' ? 'Perezosos y Fauna' : 'Wildlife'}
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('beaches')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
              selectedCategory === 'beaches'
                ? 'bg-amber-400 text-stone-950 border-amber-300 font-black shadow-sm'
                : 'bg-emerald-950/50 text-emerald-200/80 hover:text-white border-emerald-500/20 hover:border-emerald-500/40'
            }`}
          >
            🏝️ {language === 'es' ? 'Playas y Catamarán' : 'Beaches'}
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('rafting')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
              selectedCategory === 'rafting'
                ? 'bg-amber-400 text-stone-950 border-amber-300 font-black shadow-sm'
                : 'bg-emerald-950/50 text-emerald-200/80 hover:text-white border-emerald-500/20 hover:border-emerald-500/40'
            }`}
          >
            🚣 {language === 'es' ? 'Rafting en Ríos' : 'Rafting'}
          </button>
        </div>

        {/* Active Filters Tag Bar (Compact, only visible when filters are set) */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-emerald-500/15 text-xs">
            <span className="font-bold text-stone-400 text-[11px] uppercase tracking-wider mr-1">
              {language === 'es' ? 'Filtros:' : 'Active:'}
            </span>

            {searchQuery && (
              <span className="bg-emerald-950/80 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 text-[11px] font-medium">
                "{searchQuery}"
                <X className="w-3 h-3 cursor-pointer text-stone-400 hover:text-white ml-0.5" onClick={() => setSearchQuery('')} />
              </span>
            )}

            {selectedCategory !== 'all' && (
              <span className="bg-emerald-950/80 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 text-[11px] font-medium">
                🏷️ {selectedCategory}
                <X className="w-3 h-3 cursor-pointer text-stone-400 hover:text-white ml-0.5" onClick={() => setSelectedCategory('all')} />
              </span>
            )}

            {selectedRegion !== 'all' && (
              <span className="bg-emerald-950/80 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 text-[11px] font-medium">
                📍 {getLangText(REGIONS.find(r => r.id === selectedRegion)?.name || { es: '' }, language).split('/')[0]}
                <X className="w-3 h-3 cursor-pointer text-stone-400 hover:text-white ml-0.5" onClick={() => setSelectedRegion('all')} />
              </span>
            )}

            {difficultyFilter !== 'all' && (
              <span className="bg-emerald-950/80 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 text-[11px] font-medium">
                ⚡ {difficultyFilter}
                <X className="w-3 h-3 cursor-pointer text-stone-400 hover:text-white ml-0.5" onClick={() => setDifficultyFilter('all')} />
              </span>
            )}

            {maxPrice < 200 && (
              <span className="bg-emerald-950/80 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 text-[11px] font-medium">
                💰 ≤ ${maxPrice}
                <X className="w-3 h-3 cursor-pointer text-stone-400 hover:text-white ml-0.5" onClick={() => setMaxPrice(200)} />
              </span>
            )}

            {maxDurationHours < 14 && (
              <span className="bg-emerald-950/80 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30 flex items-center gap-1 text-[11px] font-medium">
                ⏱️ ≤ {maxDurationHours}h
                <X className="w-3 h-3 cursor-pointer text-stone-400 hover:text-white ml-0.5" onClick={() => setMaxDurationHours(14)} />
              </span>
            )}

            {minRating > 0 && (
              <span className="bg-emerald-950/80 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 text-[11px] font-medium">
                ⭐ ≥ {minRating.toFixed(1)}
                <X className="w-3 h-3 cursor-pointer text-stone-400 hover:text-white ml-0.5" onClick={() => setMinRating(0)} />
              </span>
            )}

            {freeCancellationOnly && (
              <span className="bg-emerald-950/80 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 text-[11px] font-medium">
                ✅ {language === 'es' ? 'Cancelación Gratis' : 'Free Cancellation'}
                <X className="w-3 h-3 cursor-pointer text-stone-400 hover:text-white ml-0.5" onClick={() => setFreeCancellationOnly(false)} />
              </span>
            )}

            {ecoFriendlyOnly && (
              <span className="bg-emerald-950/80 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 text-[11px] font-medium">
                🌿 {language === 'es' ? 'Eco-Sostenible' : 'Eco-Friendly'}
                <X className="w-3 h-3 cursor-pointer text-stone-400 hover:text-white ml-0.5" onClick={() => setEcoFriendlyOnly(false)} />
              </span>
            )}

            {bestsellerOnly && (
              <span className="bg-emerald-950/80 text-orange-400 px-2.5 py-0.5 rounded-full border border-orange-500/30 flex items-center gap-1 text-[11px] font-medium">
                🔥 Bestsellers
                <X className="w-3 h-3 cursor-pointer text-stone-400 hover:text-white ml-0.5" onClick={() => setBestsellerOnly(false)} />
              </span>
            )}

            {favoritesOnly && (
              <span className="bg-emerald-950/80 text-rose-400 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1 text-[11px] font-medium">
                ❤️ {language === 'es' ? 'Guardados' : 'Favorites'}
                <X className="w-3 h-3 cursor-pointer text-stone-400 hover:text-white ml-0.5" onClick={() => setFavoritesOnly(false)} />
              </span>
            )}

            <button
              type="button"
              onClick={resetAllFilters}
              className="text-amber-400 hover:text-amber-300 font-black text-xs underline ml-auto flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{language === 'es' ? 'Limpiar Todo' : 'Clear All'}</span>
            </button>
          </div>
        )}

      </div>

      {/* Slide-over Advanced Filters Drawer (Leaves Main View 100% Free & Unobstructed) */}
      <AnimatePresence>
        {isFiltersDrawerOpen && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFiltersDrawerOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
              aria-label="Close filters backdrop"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-full max-w-md bg-[#051c14] border-l border-emerald-500/30 text-white shadow-2xl flex flex-col h-full z-10 overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-emerald-500/25 flex items-center justify-between bg-[#03140e]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white uppercase tracking-wider">
                      {language === 'es' ? 'Filtros y Preferencias' : 'Filters & Preferences'}
                    </h3>
                    <p className="text-[11px] text-emerald-300/70">
                      {processedTours.length} {language === 'es' ? 'tours disponibles' : 'tours available'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFiltersDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-emerald-950/80 hover:bg-emerald-900 text-stone-300 hover:text-white flex items-center justify-center border border-emerald-500/30 transition-colors cursor-pointer"
                  aria-label={language === 'es' ? 'Cerrar filtros' : 'Close filters'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-stone-200 modal-scrollable">
                
                {/* Section 1: Maximum Price Range */}
                <div className="space-y-3 bg-[#07241a]/60 p-4 rounded-2xl border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                      <span>💰 {language === 'es' ? 'Presupuesto Máximo' : 'Max Budget'}</span>
                    </label>
                    <span className="text-sm font-black text-white bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-500/40">
                      {maxPrice >= 200 ? (language === 'es' ? 'Sin límite ($200+)' : 'No limit ($200+)') : `${formatCurrency(maxPrice, currency)} (${maxPrice} USD)`}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={40}
                    max={200}
                    step={10}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-2 bg-emerald-950 rounded-lg"
                  />

                  <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                    <span>$40 USD</span>
                    <span>$80 USD</span>
                    <span>$120 USD</span>
                    <span>$160 USD</span>
                    <span>$200+ USD</span>
                  </div>

                  {/* Quick Price Shortcuts */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[60, 100, 150, 200].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMaxPrice(preset)}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          maxPrice === preset
                            ? 'bg-amber-400 text-stone-950 border-amber-300 font-black'
                            : 'bg-emerald-950/70 text-emerald-200/80 border-emerald-500/20 hover:border-emerald-500/40'
                        }`}
                      >
                        {preset === 200 ? (language === 'es' ? 'Todos' : 'All') : `≤ $${preset}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 1.5: Maximum Duration in Drawer */}
                <div className="space-y-3 bg-[#07241a]/60 p-4 rounded-2xl border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-400" />
                      <span>{language === 'es' ? 'Duración Máxima del Tour' : 'Max Tour Duration'}</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-teal-300 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-500/40">
                      {maxDurationHours >= 14 ? (language === 'es' ? 'Cualquiera (1-14h)' : 'Any (1-14h)') : `≤ ${maxDurationHours} horas`}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={2}
                    max={14}
                    step={1}
                    value={maxDurationHours}
                    onChange={(e) => setMaxDurationHours(Number(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer h-2 bg-emerald-950 rounded-lg"
                  />

                  <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                    <span>2h (Corto)</span>
                    <span>5h (Medio)</span>
                    <span>8h (Extenso)</span>
                    <span>14h (Todo el día)</span>
                  </div>
                </div>

                {/* Section 1.6: Minimum Rating in Drawer */}
                <div className="space-y-3 bg-[#07241a]/60 p-4 rounded-2xl border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{language === 'es' ? 'Calificación Mínima' : 'Minimum Rating'}</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-300 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-500/40">
                      {minRating === 0 ? (language === 'es' ? 'Todas' : 'All') : `≥ ${minRating.toFixed(1)} ⭐`}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={4.9}
                    step={0.1}
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-2 bg-emerald-950 rounded-lg"
                  />

                  <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                    <span>Cualquiera</span>
                    <span>4.0+ ⭐</span>
                    <span>4.5+ ⭐</span>
                    <span>4.8+ ⭐</span>
                  </div>
                </div>

                {/* Section 2: Difficulty Level */}
                <div className="space-y-3 bg-[#07241a]/60 p-4 rounded-2xl border border-emerald-500/20">
                  <label className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <span>⚡ {language === 'es' ? 'Nivel de Exigencia Física' : 'Physical Activity Level'}</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'all', label: language === 'es' ? 'Cualquiera' : 'Any', icon: '✨' },
                      { id: 'fácil', label: language === 'es' ? 'Fácil / Familiar' : 'Easy', icon: '🟢' },
                      { id: 'moderado', label: language === 'es' ? 'Moderado' : 'Moderate', icon: '🟡' },
                      { id: 'exigente', label: language === 'es' ? 'Exigente / Adrenalina' : 'Challenging', icon: '🔴' }
                    ].map((diff) => (
                      <button
                        key={diff.id}
                        type="button"
                        onClick={() => setDifficultyFilter(diff.id as any)}
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                          difficultyFilter === diff.id
                            ? 'bg-amber-400 text-stone-950 border-amber-300 font-black shadow-md'
                            : 'bg-emerald-950/60 text-emerald-100 hover:bg-emerald-900 border-emerald-500/25'
                        }`}
                      >
                        <span>{diff.icon}</span>
                        <span className="truncate">{diff.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 3: Value Add-ons & Confidence Seals */}
                <div className="space-y-2.5 bg-[#07241a]/60 p-4 rounded-2xl border border-emerald-500/20">
                  <label className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 mb-1">
                    <span>🛡️ {language === 'es' ? 'Garantías y Tipos de Experiencia' : 'Guarantees & Preferences'}</span>
                  </label>

                  {/* Free Cancellation Toggle */}
                  <button
                    type="button"
                    onClick={() => setFreeCancellationOnly(!freeCancellationOnly)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                      freeCancellationOnly
                        ? 'bg-emerald-900 text-white border-emerald-400 shadow-sm'
                        : 'bg-emerald-950/60 text-emerald-100/80 border-emerald-500/20 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${
                        freeCancellationOnly ? 'bg-emerald-400 text-stone-950' : 'bg-emerald-900/80 text-emerald-300'
                      }`}>
                        ✓
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {language === 'es' ? 'Cancelación Gratis' : 'Free Cancellation'}
                        </div>
                        <div className="text-[10px] text-emerald-300/70">
                          {language === 'es' ? '100% reembolso hasta 72h antes' : '100% refund up to 72h before'}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-black uppercase ${freeCancellationOnly ? 'text-emerald-300' : 'text-stone-500'}`}>
                      {freeCancellationOnly ? (language === 'es' ? 'Activo' : 'On') : 'Off'}
                    </span>
                  </button>

                  {/* Eco-Friendly CST Toggle */}
                  <button
                    type="button"
                    onClick={() => setEcoFriendlyOnly(!ecoFriendlyOnly)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                      ecoFriendlyOnly
                        ? 'bg-emerald-900 text-white border-emerald-400 shadow-sm'
                        : 'bg-emerald-950/60 text-emerald-100/80 border-emerald-500/20 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${
                        ecoFriendlyOnly ? 'bg-emerald-400 text-stone-950' : 'bg-emerald-900/80 text-emerald-300'
                      }`}>
                        🌿
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {language === 'es' ? 'Certificación CST / Eco-Friendly' : 'CST Eco-Certified'}
                        </div>
                        <div className="text-[10px] text-emerald-300/70">
                          {language === 'es' ? 'Operadores con sostenibilidad ambiental' : 'Environmentally certified tour operators'}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-black uppercase ${ecoFriendlyOnly ? 'text-emerald-300' : 'text-stone-500'}`}>
                      {ecoFriendlyOnly ? (language === 'es' ? 'Activo' : 'On') : 'Off'}
                    </span>
                  </button>

                  {/* Bestseller Toggle */}
                  <button
                    type="button"
                    onClick={() => setBestsellerOnly(!bestsellerOnly)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                      bestsellerOnly
                        ? 'bg-orange-950/80 text-white border-orange-400 shadow-sm'
                        : 'bg-emerald-950/60 text-emerald-100/80 border-emerald-500/20 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${
                        bestsellerOnly ? 'bg-orange-500 text-white' : 'bg-orange-950/80 text-orange-400'
                      }`}>
                        🔥
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {language === 'es' ? 'Solo Bestsellers' : 'Bestsellers Only'}
                        </div>
                        <div className="text-[10px] text-orange-300/70">
                          {language === 'es' ? 'Las experiencias más valoradas por viajeros' : 'Most popular & highest reviewed experiences'}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-black uppercase ${bestsellerOnly ? 'text-orange-400' : 'text-stone-500'}`}>
                      {bestsellerOnly ? (language === 'es' ? 'Activo' : 'On') : 'Off'}
                    </span>
                  </button>

                  {/* Favorites Wishlist Toggle */}
                  <button
                    type="button"
                    onClick={() => setFavoritesOnly(!favoritesOnly)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                      favoritesOnly
                        ? 'bg-rose-950/80 text-white border-rose-400 shadow-sm'
                        : 'bg-emerald-950/60 text-emerald-100/80 border-emerald-500/20 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${
                        favoritesOnly ? 'bg-rose-500 text-white' : 'bg-rose-950/80 text-rose-400'
                      }`}>
                        ❤️
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{language === 'es' ? 'Mis Favoritos Guardados' : 'My Saved Wishlist'}</span>
                          {favorites.length > 0 && (
                            <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                              {favorites.length}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-rose-300/70">
                          {language === 'es' ? 'Ver tours guardados en tu dispositivo' : 'View tours saved on your device'}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-black uppercase ${favoritesOnly ? 'text-rose-400' : 'text-stone-500'}`}>
                      {favoritesOnly ? (language === 'es' ? 'Activo' : 'On') : 'Off'}
                    </span>
                  </button>

                </div>

                {/* Section 4: Region Selector in Drawer */}
                <div className="space-y-3 bg-[#07241a]/60 p-4 rounded-2xl border border-emerald-500/20">
                  <label className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <span>📍 {language === 'es' ? 'Destino / Región' : 'Destination / Region'}</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedRegion('all')}
                      className={`p-2 rounded-lg text-xs font-bold text-left border transition-colors ${
                        selectedRegion === 'all'
                          ? 'bg-amber-400 text-stone-950 border-amber-300 font-black'
                          : 'bg-emerald-950/60 text-emerald-200/80 border-emerald-500/20 hover:border-emerald-500/40'
                      }`}
                    >
                      📍 {language === 'es' ? 'Todas las Regiones' : 'All Regions'}
                    </button>
                    {REGIONS.map((reg) => (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => setSelectedRegion(reg.id)}
                        className={`p-2 rounded-lg text-xs font-bold text-left border transition-colors truncate ${
                          selectedRegion === reg.id
                            ? 'bg-amber-400 text-stone-950 border-amber-300 font-black'
                            : 'bg-emerald-950/60 text-emerald-200/80 border-emerald-500/20 hover:border-emerald-500/40'
                        }`}
                      >
                        📍 {getLangText(reg.name, language).split('/')[0]}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-emerald-500/25 bg-[#03140e] flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetAllFilters();
                  }}
                  className="flex items-center justify-center gap-1.5 text-stone-300 hover:text-amber-400 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Restablecer' : 'Reset'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFiltersDrawerOpen(false)}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-center cursor-pointer"
                >
                  {language === 'es' ? `Ver ${processedTours.length} Tours` : `Show ${processedTours.length} Tours`}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Catalog Header & Count Row */}
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 px-2">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
            {language === 'es' ? 'Catálogo Completo de Tours' : 'Complete Tour Catalog'}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-emerald-950 text-amber-400 border border-emerald-500/30 px-3.5 py-1 rounded-full text-xs font-bold">
            {processedTours.length} {language === 'es' ? 'tours listados' : 'tours listed'}
          </span>
        </div>
      </div>

      {/* Tour Cards Display */}
      {processedTours.length === 0 ? (
        <div className="bg-[#07241a]/80 p-12 rounded-[2.5rem] border border-emerald-500/30 text-center space-y-4 text-stone-100">
          <div className="text-5xl">🌴</div>
          <h3 className="text-xl font-black text-orange-400 uppercase">
            {language === 'es'
              ? 'No hay tours que coincidan con tus criterios'
              : 'No tours match your filter criteria'}
          </h3>
          <p className="text-xs text-orange-400 max-w-md mx-auto leading-relaxed">
            {language === 'es'
              ? 'Intenta borrar algunos filtros o expandir la búsqueda de precio y región para explorar más opciones.'
              : 'Try clearing some filters or expanding your price range to discover more excursions.'}
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="bg-teal-600 hover:bg-teal-600 text-white font-black text-xs uppercase px-6 py-2.5 rounded-full shadow-lg transition-colors"
          >
            {language === 'es' ? 'Restablecer Todos los Filtros' : 'Reset All Filters'}
          </button>
        </div>
      ) : (
        <motion.div 
          layout
          className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 grid-flow-dense" 
            : "flex flex-col gap-6"
          }
        >
          <AnimatePresence mode='popLayout'>
            {processedTours.slice(0, currentPage * 12).map((tour, index) => {
              // Modern Bento Grid Logic
              let bentoClass = "";
              if (viewMode === 'grid') {
                if (index % 6 === 0) {
                  bentoClass = "md:col-span-2 md:row-span-2";
                } else if (index % 6 === 3) {
                  bentoClass = "md:col-span-2";
                } else {
                  bentoClass = "md:col-span-1";
                }
              }

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  key={tour.id}
                  className={bentoClass}
                >
                  <TourCard
                    tour={tour}
                    language={language}
                    currency={currency}
                    onSelectTour={(t) => navigate(`/tour/${t.id}`)}
                    isFavorite={favorites.includes(tour.id)}
                    onToggleFavorite={toggleFavorite}
                    isCompared={comparedTours.some(t => t.id === tour.id)}
                    onToggleCompare={toggleCompare}
                    viewMode={viewMode}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Load More Button */}
      {processedTours.length > currentPage * 12 && (
        <div className="flex justify-center pt-8 pb-4">
          <button 
            onClick={() => setCurrentPage(p => p + 1)}
            className="bg-stone-50 hover:bg-stone-100 text-stone-900 font-bold px-8 py-3.5 rounded-full shadow-lg border border-stone-700 transition-transform active:scale-95 flex items-center gap-2"
          >
            <span>{language === 'es' ? 'Cargar Más Tours' : 'Load More Tours'}</span>
          </button>
        </div>
      )}

      {/* Floating Tour Comparison Dock */}
      {comparedTours.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/[0.03] backdrop-blur-3xl text-stone-900 px-5 py-3 rounded-full border-2 border-orange-500 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-xs uppercase text-orange-400 hidden sm:inline">
              {language === 'es' ? 'Comparando:' : 'Comparing:'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {comparedTours.map(t => (
              <div key={t.id} className="relative group">
                <LazyImage src={t.image} alt="" className="w-9 h-9 object-cover rounded-full border border-orange-500" />
                <button
                  type="button"
                  onClick={() => removeComparedTour(t.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-stone-900 rounded-full text-[10px] flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowCompareModal(true)}
            className="bg-teal-600 hover:bg-teal-600 text-white font-black text-xs uppercase px-4 py-2 rounded-full transition-colors flex items-center gap-1 shadow-md"
          >
            <span>{language === 'es' ? 'Ver Tabla Comparativa' : 'Compare Now'}</span>
            <span className="bg-white/[0.03] backdrop-blur-3xl text-orange-400 text-[10px] px-1.5 py-0.2 rounded-full">
              {comparedTours.length}
            </span>
          </button>
        </div>
      )}

      {/* Comparison Modal Popup */}
      {showCompareModal && (
        <TourComparisonModal
          comparedTours={comparedTours}
          language={language}
          currency={currency}
          onClose={() => setShowCompareModal(false)}
          onRemoveTour={removeComparedTour}
          onSelectTour={(t) => {
            setShowCompareModal(false);
            navigate(`/tour/${t.id}`);
          }}
        />
      )}

    </div>
  );
};
