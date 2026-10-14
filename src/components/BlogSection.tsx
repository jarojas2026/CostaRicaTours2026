import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Language } from '../types';
import { BLOG_POSTS } from '../data/blogPosts';
import { Calendar, User, ArrowRight } from 'lucide-react';

interface BlogSectionProps {
  language: Language;
}

export const BlogSection: React.FC<BlogSectionProps> = ({ language }) => {
  const lang = language === 'es' ? 'es' : 'en';
  return (
    <section className="py-20 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter italic">
          {language === 'es' ? 'Historias de la Selva' : 'Jungle Stories'}
        </h2>
        <p className="text-stone-400 max-w-2xl mx-auto text-lg">
          {language === 'es' 
            ? 'Guías de viaje con fuentes oficiales para planificar tu próxima aventura.'
            : 'Travel guides based on official sources to plan your next adventure.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {BLOG_POSTS.map((post, index) => (
          <motion.article
            key={post.slug}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group flex flex-col bg-stone-900/40 border border-white/5 rounded-[2rem] overflow-hidden hover:bg-stone-900/60 transition-all duration-300"
          >
            <div className="relative h-64 overflow-hidden">
              <img 
                src={post.image} 
                alt={post.imageAlt[lang]}
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
                  {post.date[lang]}
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {post.author[lang]}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors line-clamp-2">
                <Link to={`/blog/${post.slug}`} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
                  {post.title[lang]}
                </Link>
              </h3>
              
              <p className="text-stone-400 text-sm line-clamp-3 mb-6">
                {post.excerpt[lang]}
              </p>

              <div className="mt-auto pt-6 border-t border-white/5">
                <Link to={`/blog/${post.slug}`} className="flex items-center gap-2 text-emerald-400 text-sm font-black hover:gap-3 transition-all" aria-label={`${lang === 'es' ? 'Leer artículo' : 'Read article'}: ${post.title[lang]}`}>
                  {lang === 'es' ? 'Leer artículo' : 'Read article'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
};
