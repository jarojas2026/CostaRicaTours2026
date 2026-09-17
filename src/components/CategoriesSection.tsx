import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../data/toursData';
import { Language } from '../types';
import * as Icons from 'lucide-react';

interface CategoriesSectionProps {
  language: Language;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({ language, onSelectCategory }) => {
  const navigate = useNavigate();
  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-stone-100 mb-2 tracking-tight">
            {language === 'es' ? 'Explora por Categoría' : 'Explore by Category'}
          </h2>
          <p className="text-stone-400 max-w-xl">
            {language === 'es' 
              ? 'Desde la adrenalina del canopy hasta la paz de nuestras playas, encuentra la aventura perfecta.' 
              : 'From the adrenaline of ziplining to the peace of our beaches, find your perfect adventure.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {CATEGORIES.map((category, index) => {
          const IconComponent = (Icons as any)[category.iconName] || Icons.Circle;
          
          return (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                onSelectCategory(category.id);
                navigate('/tours');
              }}
              className="group relative flex flex-col items-center justify-center p-6 bg-stone-900/50 border border-emerald-500/10 rounded-3xl hover:bg-emerald-500 hover:border-emerald-400 transition-all duration-300"
            >
              <div className="mb-4 p-3 bg-emerald-500/10 rounded-2xl group-hover:bg-stone-950/20 transition-colors">
                <IconComponent className="w-8 h-8 text-emerald-400 group-hover:text-stone-950 transition-colors" />
              </div>
              <span className="text-sm font-bold text-stone-200 group-hover:text-stone-950 text-center transition-colors">
                {category.name[language] || category.name.en}
              </span>
              
              {/* Subtle accent line */}
              <div className="absolute bottom-4 w-8 h-1 bg-emerald-500/20 rounded-full group-hover:bg-stone-950/20 transition-colors" />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
