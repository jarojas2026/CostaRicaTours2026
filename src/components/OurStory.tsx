import React from 'react';
import { Language } from '../types';
import { Globe, ShieldCheck, Map, HeartHandshake } from 'lucide-react';
import { motion } from 'motion/react';

interface OurStoryProps {
  language: Language;
}

export const OurStory: React.FC<OurStoryProps> = ({ language }) => {
  return (
    <section className="py-16 sm:py-24 bg-neutral-50 relative overflow-hidden">
      {/* Decorative bg elements */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-amber-100/50 blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-200">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                {language === 'es' ? '🇨🇷 Experiencias 100% Auténticas en Costa Rica' : '🇨🇷 100% Authentic Costa Rica Travel'}
              </span>
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-black text-emerald-950 leading-tight">
              {language === 'es' ? 'La magia de Costa Rica con los mejores guías y operadores locales.' : 'The magic of Costa Rica with top certified local guides and operators.'}
            </h2>
            
            <p className="text-neutral-600 text-lg leading-relaxed">
              {language === 'es' 
                ? 'En Costa Rica Tours (costaricatours.es) somos tu agencia y operador receptivo de confianza en Costa Rica. Centralizamos los mejores tours, traslados y expediciones en un solo lugar con tarifas oficiales garantizadas, guías naturalistas certificados ICT, atención tica personalizada 24/7 y la seguridad que tu viaje merece con pura vida.'
                : 'At Costa Rica Tours (costaricatours.es), we are your premier receptive travel agency in Costa Rica. We bring together top-rated tours, private/shared shuttles, and adventures with direct official rates, certified ICT naturalist guides, 24/7 bilingual support, and complete peace of mind.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900 mb-1">{language === 'es' ? 'Operadores Certificados' : 'Certified Operators'}</h4>
                  <p className="text-sm text-neutral-600">{language === 'es' ? 'Filtramos rigurosamente a cada agencia para garantizar tu seguridad y calidad.' : 'We rigorously screen every agency to guarantee your safety and quality.'}</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0">
                  <HeartHandshake className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900 mb-1">{language === 'es' ? 'Precios Oficiales' : 'Official Prices'}</h4>
                  <p className="text-sm text-neutral-600">{language === 'es' ? 'Reserva con nosotros exactamente al mismo precio directo de las empresas.' : 'Book with us at the exact same direct price as the companies.'}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Image Collage */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-[4/5] sm:aspect-square rounded-[3rem] overflow-hidden relative shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80" 
                alt="Costa Rica Tours Aggregator" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-emerald-950/10 mix-blend-multiply" />
            </div>
            
            {/* Floating Badge */}
            <div className="absolute -bottom-8 -left-2 sm:bottom-8 sm:-left-12 bg-white p-6 rounded-3xl shadow-xl border border-neutral-100 max-w-[240px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Map className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex -space-x-2">
                  <span className="text-2xl font-black text-amber-500">+100</span>
                </div>
              </div>
              <p className="text-sm font-bold text-neutral-900 leading-tight">
                {language === 'es' ? 'Agencias Locales Verificadas en Nuestra Red' : 'Verified Local Agencies in Our Network'}
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
