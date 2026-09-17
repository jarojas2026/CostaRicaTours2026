import React from 'react';
import { motion } from 'motion/react';
import { ToursGrid } from '../components/ToursGrid';
import { Tour, Language, Currency, TourCategory, TourRegion } from '../types';
import { useNavigate } from 'react-router-dom';

interface ToursPageProps {
  language: Language;
  currency: Currency;
  selectedCategory: TourCategory | 'all';
  setSelectedCategory: (cat: TourCategory | 'all') => void;
  selectedRegion: TourRegion | 'all';
  setSelectedRegion: (reg: TourRegion | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectTour?: (tour: Tour) => void;
  favorites: string[];
  toggleFavorite: (tourId: string) => void;
  comparedTours: Tour[];
  toggleCompare: (tour: Tour) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

export const ToursPage: React.FC<ToursPageProps> = ({
  language,
  currency,
  selectedCategory,
  setSelectedCategory,
  selectedRegion,
  setSelectedRegion,
  searchQuery,
  setSearchQuery,
  onSelectTour,
  favorites,
  toggleFavorite,
  comparedTours,
  toggleCompare,
  viewMode,
  setViewMode
}) => {
  const navigate = useNavigate();
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<'all' | 'fácil' | 'moderado' | 'exigente'>('all');
  const [maxPrice, setMaxPrice] = React.useState<number>(500);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12"
    >
      <ToursGrid
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
