const fs = require('fs');

let content = fs.readFileSync('src/components/AIAssistant.tsx', 'utf8');

// 1. Import TOURS so we can find the tour data
if (!content.includes("import { TOURS } from '../data/toursData';")) {
  content = content.replace(
    "import { UI_TRANSLATIONS } from '../utils/i18n';",
    "import { UI_TRANSLATIONS, formatCurrency, getLangText } from '../utils/i18n';\nimport { TOURS } from '../data/toursData';"
  );
}

// 2. Replace the message text rendering logic with a custom renderer
const targetTextRender = '<p className="whitespace-pre-line">{msg.text}</p>';

const newTextRender = `{msg.text.split(/(\\[TOUR:[a-zA-Z0-9-]+\\])/).map((part, i) => {
  if (part.startsWith('[TOUR:')) {
    const tId = part.replace('[TOUR:', '').replace(']', '');
    const foundTour = TOURS.find(t => t.id === tId);
    if (foundTour) {
      return (
        <div key={i} className="my-3 bg-white/10 border border-white/20 rounded-xl p-3 flex gap-3 items-center hover:bg-white/20 cursor-pointer transition-colors shadow-lg" onClick={() => onSelectTour && onSelectTour(foundTour)}>
           <img src={foundTour.image} alt={foundTour.title.es} className="w-16 h-16 rounded-lg object-cover shadow-md border border-white/10" />
           <div className="flex-1">
             <h4 className="font-bold text-sm text-white leading-tight mb-1">{getLangText(foundTour.title, language)}</h4>
             <span className="text-orange-400 font-black text-xs">{formatCurrency(foundTour.priceUSD, currency)}</span>
           </div>
           <ArrowRight className="w-4 h-4 text-white/50" />
        </div>
      );
    }
  }
  return <span key={i} className="whitespace-pre-line">{part}</span>;
})}`;

content = content.replace(targetTextRender, newTextRender);

fs.writeFileSync('src/components/AIAssistant.tsx', content);
console.log('GenUI added to AIAssistant');
