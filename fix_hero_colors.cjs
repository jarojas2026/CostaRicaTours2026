const fs = require('fs');
let code = fs.readFileSync('src/components/HeroSection.tsx', 'utf8');

// Title & subtitle
code = code.replace(
  'text-5xl sm:text-7xl lg:text-8xl font-black leading-[1.1] text-stone-900 tracking-tight',
  'text-5xl sm:text-7xl lg:text-8xl font-black leading-[1.1] text-white tracking-tight'
);

code = code.replace(
  'text-lg sm:text-xl text-stone-50 max-w-2xl font-medium leading-relaxed drop-shadow-md',
  'text-lg sm:text-xl text-emerald-100/90 max-w-2xl font-medium leading-relaxed drop-shadow-md'
);

code = code.replace(
  'inline-flex items-center gap-2 px-4 py-1.5 bg-stone-100/60 text-stone-900 rounded-full text-sm font-bold uppercase tracking-widest border border-teal-500/30 backdrop-blur-md',
  'inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-950/80 text-emerald-300 rounded-full text-sm font-bold uppercase tracking-widest border border-emerald-500/40 backdrop-blur-md'
);

code = code.replace(
  '<Sparkles className="w-4 h-4 text-stone-800" />',
  '<Sparkles className="w-4 h-4 text-amber-400" />'
);

// Search container
code = code.replace(
  'bg-stone-100/10 backdrop-blur-md p-4 sm:p-5 rounded-[2rem] border border-black/10 shadow-2xl space-y-3 mt-6',
  'bg-[#07241a]/90 backdrop-blur-2xl p-4 sm:p-5 rounded-[2rem] border border-emerald-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.6)] space-y-3 mt-6'
);

// Search query input
code = code.replace(
  'className="w-full bg-white/20 text-stone-900 placeholder-emerald-100/60 text-sm px-4 py-3.5 rounded-xl border border-black/10 focus:outline-none focus:border-orange-400 transition-colors"',
  'className="w-full bg-emerald-950/70 text-white placeholder-emerald-200/50 text-sm px-4 py-3.5 rounded-xl border border-emerald-500/30 focus:outline-none focus:border-amber-400 transition-colors"'
);

// Select dropdowns
code = code.replaceAll(
  'className="w-full bg-white/40 text-stone-50 text-sm px-4 py-3.5 rounded-xl border border-black/10 focus:outline-none focus:border-orange-400 transition-colors cursor-pointer appearance-none"',
  'className="w-full bg-[#051c14] text-stone-100 text-sm px-4 py-3.5 rounded-xl border border-emerald-500/30 focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"'
);

// Hero action buttons
code = code.replace(
  'w-full sm:w-auto flex-1 bg-white/10 hover:bg-white/20 border border-black/20 backdrop-blur-md text-stone-900 font-extrabold text-sm uppercase py-3.5 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer',
  'w-full sm:w-auto flex-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 backdrop-blur-md text-white font-extrabold text-sm uppercase py-3.5 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer'
);

code = code.replace(
  'w-full sm:w-auto bg-white/[0.05] hover:bg-white/[0.1] text-stone-800 font-bold text-sm py-3.5 px-6 rounded-xl border border-black/10 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer',
  'w-full sm:w-auto bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-100 font-bold text-sm py-3.5 px-6 rounded-xl border border-emerald-500/30 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer'
);

// Direct exploration pills
code = code.replaceAll(
  'px-2.5 py-1 rounded-full bg-white/60 hover:bg-orange-500 hover:text-stone-900 border border-teal-500/30 text-stone-800 transition-colors cursor-pointer',
  'px-2.5 py-1 rounded-full bg-emerald-950/60 hover:bg-amber-500 hover:text-stone-950 border border-emerald-500/40 text-emerald-200 transition-colors cursor-pointer'
);

// Slide card texts
code = code.replace(
  'text-2xl sm:text-3xl font-black text-stone-900 uppercase leading-tight drop-shadow-md mb-2',
  'text-2xl sm:text-3xl font-black text-white uppercase leading-tight drop-shadow-md mb-2'
);

code = code.replace(
  'text-xs sm:text-sm text-stone-50 mb-4 drop-shadow line-clamp-3',
  'text-xs sm:text-sm text-stone-200 mb-4 drop-shadow line-clamp-3'
);

code = code.replace(
  'text-[10px] text-stone-900/80 font-bold uppercase',
  'text-[10px] text-stone-300 font-bold uppercase'
);

code = code.replace(
  'text-xl sm:text-2xl font-black text-orange-400',
  'text-xl sm:text-2xl font-black text-amber-400'
);

code = code.replace(
  'bg-white/10 hover:bg-white/20 border border-black/20 backdrop-blur-md text-stone-900 font-black px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs uppercase tracking-wider transition-colors shadow-lg',
  'bg-amber-500 hover:bg-amber-400 text-stone-950 font-black px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs uppercase tracking-wider transition-colors shadow-lg'
);

fs.writeFileSync('src/components/HeroSection.tsx', code);
console.log('HeroSection.tsx updated with rainforest theme');
