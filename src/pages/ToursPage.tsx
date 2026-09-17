import React from 'react';
import { motion } from 'motion/react';
import { ToursGrid } from '../components/ToursGrid';
import { Tour, Language, Currency, TourCategory, TourRegion } from '../types';
import { useNavigate } from 'react-router-dom';
import { useTours } from '../contexts/ToursContext';

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
  const { tours, favorites: ctxFavorites, toggleFavorite: ctxToggleFavorite } = useTours();

  const [selectedDifficulty, setSelectedDifficulty] = React.useState<'all' | 'fácil' | 'moderado' | 'exigente'>('all');
  const [maxPrice, setMaxPrice] = React.useState<number>(500);

  const [localComparedTours, setLocalComparedTours] = React.useState<Tour[]>([]);
  const [localViewMode, setLocalViewMode] = React.useState<'grid' | 'list'>('grid');

  const favorites = propFavorites || ctxFavorites;
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
      <ToursGrid
        tours={tours}
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
