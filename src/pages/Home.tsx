import React from 'react';
import { motion } from 'motion/react';
import { HeroSection } from '../components/HeroSection';
import { HomeQuickNav } from '../components/HomeQuickNav';
import { CategoriesSection } from '../components/CategoriesSection';
import { DestinationsSection } from '../components/DestinationsSection';
import { HomeTrustSections } from '../components/HomeTrustSections';
import { AboutSection } from '../components/AboutSection';
import { BlogSection } from '../components/BlogSection';
import { ContactSection } from '../components/ContactSection';
import { Tour, Language, Currency, TourCategory, TourRegion } from '../types';

interface HomeProps {
  language: Language;
  currency: Currency;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: TourCategory | 'all';
  setSelectedCategory: (cat: TourCategory | 'all') => void;
  selectedRegion: TourRegion | 'all';
  setSelectedRegion: (reg: TourRegion | 'all') => void;
  onNavigateTab?: (tab: any) => void;
  setIsCustomFunnelOpen: (isOpen: boolean) => void;
  setSelectedTour?: (tour: Tour) => void;
}

export const Home: React.FC<HomeProps> = ({
  language,
  currency,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedRegion,
  setSelectedRegion,
  setIsCustomFunnelOpen
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {/* Hero Section */}
      <HeroSection
        language={language}
        currency={currency}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        onOpenCustomFunnel={() => setIsCustomFunnelOpen(true)}
      />

      {/* Quick Navigation Hub */}
      <div className="max-w-7xl mx-auto px-4 -mt-20 relative z-20">
        <HomeQuickNav
          language={language}
          currency={currency}
          onOpenCustomFunnel={() => setIsCustomFunnelOpen(true)}
        />
      </div>

      <CategoriesSection 
        language={language} 
        onSelectCategory={(catId) => {
          setSelectedCategory(catId as any);
        }}
      />

      <DestinationsSection 
        language={language}
        onSelectRegion={(regId) => {
          setSelectedRegion(regId as any);
        }}
      />

      {/* Trust & Conversion Sections */}
      <HomeTrustSections
        language={language}
        onOpenCustomFunnel={() => setIsCustomFunnelOpen(true)}
      />

      <AboutSection language={language} />

      <BlogSection language={language} />

      <ContactSection language={language} />
    </motion.div>
  );
};
