const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `
  const [ratesLoaded, setRatesLoaded] = useState(false);
  useEffect(() => {
    fetchExchangeRates().then(() => setRatesLoaded(true));
  }, []);
`;

content = content.replace(/useEffect\(\(\) => \{\n    fetchExchangeRates\(\);\n  \}, \[\]\);/, replacement);
fs.writeFileSync('src/App.tsx', content);
console.log('patched app to re-render on rates load');
