import React, { useState, useEffect } from 'react';
import { Search, Sparkles, MapPin, Compass, ShieldCheck, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, TourRegion, TourCategory } from '../types';
import { UI_TRANSLATIONS } from '../utils/i18n';

interface HeroSectionProps {
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
    image: "https://images.unsplash.com/photo-1518182170546-0766de6b682b?auto=format&fit=crop&w=1200&q=80",
    badge: "🔥 Experiencia VIP",
    badgeEn: "🔥 VIP Experience",
    title: "Volcán Arenal & Aguas Termales",
    titleEn: "Arenal Volcano & Hot Springs",
    desc: "Descubre el majestuoso Volcán Arenal. Sumérgete en exclusivas aguas termales y siente la energía pura de la selva tropical de Costa Rica.",
    descEn: "Discover the majestic Arenal Volcano. Immerse yourself in exclusive hot springs and feel the pure energy of the Costa Rican rainforest.",
    price: "$135"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1544436579-247065977995?auto=format&fit=crop&w=1200&q=80",
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
    image: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80",
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
    <section className="relative bg-transparent text-white overflow-hidden py-12 lg:py-20 border-b border-stone-900/50">
      {/* Background decoration & atmospheric glow */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-stone-950/80 to-transparent pointer-events-none" />
      <div
        className="absolute inset-0 opacity-30 bg-cover bg-center pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url('/images/costa_rica_hero_1785203783748.jpg')` }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Hero Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-7 space-y-6 text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-stone-900/60 text-stone-100 rounded-full text-sm font-bold uppercase tracking-widest border border-teal-500/30 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-stone-200" />
              {t('licenseText')}
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[1.1] text-white tracking-tight">
              {t('discover')}<br />
              <span className="text-orange-400">
                COSTA RICA
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-stone-50 max-w-2xl font-medium leading-relaxed drop-shadow-md">
              {language === 'es' 
                ? 'Encuentra y reserva todas las experiencias, shuttles y tours de Costa Rica en una sola plataforma. Trabajamos con los mejores operadores locales para garantizarte disponibilidad y el precio oficial.'
                : 'Find and book all experiences, shuttles, and tours in Costa Rica on a single platform. We work with the best local operators to guarantee you availability and the official price.'}
            </p>

            {/* Search and Filters Bar */}
            <div className="bg-stone-900/10 backdrop-blur-md p-4 sm:p-5 rounded-[2rem] border border-white/10 shadow-2xl space-y-3 mt-6">
              <div className="text-xs uppercase font-extrabold text-orange-300 tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-orange-400" />
                {t('toursAndAdventures')}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search Query Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="w-full bg-stone-950/20 text-white placeholder-emerald-100/60 text-sm px-4 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-orange-400 transition-colors"
                  />
                </div>

                {/* Region Select */}
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value as TourRegion | 'all')}
                  className="w-full bg-stone-950/40 text-stone-50 text-sm px-4 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-orange-400 transition-colors cursor-pointer appearance-none"
                >
                  <option value="all">{t('allRegions')}</option>
                  <option value="arenal">🌋 La Fortuna / Volcán Arenal</option>
                  <option value="monteverde">🌫️ Monteverde (Bosque Nuboso)</option>
                  <option value="manuel_antonio">🐒 Manuel Antonio / Quepos</option>
                  <option value="guanacaste">🏄 Guanacaste & Tamarindo</option>
                  <option value="pacuare">🌊 Río Pacuare & Turrialba</option>
                  <option value="tortuguero">🐢 Tortuguero (Caribe Norte)</option>
                  <option value="san_jose">☕ San José & Valle Central</option>
                  <option value="osa">🦜 Península de Osa & Corcovado</option>
                </select>

                {/* Category Select */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as TourCategory | 'all')}
                  className="w-full bg-stone-950/40 text-stone-50 text-sm px-4 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-orange-400 transition-colors cursor-pointer appearance-none"
                >
                  <option value="all">{t('allCategories')}</option>
                                    <option value="combos">{language === 'es' ? '🚀 Combos de 1 Día' : '🚀 1-Day Combos'}</option>
                  <option value="volcanoes">{language === 'es' ? '🌋 Volcanes y Termales' : '🌋 Volcanoes & Springs'}</option>
                  <option value="wildlife">{language === 'es' ? '🦥 Fauna y Naturaleza' : '🦥 Wildlife & Nature'}</option>
                  <option value="canopy">{language === 'es' ? '🌲 Zipline & Puentes' : '🌲 Zipline & Canopy'}</option>
                  <option value="rafting">{language === 'es' ? '🚣 Rafting en Ríos' : '🚣 Whitewater Rafting'}</option>
                  <option value="beaches">{language === 'es' ? '🏖️ Playas y Catamarán' : '🏖️ Beaches & Catamaran'}</option>
                  <option value="culture">{language === 'es' ? '☕ Café y Cacao' : '☕ Coffee & Culture'}</option>
                </select>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-3 pt-1">
                {onOpenCustomFunnel && (
                  <button
                    onClick={onOpenCustomFunnel}
                    className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-teal-600 hover:from-orange-500 hover:to-orange-500 text-white font-black text-sm uppercase py-3.5 px-6 rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    {language === 'es' ? 'Armar mi Viaje Tuanis' : 'Build Custom Trip'}
                  </button>
                )}

                <button
                  onClick={onExploreTours}
                  className="w-full sm:w-auto flex-1 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-extrabold text-sm uppercase py-3.5 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-orange-400" />
                  {t('exploreCatalog')}
                </button>

                <button
                  onClick={onOpenItineraryPlanner}
                  className="w-full sm:w-auto bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 font-bold text-sm py-3.5 px-6 rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  {t('aiPlannerBtn')}
                </button>
              </div>

              {/* Quick Filter Pills */}
              <div className="pt-2 border-t border-white/10 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                  {language === 'es' ? 'Exploración directa:' : 'Quick shortcuts:'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('volcanoes');
                    onExploreTours();
                  }}
                  className="px-2.5 py-1 rounded-full bg-stone-950/60 hover:bg-orange-500 hover:text-white border border-teal-500/30 text-stone-200 transition-colors cursor-pointer"
                >
                  🌋 {language === 'es' ? 'Volcanes & Termales' : 'Volcanoes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('wildlife');
                    onExploreTours();
                  }}
                  className="px-2.5 py-1 rounded-full bg-stone-950/60 hover:bg-orange-500 hover:text-white border border-teal-500/30 text-stone-200 transition-colors cursor-pointer"
                >
                  🦥 {language === 'es' ? 'Fauna & Selva' : 'Wildlife'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('rafting');
                    onExploreTours();
                  }}
                  className="px-2.5 py-1 rounded-full bg-stone-950/60 hover:bg-orange-500 hover:text-white border border-teal-500/30 text-stone-200 transition-colors cursor-pointer"
                >
                  🚣 {language === 'es' ? 'Rafting' : 'Rafting'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('beaches');
                    onExploreTours();
                  }}
                  className="px-2.5 py-1 rounded-full bg-stone-950/60 hover:bg-orange-500 hover:text-white border border-teal-500/30 text-stone-200 transition-colors cursor-pointer"
                >
                  🏖️ {language === 'es' ? 'Playas' : 'Beaches'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right Cards Showcase (Vibrant Palette Design HTML pattern) */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="lg:col-span-5 relative h-[500px]"
          >
            <div className="absolute inset-0 bg-white/[0.03] rounded-[3rem] border border-neutral-100 overflow-hidden shadow-2xl group cursor-pointer">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0"
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover transition-transform duration-[10s] ease-linear group-hover:scale-110"
                    style={{ transform: 'scale(1.05)' }} // Base scale for slight zoom effect
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/40 to-transparent flex flex-col justify-end p-8">
                    <span className="bg-orange-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg w-fit mb-3">
                      {language === 'es' ? slide.badge : slide.badgeEn}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white uppercase leading-tight drop-shadow-md mb-2">
                      {language === 'es' ? slide.title : slide.titleEn}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-50 mb-4 drop-shadow line-clamp-3">
                      {language === 'es' ? slide.desc : slide.descEn}
                    </p>
                    <div className="flex items-center justify-between border-t border-white/20 pt-4">
                      <div className="flex flex-col">
                         <span className="text-[10px] text-white/80 font-bold uppercase">{language === 'es' ? 'Desde ' : 'From '}</span>
                         <span className="text-xl sm:text-2xl font-black text-orange-400">{slide.price} USD</span>
                      </div>
                      <button className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-black px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs uppercase tracking-wider transition-colors shadow-lg">
                        {language === 'es' ? '¡Mandarse!' : 'Discover'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Nav dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
              {HERO_SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentSlide === index ? 'w-8 bg-[#FFD700]' : 'w-2 bg-stone-900/40 hover:bg-stone-900/60'
                  }`}
                  title={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            
            {/* Next/Prev buttons */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-stone-950/30 hover:bg-stone-950/50 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white/10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-stone-950/30 hover:bg-stone-950/50 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white/10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
