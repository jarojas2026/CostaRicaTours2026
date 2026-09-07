const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
if (!appCode.includes('export const formatCurrency')) {
   appCode = appCode.replace(/const formatCurrency =/g, 'export const formatCurrency =');
   fs.writeFileSync('src/App.tsx', appCode);
}

