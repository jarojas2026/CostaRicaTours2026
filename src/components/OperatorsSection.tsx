import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, MapPin, ArrowRight, MessageCircle } from 'lucide-react';
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
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6 border-b border-emerald-500/20 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isEs ? 'Catálogo de Servicios y Operadores' : 'Services & Operators Catalog'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isEs ? 'Explora la red turística de Costa Rica' : 'Explore Costa Rica’s tourism network'}
          </h2>
          <p className="text-stone-300 text-sm sm:text-base max-w-2xl mt-2">
            {isEs
              ? 'Estos perfiles ayudan a descubrir opciones. La asignación del operador, el cupo, las condiciones y cualquier dato que deba estar vigente se verifican durante la solicitud antes de confirmar una reserva.'
              : 'These profiles help you discover options. Operator assignment, availability, conditions and any information that must be current are checked during the request before a booking is confirmed.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 bg-[#041910] border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold">
            {isEs ? 'Catálogo ≠ confirmación operativa' : 'Catalog ≠ operational confirmation'}
          </span>
        </div>
      </div>

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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-400 transition-colors">
                    {op.name}
                  </h3>
                  <p className="text-emerald-300 font-bold text-xs mt-1">
                    {op.tagline[language] || op.tagline.en}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-black text-stone-400 bg-black/40 border border-white/10 rounded-full px-3 py-1 shrink-0">
                  {isEs ? 'Perfil de catálogo' : 'Catalog profile'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-300">
                <span className="flex items-center gap-1 bg-[#020e09] px-2.5 py-1 rounded-xl border border-emerald-500/20">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{op.location}</span>
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                  {isEs ? 'Áreas del catálogo:' : 'Catalog areas:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(op.specialties[language] || op.specialties.en || []).map((spec: string, i: number) => (
                    <span key={i} className="text-xs font-bold text-emerald-200 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-relaxed text-stone-300">
                {isEs
                  ? 'Antes de pagar o emitir un voucher, Costa Rica Tours debe verificar disponibilidad real, proveedor asignado y condiciones aplicables al servicio solicitado.'
                  : 'Before payment or voucher issuance, Costa Rica Tours must verify real availability, the assigned provider and the conditions that apply to the requested service.'}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-stone-400 font-medium">
                {isEs ? 'Condiciones sujetas a verificación al solicitar.' : 'Conditions are verified when requested.'}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={`https://wa.me/50687959148?text=Hola,%20quisiera%20consultar%20disponibilidad%20de%20servicios%20relacionados%20con%20${encodeURIComponent(op.name)}.`}
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
