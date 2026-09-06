const fs = require('fs');
let code = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');
code = code.replace(
  "hover:${themeClasses.button}",
  "${themeClasses.button}"
);
fs.writeFileSync('src/components/FloatingWhatsApp.tsx', code);
console.log('Fixed hover issue');
