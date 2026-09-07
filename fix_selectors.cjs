const fs = require('fs');
let code = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

// I need to find where showThemeSelector is used and remove that UI
const selectorRegex1 = /\{showThemeSelector && \([\s\S]*?<\/motion\.div>\s*\)\}/;
code = code.replace(selectorRegex1, '');

const selectorRegex2 = /\{!isOpen && \(\s*<motion\.button[\s\S]*?<\/motion\.button>\s*\)\}/;
code = code.replace(selectorRegex2, '');

// If it failed via regex, I'll just remove the lines manually
fs.writeFileSync('src/components/FloatingWhatsApp.tsx', code);
