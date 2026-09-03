import React, { useState, useEffect } from 'react';
import { Tour, TourCategory, TourRegion, Language, Currency } from '../types';
import { TourCard } from './TourCard';
import { LazyImage } from './LazyImage';
import { TourComparisonModal } from './TourComparisonModal';
import { REGIONS } from '../data/toursData';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, Search, Filter, SlidersHorizontal, Sparkles, LayoutGrid, List, 
  Map, Heart, Scale, X, Flame, Leaf, Check, RotateCcw, ArrowUpDown, ArrowLeft, Mic, MicOff, Loader2 
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
  onSelectTour: (tour: Tour) => void;
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
  onSelectTour,
  onOpenMap,
  onBack,
}) => {
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

  // Favorites / Wishlist LocalStorage Sync
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedRegion, searchQuery, difficultyFilter, maxPrice, sortBy, bestsellerOnly, ecoFriendlyOnly, freeCancellationOnly]);

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
      const title = (tour.title[language] || tour.title.es || '').toLowerCase();
      const desc = (tour.description[language] || tour.description.es || '').toLowerCase();
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
    (bestsellerOnly ? 1 : 0) +
    (ecoFriendlyOnly ? 1 : 0) +
    (favoritesOnly ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSelectedRegion('all');
    setDifficultyFilter('all');
    setSearchQuery('');
    setMaxPrice(200);
    setBestsellerOnly(false);
    setEcoFriendlyOnly(false);
    setFavoritesOnly(false);
  };

  return (
        <div className="space-y-6">
      
      {onBack && (
        <button 
          onClick={onBack}
          className="bg-white/95 backdrop-blur-md text-stone-900 hover:bg-white px-4 py-2.5 rounded-full font-bold shadow-lg transition-colors flex items-center gap-2 border border-stone-200 w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'es' ? 'Volver al Inicio' : 'Back to Home'}</span>
        </button>
      )}

      {/* Advanced Control & Filter Panel */}
      <div className="bg-stone-900/90 backdrop-blur-3xl p-5 sm:p-7 rounded-[2rem] border border-stone-800 shadow-2xl space-y-5 sticky top-2 sm:top-4 z-40">
        
        {/* Row 1: Search Bar & Primary View / Quick Action Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full lg:w-96">
            <Search className="w-5 h-5 text-orange-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'es'
                  ? 'Buscar por volcán, playa, perezoso, rafting...'
                  : 'Search volcano, beach, sloth, rafting...'
              }
              className="w-full bg-stone-950/40 text-neutral-100 text-sm pl-12 pr-20 py-3.5 rounded-full border border-white/10 focus:outline-none focus:border-orange-500 transition-colors shadow-inner placeholder:text-neutral-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={startVoiceSearch}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${isListening ? 'bg-orange-500/20 text-orange-500 animate-pulse' : 'text-neutral-400 hover:text-orange-500 hover:bg-stone-800'}`}
              title={language === 'es' ? 'Búsqueda por voz' : 'Voice Search'}
            >
              {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Controls: Region Dropdown, Difficulty, Sort & View Mode */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
            
            {/* Region Selector */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value as any)}
              className="bg-stone-950/40 text-neutral-300 text-sm px-4 py-3 rounded-full border border-white/10 focus:outline-none focus:border-orange-500 font-bold cursor-pointer"
            >
              <option value="all">📍 {language === 'es' ? 'Todas las Regiones' : 'All Regions'}</option>
              {REGIONS.map(reg => (
                <option key={reg.id} value={reg.id}>
                  📍 {reg.name.split('/')[0]}
                </option>
              ))}
            </select>

            {/* Difficulty Selector */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value as any)}
              className="bg-stone-950/40 text-neutral-300 text-sm px-4 py-3 rounded-full border border-white/10 focus:outline-none focus:border-orange-500 font-bold cursor-pointer"
            >
              <option value="all">⚡ {language === 'es' ? 'Toda Dificultad' : 'All Difficulties'}</option>
              <option value="fácil">🟢 {language === 'es' ? 'Fácil / Familiar' : 'Easy'}</option>
              <option value="moderado">🟡 {language === 'es' ? 'Moderado' : 'Moderate'}</option>
              <option value="exigente">🔴 {language === 'es' ? 'Exigente / Adrenalina' : 'Challenging'}</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-stone-950/40 text-neutral-300 text-sm px-4 py-3 rounded-full border border-white/10 focus:outline-none focus:border-orange-500 font-black cursor-pointer"
            >
              <option value="popular">🔥 {language === 'es' ? 'Más Populares' : 'Most Popular'}</option>
              <option value="rating">⭐ {language === 'es' ? 'Mejor Calificados' : 'Highest Rated'}</option>
              <option value="price_asc">💲 {language === 'es' ? 'Precio: Menor a Mayor' : 'Price: Low to High'}</option>
              <option value="price_desc">💎 {language === 'es' ? 'Precio: Mayor a Menor' : 'Price: High to Low'}</option>
              <option value="duration">⏱️ {language === 'es' ? 'Mayor Duración' : 'Longest Duration'}</option>
            </select>

            {/* View Mode Switcher (Grid vs List) */}
            <div className="flex items-center bg-white/[0.03] backdrop-blur-3xl/80 p-1 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-full transition-colors ${
                  viewMode === 'grid' ? 'bg-orange-500 text-white shadow-sm' : 'text-neutral-400 hover:text-orange-500'
                }`}
                title={language === 'es' ? 'Vista Cuadrícula' : 'Grid View'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-full transition-colors ${
                  viewMode === 'list' ? 'bg-orange-500 text-white shadow-sm' : 'text-neutral-400 hover:text-orange-500'
                }`}
                title={language === 'es' ? 'Vista Lista' : 'List View'}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* Row 2: Category Chips & Special Badges Toggle Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2 border-t border-neutral-100">
          
          {/* Category Chips Scrollable */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-orange-500 text-white shadow-md font-black border border-orange-500'
                  : 'bg-white/[0.03] backdrop-blur-3xl text-neutral-300 hover:text-white border border-white/10 hover:border-neutral-300'
              }`}
            >
              ✨ {language === 'es' ? 'Todos los Tours' : 'All Tours'}
            </button>

            <button
              onClick={() => setSelectedCategory('combos')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedCategory === 'combos'
                  ? 'bg-orange-500 text-white shadow-md font-black border border-orange-500'
                  : 'bg-white/[0.03] backdrop-blur-3xl text-neutral-300 hover:text-white border border-white/10 hover:border-neutral-300'
              }`}
            >
              🚀 {language === 'es' ? 'Combos 3-en-1' : '3-in-1 Combos'}
            </button>
            <button
              onClick={() => setSelectedCategory('volcanoes')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedCategory === 'volcanoes'
                  ? 'bg-orange-500 text-white shadow-md font-black border border-orange-500'
                  : 'bg-white/[0.03] backdrop-blur-3xl text-neutral-300 hover:text-white border border-white/10 hover:border-neutral-300'
              }`}
            >
              🌋 {language === 'es' ? 'Volcanes y Termales' : 'Volcanoes'}
            </button>

            <button
              onClick={() => setSelectedCategory('canopy')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedCategory === 'canopy'
                  ? 'bg-orange-500 text-white shadow-md font-black border border-orange-500'
                  : 'bg-white/[0.03] backdrop-blur-3xl text-neutral-300 hover:text-white border border-white/10 hover:border-neutral-300'
              }`}
            >
              ⚡ {language === 'es' ? 'Canopy y Tirolesas' : 'Zipline'}
            </button>

            <button
              onClick={() => setSelectedCategory('wildlife')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedCategory === 'wildlife'
                  ? 'bg-orange-500 text-white shadow-md font-black border border-orange-500'
                  : 'bg-white/[0.03] backdrop-blur-3xl text-neutral-300 hover:text-white border border-white/10 hover:border-neutral-300'
              }`}
            >
              🦥 {language === 'es' ? 'Perezosos y Fauna' : 'Wildlife'}
            </button>

            <button
              onClick={() => setSelectedCategory('beaches')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedCategory === 'beaches'
                  ? 'bg-orange-500 text-white shadow-md font-black border border-orange-500'
                  : 'bg-white/[0.03] backdrop-blur-3xl text-neutral-300 hover:text-white border border-white/10 hover:border-neutral-300'
              }`}
            >
              🏝️ {language === 'es' ? 'Playas y Catamarán' : 'Beaches'}
            </button>

            <button
              onClick={() => setSelectedCategory('rafting')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedCategory === 'rafting'
                  ? 'bg-orange-500 text-white shadow-md font-black border border-orange-500'
                  : 'bg-white/[0.03] backdrop-blur-3xl text-neutral-300 hover:text-white border border-white/10 hover:border-neutral-300'
              }`}
            >
              🚣 {language === 'es' ? 'Rafting en Ríos' : 'Rafting'}
            </button>
          </div>

          {/* Quick Filter Toggles: Bestseller, Favorites, Free Cancellation & Max Price */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            
            {/* Free Cancellation Toggle */}
            <button
              type="button"
              onClick={() => setFreeCancellationOnly(!freeCancellationOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1 transition-all border ${
                freeCancellationOnly
                  ? 'bg-teal-600 text-white border-orange-500 shadow-md'
                  : 'bg-white/[0.03] backdrop-blur-3xl text-neutral-600 border-white/10 hover:border-orange-500 hover:text-teal-600'
              }`}
            >
              ✅ {language === 'es' ? 'Cancelación Gratis' : 'Free Cancellation'}
            </button>
            
            {/* Price Slider */}
            <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-3xl/80 px-3.5 py-1.5 rounded-full border border-white/10 text-xs">
              <span className="font-bold text-neutral-300">
                {language === 'es' ? 'Máx:' : 'Max:'}
              </span>
              <input
                type="range"
                min="40"
                max="200"
                step="10"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="accent-orange-500 cursor-pointer w-20"
              />
              <span className="font-black text-teal-600">${maxPrice}</span>
            </div>

            {/* Eco Friendly Toggle */}
            <button
              type="button"
              onClick={() => setEcoFriendlyOnly(!ecoFriendlyOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1 transition-all border ${
                ecoFriendlyOnly
                  ? 'bg-green-600 text-white border-green-400 shadow-md font-black'
                  : 'bg-white/[0.03] backdrop-blur-3xl text-neutral-600 border-white/10 hover:border-green-400 hover:text-green-500'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Eco-Sostenible' : 'Eco-Friendly'}</span>
            </button>

            {/* Bestseller Toggle */}
            <button
              type="button"
              onClick={() => setBestsellerOnly(!bestsellerOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1 transition-all border ${
                bestsellerOnly
                  ? 'bg-orange-500 text-white border-orange-400 shadow-md font-black'
                  : 'bg-white/[0.03] backdrop-blur-3xl text-neutral-600 border-white/10 hover:border-orange-500 hover:text-orange-500'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Bestsellers</span>
            </button>

            {/* Favorites Wishlist Toggle */}
            <button
              type="button"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1 transition-all border ${
                favoritesOnly
                  ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                  : 'bg-white/[0.03] backdrop-blur-3xl text-neutral-600 border-white/10 hover:border-rose-400 hover:text-rose-500'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favorites.length > 0 ? 'fill-rose-400 text-white' : ''}`} />
              <span>{language === 'es' ? 'Favoritos' : 'Saved'}</span>
              {favorites.length > 0 && (
                <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
                  {favorites.length}
                </span>
              )}
            </button>

          </div>
        </div>

        {/* Active Filters Tag Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100 text-xs">
            <span className="font-bold text-neutral-500 text-[11px] uppercase tracking-wider">
              {language === 'es' ? 'Filtros Activos:' : 'Active Filters:'}
            </span>

            {searchQuery && (
              <span className="bg-white/[0.03] backdrop-blur-3xl/80 text-neutral-300 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 font-semibold">
                "{searchQuery}"
                <X className="w-3 h-3 cursor-pointer text-neutral-400 hover:text-neutral-600 ml-1" onClick={() => setSearchQuery('')} />
              </span>
            )}

            {selectedCategory !== 'all' && (
              <span className="bg-white/[0.03] backdrop-blur-3xl/80 text-neutral-300 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 font-semibold">
                🏷️ {selectedCategory}
                <X className="w-3 h-3 cursor-pointer text-neutral-400 hover:text-neutral-600 ml-1" onClick={() => setSelectedCategory('all')} />
              </span>
            )}

            {selectedRegion !== 'all' && (
              <span className="bg-white/[0.03] backdrop-blur-3xl/80 text-neutral-300 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 font-semibold">
                📍 {REGIONS.find(r => r.id === selectedRegion)?.name.split('/')[0]}
                <X className="w-3 h-3 cursor-pointer text-neutral-400 hover:text-neutral-600 ml-1" onClick={() => setSelectedRegion('all')} />
              </span>
            )}

            {difficultyFilter !== 'all' && (
              <span className="bg-white/[0.03] backdrop-blur-3xl/80 text-neutral-300 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 font-semibold">
                ⚡ {difficultyFilter}
                <X className="w-3 h-3 cursor-pointer text-neutral-400 hover:text-neutral-600 ml-1" onClick={() => setDifficultyFilter('all')} />
              </span>
            )}

            {maxPrice < 200 && (
              <span className="bg-white/[0.03] backdrop-blur-3xl/80 text-neutral-300 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 font-semibold">
                💰 ≤ ${maxPrice}
                <X className="w-3 h-3 cursor-pointer text-neutral-400 hover:text-neutral-600 ml-1" onClick={() => setMaxPrice(200)} />
              </span>
            )}

            {bestsellerOnly && (
              <span className="bg-white/[0.03] backdrop-blur-3xl text-orange-500 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 font-semibold">
                🔥 Bestsellers
                <X className="w-3 h-3 cursor-pointer text-gray-400 hover:text-white ml-1" onClick={() => setBestsellerOnly(false)} />
              </span>
            )}

            {favoritesOnly && (
              <span className="bg-white/[0.03] backdrop-blur-3xl text-red-400 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 font-semibold">
                ❤️ {language === 'es' ? 'Guardados' : 'Favorites'}
                <X className="w-3 h-3 cursor-pointer text-gray-400 hover:text-white ml-1" onClick={() => setFavoritesOnly(false)} />
              </span>
            )}

            <button
              type="button"
              onClick={resetAllFilters}
              className="text-orange-500 hover:text-orange-400 font-black text-xs underline ml-auto flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Limpiar Todo' : 'Clear All'}</span>
            </button>
          </div>
        )}

      </div>

      {/* Catalog Header & Count Row */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-2">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
            {language === 'es' ? 'Catálogo Completo de Tours' : 'Complete Tour Catalog'}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-neutral-700 text-orange-400 px-3.5 py-1 rounded-full text-xs font-bold">
            {processedTours.length} {language === 'es' ? 'tours listados' : 'tours listed'}
          </span>
        </div>
      </div>

      {/* Tour Cards Display */}
      {processedTours.length === 0 ? (
        <div className="bg-stone-950/40 p-12 rounded-[2.5rem] border-2 border-white/10 text-center space-y-4">
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
                    onSelectTour={onSelectTour}
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
            className="bg-stone-900 hover:bg-stone-800 text-white font-bold px-8 py-3.5 rounded-full shadow-lg border border-stone-700 transition-transform active:scale-95 flex items-center gap-2"
          >
            <span>{language === 'es' ? 'Cargar Más Tours' : 'Load More Tours'}</span>
          </button>
        </div>
      )}

      {/* Floating Tour Comparison Dock */}
      {comparedTours.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/[0.03] backdrop-blur-3xl text-white px-5 py-3 rounded-full border-2 border-orange-500 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300">
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
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold"
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
          onSelectTour={onSelectTour}
        />
      )}

    </div>
  );
};
