const fs = require('fs');

let content = fs.readFileSync('src/components/TourCard.tsx', 'utf8');

if (!content.includes('getDemandData')) {
  // Import demand engine
  content = content.replace(
    "import { getLangText, formatCurrency, UI_TRANSLATIONS } from '../utils/i18n';",
    "import { getLangText, formatCurrency, UI_TRANSLATIONS } from '../utils/i18n';\nimport { getDemandData } from '../utils/demandEngine';"
  );
  
  // Call it inside the component
  content = content.replace(
    "const t = (key: string) => UI_TRANSLATIONS[key]?.[language] || UI_TRANSLATIONS[key]?.['es'] || key;",
    "const t = (key: string) => UI_TRANSLATIONS[key]?.[language] || UI_TRANSLATIONS[key]?.['es'] || key;\n  const demandData = getDemandData(tour.id);"
  );

  // Add the badge to the image overlay
  content = content.replace(
    "{/* Top badges */}",
    `{/* Top badges */}\n          {demandData && (\n            <div className={\`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold shadow-md border \${demandData.color} backdrop-blur-md z-10 animate-pulse\`}>\n              {demandData.text}\n            </div>\n          )}`
  );

  fs.writeFileSync('src/components/TourCard.tsx', content);
  console.log('Patched TourCard successfully');
}
