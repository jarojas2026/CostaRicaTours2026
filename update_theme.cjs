const fs = require('fs');

// 1. Update FloatingWhatsApp default theme
let floatCode = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');
floatCode = floatCode.replace(
  "const [theme, setTheme] = useState<string>('emerald');",
  "const [theme, setTheme] = useState<string>('costa_rica');"
);
fs.writeFileSync('src/components/FloatingWhatsApp.tsx', floatCode);

// 2. Update index.css default fallbacks to match Costa Rica Deep Blue (#1D3557)
let cssCode = fs.readFileSync('src/index.css', 'utf8');
cssCode = cssCode.replace(/#1B4965/g, '#1D3557');
cssCode = cssCode.replace(/#22577A/g, '#25446E');
cssCode = cssCode.replace(/#2C688F/g, '#2E5487');
cssCode = cssCode.replace(/#387CA8/g, '#3965A1');
cssCode = cssCode.replace(/#4B94C2/g, '#4E7BB8');
// Update the puravida colors to the flag Red (#E63946) to match the costa_rica theme widget button
cssCode = cssCode.replace(/--color-puravida: #F97316;/g, '--color-puravida: #E63946;');
cssCode = cssCode.replace(/--color-puravida-dark: #EA580C;/g, '--color-puravida-dark: #D62828;');
cssCode = cssCode.replace(/--color-puravida-light: #FB923C;/g, '--color-puravida-light: #F1FAEE;');

fs.writeFileSync('src/index.css', cssCode);
console.log("Updated default theme to Costa Rica.");
