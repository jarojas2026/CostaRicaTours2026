import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

/** Tarjeta base con radio/ sombra consistentes (tokens del proyecto). Aditivo. */
export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5 transition-shadow ${hover ? 'hover:shadow-xl hover:shadow-emerald-900/20 hover:-translate-y-0.5' : ''} ${className}`}>
      {children}
    </div>
  );
}
