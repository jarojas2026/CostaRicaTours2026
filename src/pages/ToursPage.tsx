import React from 'react';
import { motion } from 'motion/react';
import { ToursGrid } from '../components/ToursGrid';
import { Tour, Language, Currency, TourCategory, TourRegion } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTours } from '../contexts/ToursContext';
import { RegionalExperienceGuides } from '../components/RegionalExperienceGuides';

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
  selectedCategory = 'all',
  setSelectedCategory = () => {},
  selectedRegion = 'all',
  setSelectedRegion = () => {},
  searchQuery = '',
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

  const [selectedDifficulty, setSelectedDifficulty] = React.useState<'all' | 'fácil' | 'moderado' | 'exigente'>('all');
  const [maxPrice, setMaxPrice] = React.useState<number>(500);

  const [localComparedTours, setLocalComparedTours] = React.useState<Tour[]>([]);
  const [localViewMode, setLocalViewMode] = React.useState<'grid' | 'list'>('grid');

  React.useEffect(() => {
    const difficulty = searchParams.get('difficulty') as 'fácil' | 'moderado' | 'exigente' | null;
    const price = Number(searchParams.get('maxPrice'));
    if (difficulty && ['fácil', 'moderado', 'exigente'].includes(difficulty)) setSelectedDifficulty(difficulty);
    if (Number.isFinite(price) && price > 0) setMaxPrice(price);
  }, [searchParams]);

  const updateCatalogUrl = React.useCallback((key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    if (next.toString() === searchParams.toString()) return;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  React.useEffect(() => {
    updateCatalogUrl('difficulty', selectedDifficulty === 'all' ? null : selectedDifficulty);
  }, [selectedDifficulty]);

  React.useEffect(() => {
    updateCatalogUrl('maxPrice', maxPrice >= 500 ? null : String(maxPrice));
  }, [maxPrice]);

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
      className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12"
    >
      {onlyFavorites && (
        <section aria-label={language === 'es' ? 'Tus favoritos' : 'Your favorites'}>
          <h1 className="text-2xl font-bold">{language === 'es' ? 'Tus favoritos' : 'Your favorites'}</h1>
          {favorites.length === 0 && <p>{language === 'es' ? 'Todavía no guardaste tours. Usa el corazón de cada experiencia para añadirla aquí.' : 'No saved tours yet. Use the heart on an experience to add it here.'}</p>}
          <button className="mt-3 rounded-xl border border-emerald-400 px-4 py-2" onClick={() => updateCatalogUrl('favorites', null)}>{language === 'es' ? 'Ver todos los tours' : 'View all tours'}</button>
        </section>
      )}
      {!onlyFavorites && (
        <RegionalExperienceGuides
          language={language}
          tours={tours}
          onSelectRegion={(region) => {
            setSelectedRegion(region);
            updateCatalogUrl('region', region);
          }}
        />
      )}
      <ToursGrid
        tours={onlyFavorites ? tours.filter(tour => favorites.includes(tour.id)) : tours}
        language={language}
        currency={currency}
        onSelectTour={onSelectTour || ((tour) => navigate(`/tour/${tour.id}`))}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        difficultyFilter={selectedDifficulty}
        setDifficultyFilter={setSelectedDifficulty}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
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
