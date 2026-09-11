import React, { useState, useEffect } from 'react';
import { Search, Sparkles, MapPin, Compass, ShieldCheck, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { Language, TourRegion, TourCategory, Currency } from '../types';
import { UI_TRANSLATIONS } from '../utils/i18n';

interface HeroSectionProps {
  currency: Currency;
  language: Language;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedRegion: TourRegion | 'all';
  setSelectedRegion: (r: TourRegion | 'all') => void;
  selectedCategory: TourCategory | 'all';
  setSelectedCategory: (c: TourCategory | 'all') => void;
  onOpenItineraryPlanner: () => void;
  onExploreTours: () => void;
  onOpenCustomFunnel?: () => void;
}

const HERO_SLIDES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1579294800821-694d95e86143?auto=format&fit=crop&w=1200&q=80",
    badge: "🔥 Experiencia VIP",
    badgeEn: "🔥 VIP Experience",
    title: "Volcán Arenal & Aguas Termales",
    titleEn: "Arenal Volcano & Hot Springs",
    desc: "Descubre el majestuoso Volcán Arenal. Sumérgete en exclusivas aguas termales y siente la energía pura de la selva tropical de Costa Rica.",
    descEn: "Discover the majestic Arenal Volcano. Immerse yourself in exclusive hot springs and feel the pure energy of the Costa Rican rainforest.",
    price: "$125"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80",
    badge: "🐒 Favorito de los Viajeros",
    badgeEn: "🐒 Traveler's Favorite",
    title: "Playas de Manuel Antonio",
    titleEn: "Manuel Antonio Beaches",
    desc: "Un paraíso donde la jungla se encuentra con el océano. Nuestro guía experto te mostrará perezosos y monos en su hábitat natural.",
    descEn: "A paradise where the jungle meets the ocean. Our expert guide will show you sloths and monkeys in their natural habitat.",
    price: "$65"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=1200&q=80",
    badge: "🚣 Pura Adrenalina",
    badgeEn: "🚣 Pure Adrenaline",
    title: "Rafting en el Río Pacuare",
    titleEn: "Pacuare River Rafting",
    desc: "Desafía rápidos de clase III y IV en uno de los ríos más escénicos del mundo. Una aventura épica y segura con instructores certificados.",
    descEn: "Brave Class III and IV rapids in one of the most scenic rivers in the world. An epic and safe adventure with certified instructors.",
    price: "$110"
  }
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  currency,
  language,
  searchQuery,
  setSearchQuery,
  selectedRegion,
  setSelectedRegion,
  selectedCategory,
  setSelectedCategory,
  onOpenItineraryPlanner,
  onExploreTours,
  onOpenCustomFunnel
}) => {
  const t = (key: string) => UI_TRANSLATIONS[key]?.[language] || UI_TRANSLATIONS[key]?.['es'] || key;
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <section className="relative bg-transparent text-stone-100 overflow-hidden py-10 lg:py-16 border-b border-emerald-500/20">
      {/* Background decoration & atmospheric glow */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-950/40 to-transparent pointer-events-none" />
      <div
        className="absolute inset-0 opacity-10 bg-cover bg-center pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80')` }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Hero Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="lg:col-span-7 space-y-6 text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-950/90 text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-400/40 backdrop-blur-md shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{t('licenseText')}</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.08] text-white tracking-tight">
              {t('discover')}<br />
              <span className="text-amber-400">
                COSTA RICA
              </span>
            </h1>

            <p className="text-base sm:text-lg text-stone-200 max-w-2xl font-normal leading-relaxed">
              {language === 'es' 
                ? 'Encuentra y reserva todas las experiencias, shuttles y tours de Costa Rica en una sola plataforma. Trabajamos con los mejores operadores locales para garantizarte disponibilidad y el precio oficial.'
                : 'Find and book all experiences, shuttles, and tours in Costa Rica on a single platform. We work with the best local operators to guarantee you availability and the official price.'}
            </p>

            {/* Search and Filters Island */}
            <div className="bg-[#062016]/95 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-emerald-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.5)] space-y-4 mt-4">
              <div className="text-xs uppercase font-extrabold text-amber-400 tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-400" />
                <span>{t('toursAndAdventures')}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search Query Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="w-full bg-[#03150e] text-white placeholder-stone-400 text-sm px-4 py-3.5 rounded-xl border border-emerald-500/30 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                {/* Region Select */}
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value as TourRegion | 'all')}
                  className="w-full bg-[#03150e] text-stone-100 text-sm px-4 py-3.5 rounded-xl border border-emerald-500/30 focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
                >
                  <option value="all" className="bg-[#03150e] text-white">{t('allRegions')}</option>
                  <option value="arenal" className="bg-[#03150e] text-white">🌋 La Fortuna / Volcán Arenal</option>
                  <option value="monteverde" className="bg-[#03150e] text-white">🌫️ Monteverde (Bosque Nuboso)</option>
                  <option value="manuel_antonio" className="bg-[#03150e] text-white">🐒 Manuel Antonio / Quepos</option>
                  <option value="guanacaste" className="bg-[#03150e] text-white">🏄 Guanacaste & Tamarindo</option>
                  <option value="pacuare" className="bg-[#03150e] text-white">🌊 Río Pacuare & Turrialba</option>
                  <option value="tortuguero" className="bg-[#03150e] text-white">🐢 Tortuguero (Caribe Norte)</option>
                  <option value="san_jose" className="bg-[#03150e] text-white">☕ San José & Valle Central</option>
                  <option value="osa" className="bg-[#03150e] text-white">🦜 Península de Osa & Corcovado</option>
                </select>

                {/* Category Select */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as TourCategory | 'all')}
                  className="w-full bg-[#03150e] text-stone-100 text-sm px-4 py-3.5 rounded-xl border border-emerald-500/30 focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
                >
                  <option value="all" className="bg-[#03150e] text-white">{t('allCategories')}</option>
                  <option value="combos" className="bg-[#03150e] text-white">{language === 'es' ? '🚀 Combos de 1 Día' : '🚀 1-Day Combos'}</option>
                  <option value="volcanoes" className="bg-[#03150e] text-white">{language === 'es' ? '🌋 Volcanes y Termales' : '🌋 Volcanoes & Springs'}</option>
                  <option value="wildlife" className="bg-[#03150e] text-white">{language === 'es' ? '🦥 Fauna y Naturaleza' : '🦥 Wildlife & Nature'}</option>
                  <option value="canopy" className="bg-[#03150e] text-white">{language === 'es' ? '🌲 Zipline & Puentes' : '🌲 Zipline & Canopy'}</option>
                  <option value="rafting" className="bg-[#03150e] text-white">{language === 'es' ? '🚣 Rafting en Ríos' : '🚣 Whitewater Rafting'}</option>
                  <option value="beaches" className="bg-[#03150e] text-white">{language === 'es' ? '🏖️ Playas y Catamarán' : '🏖️ Beaches & Catamaran'}</option>
                  <option value="culture" className="bg-[#03150e] text-white">{language === 'es' ? '☕ Café y Cacao' : '☕ Coffee & Culture'}</option>
                </select>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-3 pt-1">
                {onOpenCustomFunnel && (
                  <button
                    type="button"
                    onClick={onOpenCustomFunnel}
                    className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm uppercase py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-stone-950" />
                    <span>{language === 'es' ? 'Viaje a Medida' : 'Custom Trip'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onExploreTours}
                  className="w-full sm:w-auto flex-1 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-white font-bold text-sm uppercase py-3.5 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>{t('exploreCatalog')}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenItineraryPlanner}
                  className="w-full sm:w-auto bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-100 font-bold text-sm py-3.5 px-6 rounded-xl border border-emerald-500/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{t('aiPlannerBtn')}</span>
                </button>
              </div>

              {/* Quick Filter Pills */}
              <div className="pt-2 border-t border-emerald-500/20 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  {language === 'es' ? 'Acceso directo:' : 'Quick links:'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('volcanoes');
                    onExploreTours();
                  }}
                  className="px-3 py-1 rounded-full bg-[#03150e] hover:bg-amber-400 hover:text-stone-950 border border-emerald-500/30 text-stone-200 transition-colors cursor-pointer font-medium"
                >
                  🌋 {language === 'es' ? 'Volcanes & Termales' : 'Volcanoes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('wildlife');
                    onExploreTours();
                  }}
                  className="px-3 py-1 rounded-full bg-[#03150e] hover:bg-amber-400 hover:text-stone-950 border border-emerald-500/30 text-stone-200 transition-colors cursor-pointer font-medium"
                >
                  🦥 {language === 'es' ? 'Fauna & Selva' : 'Wildlife'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('rafting');
                    onExploreTours();
                  }}
                  className="px-3 py-1 rounded-full bg-[#03150e] hover:bg-amber-400 hover:text-stone-950 border border-emerald-500/30 text-stone-200 transition-colors cursor-pointer font-medium"
                >
                  🚣 {language === 'es' ? 'Rafting' : 'Rafting'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('beaches');
                    onExploreTours();
                  }}
                  className="px-3 py-1 rounded-full bg-[#03150e] hover:bg-amber-400 hover:text-stone-950 border border-emerald-500/30 text-stone-200 transition-colors cursor-pointer font-medium"
                >
                  🏖️ {language === 'es' ? 'Playas' : 'Beaches'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right Cards Showcase */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="lg:col-span-5 relative h-[500px]"
          >
            <div 
              onClick={onExploreTours}
              className="absolute inset-0 bg-[#07241a] rounded-3xl border border-emerald-500/30 overflow-hidden shadow-2xl group cursor-pointer"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    loading="eager"
                    fetchPriority="high"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80';
                    }}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 flex flex-col justify-end p-6 sm:p-8">
                    <span className="bg-amber-400 text-stone-950 text-xs font-black uppercase px-3 py-1 rounded-full shadow-md w-fit mb-3">
                      {language === 'es' ? slide.badge : slide.badgeEn}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-2 group-hover:text-amber-300 transition-colors">
                      {language === 'es' ? slide.title : slide.titleEn}
                    </h3>
                    <p className="text-sm text-stone-200 mb-4 line-clamp-2 leading-relaxed font-normal">
                      {language === 'es' ? slide.desc : slide.descEn}
                    </p>
                    <div className="flex items-center justify-between border-t border-white/20 pt-4">
                      <div className="flex flex-col">
                         <span className="text-xs text-stone-300 font-medium">{language === 'es' ? 'Desde' : 'From'}</span>
                         <span className="text-2xl font-black text-amber-400">
                           {formatCurrency(Number(slide.price.replace(/[^0-9]/g, '')) || 0, currency)}
                         </span>
                      </div>
                      <span className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wide transition-all shadow-md flex items-center gap-1.5">
                        <span>{language === 'es' ? 'Ver Detalles' : 'View Details'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Prev / Next Navigation Arrows */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg border border-white/20 z-20 cursor-pointer"
                aria-label="Slide anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg border border-white/20 z-20 cursor-pointer"
                aria-label="Slide siguiente"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            
            {/* Nav dots */}
            <div className="absolute -bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
              {HERO_SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    currentSlide === index ? 'w-8 bg-amber-400' : 'w-2.5 bg-emerald-500/40 hover:bg-emerald-400'
                  }`}
                  title={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
