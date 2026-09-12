const fs = require('fs');
let content = fs.readFileSync('./src/components/FlightBookingModal.tsx', 'utf8');

// Inputs and selects
content = content.replace(/className="w-full bg-stone-100\/60 border border-teal-500\/30 rounded-xl px-3 py-2 text-sm text-stone-900 font-bold focus:outline-none focus:border-orange-400"/g, 'className="input-modern"');
content = content.replace(/className="w-full bg-stone-100\/60 border border-teal-500\/30 rounded-xl px-3 py-2 text-sm text-stone-900 font-bold focus:outline-none focus:border-orange-400 cursor-pointer"/g, 'className="input-modern cursor-pointer"');

// Submit button
content = content.replace(/className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-stone-900 font-black py-4 rounded-xl shadow-lg hover:shadow-orange-400\/40 hover:scale-\[1.02\] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"/g, 'className="btn-primary w-full"');

// Labels
content = content.replace(/className="block text-\[10px\] font-black text-teal-400 uppercase tracking-widest mb-1"/g, 'className="label-modern"');
content = content.replace(/className="block text-\[10px\] font-black text-teal-600 uppercase tracking-widest mb-1"/g, 'className="label-modern"');

fs.writeFileSync('./src/components/FlightBookingModal.tsx', content, 'utf8');
