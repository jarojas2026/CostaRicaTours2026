const fs = require('fs');
let code = fs.readFileSync('src/components/HomeTrustSections.tsx', 'utf8');

// Process step cards
code = code.replaceAll(
  'bg-white p-8 rounded-3xl border border-black/10 hover:border-amber-500/60 transition-all duration-300 group shadow-xl hover:shadow-2xl hover:-translate-y-1.5 flex flex-col justify-between',
  'bg-[#08261c]/90 backdrop-blur-md p-8 rounded-3xl border border-emerald-500/25 hover:border-amber-400/80 transition-all duration-300 group shadow-xl hover:shadow-2xl hover:-translate-y-1.5 flex flex-col justify-between'
);

code = code.replaceAll(
  'text-stone-700 text-sm leading-relaxed',
  'text-emerald-100/80 text-sm leading-relaxed'
);

code = code.replaceAll(
  'text-stone-700',
  'text-emerald-100/80'
);

// Testimonials section background
code = code.replace(
  'bg-stone-50 py-16 border-y border-black/10',
  'bg-[#051c14]/90 py-16 border-y border-emerald-500/20'
);

// Testimonial cards
code = code.replaceAll(
  'bg-stone-100/90 backdrop-blur-md rounded-2xl p-6 border border-black/10 hover:border-amber-400/50 transition-all flex flex-col justify-between shadow-lg',
  'bg-[#092b20]/90 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/25 hover:border-amber-400/60 transition-all flex flex-col justify-between shadow-xl'
);

code = code.replaceAll(
  'text-xs text-stone-600',
  'text-xs text-emerald-200/70'
);

code = code.replaceAll(
  'text-[11px] text-stone-600',
  'text-[11px] text-emerald-300/60'
);

// Partners cards
code = code.replaceAll(
  'bg-stone-100/60 border border-black/10 hover:border-teal-500/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105',
  'bg-[#08261c]/80 border border-emerald-500/25 hover:border-amber-400/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 shadow-md'
);

// Custom trip CTA banner
code = code.replace(
  'bg-white border-2 border-amber-500/40 p-8 sm:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.5)]',
  'bg-gradient-to-br from-[#0a2e21] via-[#07241a] to-[#041610] border-2 border-amber-500/40 p-8 sm:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.7)]'
);

// Global stone-900 heading replacements in trust sections
code = code.replaceAll(
  'text-stone-900 group-hover:text-amber-300',
  'text-white group-hover:text-amber-300'
);

code = code.replaceAll(
  'font-black text-stone-900',
  'font-black text-white'
);

code = code.replaceAll(
  'font-bold text-stone-900',
  'font-bold text-white'
);

code = code.replaceAll(
  'border-black/10',
  'border-emerald-500/20'
);

code = code.replaceAll(
  'text-stone-800 leading-relaxed',
  'text-emerald-100/90 leading-relaxed'
);

fs.writeFileSync('src/components/HomeTrustSections.tsx', code);
console.log('HomeTrustSections.tsx updated');
