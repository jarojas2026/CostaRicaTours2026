import React from 'react';
import { motion } from 'motion/react';
import { Language } from '../types';
import { Calendar, User, ArrowRight } from 'lucide-react';

interface BlogSectionProps {
  language: Language;
}

const POSTS = [
  {
    id: '1',
    title: {
      es: '10 mejores lugares para visitar en Costa Rica en 2026',
      en: '10 best places to visit in Costa Rica in 2026'
    },
    excerpt: {
      es: 'Desde el Volcán Arenal hasta las playas vírgenes de Corcovado, esta es nuestra guía definitiva.',
      en: 'From Arenal Volcano to the pristine beaches of Corcovado, this is our ultimate guide.'
    },
    image: 'https://images.unsplash.com/photo-1518132715369-0f866418858f?auto=format&fit=crop&q=80',
    date: 'Sep 12, 2025',
    author: 'Daniel Rojas'
  },
  {
    id: '2',
    title: {
      es: 'Guía Completa: Cuándo ver ballenas en Marino Ballena',
      en: 'Complete Guide: When to see whales in Marino Ballena'
    },
    excerpt: {
      es: 'Las ballenas jorobadas visitan nuestras costas dos veces al año. Te contamos las mejores fechas.',
      en: 'Humpback whales visit our shores twice a year. We tell you the best dates.'
    },
    image: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?auto=format&fit=crop&q=80',
    date: 'Aug 28, 2025',
    author: 'Maria Jimenez'
  },
  {
    id: '3',
    title: {
      es: 'Cómo planificar un viaje sostenible a Costa Rica',
      en: 'How to plan a sustainable trip to Costa Rica'
    },
    excerpt: {
      es: 'Consejos prácticos para reducir tu huella mientras disfrutas de la biodiversidad más rica del mundo.',
      en: 'Practical tips to reduce your footprint while enjoying the world’s richest biodiversity.'
    },
    image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&q=80',
    date: 'Aug 15, 2025',
    author: 'Elena Gomez'
  }
];

export const BlogSection: React.FC<BlogSectionProps> = ({ language }) => {
  return (
    <section className="py-20 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter italic">
          {language === 'es' ? 'Historias de la Selva' : 'Jungle Stories'}
        </h2>
        <p className="text-stone-400 max-w-2xl mx-auto text-lg">
          {language === 'es' 
            ? 'Consejos expertos, guías de viaje y secretos locales para tu próxima aventura.' 
            : 'Expert tips, travel guides, and local secrets for your next adventure.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {POSTS.map((post, index) => (
          <motion.article
            key={post.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group flex flex-col bg-stone-900/40 border border-white/5 rounded-[2rem] overflow-hidden hover:bg-stone-900/60 transition-all duration-300"
          >
            <div className="relative h-64 overflow-hidden">
              <img 
                src={post.image} 
                alt={(post.title as any)[language] || post.title.en}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 px-4 py-1.5 bg-emerald-500 text-stone-950 text-[10px] font-black uppercase rounded-full">
                {language === 'es' ? 'Blog' : 'Travel Guide'}
              </div>
            </div>

            <div className="p-8 flex flex-col flex-grow">
              <div className="flex items-center gap-4 text-stone-500 text-xs mb-4">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.date}
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {post.author}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors line-clamp-2">
                {(post.title as any)[language] || post.title.en}
              </h3>
              
              <p className="text-stone-400 text-sm line-clamp-3 mb-6">
                {(post.excerpt as any)[language] || post.excerpt.en}
              </p>

              <div className="mt-auto pt-6 border-t border-white/5">
                <button className="flex items-center gap-2 text-emerald-400 text-sm font-black hover:gap-3 transition-all">
                  {language === 'es' ? 'Leer artículo' : 'Read more'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
};
