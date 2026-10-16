import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { Currency, Language, Tour } from '../types';
import { CATEGORIES, REGIONS } from '../data/catalogMeta';
import { getLangText } from '../utils/i18n';
import { formatApproxConversion, formatUsdReference } from '../utils/referencePrice';
import { useExchangeRate } from './ReferencePrice';
import { TOUR_COMMERCIAL_STATUS, tourReferencePrice, tourSource } from '../utils/tourResolver';

interface Props {
  tour: Tour;
  language: Language;
  currency: Currency;
}

/**
 * Ficha factual del tour: solo datos del catálogo y de la fuente del operador.
 * Sin ratings, reseñas, cupos ni contactos inventados.
 */
export const TourFacts: React.FC<Props> = ({ tour, language, currency }) => {
  const es = language === 'es';
  const lang = es ? 'es' : 'en';
  const region = REGIONS.find(r => r.id === tour.region);
  const category = CATEGORIES.find(c => c.id === tour.category);
  const price = tourReferencePrice(tour);
  const rate = useExchangeRate(currency);
  const approx = price.amountUSD === undefined ? undefined : formatApproxConversion(price.amountUSD, currency, rate, language);
  const source = tourSource(tour);
  const tbc = es ? 'Por confirmar' : 'To be confirmed';
  const rows: Array<[string, React.ReactNode]> = [
    [es ? 'Región' : 'Region', region ? getLangText(region.name, language) : (tour.location?.placeName || tbc)],
    [es ? 'Categoría' : 'Category', category ? getLangText(category.name, language) : tbc],
    [es ? 'Duración' : 'Duration', tour.duration || getLangText(tour.durationLabel, language) || tbc],
    [es ? 'Operador' : 'Operator', tour.operatorName || tbc],
    [es ? 'Fuente' : 'Source', source
      ? <span><a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 underline decoration-emerald-500/50 hover:text-amber-300">{es ? 'fuente' : 'source'}<ExternalLink aria-hidden="true" className="h-3 w-3" /></a><span className="text-stone-400"> · {(() => { try { return new URL(source.url).hostname.replace(/^www\./, ''); } catch { return ''; } })()}</span>{source.checkedAt && <span className="block text-stone-400">{es ? `Revisado el ${source.checkedAt}` : `Checked on ${source.checkedAt}`}</span>}</span>
      : (es ? 'Catálogo interno' : 'Internal catalog')],
    [es ? 'Estado' : 'Status', TOUR_COMMERCIAL_STATUS[lang]],
  ];

  return (
    <section aria-label={es ? 'Ficha del tour' : 'Tour facts'} data-testid="tour-facts" className="rounded-[2rem] border border-white/10 bg-stone-900/60 p-6">
      <div className="mb-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-stone-400">{price.amountUSD === undefined ? (es ? 'Precio' : 'Price') : price.label[lang]}</div>
        <div className="text-3xl font-black text-amber-400">
          {price.amountUSD === undefined ? price.label[lang] : <>{formatUsdReference(price.amountUSD)}{approx && <span className="ml-2 text-sm font-semibold text-stone-300">{approx}</span>}</>}
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] font-black uppercase tracking-widest text-stone-500">{label}</dt>
            <dd className="text-stone-200">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
