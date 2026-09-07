const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// 1. Header container
code = code.replace(
  'bg-stone-100/95 backdrop-blur-md border-b border-black/10 text-stone-900 shadow-xl transition-all duration-200',
  'bg-[#051c14]/95 backdrop-blur-md border-b border-emerald-500/20 text-white shadow-2xl transition-all duration-200'
);

// 2. Top Assistance & Trust Strip
code = code.replace(
  'bg-white/90 text-xs px-3 sm:px-6 py-1 border-b border-black/10 text-stone-800/90',
  'bg-[#03130d]/90 text-xs px-3 sm:px-6 py-1 border-b border-emerald-500/20 text-emerald-100/80'
);

code = code.replace(
  'inline-flex items-center gap-1.5 bg-orange-500/15 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30 font-bold',
  'inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40 font-bold'
);

code = code.replace(
  'inline-flex items-center gap-1 text-stone-900 hover:text-stone-900 font-bold transition-colors',
  'inline-flex items-center gap-1 text-stone-200 hover:text-white font-bold transition-colors'
);

code = code.replace(
  'WhatsApp 24/7: <strong className="text-stone-900">+506 8795-9148</strong>',
  'WhatsApp 24/7: <strong className="text-amber-400">+506 8795-9148</strong>'
);

code = code.replace(
  'hidden sm:flex items-center gap-2 text-[11px] font-bold text-orange-300 shrink-0',
  'hidden sm:flex items-center gap-2 text-[11px] font-bold text-amber-300 shrink-0'
);

// 3. Brand Logo
code = code.replace(
  'text-sm sm:text-xl font-black tracking-tighter uppercase leading-none text-stone-900 flex items-center gap-1.5',
  'text-sm sm:text-xl font-black tracking-tighter uppercase leading-none text-white flex items-center gap-1.5'
);

code = code.replace(
  'text-[8px] sm:text-[9px] tracking-[0.2em] uppercase font-bold text-stone-600 block mt-1',
  'text-[8px] sm:text-[9px] tracking-[0.2em] uppercase font-bold text-emerald-400/90 block mt-1'
);

// 4. Primary nav links
code = code.replaceAll('text-stone-600 hover:text-stone-900', 'text-stone-300 hover:text-amber-400');
code = code.replaceAll('text-stone-800 hover:text-orange-300', 'text-stone-300 hover:text-amber-300');

// 5. Selectors buttons
code = code.replaceAll(
  'bg-stone-100/70 hover:bg-stone-100 px-2 sm:px-2.5 py-1.5 rounded-xl border border-teal-500/40 text-[11px] font-bold text-stone-900',
  'bg-emerald-950/70 hover:bg-emerald-900/80 px-2 sm:px-2.5 py-1.5 rounded-xl border border-emerald-500/40 text-[11px] font-bold text-stone-100'
);

// 6. Selectors dropdowns
code = code.replaceAll(
  'bg-stone-50 rounded-2xl shadow-2xl border border-black/20 z-50',
  'bg-[#07241a] rounded-2xl shadow-2xl border border-emerald-500/40 z-50 text-stone-100'
);

code = code.replaceAll(
  'text-stone-800 hover:bg-stone-200/80 hover:text-stone-900',
  'text-stone-200 hover:bg-emerald-900/60 hover:text-white'
);

code = code.replaceAll(
  'font-mono text-stone-800 font-bold uppercase',
  'font-mono text-stone-100 font-bold uppercase'
);

// 7. Bookings button
code = code.replace(
  'bg-stone-100 hover:bg-teal-700 text-white px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs border border-teal-500/40 transition-all hover:scale-105 cursor-pointer shadow-sm shrink-0',
  'bg-emerald-900/80 hover:bg-emerald-800 text-white px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs border border-emerald-500/40 transition-all hover:scale-105 cursor-pointer shadow-sm shrink-0'
);

// 8. Sign in button
code = code.replace(
  'bg-white hover:bg-stone-50 text-stone-800 px-2.5 py-1.5 rounded-xl border border-teal-600/30',
  'bg-emerald-950/80 hover:bg-emerald-900 text-stone-100 px-2.5 py-1.5 rounded-xl border border-emerald-500/40'
);

// 9. Mobile hamburger button
code = code.replace(
  'bg-stone-100/90 hover:bg-stone-100 text-stone-900 border border-teal-500/40',
  'bg-emerald-950/80 hover:bg-emerald-900 text-stone-100 border border-emerald-500/40'
);

// 10. Drawer container
code = code.replace(
  'bg-stone-50 border border-black/20 rounded-3xl z-[100] shadow-2xl p-4 sm:p-5 overflow-y-auto xl:hidden space-y-4 animate-fade-in modal-scrollable',
  'bg-[#061f17] border border-emerald-500/30 rounded-3xl z-[100] shadow-2xl p-4 sm:p-5 overflow-y-auto xl:hidden space-y-4 animate-fade-in modal-scrollable text-white'
);

code = code.replace(
  'text-xs font-black text-stone-900 uppercase tracking-wider block',
  'text-xs font-black text-white uppercase tracking-wider block'
);

code = code.replaceAll('bg-stone-100 text-stone-900', 'bg-emerald-950/80 text-stone-100 border border-emerald-500/30');
code = code.replaceAll('bg-stone-50 text-stone-900', 'bg-emerald-950/60 text-stone-100');

fs.writeFileSync('src/components/Header.tsx', code);
console.log('Header.tsx updated with rainforest theme');
