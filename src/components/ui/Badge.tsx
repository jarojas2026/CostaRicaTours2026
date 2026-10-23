import React from 'react';

type BadgeTone = 'emerald' | 'amber' | 'coral' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const tones: Record<BadgeTone, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  coral: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  neutral: 'bg-white/5 text-stone-300 border-white/10',
};

/** Badge consistente (reemplaza badges genéricos "SECURE/PURA VIDA" por estados reales). Aditivo. */
export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
