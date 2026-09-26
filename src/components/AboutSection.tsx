import React from 'react';
import { motion } from 'motion/react';
import { Language } from '../types';
import { ShieldCheck, Leaf, Heart, Users, Globe, Award } from 'lucide-react';

interface AboutSectionProps {
  language: Language;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ language }) => {
  const features = [
    {
      icon: ShieldCheck,
      title: { es: 'Información Operativa Verificada', en: 'Verified Operational Information' },
      desc: { es: 'La plataforma distingue los datos verificados de la información pendiente de validación antes de operar una reserva.', en: 'The platform separates verified data from information still requiring validation before a reservation is operational.' }
    },
    {
      icon: Leaf,
      title: { es: 'Turismo Sostenible', en: 'Sustainable Tourism' },
      desc: { es: 'Promovemos experiencias que respetan el ambiente y las comunidades.', en: 'We promote experiences that respect the environment and local communities.' }
    },
    {
      icon: Heart,
      title: { es: 'Soporte Multicanal', en: 'Multichannel Support' },
      desc: { es: 'Atención mediante los canales integrados de la plataforma, con escalamiento humano para excepciones operativas.', en: 'Support through the platform’s integrated channels, with human escalation for operational exceptions.' }
    },
    {
      icon: Users,
      title: { es: 'Impacto Local', en: 'Local Impact' },
      desc: { es: 'Trabajamos para conectar viajeros con proveedores y experiencias de Costa Rica.', en: 'We connect travelers with Costa Rica experiences and local providers.' }
    },
    {
      icon: Globe,
      title: { es: 'Plataforma Internacional', en: 'Global Platform' },
      desc: { es: 'Diseñada para conectar viajeros con experiencias, servicios y operadores de todo Costa Rica.', en: 'Designed to connect travelers with experiences, services and operators across Costa Rica.' }
    },
    {
      icon: Award,
      title: { es: 'Planificación Inteligente', en: 'Intelligent Planning' },
      desc: { es: 'La IA combina catálogo, memoria del viajero, ruta, clima y disponibilidad cuando esos datos están disponibles.', en: 'AI combines catalog, traveler memory, routing, weather and availability when those data sources are available.' }
    }
  ];

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-emerald-500 font-black uppercase tracking-[0.3em] text-sm mb-4">Sobre Nosotros</h2>
          <h3 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter leading-tight">
            Redefiniendo el Turismo en <span className="text-emerald-500 italic">Costa Rica</span>
          </h3>
          <p className="text-stone-400 text-lg mb-8 leading-relaxed">
            {language === 'es' 
              ? 'Nacimos en el corazón de Pérez Zeledón con una misión clara: conectar a los viajeros con la esencia real de Costa Rica. No somos solo una web de reservas; somos el puente entre operadores locales apasionados y aventureros internacionales.'
              : 'Born in the heart of Pérez Zeledón with a clear mission: to connect travelers with the real essence of Costa Rica. We are not just a booking site; we are the bridge between passionate local operators and international adventurers.'}
          </p>
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="text-3xl font-black text-emerald-400 mb-1">🇨🇷</div>
              <div className="text-stone-500 text-xs uppercase font-bold tracking-widest">Catálogo Nacional</div>
            </div>
            <div>
              <div className="text-4xl font-black text-emerald-400 mb-1">6</div>
              <div className="text-stone-500 text-xs uppercase font-bold tracking-widest">Idiomas</div>
            </div>
            <div>
              <div className="text-4xl font-black text-emerald-400 mb-1">7</div>
              <div className="text-stone-500 text-xs uppercase font-bold tracking-widest">Regiones</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="aspect-square rounded-[3rem] overflow-hidden border-8 border-stone-900 shadow-2xl relative z-10">
            <img 
              src="https://images.unsplash.com/photo-1683414903327-f5a2fcb37020?auto=format&fit=crop&w=1200&q=85" 
              alt="Costa Rica Jungle" 
              className="w-full h-full object-cover"
            />
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 blur-3xl rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="p-8 bg-stone-900/30 border border-white/5 rounded-3xl hover:bg-stone-900/50 transition-all duration-300 group"
          >
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 transition-colors">
              <f.icon className="w-7 h-7 text-emerald-400 group-hover:text-stone-950 transition-colors" />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">{(f.title as any)[language] || f.title.en}</h4>
            <p className="text-stone-400 text-sm leading-relaxed">{(f.desc as any)[language] || f.desc.en}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
