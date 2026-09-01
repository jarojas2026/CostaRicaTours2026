import React, { useRef } from 'react';
import { Language, TourRegion } from '../types';
import { motion, useScroll, useTransform } from 'motion/react';
import { ChevronRight, ChevronLeft, MapPin } from 'lucide-react';

interface DestinationsCarouselProps {
  language: Language;
  onSelectRegion: (region: TourRegion) => void;
}

const destinations = [
  {
    id: 'arenal' as TourRegion,
    name: { es: 'La Fortuna & Arenal', en: 'La Fortuna & Arenal' },
    desc: { es: 'Volcán majestuoso, aguas termales y la capital de la aventura.', en: 'Majestic volcano, hot springs, and the adventure capital.' },
    img: 'https://images.unsplash.com/photo-1614531341773-3bff8b7cb3fc?auto=format&fit=crop&w=800&q=80',
    color: 'from-amber-600/80 to-amber-900/90'
  },
  {
    id: 'manuel_antonio' as TourRegion,
    name: { es: 'Manuel Antonio', en: 'Manuel Antonio' },
    desc: { es: 'Playas de arena blanca y avistamiento de perezosos garantizado.', en: 'White sand beaches and guaranteed sloth sightings.' },
    img: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
    color: 'from-emerald-600/80 to-emerald-900/90'
  },
  {
    id: 'guanacaste' as TourRegion,
    name: { es: 'Guanacaste (Tamarindo)', en: 'Guanacaste (Tamarindo)' },
    desc: { es: 'Cultura de surf, atardeceres dorados y resorts todo incluido.', en: 'Surf culture, golden sunsets, and all-inclusive resorts.' },
    img: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80',
    color: 'from-blue-600/80 to-blue-900/90'
  },
  {
    id: 'monteverde' as TourRegion,
    name: { es: 'Monteverde', en: 'Monteverde' },
    desc: { es: 'Bosque nuboso místico, puentes colgantes y biodiversidad única.', en: 'Mystical cloud forest, hanging bridges, and unique biodiversity.' },
    img: 'https://images.unsplash.com/photo-1629851610410-61b6c86996d1?auto=format&fit=crop&w=800&q=80',
    color: 'from-green-700/80 to-green-950/90'
  },
  {
    id: 'caribe' as TourRegion,
    name: { es: 'Puerto Viejo (Caribe)', en: 'Puerto Viejo (Caribbean)' },
    desc: { es: 'Selva exhuberante, rica cultura afrocaribeña y playas tranquilas.', en: 'Lush jungle, rich Afro-Caribbean culture, and laid-back beaches.' },
    img: 'https://images.unsplash.com/photo-1549880181-56a44cf4a9a1?auto=format&fit=crop&w=800&q=80',
    color: 'from-teal-600/80 to-teal-900/90'
  },
  {
    id: 'tortuguero' as TourRegion,
    name: { es: 'Tortuguero', en: 'Tortuguero' },
    desc: { es: 'Canales navegables y anidación de tortugas. El "Amazonas" tico.', en: 'Navigable canals and turtle nesting. The Costa Rican "Amazon".' },
    img: 'https://images.unsplash.com/photo-1605206969562-ab16ba5a9ce3?auto=format&fit=crop&w=800&q=80',
    color: 'from-cyan-700/80 to-cyan-950/90'
  }
];

export const DestinationsCarousel: React.FC<DestinationsCarouselProps> = ({ language, onSelectRegion }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-12 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 flex items-end justify-between">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 uppercase tracking-tight mb-3">
            {language === 'es' ? 'Explora los Destinos Top' : 'Explore Top Destinations'}
          </h2>
          <p className="text-neutral-600">
            {language === 'es' 
              ? 'Desde playas paradisíacas hasta impresionantes volcanes. Encuentra itinerarios y tours en los mejores lugares.' 
              : 'From paradisiacal beaches to stunning volcanoes. Find itineraries and tours in the best locations.'}
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          <button onClick={scrollLeft} className="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors">
            <ChevronLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <button onClick={scrollRight} className="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors">
            <ChevronRight className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
      </div>

      <div className="relative max-w-[100vw]">
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 sm:gap-6 px-4 sm:px-6 lg:px-8 pb-8 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {destinations.map((dest, idx) => (
            <motion.div 
              key={dest.id}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              onClick={() => onSelectRegion(dest.id)}
              className="relative min-w-[280px] sm:min-w-[320px] aspect-[4/5] rounded-[2rem] overflow-hidden snap-start cursor-pointer group shadow-md hover:shadow-xl transition-all duration-300"
            >
              {/* Background Image */}
              <img 
                src={dest.img} 
                alt={dest.name[language as keyof typeof dest.name] || dest.name.en}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${dest.color} opacity-80 mix-blend-multiply transition-opacity duration-300 group-hover:opacity-90`}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>

              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center gap-1.5 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    <MapPin className="w-4 h-4 text-white/80" />
                    <span className="text-white/80 text-xs font-bold uppercase tracking-wider">Costa Rica</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2 leading-tight">
                    {dest.name[language as keyof typeof dest.name] || dest.name.en}
                  </h3>
                  <p className="text-white/80 text-sm font-medium line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
                    {dest.desc[language as keyof typeof dest.desc] || dest.desc.en}
                  </p>
                  
                  <div className="mt-4 flex items-center gap-2 text-amber-400 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200">
                    <span>{language === 'es' ? 'Ver Tours' : 'View Tours'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {/* Spacer for last item to scroll fully */}
          <div className="min-w-[4px] sm:min-w-[1px]"></div>
        </div>
      </div>
    </section>
  );
};
