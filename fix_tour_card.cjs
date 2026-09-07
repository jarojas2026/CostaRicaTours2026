const fs = require('fs');
let code = fs.readFileSync('src/components/TourCard.tsx', 'utf8');

// Card outer container
code = code.replace(
  'bg-white/80 backdrop-blur-xl`',
  'bg-[#082319]/90 backdrop-blur-xl border-emerald-500/25 hover:border-amber-400 hover:shadow-[0_0_35px_rgba(245,158,11,0.25)]`'
);

code = code.replace(
  'hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]',
  'hover:shadow-[0_0_35px_rgba(245,158,11,0.25)]'
);

// Location pill
code = code.replace(
  'bg-white/50 px-2 py-1 rounded-full border border-stone-200/50',
  'bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40 text-amber-400'
);

// Title & Subtitle
code = code.replace(
  'text-stone-900 uppercase leading-tight group-hover:text-orange-400 transition-colors drop-shadow-md',
  'text-white uppercase leading-tight group-hover:text-amber-400 transition-colors drop-shadow-md'
);

code = code.replace(
  'text-base text-stone-700 line-clamp-2 leading-snug',
  'text-sm text-emerald-100/80 line-clamp-2 leading-relaxed'
);

// Agency guarantee ribbon
code = code.replace(
  'text-teal-300 bg-stone-100/60 px-2 py-0.5 rounded-md border border-stone-200',
  'text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-500/30'
);

// Duration & Price
code = code.replace(
  'bg-stone-50 text-orange-300 px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wider inline-block mb-1 border border-stone-200',
  'bg-emerald-950/80 text-amber-300 px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wider inline-block mb-1 border border-emerald-500/30'
);

code = code.replace(
  'text-[10px] font-bold uppercase text-stone-900/60 mr-1',
  'text-[10px] font-bold uppercase text-emerald-200/70 mr-1'
);

code = code.replace(
  'text-2xl font-black text-stone-900',
  'text-2xl font-black text-amber-400'
);

// Check details CTA button
code = code.replace(
  'bg-orange-500 hover:bg-teal-600 border border-orange-400 text-stone-900 font-black px-4 py-2.5 rounded-xl flex items-center justify-center transition-transform shadow-lg group-hover:scale-105 cursor-pointer flex-shrink-0 gap-2 text-xs uppercase',
  'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 border border-amber-300/40 text-stone-950 font-black px-4 sm:px-5 py-2.5 rounded-xl flex items-center justify-center transition-transform shadow-lg group-hover:scale-105 cursor-pointer flex-shrink-0 gap-2 text-xs uppercase'
);

// Mini map popup modal
code = code.replace(
  'bg-white/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto cursor-pointer',
  'bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto cursor-pointer'
);

code = code.replace(
  'relative bg-white/50 backdrop-blur-xl w-full max-w-xl max-h-[85vh] modal-scrollable overflow-y-auto rounded-[2.5rem] border border-stone-200/50 shadow-[0_0_50px_rgba(99,102,241,0.2)] space-y-0 text-stone-900',
  'relative bg-[#062017] backdrop-blur-xl w-full max-w-xl max-h-[85vh] modal-scrollable overflow-y-auto rounded-[2.5rem] border border-emerald-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-0 text-stone-100'
);

code = code.replace(
  'bg-stone-100/80 p-5 sm:p-6 border-b border-stone-200/50 flex items-start justify-between gap-4',
  'bg-[#041710] p-5 sm:p-6 border-b border-emerald-500/30 flex items-start justify-between gap-4'
);

code = code.replace(
  'text-lg sm:text-xl font-black text-stone-900 uppercase leading-snug',
  'text-lg sm:text-xl font-black text-white uppercase leading-snug'
);

code = code.replace(
  'text-xs text-stone-600',
  'text-xs text-emerald-200/80'
);

code = code.replace(
  'bg-stone-50 hover:bg-neutral-700 text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-full flex items-center gap-1 font-bold text-xs border border-black/10 transition-colors shadow-sm flex-shrink-0',
  'bg-emerald-950/80 hover:bg-emerald-900 text-stone-200 hover:text-white px-3 py-1.5 rounded-full flex items-center gap-1 font-bold text-xs border border-emerald-500/40 transition-colors shadow-sm flex-shrink-0'
);

// Favorite and compare button defaults
code = code.replaceAll(
  'bg-white/50 backdrop-blur-md text-stone-900 hover:text-rose-400 border-black/20 hover:scale-105',
  'bg-emerald-950/70 backdrop-blur-md text-stone-100 hover:text-rose-400 border-emerald-500/40 hover:scale-105'
);

code = code.replaceAll(
  'bg-white/50 backdrop-blur-md text-stone-900 hover:text-orange-400 border-black/20 hover:scale-105',
  'bg-emerald-950/70 backdrop-blur-md text-stone-100 hover:text-amber-400 border-emerald-500/40 hover:scale-105'
);

code = code.replaceAll(
  'bg-white/70 backdrop-blur-md text-orange-400 px-2.5 py-1 rounded-full text-xs font-black flex items-center w-fit gap-1 border border-black/10 shadow-sm',
  'bg-emerald-950/80 backdrop-blur-md text-amber-400 px-2.5 py-1 rounded-full text-xs font-black flex items-center w-fit gap-1 border border-emerald-500/30 shadow-sm'
);

code = code.replaceAll(
  'text-[10px] text-stone-900/80',
  'text-[10px] text-stone-300'
);

fs.writeFileSync('src/components/TourCard.tsx', code);
console.log('TourCard.tsx updated');
