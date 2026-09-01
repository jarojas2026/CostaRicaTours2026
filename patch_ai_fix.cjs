const fs = require('fs');
let ai = fs.readFileSync('src/components/AIAssistant.tsx', 'utf8');

// Ensure UI_TRANSLATIONS is imported
if (!ai.includes("UI_TRANSLATIONS")) {
  ai = ai.replace("import { getLangText } from '../utils/i18n';", "import { getLangText, UI_TRANSLATIONS } from '../utils/i18n';");
}

fs.writeFileSync('src/components/AIAssistant.tsx', ai);
console.log('patched ai imports');
