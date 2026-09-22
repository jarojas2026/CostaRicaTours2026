import React from 'react';
import type { Language } from '../types';

export function SmartTripAdvisor({ language = 'es' }: { language?: Language }) {
  const es = language === 'es';
  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-6">
      <h3 className="text-xl font-black text-white">{es ? 'Asesor Inteligente de Viajes' : 'Smart Trip Advisor'}</h3>
      <p className="text-stone-300 text-sm mt-2">{es ? 'Recomendaciones curadas por IA y expertos locales en Costa Rica.' : 'AI and local expert curated recommendations in Costa Rica.'}</p>
    </div>
  );
}
