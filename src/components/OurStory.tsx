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
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-stone-100/50 blur-3xl pointer-events-none" />
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200">
              <Globe className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                {language === 'es' ? '🇨🇷 Planifica experiencias en Costa Rica' : '🇨🇷 Plan Costa Rica experiences'}
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-stone-950 leading-tight">
              {language === 'es'
                ? 'Explora Costa Rica con apoyo local y verificación operativa.'
                : 'Explore Costa Rica with local support and operational verification.'}
            </h2>

            <p className="text-neutral-600 text-lg leading-relaxed">
              {language === 'es'
                ? 'Costa Rica Tours reúne tours, traslados y expediciones para ayudarte a comparar y planificar. La disponibilidad real, el proveedor asignado, el precio aplicable y las condiciones del servicio se verifican antes de confirmar el pago o emitir un voucher.'
                : 'Costa Rica Tours brings tours, transfers and expeditions together so you can compare and plan. Real availability, the assigned provider, the applicable price and service conditions are verified before payment is confirmed or a voucher is issued.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900 mb-1">
                    {language === 'es' ? 'Verificación antes de reservar' : 'Verification before booking'}
                  </h4>
                  <p className="text-sm text-neutral-600">
                    {language === 'es'
                      ? 'El catálogo orienta la búsqueda; cupo, proveedor y condiciones se confirman con datos operativos antes de cerrar la reserva.'
                      : 'The catalog supports discovery; availability, provider and conditions are confirmed from operational data before the booking is finalized.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0">
                  <HeartHandshake className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900 mb-1">
                    {language === 'es' ? 'Condiciones claras' : 'Clear conditions'}
                  </h4>
                  <p className="text-sm text-neutral-600">
                    {language === 'es'
                      ? 'Los precios, políticas y detalles sujetos a cambios se presentan como confirmados solo cuando existe una fuente vigente que los respalda.'
                      : 'Prices, policies and time-sensitive details are presented as confirmed only when a current source supports them.'}
                  </p>
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
                src="https://images.unsplash.com/photo-1683414903327-f5a2fcb37020?auto=format&fit=crop&w=1200&q=85"
                alt="Costa Rica Tours travel planning"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-white/10 mix-blend-multiply" />
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-8 -left-2 sm:bottom-8 sm:-left-12 bg-white p-6 rounded-3xl shadow-xl border border-neutral-100 max-w-[240px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                  <Map className="w-5 h-5 text-teal-600" />
                </div>
                <div className="text-sm font-black uppercase tracking-wider text-orange-500">
                  {language === 'es' ? 'Red en evolución' : 'Growing network'}
                </div>
              </div>
              <p className="text-sm font-bold text-neutral-900 leading-tight">
                {language === 'es'
                  ? 'Catálogo turístico con verificación antes de confirmar.'
                  : 'Tourism catalog with verification before confirmation.'}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
