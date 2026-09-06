const fs = require('fs');

function replaceTextWhite(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace standalone `text-white` with `text-stone-900` when NOT preceded by `bg-orange-` or `bg-teal-`
    // Since regex in JS doesn't easily support negative lookbehind of arbitrary length, we'll replace all text-white
    // Then replace it back where needed.
    
    content = content.replace(/text-white/g, 'text-stone-900');
    
    // Revert back for primary buttons
    content = content.replace(/bg-orange-([0-9]+) text-stone-900/g, 'bg-orange-$1 text-white');
    content = content.replace(/bg-orange-([0-9]+)\/([0-9]+) text-stone-900/g, 'bg-orange-$1/$2 text-white');
    content = content.replace(/text-stone-900 font-black text-sm uppercase py-3.5 px-7/g, 'text-white font-black text-sm uppercase py-3.5 px-7'); // Hero CTA
    content = content.replace(/bg-teal-([0-9]+) text-stone-900/g, 'bg-teal-$1 text-white');
    content = content.replace(/bg-teal-([0-9]+) flex items-center justify-center text-stone-900/g, 'bg-teal-$1 flex items-center justify-center text-white'); // header badge
    content = content.replace(/bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-500 text-stone-900/g, 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-500 text-white');
    content = content.replace(/selection:text-stone-900/g, 'selection:text-white');
    content = content.replace(/bg-orange-500 rounded-xl flex items-center justify-center text-stone-900/g, 'bg-orange-500 rounded-xl flex items-center justify-center text-white');
    
    fs.writeFileSync(filePath, content);
}

replaceTextWhite('src/App.tsx');
replaceTextWhite('src/components/HeroSection.tsx');
replaceTextWhite('src/components/Header.tsx');
replaceTextWhite('src/components/ToursGrid.tsx');
replaceTextWhite('src/components/TourCard.tsx');
replaceTextWhite('src/components/TourDetailModal.tsx');
console.log("Fixed text-white usages!");
