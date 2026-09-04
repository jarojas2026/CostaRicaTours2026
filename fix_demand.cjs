const fs = require('fs');

// 1. TourCard.tsx
let tourCard = fs.readFileSync('src/components/TourCard.tsx', 'utf8');
tourCard = tourCard.replace(/import \{ getDemandData \} from '\.\.\/utils\/demandEngine';/g, '');
tourCard = tourCard.replace(/const demandStats = getDemandData\(tour\.id\);/g, '');

// The badge HTML is something like:
/*
<div className={`absolute top-4 right-4 text-[10px] sm:text-xs font-black uppercase px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 z-20 ${demandStats.color}`}>
  <span>{demandStats.text}</span>
</div>
*/
tourCard = tourCard.replace(/<div className={`absolute top-4 right-4 text-\[10px\] sm:text-xs font-black uppercase px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 z-20 \$\{demandStats.color\}`}>\s*<span>\{demandStats.text\}<\/span>\s*<\/div>/g, '');

fs.writeFileSync('src/components/TourCard.tsx', tourCard);

// 2. Delete demandEngine.ts
if (fs.existsSync('src/utils/demandEngine.ts')) {
  fs.unlinkSync('src/utils/demandEngine.ts');
}

console.log('Fixed demand pattern');
