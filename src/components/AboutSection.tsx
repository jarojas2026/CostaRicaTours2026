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
      title: { es: 'Verificación Operativa', en: 'Operational Verification' },
      desc: { es: 'El cupo, las condiciones y los datos del operador se verifican durante el proceso de reserva antes de presentarlos como confirmados.', en: 'Availability, operating conditions and operator details are checked during booking before they are presented as confirmed.' }
    },
    {
      icon: Leaf,
      title: { es: 'Turismo Responsable', en: 'Responsible Tourism' },
      desc: { es: 'Priorizamos experiencias que respeten áreas protegidas, comunidades y condiciones reales de operación.', en: 'We prioritize experiences that respect protected areas, communities and real operating conditions.' }
    },
    {
      icon: Heart,
      title: { es: 'Asistencia Durante el Viaje', en: 'Trip Assistance' },
      desc: { es: 'El asistente digital mantiene el contexto del viaje y deriva a atención humana cuando una decisión requiere supervisión.', en: 'The digital assistant keeps trip context and escalates to human support when a decision requires supervision.' }
    },
    {
      icon: Users,
      title: { es: 'Red Local', en: 'Local Network' },
      desc: { es: 'La plataforma está diseñada para coordinar servicios turísticos de Costa Rica sin presentar como verificado aquello que todavía requiere confirmación.', en: 'The platform is designed to coordinate Costa Rica travel services without presenting unverified details as confirmed.' }
    },
    {
      icon: Globe,
      title: { es: 'Plataforma Internacional', en: 'Global Platform' },
      desc: { es: 'Diseñada para conectar viajeros con experiencias, servicios y operadores de distintas regiones de Costa Rica.', en: 'Designed to connect travelers with experiences, services and operators across Costa Rica.' }
    },
    {
      icon: Award,
      title: { es: 'Selección con Contexto', en: 'Context-Aware Selection' },
      desc: { es: 'Las recomendaciones combinan catálogo, ruta, preferencias y verificaciones operativas cuando la información necesita estar vigente.', en: 'Recommendations combine catalog data, route, preferences and operational checks whenever information must be current.' }
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
          <h2 className="text-emerald-500 font-black uppercase tracking-[0.3em] text-sm mb-4">{language === 'es' ? 'Sobre Nosotros' : 'About Us'}</h2>
          <h3 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter leading-tight">
            {language === 'es' ? 'Planificando viajes por' : 'Planning trips across'} <span className="text-emerald-500 italic">Costa Rica</span>
          </h3>
          <p className="text-stone-400 text-lg mb-8 leading-relaxed">
            {language === 'es' 
              ? 'Costa Rica Tours conecta planificación, catálogo, asistencia y operación en una sola experiencia. Nuestro objetivo es ayudarte a construir el viaje paso a paso y distinguir con claridad entre una recomendación, una verificación y una reserva realmente confirmada.'
              : 'Costa Rica Tours connects planning, catalog, assistance and operations in one experience. Our goal is to help you build your trip step by step and clearly distinguish between a recommendation, a verification and a truly confirmed booking.'}
          </p>
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="text-4xl font-black text-emerald-400 mb-1">6</div>
              <div className="text-stone-500 text-xs uppercase font-bold tracking-widest">{language === 'es' ? 'Idiomas' : 'Languages'}</div>
            </div>
            <div>
              <div className="text-4xl font-black text-emerald-400 mb-1">1</div>
              <div className="text-stone-500 text-xs uppercase font-bold tracking-widest">{language === 'es' ? 'Asistente de Viaje' : 'Travel Assistant'}</div>
            </div>
            <div>
              <div className="text-4xl font-black text-emerald-400 mb-1">LIVE</div>
              <div className="text-stone-500 text-xs uppercase font-bold tracking-widest">{language === 'es' ? 'Verificación cuando aplica' : 'Verification when needed'}</div>
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
