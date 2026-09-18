import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Star, MapPin, Award, CheckCircle2, ArrowRight, ExternalLink, Users, Phone, MessageCircle } from 'lucide-react';
import { Language, OperatorProfile } from '../types';
import { OPERATORS } from '../data/toursData';
import { useNavigate } from 'react-router-dom';

interface OperatorsSectionProps {
  language: Language;
  onSelectOperator?: (operatorId: string) => void;
}

export const OperatorsSection: React.FC<OperatorsSectionProps> = ({ language, onSelectOperator }) => {
  const navigate = useNavigate();
  const isEs = language === 'es';

  return (
    <section id="operators-section" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6 border-b border-emerald-500/20 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isEs ? 'Red de Operadores Locales Certificados' : 'Certified Local Operator Network'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isEs ? 'Nuestros Operadores Turísticos de Confianza' : 'Our Trusted Tour Operators'}
          </h2>
          <p className="text-stone-300 text-sm sm:text-base max-w-2xl mt-2">
            {isEs
              ? 'Costa Rica Tours actúa como canal oficial de comercialización y atención al cliente para los mejores operadores turísticos locales de cada región del país.'
              : 'Costa Rica Tours serves as the official booking and customer support channel for top-rated local operators across every region of the country.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 bg-[#041910] border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold">
            {isEs ? 'Modelo Comercial 100% Transparente' : '100% Transparent Marketplace'}
          </span>
        </div>
      </div>

      {/* Operators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {OPERATORS.map((op: OperatorProfile, idx) => (
          <motion.div
            key={op.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[#041910] hover:bg-[#072418] border border-emerald-500/30 hover:border-amber-400/50 rounded-3xl p-6 sm:p-8 transition-all duration-300 shadow-xl flex flex-col justify-between group"
          >
            <div className="space-y-4">
              {/* Header inside card */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-400 transition-colors">
                      {op.name}
                    </h3>
                    {op.verifiedBadge && (
                      <span className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        <CheckCircle2 className="w-3 h-3 text-amber-400" />
                        {isEs ? 'Verificado' : 'Verified'}
                      </span>
                    )}
                  </div>
                  <p className="text-emerald-300 font-bold text-xs mt-1">
                    {op.tagline[language] || op.tagline.en}
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-black/60 px-3 py-1 rounded-2xl border border-white/10 shrink-0">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-white font-black text-sm">{op.rating}</span>
                  <span className="text-stone-400 text-xs font-normal">({op.reviewsCount})</span>
                </div>
              </div>

              {/* Location & Experience */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-300">
                <span className="flex items-center gap-1 bg-[#020e09] px-2.5 py-1 rounded-xl border border-emerald-500/20">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{op.location}</span>
                </span>
                <span className="flex items-center gap-1 bg-[#020e09] px-2.5 py-1 rounded-xl border border-emerald-500/20">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{op.yearsExperience} {isEs ? 'años de experiencia' : 'years experience'}</span>
                </span>
              </div>

              {/* Description */}
              <p className="text-stone-300 text-sm leading-relaxed">
                {op.description[language] || op.description.en}
              </p>

              {/* Specialties */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                  {isEs ? 'Especialidades:' : 'Specialties:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(op.specialties[language] || op.specialties.en || []).map((spec: string, i: number) => (
                    <span key={i} className="text-xs font-bold text-emerald-200 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="mt-6 pt-5 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-stone-400 font-medium">
                {op.cancellationPolicy[language] || op.cancellationPolicy.en}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={`https://wa.me/50687959148?text=Hola,%20quisiera%20consultar%20disponibilidad%20de%20tours%20con%20el%20operador%20${encodeURIComponent(op.name)}.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] px-3.5 py-2 rounded-xl text-xs font-bold border border-[#25D366]/40 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Consultar' : 'Inquire'}</span>
                </a>
                <button
                  onClick={() => {
                    if (onSelectOperator) onSelectOperator(op.id);
                    navigate('/tours');
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer shadow-md"
                >
                  <span>{isEs ? 'Ver Tours' : 'View Tours'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
