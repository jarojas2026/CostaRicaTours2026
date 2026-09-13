const fs = require('fs');
let content = fs.readFileSync('src/components/MyBookingsModal.tsx', 'utf8');

content = content.replace('bg-stone-50 border-2 border-black/10 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl relative text-white', 'bg-stone-50 border-2 border-black/10 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl relative text-stone-900');
content = content.replace('text-xs text-[#A7F3D0]', 'text-xs text-stone-500'); // Note: multiple replacements needed
content = content.replace(/text-\[\#A7F3D0\]/g, 'text-stone-500');
content = content.replace('p-2 text-white hover:text-[#FF8C00]', 'p-2 text-stone-400 hover:text-orange-500');
content = content.replace('text-xs text-white placeholder-stone-500', 'text-xs text-stone-900 placeholder-stone-400');
content = content.replace('text-lg font-bold text-white', 'text-lg font-bold text-stone-900');
content = content.replace('text-sm font-black text-white', 'text-sm font-black text-stone-900');
content = content.replace('text-[10px] text-teal-300', 'text-[10px] text-teal-700');
content = content.replace('bg-stone-100 hover:bg-stone-200 text-white font-black', 'bg-stone-100 hover:bg-stone-200 text-stone-900 font-black');

fs.writeFileSync('src/components/MyBookingsModal.tsx', content, 'utf8');
console.log('Fixed contrast');
