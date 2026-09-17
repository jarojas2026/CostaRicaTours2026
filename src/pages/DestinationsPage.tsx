import React from 'react';
import { motion } from 'motion/react';
import { DestinationsSection } from '../components/DestinationsSection';
import { DestinationsCarousel } from '../components/DestinationsCarousel';
import { Language } from '../types';
import { useNavigate } from 'react-router-dom';

interface DestinationsPageProps {
  language: Language;
}

export const DestinationsPage: React.FC<DestinationsPageProps> = ({ language }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-24 pb-20 px-4 max-w-7xl mx-auto space-y-20"
    >
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
          {language === 'es' ? 'Destinos de Costa Rica' : 'Destinations in Costa Rica'}
        </h1>
        <p className="text-stone-400 text-lg">
          {language === 'es' 
            ? 'Explora las regiones más espectaculares del país, desde selvas vírgenes hasta playas paradisíacas.' 
            : 'Explore the most spectacular regions of the country, from pristine jungles to paradisiacal beaches.'}
        </p>
      </div>

      <DestinationsSection 
        language={language}
        onSelectRegion={(reg) => navigate(`/tours?region=${reg}`)} 
      />
      
      <div className="py-10">
        <DestinationsCarousel language={language} />
      </div>
    </motion.div>
  );
};
