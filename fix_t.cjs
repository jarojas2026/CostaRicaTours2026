const fs = require('fs');

function addT(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('UI_TRANSLATIONS')) {
    content = content.replace("import { getLangText, formatCurrency }", "import { getLangText, formatCurrency, UI_TRANSLATIONS }");
    content = content.replace("import { getLangText } from '../utils/i18n'", "import { getLangText, UI_TRANSLATIONS } from '../utils/i18n'");
  }
  
  // Find where component definition starts and insert t function
  if (!content.includes('const t = (key: string)')) {
    content = content.replace(
      /(const \[.*\] = useState.*)/,
      "const t = (key: string) => UI_TRANSLATIONS[key]?.[language] || UI_TRANSLATIONS[key]?.['es'] || key;\n  $1"
    );
  }
  fs.writeFileSync(file, content);
}

addT('src/components/TourCard.tsx');
addT('src/components/InteractiveMap.tsx');

console.log('fixed t function');
