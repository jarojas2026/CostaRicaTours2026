import React from 'react';
import type { Language } from '../types';

/**
 * Sistema de marca "my" (#399). Solo UI: no cambia dominio, URLs canónicas ni SEO.
 * El "my" usa el acento emerald existente; la microinteracción solo corre con
 * `motion-safe:` (se desactiva con prefers-reduced-motion).
 */
export const MY_MARK_CLASS =
  'inline-block font-black text-emerald-300 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:scale-110 motion-safe:group-focus-visible:-translate-y-0.5 motion-safe:group-active:scale-95';

/** Nombres fijos, iguales en ES y EN. */
export const MY_SECTIONS = {
  trip: { name: 'Trip', label: 'My Trip', nameEs: 'viaje', labelEs: 'Mi viaje', to: '/trip' },
  planner: { name: 'Planner', label: 'My Planner', nameEs: 'planificador', labelEs: 'Mi planificador', to: '/itinerary' },
  bookings: { name: 'Bookings', label: 'My Bookings', nameEs: 'reservas', labelEs: 'Mis reservas', to: null },
  flights: { name: 'Flights', label: 'My Flights', nameEs: 'vuelos', labelEs: 'Mis vuelos', to: '/flights' },
} as const;
export type MySection = keyof typeof MY_SECTIONS;

export const MyMark: React.FC<{ text?: 'my' | 'My' | 'Mi' | 'Mis'; className?: string }> = ({ text = 'my', className = '' }) => (
  <span data-brand="my" className={`${MY_MARK_CLASS} ${className}`}>{text}</span>
);

/** Wordmark del encabezado: myCostaRicaTours. */
export const MyWordmark: React.FC = () => (
  <span data-testid="brand-wordmark" className="tracking-tight">
    <MyMark />
    <span className="text-white">CostaRica</span>
    <span className="text-amber-400">Tours</span>
  </span>
);

/** Etiqueta de sección del viajero localizada (ES/EN), sin alterar el wordmark comercial. */
export const MyLabel: React.FC<{ section: MySection; language?: Language }> = ({ section, language = 'en' }) => {
  const es = language === 'es';
  const item = MY_SECTIONS[section];
  const prefix = es ? (section === 'bookings' || section === 'flights' ? 'Mis' : 'Mi') : 'My';
  return (
    <span data-testid={`my-label-${section}`} aria-label={es ? item.labelEs : item.label}>
      <MyMark text={es ? prefix : 'My'} />
      <span aria-hidden="true">{' '}{es ? item.nameEs : item.name}</span>
    </span>
  );
};
