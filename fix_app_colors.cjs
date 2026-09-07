const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace outer wrapper
code = code.replace(
  'min-h-screen bg-white text-stone-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white relative pb-16 xl:pb-0',
  'min-h-screen bg-[#041711] text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950 relative pb-16 xl:pb-0'
);

// Replace breadcrumb container
code = code.replace(
  'bg-stone-100/60 border-b border-teal-500/20 py-2.5 px-4 sm:px-6 lg:px-8',
  'bg-[#07241a]/90 backdrop-blur-md border-b border-emerald-500/20 py-2.5 px-4 sm:px-6 lg:px-8'
);

// Replace breadcrumbs text
code = code.replace(
  'flex items-center gap-2 text-stone-800',
  'flex items-center gap-2 text-stone-300'
);

// Replace breadcrumbs buttons
code = code.replace(
  'flex items-center gap-1 text-[11px] font-bold bg-white hover:bg-stone-100 text-stone-800 hover:text-stone-900 px-3 py-1 rounded-full border border-teal-500/30 transition-colors cursor-pointer',
  'flex items-center gap-1 text-[11px] font-bold bg-emerald-950/70 hover:bg-emerald-900/80 text-stone-100 px-3 py-1 rounded-full border border-emerald-500/40 transition-colors cursor-pointer'
);

code = code.replace(
  'hidden sm:flex items-center gap-1 text-[11px] font-bold bg-white hover:bg-stone-100 text-orange-300 hover:text-orange-200 px-3 py-1 rounded-full border border-teal-500/30 transition-colors cursor-pointer',
  'hidden sm:flex items-center gap-1 text-[11px] font-bold bg-emerald-950/70 hover:bg-emerald-900/80 text-amber-300 hover:text-amber-200 px-3 py-1 rounded-full border border-emerald-500/40 transition-colors cursor-pointer'
);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx updated with rainforest theme');
