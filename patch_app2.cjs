const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
if (!content.includes('fetchExchangeRates()')) {
  const useEffectToAdd = `
  useEffect(() => {
    fetchExchangeRates();
  }, []);
`;
  content = content.replace(/(const \[isLegalModalOpen, setIsLegalModalOpen\] = useState\(false\);\n)/, "$1" + useEffectToAdd);
  fs.writeFileSync('src/App.tsx', content);
  console.log('patched app with fetchExchangeRates');
}
