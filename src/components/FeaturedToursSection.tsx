import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Compass, Sparkles, Filter, ArrowRight, Star, ShieldCheck, Heart, SlidersHorizontal, Flame, Trees, Sun, Waves, Coffee } from 'lucide-react';
import { Tour, Language, Currency } from '../types';
import { useTours } from '../contexts/ToursContext';
import { TourCard } from './TourCard';
import { getLangText } from '../utils/i18n';

interface FeaturedToursSectionProps {
  language: Language;
  currency: Currency;
  onSelectTour: (tour: Tour) => void;
  onOpenCustomFunnel?: () => void;
}

export const FeaturedToursSection: React.FC<FeaturedToursSectionProps> = ({
  language,
  currency,
  onSelectTour,
  onOpenCustomFunnel
}) => {
  const navigate = useNavigate();
  const { tours: TOURS, favorites, toggleFavorite } = useTours();
  const isEs = language === 'es';

  // Category filter tabs
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filterTabs = [
    { id: 'all', label: isEs ? 'Todos los Tours' : 'All Tours', icon: Compass },
    { id: 'whale_watching', label: isEs ? 'Ballenas & Océano' : 'Whale Watching', icon: Waves },
    { id: 'volcanoes', label: isEs ? 'Volcanes & Termales' : 'Volcanoes & Springs', icon: Flame },
    { id: 'wildlife', label: isEs ? 'Fauna & Selva' : 'Wildlife & Jungle', icon: Trees },
    { id: 'canopy', label: isEs ? 'Aventura & Canopy' : 'Adventure & Zipline', icon: Sparkles },
    { id: 'beaches', label: isEs ? 'Playas & Catamarán' : 'Beaches & Ocean', icon: Sun },
    { id: 'rafting', label: isEs ? 'Ríos & Rafting' : 'Rafting & Rivers', icon: Waves },
    { id: 'culture', label: isEs ? 'Cultura & Café' : 'Culture & Coffee', icon: Coffee }
  ];

  const filteredTours = useMemo(() => {
    if (activeFilter === 'all') {
      return TOURS.slice(0, 8); // Top curated on home
    }
    return TOURS.filter(t => t.category === activeFilter);
  }, [TOURS, activeFilter]);

  return (
    <section id="featured-tours-section" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header with Title and Subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 border-b border-emerald-500/20 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isEs ? 'Experiencias 100% Verificadas en Costa Rica' : '100% Verified Costa Rica Experiences'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {isEs ? 'Tours y Actividades Destacadas' : 'Featured Tours & Activities'}
          </h2>
          <p className="text-stone-300 text-sm sm:text-base max-w-2xl leading-relaxed">
            {isEs 
              ? 'Reserva experiencias inolvidables operadas por empresas locales certificadas. Consulta disponibilidad en tiempo real y asistencia 24/7.' 
              : 'Book unforgettable experiences operated by certified local companies. Real-time availability checks and 24/7 concierge support.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tours')}
            className="flex items-center gap-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-emerald-200 px-5 py-3 rounded-2xl font-bold text-xs uppercase border border-emerald-500/40 transition-colors shadow-lg cursor-pointer"
          >
            <span>{isEs ? `Ver Catálogo Completo (${TOURS.length})` : `View Full Catalog (${TOURS.length})`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide text-xs">
        {filterTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md shadow-amber-500/20 scale-[1.02]'
                  : 'bg-[#041910] text-stone-300 hover:text-white hover:bg-[#07291d] border-emerald-500/25'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-stone-950' : 'text-amber-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tours Grid */}
      {filteredTours.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTours.map((tour, index) => (
            <motion.div
              key={tour.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <TourCard
                tour={tour}
                language={language}
                currency={currency}
                onSelectTour={onSelectTour}
                isFavorite={favorites.includes(tour.id)}
                onToggleFavorite={toggleFavorite}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#041910] rounded-3xl border border-emerald-500/20 p-8">
          <Trees className="w-12 h-12 text-emerald-400/50 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">
            {isEs ? 'No se encontraron tours en esta categoría' : 'No tours found in this category'}
          </h3>
          <p className="text-stone-400 text-sm mb-6">
            {isEs ? 'Prueba seleccionando otra categoría o explora todo el catálogo.' : 'Try selecting another category or browse the full catalog.'}
          </p>
          <button
            onClick={() => setActiveFilter('all')}
            className="bg-amber-400 text-stone-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase"
          >
            {isEs ? 'Ver todos los tours' : 'View all tours'}
          </button>
        </div>
      )}

      {/* Bottom CTA Banner */}
      <div className="mt-12 bg-gradient-to-r from-[#06241a] via-[#093527] to-[#041910] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>{isEs ? 'Comercializadora Oficial de Turismo' : 'Official Licensed Tour Marketplace'}</span>
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-white">
            {isEs ? '¿Quieres un itinerario o tour a la medida?' : 'Need a custom tour or tailor-made itinerary?'}
          </h4>
          <p className="text-stone-300 text-xs sm:text-sm">
            {isEs 
              ? 'Conecta con nuestros asesores de counter y operadores locales para paquetes privados, grupos y traslados.' 
              : 'Connect with our counter advisors & local operators for private packages, groups and transfers.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          <a
            href="https://wa.me/50687959148?text=Hola%20Costa%20Rica%20Tours,%20quisiera%20consultar%20por%20un%20paquete%20o%20itinerario%20personalizado."
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#20ba59] text-stone-950 font-black px-5 py-3 rounded-2xl text-xs uppercase flex items-center gap-2 shadow-lg transition-all"
          >
            <span>WhatsApp: +506 8795 9148</span>
          </a>
          <button
            onClick={() => navigate('/tours')}
            className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-black px-5 py-3 rounded-2xl text-xs uppercase flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <span>{isEs ? 'Explorar Todos' : 'Explore All'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
