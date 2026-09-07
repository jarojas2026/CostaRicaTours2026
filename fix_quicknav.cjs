const fs = require('fs');
let code = fs.readFileSync('src/components/HomeQuickNav.tsx', 'utf8');

// Update card gradients to rich rainforest palettes
code = code.replace(
  "gradient: 'bg-white hover:border-orange-400/60'",
  "gradient: 'from-[#0b3323] to-[#051c14] hover:border-amber-400/80'"
);
code = code.replace(
  "gradient: 'bg-white hover:border-orange-400/80'",
  "gradient: 'from-[#0d3d2c] to-[#072419] hover:border-amber-400'"
);
code = code.replace(
  "gradient: 'from-teal-950/90 to-stone-950/90 hover:border-teal-400/60'",
  "gradient: 'from-[#072c29] to-[#041a18] hover:border-teal-400/80'"
);
code = code.replace(
  "gradient: 'from-amber-950/70 to-stone-950/90 hover:border-orange-400/80'",
  "gradient: 'from-[#222110] to-[#0c1409] hover:border-amber-400/80'"
);
code = code.replace(
  "gradient: 'from-amber-950/80 to-stone-950/90 hover:border-orange-400/60'",
  "gradient: 'from-[#261d11] to-[#120f09] hover:border-amber-400/80'"
);
code = code.replace(
  "gradient: 'bg-white hover:border-teal-400/60'",
  "gradient: 'from-[#092e22] to-[#041711] hover:border-teal-400/80'"
);
code = code.replace(
  "gradient: 'from-purple-950/80 to-stone-950/90 hover:border-purple-400/60'",
  "gradient: 'from-[#1b192e] to-[#0d0c18] hover:border-purple-400/80'"
);
code = code.replace(
  "gradient: 'from-amber-950/90 to-stone-950/90 hover:border-amber-400/60'",
  "gradient: 'from-[#292211] to-[#141007] hover:border-amber-400/80'"
);

// Headings and texts in quicknav
code = code.replace(
  'text-2xl sm:text-3xl font-black text-stone-900',
  'text-2xl sm:text-3xl font-black text-white'
);

code = code.replace(
  'text-sm text-stone-800/80 max-w-md',
  'text-sm text-emerald-100/80 max-w-md'
);

code = code.replaceAll(
  'text-base font-black text-stone-900 group-hover:text-orange-400 transition-colors',
  'text-base font-black text-white group-hover:text-amber-400 transition-colors'
);

code = code.replaceAll(
  'text-xs text-stone-700 leading-relaxed mt-1 line-clamp-2',
  'text-xs text-emerald-100/75 leading-relaxed mt-1 line-clamp-2'
);

code = code.replaceAll(
  'text-xs font-bold text-orange-400 group-hover:translate-x-1 transition-transform',
  'text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform'
);

// Highlight cards section
code = code.replace(
  'text-2xl sm:text-3xl font-black text-stone-900',
  'text-2xl sm:text-3xl font-black text-white'
);

code = code.replace(
  'group relative rounded-3xl bg-stone-100/30 border border-teal-500/20 overflow-hidden shadow-xl hover:border-orange-400/50 cursor-pointer flex flex-col justify-between',
  'group relative rounded-3xl bg-[#08241b]/90 border border-emerald-500/30 overflow-hidden shadow-xl hover:border-amber-400/60 cursor-pointer flex flex-col justify-between'
);

code = code.replaceAll(
  'text-lg font-black text-stone-900 group-hover:text-orange-400 transition-colors line-clamp-1',
  'text-lg font-black text-white group-hover:text-amber-400 transition-colors line-clamp-1'
);

code = code.replaceAll(
  'text-xs text-stone-700 leading-relaxed line-clamp-2 mt-1.5',
  'text-xs text-emerald-100/80 leading-relaxed line-clamp-2 mt-1.5'
);

code = code.replaceAll(
  'border-t border-stone-200/60',
  'border-t border-emerald-500/25'
);

code = code.replaceAll(
  'text-stone-800/90 flex items-center gap-3',
  'text-emerald-100/90 flex items-center gap-3'
);

// Guarantee strip
code = code.replace(
  'bg-stone-50 rounded-3xl p-6 sm:p-7 border border-teal-500/30 backdrop-blur-md shadow-xl',
  'bg-[#062017]/95 rounded-3xl p-6 sm:p-7 border border-emerald-500/30 backdrop-blur-md shadow-2xl text-white'
);

code = code.replaceAll(
  'text-base font-black text-stone-900',
  'text-base font-black text-white'
);

code = code.replaceAll(
  'text-xs text-stone-700 leading-relaxed',
  'text-xs text-emerald-100/80 leading-relaxed'
);

code = code.replaceAll(
  'bg-white/80 backdrop-blur-md',
  'bg-[#051a13]/90 backdrop-blur-md'
);

fs.writeFileSync('src/components/HomeQuickNav.tsx', code);
console.log('HomeQuickNav.tsx updated');
