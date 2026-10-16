import React from 'react';
import { motion } from 'motion/react';
import { ToursGrid } from '../components/ToursGrid';
import { Tour, Language, Currency, TourCategory, TourRegion } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTours } from '../contexts/ToursContext';
import { RegionalExperienceGuides } from '../components/RegionalExperienceGuides';
import { DEFAULT_CATALOG_PRICE, patchCatalogRouteFilters, readCatalogRouteFilters, type CatalogRouteFilters } from '../utils/catalogRouteFilters';

interface ToursPageProps {
  language: Language;
  currency: Currency;
  selectedCategory?: TourCategory | 'all';
  setSelectedCategory?: (cat: TourCategory | 'all') => void;
  selectedRegion?: TourRegion | 'all';
  setSelectedRegion?: (reg: TourRegion | 'all') => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  onSelectTour?: (tour: Tour) => void;
  favorites?: string[];
  toggleFavorite?: (tourId: string) => void;
  comparedTours?: Tour[];
  toggleCompare?: (tour: Tour) => void;
  viewMode?: 'grid' | 'list';
  setViewMode?: (mode: 'grid' | 'list') => void;
}

export const ToursPage: React.FC<ToursPageProps> = ({
  language,
  currency,
  setSelectedCategory = () => {},
  setSelectedRegion = () => {},
  setSearchQuery = () => {},
  onSelectTour,
  favorites: propFavorites,
  toggleFavorite: propToggleFavorite,
  comparedTours: propComparedTours,
  toggleCompare: propToggleCompare,
  viewMode: propViewMode,
  setViewMode: propSetViewMode
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tours, favorites: ctxFavorites, toggleFavorite: ctxToggleFavorite } = useTours();

  const filters = readCatalogRouteFilters(searchParams);
  const [localComparedTours, setLocalComparedTours] = React.useState<Tour[]>([]);
  const [localViewMode, setLocalViewMode] = React.useState<'grid' | 'list'>('grid');

  // All edits commit a single URL patch; this is the catalog's canonical state.
  // Unlike the legacy effects, user selections cannot race the initial link.
  const updateCatalogUrl = React.useCallback((changes: Partial<CatalogRouteFilters>) => {
    const next = patchCatalogRouteFilters(searchParams, changes);
    if (next.toString() !== searchParams.toString()) {
      const noisy = 'q' in changes || 'maxPrice' in changes;
      setSearchParams(next, { replace: noisy });
    }
  }, [searchParams, setSearchParams]);

  const selectCategory = (category: TourCategory | 'all') => {
    setSelectedCategory(category);
    updateCatalogUrl({ category });
  };
  const selectRegion = (region: TourRegion | 'all') => {
    setSelectedRegion(region);
    updateCatalogUrl({ region });
  };
  const selectQuery = (query: string) => {
    setSearchQuery(query);
    updateCatalogUrl({ q: query });
  };
  const resetAllCatalogFilters = () => {
    setSelectedCategory('all');
    setSelectedRegion('all');
    setSearchQuery('');
    updateCatalogUrl({ q: '', category: 'all', region: 'all', difficulty: 'all', maxPrice: DEFAULT_CATALOG_PRICE, favorites: false });
  };

  const favorites = propFavorites || ctxFavorites;
  const onlyFavorites = searchParams.get('favorites') === '1';
  const toggleFavorite = propToggleFavorite || ctxToggleFavorite;

  const comparedTours = propComparedTours || localComparedTours;
  const toggleCompare = propToggleCompare || ((tour: Tour) => {
    setLocalComparedTours(prev => 
      prev.some(t => t.id === tour.id)
        ? prev.filter(t => t.id !== tour.id)
        : [...prev, tour]
    );
  });

  const viewMode = propViewMode || localViewMode;
  const setViewMode = propSetViewMode || setLocalViewMode;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="pt-8 sm:pt-12 pb-20 px-4 sm:px-6 lg:px-8 w-full min-w-0 max-w-7xl mx-auto space-y-8 sm:space-y-12"
    >
      {onlyFavorites && (
        <section aria-label={language === 'es' ? 'Tus favoritos' : 'Your favorites'}>
          <h1 className="text-2xl font-bold">{language === 'es' ? 'Tus favoritos' : 'Your favorites'}</h1>
          {favorites.length === 0 && <p>{language === 'es' ? 'Todavía no guardaste tours. Usa el corazón de cada experiencia para añadirla aquí.' : 'No saved tours yet. Use the heart on an experience to add it here.'}</p>}
          <button className="mt-3 rounded-xl border border-emerald-400 px-4 py-2" onClick={() => updateCatalogUrl({ favorites: false })}>{language === 'es' ? 'Ver todos los tours' : 'View all tours'}</button>
        </section>
      )}
      {!onlyFavorites && (
        <RegionalExperienceGuides
          language={language}
          tours={tours}
          onSelectRegion={(region) => {
            selectRegion(region);
          }}
        />
      )}
      <ToursGrid
        tours={onlyFavorites ? tours.filter(tour => favorites.includes(tour.id)) : tours}
        language={language}
        currency={currency}
        onSelectTour={onSelectTour || ((tour) => navigate(`/tour/${tour.id}`))}
        searchQuery={filters.q}
        setSearchQuery={selectQuery}
        selectedCategory={filters.category}
        setSelectedCategory={selectCategory}
        selectedRegion={filters.region}
        setSelectedRegion={selectRegion}
        difficultyFilter={filters.difficulty}
        setDifficultyFilter={(difficulty) => updateCatalogUrl({ difficulty })}
        maxPrice={filters.maxPrice}
        setMaxPrice={(maxPrice) => updateCatalogUrl({ maxPrice })}
        onResetCatalogFilters={resetAllCatalogFilters}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        comparedTours={comparedTours}
        toggleCompare={toggleCompare}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
    </motion.div>
  );
};
