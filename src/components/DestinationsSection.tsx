import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { REGIONS } from '../data/toursData';
import { Language } from '../types';
import { MapPin, ChevronRight } from 'lucide-react';

interface DestinationsSectionProps {
  language: Language;
  onSelectRegion: (regionId: string) => void;
}

export const DestinationsSection: React.FC<DestinationsSectionProps> = ({ language, onSelectRegion }) => {
  const navigate = useNavigate();
  return (
    <section className="py-16 px-4 max-w-7xl mx-auto bg-stone-950/40 rounded-[3rem] border border-emerald-500/5 my-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 px-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-stone-100 mb-3 tracking-tighter">
            {language === 'es' ? 'Destinos Imperdibles' : 'Must-Visit Destinations'}
          </h2>
          <p className="text-stone-400 max-w-2xl text-lg">
            {language === 'es' 
              ? 'Costa Rica es pequeña en tamaño pero gigante en diversidad. Descubre cada rincón único.' 
              : 'Costa Rica is small in size but giant in diversity. Discover every unique corner.'}
          </p>
        </div>
        <motion.button 
          whileHover={{ x: 5 }}
          onClick={() => navigate('/destinations')}
          className="flex items-center gap-2 text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
        >
          {language === 'es' ? 'Ver todos los destinos' : 'See all destinations'}
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
        {REGIONS.slice(0, 6).map((region, index) => (
          <motion.button
            key={region.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            onClick={() => {
              onSelectRegion(region.id);
              navigate('/tours');
            }}
            className="group relative h-80 rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all duration-500 shadow-2xl"
          >
            {/* Background Image with optimized loading */}
            <img 
              src={region.image} 
              alt={(region.name as any)[language] || region.name.en}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent opacity-80 group-hover:opacity-70 transition-opacity" />
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 text-left">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Costa Rica</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-2 group-hover:text-emerald-400 transition-colors">
                {(region.name as any)[language] || region.name.en}
              </h3>
              <p className="text-stone-300 text-sm line-clamp-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                {(region.description as any)[language] || region.description.en}
              </p>
              
              <div className="mt-4 flex items-center gap-1.5 text-emerald-400 text-xs font-bold opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                {language === 'es' ? 'Explorar tours' : 'Explore tours'}
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
            
            {/* Tag */}
            <div className="absolute top-6 right-6 px-4 py-2 bg-stone-950/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
              {language === 'es' ? 'Popular' : 'Trending'}
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
};
