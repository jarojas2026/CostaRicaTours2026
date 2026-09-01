const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace("import { detectBrowserLanguage, getLangText } from './utils/i18n';", "import { detectBrowserLanguage, getLangText, fetchExchangeRates } from './utils/i18n';");

const useEffectToAdd = `
  useEffect(() => {
    fetchExchangeRates();
  }, []);
`;

content = content.replace(/(const \[showLocalBuses, setShowLocalBuses\] = useState\(false\);\n)/, "$1" + useEffectToAdd);

fs.writeFileSync('src/App.tsx', content);
console.log('patched app');
