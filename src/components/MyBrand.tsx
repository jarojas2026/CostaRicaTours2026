import React from 'react';

/**
 * Sistema de marca "my" (#399). Solo UI: no cambia dominio, URLs canónicas ni SEO.
 * El "my" usa el acento emerald existente; la microinteracción solo corre con
 * `motion-safe:` (se desactiva con prefers-reduced-motion).
 */
export const MY_MARK_CLASS =
  'inline-block font-black text-emerald-300 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:scale-110 motion-safe:group-focus-visible:-translate-y-0.5 motion-safe:group-active:scale-95';

/** Nombres fijos, iguales en ES y EN. */
export const MY_SECTIONS = {
  trip: { name: 'Trip', label: 'My Trip', to: '/trip' },
  planner: { name: 'Planner', label: 'My Planner', to: '/itinerary' },
  bookings: { name: 'Bookings', label: 'My Bookings', to: null },
  flights: { name: 'Flights', label: 'My Flights', to: '/flights' },
} as const;
export type MySection = keyof typeof MY_SECTIONS;

export const MyMark: React.FC<{ text?: 'my' | 'My'; className?: string }> = ({ text = 'my', className = '' }) => (
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

/** Etiqueta de sección del viajero: "My" resaltado + nombre fijo. */
export const MyLabel: React.FC<{ section: MySection }> = ({ section }) => (
  <span data-testid={`my-label-${section}`} aria-label={MY_SECTIONS[section].label}>
    <MyMark text="My" />
    <span aria-hidden="true">{' '}{MY_SECTIONS[section].name}</span>
  </span>
);
