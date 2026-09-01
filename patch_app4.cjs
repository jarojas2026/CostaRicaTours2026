const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `
  const [ratesLoaded, setRatesLoaded] = useState(false);
  useEffect(() => {
    fetchExchangeRates().then(() => setRatesLoaded(true));
    const handleRatesUpdate = () => setRatesLoaded(prev => !prev);
    window.addEventListener('exchangeRatesUpdated', handleRatesUpdate);
    return () => window.removeEventListener('exchangeRatesUpdated', handleRatesUpdate);
  }, []);
`;

content = content.replace(/const \[ratesLoaded, setRatesLoaded\] = useState\(false\);\n  useEffect\(\(\) => \{\n    fetchExchangeRates\(\)\.then\(\(\) => setRatesLoaded\(true\)\);\n  \}, \[\]\);/, replacement);
fs.writeFileSync('src/App.tsx', content);
console.log('patched app to listen to exchange rates updates');
