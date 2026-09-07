const fs = require('fs');
let code = fs.readFileSync('src/components/TourCard.tsx', 'utf8');

// The main card background:
code = code.replace(/bg-stone-900 border border-stone-800/g, 'bg-white border border-stone-200');

// The modal background (if any):
code = code.replace(/bg-stone-950/g, 'bg-white');
code = code.replace(/bg-neutral-900/g, 'bg-white');

// We should NOT replace text-white in TourCard globally because it has image overlays.
// Instead, let's just replace text-stone-200 to text-stone-600 and text-stone-300 to text-stone-800 for the body text of the card.
code = code.replace(/text-stone-300/g, 'text-stone-600');
code = code.replace(/text-stone-400/g, 'text-stone-500');

// Fix text-white inside the card body (not the image overlay).
// We know the image overlay is in the top section.
// Actually, it's easier to just do a smart replace or let it be. If the card is bg-white, any text-white in the body is invisible.
code = code.replace(/<h3 className="text-xl sm:text-2xl font-black text-white/g, '<h3 className="text-xl sm:text-2xl font-black text-stone-900');
code = code.replace(/<span className="text-2xl font-black text-white">/g, '<span className="text-2xl font-black text-stone-900">');
code = code.replace(/<span className="text-3xl font-black text-white/g, '<span className="text-3xl font-black text-stone-900');
code = code.replace(/<p className="text-sm text-stone-300/g, '<p className="text-sm text-stone-600');
code = code.replace(/text-white group-hover:text-amber-400/g, 'text-stone-900 group-hover:text-orange-500');

fs.writeFileSync('src/components/TourCard.tsx', code);
