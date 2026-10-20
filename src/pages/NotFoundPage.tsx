import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Compass, Map, MessageCircle } from 'lucide-react';
import type { Language, Tour } from '../types';
import { useTours } from '../contexts/ToursContext';
import { getLangText } from '../utils/i18n';

/** Robots value the app shell ships with; restored when the 404 view unmounts. */
export const NOT_FOUND_ROBOTS = 'noindex,follow';

const COPY = {
  es: {
    routeTitle: 'Esta página no existe',
    tourTitle: 'Tour no encontrado',
    routeBody: 'La dirección puede estar mal escrita o la página ya no está disponible.',
    tourBody: 'Este tour no existe o ya no está en el catálogo. Busca uno parecido:',
    searchLabel: 'Buscar tours',
    searchPlaceholder: 'Ej.: volcán, rafting, Manuel Antonio',
    searchButton: 'Buscar',
    tours: 'Tours',
    destinations: 'Destinos',
    assistant: 'Asistente',
    popular: 'Tours populares',
    home: 'Volver al inicio',
  },
  en: {
    routeTitle: 'This page does not exist',
    tourTitle: 'Tour not found',
    routeBody: 'The address may be mistyped or the page is no longer available.',
    tourBody: 'This tour does not exist or is no longer in the catalog. Find a similar one:',
    searchLabel: 'Search tours',
    searchPlaceholder: 'E.g. volcano, rafting, Manuel Antonio',
    searchButton: 'Search',
    tours: 'Tours',
    destinations: 'Destinations',
    assistant: 'Assistant',
    popular: 'Popular tours',
    home: 'Back to home',
  },
} as const;

/** Featured first, then by rating × reviews; only public fields (title, id). */
export function pickPopularTours(tours: readonly Tour[], limit = 4): Tour[] {
  const score = (t: Tour) => (t.featured ? 1e9 : 0) + (Number(t.rating) || 0) * (Number(t.reviewsCount) || 0);
  return [...tours].filter(t => t?.id && t.title).sort((a, b) => score(b) - score(a)).slice(0, limit);
}

/** Marks the current document as noindex while mounted (SPA-side 404). */
function useNoIndex() {
  useEffect(() => {
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previous = meta?.getAttribute('content') ?? null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', NOT_FOUND_ROBOTS);
    return () => {
      if (previous === null) meta?.remove();
      else meta?.setAttribute('content', previous);
    };
  }, []);
}

interface NotFoundPageProps {
  language: Language;
  variant?: 'route' | 'tour';
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ language, variant = 'route' }) => {
  const t = COPY[language === 'es' ? 'es' : 'en'];
  const navigate = useNavigate();
  const { tours } = useTours();
  const [query, setQuery] = useState('');
  const popular = useMemo(() => pickPopularTours(tours), [tours]);
  useNoIndex();

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim().slice(0, 250);
    navigate(q ? `/tours?q=${encodeURIComponent(q)}` : '/tours');
  };

  return (
    <main
      data-testid={variant === 'tour' ? 'tour-not-found' : 'not-found-page'}
      className="min-h-[70vh] px-4 py-16 sm:py-24 text-white"
      aria-labelledby="not-found-title"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-6xl font-black text-emerald-400" aria-hidden="true">404</p>
        <h1 id="not-found-title" className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
          {variant === 'tour' ? t.tourTitle : t.routeTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-stone-300">{variant === 'tour' ? t.tourBody : t.routeBody}</p>

        <form role="search" onSubmit={onSearch} className="mt-8 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="not-found-search" className="sr-only">{t.searchLabel}</label>
          <input
            id="not-found-search"
            type="search"
            value={query}
            maxLength={250}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="min-h-12 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button type="submit" className="min-h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 font-black text-stone-950 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200">
            <Search className="h-4 w-4" aria-hidden="true" />{t.searchButton}
          </button>
        </form>

        <nav aria-label={language === 'es' ? 'Enlaces útiles' : 'Helpful links'} className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/tours" className="min-h-11 inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-950/50 px-4 font-bold text-emerald-100 hover:bg-emerald-900/60"><Compass className="h-4 w-4" aria-hidden="true" />{t.tours}</Link>
          <Link to="/destinations" className="min-h-11 inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-950/50 px-4 font-bold text-emerald-100 hover:bg-emerald-900/60"><Map className="h-4 w-4" aria-hidden="true" />{t.destinations}</Link>
          <Link to="/ai" className="min-h-11 inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-950/50 px-4 font-bold text-emerald-100 hover:bg-emerald-900/60"><MessageCircle className="h-4 w-4" aria-hidden="true" />{t.assistant}</Link>
        </nav>
      </div>

      {popular.length > 0 && (
        <section className="mx-auto mt-12 max-w-4xl" aria-labelledby="not-found-popular">
          <h2 id="not-found-popular" className="text-xl font-black text-center">{t.popular}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {popular.map(tour => (
              <li key={tour.id}>
                <Link
                  to={`/tour/${encodeURIComponent(tour.slug || tour.id)}`}
                  className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                >
                  {tour.image && <img src={tour.image} alt="" loading="lazy" className="h-12 w-16 flex-none rounded-lg object-cover" />}
                  <span className="font-bold text-stone-100">{getLangText(tour.title, language)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-center"><Link to="/" className="text-emerald-300 underline underline-offset-4">{t.home}</Link></p>
    </main>
  );
};

export default NotFoundPage;
