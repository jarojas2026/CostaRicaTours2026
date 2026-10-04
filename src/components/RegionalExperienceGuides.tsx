import React from 'react';
import { ArrowRight, ArrowUpRight, Compass, MessageCircle } from 'lucide-react';
import { Tour, TourRegion, Language } from '../types';
import { REGIONAL_EXPERIENCE_GUIDES } from '../data/regionalExperienceGuides';

interface RegionalExperienceGuidesProps {
  language: Language;
  tours: Tour[];
  onSelectRegion: (region: TourRegion) => void;
}

export const RegionalExperienceGuides: React.FC<RegionalExperienceGuidesProps> = ({ language, tours, onSelectRegion }) => {
  const es = language === 'es';

  return (
    <section aria-labelledby="regional-experience-guides" className="space-y-4 rounded-3xl border border-emerald-500/20 bg-[#051c14]/70 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-2 text-amber-300"><Compass size={19} /></span>
        <div>
          <h2 id="regional-experience-guides" className="text-lg sm:text-xl font-black text-white">
            {es ? 'Costa Rica es más que los destinos clásicos' : 'Costa Rica goes beyond the classic destinations'}
          </h2>
          <p className="mt-1 max-w-4xl text-xs sm:text-sm leading-relaxed text-stone-300">
            {es
              ? 'Explora ideas regionales documentadas por el ICT. Son guías para inspirarte, no ofertas ni cupos confirmados; verificamos operador, acceso, precio y disponibilidad antes de aceptar una reserva.'
              : 'Explore regional ideas documented by the Costa Rican Tourism Board. These are inspiration, not offers or confirmed inventory; we verify the operator, access, price and availability before accepting a booking.'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {REGIONAL_EXPERIENCE_GUIDES.map((guide) => {
          const count = tours.filter((tour) => tour.region === guide.regionId).length;
          const message = es
            ? `Hola, quiero planear una experiencia en ${guide.name.es}. ¿Qué opciones y operadores pueden verificar para mis fechas?`
            : `Hello, I'd like to plan an experience in ${guide.name.en}. Which options and operators can you verify for my dates?`;
          const whatsappUrl = `https://wa.me/50687959148?text=${encodeURIComponent(message)}`;

          return (
            <article key={guide.id} className="flex min-h-56 flex-col rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-extrabold leading-snug text-white">{guide.name[es ? 'es' : 'en']}</h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-300">{guide.description[es ? 'es' : 'en']}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={es ? 'Actividades de la región' : 'Regional activities'}>
                {guide.activities[es ? 'es' : 'en'].map((activity) => (
                  <li key={activity} className="rounded-full border border-emerald-400/20 bg-emerald-950/70 px-2.5 py-1 text-[10px] font-semibold text-emerald-100">{activity}</li>
                ))}
              </ul>

              <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                {count > 0 ? (
                  <button type="button" onClick={() => onSelectRegion(guide.regionId)} className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200">
                    {es ? `Ver ${count} ficha${count === 1 ? '' : 's'} del catálogo` : `View ${count} catalog ${count === 1 ? 'listing' : 'listings'}`} <ArrowRight size={14} />
                  </button>
                ) : (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200">
                    <MessageCircle size={14} /> {es ? 'Consultar opciones para esta zona' : 'Ask about options in this area'}
                  </a>
                )}
                <a href={guide.officialGuideUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-400 underline decoration-stone-600 underline-offset-2 hover:text-white">
                  {es ? 'Guía oficial ICT' : 'Official ICT guide'} <ArrowUpRight size={12} />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
